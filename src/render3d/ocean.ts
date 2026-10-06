import * as THREE from 'three';

/** Bốn sóng Gerstner theo design/env-and-fx.md mục 3. `dir` là góc (độ) so với +Z, `speed` là tốc độ pha (đơn vị/giây). */
const WAVES = [
  { amp: 0.35, len: 18, dir: 15, speed: 1.1 },
  { amp: 0.2, len: 9, dir: -40, speed: 1.4 },
  { amp: 0.12, len: 5, dir: 70, speed: 1.9 },
  { amp: 0.06, len: 2.4, dir: -10, speed: 2.4 },
];
const dirOf = (deg: number) => [Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180)] as const;

/** Độ cao mặt nước tại (x, z) lúc t. Cùng công thức với shader (bỏ phần dịch ngang). */
/** Vùng biển lặng dưới hai lưới (chế độ trận): sóng giảm còn `min` trong hình chữ nhật |x| < hx, |z| < hz rồi tăng dần về 1 sau `ramp` ĐV, để thân tàu không bị sóng tràn che. */
export interface CalmZone { hx: number; hz: number; min: number; ramp: number }
export function calmFactor(x: number, z: number, c: CalmZone | undefined): number {
  if (!c) return 1;
  const qx = Math.max(Math.abs(x) - c.hx, 0), qz = Math.max(Math.abs(z) - c.hz, 0);
  const u = Math.min(1, Math.hypot(qx, qz) / c.ramp);
  return c.min + (1 - c.min) * (u * u * (3 - 2 * u));
}

export function waveHeight(x: number, z: number, t: number, waveScale = 1, unit = 1, calm?: CalmZone): number {
  let h = 0;
  for (const w of WAVES) {
    const [dx, dz] = dirOf(w.dir);
    const k = (2 * Math.PI) / (w.len * unit);
    h += w.amp * waveScale * unit * Math.sin(k * (dx * x + dz * z - w.speed * unit * t));
  }
  return h * calmFactor(x, z, calm);
}

export interface OceanOptions {
  fogColor: THREE.Color;
  fogDensity: number;
  waveScale?: number;
  /** Hệ số phóng sóng (bước sóng, biên độ, tốc độ) theo kích thước tàu; 1 = cảnh menu. */
  unit?: number;
  radius?: number;
  calm?: CalmZone;
}

/** Lưới cực: dày ở gần tâm (camera), thưa ở xa. */
function polarGrid(radius: number, rings: number, sectors: number) {
  const pos = new Float32Array((rings + 1) * sectors * 3);
  let p = 0;
  for (let i = 0; i <= rings; i++) {
    const r = radius * Math.pow(i / rings, 2.2);
    for (let j = 0; j < sectors; j++) {
      const a = (j / sectors) * Math.PI * 2;
      pos[p++] = Math.cos(a) * r; pos[p++] = 0; pos[p++] = Math.sin(a) * r;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings; i++) for (let j = 0; j < sectors; j++) {
    const a = i * sectors + j, b = i * sectors + ((j + 1) % sectors), c = a + sectors, d = b + sectors;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const vert = /* glsl */ `
uniform float uTime, uAmp;
uniform vec3 uCalm; // x: nửa rộng, y: nửa dài, z: độ cao còn lại (1 = không lặng)
uniform vec2 uCalmRamp;
uniform vec4 uWaves[${WAVES.length}]; // dir.xy, amp, len
uniform float uSpeed[${WAVES.length}];
varying vec3 vWorld; varying vec3 vNormal; varying float vCrest;
void main() {
  vec3 p = (modelMatrix * vec4(position, 1.)).xyz;
  vec3 disp = vec3(0.); vec3 n = vec3(0., 1., 0.); float crest = 0.;
  vec2 qc = max(abs(p.xz) - uCalm.xy, 0.);
  float uc = clamp(length(qc) / max(uCalmRamp.x, 1.), 0., 1.);
  float calm = uCalm.z + (1. - uCalm.z) * (uc * uc * (3. - 2. * uc));
  for (int i = 0; i < ${WAVES.length}; i++) {
    vec2 d = uWaves[i].xy; float a = uWaves[i].z * uAmp * calm, k = 6.2831853 / uWaves[i].w;
    float f = k * (dot(d, p.xz) - uSpeed[i] * uTime);
    float s = sin(f), co = cos(f);
    disp += vec3(d.x * a * co, a * s, d.y * a * co);
    n -= vec3(d.x * k * a * co, k * a * s, d.y * k * a * co);
    crest += s * a * k;
  }
  p += disp;
  vWorld = p; vNormal = normalize(n); vCrest = crest;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
}`;

const frag = /* glsl */ `
uniform float uTime, uFog, uFlash, uReflect, uUnder;
uniform vec3 uHorizon, uZenith, uDeep, uMid, uFoam, uFogColor, uFireDir, uFireColor, uMoonDir, uMoonColor;
uniform float uMoonPow;
varying vec3 vWorld; varying vec3 vNormal; varying float vCrest;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 q = vWorld.xz;
  if (uUnder > .5) { // nhìn mặt nước từ dưới lên (cảnh tàu ngầm): xanh đen, ánh lung linh
    float sh = noise(q * 1.4 + uTime * .5) * .6 + noise(q * 3. - uTime * .7) * .4;
    vec3 u = mix(vec3(.02, .07, .1), vec3(.1, .26, .32), sh);
    gl_FragColor = vec4(mix(u, vec3(.024, .078, .11), 1. - exp(-pow(length(cameraPosition - vWorld) * .12, 2.))), 1.);
    return;
  }
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vNormal
    + vec3(noise(q * .8 + uTime * .2) - .5, 0., noise(q * .8 - uTime * .15 + 7.) - .5) * .18
    + vec3(noise(q * 3. + uTime * .5) - .5, 0., noise(q * 3. - uTime * .4 + 3.) - .5) * .08);
  float fres = .02 + .98 * pow(1. - max(dot(N, V), 0.), 5.);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(R.y, 0., 1.), .5));
  sky += uFireColor * pow(max(dot(R, uFireDir), 0.), 40.) * .5 * uReflect;   // vệt lửa cam phía skyline
  sky += uMoonColor * pow(max(dot(R, uMoonDir), 0.), uMoonPow) * 1.2;
  sky += vec3(.35, .42, .55) * uFlash * .25;
  vec3 body = mix(uDeep, uMid, clamp(vWorld.y * 1.2 + .45 + vCrest * .8, 0., 1.));
  vec3 col = mix(body, sky, fres);
  float foam = smoothstep(.34, .62, vCrest) * (.5 + .5 * noise(q * 1.3 + uTime * .3));
  col = mix(col, uFoam, foam * .75);
  col += vec3(.1, .13, .18) * uFlash * .12;
  float dist = length(cameraPosition - vWorld);
  col = mix(col, uFogColor, 1. - exp(-pow(dist * uFog, 2.)));
  gl_FragColor = vec4(col, 1.);
}`;

export class Ocean {
  readonly mesh: THREE.Mesh;
  /** Bán kính lưới biển (cục bộ); chế độ trận phóng nên cần rộng hơn để mép nằm ngoài tầm sương. */
  private radius: number;
  private mat: THREE.ShaderMaterial;
  private ws: number;
  private unit: number;
  private calm?: CalmZone;

  constructor(o: OceanOptions) {
    this.ws = o.waveScale ?? 1; this.unit = o.unit ?? 1; this.radius = o.radius ?? 220; this.calm = o.calm;
    const U = this.unit;
    this.mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 }, uFlash: { value: 0 }, uReflect: { value: 1 }, uUnder: { value: 0 },
        uAmp: { value: this.ws * U },
        uCalm: { value: new THREE.Vector3(o.calm?.hx ?? 0, o.calm?.hz ?? 0, o.calm ? o.calm.min : 1) },
        uCalmRamp: { value: new THREE.Vector2(o.calm?.ramp ?? 1, 0) },
        uFog: { value: o.fogDensity },
        uWaves: { value: WAVES.map((w) => { const [x, z] = dirOf(w.dir); return new THREE.Vector4(x, z, w.amp, w.len * U); }) },
        uSpeed: { value: WAVES.map((w) => w.speed * U) },
        uHorizon: { value: new THREE.Color('#18222B') },
        uZenith: { value: new THREE.Color('#05080B') },
        uDeep: { value: new THREE.Color('#04090D') },
        uMid: { value: new THREE.Color('#0C1A24') },
        uFoam: { value: new THREE.Color('#9FB4C2') },
        uFogColor: { value: o.fogColor.clone() },
        uFireDir: { value: new THREE.Vector3(0, 0.08, -1).normalize() },
        uFireColor: { value: new THREE.Color('#FF7A1A') },
        uMoonDir: { value: new THREE.Vector3(-0.3, 0.7, -0.6).normalize() },
        uMoonColor: { value: new THREE.Color('#9FB8CC') },
        uMoonPow: { value: 220 },
      },
    });
    this.mesh = new THREE.Mesh(polarGrid(this.radius, 420, 384), this.mat);
    this.mesh.frustumCulled = false;
  }

  /** Đổi bảng màu (map khác). Khóa trùng tên uniform bỏ tiền tố `u`. */
  setPalette(p: Partial<Record<'Horizon' | 'Zenith' | 'Deep' | 'Mid' | 'Foam' | 'FireColor' | 'MoonColor', string>> & { MoonDir?: THREE.Vector3; FireDir?: THREE.Vector3; MoonPow?: number }) {
    for (const [k, v] of Object.entries(p)) {
      const u = this.mat.uniforms[`u${k}`];
      if (!u) continue;
      if (typeof v === 'string') u.value.set(v);
      else if (typeof v === 'number') u.value = v;
      else u.value.copy(v as THREE.Vector3).normalize();
    }
  }

  setFog(density: number, color: THREE.Color) {
    this.mat.uniforms.uFog.value = density;
    this.mat.uniforms.uFogColor.value.copy(color);
  }
  setUnderwater(on: boolean) { this.mat.uniforms.uUnder.value = on ? 1 : 0; }
  setReflection(on: boolean) { this.mat.uniforms.uReflect.value = on ? 1 : 0; }
  setFlash(f: number) { this.mat.uniforms.uFlash.value = f; }

  update(t: number, camera: THREE.Camera) {
    this.mat.uniforms.uTime.value = t;
    this.mesh.position.set(camera.position.x, 0, camera.position.z);
  }

  heightAt = (x: number, z: number, t: number) => waveHeight(x, z, t, this.ws, this.unit, this.calm);
}
