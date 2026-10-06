import * as THREE from 'three';
import type { Cell, ShipId } from '../../design/core-api';
import type { Fx } from './fx3d';
import { debrisModel, type DebrisId } from './shipGlb';
import { CELL } from './scale';

/**
 * Ô trúng ở 3D = mảnh xác tàu nổi (design/wreckage.md mục 1). Mỗi ô trúng một trong 10 mảnh glb: bị hất lên theo cung 900 ms, rơi xuống,
 * nổi và nhấp nhô, bốc cột khói cao 40 (không còn lửa, vòng sáng, than hồng). Mảnh chung (6) cho mọi ô để không lộ
 * loại tàu địch; mảnh riêng (cánh, VLS, tháp tàu ngầm, vòm radar) chỉ cho tàu của mình. Khi tàu chìm (`absorb`), mảnh trong ô trôi về thân tàu và chìm
 * cùng từ 4.5 s tới 9 s (thời gian cảnh chìm), riêng 2 mảnh ở lại nổi (tắt lửa sau 6 s).
 */
export interface HitCell extends Cell { ship?: ShipId }
type Owner = 'own' | 'enemy';

const COMMON: DebrisId[] = ['plate', 'mast', 'turret', 'hullchunk', 'cargo', 'funnel'];
const SPECIAL: Partial<Record<ShipId, DebrisId>> = { carrier: 'wing', missile: 'vls', submarine: 'sail', escort: 'radome' };
const MAX_PIECES = 25, MAX_SMOKE = 12;
const hash = (a: number, b: number, c: number) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967295; };

interface Piece {
  key: string; owner: Owner; cell: Cell; kind: DebrisId;
  holder: THREE.Group; body: THREE.Object3D;
  float: THREE.Object3D | null; smokePt: THREE.Object3D | null;
  rest: THREE.Vector3; yaw: number; tiltX: number; tiltZ: number; phase: number; drift: THREE.Vector2;
  state: 'toss' | 'rise' | 'float' | 'sink' | 'gone';
  t0: number; born: number; smoky: boolean; stay: boolean;
  from?: THREE.Vector3; apex: number; spin: number;
  sinkFrom?: THREE.Vector3; sinkT0?: number; sinkT1?: number; sinkTo?: THREE.Vector3;
  smoke: THREE.Sprite[];
}

export class WreckField {
  readonly group = new THREE.Group();
  /** Chất lượng thấp: bỏ cột khói, vòng sáng, chùm tia lửa (wreckage.md 1.4). */
  low = false;
  private pieces = new Map<string, Piece>();
  private blocked = new Set<string>();
  private primed = false;
  private seed = (Math.random() * 1e6) | 0;

  constructor(private fx: Fx, private heightAt: (x: number, z: number, t: number) => number, private cellWorld: (o: Owner, c: Cell) => THREE.Vector3,
    private heading: (id: ShipId) => number | undefined) {}

  /** Đồng bộ mảnh theo danh sách ô trúng (ô của tàu đã chìm không có trong danh sách). Mảnh mới được hất lên nếu là phát bắn mới. */
  sync(own: HitCell[], enemy: HitCell[], t: number) {
    const want = new Map<string, { owner: Owner; c: HitCell }>();
    for (const c of own) want.set(`own:${c.x},${c.y}`, { owner: 'own', c });
    for (const c of enemy) want.set(`enemy:${c.x},${c.y}`, { owner: 'enemy', c });
    for (const [k, p] of this.pieces) if (!want.has(k) && !p.stay && p.state !== 'sink') this.remove(p);
    const fresh = [...want].filter(([k]) => !this.pieces.has(k) && !this.blocked.has(k));
    const toss = this.primed && fresh.length <= 4;
    for (const [k, w] of fresh) this.add(k, w.owner, w.c, t, toss);
    this.primed = true;
    this.limit();
  }

  private pick(owner: Owner, c: HitCell): DebrisId {
    // Ô trúng chỉ hiện mảnh vỡ chung chung (người dùng: không lộ/riêng theo loại tàu, kể cả tàu mình); model tàu chỉ hiện khi bắn hạ.
    const special: DebrisId | undefined = undefined as DebrisId | undefined;
    void SPECIAL; void owner;
    const r = hash(c.x, c.y, this.seed);
    let kind: DebrisId = special && r < 0.5 ? special : COMMON[Math.floor(r * COMMON.length) % COMMON.length];
    for (const [, p] of this.pieces) if (p.owner === owner && Math.abs(p.cell.x - c.x) + Math.abs(p.cell.y - c.y) === 1 && p.kind === kind) kind = COMMON[(COMMON.indexOf(kind) + 1) % COMMON.length] ?? 'plate'; // ô kề nhau không cùng loại
    return kind;
  }

  private add(key: string, owner: Owner, c: HitCell, t: number, toss: boolean) {
    const kind = this.pick(owner, c);
    const model = debrisModel(kind);
    if (!model) return;
    const k = CELL / 10;
    const holder = new THREE.Group();
    const body = model;
    body.scale.setScalar(CELL * 1.0); // cỡ nhìn rõ từ camera trận (wreckage.md 1.2: rộng ≥ 28 px ở camera trận (đo ảnh: ×1.2 quá nhỏ); đòn nặng ×1.4 chưa phân biệt)
    holder.add(body);
    const named = (n: string) => { let f: THREE.Object3D | null = null; body.traverse((o) => { if (!f && o.name === n) f = o; }); return f; };
    const center = this.cellWorld(owner, c);
    let rest = center.clone();
    if (owner === 'own' && c.ship) { // tàu mình: đặt bên mạn, ngoài thân, trong phạm vi ô
      const h = this.heading(c.ship) ?? 0, side = hash(c.x, c.y, this.seed + 7) < 0.5 ? -1 : 1;
      rest.x += Math.cos(h) * side * Math.min(5.5 * k, 0.4 * CELL); rest.z += -Math.sin(h) * side * Math.min(5.5 * k, 0.4 * CELL);
    }
    const r = (n: number) => hash(c.x, c.y, this.seed + n);
    rest.x += (r(1) - 0.5) * 0.1 * CELL; rest.z += (r(2) - 0.5) * 0.1 * CELL; // lệch nhỏ để mảnh ô kề nhau không đè lên nhau
    const mat = (tex: THREE.Texture, color: number, add: boolean, op = 1) => new THREE.SpriteMaterial({ map: tex, color, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false, fog: !add, opacity: op });
    const smoke = [0, 1, 2].map(() => new THREE.Sprite(mat(this.fx.tex('smoke'), 0x1a1a1c, false, 0.6)));
    this.group.add(holder, ...smoke);
    const p: Piece = {
      key, owner, cell: { x: c.x, y: c.y }, kind, holder, body, float: named('float_line'), smokePt: named('smoke_point'),
      rest, yaw: r(3) * Math.PI * 2, tiltX: (10 + r(4) * 25) * Math.PI / 180 * (r(5) < 0.5 ? -1 : 1), tiltZ: (10 + r(6) * 25) * Math.PI / 180 * (r(8) < 0.5 ? -1 : 1),
      phase: r(9) * 6.28, drift: new THREE.Vector2((r(10) - 0.5) * 0.1, (r(11) - 0.5) * 0.1),
      state: toss ? 'toss' : 'float', t0: t, born: t, smoky: true, stay: false,
      apex: (15 + r(12) * 10) * k, spin: (1 + r(13)) * Math.PI * 2, from: center.clone(),
      smoke,
    };
    holder.position.copy(rest);
    this.pieces.set(key, p);
  }

  private remove(p: Piece) {
    this.group.remove(p.holder, ...p.smoke);
    this.pieces.delete(p.key);
  }

  /** Giới hạn: tối đa 25 mảnh, 16 ngọn lửa, 12 cột khói; mảnh cũ nhất hạ lửa/khói trước. */
  private limit() {
    const all = [...this.pieces.values()].sort((a, b) => a.born - b.born);
    while (all.length > MAX_PIECES) this.remove(all.shift()!);
    const sm = all.filter((p) => p.smoky);
    for (const p of sm.slice(0, Math.max(0, sm.length - MAX_SMOKE))) p.smoky = false;
  }

  /** Tàu bị hạ: tàu hiện tại chỗ (cháy nổ) nên xóa hết mảnh vỡ của các ô tàu đó (khỏi đè lên model tàu), chặn tạo lại mảnh ở các ô ấy. */
  absorb(owner: Owner, cells: Cell[], _center: THREE.Vector3, _t: number, _speed: number) {
    for (const c of cells) {
      const k = `${owner}:${c.x},${c.y}`;
      this.blocked.add(k);
      const p = this.pieces.get(k);
      if (p) { this.fx.burst({ pos: p.holder.position.clone(), tex: 'smoke', size: [0.3, 0.8], life: [0.5, 0.9], opacity: 0.5, color: 0x222222, count: 4, spread: 0.3 }); this.remove(p); }
    }
  }

  update(_dt: number, t: number) {
    const k = CELL / 10, wind = Math.tan((12 * Math.PI) / 180);
    for (const p of [...this.pieces.values()]) {
      const h = p.holder;
      if (p.state === 'toss') {
        const u = (t - p.t0) / 0.9;
        if (u >= 1) { this.fx.splash(p.rest.clone().setY(this.heightAt(p.rest.x, p.rest.z, t)), true); p.state = 'rise'; p.t0 = t; }
        else {
          const from = p.from!, pos = from.clone().lerp(p.rest, u); pos.y = this.heightAt(pos.x, pos.z, t) + p.apex * 4 * u * (1 - u);
          h.position.copy(pos); h.rotation.set(p.tiltX * u, p.yaw + p.spin * u, p.tiltZ * u, 'YXZ');
          this.fx.burst({ pos: pos.clone(), tex: 'smoke', size: [0.3, 0.9], life: [0.5, 0.9], opacity: 0.45, color: 0x222222 });
        }
      }
      if (p.state === 'rise' || p.state === 'float' || p.state === 'sink') {
        let x = p.rest.x + p.drift.x * CELL * 0.5 * Math.min(1, (t - p.born) / 30) * Math.sin(t * 0.1 + p.phase), z = p.rest.z + p.drift.y * CELL * 0.5 * Math.min(1, (t - p.born) / 30) * Math.cos(t * 0.08 + p.phase);
        let y = this.heightAt(x, z, t) + 0.3 * k * Math.sin(t * 1.3 + p.phase);
        if (p.state === 'rise') { const r = Math.min(1, (t - p.t0) / 0.6); y -= (1 - r) * 4 * k; if (r >= 1) p.state = 'float'; }
        if (p.state === 'sink') {
          const u = Math.min(1, Math.max(0, (t - p.sinkT0!) / (p.sinkT1! - p.sinkT0!)));
          x = THREE.MathUtils.lerp(p.sinkFrom!.x, p.sinkTo!.x, u); z = THREE.MathUtils.lerp(p.sinkFrom!.z, p.sinkTo!.z, u); y -= u * 14 * k;
          if (u >= 1) { this.remove(p); continue; }
        }
        h.position.set(x, y, z);
        h.rotation.set(p.tiltX + 0.05 * Math.sin(t * 1.1 + p.phase), p.yaw, p.tiltZ + 0.05 * Math.cos(t * 0.9 + p.phase), 'YXZ');
      }
      this.effects(p, t, k, wind);
    }
  }

  private effects(p: Piece, t: number, k: number, wind: number) {
    p.holder.updateWorldMatrix(true, true);
    const at = (o: THREE.Object3D | null) => (o ? o.getWorldPosition(new THREE.Vector3()) : p.holder.position.clone().add(new THREE.Vector3(0, 3 * k, 0)));
    const sp = p.smoky && !this.low && p.state !== 'toss';
    const sm = at(p.smokePt);
    p.smoke.forEach((s, i) => {
      s.visible = sp;
      if (!sp) return;
      const life = ((t * 0.12 + i / 3 + p.phase) % 1), rise = life * 40 * k;
      s.position.set(sm.x + rise * wind, sm.y + rise, sm.z); const sc = (3 + 5 * life) * k; s.scale.set(sc, sc, 1);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.6;
    });
  }

  clear() { for (const p of [...this.pieces.values()]) this.remove(p); this.blocked.clear(); this.primed = false; }
}


/**
 * Xác tàu bị hạ (design/sinking.md 2.8): model `wreck_<id>` ở lại đến hết ván; không còn lửa (trông giả), thay bằng các cột khói đen cao
 * bốc từ từng neo `smoke_point_*` của xác (không có neo thì từ `fire_N`), mỏng dần sau 20–60 s, trôi theo gió.
 */
export class ShipWreckFx {
  private cols: { pt: THREE.Object3D; smoke: THREE.Sprite[]; phase: number }[] = [];
  private t0: number;
  readonly group = new THREE.Group();
  constructor(private rig: THREE.Object3D, fx: Fx, t: number, low = false) {
    const root: THREE.Object3D = rig.userData.wreckRoot ?? rig, pts: THREE.Object3D[] = [];
    root.traverse((o) => { if (/^smoke_point_/.test(o.name)) pts.push(o); });
    if (!pts.length) root.traverse((o) => { if (/^fire_\d+$/.test(o.name)) pts.push(o); });
    for (const pt of pts.slice(0, 4)) {
      const smoke = Array.from({ length: low ? 3 : 7 }, () => new THREE.Sprite(new THREE.SpriteMaterial({ map: fx.tex('smoke'), color: 0x868b92, transparent: true, depthWrite: false, fog: false, opacity: 0.6 })));
      this.group.add(...smoke);
      this.cols.push({ pt, smoke, phase: Math.random() * 6.28 });
    }
    this.t0 = t;
  }
  update(t: number) {
    const k = CELL / 10, wind = Math.tan((12 * Math.PI) / 180), age = t - this.t0;
    const thin = 1 - 0.55 * Math.min(1, Math.max(0, (age - 20) / 40)); // sau 20 s mỏng dần, còn 45% sau 60 s
    this.rig.updateWorldMatrix(true, true);
    for (const c of this.cols) {
      const p = c.pt.getWorldPosition(new THREE.Vector3()), n = c.smoke.length;
      c.smoke.forEach((s, i) => {
        const life = (t * 0.1 + i / n + c.phase) % 1, rise = life * 60 * k;
        s.position.set(p.x + rise * wind + Math.sin(life * 5 + i) * 1.5 * k * life, p.y + rise, p.z + Math.cos(life * 4 + c.phase) * 1.5 * k * life);
        const sc = (5 + 16 * life) * k; s.scale.set(sc, sc, 1);
        (s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) ** 0.7 * 1.0 * thin;
      });
    }
  }
  dispose() { this.group.parent?.remove(this.group); }
}
