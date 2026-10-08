import * as THREE from 'three';
import { HULLS, WEAPONS, type ShipDesign, type WeaponId } from '../arena/data';
import { halfBeam } from '../arena/sim';

/** Tàu dạng khối tạm cho chế độ Hải chiến (mũi +Z, gốc giữa thân ở mặt nước). Mô hình chính thức sẽ thay sau: giữ nguyên hợp đồng `ArenaRig`. */
export interface MountRig { yaw: THREE.Group; pitch: THREE.Group; muzzle: THREE.Object3D; body: THREE.Object3D }
export interface ArenaRig { root: THREE.Group; mounts: MountRig[]; flag: THREE.Mesh; hull: THREE.Mesh }

const mat = (hex: number, rough = 0.7, metal = 0.2) => {
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });
  m.emissive.set(hex).multiplyScalar(0.4); // cảnh hoàng hôn/đêm tối: nhấc nhẹ để tàu luôn đọc được (như model glb)
  return m;
};
const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r: number, h: number, m: THREE.Material, seg = 14) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);

const HULL_COL = { small: 0x6c7a86, medium: 0x5a6772, large: 0x4a5560 } as const;
const matHull = new Map<number, THREE.MeshStandardMaterial>();
const shared = (hex: number) => { let m = matHull.get(hex); if (!m) matHull.set(hex, (m = mat(hex))); return m; };

/** Thân tàu: lăng trụ có mũi nhọn và đuôi vuông, đỉnh boong ở y = mạn khô, đáy ở y = -mớn nước. */
function hullGeometry(id: 'small' | 'medium' | 'large') {
  const h = HULLS[id], L = h.length, pts: THREE.Vector2[] = [];
  const N = 14;
  for (let i = 0; i <= N; i++) { const z = -L / 2 + (L * i) / N; pts.push(new THREE.Vector2(halfBeam(h, z), z)); }
  for (let i = N; i >= 0; i--) { const z = -L / 2 + (L * i) / N; pts.push(new THREE.Vector2(-halfBeam(h, z), z)); }
  const shape = new THREE.Shape(pts);
  const g = new THREE.ExtrudeGeometry(shape, { depth: h.freeboard + h.draft, bevelEnabled: false });
  g.rotateX(Math.PI / 2); // (x, z, độ sâu) -> (x, -độ sâu, z): đáy hướng xuống
  g.translate(0, h.freeboard, 0);
  g.computeVertexNormals();
  return g;
}

function mountBody(w: WeaponId, slotSize: number): { body: THREE.Group; pitch: THREE.Group; muzzle: THREE.Object3D; base: THREE.Object3D } {
  const spec = WEAPONS[w], dark = mat(0x2a3138, 0.6, 0.5), col = mat(spec.color, 0.5, 0.3);
  const body = new THREE.Group(), pitch = new THREE.Group(), muzzle = new THREE.Object3D();
  const k = 0.8 + slotSize * 0.2;
  const add = (o: THREE.Object3D, p: THREE.Group | THREE.Object3D = pitch) => { p.add(o); return o; };
  let baseO: THREE.Object3D;
  switch (w) {
    case 'heavy': case 'cannon': {
      const r = w === 'heavy' ? 6.5 : 4.4, len = spec.barrel, n = 2, bw = w === 'heavy' ? 1.7 : 1.1;
      baseO = add(cyl(r, 3.2, shared(0x3b444d)), body); baseO.position.y = 1.6;
      const hood = add(box(r * 1.5, 3, r * 1.7, shared(0x4a545e)), pitch); hood.position.set(0, 2.2, -r * 0.1);
      for (let i = 0; i < n; i++) { const b = box(bw, bw, len, dark); b.position.set((i - 0.5) * bw * 1.7, 2.2, len / 2); pitch.add(b); const tip = box(bw * 1.3, bw * 1.3, 1.2, col); tip.position.set(b.position.x, 2.2, len); pitch.add(tip); }
      pitch.position.y = 1.4; muzzle.position.set(0, 2.2, len + 0.6);
      break;
    }
    case 'howitzer': {
      baseO = add(cyl(5, 3, shared(0x3b444d)), body); baseO.position.y = 1.5;
      const b = box(3.6, 3.6, spec.barrel + 2, dark); b.position.set(0, 2.5, (spec.barrel + 2) / 2 - 1); pitch.add(b);
      const tip = box(4.4, 4.4, 1.2, col); tip.position.set(0, 2.5, spec.barrel + 1); pitch.add(tip);
      pitch.position.y = 1.4; muzzle.position.set(0, 2.5, spec.barrel + 1.6);
      break;
    }
    case 'torpedo': {
      baseO = add(box(8, 1.4, 9, shared(0x3b444d)), body); baseO.position.y = 0.7;
      for (let i = 0; i < 2; i++) { const t = cyl(1.2, 9, col, 10); t.rotation.x = Math.PI / 2; t.position.set((i - 0.5) * 3, 2.2, 1); pitch.add(t); }
      muzzle.position.set(0, 2.2, 5.5);
      break;
    }
    case 'missile': {
      baseO = add(cyl(3, 2, shared(0x3b444d)), body); baseO.position.y = 1;
      const rail = box(3.6, 2.4, 9, dark); rail.position.set(0, 1.6, 2); pitch.add(rail);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 8), col); nose.rotation.x = Math.PI / 2; nose.position.set(0, 3.2, 2); pitch.add(nose);
      const nose2 = nose.clone(); nose2.position.y = 3.2; nose2.position.z = 2; pitch.add(nose2);
      pitch.position.y = 1.6; muzzle.position.set(0, 2.4, 6.5);
      break;
    }
    case 'rocket': {
      baseO = add(box(5, 1.4, 5, shared(0x3b444d)), body); baseO.position.y = 0.7;
      const pod = box(4.4, 3, 6, col); pod.position.set(0, 1.5, 1.5); pitch.add(pod);
      for (let i = 0; i < 6; i++) { const hole = box(0.9, 0.9, 0.3, dark); hole.position.set(((i % 3) - 1) * 1.3, 1 + Math.floor(i / 3) * 1.3, 4.6); pitch.add(hole); }
      pitch.position.y = 1.4; muzzle.position.set(0, 1.5, 4.8);
      break;
    }
    case 'autocannon': {
      baseO = add(cyl(2.4 * k, 2.4, shared(0x3b444d)), body); baseO.position.y = 1.2;
      const hood = box(3, 2.2, 3.4, col); hood.position.set(0, 1.4, 0); pitch.add(hood);
      const b = box(0.8, 0.8, spec.barrel, dark); b.position.set(0, 1.4, spec.barrel / 2); pitch.add(b);
      pitch.position.y = 2.4; muzzle.position.set(0, 1.4, spec.barrel + 0.4);
      break;
    }
    default: { // mg
      baseO = add(cyl(1.5 * k, 1.8, shared(0x3b444d)), body); baseO.position.y = 0.9;
      const b = box(0.5, 0.5, spec.barrel + 1, dark); b.position.set(0, 0.8, (spec.barrel + 1) / 2); pitch.add(b);
      const grip = box(1.2, 1, 1.4, col); grip.position.set(0, 0.7, -0.3); pitch.add(grip);
      pitch.position.y = 1.8; muzzle.position.set(0, 0.8, spec.barrel + 1);
    }
  }
  pitch.add(muzzle);
  body.add(pitch);
  return { body, pitch, muzzle, base: baseO };
}

export function buildArenaShip(dz: ShipDesign, teamColor: number): ArenaRig {
  const h = HULLS[dz.hull], root = new THREE.Group();
  const hull = new THREE.Mesh(hullGeometry(dz.hull), shared(HULL_COL[dz.hull]));
  root.add(hull);
  const deck = shared(0x3a444d), trim = mat(teamColor, 0.5, 0.1);
  trim.emissive.setHex(teamColor); trim.emissiveIntensity = 0.35;
  // sọc màu đội dọc mạn và boong
  const stripe = box(h.beam * 0.9, 0.6, h.length * 0.5, trim); stripe.position.set(0, h.freeboard + 0.35, -h.length * 0.08); root.add(stripe);
  // cầu chỉ huy và ống khói
  const tw = h.tower, bridge = box(h.beam * 0.5, tw, h.length * 0.16, deck); bridge.position.set(0, h.freeboard + tw / 2, -h.length * 0.1); root.add(bridge);
  const wing = box(h.beam * 0.72, tw * 0.22, h.length * 0.1, shared(0x4a545e)); wing.position.set(0, h.freeboard + tw * 0.8, -h.length * 0.1); root.add(wing);
  const fun = cyl(h.beam * 0.15, tw * 0.9, shared(0x2c353c)); fun.position.set(0, h.freeboard + tw * 0.95, -h.length * 0.24); root.add(fun);
  const mast = cyl(0.4, tw * 1.1, shared(0x2c353c), 6); mast.position.set(0, h.freeboard + tw * 1.35, -h.length * 0.1); root.add(mast);
  const flag = box(0.2, tw * 0.22, tw * 0.45, trim); flag.position.set(0, h.freeboard + tw * 1.8, -h.length * 0.1 - tw * 0.22); root.add(flag);
  // khí tài
  const mounts: MountRig[] = h.slots.map((sp, i) => {
    const w = dz.slots[i];
    const yaw = new THREE.Group();
    yaw.position.set(sp.x, 0, sp.z);
    yaw.position.y = sp.y - 1.5;
    if (sp.y - 1.5 > h.freeboard + 0.5 && sp.z > -h.length * 0.3 && !(sp.z < -h.length * 0.05)) { // bệ nâng dưới tháp cao hơn boong
      const ped = box(sp.size * 4.2, sp.y - 1.5 - h.freeboard, sp.size * 5, shared(0x3a444d)); ped.position.set(sp.x, h.freeboard + (sp.y - 1.5 - h.freeboard) / 2, sp.z); root.add(ped);
    }
    root.add(yaw);
    if (!w) { const pad = cyl(1.8, 0.6, shared(0x3b444d)); pad.position.y = 0.3; yaw.add(pad); const pitch = new THREE.Group(); yaw.add(pitch); return { yaw, pitch, muzzle: pitch, body: pad }; }
    const m = mountBody(w, sp.size);
    yaw.add(m.body);
    return { yaw, pitch: m.pitch, muzzle: m.muzzle, body: m.body };
  });
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  return { root, mounts, flag, hull };
}

export const TEAM_COLORS = [0x4fc3e8, 0xe8742a, 0x8ae05c, 0xd96bff, 0xffd24a, 0xff5c7a];
