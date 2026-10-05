import * as THREE from 'three';

const vert = /* glsl */ `
varying vec3 vDir;
void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

const frag = /* glsl */ `
uniform float uTime, uFlash, uFlare;
uniform vec2 uFlareDir;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= .5; } return s; }
void main() {
  vec3 v = normalize(vDir);
  float h = clamp(v.y, 0., 1.);
  vec3 col = mix(vec3(.094, .133, .169), vec3(.02, .031, .043), pow(h, .45));        // #18222B -> #05080B
  vec2 az = normalize(v.xz + 1e-5);
  float toCity = max(dot(az, vec2(0., -1.)), 0.);                                    // phía skyline (-Z)
  col += vec3(1., .478, .102) * .35 * pow(toCity, 3.) * exp(-h * 7.);                // vệt cam #FF7A1A
  // mây đen thủ tục, trôi ngược chiều sóng
  vec2 cp = v.xz / (h + .18) * .6 + vec2(-uTime * .01, uTime * .006);
  float c = smoothstep(.35, .75, fbm(cp));
  col = mix(col, col * .25, c * .85);
  // pháo sáng xa ở chân trời
  float fl = pow(max(dot(az, normalize(uFlareDir)), 0.), 40.) * exp(-h * 12.);
  col += vec3(1., .5, .15) * fl * uFlare * .8;
  // sấm chớp
  col += vec3(.5, .6, .8) * uFlash * (.18 + .5 * c) * (.4 + .6 * (1. - h));
  gl_FragColor = vec4(col, 1.);
}`;

export class NightSky {
  readonly mesh: THREE.Mesh;
  private mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uFlash: { value: 0 }, uFlare: { value: 0 }, uFlareDir: { value: new THREE.Vector2(0.3, -1) } },
  });
  private nextFlare = 3;

  constructor(radius = 900) {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  setFlash(f: number) { this.mat.uniforms.uFlash.value = f; }

  update(t: number, camera: THREE.Camera) {
    this.mesh.position.copy(camera.position);
    this.mat.uniforms.uTime.value = t;
    // pháo sáng nhỏ ở chân trời mỗi 3-8 s: nhô lên nhanh, tắt trong ~0.8 s
    if (t > this.nextFlare) { this.nextFlare = t + 3 + Math.random() * 5; this.flareStart = t; this.mat.uniforms.uFlareDir.value.set((Math.random() - 0.5) * 1.6, -1); }
    const e = t - this.flareStart;
    this.mat.uniforms.uFlare.value = e < 0.8 ? Math.max(0, 1 - e / 0.8) : 0;
  }
  private flareStart = -10;
}
