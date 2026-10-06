import * as THREE from 'three';
import type { Cell, ShipId } from '../../design/core-api';
import type { Fx } from './fx3d';
import { debrisModel, type DebrisId } from './shipGlb';
import { CELL } from './scale';
import { glareK } from './glare';

/**
 * Ô trúng ở 3D = mảnh xác tàu nổi (design/wreckage.md mục 1). Mỗi ô trúng một trong 10 mảnh glb: bị hất lên theo cung 900 ms, rơi xuống,
 * nổi và nhấp nhô, cháy (`fx_fire`), cột khói cao 40, vòng sáng lan trên mặt nước, than hồng, chùm tia lửa. Mảnh chung (6) cho mọi ô để không lộ
 * loại tàu địch; mảnh riêng (cánh, VLS, tháp tàu ngầm, vòm radar) chỉ cho tàu của mình. Khi tàu chìm (`absorb`), mảnh trong ô trôi về thân tàu và chìm
 * cùng từ 4.5 s tới 9 s (thời gian cảnh chìm), riêng 2 mảnh ở lại nổi (tắt lửa sau 6 s).
 */
export interface HitCell extends Cell { ship?: ShipId }
type Owner = 'own' | 'enemy';

const COMMON: DebrisId[] = ['plate', 'mast', 'turret', 'hullchunk', 'cargo', 'funnel'];
const SPECIAL: Partial<Record<ShipId, DebrisId>> = { carrier: 'wing', missile: 'vls', submarine: 'sail', escort: 'radome' };
const MAX_PIECES = 25, MAX_FIRES = 16, MAX_SMOKE = 12;
const hash = (a: number, b: number, c: number) => { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967295; };

interface Piece {
  key: string; owner: Owner; cell: Cell; kind: DebrisId;
  holder: THREE.Group; body: THREE.Object3D;
  float: THREE.Object3D | null; firePt: THREE.Object3D | null; smokePt: THREE.Object3D | null;
  rest: THREE.Vector3; yaw: number; tiltX: number; tiltZ: number; phase: number; drift: THREE.Vector2;
  state: 'toss' | 'rise' | 'float' | 'sink' | 'gone';
  t0: number; born: number; hot: boolean; smoky: boolean; stay: boolean; coolAt: number;
  from?: THREE.Vector3; apex: number; spin: number;
  sinkFrom?: THREE.Vector3; sinkT0?: number; sinkT1?: number; sinkTo?: THREE.Vector3;
  fire: THREE.Sprite; glow: THREE.Sprite; smoke: THREE.Sprite[]; ring: THREE.Mesh; nextSpark: number; ringT: number;
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
    body.scale.setScalar(CELL * 1.8); // cỡ nhìn rõ từ camera trận (wreckage.md 1.2: rộng ≥ 28 px ở camera trận (đo ảnh: ×1.2 quá nhỏ); đòn nặng ×1.4 chưa phân biệt)
    holder.add(body);
    const named = (n: string) => { let f: THREE.Object3D | null = null; body.traverse((o) => { if (!f && o.name === n) f = o; }); return f; };
    const center = this.cellWorld(owner, c);
    let rest = center.clone();
    if (owner === 'own' && c.ship) { // tàu mình: đặt bên mạn, ngoài thân, trong phạm vi ô
      const h = this.heading(c.ship) ?? 0, side = hash(c.x, c.y, this.seed + 7) < 0.5 ? -1 : 1;
      rest.x += Math.cos(h) * side * Math.min(5.5 * k, 0.4 * CELL); rest.z += -Math.sin(h) * side * Math.min(5.5 * k, 0.4 * CELL);
    }
    const r = (n: number) => hash(c.x, c.y, this.seed + n);
    rest.x += (r(1) - 0.5) * 0.2 * CELL; rest.z += (r(2) - 0.5) * 0.2 * CELL;
    const mat = (tex: THREE.Texture, color: number, add: boolean, op = 1) => new THREE.SpriteMaterial({ map: tex, color, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false, fog: !add, opacity: op });
    const fire = new THREE.Sprite(mat(this.fx.tex('fire'), 0xffffff, true));
    const glow = new THREE.Sprite(mat(this.fx.tex('glow'), 0xff6a20, true, 0.4));
    const smoke = [0, 1, 2].map(() => new THREE.Sprite(mat(this.fx.tex('smoke'), 0x1a1a1c, false, 0.6)));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, depthWrite: false, depthTest: false, fog: false, side: THREE.DoubleSide, opacity: 0 }));
    ring.renderOrder = 5;
    this.group.add(holder, fire, glow, ...smoke, ring);
    const p: Piece = {
      key, owner, cell: { x: c.x, y: c.y }, kind, holder, body, float: named('float_line'), firePt: named('fire_point'), smokePt: named('smoke_point'),
      rest, yaw: r(3) * Math.PI * 2, tiltX: (10 + r(4) * 25) * Math.PI / 180 * (r(5) < 0.5 ? -1 : 1), tiltZ: (10 + r(6) * 25) * Math.PI / 180 * (r(8) < 0.5 ? -1 : 1),
      phase: r(9) * 6.28, drift: new THREE.Vector2((r(10) - 0.5) * 0.2, (r(11) - 0.5) * 0.2),
      state: toss ? 'toss' : 'float', t0: t, born: t, hot: true, smoky: true, stay: false, coolAt: Infinity,
      apex: (15 + r(12) * 10) * k, spin: (1 + r(13)) * Math.PI * 2, from: center.clone(),
      fire, glow, smoke, ring, nextSpark: t + 2 + r(14) * 2, ringT: r(15) * 1.6,
    };
    holder.position.copy(rest);
    this.pieces.set(key, p);
  }

  private remove(p: Piece) {
    this.group.remove(p.holder, p.fire, p.glow, ...p.smoke, p.ring);
    p.ring.geometry.dispose();
    this.pieces.delete(p.key);
  }

  /** Giới hạn: tối đa 25 mảnh, 16 ngọn lửa, 12 cột khói; mảnh cũ nhất hạ lửa/khói trước. */
  private limit() {
    const all = [...this.pieces.values()].sort((a, b) => a.born - b.born);
    while (all.length > MAX_PIECES) this.remove(all.shift()!);
    const hot = all.filter((p) => p.hot);
    for (const p of hot.slice(0, Math.max(0, hot.length - MAX_FIRES))) { p.hot = false; p.smoky = false; }
    const sm = all.filter((p) => p.smoky);
    for (const p of sm.slice(0, Math.max(0, sm.length - MAX_SMOKE))) p.smoky = false;
  }

  /** Tàu chìm: mảnh trong các ô của nó chìm cùng (4.5–9 s hoạt cảnh), 2 mảnh ở lại nổi; chặn tạo lại mảnh ở các ô đó. */
  absorb(owner: Owner, cells: Cell[], center: THREE.Vector3, t: number, speed: number) {
    const keys = new Set(cells.map((c) => `${owner}:${c.x},${c.y}`));
    for (const k of keys) this.blocked.add(k);
    const mine = [...this.pieces.values()].filter((p) => keys.has(p.key));
    const keep = new Set(mine.sort((a, b) => hash(a.cell.x, a.cell.y, this.seed + 21) - hash(b.cell.x, b.cell.y, this.seed + 21)).slice(0, 2));
    for (const p of mine) {
      if (keep.has(p)) { p.stay = true; p.coolAt = t + 6 / speed; continue; }
      p.state = 'sink'; p.sinkT0 = t + 4.5 / speed; p.sinkT1 = t + 9 / speed; p.sinkFrom = p.holder.position.clone(); p.sinkTo = center.clone().setY(0);
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
          this.fx.burst({ pos: pos.clone(), tex: 'fire', size: [0.5, 0.1], life: [0.1, 0.2], additive: true, opacity: 0.8, color: 0xff8a2a }); // vệt lửa và khói sau mảnh (kích thước tính theo ô)
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
          p.hot = u < 0.4 ? p.hot : false;
          if (u >= 1) { this.remove(p); continue; }
        }
        h.position.set(x, y, z);
        h.rotation.set(p.tiltX + 0.05 * Math.sin(t * 1.1 + p.phase), p.yaw, p.tiltZ + 0.05 * Math.cos(t * 0.9 + p.phase), 'YXZ');
      }
      if (t >= p.coolAt) { p.hot = false; p.smoky = false; }
      this.effects(p, t, k, wind);
    }
  }

  private effects(p: Piece, t: number, k: number, wind: number) {
    p.holder.updateWorldMatrix(true, true);
    const at = (o: THREE.Object3D | null) => (o ? o.getWorldPosition(new THREE.Vector3()) : p.holder.position.clone().add(new THREE.Vector3(0, 3 * k, 0)));
    const water = this.heightAt(p.holder.position.x, p.holder.position.z, t);
    const on = p.hot && p.state !== 'toss';
    const fp = at(p.firePt);
    const flick = 0.85 + 0.15 * Math.sin(t * 50 + p.phase * 7); // nhấp nháy 8 Hz
    p.fire.visible = on; p.glow.visible = on;
    if (on) {
      const hgt = (8 + 4 * ((p.phase / 6.28) % 1)) * k * flick;
      p.fire.position.copy(fp).y += hgt * 0.4; p.fire.scale.set(hgt * 0.7, hgt, 1);
      p.glow.position.copy(fp); p.glow.scale.setScalar(14 * k); (p.glow.material as THREE.SpriteMaterial).opacity = 0.4 * glareK() * flick;
      if (Math.random() < 0.33) this.fx.burst({ pos: fp.clone(), vel: new THREE.Vector3(0, 0.45, 0), count: 1, tex: 'spark', size: [0.12, 0.03], life: [0.8, 1.6], additive: true, color: 0xff9a40, spread: 0.12 }); // than hồng ~20/s, bay lên 3–6 ĐV/s
    }
    const sp = p.smoky && !this.low && p.state !== 'toss';
    const sm = at(p.smokePt);
    p.smoke.forEach((s, i) => {
      s.visible = sp;
      if (!sp) return;
      const life = ((t * 0.12 + i / 3 + p.phase) % 1), rise = life * 40 * k;
      s.position.set(sm.x + rise * wind, sm.y + rise, sm.z); const sc = (3 + 5 * life) * k; s.scale.set(sc, sc, 1);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.6;
    });
    // vòng sáng lan trên mặt nước mỗi 1.6 s (bán kính 6 → 12, độ mờ 0.35 → 0)
    p.ring.visible = on && !this.low;
    if (p.ring.visible) {
      p.ringT = (p.ringT + 1 / 60) % 1.6; const u = p.ringT / 1.6;
      p.ring.position.set(p.holder.position.x, water + 0.1 * k, p.holder.position.z); p.ring.scale.setScalar((6 + 6 * u) * k);
      (p.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - u) * glareK();
    }
    if (on && !this.low && t >= p.nextSpark) { // chùm tia lửa từ mép nóng
      p.nextSpark = t + 2 + Math.random() * 2;
      this.fx.burst({ pos: fp.clone(), vel: new THREE.Vector3(0, 0.6, 0), count: 20, tex: 'spark', size: [0.12, 0.03], life: [0.5, 1.0], additive: true, spread: 0.7, grav: 0.8, color: 0xffb060 });
    }
  }

  clear() { for (const p of [...this.pieces.values()]) this.remove(p); this.blocked.clear(); this.primed = false; }
}


/**
 * Xác tàu đắm nửa chìm sau khi bắn hạ (người dùng: bắn hạ mới hiện model tàu đắm một nửa, cháy nổ): model giữ tư thế cuối của hoạt cảnh chìm,
 * cháy ở các neo `fire_N`, khói đen cao, nổ thứ phát ngẫu nhiên 3–6 s một lần, ở lại đến hết ván.
 */
export class ShipWreckFx {
  private fires: { pt: THREE.Object3D; fire: THREE.Sprite; glow: THREE.Sprite; smoke: THREE.Sprite[]; phase: number }[] = [];
  private nextBoom: number;
  readonly group = new THREE.Group();
  constructor(private rig: THREE.Object3D, private fx: Fx, t: number, private low = false) {
    const pts: THREE.Object3D[] = [];
    rig.traverse((o) => { if (/^fire_\d+$/.test(o.name)) pts.push(o); });
    const mat = (tex: THREE.Texture, color: number, add: boolean, op = 1) => new THREE.SpriteMaterial({ map: tex, color, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false, fog: !add, opacity: op });
    for (const pt of pts.slice(0, 4)) {
      const fire = new THREE.Sprite(mat(fx.tex('fire'), 0xffffff, true));
      const glow = new THREE.Sprite(mat(fx.tex('glow'), 0xff6a20, true, 0.4));
      const smoke = [0, 1, 2].map(() => new THREE.Sprite(mat(fx.tex('smoke'), 0x1a1a1c, false, 0.6)));
      this.group.add(fire, glow, ...smoke);
      this.fires.push({ pt, fire, glow, smoke, phase: Math.random() * 6.28 });
    }
    this.nextBoom = t + 2 + Math.random() * 3;
  }
  update(t: number) {
    const k = CELL / 10, wind = Math.tan((12 * Math.PI) / 180);
    this.rig.updateWorldMatrix(true, true);
    for (const f of this.fires) {
      const p = f.pt.getWorldPosition(new THREE.Vector3());
      const flick = 0.85 + 0.15 * Math.sin(t * 50 + f.phase * 7), hgt = 12 * k * flick;
      f.fire.position.copy(p).y += hgt * 0.4; f.fire.scale.set(hgt * 0.7, hgt, 1);
      f.glow.position.copy(p); f.glow.scale.setScalar(18 * k); (f.glow.material as THREE.SpriteMaterial).opacity = 0.4 * glareK() * flick;
      f.smoke.forEach((s, i) => {
        s.visible = !this.low;
        const life = (t * 0.12 + i / 3 + f.phase) % 1, rise = life * 40 * k;
        s.position.set(p.x + rise * wind, p.y + rise, p.z); const sc = (4 + 6 * life) * k; s.scale.set(sc, sc, 1);
        (s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.6;
      });
    }
    if (t >= this.nextBoom && this.fires.length) { // nổ thứ phát lẻ tẻ
      this.nextBoom = t + 3 + Math.random() * 3;
      const f = this.fires[Math.floor(Math.random() * this.fires.length)];
      this.fx.hit(f.pt.getWorldPosition(new THREE.Vector3()), false);
    }
  }
  dispose() { this.group.parent?.remove(this.group); }
}
