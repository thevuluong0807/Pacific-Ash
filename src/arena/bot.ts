import { ARENA_RADIUS, WEAPONS, type WeaponId } from './data';
import { solveElevation, trajectory } from './ballistics';
import { NO_INPUT, muzzleOf, wrapPi, type ArenaSim, type PlayerInput, type ShipState } from './sim';

type Level = NonNullable<ShipState['bot']>;
const LEVEL = {
  easy: { tol: 0.06, noise: 0.10, think: 0.6, aimDelay: 0.9, standoff: 1.15 },
  medium: { tol: 0.028, noise: 0.05, think: 0.35, aimDelay: 0.5, standoff: 1 },
  hard: { tol: 0.013, noise: 0.02, think: 0.2, aimDelay: 0.25, standoff: 0.9 },
} as const;
const STANDOFF = { small: 380, medium: 620, large: 820 } as const;

const rangeCache = new Map<WeaponId, number>();
/** Tầm xa nhất ước lượng của khí tài (từ nòng cao ~12 đv). */
export function maxRange(id: WeaponId): number {
  let r = rangeCache.get(id);
  if (r === undefined) {
    const w = WEAPONS[id];
    if (w.kind === 'torpedo') r = w.v * w.life * 0.75;
    else r = trajectory(w, 0, 12, 0, 0, Math.min(w.elHi, Math.max(w.elMin, Math.PI / 4)), { x: 0, z: 0 }, 1 / 30, w.life, false).z;
    rangeCache.set(id, r);
  }
  return r;
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Máy chơi: sinh đúng loại phím như người (cùng độ trễ nòng, cùng cần ga), nên không gian lận về vật lý. */
export class ArenaBot {
  private rand: () => number;
  private target = -1;
  private retarget = 0;
  private orbit = 1;
  private wait = 0;
  private aimT = 0;
  private offX = 0; private offZ = 0;
  private el: number | null = null;
  private elAt = -1;
  private tof = 1;
  private cfg: (typeof LEVEL)[Level];

  constructor(readonly id: number, level: Level, seed: number) {
    this.rand = mulberry(seed * 7919 + id * 104729);
    this.cfg = LEVEL[level];
    this.orbit = id % 2 ? 1 : -1;
  }

  think(sim: ArenaSim, s: ShipState, dt: number): PlayerInput {
    const inp: PlayerInput = { ...NO_INPUT };
    this.retarget -= dt; this.wait -= dt;
    let t = this.target >= 0 ? sim.ships[this.target] : undefined;
    if (!t || !t.alive || this.retarget <= 0) {
      let best: ShipState | undefined, bd = Infinity;
      for (const o of sim.ships) if (o.alive && o.team !== s.team) { const d = Math.hypot(o.x - s.x, o.z - s.z); if (d < bd) { bd = d; best = o; } }
      if (best && best.id !== this.target) { this.target = best.id; this.offX = (this.rand() - 0.5) * 2; this.offZ = (this.rand() - 0.5) * 2; this.el = null; }
      this.retarget = 3 + this.rand() * 3;
      t = best;
    }
    if (!t) { inp.up = s.throttle < 0.2; return inp; }
    const dx = t.x - s.x, dz = t.z - s.z, dist = Math.hypot(dx, dz);

    if (s.control === null) {
      this.navigate(sim, s, t, dist, inp);
      this.pickWeapon(s, t, dist, inp);
    } else this.aim(s, t, dist, dt, inp);
    return inp;
  }

  private navigate(sim: ArenaSim, s: ShipState, t: ShipState, dist: number, inp: PlayerInput) {
    const R = STANDOFF[s.hull.id] * this.cfg.standoff;
    const brg = Math.atan2(t.x - s.x, t.z - s.z);
    let want: number;
    if (dist > R * 1.25) want = brg;
    else if (dist < R * 0.65) want = brg + Math.PI * 0.8 * this.orbit;
    else want = brg + (Math.PI / 2) * this.orbit; // đi vòng để lộ mạn
    const rim = Math.hypot(s.x, s.z);
    if (rim > ARENA_RADIUS * 0.82) { const toC = Math.atan2(-s.x, -s.z); if (Math.abs(wrapPi(toC - s.h)) > 0.3 || rim > ARENA_RADIUS * 0.95) want = toC; }
    // tránh tàu khác ngay phía trước
    for (const o of sim.ships) {
      if (o === s || !o.alive) continue;
      const ox = o.x - s.x, oz = o.z - s.z, d = Math.hypot(ox, oz), reach = (s.hull.length + o.hull.length) * 0.9;
      if (d < reach && Math.abs(wrapPi(Math.atan2(ox, oz) - s.h)) < 0.7) want = s.h + (wrapPi(Math.atan2(ox, oz) - s.h) > 0 ? -1 : 1) * 1.0;
    }
    const err = wrapPi(want - s.h);
    // dự đoán góc đã quay thêm do đà (r·τ) để khỏi lái quá đà
    const lead = s.r * s.hull.yawTau * 0.9;
    const e = err - lead;
    if (e > 0.05) inp.left = true; else if (e < -0.05) inp.right = true;
    const goal = dist > R * 1.3 ? 1 : 0.7;
    if (s.throttle < goal - 0.05) inp.up = true; else if (s.throttle > goal + 0.05) inp.down = true;
  }

  private pickWeapon(s: ShipState, t: ShipState, dist: number, inp: PlayerInput) {
    if (this.wait > 0) return;
    const brg = Math.atan2(t.x - s.x, t.z - s.z);
    const rel = wrapPi(brg - s.h);
    let best = -1, bs = -1;
    s.mounts.forEach((m, i) => {
      if (!m.weapon || m.cd > 0 || m.mag <= 0) return;
      const sp = s.hull.slots[i], w = WEAPONS[m.weapon];
      if (dist > maxRange(w.id) * 0.92 || (w.kind === 'torpedo' && dist < 140)) return;
      if (sp.half < Math.PI && Math.abs(wrapPi(rel - sp.center)) > sp.half - 0.1) return;
      const sc = w.dmg * (w.mag === 1 ? 1 : 0.6) + this.rand();
      if (sc > bs) { bs = sc; best = i; }
    });
    if (best >= 0) { inp.select = best; this.aimT = 0; this.el = null; this.elAt = -1; this.wait = this.cfg.think + this.rand() * 0.5; }
  }

  private aim(s: ShipState, t: ShipState, dist: number, dt: number, inp: PlayerInput) {
    const slot = s.control!, m = s.mounts[slot], w = WEAPONS[m.weapon!], sp = s.hull.slots[slot];
    this.aimT += dt;
    const mz = muzzleOf(s, slot);
    // điểm ngắm có lệch ngẫu nhiên theo độ khó, dẫn đầu theo thời gian bay
    const noise = this.cfg.noise * dist;
    const ax = t.x + t.vx * this.tof + this.offX * noise, az = t.z + t.vz * this.tof + this.offZ * noise;
    const d = Math.hypot(ax - mz.x, az - mz.z);
    const th = Math.atan2(ax - mz.x, az - mz.z);
    let beta = wrapPi(th - s.h);
    if (sp.half < Math.PI) {
      const off = wrapPi(beta - sp.center);
      if (Math.abs(off) > sp.half) { inp.exit = true; this.wait = 1; return; }
      beta = sp.center + off;
    }
    if (this.el === null || this.aimT - this.elAt > 0.2) {
      const e = solveElevation(w, mz.x, mz.y, mz.z, th, d, w.kind === 'torpedo' ? { x: 0, z: 0 } : { x: s.vx, z: s.vz });
      if (e === null) { inp.exit = true; this.wait = 1; return; }
      this.el = e; this.elAt = this.aimT;
      if (w.kind !== 'torpedo') this.tof = Math.max(0.2, trajectory(w, mz.x, mz.y, mz.z, th, e, { x: s.vx, z: s.vz }, 1 / 30, 25, false).t);
      else this.tof = d / w.v;
    }
    // bám đích có xét đà quay của tháp: góc dừng dự kiến = ω|ω| / (2·gia tốc)
    const stopB = (m.betaW * Math.abs(m.betaW)) / (2 * w.yawAcc), stopE = (m.elW * Math.abs(m.elW)) / (2 * w.elAcc);
    const eb = wrapPi(beta - (m.beta + stopB)), ee = this.el! - (m.el + stopE);
    const dead = 0.004 + this.cfg.tol * 0.15;
    if (eb > dead) inp.left = true; else if (eb < -dead) inp.right = true;
    if (w.elMax > 0) { if (ee > dead) inp.up = true; else if (ee < -dead) inp.down = true; }
    const errB = Math.abs(wrapPi(beta - m.beta)), errE = Math.abs(this.el! - m.el);
    if (this.aimT > this.cfg.aimDelay && errB < this.cfg.tol && (w.elMax === 0 || errE < this.cfg.tol) && Math.abs(m.betaW) < w.yawMax * 0.25) inp.fire = true;
    if (this.aimT > 9) inp.exit = true;
  }
}
