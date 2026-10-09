import { WEAPONS } from './data';
import { type ArenaSim, type PlayerInput, type ShipState, type SimEvent } from './sim';

/** Bản chụp trạng thái trận Hải chiến server → client (20 Hz). Client áp lên `ArenaSim.remote` rồi ngoại suy giữa hai bản. */
export interface ShipSnap {
  x: number; z: number; h: number; vx: number; vz: number; r: number; th: number; ru: number;
  hp: number; a: 0 | 1; sk: number; c: number; k: number; d: number; o: number;
  m: number[][];
  /** Phím đang giữ (up,down,left,right = bit 0..3) và đích ngắm chuột, để client ngoại suy. */
  i: number; ab?: number; ae?: number;
}
export interface ArenaSnap { t: number; s: ShipSnap[]; p: number[][]; ev: SimEvent[]; over: { winner: number | null; at: number } | null }

const r2 = (n: number) => Math.round(n * 100) / 100, r4 = (n: number) => Math.round(n * 10000) / 10000;
export const keyBits = (i: PlayerInput) => (i.up ? 1 : 0) | (i.down ? 2 : 0) | (i.left ? 4 : 0) | (i.right ? 8 : 0);

export function takeSnap(sim: ArenaSim, events: SimEvent[], inputs: PlayerInput[]): ArenaSnap {
  return {
    t: r4(sim.time), over: sim.over, ev: events,
    s: sim.ships.map((s, idx) => ({
      x: r2(s.x), z: r2(s.z), h: r4(s.h), vx: r2(s.vx), vz: r2(s.vz), r: r4(s.r), th: r4(s.throttle), ru: r4(s.rudder),
      hp: r2(s.hp), a: s.alive ? 1 : 0, sk: r2(s.sunkAt), c: s.control ?? -1, k: s.kills, d: r2(s.damage), o: r2(s.outside),
      m: s.mounts.map((m) => [r4(m.beta), r4(m.betaW), r4(m.el), r4(m.elW), m.mag, m.used, r2(m.cd), r2(m.next)]),
      i: keyBits(inputs[idx] ?? { up: false, down: false, left: false, right: false, fire: false, select: null, exit: false }), ab: inputs[idx]?.aim ? r4(inputs[idx].aim!.beta) : undefined, ae: inputs[idx]?.aim ? r4(inputs[idx].aim!.el) : undefined,
    })),
    p: sim.projs.map((p) => [p.id, p.owner, WEAPON_INDEX.indexOf(p.weapon), r2(p.b.x), r2(p.b.y), r2(p.b.z), r2(p.b.vx), r2(p.b.vy), r2(p.b.vz), r2(p.age)]),
  };
}
const WEAPON_INDEX = Object.keys(WEAPONS) as (keyof typeof WEAPONS)[];

/** Áp bản chụp lên bản sim phía client; trả về phím của từng tàu (cho ngoại suy) — tàu mình do client tự cấp. */
export function applySnap(sim: ArenaSim, snap: ArenaSnap): PlayerInput[] {
  sim.time = snap.t;
  sim.over = snap.over;
  const inputs: PlayerInput[] = [];
  snap.s.forEach((v, idx) => {
    const s: ShipState | undefined = sim.ships[idx];
    if (!s) return;
    s.x = v.x; s.z = v.z; s.h = v.h; s.vx = v.vx; s.vz = v.vz; s.r = v.r; s.throttle = v.th; s.rudder = v.ru;
    s.hp = v.hp; s.alive = !!v.a; s.sunkAt = v.sk; s.control = v.c < 0 ? null : v.c; s.kills = v.k; s.damage = v.d; s.outside = v.o;
    v.m.forEach((q, k) => { const m = s.mounts[k]; if (m) { m.beta = q[0]; m.betaW = q[1]; m.el = q[2]; m.elW = q[3]; m.mag = q[4]; m.used = q[5]; m.cd = q[6]; m.next = q[7]; } });
    inputs[idx] = { up: !!(v.i & 1), down: !!(v.i & 2), left: !!(v.i & 4), right: !!(v.i & 8), fire: false, select: null, exit: false, aim: v.ab !== undefined ? { beta: v.ab, el: v.ae ?? 0 } : undefined };
  });
  sim.projs = snap.p.map((q) => { const id = WEAPON_INDEX[q[2]], spec = WEAPONS[id]; return { id: q[0], owner: q[1], team: sim.ships[q[1]]?.team ?? 0, weapon: id, spec, b: { x: q[3], y: q[4], z: q[5], vx: q[6], vy: q[7], vz: q[8] }, age: q[9], target: null }; });
  return inputs;
}
