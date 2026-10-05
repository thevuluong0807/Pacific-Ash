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
      cache.set(id, gltf.scene);
    } catch (err) { console.error(`Không nạp được model ${id}`, err); }
  }));
}

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
