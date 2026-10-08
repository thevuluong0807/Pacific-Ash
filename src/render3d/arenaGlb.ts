import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HULLS, HULL_IDS, WEAPON_IDS, type ShipDesign } from '../arena/data';
import type { ArenaRig, MountRig } from './arenaShips';

/**
 * Model glb chế độ Hải chiến (design/arena-models.md): 3 thân, 8 khí tài, 5 loại đạn. Đơn vị = đơn vị thế giới (KHÔNG nhân WORLD_SCALE, KHÔNG co 0.1).
 * Mũi +Z, gốc giữa thân ở mặt nước. Vật liệu `team` đổi màu theo đội (clone mỗi tàu).
 */
const cache = new Map<string, THREE.Object3D>();
export const PROJ_KINDS = ['shell', 'bullet', 'torpedo', 'missile', 'rocket'] as const;
export type ProjKindId = (typeof PROJ_KINDS)[number];

export async function loadArenaModels(src: Record<string, string>): Promise<void> {
  const loader = new GLTFLoader();
  const keys = [...HULL_IDS.map((h) => `hull_${h}`), ...WEAPON_IDS.map((w) => `weapon_${w}`), ...PROJ_KINDS.map((k) => `proj_${k}`)];
  await Promise.all(keys.map(async (k) => {
    try {
      const uri = src[`arena_${k}`], b64 = uri.slice(uri.indexOf(',') + 1), bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const gltf = await loader.parseAsync(buf.buffer, '');
      cache.set(k, gltf.scene);
    } catch (err) { console.error(`Không nạp được model arena ${k}`, err); }
  }));
}
export const arenaModelsReady = () => cache.has('hull_small') && cache.has('weapon_heavy');

const find = (root: THREE.Object3D, name: string, mesh?: boolean) => { let f: THREE.Object3D | undefined; root.traverse((o) => { if (!f && o.name === name && (mesh === undefined || Boolean((o as THREE.Mesh).isMesh) === mesh)) f = o; }); return f; };
const clone = (k: string) => cache.get(k)?.clone(true);

/**
 * Thân glb loft hở ở đuôi (không có nắp mặt cắt): nhìn từ sau thấy rỗng. Bịt bằng một nắp phẳng quạt từ trọng tâm vòng mặt cắt cuối (các đỉnh hull/hull_under/deck tại z nhỏ nhất).
 * Mũi hội tụ về một điểm nên không cần nắp.
 */
function capStern(hull: THREE.Object3D) {
  const pts = new Map<string, THREE.Vector2>();
  let zMin = Infinity;
  const metas: THREE.Mesh[] = [];
  hull.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && ['hull', 'hull_under', 'deck'].includes(m.name)) metas.push(m); });
  for (const m of metas) { const a = m.geometry.attributes.position; for (let i = 0; i < a.count; i++) zMin = Math.min(zMin, a.getZ(i)); }
  for (const m of metas) {
    const a = m.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) if (a.getZ(i) < zMin + 0.05) pts.set(`${a.getX(i).toFixed(2)},${a.getY(i).toFixed(2)}`, new THREE.Vector2(a.getX(i), a.getY(i)));
  }
  if (pts.size < 3) return;
  const ring = [...pts.values()], c = ring.reduce((s, p) => s.add(p), new THREE.Vector2()).multiplyScalar(1 / ring.length);
  ring.sort((p, q) => Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(q.y - c.y, q.x - c.x));
  const pos: number[] = [c.x, c.y, zMin];
  for (const p of ring) pos.push(p.x, p.y, zMin);
  const idx: number[] = [];
  for (let i = 0; i < ring.length; i++) idx.push(0, 1 + i, 1 + ((i + 1) % ring.length));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const src = metas.find((m) => m.name === 'hull_under')?.material ?? metas[0].material;
  const cap = new THREE.Mesh(g, src);
  cap.name = 'stern_cap';
  hull.add(cap);
}

/** Gắn màu đội: chỉ vật liệu `team` (clone, không đụng vật liệu dùng chung). */
function tint(root: THREE.Object3D, color: number) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, emissive: color, emissiveIntensity: 0.35 });
  root.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh && (me.material as THREE.Material).name === 'team') me.material = m; });
  return m;
}
/** Nhấc nhẹ độ sáng: cảnh hoàng hôn/đêm khá tối (cùng cách với 8 tàu chế độ lưới). */
function lift(root: THREE.Object3D) {
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m?.isMeshStandardMaterial && !seen.has(m)) m.side = THREE.DoubleSide; // đuôi/đáy thân glb mở (mặt chỉ có một phía): vẽ hai mặt để không bị rỗng
    if (m?.isMeshStandardMaterial && !seen.has(m) && m.name !== 'glow' && m.name !== 'team' && m.emissive.getHex() === 0) { seen.add(m); m.emissive.copy(m.color).multiplyScalar(0.28); m.emissiveIntensity = 1; }
  });
}

export interface GlbRig extends ArenaRig {
  /** Neo trên thân (vị trí cục bộ). */
  slots: THREE.Object3D[]; radar?: THREE.Object3D; dmg: THREE.Object3D[]; smoke: THREE.Object3D[]; bowWave?: THREE.Object3D; camTop?: THREE.Object3D;
  /** Mỗi khe: các nòng/ống (giật lùi) và nút muzzle. */
  weapons: (THREE.Object3D | null)[]; recoil: THREE.Object3D[][];
}

/** Dựng tàu từ thiết kế bằng model glb; null nếu chưa nạp xong (dùng khối placeholder). */
export function buildGlbShip(dz: ShipDesign, teamColor: number): GlbRig | null {
  const root = new THREE.Group(), hull = clone(`hull_${dz.hull}`);
  if (!hull) return null;
  root.add(hull);
  capStern(hull);
  lift(hull);
  tint(hull, teamColor);
  const spec = HULLS[dz.hull];
  const slots: THREE.Object3D[] = [], mounts: MountRig[] = [], weapons: (THREE.Object3D | null)[] = [], recoil: THREE.Object3D[][] = [];
  spec.slots.forEach((_, i) => {
    const anchor = find(hull, `slot_${i}`, false) ?? new THREE.Object3D();
    slots.push(anchor);
    const w = dz.slots[i], pad = find(hull, `slot_pad_${i}`);
    if (!w) {
      mounts.push({ yaw: new THREE.Group(), pitch: new THREE.Group(), muzzle: anchor, body: pad ?? anchor });
      weapons.push(null); recoil.push([]);
      return;
    }
    if (pad) pad.visible = false;
    const wm = clone(`weapon_${w}`);
    if (!wm) { mounts.push({ yaw: new THREE.Group(), pitch: new THREE.Group(), muzzle: anchor, body: anchor }); weapons.push(null); recoil.push([]); return; }
    lift(wm); tint(wm, teamColor);
    wm.position.copy(anchor.position);
    root.add(wm);
    const yaw = find(wm, 'yaw')!, pitch = find(wm, 'pitch')!, muzzle = find(wm, 'muzzle') ?? pitch;
    const barrels: THREE.Object3D[] = [];
    wm.traverse((o) => { if (/^(barrel_[LR]|tube_\d)$/.test(o.name)) barrels.push(o); });
    mounts.push({ yaw: yaw as THREE.Group, pitch: pitch as THREE.Group, muzzle, body: wm });
    weapons.push(wm); recoil.push(barrels);
  });
  const flag = (find(hull, 'flag_cloth') ?? find(hull, 'flag') ?? new THREE.Object3D()) as THREE.Mesh;
  const dmg = [0, 1, 2].map((n) => find(hull, `dmg_${n}`)).filter(Boolean) as THREE.Object3D[];
  const smoke = [0, 1].map((n) => find(hull, `smoke_${n}`)).filter(Boolean) as THREE.Object3D[];
  const hullMesh = (find(hull, 'hull', true) ?? hull) as THREE.Mesh;
  root.traverse((o) => { o.frustumCulled = false; });
  return { root, mounts, flag, hull: hullMesh, slots, radar: find(hull, 'radar_rotor'), dmg, smoke, bowWave: find(hull, 'bow_wave'), camTop: find(hull, 'cam_top'), weapons, recoil };
}

/** Bản sao model đạn (hướng bay +Z); `tail` là chỗ phát vệt. */
export function buildGlbProj(kind: ProjKindId, teamColor: number): { obj: THREE.Object3D; tail: THREE.Object3D | null } | null {
  const o = clone(`proj_${kind}`);
  if (!o) return null;
  tint(o, teamColor);
  return { obj: o, tail: find(o, 'tail') ?? null };
}
