import * as THREE from 'three';

/** Hạt điểm có kích thước theo khoảng cách, hai hồ: cộng sáng (lửa, chớp nòng, vệt đạn) và pha trộn thường (khói, nước bắn). */
interface P { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; s0: number; s1: number; c0: THREE.Color; c1: THREE.Color; a0: number; a1: number; drag: number; grav: number }
export interface Emit {
  pos: THREE.Vector3 | { x: number; y: number; z: number };
  vel?: { x: number; y: number; z: number };
  life: number; size: [number, number]; color: [number, number]; alpha?: [number, number];
  drag?: number; gravity?: number;
}

const VERT = /* glsl */ `
  attribute float aSize; attribute vec4 aCol; uniform float uPx; varying vec4 vCol;
  void main() { vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * uPx / max(1., -mv.z), 0., 600.); }`;
const FRAG = /* glsl */ `
  varying vec4 vCol;
  void main() { float d = length(gl_PointCoord - .5) * 2.; float a = smoothstep(1., .15, d) * vCol.a; if (a < .003) discard; gl_FragColor = vec4(vCol.rgb, a); }`;

class Pool {
  readonly points: THREE.Points;
  private ps: P[] = [];
  private pos: Float32Array; private col: Float32Array; private size: Float32Array;
  private geo = new THREE.BufferGeometry();
  readonly mat: THREE.ShaderMaterial;
  constructor(private cap: number, additive: boolean) {
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 4); this.size = new Float32Array(cap);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aCol', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uPx: { value: 800 } },
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 6 : 5;
  }
  add(p: P) { if (this.ps.length >= this.cap) this.ps.shift(); this.ps.push(p); }
  update(dt: number) {
    const tmp = new THREE.Color();
    let n = 0;
    const live: P[] = [];
    for (const p of this.ps) {
      p.life -= dt;
      if (p.life <= 0) continue;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy = p.vy * k - p.grav * dt; p.vz *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const u = 1 - p.life / p.max;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = p.y; this.pos[n * 3 + 2] = p.z;
      tmp.copy(p.c0).lerp(p.c1, u);
      this.col[n * 4] = tmp.r; this.col[n * 4 + 1] = tmp.g; this.col[n * 4 + 2] = tmp.b; this.col[n * 4 + 3] = p.a0 + (p.a1 - p.a0) * u;
      this.size[n] = p.s0 + (p.s1 - p.s0) * u;
      n++;
      live.push(p);
    }
    this.ps = live;
    this.geo.setDrawRange(0, n);
    for (const a of ['position', 'aCol', 'aSize']) (this.geo.getAttribute(a) as THREE.BufferAttribute).needsUpdate = true;
  }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

/** Hiệu ứng chiến trường cho chế độ Hải chiến. Đơn vị thế giới (tàu cỡ 90–260). */
export class ArenaFx {
  readonly group = new THREE.Group();
  private add = new Pool(2600, true);
  private smoke = new Pool(2600, false);
  constructor(private heightAt: (x: number, z: number) => number) { this.group.add(this.smoke.points, this.add.points); }

  setViewport(px: number) { this.add.mat.uniforms.uPx.value = px; this.smoke.mat.uniforms.uPx.value = px; }

  private emit(pool: Pool, e: Emit) {
    const v = e.vel ?? { x: 0, y: 0, z: 0 }, c = (h: number) => new THREE.Color(h);
    pool.add({ x: e.pos.x, y: e.pos.y, z: e.pos.z, vx: v.x, vy: v.y, vz: v.z, life: e.life, max: e.life, s0: e.size[0], s1: e.size[1], c0: c(e.color[0]), c1: c(e.color[1]), a0: e.alpha?.[0] ?? 1, a1: e.alpha?.[1] ?? 0, drag: e.drag ?? 0, grav: e.gravity ?? 0 });
  }
  glow(e: Emit) { this.emit(this.add, e); }
  puff(e: Emit) { this.emit(this.smoke, e); }

  private rnd = (a: number, b: number) => a + Math.random() * (b - a);

  /** Chớp nòng: cầu lửa ngắn dọc hướng bắn, khói lan. `s` = cỡ khí tài (1 nhẹ … 3 nặng). */
  muzzle(p: { x: number; y: number; z: number }, d: { x: number; y: number; z: number }, s: number) {
    for (let i = 0; i < 4 + s * 3; i++) {
      const k = this.rnd(0.4, 1) * (6 + s * 9);
      this.glow({ pos: p, vel: { x: d.x * k * 6 + this.rnd(-8, 8), y: d.y * k * 6 + this.rnd(-4, 8), z: d.z * k * 6 + this.rnd(-8, 8) }, life: this.rnd(0.08, 0.2), size: [s * 7 + 4, 0.5], color: [0xfff1c0, 0xff7a20], drag: 4 });
    }
    for (let i = 0; i < 3 + s * 2; i++) this.puff({ pos: p, vel: { x: d.x * 30 + this.rnd(-12, 12), y: this.rnd(4, 14), z: d.z * 30 + this.rnd(-12, 12) }, life: this.rnd(1.2, 2.4), size: [s * 4 + 3, s * 14 + 10], color: [0xcfcfcf, 0x7d848a], alpha: [0.45, 0], drag: 0.9 });
  }

  /** Nổ trên thân/trên cạn: lửa, tia lửa, khói. `s` ≈ sát thương/60. */
  explode(p: { x: number; y: number; z: number }, s: number) {
    const R = 14 + s * 22;
    for (let i = 0; i < 10 + s * 12; i++) this.glow({ pos: p, vel: { x: this.rnd(-1, 1) * R * 2.2, y: this.rnd(0.2, 1.4) * R * 2.2, z: this.rnd(-1, 1) * R * 2.2 }, life: this.rnd(0.25, 0.7), size: [R * 0.9, 1], color: [0xffe6a0, 0xff4a10], drag: 3 });
    for (let i = 0; i < 6 + s * 8; i++) this.glow({ pos: p, vel: { x: this.rnd(-1, 1) * R * 6, y: this.rnd(0.2, 1) * R * 6, z: this.rnd(-1, 1) * R * 6 }, life: this.rnd(0.3, 0.9), size: [2.2, 0.4], color: [0xfff4c8, 0xff9a30], gravity: 90, drag: 0.6 });
    for (let i = 0; i < 6 + s * 6; i++) this.puff({ pos: p, vel: { x: this.rnd(-1, 1) * R * 0.8, y: this.rnd(0.4, 1.2) * R * 1.4, z: this.rnd(-1, 1) * R * 0.8 }, life: this.rnd(2.5, 5), size: [R * 0.6, R * 3], color: [0x2c2c2e, 0x8a8f94], alpha: [0.7, 0], drag: 0.8 });
  }

  /** Cột nước: nước bắn trắng bay lên rồi rơi, vòng bọt. `r` = bán kính nổ lan (0 = đạn nhỏ). */
  splash(x: number, z: number, r: number, t: number) {
    const y = this.heightAt(x, z) + 1, big = Math.min(1, 0.25 + r / 70), R = 5 + big * 24;
    for (let i = 0; i < 12 + big * 26; i++) this.puff({ pos: { x: x + this.rnd(-1, 1) * R * 0.4, y, z: z + this.rnd(-1, 1) * R * 0.4 }, vel: { x: this.rnd(-1, 1) * R * 0.9, y: this.rnd(0.6, 1.4) * R * 3.4, z: this.rnd(-1, 1) * R * 0.9 }, life: this.rnd(0.7, 1.5), size: [R * 0.35, R * 0.7], color: [0xffffff, 0xaec8d6], alpha: [0.85, 0], gravity: 55, drag: 0.5 });
    for (let i = 0; i < 10 + big * 14; i++) { const a = (i / (10 + big * 14)) * Math.PI * 2; this.puff({ pos: { x, y: y - 0.5, z }, vel: { x: Math.cos(a) * R * 1.3, y: 1, z: Math.sin(a) * R * 1.3 }, life: 1.4, size: [R * 0.5, R * 1.4], color: [0xe8f2f8, 0x9db8c6], alpha: [0.45, 0], drag: 1.2 });}
    void t;
  }

  trail(p: { x: number; y: number; z: number }, s: number, white = false) {
    this.puff({ pos: p, life: this.rnd(1.2, 2.2), size: [s, s * 4], color: white ? [0xffffff, 0xcdd6dc] : [0xb0b0b0, 0x6a7076], alpha: [0.5, 0], vel: { x: this.rnd(-2, 2), y: this.rnd(0, 4), z: this.rnd(-2, 2) }, drag: 0.5 });
  }
  flame(p: { x: number; y: number; z: number }, s: number) {
    this.glow({ pos: p, life: 0.16, size: [s * 2.4, s * 0.4], color: [0xfff0b0, 0xff6a1a] });
  }
  wake(p: { x: number; y: number; z: number }) {
    this.puff({ pos: { x: p.x, y: this.heightAt(p.x, p.z) + 0.6, z: p.z }, life: 3, size: [3, 9], color: [0xffffff, 0xaec8d6], alpha: [0.5, 0], vel: { x: this.rnd(-3, 3), y: 0.5, z: this.rnd(-3, 3) }, drag: 1 });
  }
  /** Khói đen/lửa nhỏ bốc từ tàu bị thương. */
  damageSmoke(p: { x: number; y: number; z: number }, hp01: number) {
    this.puff({ pos: p, vel: { x: this.rnd(-3, 3), y: this.rnd(14, 26), z: this.rnd(-3, 3) }, life: this.rnd(3, 5), size: [6, 26 + (1 - hp01) * 24], color: [0x1c1c1e, 0x6d7278], alpha: [0.65, 0], drag: 0.35 });
    if (hp01 < 0.3) this.glow({ pos: p, vel: { x: this.rnd(-2, 2), y: this.rnd(6, 14), z: this.rnd(-2, 2) }, life: 0.45, size: [9, 2], color: [0xffd070, 0xff4a10], alpha: [0.8, 0] });
  }

  update(dt: number) { this.add.update(dt); this.smoke.update(dt); }
  dispose() { this.add.dispose(); this.smoke.dispose(); }
}
