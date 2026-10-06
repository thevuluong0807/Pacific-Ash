import * as THREE from 'three';
import { CELL as K } from './scale';

/** Tiện ích dùng chung cho các module cinematic (design/cinematics.md). */
export interface CamPose { pos: THREE.Vector3; look: THREE.Vector3; fov: number; /** nghiêng đường chân trời (rad) */ roll?: number }

export const UP = new THREE.Vector3(0, 1, 0);
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const smooth = (u: number) => { const k = Math.min(1, Math.max(0, u)); return k * k * (3 - 2 * k); };
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const lerpV = (a: THREE.Vector3, b: THREE.Vector3, u: number) => a.clone().lerp(b, u);
export const prog = (t: number, t0: number, t1: number) => Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
export const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;
export const deg = (d: number) => (d * Math.PI) / 180;

/** Khung toạ độ: `P(f, r, u)` = gốc + dọc thân f + ngang r (mạn phải dương) + lên u, tính theo ô lưới (nhân `K`). */
export class Frame {
  /** `us`: hệ số kéo cao theo model tàu (HEIGHT) cho khung gắn với tàu, để độ cao trong thiết kế khớp thân tàu đã kéo cao. */
  constructor(public c: THREE.Vector3, public F: THREE.Vector3, public R: THREE.Vector3, public us = 1) {}
  P(f: number, r: number, u: number) { return this.c.clone().addScaledVector(this.F, f * K).addScaledVector(this.R, r * K).addScaledVector(UP, u * K * this.us); }
  static toward(c: THREE.Vector3, dir: THREE.Vector3) {
    const F = V(dir.x, 0, dir.z).normalize();
    return new Frame(c, F, V(-F.z, 0, F.x));
  }
}

/** Nút theo tên trong cây node của rig (điểm neo, bộ phận động). */
export function named(root: THREE.Object3D, name: string): THREE.Object3D | undefined {
  let f: THREE.Object3D | undefined;
  root.traverse((o) => { if (!f && o.name === name) f = o; });
  return f;
}

/** Vị trí thế giới của một node. */
export function wp(o: THREE.Object3D) { o.updateWorldMatrix(true, false); return o.getWorldPosition(V()); }
