import * as THREE from 'three';

const L = 50, BEAM = 3.5, DRAFT = 2.4;
const deckY = (t: number) => 3.7 + 1.6 * t ** 4;
const halfBeam = (t: number) => {
  const e = t < 0.12 ? 0.8 + 0.2 * (t / 0.12) : t < 0.6 ? 1 : Math.pow(1 - (t - 0.6) / 0.4, 0.7);
  return Math.max(e, 0.03) * BEAM;
};

const std = (color: number, roughness = 0.6, metalness = 0.1, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const mats = {
  hull: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.55, metalness: 0.1 }),
  paint: std(0x9aa3ab),
  dark: std(0x23272b, 0.7),
  glass: std(0x0b1620, 0.2, 0.6, { emissive: 0xffb15e, emissiveIntensity: 0.5 }),
  rail: new THREE.LineBasicMaterial({ color: 0xb9c0c7 }),
};

/** Thân tàu loft theo các mặt cắt; flat shading cho cảm giác góc cạnh tàng hình. */
function buildHull() {
  const N = 48;
  const red = new THREE.Color(0x5b2a26), grey = new THREE.Color(0x7c848d), deck = new THREE.Color(0x3d4247);
  const edgeColor = [red, red, grey, deck, deck, grey, red, red];
  const rings: THREE.Vector3[][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, z = (t - 0.5) * L, w = halfBeam(t), h = deckY(t);
    const d = DRAFT * (0.55 + 0.45 * (1 - t ** 3));
    const rake = 0.3 * THREE.MathUtils.smoothstep(t, 0.6, 1);
    const pts: [number, number][] = [
      [0, -d], [0.62 * w, -0.85 * d], [w, 0], [1.08 * w, h],
      [0, h + 0.15], [-1.08 * w, h], [-w, 0], [-0.62 * w, -0.85 * d],
    ];
    rings.push(pts.map(([x, y]) => new THREE.Vector3(x, y, z + (y > 0 ? y * rake : 0))));
  }
  const pos: number[] = [], col: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, k: THREE.Color) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    col.push(k.r, k.g, k.b, k.r, k.g, k.b, k.r, k.g, k.b);
  };
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < 8; j++) {
      const a = rings[i][j], b = rings[i][(j + 1) % 8], c = rings[i + 1][(j + 1) % 8], d = rings[i + 1][j];
      tri(a, b, c, edgeColor[j]);
      tri(a, c, d, edgeColor[j]);
    }
  }
  const stern = rings[0], centre = new THREE.Vector3(0, 0.5, stern[0].z);
  for (let j = 0; j < 8; j++) tri(centre, stern[(j + 1) % 8], stern[j], grey);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, mats.hull);
}

function hullNumber(text: string) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#eef2f5';
  x.font = '700 70px "Chakra Petch", sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 70);
  return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true });
}

export interface Warship extends THREE.Group {
  userData: { radar: THREE.Object3D; heading: number };
}

export function buildWarship(number = '17'): Warship {
  const g = new THREE.Group() as Warship;
  g.add(buildHull());

  const D = 3.9; // mực boong giữa tàu
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };
  const box = (w: number, h: number, l: number) => new THREE.BoxGeometry(w, h, l);
  const cyl = (rt: number, rb: number, h: number, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);

  // thượng tầng + cầu chỉ huy
  add(box(5.6, 3, 13), mats.paint, 0, D + 1.5, -2);
  add(box(4.6, 2.2, 6), mats.paint, 0, D + 4.1, 0.5);
  add(box(7.2, 0.2, 1.8), mats.paint, 0, D + 3.1, 0.5);
  add(box(4.4, 0.6, 0.06), mats.glass, 0, D + 4.3, 3.53);
  for (const s of [-1, 1]) add(box(0.06, 0.6, 4.5), mats.glass, s * 2.33, D + 4.3, 0.5);
  add(box(3.2, 1.2, 3.6), mats.paint, 0, D + 5.8, -0.3);
  for (const s of [-1, 1]) add(box(1.5, 1.5, 0.12), mats.dark, s * 0.85, D + 5.8, 1.55);

  // cột ăng-ten + radar quay
  add(cyl(0.18, 0.28, 7), mats.paint, 0, D + 9.9, -1.2);
  add(box(3, 0.12, 0.12), mats.paint, 0, D + 10.9, -1.2);
  const radar = new THREE.Group();
  radar.position.set(0, D + 13.6, -1.2);
  radar.add(new THREE.Mesh(box(3, 0.18, 0.5), mats.dark), new THREE.Mesh(cyl(0.12, 0.12, 0.5, 8), mats.paint));
  g.add(radar);

  // ống khói, nhà chứa trực thăng, bãi đáp
  const funnel = add(cyl(1.1, 1.5, 3, 10), mats.paint, 0, D + 4.5, -5.5);
  funnel.scale.x = 1.4;
  add(cyl(1.0, 1.0, 0.1, 10), mats.dark, 0, D + 6.05, -5.5).scale.x = 1.4;
  add(box(5.2, 3.4, 5), mats.paint, 0, D + 1.7, -12.8);
  add(new THREE.CircleGeometry(4.2, 32).rotateX(-Math.PI / 2), mats.dark, 0, D + 0.04, -19.5);
  add(new THREE.RingGeometry(3.3, 3.55, 48).rotateX(-Math.PI / 2), std(0xd8c36a, 0.8, 0), 0, D + 0.06, -19.5);

  // CIWS
  for (const [x, y, z] of [[0, D + 3.4, -13.5], [2, D + 3.2, -8.2]] as const) {
    add(cyl(0.6, 0.7, 0.8), mats.paint, x, y + 0.4, z);
    add(new THREE.SphereGeometry(0.65, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.paint, x, y + 0.8, z);
    add(box(0.12, 0.12, 0.9), mats.dark, x, y + 1.0, z + 0.7);
  }

  // pháo chính mũi
  const gy = deckY(0.79) + 0.15;
  add(cyl(1.4, 1.6, 0.7, 16), mats.dark, 0, gy + 0.35, 14.5);
  add(cyl(1.5, 1.7, 1.0, 6), mats.paint, 0, gy + 1.2, 14.5);
  add(cyl(0.13, 0.16, 5.5), mats.dark, 0, gy + 1.3, 18, Math.PI / 2);

  // bệ phóng VLS
  const vls = new THREE.InstancedMesh(box(0.7, 0.12, 0.7), mats.dark, 24);
  const m4 = new THREE.Matrix4();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    vls.setMatrixAt(r * 6 + c, m4.makeTranslation((c - 2.5) * 0.85, deckY(0.62) + 0.21, 6 + r * 0.85));
  }
  g.add(vls);

  // lan can
  const pts: THREE.Vector3[] = [];
  for (let i = 2; i < 46; i++) {
    const t0 = i / 48, t1 = (i + 1) / 48;
    for (const s of [-1, 1]) for (const dy of [0.45, 0.9]) {
      const a = new THREE.Vector3(s * (1.08 * halfBeam(t0) - 0.1), deckY(t0) + dy, (t0 - 0.5) * L);
      const b = new THREE.Vector3(s * (1.08 * halfBeam(t1) - 0.1), deckY(t1) + dy, (t1 - 0.5) * L);
      pts.push(a, b);
      if (dy === 0.9 && i % 3 === 0) pts.push(a, a.clone().setY(deckY(t0)));
    }
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mats.rail));

  // số hiệu thân tàu
  const numMat = hullNumber(`PA-${number}`);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), numMat);
    p.position.set(s * 2.93, 2.3, 11);
    p.rotation.y = s * (Math.PI / 2);
    g.add(p);
  }

  g.userData = { radar, heading: 0 };
  return g;
}

/** Quay radar. Nhấp nhô do `floatOnWaves` (buoyancy.ts) lo. */
export function spinRadar(ship: Warship, t: number) {
  ship.userData.radar.rotation.y = t * 2.5;
}
