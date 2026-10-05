import * as THREE from 'three';
import type { Orientation, ShipId } from '../../design/core-api';
import { loadSpecs } from '../core/specs';
import { modelRig } from './shipGlb';
import { CELL, HEIGHT } from './scale';

const SPECS = loadSpecs();
/** [dài, cao, rộng] của hộp placeholder (design/assets.md mục 1: tỉ lệ 1 ô = 1 đơn vị). Model thật thay vào qua manifest. */
const DIMS: Record<ShipId, [number, number, number]> = {
  destroyer: [1.9, 0.095, 0.38], cruiser: [2.9, 0.105, 0.4], submarine: [2.9, 0.22, 0.22], missile: [3.9, 0.105, 0.42], carrier: [4.9, 0.205, 0.8],
  raider: [0.8, 0.07, 0.26], escort: [1.7, 0.1, 1.55],
};
/** Mớn nước: đáy thân ở y = -draft; mạn khô (đỉnh thân) = h - draft (design/ship-*.md mục 2.1). */
const DRAFT: Record<ShipId, number> = { destroyer: 0.045, cruiser: 0.05, submarine: 0.155, missile: 0.05, carrier: 0.08, raider: 0.035, escort: 0.045 };

/** Tâm tàu so với tâm ô gốc: `line` lệch (size-1)/2 dọc hướng, `square` lệch (size-1)/2 cả hai trục. */
export function footprintCenter(id: ShipId, orientation: Orientation): { dx: number; dz: number } {
  const sp = SPECS[id], k = (sp.size - 1) / 2;
  return sp.shape === 'square' ? { dx: k, dz: k } : { dx: orientation === 'h' ? k : 0, dz: orientation === 'v' ? k : 0 };
}

export interface ShipPose { id: ShipId; origin: { x: number; y: number }; orientation: Orientation; sunk?: boolean }

/** Bộ phận chuyển động mà cinematic cần (tên theo điểm neo trong design/ship-*.md). */
export interface Turret { yaw: THREE.Object3D; pitch: THREE.Object3D; muzzle: THREE.Object3D; recoil: THREE.Object3D }
export interface RigParts {
  turrets: Turret[];
  launchers: { base: THREE.Object3D; pitch: THREE.Object3D; muzzle: THREE.Object3D }[];
  flaps: THREE.Object3D[];
  planes: THREE.Object3D[];
  launch: THREE.Object3D;     // neo `launch`
  catStart: THREE.Object3D[]; catEnd: THREE.Object3D[];
}
export type ShipRig = THREE.Group & { userData: { half: number; wide: number; parts: RigParts; id: ShipId; kick: { roll: number; pitch: number }; yOffset: number } };

const dark = () => new THREE.MeshStandardMaterial({ color: 0x5a6672, roughness: 0.55, metalness: 0.4 });
const box = (w: number, h: number, l: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
const empty = (parent: THREE.Object3D, x: number, y: number, z: number) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

function turret(parent: THREE.Object3D, y: number, z: number, barrels: number, len: number, m: THREE.Material): Turret {
  const yaw = new THREE.Group(); yaw.position.set(0, y, z); parent.add(yaw);
  yaw.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.05, 8), m));
  const pitch = new THREE.Group(); pitch.position.y = 0.035; yaw.add(pitch);
  const recoil = new THREE.Group(); pitch.add(recoil);
  for (let i = 0; i < barrels; i++) {
    const b = box(0.012, 0.012, len, m);
    b.position.set((i - (barrels - 1) / 2) * 0.03, 0, len / 2);
    recoil.add(b);
  }
  const muzzle = empty(recoil, 0, 0, len);
  return { yaw, pitch, muzzle, recoil };
}

function planeMesh() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: 0.5, metalness: 0.4 });
  g.add(box(0.03, 0.025, 0.16, m));
  const wing = box(0.16, 0.006, 0.045, m); wing.position.z = -0.01; g.add(wing);
  const tail = box(0.06, 0.006, 0.025, m); tail.position.z = -0.07; g.add(tail);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 0.3, 0.3) }));
  lamp.position.set(0.08, 0, -0.01); g.add(lamp);
  return g;
}

/** Placeholder: hộp thân + nhà boong + các bộ phận chuyển động tối thiểu (tháp pháo, bệ phóng, nắp ống, máy bay). Mũi +Z, đáy sát y=0. */
/** Rig của tàu: model glb nếu đã nạp, không thì hộp placeholder. */
export function placeholderShip(id: ShipId): ShipRig {
  const r = modelRig(id) ?? boxShip(id);
  r.scale.set(CELL, CELL * HEIGHT, CELL); // to gấp CELL lần so với ô, cao thêm HEIGHT lần cho cân với tàu nền
  r.userData.half *= CELL; r.userData.wide *= CELL;
  return r;
}

function boxShip(id: ShipId): ShipRig {
  const [len, h, w] = DIMS[id];
  const color = new THREE.Color(SPECS[id].placeholderColor);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.35, emissive: new THREE.Color(0x0b1520), emissiveIntensity: 0.6 });
  const g = new THREE.Group() as ShipRig;
  const parts: RigParts = { turrets: [], launchers: [], flaps: [], planes: [], launch: new THREE.Object3D(), catStart: [], catEnd: [] };
  const top = h - DRAFT[id]; // cao độ boong so với mặt nước
  const hull = id === 'submarine'
    ? new THREE.Mesh(new THREE.CapsuleGeometry(w / 2, len - w, 6, 12).rotateX(Math.PI / 2), mat)
    : box(w, h, len, mat);
  hull.position.y = id === 'submarine' ? -0.045 : h / 2 - DRAFT[id];
  g.add(hull);
  const ch = id === 'carrier' ? 0.2 : id === 'submarine' ? 0.1 : 0.12;
  const cabin = box(id === 'carrier' ? 0.16 : w * 0.5, ch, len * (id === 'carrier' ? 0.12 : id === 'submarine' ? 0.15 : 0.22), mat);
  cabin.position.set(id === 'carrier' ? -0.4 : 0, top + ch / 2, id === 'carrier' ? 0.65 : len * 0.05);
  g.add(cabin);
  const d = dark();
  switch (id) {
    case 'destroyer':
      parts.turrets.push(turret(g, top, 0.66, 1, 0.22, d), turret(g, top, -0.4, 1, 0.22, d));
      parts.launch = empty(g, 0, top, 0.46);
      break;
    case 'cruiser':
      parts.turrets.push(turret(g, top, 1.0, 2, 0.28, d), turret(g, top + 0.03, 0.74, 2, 0.28, d), turret(g, top, -0.6, 2, 0.28, d));
      parts.launch = empty(g, 0, top, 0.8);
      break;
    case 'missile':
      for (let i = 0; i < 5; i++) {
        const base = empty(g, (i - 2) * 0.07, top, 0.55 + i * 0.16);
        const pitch = new THREE.Group(); base.add(pitch);
        pitch.add(box(0.05, 0.05, 0.12, d));
        const muzzle = empty(pitch, 0, 0, 0.07);
        base.visible = false; // chỉ hiện khi nắp khoang mở
        base.userData.y0 = 0;
        parts.launchers.push({ base, pitch, muzzle });
      }
      parts.launch = empty(g, 0, top, 0.9);
      break;
    case 'submarine':
      for (let i = 0; i < 4; i++) {
        const f = box(0.05, 0.005, 0.05, d); f.position.set((i % 2 ? 1 : -1) * 0.045, (i < 2 ? 0.04 : -0.01) - 0.045, 1.38 - 0.02);
        g.add(f); parts.flaps.push(f);
      }
      parts.launch = empty(g, 0, -0.02, 1.4);
      break;
    case 'raider':
      parts.turrets.push(turret(g, top, 0.22, 1, 0.14, d));
      parts.launch = empty(g, 0, top, 0.3);
      break;
    case 'escort': { // hai thân song song nối boong, vòm radar, bốn CIWS (placeholder)
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), d);
      dome.position.set(0, top + 0.17, 0); g.add(dome);
      for (const [x, z] of [[-0.55, 0.55], [0.55, 0.55], [-0.55, -0.55], [0.55, -0.55]]) parts.turrets.push(turret(g, top, z, 1, 0.1, d)), (parts.turrets.at(-1)!.yaw.position.x = x);
      parts.launch = empty(g, 0, top, 0.6);
      break;
    }
    case 'carrier':
      for (let i = 0; i < 3; i++) {
        const p = planeMesh(); p.position.set(i < 2 ? (i ? -0.12 : 0.12) : 0.25, top + 0.012, i < 2 ? 1.3 : -0.4); g.add(p);
        parts.planes.push(p);
      }
      for (const x of [0.12, -0.12]) { parts.catStart.push(empty(g, x, top + 0.02, 1.3)); parts.catEnd.push(empty(g, x, top + 0.02, 2.28)); }
      parts.launch = empty(g, 0, top, 1.5);
      break;
  }
  g.userData = { half: len / 2, wide: w / 2, parts, id, kick: { roll: 0, pitch: 0 }, yOffset: 0 };
  return g;
}
