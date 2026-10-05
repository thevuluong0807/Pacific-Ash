import * as THREE from 'three';
import type { FxStyle } from './mapWorld';

/**
 * Hiệu ứng chiến đấu theo design/env-and-fx.md mục 8: lửa mõm, cột nước, cầu lửa, mảnh vỡ, khói, sóng xung kích,
 * lửa kéo dài trên ô trúng (tối đa 16), dầu loang. Hạt là sprite dùng lại (pool); tối đa 3 PointLight động.
 */

type TexId = 'smoke' | 'fire' | 'spark' | 'drop' | 'glow' | 'col';

function canvasTex(draw: (x: CanvasRenderingContext2D) => void, w = 128, h = 128) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  return new THREE.CanvasTexture(c);
}
const radial = (inner: string, outer: string) => canvasTex((x) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
});

let TEX: Record<TexId, THREE.Texture> | undefined;
const textures = () => (TEX ??= {
  smoke: radial('rgba(70,70,74,0.85)', 'rgba(40,40,44,0)'),
  fire: radial('rgba(255,225,150,1)', 'rgba(255,80,10,0)'),
  spark: radial('rgba(255,245,200,1)', 'rgba(255,170,60,0)'),
  drop: radial('rgba(210,230,245,0.95)', 'rgba(210,230,245,0)'),
  glow: radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
  col: canvasTex((x) => { // cột nước: dải đứng trắng xanh, mờ dần lên đỉnh
    const g = x.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0, 'rgba(220,235,245,0.95)'); g.addColorStop(0.7, 'rgba(190,215,230,0.7)'); g.addColorStop(1, 'rgba(190,215,230,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(40, 128); x.quadraticCurveTo(20, 40, 64, 0); x.quadraticCurveTo(108, 40, 88, 128); x.fill();
  }),
});

interface P {
  s: THREE.Sprite; live: boolean; age: number; life: number;
  vel: THREE.Vector3; grav: number; s0: number; s1: number; a0: number; stretch: number; drag: number;
}

export interface Burst {
  pos: THREE.Vector3; vel?: THREE.Vector3; spread?: number; count?: number; tex: TexId;
  size: [number, number]; life: [number, number]; grav?: number; color?: number; additive?: boolean; opacity?: number; stretch?: number; drag?: number;
}

export class Fx {
  readonly group = new THREE.Group();
  /** Diện mạo theo map (maps.md 4.2): lửa/nổ sáng hơn, khói tối hơn, nước ấm trên nền hoàng hôn. */
  style: FxStyle = { glow: 1, smoke: 0x2a2f35, dropTint: 0xffffff, vignette: 0.25 };
  particleScale = 0.8;
  /** Đơn vị thế giới trên một ô lưới (`CELL`): nhân kích thước, vận tốc, trọng lực của hạt. Mặc định 1 (kiểm thử). */
  unit = 1;
  private pool: P[] = [];
  private rings: { m: THREE.Mesh; age: number; life: number; r1: number; live: boolean }[] = [];
  private lights: { l: THREE.PointLight; age: number; life: number; peak: number }[] = [];
  private fires = new Map<string, { s: THREE.Sprite; smoke: THREE.Sprite; born: number; ember: boolean; base: number }>();
  private oils = new Map<string, THREE.Mesh>();
  private debris: { p: THREE.Vector3; v: THREE.Vector3; born: number; spin: THREE.Vector3 }[] = [];
  private debrisMesh: THREE.InstancedMesh;
  private t = 0;
  reduced = false;

  constructor(private heightAt: (x: number, z: number, t: number) => number) {
    this.debrisMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.025, 0.04), new THREE.MeshStandardMaterial({ color: 0x8793a0, roughness: 0.6, metalness: 0.8 }), 60);
    this.debrisMesh.count = 0; this.debrisMesh.frustumCulled = false;
    this.group.add(this.debrisMesh);
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xff8a30, 0, 14, 1.8);
      this.group.add(l);
      this.lights.push({ l, age: 9, life: 1, peak: 0 });
    }
  }

  private take(): P | null {
    let p = this.pool.find((x) => !x.live);
    if (!p) {
      if (this.pool.length >= 420) return null;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: true }));
      s.visible = false;
      this.group.add(s);
      p = { s, live: false, age: 0, life: 1, vel: new THREE.Vector3(), grav: 0, s0: 1, s1: 1, a0: 1, stretch: 1, drag: 0 };
      this.pool.push(p);
    }
    return p;
  }

  burst(b: Burst) {
    const n = Math.max(1, Math.round((b.count ?? 1) * (b.count && b.count > 1 ? this.particleScale : 1)));
    const tx = textures();
    for (let i = 0; i < n; i++) {
      const p = this.take();
      if (!p) return;
      const m = p.s.material as THREE.SpriteMaterial;
      m.map = tx[b.tex]; m.color.setHex(b.color ?? 0xffffff);
      if (b.additive) m.color.multiplyScalar(this.style.glow);
      else if (b.tex === 'drop' || b.tex === 'col') m.color.multiply(new THREE.Color(this.style.dropTint));
      m.blending = b.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      m.fog = !b.additive; m.needsUpdate = true;
      const sp = b.spread ?? 0;
      p.s.position.copy(b.pos);
      p.vel.set((b.vel?.x ?? 0) + (Math.random() - 0.5) * sp, (b.vel?.y ?? 0) + (Math.random() - 0.3) * sp, (b.vel?.z ?? 0) + (Math.random() - 0.5) * sp);
      p.age = 0; p.life = b.life[0] + Math.random() * (b.life[1] - b.life[0]);
      const U = this.unit;
      p.vel.multiplyScalar(U);
      p.s0 = b.size[0] * U; p.s1 = b.size[1] * U; p.a0 = b.opacity ?? 1; p.grav = (b.grav ?? 0) * U; p.stretch = b.stretch ?? 1; p.drag = b.drag ?? 0;
      p.live = true; p.s.visible = true;
    }
  }

  glowTex() { return textures().glow; }

  ring(pos: THREE.Vector3, r1: number, life = 0.5, color = 0xcfe4f2) {
    let r = this.rings.find((x) => !x.live);
    if (!r) {
      if (this.rings.length >= 16) return;
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide }));
      this.group.add(m);
      r = { m, age: 0, life, r1: r1 * this.unit, live: false };
      this.rings.push(r);
    }
    (r.m.material as THREE.MeshBasicMaterial).color.setHex(color);
    r.m.position.set(pos.x, this.heightAt(pos.x, pos.z, this.t) + 0.04, pos.z);
    r.age = 0; r.life = life; r.r1 = r1 * this.unit; r.live = true; r.m.visible = true;
  }

  light(pos: THREE.Vector3, intensity: number, ms: number, color = 0xff8a30) {
    const slot = this.lights.reduce((a, b) => (b.age / b.life > a.age / a.life ? b : a));
    slot.l.position.copy(pos); slot.l.color.setHex(color);
    slot.age = 0; slot.life = ms / 1000; slot.peak = intensity * this.unit ** 1.8; slot.l.distance = 14 * this.unit;
  }

  debrisBurst(pos: THREE.Vector3, n: number) {
    n = Math.round(n * this.particleScale);
    const U = this.unit;
    for (let i = 0; i < n && this.debris.length < 60; i++) {
      this.debris.push({ p: pos.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 2.4 * U, (1.6 + Math.random() * 2.2) * U, (Math.random() - 0.5) * 2.4 * U), born: this.t, spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8) });
    }
  }

  // ---- hiệu ứng ghép sẵn ----
  muzzle(pos: THREE.Vector3, dir: THREE.Vector3, big: boolean) {
    this.burst({ pos, vel: dir.clone().multiplyScalar(big ? 3 : 2), spread: 0.8, count: big ? 18 : 10, tex: 'fire', size: big ? [0.5, 0.9] : [0.25, 0.45], life: [0.08, big ? 0.22 : 0.14], additive: true });
    this.burst({ pos, vel: new THREE.Vector3(0, 0.6, 0).addScaledVector(dir, 0.5), spread: 0.6, count: big ? 14 : 6, tex: 'smoke', size: [0.2, big ? 1.4 : 0.8], life: [0.8, 1.6], opacity: 0.6 });
    this.light(pos, big ? 60 : 24, big ? 200 : 120);
  }

  splash(pos: THREE.Vector3, big: boolean) {
    const h = big ? 1.1 : 0.6;
    this.burst({ pos: pos.clone().setY(pos.y + h * 0.5 * this.unit), tex: 'col', size: [h * 0.5, h], life: [0.45, 0.6], opacity: 0.85, stretch: 1 });
    this.burst({ pos, vel: new THREE.Vector3(0, big ? 2.4 : 1.6, 0), spread: 1.6, count: big ? 22 : 12, tex: 'drop', size: [0.08, 0.04], life: [0.5, 0.9], grav: 5 });
    this.burst({ pos, count: big ? 5 : 3, tex: 'smoke', size: [0.3, big ? 1.2 : 0.7], life: [0.5, 0.8], opacity: 0.35, spread: 0.3 });
    this.ring(pos, big ? 1.3 : 0.8, big ? 0.7 : 0.5);
  }

  hit(pos: THREE.Vector3, torpedo = false) {
    this.burst({ pos, tex: 'glow', size: [0.7, 0.2], life: [0.08, 0.08], additive: true, color: 0xfff3c4 }); // chớp lõi 80 ms
    this.burst({ pos, count: 4, tex: 'fire', size: [0.3, 1.0], life: [0.3, 0.45], additive: true, spread: 0.3, vel: new THREE.Vector3(0, 0.6, 0), color: 0xff9a2a }); // cầu lửa 400 ms
    this.burst({ pos, count: 3, tex: 'fire', size: [0.2, 0.7], life: [0.25, 0.4], additive: true, spread: 0.4, color: 0xe8451c });
    this.burst({ pos, count: torpedo ? 18 : 12, tex: 'spark', size: [0.08, 0.02], life: [0.4, 0.9], vel: new THREE.Vector3(0, 2, 0), spread: 3.5, grav: 6, additive: true });
    this.burst({ pos: pos.clone().setY(pos.y + 0.1 * this.unit), count: 7, tex: 'smoke', size: [0.3, 1.5], life: [3, 4], vel: new THREE.Vector3(0.1, 0.5, 0), spread: 0.4, opacity: 0.7, color: this.style.smoke });
    this.debrisBurst(pos, torpedo ? 24 : 16);
    this.light(pos, 90, torpedo ? 450 : 400);
    this.ring(pos, 1.6, 0.5, 0xffb070);
    if (torpedo) this.burst({ pos: pos.clone().setY(1.0 * this.unit), tex: 'col', size: [0.8, 1.4], life: [0.7, 0.9], opacity: 0.9 });
  }

  /** Lửa kéo dài ở ô trúng; vượt 16 ngọn thì ngọn cũ nhất thu nhỏ thành than hồng. `null` để tắt. */
  setFire(key: string, pos: THREE.Vector3 | null) {
    const cur = this.fires.get(key);
    if (!pos) { if (cur) { this.group.remove(cur.s, cur.smoke); this.fires.delete(key); } return; }
    if (cur) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().fire, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: textures().smoke, transparent: true, depthWrite: false, opacity: 0.4, color: 0x151719 }));
    s.position.copy(pos); smoke.position.copy(pos);
    this.group.add(s, smoke);
    this.fires.set(key, { s, smoke, born: this.t, ember: false, base: 0.25 + Math.random() * 0.15 });
    const live = [...this.fires.values()].filter((f) => !f.ember);
    if (live.length > 16) live.sort((a, b) => a.born - b.born)[0].ember = true;
  }
  hasFire(key: string) { return this.fires.has(key); }
  fireKeys() { return [...this.fires.keys()]; }

  /** Dầu loang đen + lửa nhỏ nơi tàu đã chìm (tồn tại đến hết ván). */
  setOil(key: string, center: THREE.Vector3 | null, radius = 1.2) {
    const cur = this.oils.get(key);
    if (!center) { if (cur) { this.group.remove(cur); this.oils.delete(key); } return; }
    if (cur) return;
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshStandardMaterial({ color: 0x06090b, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(center.x, 0.03, center.z);
    m.scale.set(1.5, 1, 1);
    this.group.add(m);
    this.oils.set(key, m);
  }
  oilKeys() { return [...this.oils.keys()]; }

  clearTransient() {
    for (const p of this.pool) { p.live = false; p.s.visible = false; }
    for (const r of this.rings) { r.live = false; r.m.visible = false; }
    this.debris.length = 0; this.debrisMesh.count = 0;
    for (const l of this.lights) { l.l.intensity = 0; l.age = 9; }
  }

  update(dt: number, t: number) {
    this.t = t;
    for (const p of this.pool) {
      if (!p.live) continue;
      p.age += dt;
      if (p.age >= p.life) { p.live = false; p.s.visible = false; continue; }
      const u = p.age / p.life;
      p.vel.y -= p.grav * dt;
      if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.s.position.addScaledVector(p.vel, dt);
      const sz = THREE.MathUtils.lerp(p.s0, p.s1, u);
      p.s.scale.set(sz, sz * p.stretch, 1);
      (p.s.material as THREE.SpriteMaterial).opacity = p.a0 * (1 - u * u);
    }
    for (const r of this.rings) {
      if (!r.live) continue;
      r.age += dt;
      if (r.age >= r.life) { r.live = false; r.m.visible = false; continue; }
      const u = r.age / r.life;
      r.m.scale.setScalar(0.1 + r.r1 * u);
      (r.m.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - u);
    }
    for (const l of this.lights) {
      l.age += dt;
      l.l.intensity = l.age >= l.life ? 0 : l.peak * (1 - l.age / l.life);
    }
    for (const [, f] of this.fires) { // ngọn lửa nhấp nháy 8 Hz; ngọn "than hồng" nhỏ và mờ
      const k = 0.8 + 0.2 * Math.sin(t * 50 + f.base * 40);
      const U = this.unit, sc = (f.ember ? 0.12 : f.base * k) * U;
      f.s.scale.set(sc * 0.8, sc, 1);
      (f.s.material as THREE.SpriteMaterial).opacity = f.ember ? 0.5 : 1;
      f.smoke.scale.setScalar((f.ember ? 0.2 : 0.5) * U);
      f.smoke.position.y = f.s.position.y + (0.25 + (t * 0.1 % 0.5)) * U;
    }
    const o = new THREE.Object3D();
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i], e = t - d.born;
      const y = d.p.y + d.v.y * e - 4.9 * this.unit * e * e;
      if (e > 2.4 || (e > 0.3 && y < 0)) {
        if (e <= 2.4) this.burst({ pos: new THREE.Vector3(d.p.x + d.v.x * e, 0.05, d.p.z + d.v.z * e), tex: 'drop', count: 2, size: [0.1, 0.03], life: [0.2, 0.35], spread: 0.4, vel: new THREE.Vector3(0, 0.8, 0), grav: 4 }); // rơi xuống nước tạo bọt nhỏ
        this.debris.splice(i, 1); continue;
      }
      o.position.set(d.p.x + d.v.x * e, y, d.p.z + d.v.z * e);
      o.rotation.set(d.spin.x * e, d.spin.y * e, d.spin.z * e);
      o.scale.setScalar(this.unit);
      o.updateMatrix();
      this.debrisMesh.setMatrixAt(i, o.matrix);
    }
    this.debrisMesh.count = this.debris.length;
    this.debrisMesh.instanceMatrix.needsUpdate = true;
  }
}
