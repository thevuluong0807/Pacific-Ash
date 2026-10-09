import { ARENA_RADIUS, HULLS, WEAPONS, designStats, normalizeDesign, type HullSpec, type ShipDesign, type WeaponId, type WeaponSpec } from './data';
import { dirOf, stepBall, type Ball } from './ballistics';

/** Phím điều khiển thô. Con người và máy gửi cùng một dạng, mô phỏng tự diễn giải theo việc tàu đang lái hay đang cầm khí tài. */
export interface PlayerInput {
  up: boolean; down: boolean; left: boolean; right: boolean; fire: boolean; select: number | null; exit: boolean;
  /** Ngắm bằng chuột: góc đích (so với mũi tàu, rad) và góc ngẩng đích của khí tài đang cầm. Tháp đuổi theo đích với giới hạn tốc độ/gia tốc; có thì bỏ qua phím xoay. */
  aim?: { beta: number; el: number };
}
export const NO_INPUT: PlayerInput = { up: false, down: false, left: false, right: false, fire: false, select: null, exit: false };

export interface MountState {
  weapon: WeaponId | null;
  /** Góc tháp so với mũi tàu (rad) và vận tốc góc. */
  beta: number; betaW: number;
  el: number; elW: number;
  mag: number; used: number;
  /** Giây nạp lại còn lại (cooldown) và giây tới phát kế tiếp trong băng. */
  cd: number; next: number;
}

export interface SimPlayer { name: string; team: number; design: ShipDesign; bot?: 'easy' | 'medium' | 'hard' }

export interface ShipState {
  id: number; name: string; team: number; hull: HullSpec; design: ShipDesign; bot?: SimPlayer['bot'];
  x: number; z: number; h: number; vx: number; vz: number; r: number;
  throttle: number; rudder: number;
  hp: number; alive: boolean; sunkAt: number;
  vmax: number; thrust: number;
  mounts: MountState[];
  /** Khe khí tài đang cầm (góc nhìn thứ nhất) hoặc null (lái tàu, góc nhìn thứ ba). */
  control: number | null;
  kills: number; damage: number; deaths: number;
  /** Giây đã ra ngoài vùng chiến sự. */
  outside: number;
}

export interface Projectile {
  id: number; owner: number; team: number; weapon: WeaponId; spec: WeaponSpec;
  b: Ball; age: number; target: number | null;
}

export type SimEvent =
  | { k: 'fire'; ship: number; slot: number; weapon: WeaponId; x: number; y: number; z: number; dx: number; dy: number; dz: number }
  | { k: 'hit'; x: number; y: number; z: number; ship: number; by: number; weapon: WeaponId; dmg: number }
  | { k: 'splash'; x: number; z: number; r: number; weapon: WeaponId }
  | { k: 'sunk'; ship: number; by: number | null }
  | { k: 'bump'; x: number; z: number; ship: number; force: number }
  | { k: 'enter'; ship: number; slot: number }
  | { k: 'exit'; ship: number; slot: number; reload: boolean }
  | { k: 'over'; winner: number | null };

const TAU = Math.PI * 2;
export const wrapPi = (a: number) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Điểm đơn vị cục bộ (lx mạn trái +, lz mũi +) → thế giới. */
export const toWorld = (s: { x: number; z: number; h: number }, lx: number, lz: number) => {
  const c = Math.cos(s.h), n = Math.sin(s.h);
  return { x: s.x + lx * c + lz * n, z: s.z - lx * n + lz * c };
};
export const toLocal = (s: { x: number; z: number; h: number }, wx: number, wz: number) => {
  const c = Math.cos(s.h), n = Math.sin(s.h), dx = wx - s.x, dz = wz - s.z;
  return { lx: dx * c - dz * n, lz: dx * n + dz * c };
};

/** Nửa bề ngang thân tại vị trí dọc `lz`: đuôi vuông, mũi nhọn dần. */
export function halfBeam(h: HullSpec, lz: number): number {
  const t = lz / (h.length / 2);
  if (t > 0.45) return (h.beam / 2) * Math.max(0.04, 1 - Math.pow((t - 0.45) / 0.55, 1.4) * 0.97);
  return h.beam / 2 * (t < -0.85 ? 0.88 : 1);
}

/** Vị trí nòng khí tài (thế giới) và hướng bắn của khe `slot`. */
export function muzzleOf(s: ShipState, slot: number) {
  const m = s.mounts[slot], sp = s.hull.slots[slot];
  const theta = s.h + m.beta, w = m.weapon ? WEAPONS[m.weapon] : null;
  const d = dirOf(theta, m.el), bl = w ? w.barrel : 0;
  const base = toWorld(s, sp.x, sp.z);
  return { x: base.x + d.x * bl, y: sp.y + d.y * bl, z: base.z + d.z * bl, theta, el: m.el, dir: d };
}

export class ArenaSim {
  ships: ShipState[] = [];
  projs: Projectile[] = [];
  events: SimEvent[] = [];
  time = 0;
  over: { winner: number | null; at: number } | null = null;
  /** Bản phía client của trận online: chỉ ngoại suy chuyển động/ngắm giữa hai bản chụp của server; không bắn, không va chạm, không sát thương. */
  remote = false;
  readonly rand: () => number;
  private pid = 1;

  constructor(readonly seed: number, players: SimPlayer[]) {
    this.rand = rng(seed);
    const n = players.length;
    // chia đều quanh vòng tròn, cùng đội xếp cạnh nhau
    const order = players.map((_, i) => i).sort((a, b) => players[a].team - players[b].team || a - b);
    order.forEach((pi, slotIdx) => {
      const p = players[pi], dz = normalizeDesign(p.design), hull = HULLS[dz.hull], st = designStats(dz);
      const ang = (slotIdx / n) * TAU + 0.4, R = ARENA_RADIUS * 0.62;
      const x = Math.sin(ang) * R, z = Math.cos(ang) * R;
      this.ships[pi] = {
        id: pi, name: p.name, team: p.team, hull, design: dz, bot: p.bot,
        x, z, h: Math.atan2(-x, -z), vx: 0, vz: 0, r: 0, throttle: 0, rudder: 0,
        hp: hull.hp, alive: true, sunkAt: 0, vmax: hull.vmax * st.speedMul, thrust: hull.thrust * st.speedMul,
        mounts: hull.slots.map((_, i) => {
          const w = dz.slots[i] ? WEAPONS[dz.slots[i]!] : null;
          return { weapon: w?.id ?? null, beta: hull.slots[i].center === Math.PI ? Math.PI : 0, betaW: 0, el: w ? Math.max(w.elMin, Math.min(w.elHi, 0.05)) : 0, elW: 0, mag: w?.mag ?? 0, used: 0, cd: 0, next: 0 };
        }),
        control: null, kills: 0, damage: 0, deaths: 0, outside: 0,
      };
      // tháp trung tâm hướng sẵn theo cung
      this.ships[pi].mounts.forEach((m, i) => { m.beta = hull.slots[i].half >= Math.PI ? 0 : hull.slots[i].center; });
    });
  }

  /** Số lượng đội còn sống. */
  teamsAlive(): number[] { return [...new Set(this.ships.filter((s) => s.alive).map((s) => s.team))]; }

  step(dt: number, inputs: PlayerInput[]) {
    this.time += dt;
    for (const s of this.ships) if (s.alive) { this.control(s, inputs[s.id] ?? NO_INPUT, dt); this.move(s, dt); this.mountsStep(s, dt); }
    if (this.remote) { this.projMotion(dt); this.events = []; return; }
    this.collide();
    this.projStep(dt);
    if (!this.over) {
      const teams = this.teamsAlive();
      if (teams.length <= 1) { this.over = { winner: teams[0] ?? null, at: this.time }; this.events.push({ k: 'over', winner: teams[0] ?? null }); }
    }
  }

  drain(): SimEvent[] { const e = this.events; this.events = []; return e; }

  // ---- điều khiển ----
  private control(s: ShipState, inp: PlayerInput, dt: number) {
    if (this.remote) inp = { ...inp, select: null, exit: false, fire: false }; // chọn/thoát/bắn do server quyết
    if (s.control !== null && inp.exit) this.leave(s, false);
    if (inp.select !== null && s.control === null) {
      const m = s.mounts[inp.select];
      if (m && m.weapon && m.cd <= 0) { s.control = inp.select; this.events.push({ k: 'enter', ship: s.id, slot: inp.select }); }
    } else if (inp.select !== null && s.control !== null && inp.select !== s.control) {
      const m = s.mounts[inp.select];
      if (m && m.weapon && m.cd <= 0) { this.leave(s, false); s.control = inp.select; this.events.push({ k: 'enter', ship: s.id, slot: inp.select }); }
    }
    const steerKeys = s.control === null;
    // cần ga: giữ W/S để đẩy dần, thả thì giữ nguyên mức (như cần ga tàu thật)
    if (steerKeys) s.throttle = clamp(s.throttle + ((inp.up ? 1 : 0) - (inp.down ? 1 : 0)) * 0.45 * dt, -0.5, 1);
    const steer = steerKeys ? (inp.left ? 1 : 0) - (inp.right ? 1 : 0) : 0;
    const rr = s.hull.rudderRate * dt;
    const target = steer;
    const rate = steer === 0 ? rr * 0.55 : rr;
    s.rudder += clamp(target - s.rudder, -rate, rate);

    // khí tài đang cầm
    if (s.control !== null) {
      const m = s.mounts[s.control], w = WEAPONS[m.weapon!];
      const cy = (inp.left ? 1 : 0) - (inp.right ? 1 : 0), ce = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
      this.slew(s, m, s.control, w, cy, ce, dt, inp.aim);
      if (inp.fire && m.mag > 0 && m.next <= 0) this.shoot(s, s.control);
    } else {
      s.mounts.forEach((m, i) => { if (m.weapon) this.slew(s, m, i, WEAPONS[m.weapon], 0, 0, dt); });
    }
  }

  private slew(s: ShipState, m: MountState, slot: number, w: WeaponSpec, cy: number, ce: number, dt: number, aim?: { beta: number; el: number }) {
    const sp = s.hull.slots[slot];
    // tốc độ mong muốn: theo phím (±tốc độ tối đa) hoặc theo đích chuột (hãm trước khi tới để không vọt quá: v = √(2·a·sai số))
    let wy = cy * w.yawMax, we = ce * w.elMax;
    if (aim) {
      const full = sp.half >= Math.PI;
      const tb = full ? aim.beta : clamp(aim.beta, sp.center - sp.half, sp.center + sp.half);
      const eb = full ? wrapPi(tb - m.beta) : tb - m.beta;
      wy = Math.sign(eb) * Math.min(w.yawMax, Math.sqrt(2 * w.yawAcc * Math.abs(eb)) * 0.9);
      const ee = clamp(aim.el, w.elMin, w.elHi) - m.el;
      we = w.elMax > 0 ? Math.sign(ee) * Math.min(w.elMax, Math.sqrt(2 * w.elAcc * Math.abs(ee)) * 0.9) : 0;
    }
    const aw = w.yawAcc * dt;
    m.betaW += clamp(wy - m.betaW, -aw, aw);
    m.beta += m.betaW * dt;
    if (sp.half < Math.PI) {
      const lo = sp.center - sp.half, hi = sp.center + sp.half;
      if (m.beta > hi) { m.beta = hi; m.betaW = Math.min(0, m.betaW); }
      if (m.beta < lo) { m.beta = lo; m.betaW = Math.max(0, m.betaW); }
    } else m.beta = wrapPi(m.beta);
    const ae = w.elAcc * dt;
    m.elW += clamp(we - m.elW, -ae, ae);
    m.el += m.elW * dt;
    if (m.el > w.elHi) { m.el = w.elHi; m.elW = Math.min(0, m.elW); }
    if (m.el < w.elMin) { m.el = w.elMin; m.elW = Math.max(0, m.elW); }
  }

  private leave(s: ShipState, reload: boolean) {
    if (s.control === null) return;
    const i = s.control, m = s.mounts[i];
    // thoát sớm khi đã bắn một phần băng: nạp bù theo phần đã dùng
    if (!reload && m.used > 0) { const w = WEAPONS[m.weapon!]; m.cd = Math.max(m.cd, w.reload * (m.used / w.mag)); reload = true; }
    s.control = null;
    this.events.push({ k: 'exit', ship: s.id, slot: i, reload });
  }

  private shoot(s: ShipState, slot: number) {
    const m = s.mounts[slot], w = WEAPONS[m.weapon!];
    const mz = muzzleOf(s, slot);
    {
      const th = mz.theta + (this.rand() - 0.5) * w.spread * 2, el = mz.el + (this.rand() - 0.5) * w.spread * 2;
      const d = dirOf(th, el);
      const inh = w.kind === 'torpedo' ? { x: 0, z: 0 } : { x: s.vx, z: s.vz };
      const b: Ball = { x: mz.x, y: w.kind === 'torpedo' ? -1 : mz.y, z: mz.z, vx: d.x * w.v + inh.x, vy: w.kind === 'torpedo' ? 0 : d.y * w.v, vz: d.z * w.v + inh.z };
      this.projs.push({ id: this.pid++, owner: s.id, team: s.team, weapon: w.id, spec: w, b, age: 0, target: w.homing > 0 ? this.lockTarget(s, th, el, mz) : null });
    }
    this.events.push({ k: 'fire', ship: s.id, slot, weapon: w.id, x: mz.x, y: mz.y, z: mz.z, dx: mz.dir.x, dy: mz.dir.y, dz: mz.dir.z });
    m.mag--; m.used++; m.next = w.interval;
    if (m.mag <= 0) { m.cd = w.reload; m.used = 0; this.leave(s, true); }
  }

  /** Tên lửa tự chọn tàu địch gần hướng ngắm nhất (trong nón 14°). */
  private lockTarget(s: ShipState, th: number, el: number, mz: { x: number; y: number; z: number }): number | null {
    let best: number | null = null, ba = 0.25;
    const d = dirOf(th, el);
    for (const o of this.ships) {
      if (!o.alive || o.team === s.team) continue;
      const dx = o.x - mz.x, dy = 5 - mz.y, dz = o.z - mz.z, L = Math.hypot(dx, dy, dz);
      const ang = Math.acos(clamp((dx * d.x + dy * d.y + dz * d.z) / L, -1, 1));
      if (ang < ba) { ba = ang; best = o.id; }
    }
    return best;
  }

  private mountsStep(s: ShipState, dt: number) {
    for (const m of s.mounts) {
      if (!m.weapon) continue;
      if (m.next > 0) m.next -= dt;
      if (m.cd > 0) { m.cd -= dt; if (m.cd <= 0) { m.cd = 0; m.mag = WEAPONS[m.weapon].mag; m.used = 0; } }
    }
  }

  // ---- chuyển động tàu ----
  private move(s: ShipState, dt: number) {
    const hs = s.hull, fx = Math.sin(s.h), fz = Math.cos(s.h);
    let u = s.vx * fx + s.vz * fz;
    // quay đầu: tốc độ quay mục tiêu phụ thuộc bánh lái và tốc độ nước chảy qua bánh lái, đáp ứng trễ theo hằng số thời gian
    const f = clamp(u / (0.55 * s.vmax), -1, 1) + 0.12 * s.throttle;
    const rt = s.rudder * hs.maxYaw * (s.vmax / hs.vmax) * clamp(f, -1, 1);
    s.r += (rt - s.r) * (1 - Math.exp(-dt / hs.yawTau));
    s.h += s.r * dt;
    // chiếu lại vận tốc lên hệ trục mới: phần lệch hướng thành trôi ngang, bị sức cản ngang bào dần
    const nfx = Math.sin(s.h), nfz = Math.cos(s.h), ncx = Math.cos(s.h), ncz = -Math.sin(s.h);
    u = s.vx * nfx + s.vz * nfz;
    let w = s.vx * ncx + s.vz * ncz;
    const x = Math.abs(u) / s.vmax;
    const drag = (Math.pow(x, 1.6) + 0.5 * x) / 1.5;
    const T = s.throttle >= 0 ? s.throttle : s.throttle * 0.7;
    u += s.thrust * (T - Math.sign(u) * drag - 0.3 * Math.abs(s.r) * Math.abs(u) / s.vmax) * dt;
    w *= Math.exp(-hs.latDrag * dt);
    s.vx = nfx * u + ncx * w; s.vz = nfz * u + ncz * w;
    s.x += s.vx * dt; s.z += s.vz * dt;
    // biên vùng chiến sự: đẩy mềm về tâm
    const dist = Math.hypot(s.x, s.z);
    if (dist > ARENA_RADIUS) {
      const over = (dist - ARENA_RADIUS) / 150, k = Math.min(1, over) * 60 * dt;
      s.vx -= (s.x / dist) * k; s.vz -= (s.z / dist) * k;
      s.outside += dt;
      if (dist > ARENA_RADIUS + 300) { s.x *= (ARENA_RADIUS + 300) / dist; s.z *= (ARENA_RADIUS + 300) / dist; }
    } else s.outside = 0;
  }

  private circles(s: ShipState) {
    const L = s.hull.length, r = s.hull.beam * 0.55;
    return [-0.28, 0, 0.28].map((k) => { const p = toWorld(s, 0, k * L); return { x: p.x, z: p.z, r }; });
  }

  private collide() {
    const live = this.ships.filter((s) => s.alive);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > (a.hull.length + b.hull.length) / 2) continue;
      for (const ca of this.circles(a)) for (const cb of this.circles(b)) {
        const dx = cb.x - ca.x, dz = cb.z - ca.z, d = Math.hypot(dx, dz) || 1e-3, pen = ca.r + cb.r - d;
        if (pen <= 0) continue;
        const nx = dx / d, nz = dz / d, ma = a.hull.hp, mb = b.hull.hp;
        // tách ra theo khối lượng, triệt tiêu một phần vận tốc tiến lại gần nhau
        a.x -= nx * pen * (mb / (ma + mb)); a.z -= nz * pen * (mb / (ma + mb));
        b.x += nx * pen * (ma / (ma + mb)); b.z += nz * pen * (ma / (ma + mb));
        const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rv < 0) {
          const j2 = -(1 + 0.25) * rv / (1 / ma + 1 / mb);
          a.vx -= (j2 / ma) * nx; a.vz -= (j2 / ma) * nz; b.vx += (j2 / mb) * nx; b.vz += (j2 / mb) * nz;
          const force = -rv;
          if (force > 4) {
            this.events.push({ k: 'bump', x: ca.x + nx * ca.r, z: ca.z + nz * ca.r, ship: a.id, force });
            this.hurt(a, force * 0.9, b.id, null); this.hurt(b, force * 0.9, a.id, null);
          }
        }
      }
    }
  }

  // ---- đạn ----
  /** Phía client: chỉ dời đạn theo vật lý (bản chụp của server cấp/xóa đạn). */
  private projMotion(dt: number) {
    this.projs = this.projs.filter((p) => { stepBall(p.b, p.spec, dt); if (p.spec.kind === 'torpedo') p.b.y = -1; p.age += dt; return p.age < p.spec.life && p.b.y > -2; });
  }

  private projStep(dt: number) {
    const out: Projectile[] = [];
    for (const p of this.projs) {
      const w = p.spec;
      const ox = p.b.x, oy = p.b.y, oz = p.b.z;
      if (p.target !== null) this.home(p, dt);
      stepBall(p.b, w, dt);
      if (w.kind === 'torpedo') p.b.y = -1;
      p.age += dt;
      let dead = p.age > w.life || Math.hypot(p.b.x, p.b.z) > ARENA_RADIUS + 900;
      if (!dead) {
        // đoạn thẳng từ (ox..) tới vị trí mới: lấy mẫu mỗi ≤ 8 đơn vị để đạn nhanh không xuyên thân
        const L = Math.hypot(p.b.x - ox, p.b.y - oy, p.b.z - oz), n = Math.max(1, Math.ceil(L / 8));
        for (let i = 1; i <= n && !dead; i++) {
          const k = i / n, px = ox + (p.b.x - ox) * k, py = oy + (p.b.y - oy) * k, pz = oz + (p.b.z - oz) * k;
          const victim = this.hitShip(p, px, py, pz);
          if (victim) { this.impact(p, victim, px, py, pz); dead = true; }
          else if (py <= 0 && w.kind !== 'torpedo') { this.splashDown(p, px, pz); dead = true; }
        }
      }
      if (!dead) out.push(p);
    }
    this.projs = out;
  }

  private home(p: Projectile, dt: number) {
    const t = this.ships[p.target!];
    if (!t?.alive) { p.target = null; return; }
    const b = p.b, sp = Math.hypot(b.vx, b.vy, b.vz) || 1;
    const dx = t.x - b.x, dy = 6 - b.y, dz = t.z - b.z, L = Math.hypot(dx, dy, dz) || 1;
    // quay vectơ vận tốc về phía mục tiêu tối đa homing·dt rad
    const cx = b.vx / sp, cy = b.vy / sp, cz = b.vz / sp, tx = dx / L, ty = dy / L, tz = dz / L;
    const ang = Math.acos(clamp(cx * tx + cy * ty + cz * tz, -1, 1));
    if (ang < 1e-4) return;
    const k = Math.min(1, (p.spec.homing * dt) / ang);
    let nx = cx + (tx - cx) * k, ny = cy + (ty - cy) * k, nz = cz + (tz - cz) * k;
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    b.vx = nx * sp; b.vy = ny * sp; b.vz = nz * sp;
  }

  private hitShip(p: Projectile, x: number, y: number, z: number): ShipState | null {
    for (const s of this.ships) {
      if (!s.alive || s.team === p.team) continue;
      const h = s.hull, { lx, lz } = toLocal(s, x, z);
      if (Math.abs(lz) > h.length / 2 || Math.abs(lx) > halfBeam(h, lz)) continue;
      if (y < -h.draft || y > h.freeboard + (Math.abs(lz) < h.length * 0.25 ? h.tower : 3)) continue;
      return s;
    }
    return null;
  }

  private impact(p: Projectile, v: ShipState, x: number, y: number, z: number) {
    const w = p.spec;
    this.events.push({ k: 'hit', x, y, z, ship: v.id, by: p.owner, weapon: p.weapon, dmg: w.dmg });
    this.hurt(v, w.dmg, p.owner, p.weapon);
    if (w.splash > 0) this.areaDamage(p, x, z, w.splash, v.id);
  }

  private splashDown(p: Projectile, x: number, z: number) {
    this.events.push({ k: 'splash', x, z, r: p.spec.splash, weapon: p.weapon });
    if (p.spec.splash > 0) this.areaDamage(p, x, z, p.spec.splash, -1);
  }

  /** Sát thương lan: giảm tuyến tính theo khoảng cách tới thân (hình chữ nhật), không tính đội mình. */
  private areaDamage(p: Projectile, x: number, z: number, r: number, skip: number) {
    for (const s of this.ships) {
      if (!s.alive || s.team === p.team || s.id === skip) continue;
      const { lx, lz } = toLocal(s, x, z);
      const dx = Math.max(0, Math.abs(lx) - s.hull.beam / 2), dz = Math.max(0, Math.abs(lz) - s.hull.length / 2), d = Math.hypot(dx, dz);
      if (d < r) this.hurt(s, p.spec.dmg * p.spec.splashDmg * (1 - d / r), p.owner, p.weapon);
    }
  }

  private hurt(s: ShipState, raw: number, by: number | null, weapon: WeaponId | null) {
    if (!s.alive || this.over) return;
    const dmg = raw * s.hull.armor, att = by !== null ? this.ships[by] : null;
    s.hp -= dmg;
    if (att && att.team !== s.team) att.damage += dmg;
    void weapon;
    if (s.hp <= 0) {
      s.hp = 0; s.alive = false; s.sunkAt = this.time; s.deaths++; s.control = null; s.throttle = 0;
      if (att && att.team !== s.team) att.kills++;
      this.events.push({ k: 'sunk', ship: s.id, by });
    }
  }
}
