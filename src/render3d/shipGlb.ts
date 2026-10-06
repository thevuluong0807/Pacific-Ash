import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ShipId } from '../../design/core-api';
import { ROSTER } from '../core/specs';
import type { RigParts, ShipRig, Turret } from './shipModels';

/**
 * Model glb khối mượt của người thiết kế (design/ships-basic3d.md). Mũi +Z, gốc giữa thân ở mặt nước;
 * riêng escort mũi +X (xoay trong nhóm con để rig luôn mũi +Z). Cây node và điểm neo là hợp đồng (mục 2).
 */
const cache = new Map<ShipId, THREE.Object3D>();

/** Nạp cả 7 model (data URI nội tuyến nên chạy được bằng file://). Lỗi một model thì tàu đó vẫn dùng hộp placeholder. */
export async function loadShipModels(GLB: Record<ShipId, string>): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(ROSTER.map(async (id) => {
    try {
      const b64 = GLB[id].slice(GLB[id].indexOf(',') + 1);
      const bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const gltf = await loader.parseAsync(buf.buffer, '');
      // Cảnh hoàng hôn/đêm khá tối: nhấc nhẹ độ sáng vật liệu (phát sáng 30% màu gốc) để tàu luôn đọc được.
      gltf.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m?.isMeshStandardMaterial && m.emissive.getHex() === 0) { m.emissive.copy(m.color).multiplyScalar(0.3); m.emissiveIntensity = 1; }
      });
      shrinkToCells(gltf.scene);
      cache.set(id, gltf.scene);
    } catch (err) { console.error(`Không nạp được model ${id}`, err); }
  }));
}

/**
 * Model glb mới đã nhân 10 sẵn (design/world-scale.md: 1 ô = 10 ĐV, khu trục hạm dài 19). Rig phóng `CELL` lần từ đơn vị "ô",
 * nên đỉnh và vị trí node được co ×0.1 một lần lúc nạp: kích thước thế giới ra đúng bằng file glb khi CELL = 10 và mọi mã ghi theo ô giữ nguyên.
 */
function shrinkToCells(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o !== root) o.position.multiplyScalar(0.1);
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.scale(0.1, 0.1, 0.1);
  });
}

const debris = new Map<string, THREE.Object3D>();
export const DEBRIS_IDS = ['plate', 'mast', 'turret', 'hullchunk', 'cargo', 'funnel', 'wing', 'vls', 'sail', 'radome'] as const;
export type DebrisId = (typeof DEBRIS_IDS)[number];

/** Nạp 10 mảnh xác tàu (design/wreckage.md, đã nhân 10 sẵn như model tàu: co về đơn vị ô khi nạp). Mảnh lỗi thì bỏ qua, ô đó không có mảnh. */
export async function loadDebrisModels(src: Record<string, string>): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(DEBRIS_IDS.map(async (id) => {
    try {
      const uri = src[`debris_${id}`];
      const b64 = uri.slice(uri.indexOf(',') + 1);
      const bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const gltf = await loader.parseAsync(buf.buffer, '');
      gltf.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m?.isMeshStandardMaterial && m.emissive.getHex() === 0) { m.emissive.copy(m.color).multiplyScalar(0.3); m.emissiveIntensity = 1; }
      });
      shrinkToCells(gltf.scene);
      debris.set(id, gltf.scene);
    } catch (err) { console.error(`Không nạp được mảnh xác ${id}`, err); }
  }));
}
const wrecks = new Map<ShipId, THREE.Object3D>();

/** Nạp 7 model xác tàu bị hạ `wreck_<id>.glb` (design/wreckage.md mục 3; đã nhân 10, co về đơn vị ô như model tàu). Lỗi thì tàu bị hạ giữ model nguyên vẹn. */
export async function loadWreckModels(src: Record<string, string>): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(ROSTER.map(async (id) => {
    try {
      const uri = src[`wreck_${id}`];
      const b64 = uri.slice(uri.indexOf(',') + 1);
      const bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const gltf = await loader.parseAsync(buf.buffer, '');
      gltf.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m?.isMeshStandardMaterial && m.emissive.getHex() === 0) { m.emissive.copy(m.color).multiplyScalar(0.3); m.emissiveIntensity = 1; }
      });
      shrinkToCells(gltf.scene);
      wrecks.set(id, gltf.scene);
    } catch (err) { console.error(`Không nạp được model xác ${id}`, err); }
  }));
}
/** Bản sao model xác, đã xoay mũi về +Z của rig (riêng escort mũi +X như model nguyên vẹn). */
export function wreckModel(id: ShipId): THREE.Group | null {
  const src = wrecks.get(id);
  if (!src) return null;
  const inner = new THREE.Group();
  inner.add(src.clone(true));
  if (id === 'escort') inner.rotation.y = -Math.PI / 2;
  return inner;
}
export const debrisModel = (id: DebrisId) => debris.get(id)?.clone(true);

export const hasModel = (id: ShipId) => cache.has(id);

const V = () => new THREE.Vector3();

/** Dựng rig từ model đã nạp (null nếu chưa có). */
export function modelRig(id: ShipId): ShipRig | null {
  const src = cache.get(id);
  if (!src) return null;
  const model = src.clone(true);
  const root = new THREE.Group() as ShipRig;
  const inner = new THREE.Group();
  inner.add(model);
  if (id === 'escort') inner.rotation.y = -Math.PI / 2; // mũi +X của model → +Z của rig
  root.add(inner);
  root.updateMatrixWorld(true);

  const all: THREE.Object3D[] = [];
  model.traverse((o) => all.push(o));
  const named = (re: RegExp) => all.filter((o) => re.test(o.name));
  const anchor = (n: string) => all.find((o) => o.name === n);
  const zOf = (o: THREE.Object3D) => model.worldToLocal(o.getWorldPosition(V())).z;

  const parts: RigParts = { turrets: [], launchers: [], flaps: [], planes: [], launch: anchor('launch') ?? new THREE.Object3D(), catStart: [], catEnd: [] };

  // Tháp pháo: turret_* → nhóm `pitch` chứa các barrel_* (chúc/giật), muzzle_* trong cây con. Sắp từ mũi về đuôi.
  const turrets = named(/^turret_(fwd|aft|\d+)$/).sort((a, b) => zOf(b) - zOf(a));
  for (const yaw of turrets) {
    const pitch = new THREE.Group();
    yaw.add(pitch);
    for (const b of [...yaw.children]) if (/^barrel_/.test(b.name) && !/mesh/.test(b.name)) pitch.add(b);
    let muzzle: THREE.Object3D | undefined;
    pitch.traverse((o) => { if (!muzzle && /^muzzle_/.test(o.name) && !/brake/.test(o.name)) muzzle = o; });
    parts.turrets.push({ yaw, pitch, recoil: pitch, muzzle: muzzle ?? pitch } satisfies Turret);
  }
  if (id === 'escort') { // CIWS: quay được, dùng cho cảnh hộ tống
    for (const c of named(/^ciws_\d$/)) parts.turrets.push({ yaw: c, pitch: new THREE.Object3D(), recoil: new THREE.Object3D(), muzzle: c });
  }
  for (const base of named(/^launcher_\d$/)) {
    const n = base.name.slice(-1);
    const pitch = anchor(`launcher_${n}_pitch`) ?? base;
    base.userData.y0 = base.position.y;
    base.visible = false; // chỉ hiện khi nắp khoang mở
    parts.launchers.push({ base, pitch, muzzle: anchor(`vls_slot_${n}`) ?? base });
  }
  parts.flaps = named(/^torpedo_flap_\d$/);
  parts.planes = named(/^plane_\d$/).slice(0, 3); // cinematic dùng tối đa 3 máy bay; chiếc thứ 4 đậu yên
  parts.catStart = named(/^cat_start_\d$/);
  parts.catEnd = named(/^cat_end_\d$/);

  const box = new THREE.Box3().setFromObject(root);
  root.userData = {
    half: Math.max(0.3, (box.max.z - box.min.z) / 2), wide: Math.max(0.1, (box.max.x - box.min.x) / 2),
    parts, id, kick: { roll: 0, pitch: 0 }, yOffset: 0,
  };
  return root;
}
