import * as THREE from 'three';

/** Tiện ích hiệu ứng nhỏ dùng chung giữa các map: ngọn lửa, cột khói, tro lửa bay. */

export function glowTexture(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

let fireTex: THREE.Texture | undefined, smokeTex: THREE.Texture | undefined;
export const fireTexture = () => (fireTex ??= glowTexture('rgba(255,215,130,1)', 'rgba(255,90,20,0)'));
export const smokeTexture = () => (smokeTex ??= glowTexture('rgba(28,26,28,0.9)', 'rgba(28,26,28,0)'));

/** Ngọn lửa nhấp nháy + cột khói đen nghiêng theo gió 12° về +X. Gắn vào `parent` tại `pos`. */
export class FireSpot {
  readonly pos: THREE.Vector3;
  private flame: THREE.Sprite;
  private smoke: { s: THREE.Sprite; phase: number }[] = [];
  private phase = Math.random() * 6;

  constructor(parent: THREE.Object3D, pos: THREE.Vector3, private size: number, private smokeHeight = 12, smokeCount = 5, smokeColor = 0x15181c) {
    this.pos = pos.clone();
    this.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    this.flame.position.copy(pos);
    parent.add(this.flame);
    for (let i = 0; i < smokeCount; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTexture(), transparent: true, depthWrite: false, opacity: 0, color: smokeColor }));
      parent.add(s);
      this.smoke.push({ s, phase: i / smokeCount });
    }
  }

  update(t: number) {
    const k = 0.85 + 0.15 * Math.sin(t * 9 + this.phase) + 0.08 * Math.sin(t * 23 + this.phase * 3);
    this.flame.scale.set(this.size * 0.7 * k, this.size * k, 1);
    const wind = Math.tan((12 * Math.PI) / 180);
    for (const m of this.smoke) {
      const life = (t * 0.1 + m.phase) % 1, rise = life * this.smokeHeight;
      m.s.position.set(this.pos.x + rise * wind, this.pos.y + this.size * 0.4 + rise, this.pos.z);
      const sc = this.size * (0.7 + life * 1.8);
      m.s.scale.set(sc, sc, 1);
      (m.s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.5;
    }
  }
}

/** Tro lửa: hạt than hồng bốc lên từ các điểm cháy, sống 4–7 s, dạt +X 0.5. Cập nhật bằng CPU (≤ 700 hạt). */
export class Embers {
  readonly points: THREE.Points;
  private pos: Float32Array; private col: Float32Array; private vel: Float32Array; private age: Float32Array; private life: Float32Array;
  private count = 0;
  private cA = new THREE.Color('#FFD27A'); private cB = new THREE.Color('#FF5A1A'); private cC = new THREE.Color('#3A2A22');

  constructor(private max: number, private emitters: () => THREE.Vector3[]) {
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max); this.life = new Float32Array(max).fill(0);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
    this.points.frustumCulled = false;
    this.setCount(max);
  }

  setCount(n: number) { this.count = Math.min(n, this.max); this.points.geometry.setDrawRange(0, this.count); }

  update(dt: number) {
    const em = this.emitters();
    const c = new THREE.Color();
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] >= this.life[i]) { // hồi sinh tại một điểm cháy
        const e = em[(Math.random() * em.length) | 0];
        if (!e) { this.pos[i * 3 + 1] = -999; continue; }
        this.pos.set([e.x + (Math.random() - 0.5) * 2, e.y, e.z + (Math.random() - 0.5)], i * 3);
        this.vel.set([0.5 + (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4], i * 3);
        this.age[i] = Math.random() * 0.2; this.life[i] = 4 + Math.random() * 3;
      }
      this.age[i] += dt;
      const f = Math.min(1, this.age[i] / this.life[i]);
      for (let k = 0; k < 3; k++) this.pos[i * 3 + k] += this.vel[i * 3 + k] * dt;
      if (f < 0.4) c.copy(this.cA).lerp(this.cB, f / 0.4); else c.copy(this.cB).lerp(this.cC, (f - 0.4) / 0.6);
      c.multiplyScalar(1 - f * f);
      this.col.set([c.r, c.g, c.b], i * 3);
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}
