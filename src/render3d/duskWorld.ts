import * as THREE from 'three';
import { floatOnWaves } from './buoyancy';
import { Embers, FireSpot, glowTexture } from './fx';
import type { FxStyle, Layout, MapWorld, QualityConfig } from './mapWorld';
import { Ocean } from './ocean';
import { CALM_ZONE, CELL, WAVE_UNIT, WORLD_SCALE } from './scale';
import { buildWarship } from './warship';

/**
 * Map "Trường Sa": hoàng hôn, quần đảo cháy, nhiều tàu bắn tên lửa qua nhau (design/maps.md mục 2, 4, 8).
 * Mọi màn dùng chung một bộ phông (mục 4.6); `layout` chỉ đổi mật độ sự kiện nền (menu dày, play thưa).
 */

const FOG = new THREE.Color('#2A1420');

const skyVert = 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
const skyFrag = /* glsl */ `
uniform float uTime, uFlash; uniform vec3 uSun; varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.05; a *= .5; } return s; }
vec3 ramp(float e) { // e: 0 chân trời .. 1 đỉnh. #FF9A3A -> #E0661F (14%) -> #8A3216 (28%) -> #2B1424 (55%) -> #0A0710
  vec3 a = vec3(1., .604, .227), b = vec3(.878, .4, .122), c = vec3(.541, .196, .086), d = vec3(.169, .078, .141), f = vec3(.039, .027, .063);
  if (e < .14) return mix(a, b, e / .14);
  if (e < .28) return mix(b, c, (e - .14) / .14);
  if (e < .55) return mix(c, d, (e - .28) / .27);
  return mix(d, f, clamp((e - .55) / .45, 0., 1.));
}
void main() {
  vec3 v = normalize(vDir);
  float e = pow(clamp(v.y, 0., 1.), .7);
  vec3 col = ramp(e);
  float s = max(dot(v, uSun), 0.);
  col += vec3(1., .478, .102) * (pow(s, 10.) * .55 + pow(s, 80.) * .5);                // hào quang #FF7A1A
  col = mix(col, vec3(1., .824, .478), smoothstep(.9992, .9997, s));                    // đĩa mặt trời #FFD27A, nửa chìm dưới chân trời
  // hai lớp mây tối viền cam, trôi chậm 0.3 đơn vị/giây
  for (int i = 0; i < 2; i++) {
    float sc = i == 0 ? .5 : .9;
    vec2 p = v.xz / (v.y + .22) * sc + vec2(uTime * .006 * (i == 0 ? 1. : 1.6), 0.);
    float d = fbm(p + float(i) * 7.);
    float cl = smoothstep(.42, .72, d) * smoothstep(-.02, .12, v.y);
    float rim = smoothstep(.3, .55, d) * (1. - smoothstep(.55, .78, d)) * (.35 + .65 * pow(s, 2.));
    col = mix(col, vec3(.1, .05, .09), cl * .8);
    col += vec3(1., .42, .12) * rim * .5 * (1. - e);
  }
  col *= .78;                                                                           // tối hơn bản cũ ~30%
  col += vec3(1., .5, .15) * uFlash * .2 * (1. - e);                                    // chớp nổ chân trời +20%
  gl_FragColor = vec4(col, 1.);
}`;



interface Shell { t0: number; dur: number; a: THREE.Vector3; b: THREE.Vector3; line: THREE.Line; hit: boolean }
interface Debris { p: THREE.Vector3; v: THREE.Vector3; born: number; rot: THREE.Vector3 }

export class DuskWorld implements MapWorld {
  readonly id = 'truong_sa' as const;
  readonly style: FxStyle = { glow: 1.25, smoke: 0x1a1e22, dropTint: 0xffe0c8, vignette: 0.3 };
  private root = new THREE.Group();
  /** Phóng phông nền (S) và sóng/sương (U) ở chế độ trận; menu giữ nguyên. */
  private readonly S: number;
  private readonly U: number;
  private readonly FD: number;
  private readonly proxy = new THREE.PerspectiveCamera();
  private ocean: Ocean;
  private skyMat: THREE.ShaderMaterial;
  private skyMesh: THREE.Mesh;
  private fires: FireSpot[] = [];
  private embers: Embers;
  private ships: { obj: THREE.Group; y0: number; heading: number }[] = [];
  private reef: THREE.Mesh[] = [];
  private shells: Shell[] = [];
  private debris: Debris[] = [];
  private debrisMesh: THREE.InstancedMesh;
  private blasts: { s: THREE.Sprite; t0: number; kind: 'fire' | 'dust' }[] = [];
  private flashLight: THREE.PointLight;
  private horizon: THREE.Sprite;
  private key: THREE.DirectionalLight;
  private nextVolley = 3;
  private nextFlash = 4;
  private flashT = -10;
  private paused = false;
  private pausedUntil = 0;
  private underwater = false;
  private sun: THREE.Vector3;
  private quality: QualityConfig = { rain: true, fog: true, oceanReflection: true, particleScale: 0.8, pixelRatioMax: 1.5 };
  private clock = 0;
  private baseKey = 1.1;

  constructor(private scene: THREE.Scene, private layout: Layout) {
    // menu: mặt trời ở chính giữa chân trời; gameplay: bên phải, sau lưới địch
    this.sun = (layout === 'menu' ? new THREE.Vector3(0.1, 0.04, -0.99) : new THREE.Vector3(0.35, 0.05, -0.93)).normalize();
    this.S = layout === 'play' ? WORLD_SCALE : 1; this.U = layout === 'play' ? WAVE_UNIT : 1; this.FD = layout === 'play' ? CELL : 1;
    scene.fog = new THREE.FogExp2(FOG.getHex(), 0.008 / this.FD);
    this.root.scale.setScalar(this.S);

    this.skyMat = new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 }, uFlash: { value: 0 }, uSun: { value: this.sun } } });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), this.skyMat);
    this.skyMesh.frustumCulled = false; this.skyMesh.renderOrder = -10;
    this.root.add(this.skyMesh);

    // biển sáng hơn bản trước: chân trời #6A3420, giữa #3A1D18, gần #0C070A (vẫn tối ở gần camera cho lưới 2D dễ đọc); biên độ sóng ×0.85
    this.ocean = new Ocean({ fogColor: FOG, fogDensity: 0.008 / this.FD, waveScale: 0.85, unit: this.U, radius: this.S > 1 ? 200 * CELL / this.S : 220, calm: this.S > 1 ? CALM_ZONE : undefined });
    this.ocean.setPalette({ Horizon: '#6A3420', Zenith: '#1A0B14', Deep: '#0C070A', Mid: '#3A1D18', Foam: '#FFD9B0', FireColor: '#FFB15A', MoonColor: '#FFB15A', MoonDir: this.sun.clone(), MoonPow: 60, FireDir: this.sun.clone().setY(0.1) });
    this.root.add(this.ocean.mesh);

    this.key = new THREE.DirectionalLight(0xff8a4a, this.baseKey);
    this.key.position.copy(this.sun).multiplyScalar(100);
    this.root.add(this.key, new THREE.HemisphereLight(0x2a1a2a, 0x07050a, layout === 'play' ? 0.35 : 0.5));
    this.flashLight = new THREE.PointLight(0xff7a2a, 0, 40 * this.S, 1.6);
    this.root.add(this.flashLight);

    // môi trường phản chiếu: hoàng hôn tối + vệt mặt trời + ánh lửa (thay `tex_env_truong_sa`)
    this.root.add(new THREE.Group());
    this.buildIslands();
    this.buildStructures();
    this.buildShips();

    this.horizon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,170,80,1)', 'rgba(255,90,20,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
    this.horizon.scale.set(60, 30, 1);
    this.root.add(this.horizon);
    this.debrisMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.12, 0.18), new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 1 }), 80);
    this.debrisMesh.count = 0; this.debrisMesh.frustumCulled = false;
    this.root.add(this.debrisMesh);
    for (let i = 0; i < 6; i++) this.shells.push(this.makeShell());

    this.embers = new Embers(700, () => this.fires.map((f) => f.pos));
    this.root.add(this.embers.points);
    scene.add(this.root);
    this.setQuality(this.quality);
  }

  heightAt = (x: number, z: number, t: number) => this.ocean.heightAt(x, z, t);
  /** Độ cao sóng theo toạ độ cục bộ của nhóm đã phóng S lần (cho vật nền nhấp nhô). */
  private localHeight = (x: number, z: number, t: number) => this.ocean.heightAt(x * this.S, z * this.S, t) / this.S;

  private blob(len: number, at: THREE.Vector3, thick = 1.5) {
    const g = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    const sand = new THREE.Color('#5A4234'), body = new THREE.Color('#2A1A1A');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + 0.12 * Math.sin(x * 5 + z * 3) + 0.08 * Math.sin(z * 7 - x * 2);
      p.setXYZ(i, x * n, y * thick, z * n);
      (y > 0.55 ? sand : body).toArray(col, i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    mesh.scale.set(len / 2, 1, len / 6.5);
    g.add(mesh);
    // nước nông xanh ngọc tối + sóng vỡ trên rạn
    const shallow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(74,138,130,0.85)', 'rgba(29,58,60,0)'), transparent: true, depthWrite: false, fog: true }));
    shallow.rotation.x = -Math.PI / 2; shallow.position.y = 0.04; shallow.scale.set(len * 0.85, len * 0.3, 1);
    const foamTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d')!; x.strokeStyle = 'rgba(255,210,190,0.9)'; x.lineWidth = 7; x.setLineDash([22, 10, 6, 14]); x.beginPath(); x.arc(128, 128, 118, 0, Math.PI * 2); x.stroke(); return new THREE.CanvasTexture(c); })();
    const reef = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false, opacity: 0.6, fog: true }));
    reef.rotation.x = -Math.PI / 2; reef.position.y = 0.08; reef.scale.set(len * 0.62, len * 0.2, 1);
    this.reef.push(reef);
    g.add(shallow, reef);
    g.position.copy(at);
    this.root.add(g);
    return g;
  }

  private menu() { return this.layout === 'menu'; }

  /** Cây dừa gãy cháy xém (bóng đen), đặt quanh `cx` trên đảo. */
  private palms(n: number, cx: number, cz: number, spread: number, burning: number) {
    const dark = new THREE.MeshStandardMaterial({ color: 0x120b0c, roughness: 1 });
    for (let i = 0; i < n; i++) {
      const palm = new THREE.Group();
      const h = 2 + Math.random();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, h, 5), dark);
      trunk.position.y = h / 2; trunk.rotation.z = (Math.random() - 0.5) * 0.5;
      palm.add(trunk);
      for (let k = 0; k < 5; k++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.3, 4), dark);
        leaf.position.set(Math.cos(k * 1.26) * 0.5, h, Math.sin(k * 1.26) * 0.5);
        leaf.rotation.set(Math.sin(k * 1.26) * 1.2, 0, -Math.cos(k * 1.26) * 1.2);
        palm.add(leaf);
      }
      palm.position.set(cx + (Math.random() - 0.5) * spread, 1.0, cz + (Math.random() - 0.5) * 5);
      this.root.add(palm);
      if (i < burning) this.fires.push(new FireSpot(this.root, palm.position.clone().add(new THREE.Vector3(0, h + 0.3, 0)), 1.6, 6, 3));
    }
  }

  /** Lô cốt nhỏ trên đảo. */
  private bunker(x: number, z: number, burning: boolean) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 2), new THREE.MeshStandardMaterial({ color: 0x2b2224, roughness: 0.9 }));
    m.position.set(x, 1.4, z);
    this.root.add(m);
    if (burning) this.fires.push(new FireSpot(this.root, new THREE.Vector3(x, 2.2, z), 2.2, 8, 3));
  }

  /**
   * Phông nền dùng chung mọi màn (maps.md 4.6): quần đảo gần hai bên, đảo nhỏ xa, nhà giàn, 6 tàu giao tranh, 2 tàu chìm.
   * Vùng giữa (|x| < 14) và z > −40 để trống cho lưới chơi.
   */
  private buildIslands() {
    const left = this.blob(66, new THREE.Vector3(-108, 0, -40), 3.0);   // tâm x −108 (đẩy ra vì lưới 3D to hơn), z −36
    const right = this.blob(62, new THREE.Vector3(114, 0, -42), 3.0);   // tâm x +114, z −42
    this.blob(18, new THREE.Vector3(-28, 0, -88), 1.4);                // 3 mỏm cát thấp, xa và mờ
    this.blob(14, new THREE.Vector3(22, 0, -100), 1.2);
    this.blob(20, new THREE.Vector3(100, 0, -76), 1.5);
    this.palms(6, left.position.x, left.position.z, 40, 2);
    this.palms(4, right.position.x, right.position.z, 36, 1);
    this.bunker(left.position.x - 24, left.position.z + 1, false);
    this.bunker(right.position.x + 22, right.position.z, true);
    const light = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 6, 8), new THREE.MeshStandardMaterial({ color: 0x2c2224, roughness: 0.9 }));
    light.position.set(left.position.x + 14, 3.6, left.position.z + 1);
    light.rotation.z = (10 * Math.PI) / 180;
    this.root.add(light);
    this.fires.push(new FireSpot(this.root, new THREE.Vector3(light.position.x - 0.5, 6.9, light.position.z), 2.4, 12, 4)); // tháp đèn đổ cháy
    this.islandX = [left.position.x, right.position.x];
  }
  private islandX = [-108, 114];

  private buildStructures() {
    const steel = new THREE.MeshStandardMaterial({ color: 0x1b1517, roughness: 0.7, metalness: 0.5 });
    const rig = new THREE.Group();
    for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 5, 6), steel); leg.position.set(x, 2, z); rig.add(leg);
    }
    for (const z of [-2.5, 2.5]) { const br = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.08, 0.08), steel); br.position.set(0, 2.2, z); br.rotation.z = 0.7; rig.add(br); }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 6), steel); deck.position.y = 4.4; rig.add(deck);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), steel); cab.position.set(-1, 5.4, 0); rig.add(cab);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 3, 5), steel); mast.position.set(1.5, 6.2, 0); rig.add(mast);
    const pos = new THREE.Vector3(this.islandX[1] - 6, 0, -42);   // nhà giàn to đang cháy trên đảo phải, cao 12
    rig.position.copy(pos);
    rig.scale.setScalar(2.2);
    this.root.add(rig);
    this.fires.push(new FireSpot(this.root, new THREE.Vector3(pos.x + 1.1, 5.6 * 2.2, pos.z), 7, 20, 6));
  }

  /** Điểm phóng/đích của tên lửa: boong 6 tàu giao tranh. */
  private fleet: { L: THREE.Vector3[]; R: THREE.Vector3[] } = { L: [], R: [] };
  private missiles: { head: THREE.Sprite; trail: THREE.Line; from: THREE.Vector3; to: THREE.Vector3; apex: number; period: number; phase: number; dur: number; t0: number; i: number }[] = [];

  private buildShips() {
    const add = (len: number, x: number, z: number, heading: number, pitch: number, y: number, fireAt?: [number, number, number], fireSize = 4) => {
      const w = buildWarship(String(10 + this.ships.length));
      w.scale.setScalar(len / 50);
      const g = new THREE.Group();
      g.add(w);
      w.rotation.x = pitch;
      g.position.set(x, y, z);
      g.rotation.y = heading;
      this.root.add(g);
      this.ships.push({ obj: g, y0: y, heading });
      if (fireAt) this.fires.push(new FireSpot(this.root, new THREE.Vector3(x + fireAt[0], y + fireAt[1], z + fireAt[2]), fireSize, 16, 5));
      return g;
    };
    // 6 chiến hạm giao tranh: 3 bên trái (mũi hướng phải, +X), 3 bên phải (mũi hướng trái); |x| ≥ 24, z −20…−55
    const R = Math.PI / 2;
    const spec: [number, number, number, number, 'L' | 'R'][] = [
      [22, -80, -24, R, 'L'], [15, -124, -50, R, 'L'], [14, -76, -62, R, 'L'],
      [22, 82, -26, -R, 'R'], [16, 128, -51, -R, 'R'], [14, 78, -63, -R, 'R'],
    ];
    for (const [len, x, z, h, side] of spec) {
      add(len, x, z, h, 0, 0);
      const deck = new THREE.Vector3(x, 4 * (len / 50) + 1.5, z);
      this.fleet[side].push(deck);
      this.fires.push(new FireSpot(this.root, deck.clone().add(new THREE.Vector3(side === 'L' ? 1 : -1, 0.5, 0)), 1.4, 5, 2)); // lửa phóng và khói trên thượng tầng
    }
    // tàu chìm A (phải) nghiêng 20°, thượng tầng cháy; tàu chìm B (trái) nghiêng ~50°, mũi chìm. Tư thế cố định, lún 0.02/phút.
    const A: [number, number] = [150, -58], B: [number, number] = [-152, -64];
    add(20, A[0], A[1], 0.5, 0.35, -0.5, [0, 4.2, 0], 5);
    const oil = new THREE.Mesh(new THREE.CircleGeometry(10, 32), new THREE.MeshBasicMaterial({ color: 0x06090b, transparent: true, opacity: 0.6, depthWrite: false }));
    oil.rotation.x = -Math.PI / 2; oil.position.set(A[0], 0.05, A[1]); this.root.add(oil);
    this.fires.push(new FireSpot(this.root, new THREE.Vector3(A[0] + 3, 0.4, A[1] + 2), 2, 6, 2));
    add(14, B[0], B[1], -0.9, 0.87, 0.5, [0, 4, 0], 2.2);

    // 6 vệt tên lửa bắc cầu qua giữa trời (đỉnh 25–30 > 18), luân phiên trái → phải, phải → trái
    for (let i = 0; i < 6; i++) {
      const fwd = i % 2 === 0, a = this.fleet[fwd ? 'L' : 'R'][i % 3], b = this.fleet[fwd ? 'R' : 'L'][(i + 1) % 3];
      const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,235,190,1)', 'rgba(255,120,40,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      head.scale.setScalar(1.6); head.visible = false;
      const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0xf2e8e0, transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
      trail.visible = false; trail.frustumCulled = false;
      this.root.add(head, trail);
      this.missiles.push({ head, trail, from: a, to: b, apex: 25 + (i % 3) * 2.5, period: 6 + i * 0.8, phase: 1 + i * 1.1, dur: 3.4, t0: -1, i });
    }
  }

  /** Nổ nhỏ do tên lửa trúng: cầu lửa và khói, không có cột đất đá. */
  private puff(t: number, p: THREE.Vector3) {
    const mk = (kind: 'fire' | 'dust', color: number, scale: number, tex: THREE.Texture) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, blending: kind === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false, fog: false }));
      s.position.copy(p); s.scale.setScalar(scale);
      this.root.add(s);
      this.blasts.push({ s, t0: t, kind });
    };
    mk('fire', 0xffffff, 2, glowTexture('rgba(255,230,160,1)', 'rgba(255,90,20,0)'));
    mk('dust', 0x2a1612, 2, glowTexture('rgba(30,15,18,0.9)', 'rgba(30,15,18,0)'));
  }

  private updateMissiles(t: number, idle: boolean) {
    const play = this.layout === 'play', full = this.quality.rain || this.quality.fog;
    const active = play ? 2 : full ? 6 : 3; // gameplay: 2 vệt; chất lượng thấp: 3 vệt
    for (const m of this.missiles) {
      if (!idle && m.t0 < 0) { m.head.visible = false; m.trail.visible = false; continue; }
      if (m.t0 < 0) {
        if (m.i < active && t >= m.phase) { m.t0 = t; m.phase = t + m.period * (0.8 + 0.4 * Math.random()); } // phase = mốc phóng kế tiếp
        else { m.head.visible = false; m.trail.visible = false; continue; }
      }
      const u = (t - m.t0) / m.dur;
      if (u >= 1) { this.puff(t, m.to); m.t0 = -1; m.head.visible = false; m.trail.visible = false; continue; }
      const at = (w: number, out: THREE.Vector3) => out.lerpVectors(m.from, m.to, w).setY(THREE.MathUtils.lerp(m.from.y, m.to.y, w) + 4 * m.apex * w * (1 - w));
      const pos = m.trail.geometry.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
      for (let i = 0; i < 24; i++) { at(Math.max(0, u - (i / 23) * 0.3), v); pos.setXYZ(i, v.x, v.y, v.z); }
      pos.needsUpdate = true;
      at(u, m.head.position);
      m.head.visible = m.trail.visible = true;
      (m.trail.material as THREE.LineBasicMaterial).opacity = 0.55 * Math.min(1, u * 6);
    }
  }

  private makeShell(): Shell {
    const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 14 }, () => new THREE.Vector3()));
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xffd27a, dashSize: 0.8, gapSize: 0.5, transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
    line.visible = false; line.frustumCulled = false;
    this.root.add(line);
    return { t0: -1, dur: 1.2, a: new THREE.Vector3(), b: new THREE.Vector3(), line, hit: true };
  }

  private fire(t: number, count: number) {
    for (let i = 0; i < count; i++) {
      const s = this.shells.find((x) => x.t0 < 0);
      if (!s) return;
      const side = this.menu() ? (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);
      s.a.set(side * (90 + Math.random() * 40), 14 + Math.random() * 14, -20 - Math.random() * 20);
      // đạn pháo rơi lên một trong hai đảo gần
      s.b.set(this.islandX[Math.random() < 0.5 ? 0 : 1] + (Math.random() - 0.5) * 36, 1.2, -41 + (Math.random() - 0.5) * 6);
      s.t0 = t + i * 0.25; s.dur = 1.2; s.hit = false;
    }
  }

  private impact(t: number, p: THREE.Vector3) {
    const mk = (kind: 'fire' | 'dust', color: number, scale: number, tex: THREE.Texture) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, blending: kind === 'fire' ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false, fog: false }));
      s.position.copy(p); s.scale.setScalar(scale);
      this.root.add(s);
      this.blasts.push({ s, t0: t, kind });
    };
    mk('fire', 0xffffff, 3, glowTexture('rgba(255,230,160,1)', 'rgba(255,90,20,0)'));
    for (let i = 0; i < 4; i++) mk('dust', 0x2a1612, 3, glowTexture('rgba(30,15,18,0.9)', 'rgba(30,15,18,0)'));
    this.flashLight.position.copy(p).setY(4);
    this.flashLight.intensity = 80 * this.S ** 1.6;
    const n = 6 + ((Math.random() * 7) | 0);
    for (let i = 0; i < n && this.debris.length < 80; i++) {
      this.debris.push({ p: p.clone(), v: new THREE.Vector3((Math.random() - 0.5) * 6, 5 + Math.random() * 6, (Math.random() - 0.5) * 6), born: t, rot: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6) });
    }
  }

  // ---------- MapWorld ----------
  setQuality(q: QualityConfig) {
    this.quality = q;
    const full = q.rain || q.fog; // thấp = tắt cả mưa lẫn sương trong tokens
    this.embers.setCount(q.particleScale >= 1 ? 700 : full ? 400 : 120);
    this.reef.forEach((r) => (r.visible = full));
    this.horizon.visible = full;
    this.ocean.setReflection(q.oceanReflection);
  }

  setUnderwater(on: boolean) {
    this.underwater = on;
    this.ocean.setUnderwater(on);
    const fog = this.scene.fog as THREE.FogExp2;
    const c = on ? new THREE.Color('#0B2A2C') : FOG, d = (on ? 0.05 : 0.008) / this.FD; // xanh ngọc ấm, tầm nhìn ~20 (đã nhân CELL)
    fog.color.copy(c); fog.density = d;
    this.skyMesh.visible = !on; // dưới nước không thấy bầu trời
    this.scene.background = on ? c : null;
    this.ocean.setFog(d, c);
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (!p) this.pausedUntil = this.clock + 0.8; // thêm 800 ms sau cinematic
  }

  setMood(mood: 'win' | 'lose' | null) {
    this.key.intensity = this.baseKey * (mood === 'win' ? 1.1 : mood === 'lose' ? 0.9 : 1);
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); });
  }

  update(dt: number, t: number, camera: THREE.Camera) {
    this.clock = t;
    this.proxy.position.copy(camera.position).divideScalar(this.S); // vật bám camera nằm trong nhóm đã phóng: dùng toạ độ cục bộ
    this.proxy.quaternion.copy(camera.quaternion);
    this.skyMesh.position.copy(this.proxy.position);
    this.skyMat.uniforms.uTime.value = t;
    this.ocean.update(t, this.proxy);
    for (const f of this.fires) f.update(t);
    for (const r of this.reef) (r.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.2 * Math.sin(t * 1.3 + r.position.x);
    const full = this.quality.rain || this.quality.fog;
    const idle = !this.paused && t >= this.pausedUntil;

    this.ships.forEach((sh, i) => { sh.obj.visible = full || i < 4 || i >= 6; }); // chất lượng thấp: giữ 4 tàu giao tranh
    for (const s of this.ships) {
      floatOnWaves(s.obj, s.heading, 4, 1, t, this.localHeight, false);
      s.obj.position.y += s.y0 - (t * 0.02) / 60; // lún chậm 0.02 đơn vị/phút
    }

    // pháo kích: cảnh chờ 4–9 s/đợt; gameplay 10–20 s/đợt, ít vệt hơn
    const play = this.layout === 'play';
    if (t > this.nextVolley) {
      if (idle) this.fire(t, play ? 1 + ((Math.random() * 2) | 0) : full ? 1 + ((Math.random() * 3) | 0) : 1);
      this.nextVolley = t + (idle ? (play ? 10 + Math.random() * 10 : 4 + Math.random() * 5) : 1);
    }
    for (const s of this.shells) {
      if (s.t0 < 0) continue;
      const u = (t - s.t0) / s.dur;
      if (u < 0) continue;
      if (u >= 1) { if (!s.hit) { s.hit = true; this.impact(t, s.b); } s.line.visible = false; if (u > 1.05) s.t0 = -1; continue; }
      s.line.visible = true;
      const pos = s.line.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 14; i++) {
        const w = Math.max(0, u - (i / 13) * 0.35);
        pos.setXYZ(i, THREE.MathUtils.lerp(s.a.x, s.b.x, w), THREE.MathUtils.lerp(s.a.y, s.b.y, w) + Math.sin(w * Math.PI) * 6, THREE.MathUtils.lerp(s.a.z, s.b.z, w));
      }
      pos.needsUpdate = true;
      s.line.computeLineDistances();
      (s.line.material as THREE.LineDashedMaterial).opacity = Math.sin(Math.min(1, u) * Math.PI) * 0.9;
    }
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i], e = t - b.t0;
      const life = b.kind === 'fire' ? 0.5 : 2;
      if (e > life) { this.root.remove(b.s); this.blasts.splice(i, 1); continue; }
      const f = e / life;
      if (b.kind === 'fire') { b.s.scale.setScalar(3 + 8 * f); (b.s.material as THREE.SpriteMaterial).opacity = 1 - f; }
      else { b.s.position.y += dt * (3 + 6 * (1 - f)); b.s.scale.setScalar(3 + 8 * f * (1 + (i % 3) * 0.3)); (b.s.material as THREE.SpriteMaterial).opacity = (1 - f) * 0.7; }
    }
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 220 * this.S ** 1.6);
    const d = new THREE.Object3D();
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const m = this.debris[i], e = t - m.born;
      if (e > 2.2) { this.debris.splice(i, 1); continue; }
      d.position.set(m.p.x + m.v.x * e, Math.max(0, m.p.y + m.v.y * e - 9.8 * e * e * 0.5), m.p.z + m.v.z * e);
      d.rotation.set(m.rot.x * e, m.rot.y * e, m.rot.z * e);
      d.updateMatrix();
      this.debrisMesh.setMatrixAt(i, d.matrix);
    }
    this.debrisMesh.count = this.debris.length;
    this.debrisMesh.instanceMatrix.needsUpdate = true;

    // chớp nổ chân trời: cảnh chờ 3–8 s, gameplay 6–14 s (120 ms, +20% độ sáng nền)
    if (full && t > this.nextFlash) {
      if (idle) { this.flashT = t; this.horizon.position.set(play ? (Math.random() - 0.5) * 240 : (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 100), 3, -230); }
      this.nextFlash = t + (idle ? (play ? 6 + Math.random() * 8 : 3 + Math.random() * 5) : 1);
    }
    const fl = t - this.flashT < 0.12 && !this.underwater ? 1 : 0;
    (this.horizon.material as THREE.SpriteMaterial).opacity = fl;
    this.skyMat.uniforms.uFlash.value = fl;
    this.updateMissiles(t, idle);
    this.embers.update(dt);
  }
}
