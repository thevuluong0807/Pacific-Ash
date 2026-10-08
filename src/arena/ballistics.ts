import { GRAVITY, type WeaponSpec } from './data';

/** Đạn một chất điểm. Dùng chung cho mô phỏng, đường ngắm trên HUD và máy tự ngắm (cùng bộ tích phân). */
export interface Ball { x: number; y: number; z: number; vx: number; vy: number; vz: number }

export const dirOf = (theta: number, el: number) => ({ x: Math.cos(el) * Math.sin(theta), y: Math.sin(el), z: Math.cos(el) * Math.cos(theta) });

/** Một bước vật lý: đẩy (tên lửa/rocket), trọng lực, cản không khí bậc hai, rồi dời vị trí. Ngư lôi không rơi. */
export function stepBall(b: Ball, w: WeaponSpec, dt: number) {
  let sp = Math.hypot(b.vx, b.vy, b.vz);
  if (w.accel > 0 && sp < w.vTop && sp > 1e-6) {
    const k = Math.min(w.accel * dt, w.vTop - sp) / sp;
    b.vx += b.vx * k; b.vy += b.vy * k; b.vz += b.vz * k;
  }
  b.vy -= GRAVITY * w.gScale * dt;
  if (w.drag > 0) {
    sp = Math.hypot(b.vx, b.vy, b.vz);
    const k = Math.max(0, 1 - w.drag * sp * dt);
    b.vx *= k; b.vy *= k; b.vz *= k;
  }
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
}

export interface Landing { x: number; z: number; t: number; points: number[] }

/** Mô phỏng đường đạn từ nòng tới khi chạm mặt nước (y ≤ 0) hoặc quá `tmax`. `points` = x,y,z liên tiếp, mỗi `dt`. */
export function trajectory(w: WeaponSpec, ox: number, oy: number, oz: number, theta: number, el: number, inherit: { x: number; z: number }, dt = 1 / 30, tmax = 20, keep = true): Landing {
  const d = dirOf(theta, el);
  const b: Ball = { x: ox, y: oy, z: oz, vx: d.x * w.v + inherit.x, vy: d.y * w.v, vz: d.z * w.v + inherit.z };
  const points: number[] = keep ? [b.x, b.y, b.z] : [];
  let t = 0;
  while (t < tmax) {
    const py = b.y, px = b.x, pz = b.z;
    stepBall(b, w, dt);
    t += dt;
    if (b.y <= 0) {
      const k = py / Math.max(1e-6, py - b.y);
      const hx = px + (b.x - px) * k, hz = pz + (b.z - pz) * k;
      if (keep) points.push(hx, 0, hz);
      return { x: hx, z: hz, t: t - dt + dt * k, points };
    }
    if (keep) points.push(b.x, b.y, b.z);
  }
  return { x: b.x, z: b.z, t, points };
}

/**
 * Góc ngẩng để đạn rơi cách `dist` (đo dọc hướng `theta`) kể từ nòng; null nếu ngoài tầm. Chọn cung thấp nhất trong giới hạn nòng.
 * `inherit` là vận tốc tàu cộng vào đạn.
 */
export function solveElevation(w: WeaponSpec, ox: number, oy: number, oz: number, theta: number, dist: number, inherit: { x: number; z: number }): number | null {
  if (w.kind === 'torpedo') return 0;
  const fx = Math.sin(theta), fz = Math.cos(theta);
  const range = (el: number) => { const l = trajectory(w, ox, oy, oz, theta, el, inherit, 1 / 30, 25, false); return (l.x - ox) * fx + (l.z - oz) * fz; };
  const lo = w.elMin, hi = w.elHi, N = 28;
  let prevE = lo, prevR = range(lo);
  if (prevR >= dist && lo <= w.elMin + 1e-9 && prevR - dist < 2) return lo;
  for (let i = 1; i <= N; i++) {
    const e = lo + ((hi - lo) * i) / N, r = range(e);
    if ((prevR - dist) * (r - dist) <= 0) {
      let a = prevE, b = e;
      for (let k = 0; k < 14; k++) { const m = (a + b) / 2; if ((range(a) - dist) * (range(m) - dist) <= 0) b = m; else a = m; }
      return (a + b) / 2;
    }
    prevE = e; prevR = r;
  }
  return null;
}
