import * as THREE from 'three';
import { mulberry32 } from '../core/rng';
import type { Layout } from './mapWorld';

/** Skyline thành phố cảng cháy dở, cần cẩu, xác tàu, mảnh vỡ, phao, đèn pha: design/env-and-fx.md mục 6. Hư cấu, không địa danh thật. */

const LAYERS = [
  { z: -70, hMin: 18, hMax: 60, tone: 1.0 },
  { z: -110, hMin: 30, hMax: 90, tone: 0.75 },
  { z: -160, hMin: 40, hMax: 130, tone: 0.5 },
];
/** Chế độ trận: skyline lùi ra khỏi lưới (trước đây lớp 1 ở z −70 chạm mép lưới địch), chừa luồng nước giữa hai thành phố để bắc cầu. */
const PLAY_LAYERS = [
  { z: -112, hMin: 22, hMax: 70, tone: 1.0 },
  { z: -150, hMin: 34, hMax: 100, tone: 0.75 },
  { z: -200, hMin: 44, hMax: 140, tone: 0.5 },
];
/** Nửa rộng luồng nước giữa hai thành phố ở lớp gần (cục bộ), nơi cầu vượt qua. */
const CHANNEL = 46;
const PER_LAYER = 50;

const buildingVert = /* glsl */ `
attribute vec4 aDims;      // w, h, d, seed
varying vec2 vUv; varying vec3 vN; varying vec4 vDims; varying vec3 vWorld;
void main() {
  vUv = uv; vN = normal; vDims = aDims;
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const buildingFrag = /* glsl */ `
uniform float uTime, uFlash, uFog, uTone;
uniform vec3 uFogColor;
varying vec2 vUv; varying vec3 vN; varying vec4 vDims; varying vec3 vWorld;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  bool side = abs(vN.y) < .5;
  float len = abs(vN.x) > .5 ? vDims.z : vDims.x;
  vec3 col = vec3(.035, .05, .065) * uTone;
  if (side) {
    vec2 g = vec2(vUv.x * len / 1.4, vUv.y * vDims.y / 1.9);
    vec2 id = floor(g), f = fract(g);
    float win = step(.2, f.x) * step(f.x, .8) * step(.25, f.y) * step(f.y, .75);
    float r = hash(id + vDims.w * 17.);
    float flick = .75 + .25 * sin(uTime * (2. + r * 9.) + r * 60.);
    vec3 lit = r < .12 ? vec3(1., .54, .12) * 1.7 * flick : (r < .18 ? vec3(.31, .76, .91) * 1.3 : vec3(.012, .02, .03));
    col = mix(col, lit * uTone, win);
    col += vec3(1., .45, .1) * .035 * (1. - vUv.y) * uTone;        // hắt sáng từ đám cháy phía dưới
  }
  col += vec3(.12, .15, .2) * uFlash * .35 * uTone;
  float dist = length(cameraPosition - vWorld);
  col = mix(col, uFogColor, 1. - exp(-pow(dist * uFog, 2.)));
  gl_FragColor = vec4(col, 1.);
}`;

function glowTexture(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export class Harbor {
  readonly group = new THREE.Group();
  private uniforms = { uTime: { value: 0 }, uFlash: { value: 0 }, uFog: { value: 0.011 }, uFogColor: { value: new THREE.Color('#0B1117') } };
  private fires: { s: THREE.Sprite; base: number; phase: number }[] = [];
  private smoke: { s: THREE.Sprite; base: THREE.Vector3; phase: number; size: number }[] = [];
  private signs: { phase: number; mat: THREE.MeshBasicMaterial; base: THREE.Color }[] = [];
  private lights: THREE.Mesh[] = [];
  private floaters: { obj: THREE.Object3D; y0: number; phase: number }[] = [];
  private blinkers: { m: THREE.Sprite; phase: number; color: THREE.Color }[] = [];
  private fireLight: THREE.PointLight;
  /** Hải Phòng về đêm (chế độ trận): đèn cầu, xe chạy trên cầu, trụ cầu đổi màu, ngọn hải đăng Hòn Dáu, thuyền đánh cá. */
  private cars: { s: THREE.Sprite; x0: number; v: number; y: number; z: number; span: number }[] = [];
  private pylonMats: THREE.MeshBasicMaterial[] = [];
  private beam?: THREE.Mesh;
  private lighthouse?: THREE.Sprite;

  /** `scale`: nhóm này bị phóng `scale` lần; PointLight cần khoảng chiếu và cường độ phóng theo. */
  private lk: number;

  constructor(private heightAt: (x: number, z: number, t: number) => number, private layout: Layout = 'play', scale = 1) {
    this.lk = scale ** 1.6;
    const rng = mulberry32(20261005);
    const rnd = (a: number, b: number) => a + rng() * (b - a);
    this.buildSkyline(rnd);
    this.buildPort(rnd);
    if (layout === 'play') this.buildHaiPhong(rnd);
    // đèn động: một PointLight cam yếu phía skyline, nhấp nháy (tối đa 3 đèn thật trong cảnh)
    this.fireLight = new THREE.PointLight(0xff7a1a, 0, 120 * scale, 1.6);
    this.fireLight.position.set(0, 12, -50);
    this.group.add(this.fireLight);
  }

  private buildSkyline(rnd: (a: number, b: number) => number) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const tops: THREE.Vector3[] = [];
    (this.layout === 'play' ? PLAY_LAYERS : LAYERS).forEach((L, li) => {
      const dims = new Float32Array(PER_LAYER * 4);
      const mat = new THREE.ShaderMaterial({
        vertexShader: buildingVert, fragmentShader: buildingFrag,
        uniforms: { ...this.uniforms, uTone: { value: L.tone } },
      });
      const mesh = new THREE.InstancedMesh(box, mat, PER_LAYER);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      const collapsed = new Set(li === 0 ? [7, 23] : li === 1 ? [31] : []);
      for (let i = 0; i < PER_LAYER; i++) {
        const w = rnd(4, 12), d = rnd(6, 12);
        let h = rnd(L.hMin, L.hMax);
        let x = ((i + rnd(-0.4, 0.4)) / PER_LAYER - 0.5) * 320;
        if (this.layout === 'play' && li < 2 && Math.abs(x) < CHANNEL) x = Math.sign(x || 1) * (CHANNEL + rnd(2, 40)); // luồng nước giữa hai thành phố để trống
        const tilt = collapsed.has(i) ? ((rnd(8, 15) * Math.PI) / 180) * (i % 2 ? 1 : -1) : 0;
        if (tilt) h *= 0.7; // tòa nhà đổ: đỉnh vỡ nên thấp hơn
        // Menu: vùng giữa thoáng, skyline thấp; hai bên dày và cao (maps.md mục 8.3)
        if (this.layout === 'menu') h *= Math.abs(x) < 40 ? 0.22 : 1.15;
        q.setFromEuler(new THREE.Euler(0, 0, tilt));
        m.compose(new THREE.Vector3(x, 0, L.z + rnd(-6, 6)), q, s.set(w, h, d));
        mesh.setMatrixAt(i, m);
        dims.set([w, h, d, rnd(0, 1)], i * 4);
        if (li === 0 && tops.length < 6 && i % 8 === 3) tops.push(new THREE.Vector3(x, h, L.z));
      }
      box.setAttribute('aDims', new THREE.InstancedBufferAttribute(dims, 4));
      // mỗi lớp cần attribute riêng: nhân bản hình học
      mesh.geometry = box.clone();
      mesh.geometry.setAttribute('aDims', new THREE.InstancedBufferAttribute(dims, 4));
      mesh.frustumCulled = false;
      this.group.add(mesh);
    });

    // tòa nhà cháy: lửa lặp + cột khói đen bốc nghiêng theo gió 12°
    const fireTex = glowTexture('rgba(255,210,120,1)', 'rgba(255,90,20,0)');
    const smokeTex = glowTexture('rgba(30,30,32,0.9)', 'rgba(30,30,32,0)');
    for (const p of tops) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      s.position.copy(p).add(new THREE.Vector3(0, 2, 6));
      s.scale.set(10, 14, 1);
      this.group.add(s);
      this.fires.push({ s, base: 12, phase: rnd(0, 6) });
      for (let k = 0; k < 6; k++) {
        const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0, color: 0x15181c }));
        this.group.add(sm);
        this.smoke.push({ s: sm, base: p.clone(), phase: k / 6 + rnd(0, 0.2), size: rnd(10, 18) });
      }
    }

    // bảng hiệu: 5 xanh lạnh, 1 đỏ mờ, nhấp nháy chập chờn, không có chữ
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i === 5 ? new THREE.Color(1.4, 0.15, 0.1) : new THREE.Color(0.3, 1.2, 1.8), fog: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(rnd(3, 6), rnd(1.2, 2.4)), mat);
      m.position.set(this.layout === 'menu' ? (i % 2 ? 1 : -1) * rnd(40, 95) : rnd(-90, 90), rnd(12, 30), -68);
      this.group.add(m);
      this.signs.push({ phase: rnd(0, 20), mat, base: mat.color.clone() });
    }
  }

  private buildPort(rnd: (a: number, b: number) => number) {
    const steel = new THREE.MeshStandardMaterial({ color: 0x1b2229, roughness: 0.7, metalness: 0.6 });
    const rust = new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.9, metalness: 0.3 });
    // cần cẩu cảng: x -40/-18/+22/+45, cao 28; một cần đổ gãy
    (this.layout === 'menu' ? [[-62, -55], [-44, -48], [46, -52], [66, -58]] : [[-96, -108], [-62, -112], [66, -110], [104, -114]]).forEach(([x, z], i) => {
      const g = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 28, 1.2), steel);
      tower.position.y = 14;
      const jib = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 1), steel);
      jib.position.set(7, 27, 0);
      g.add(tower, jib);
      g.position.set(x, 0, z);
      if (i === 1) { g.rotation.z = -0.9; g.position.y = 1; jib.scale.x = 0.6; } // cần đổ gãy
      this.group.add(g);
      for (let k = 0; k < 5; k++) { // đống container
        const c = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 2), k % 2 ? rust : steel);
        c.position.set(x + rnd(-8, 8), 1 + (k % 2) * 2, z + rnd(2, 6));
        this.group.add(c);
      }
    });
    // xác tàu hàng nghiêng 18°, chìm nửa thân, ở x ±26
    for (const x of this.layout === 'menu' ? [-52, 54] : [-40, 40]) {
      const w = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(24, 5, 7), rust);
      hull.position.y = 1;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 6), steel);
      cab.position.set(-8, 5, 0);
      w.add(hull, cab);
      w.rotation.set(0, x < 0 ? 0.3 : -0.3, (18 * Math.PI) / 180 * (x < 0 ? 1 : -1));
      w.position.set(x, -0.6, -30);
      this.group.add(w);
    }
    // dầu cháy trên nước: 2 mảng ở rìa vùng biển
    const fireTex = glowTexture('rgba(255,170,70,1)', 'rgba(255,80,10,0)');
    for (const x of [-30, 31]) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      s.position.set(x, 0.8, -1);
      s.scale.set(3.5, 3, 1);
      this.group.add(s);
      this.fires.push({ s, base: 3, phase: rnd(0, 6) });
    }
    // mảnh vỡ nổi (~40), không vào ô lưới
    const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.25, 0.6), steel, 40);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 40; i++) {
      // hai lưới (đã nhân CELL) chiếm |x| < 16, z từ −40 tới 40: mảnh vỡ nằm ngoài
      let x = rnd(-110, 110), z = rnd(-75, 65);
      while (Math.abs(x) < 28 && z > -60 && z < 60) { x = rnd(-110, 110); z = rnd(-75, 65); }
      dummy.position.set(x, 0, z);
      dummy.rotation.set(rnd(-0.3, 0.3), rnd(0, 3), rnd(-0.3, 0.3));
      dummy.scale.setScalar(rnd(0.3, 1.2));
      dummy.updateMatrix();
      bits.setMatrixAt(i, dummy.matrix);
      this.debris.push({ x, z, rot: dummy.rotation.clone(), s: dummy.scale.x });
    }
    this.debrisMesh = bits;
    this.group.add(bits);
    // phao: 6 cái ngoài hai bên lưới, đèn đỏ/xanh nhấp nháy
    const glow = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    [[-30, 1], [30, 1], [-32, -36], [32, -36], [-32, 40], [32, 40]].forEach(([x, z], i) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x8a2a22, roughness: 0.6 }));
      b.position.set(x, 0, z);
      const col = new THREE.Color(i % 2 ? '#30FF70' : '#FF3030');
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      s.position.set(0, 0.55, 0); s.scale.set(0.9, 0.9, 1);
      b.add(s);
      this.group.add(b);
      this.floaters.push({ obj: b, y0: 0, phase: rnd(0, 6) });
      this.blinkers.push({ m: s, phase: rnd(0, 4), color: col });
    });
    // đèn pha quét: cột sáng mờ (0.08), chu kỳ 12 s
    [[-50, 22, -90], [32, 26, -100], [-6, 4, -60]].forEach(([x, y, z]) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(6, 90, 24, 1, true).translate(0, -45, 0).rotateX(Math.PI),
        new THREE.MeshBasicMaterial({ color: 0xbfd6e6, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
      );
      cone.position.set(x, y, z);
      this.group.add(cone);
      this.lights.push(cone);
    });
  }

  /**
   * Hải Phòng về đêm (chỉ chế độ trận): bờ biển ngắn hai bên luồng nước, cầu dây văng lớn nối hai thành phố (kiểu cầu Tân Vũ – Lạch Huyện: hai trụ cao
   * đổi màu, dây văng, đèn mặt cầu, xe chạy), hải đăng Hòn Dáu quét chùm sáng, thuyền đánh cá sáng đèn, nhà hát lớn có vòm sáng, đồi Đồ Sơn xa.
   * Mọi vật nằm ngoài vùng chơi (|x| < 28, z > −70 cục bộ).
   */
  private buildHaiPhong(rnd: (a: number, b: number) => number) {
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b1015, roughness: 0.9, metalness: 0.1 });
    const concrete = new THREE.MeshStandardMaterial({ color: 0x1b2229, roughness: 0.8, metalness: 0.2 });
    const lamp = glowTexture('rgba(255,214,150,1)', 'rgba(255,170,60,0)');
    const lampBlue = glowTexture('rgba(150,220,255,1)', 'rgba(60,160,255,0)');
    const glowMat = (tex: THREE.Texture, color: number, op = 1) => new THREE.SpriteMaterial({ map: tex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op });
    const sprite = (tex: THREE.Texture, x: number, y: number, z: number, sz: number, color = 0xffffff, op = 1) => { const s = new THREE.Sprite(glowMat(tex, color, op)); s.position.set(x, y, z); s.scale.set(sz, sz, 1); this.group.add(s); return s; };

    // ---- bờ biển ngắn: hai dải đất thấp ở hai bên luồng nước, đèn đường dọc kè ----
    for (const sgn of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(150, 3, 52), concrete);
      bank.position.set(sgn * (CHANNEL + 75), 0.4, -112); this.group.add(bank);
      const kè = new THREE.Mesh(new THREE.BoxGeometry(150, 1.2, 2), dark); kè.position.set(sgn * (CHANNEL + 75), 2, -86); this.group.add(kè);
      for (let k = 0; k < 14; k++) sprite(lamp, sgn * (CHANNEL + 6 + k * 10), 5.5, -86, 4, 0xffd9a0, 0.9);
    }
    // ---- cầu dây văng lớn: boong dài, trụ cầu đôi, dây văng, đèn mặt cầu ----
    const BZ = -96, DECK = 15, SPAN = 340, PY = 52;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 1.6, 6), concrete); deck.position.set(0, DECK, BZ); this.group.add(deck);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 0.4, 0.5), new THREE.MeshBasicMaterial({ color: 0x35546a })); rail.position.set(0, DECK + 1.3, BZ - 2.8); this.group.add(rail);
    for (let x = -SPAN / 2 + 8; x <= SPAN / 2 - 8; x += 24) { // trụ cầu dẫn
      if (Math.abs(x) < CHANNEL + 14) continue;
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, DECK + 2, 8), dark); pier.position.set(x, (DECK - 2) / 2, BZ); this.group.add(pier);
    }
    for (let x = -SPAN / 2 + 6; x <= SPAN / 2 - 6; x += 7) sprite(lamp, x, DECK + 3.2, BZ - 2.8, 3.4, 0xffd9a0, 0.85); // đèn mặt cầu
    const mats: THREE.MeshBasicMaterial[] = [];
    for (const px of [-CHANNEL * 0.6, CHANNEL * 0.6]) { // hai trụ chính hình chữ H, đổi màu theo thời gian
      const m = new THREE.MeshBasicMaterial({ color: 0x4fc3e8 }); mats.push(m);
      for (const dz of [-2.2, 2.2]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(2.4, PY, 1.6), m); leg.position.set(px, DECK + PY / 2, BZ + dz); this.group.add(leg); }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 6.4), m); bar.position.set(px, DECK + PY * 0.8, BZ); this.group.add(bar);
      const top = sprite(lampBlue, px, DECK + PY + 3, BZ, 6, 0xff3030); this.blinkers.push({ m: top, phase: rnd(0, 4), color: new THREE.Color(0xff3030) });
      const cables: THREE.Vector3[] = [];
      for (let k = 1; k <= 8; k++) for (const side of [-1, 1]) { // dây văng toả hai phía
        const dx = side * k * 7.5;
        cables.push(new THREE.Vector3(px, DECK + PY - k * 1.1, BZ), new THREE.Vector3(px + dx, DECK + 0.8, BZ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(cables);
      this.group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x6fa8c8, transparent: true, opacity: 0.55 })));
    }
    this.pylonMats = mats;
    // xe chạy trên cầu (đèn pha trắng một chiều, đèn đuôi đỏ chiều kia)
    for (let i = 0; i < 26; i++) {
      const dir = i % 2 ? 1 : -1;
      const s = sprite(lamp, 0, DECK + 2, BZ + dir * 1.4, 2.4, dir > 0 ? 0xffffff : 0xff4030, 0.95);
      this.cars.push({ s, x0: rnd(0, SPAN), v: dir * rnd(6, 11), y: DECK + 2, z: BZ + dir * 1.4, span: SPAN });
    }
    // ---- hải đăng Hòn Dáu trên đảo đá nhỏ, chùm sáng quét ----
    const isle = new THREE.Mesh(new THREE.ConeGeometry(14, 7, 10), dark); isle.position.set(128, 2.5, -60); this.group.add(isle);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 15, 10), new THREE.MeshStandardMaterial({ color: 0x9aa4ab, roughness: 0.8 })); tower.position.set(128, 11, -60); this.group.add(tower);
    this.lighthouse = sprite(lamp, 128, 20, -60, 7, 0xfff2c0);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(90, 3).translate(45, 0, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(128, 20, -60); this.group.add(beam); this.beam = beam;
    // ---- thuyền đánh cá sáng đèn ở luồng nước ----
    for (let i = 0; i < 7; i++) {
      const x = (i % 2 ? 1 : -1) * rnd(36, 130), z = rnd(-92, -70);
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(5, 1.1, 1.8), dark); hull.position.y = 0.4;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), concrete); cab.position.set(-1, 1.5, 0);
      boat.add(hull, cab);
      const l = new THREE.Sprite(glowMat(lamp, 0xffe0a0, 1)); l.position.set(-1, 2.6, 0); l.scale.set(3, 3, 1); boat.add(l);
      boat.position.set(x, 0, z); boat.rotation.y = rnd(0, 6.28);
      this.group.add(boat);
      this.floaters.push({ obj: boat, y0: 0, phase: rnd(0, 6) });
    }
    // ---- nhà hát lớn: khối tân cổ điển có vòm sáng trong thành phố bên trái ----
    const theater = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 14), new THREE.MeshBasicMaterial({ color: 0x6b5a46 })); body.position.y = 6;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4fa6a0 })); dome.position.y = 12;
    theater.add(body, dome);
    for (let k = -4; k <= 4; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 9, 6), new THREE.MeshBasicMaterial({ color: 0xe8d8b0 })); c.position.set(k * 2.4, 4.5, 7.4); theater.add(c); }
    theater.position.set(-CHANNEL - 28, 1.8, -86); this.group.add(theater);
    sprite(lamp, -CHANNEL - 28, 8, -78, 40, 0xffd090, 0.35);
    // ---- đồi Đồ Sơn xa ở bên phải ----
    for (const [x, z, r, h] of [[205, -190, 38, 26], [235, -205, 30, 20], [170, -215, 28, 16]] as const) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), new THREE.MeshStandardMaterial({ color: 0x080d12, roughness: 1 }));
      hill.position.set(x, h / 2 - 1, z); this.group.add(hill);
    }
    // ---- bãi container sáng đèn ở bờ: cần cẩu có đèn đỏ trắng ----
    for (const sgn of [-1, 1]) for (let k = 0; k < 6; k++) {
      const x = sgn * (CHANNEL + 22 + k * 16), z = -104;
      sprite(lamp, x, 9, z, 3, k % 2 ? 0xff4030 : 0xe8f4ff, 0.9);
    }
  }

  private debris: { x: number; z: number; rot: THREE.Euler; s: number }[] = [];
  private debrisMesh!: THREE.InstancedMesh;

  setFog(density: number, color: THREE.Color) {
    this.uniforms.uFog.value = density;
    this.uniforms.uFogColor.value.copy(color);
  }

  /** Chất lượng: tắt đèn pha và mảnh vỡ ở mức thấp. */
  setQuality(low: boolean) {
    for (const l of this.lights) l.visible = !low;
    this.debrisMesh.visible = !low;
  }

  update(t: number, flash: number) {
    this.uniforms.uTime.value = t;
    this.uniforms.uFlash.value = flash;
    let flicker = 0;
    for (const f of this.fires) {
      const k = 0.85 + 0.15 * Math.sin(t * 9 + f.phase) + 0.08 * Math.sin(t * 23 + f.phase * 3);
      f.s.scale.set(f.base * 0.7 * k, f.base * k, 1);
      flicker += k;
    }
    this.fireLight.intensity = ((flicker / Math.max(1, this.fires.length)) * 60 + flash * 20) * this.lk;
    // khói bốc lên, nghiêng theo gió 12° về +X
    const wind = Math.tan((12 * Math.PI) / 180);
    for (const sm of this.smoke) {
      const life = (t * 0.08 + sm.phase) % 1;
      const rise = life * 40;
      sm.s.position.set(sm.base.x + rise * wind, sm.base.y + 3 + rise, sm.base.z + 6);
      const sc = sm.size * (0.6 + life * 1.6);
      sm.s.scale.set(sc, sc, 1);
      (sm.s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.55;
    }
    for (const s of this.signs) {
      const on = Math.sin(t * 3 + s.phase) + Math.sin(t * 7.3 + s.phase * 2) > -0.9 ? 1 : 0.15; // chập chờn
      s.mat.color.copy(s.base).multiplyScalar(on);
    }
    this.lights.forEach((l, i) => { l.rotation.z = Math.sin((t / 12) * Math.PI * 2 + i * 2) * 0.5; l.rotation.x = Math.cos((t / 12) * Math.PI * 2 + i) * 0.15; });
    for (const f of this.floaters) f.obj.position.y = f.y0 + this.heightAt(f.obj.position.x, f.obj.position.z, t) * 0.9;
    for (const b of this.blinkers) b.m.material.opacity = Math.sin(t * 2.5 + b.phase) > 0 ? 1 : 0.1;
    for (const c of this.cars) c.s.position.set(((c.x0 + t * c.v) % c.span + c.span) % c.span - c.span / 2, c.y, c.z);
    this.pylonMats.forEach((m, i) => m.color.setHSL(((t * 0.04 + i * 0.5) % 1), 0.8, 0.55)); // trụ cầu đổi màu
    if (this.beam) { this.beam.rotation.y = t * 0.9; (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.1 * Math.max(0, Math.sin(t * 0.9 * 2)); }
    if (this.lighthouse) (this.lighthouse.material as THREE.SpriteMaterial).opacity = 0.6 + 0.4 * Math.sin(t * 3);
    const d = new THREE.Object3D();
    this.debris.forEach((p, i) => {
      d.position.set(p.x + Math.sin(t * 0.1 + i) * 0.4, this.heightAt(p.x, p.z, t) + 0.05, p.z + Math.cos(t * 0.08 + i) * 0.3);
      d.rotation.copy(p.rot); d.scale.setScalar(p.s); d.updateMatrix();
      this.debrisMesh.setMatrixAt(i, d.matrix);
    });
    this.debrisMesh.instanceMatrix.needsUpdate = true;
  }
}
