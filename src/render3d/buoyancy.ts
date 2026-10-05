import * as THREE from 'three';

/**
 * Nhấp nhô theo sóng: lấy mẫu độ cao ở mũi/đuôi/hai mạn, suy ra cao độ, chúi và nghiêng.
 * Góc kẹp theo design/env-and-fx.md mục 3 (lăn ±1.5°, chúi ±1°) để ô lưới không bị che.
 * `heading` là góc quanh Y của hướng mũi (mũi +Z gốc).
 */
export function floatOnWaves(
  obj: THREE.Object3D, heading: number, half: number, wide: number, t: number,
  heightAt: (x: number, z: number, t: number) => number, clamp = true,
) {
  const { x, z } = obj.position;
  const fx = Math.sin(heading), fz = Math.cos(heading), rx = fz, rz = -fx;
  const hB = heightAt(x + fx * half, z + fz * half, t), hS = heightAt(x - fx * half, z - fz * half, t);
  const hR = heightAt(x + rx * wide, z + rz * wide, t), hL = heightAt(x - rx * wide, z - rz * wide, t);
  let pitch = -Math.atan2(hB - hS, 2 * half), roll = Math.atan2(hR - hL, 2 * wide);
  if (clamp) {
    const p = (1 * Math.PI) / 180, r = (1.5 * Math.PI) / 180;
    pitch = Math.max(-p, Math.min(p, pitch));
    roll = Math.max(-r, Math.min(r, roll));
  }
  obj.rotation.set(pitch, heading, roll, 'YXZ');
  obj.position.y = ((hB + hS + hR + hL) / 4) * 0.9;
}
