import * as THREE from 'three';
import type { Cell, GameEvent, PlayerId, ShipId } from '../../design/core-api';
import type { Fx } from './fx3d';
import type { ShipRig } from './shipModels';
import { CELL as K, HEIGHT, shipLift } from './scale';
import { glare } from './glare';
import { type CamPose, Frame, V, deg, key, lerp, lerpV, prog, smooth, wp } from './cineUtil';
import { buildRapid, buildPrecision, buildCross, buildTorpedo } from './cineStrikes';
import { buildLine3 } from './cineCarrier';
import { buildBarrage } from './cineBarrage';
import { buildSneak, buildGuard } from './cinePassive';
import { planSink, SINK_BLOCK_MS, SINK_BLOCK_BG_MS, SINK_TOTAL_MS } from './cineSink';

export type { CamPose } from './cineUtil';
export type ZoneOwner = 'own' | 'enemy';

/**
 * Cinematic theo design/cinematics.md (shot list 5 đòn, 2 kỹ năng nội tại) và design/sinking.md (cảnh chìm).
 * Cinematic chỉ nhận danh sách event + tọa độ ô, không đọc trạng thái core.
 *
 * Mọi mốc thời gian khi dựng kế hoạch ghi theo thời gian "chưa chèn" (đúng bảng thiết kế). Khi hộ vệ kích hoạt,
 * cảnh phát hiện + chế áp (2250 ms) được chèn vào mốc `gs`: `sh()` đổi mốc thiết kế sang mốc thật, `un()` đổi ngược;
 * các vật bay giữa chừng giữ nguyên vị trí trong lúc chèn.
 */
export interface CineHost {
  fx: Fx;
  scene: THREE.Scene;
  heightAt(x: number, z: number, t: number): number;
  rig(owner: ZoneOwner, id: ShipId): ShipRig | undefined;
  /** Tàu bắn của địch: đặt ở chỗ cố định sau lưới địch (không lộ vị trí thật). */
  decoy(id: ShipId): ShipRig;
  /** Tàu địch đã chìm lộ vị trí: dựng tạm để chìm. */
  wreckRig(owner: ZoneOwner, id: ShipId, origin: Cell, orientation: 'h' | 'v'): ShipRig;
  /** Gỡ các tàu dựng tạm (tàu giả, tàu xác) do một cinematic tạo ra. */
  releaseTemp(rigs: ShipRig[]): void;
  /** Đồng bộ lại tàu/lửa sau khi cinematic cuối cùng (kể cả cảnh chìm chạy nền) xong. */
  settle(): void;
  /** Nhận một cảnh chìm còn chạy tiếp sau khi cinematic chính đã trả quyền camera (chạy nền / đuôi chìm nốt). */
  adopt(c: Cinematic): void;
  /** Tàu chìm xong để lại xác nửa chìm cháy nổ ở lại đến hết ván: host nhận lại rig (không dọn). */
  leaveWreck(rig: ShipRig, owner: ZoneOwner): void;
  /** Mảnh xác trong các ô của tàu chìm trôi về thân tàu và chìm cùng (wreckage.md 2). */
  wreckSink(owner: ZoneOwner, cells: Cell[], center: THREE.Vector3, speed: number): void;
  cellWorld(owner: ZoneOwner, cell: Cell): THREE.Vector3;
  tactical(): CamPose;
  shake(amplitude: number): void;
  setUnderwater(on: boolean): void;
  /** Khung điện ảnh: dải đen trên và dưới, 0 = ẩn, 1 = đủ 2.39:1. */
  bars(k: number): void;
  now(): number;
}

export interface CineOpts {
  viewer: PlayerId;
  speed: number; // 1 hoặc 2 (x2 chia đôi các mốc); số khác chỉ dùng khi kiểm thử hình ảnh
  short: boolean;
  shake: boolean;
  reduced: boolean;
  /** Khung điện ảnh cho cinematic tàu sân bay (mặc định bật). */
  bars?: boolean;
  /** "Tàu chìm chạy nền": sau 3600 ms của cảnh chìm trả quyền chơi tiếp, cảnh chìm chạy nền. */
  sinkBg?: boolean;
  onEvent(e: GameEvent): void;
}

/** Ngữ cảnh một đòn đánh, dùng chung cho các module dựng cảnh. */
export interface Ctx {
  shot: Extract<GameEvent, { type: 'ShotFired' }>;
  results: Map<string, Extract<GameEvent, { type: 'CellResolved' }>>;
  shooterOwner: ZoneOwner; target: ZoneOwner;
  cw: (c: Cell) => THREE.Vector3; cellsW: THREE.Vector3[]; C: THREE.Vector3;
  rig: ShipRig; frameNow: () => Frame; T: Frame; dir: THREE.Vector3;
  /** Ô bị hộ vệ triệt tiêu và thời lượng cảnh hộ vệ chèn G (ms, 0 = không chèn); mốc chèn `gs` do từng đòn đặt qua `setGuard`. */
  nullified: Set<string>; G: number; gs: number;
  /** Mốc chạm (đã tính chèn) để hiện kết quả ô, lộ tàu, chìm. */
  mark(t: number): void;
}

interface Range { t0: number; t1: number; fn: (u: number) => void; ended: boolean }
interface Call { t: number; fn: () => void; done: boolean; real?: boolean }
interface Shot { t0: number; t1: number; fn: (t: number) => CamPose; blend: number; layer: number; real: boolean }
export type ProjStyle = 'shell' | 'missile' | 'torpedo' | 'bomb' | 'sneak';

/** Chiều dài thân vật bắn theo `env-and-fx.md` mục 7 (đơn vị ô); cảnh rộng phóng đại ×2.5, cảnh cận ×1.2 (`cinematics.md` mục 1). */
const PROJ_LEN: Record<ProjStyle, number> = { shell: 0.08, missile: 0.12, torpedo: 0.15, bomb: 0.12, sneak: 0.05 };
const HERO_WIDE = 2.5, HERO_CLOSE = 1.2;
/** Bản rút gọn 4000 ms của cảnh chìm 10800 ms. */
const SINK_FAST = 10800 / 4000;

let projGeo: THREE.BufferGeometry | undefined;
const projGeometry = () => (projGeo ??= (() => {
  const body = new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8).rotateX(Math.PI / 2);
  const nose = new THREE.ConeGeometry(0.07, 0.2, 8).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const parts = [body, nose].map((g) => g.toNonIndexed());
  const pos: number[] = [], nor: number[] = [];
  for (const g of parts) { pos.push(...(g.attributes.position.array as Float32Array)); nor.push(...(g.attributes.normal.array as Float32Array)); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
})());

export class Cinematic {
  active = false;
  /** Cảnh chìm đã được giao cho host chạy nền. */
  bg = false;
  private child = false;
  private o!: CineOpts;
  private clock = 0;
  endU = 0;
  /** Mốc bắt đầu cảnh chìm (mốc thiết kế, trước khi tính chèn hộ vệ); Infinity = không có. */
  private sinkAt = Infinity;
  private sinkEvents: Extract<GameEvent, { type: 'ShipSunk' }>[] = [];
  private sink: Cinematic | null = null;
  private phase: 'run' | 'exit' | 'skip' = 'run';
  private exitT = 0;
  private skipT = 0;
  private lastPose: CamPose | null = null;
  private enterFrom: CamPose | null = null;
  private calls: Call[] = [];
  private ranges: Range[] = [];
  private shots: Shot[] = [];
  private slows: { t0: number; t1: number; s: number }[] = [];
  private emits: { t: number; real: boolean; ev: GameEvent; done: boolean }[] = [];
  private closeUps: { t0: number; t1: number }[] = [];
  private resolve?: () => void;
  private temp: THREE.Object3D[] = [];
  private ownTemps: ShipRig[] = [];
  private touched = new Set<ShipRig>();
  private hidden: THREE.Object3D[] = [];                          // bộ phận đã ẩn để bay rời: hiện lại khi dọn
  private snaps = new Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }>(); // bộ phận đã di chuyển/xoay: trả về cũ
  private mats: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
  private gs = Infinity;
  private G = 0;
  private shakeT = 0;

  constructor(private h: CineHost) {}

  get host() { return this.h; }
  get opts() { return this.o; }
  get time() { return this.clock; }
  /** Tư thế camera gần nhất đã phát (cho hiệu ứng gắn với ống kính). */
  get lastCam() { return this.lastPose; }
  get sinking() { return !!this.sink?.active || (this.child && this.active); }

  // ---------- điều khiển ----------
  play(events: GameEvent[], o: CineOpts): Promise<void> {
    this.o = o;
    this.reset();
    this.active = true;
    this.build(events);
    this.emits.sort((a, b) => a.t - b.t);
    return new Promise((res) => { this.resolve = res; });
  }

  /** Cảnh chìm bản rút gọn (4000 ms thay vì 10800) chạy ở nền, không chặn lượt: khi tắt cinematic hoặc dùng cinematic ngắn (wreckage.md 2.1). */
  static backgroundSink(h: CineHost, sunk: Extract<GameEvent, { type: 'ShipSunk' }>[], o: CineOpts) {
    const c = new Cinematic(h);
    c.playSink(sunk, { ...o, speed: o.speed * SINK_FAST }, null);
    c.bg = true;
    h.adopt(c);
  }

  /** Cảnh chìm tách riêng (cinematic con): chạy 16800 ms (10800 chặn + 6000 đuôi), cinematic cha cho camera trong phần chặn. */
  private playSink(sunk: Extract<GameEvent, { type: 'ShipSunk' }>[], o: CineOpts, from: CamPose | null) {
    this.o = o; this.child = true;
    this.reset();
    this.active = true;
    this.enterFrom = from;
    planSink(this, sunk);
    this.endU = SINK_TOTAL_MS;
  }

  /** Bỏ qua. Đang bắn: nhảy tới đầu cảnh chìm (nếu có) hoặc kết thúc; đang chìm: tàu biến mất nhanh 450 ms (sinking.md 2.1). */
  skip() {
    if (!this.active) return;
    if (this.child) { this.skipSink(); return; }
    if (this.phase !== 'run') return;
    if (this.sink?.active) { // đang trong cảnh chìm
      this.sink.skipSink();
      this.exitNow();
      this.phase = 'skip'; // camera về tactical trong 150 ms
      return;
    }
    for (const e of this.emits) if (!e.done) { e.done = true; this.o.onEvent(e.ev); }
    if (this.sinkEvents.length && !this.o.short) { // bỏ qua cảnh bắn, vào thẳng cảnh chìm
      this.cleanupStrike();
      for (const c of this.calls) c.done = true;
      for (const r of this.ranges) r.ended = true;
      this.clock = this.sh(this.sinkAt);
      return;
    }
    this.cleanup();
    this.phase = 'skip';
    this.exitT = 0;
  }

  /** Cảnh chìm: rút ngắn còn 450 ms rồi dọn. */
  private skipSink() {
    if (!this.active || this.phase === 'skip') return;
    this.phase = 'skip'; this.skipT = 0;
    for (const r of this.ranges) r.ended = true;
    for (const c of this.calls) c.done = true;
  }
  private wrecks: { rig: ShipRig; id: ShipId; owner: ZoneOwner; side: number; show: (u: number) => void; k?: number; k0?: number }[] = [];
  /** Đăng ký tàu ở lại làm xác khi cảnh bắn hạ kết thúc; `show(u)` hoán đổi sang model xác và dịch các mảnh từ pose 0 (u = 0) tới pose cuối (u = 1). */
  registerWreck(rig: ShipRig, id: ShipId, owner: ZoneOwner, side: number, show: (u: number) => void) {
    const w = { rig, id, owner, side, show: (u: number) => { w.k = u; show(u); } } as (typeof this.wrecks)[number];
    this.wrecks.push(w);
  }

  private reset() {
    this.clock = 0; this.endU = 0; this.phase = 'run'; this.exitT = 0; this.skipT = 0; this.lastPose = null; this.enterFrom = null;
    this.calls = []; this.ranges = []; this.realRanges = []; this.shots = []; this.slows = []; this.emits = []; this.closeUps = [];
    this.gs = Infinity; this.G = 0; this.sinkAt = Infinity; this.sinkEvents = []; this.sink = null; this.bg = false; this.wrecks = [];
  }

  /** Dọn phần cảnh bắn (tàu giả, vật bay, hiệu ứng thoáng qua) nhưng giữ cảnh chìm. */
  private cleanupStrike() {
    this.h.fx.clearTransient();
    this.h.setUnderwater(false);
    this.h.bars(0);
    for (const t of this.temp) t.parent?.remove(t);
    this.temp = [];
    for (const r of this.touched) this.restore(r);
    this.touched.clear();
    this.restoreParts();
  }

  private restoreParts() {
    const kept = (o: THREE.Object3D) => { for (const w of this.wrecks) { let p: THREE.Object3D | null = o; while (p) { if (p === w.rig) return true; p = p.parent; } } return false; };
    for (const o of this.hidden) if (!kept(o)) o.visible = true; // bộ phận đã nổ tung của tàu để lại xác vẫn ẩn
    this.hidden = [];
    for (const [o, s] of this.snaps) { if (kept(o)) continue; o.position.copy(s.p); o.quaternion.copy(s.q); o.scale.copy(s.s); }
    this.snaps.clear();
    for (const [m, mat] of this.mats) m.material = mat;
    this.mats = [];
  }

  private cleanup() {
    if (this.child) for (const w of this.wrecks) { // để lại xác: không restore/gỡ rig này
      w.show(1); this.touched.delete(w.rig); this.ownTemps = this.ownTemps.filter((r) => r !== w.rig);
      this.h.leaveWreck(w.rig, w.owner);
    }
    if (!this.child) this.h.fx.clearTransient();
    this.h.setUnderwater(false);
    if (!this.child) { this.h.bars(0); }
    for (const t of this.temp) t.parent?.remove(t);
    this.temp = [];
    for (const r of this.touched) this.restore(r);
    this.touched.clear();
    this.restoreParts();
    this.h.releaseTemp(this.ownTemps);
    this.ownTemps = [];
    this.h.settle();
  }

  private restore(r: ShipRig) {
    const p = r.userData.parts;
    for (const t of p.turrets) { t.yaw.rotation.y = 0; t.pitch.rotation.x = 0; t.recoil.position.z = 0; }
    for (const l of p.launchers) { l.base.visible = false; l.pitch.rotation.x = 0; l.base.position.y = l.base.userData.y0 ?? 0; }
    for (const f of p.flaps) f.rotation.x = 0;
    for (const pl of p.planes) pl.visible = true;
    r.userData.kick.roll = 0; r.userData.kick.pitch = 0; r.userData.yOffset = 0;
    r.visible = true;
  }

  // ---------- chạy ----------
  /** Cảnh chìm chạy nền do host cập nhật mỗi khung hình. Trả true khi đã xong. */
  updateBg(dt: number): boolean {
    this.update(dt);
    return !this.active;
  }

  /** Trả tư thế camera ghi đè (null nếu không đang chiếu). `dt` tính bằng giây thực. */
  update(dt: number): CamPose | null {
    if (!this.active) return null;
    const speed = this.o.speed;
    let sinkPose: CamPose | null = null;
    if (this.phase === 'run') {
      const un = this.un(this.clock);
      const slow = this.slows.find((s) => un >= s.t0 && un < s.t1)?.s ?? 1;
      const dtMs = dt * 1000 * speed * (this.o.reduced ? 1 : slow);
      this.clock += dtMs;
      this.shakeT += dtMs;
      for (const c of this.calls) if (!c.done && (c.real ? c.t : this.sh(c.t)) <= this.clock) { c.done = true; c.fn(); }
      for (const e of this.emits) if (!e.done && (e.real ? e.t : this.sh(e.t)) <= this.clock) { e.done = true; this.o.onEvent(e.ev); }
      const un2 = this.un(this.clock);
      for (const r of this.ranges) {
        if (r.ended || this.clock < this.sh(r.t0)) continue;
        const u = prog(un2, r.t0, r.t1);
        r.fn(u);
        if (this.clock >= this.sh(r.t1)) { if (u < 1) r.fn(1); r.ended = true; }
      }
      this.runRealRanges();
      let endR = this.sh(this.endU);
      if (this.sinkEvents.length && !this.o.short) {
        const s0 = this.sh(this.sinkAt);
        if (this.clock >= s0) {
          if (!this.sink) {
            this.cleanupStrike();
            this.sink = new Cinematic(this.h);
            this.sink.playSink(this.sinkEvents, this.o, this.lastPose);
          }
          sinkPose = this.sink.update(dt);
        }
        endR = s0 + Math.min(this.o.sinkBg ? SINK_BLOCK_BG_MS : SINK_BLOCK_MS, this.sink?.endU ?? SINK_BLOCK_MS);
      }
      if (this.clock >= endR) {
        for (const e of this.emits) if (!e.done) { e.done = true; this.o.onEvent(e.ev); }
        if (this.child) { this.finish(); return null; }
        this.exitNow();
      }
    } else if (this.phase === 'exit') this.exitT += dt * 1000 * speed;
    else if (this.phase === 'skip') {
      if (this.child) { // cảnh chìm bị bỏ qua: tàu về xác trong 450 ms
        this.skipT += dt * 1000;
        const k = smooth(this.skipT / 450);
        for (const w of this.wrecks) { w.k0 ??= w.k ?? 0; w.show(lerp(w.k0, 1, k)); } // bỏ qua: các mảnh xác về pose cuối
        if (this.skipT >= 450) { this.finish(); return null; }
        return null;
      }
      this.exitT += dt * 1000 * speed;
    }
    if (this.child) return this.pose(sinkPose);
    if (this.phase === 'exit' && this.exitT >= 750) return this.finish();
    if (this.phase === 'skip' && this.exitT >= 150) return this.finish();

    const tac = this.h.tactical();
    if (this.phase !== 'run') { // ra cảnh: về tactical 750 ms (bỏ qua: 150 ms)
      const u = smooth(this.exitT / (this.phase === 'skip' ? 150 : 750));
      const from = this.lastPose ?? tac;
      return { pos: lerpV(from.pos, tac.pos, u), look: lerpV(from.look, tac.look, u), fov: lerp(from.fov, tac.fov, u) };
    }
    const pose = sinkPose ?? this.pose(null);
    this.lastPose = pose;
    const u = smooth(this.clock / 450); // vào cảnh: blend 450 ms từ tactical
    return u >= 1 || sinkPose ? pose : { pos: lerpV(tac.pos, pose.pos, u), look: lerpV(tac.look, pose.look, u), fov: lerp(tac.fov, pose.fov, u), roll: pose.roll };
  }

  /** Tư thế camera của kế hoạch hiện tại (đã chọn shot, blend, rung tay). */
  private pose(over: CamPose | null): CamPose {
    if (over) return over;
    const c = this.clock, un = this.un(c);
    const live = this.shots.filter((s) => (s.real ? c >= s.t0 && c < s.t1 : un >= s.t0 && un < s.t1));
    let shot = live.reduce<Shot | null>((a, s) => (!a || s.layer > a.layer || (s.layer === a.layer && s.t0 >= a.t0) ? s : a), null);
    if (!shot) shot = this.shots.filter((s) => !s.real && s.layer === 0 && s.t0 <= un).sort((a, b) => b.t0 - a.t0)[0] ?? this.shots[0];
    if (!shot) return this.h.tactical();
    const t = shot.real ? c : un;
    let pose = shot.fn(t);
    if (shot.blend > 0 && shot.layer === 0 && t - shot.t0 < shot.blend) {
      const prev = this.shots.filter((s) => !s.real && s.layer === 0 && s.t0 < shot.t0).sort((a, b) => b.t0 - a.t0)[0];
      if (prev) { const p = prev.fn(t), k = smooth((t - shot.t0) / shot.blend); pose = { pos: lerpV(p.pos, pose.pos, k), look: lerpV(p.look, pose.look, k), fov: lerp(p.fov, pose.fov, k), roll: pose.roll }; }
    }
    if (this.child && this.enterFrom && this.clock < 450) { // cảnh chìm: blend 450 ms từ tư thế cuối của cảnh bắn
      const k = smooth(this.clock / 450), f = this.enterFrom;
      pose = { pos: lerpV(f.pos, pose.pos, k), look: lerpV(f.look, pose.look, k), fov: lerp(f.fov, pose.fov, k) };
    }
    return pose;
  }

  /** Rời cảnh: về tactical 750 ms. Cảnh chìm còn dang dở được giao cho host chạy tiếp. */
  private exitNow() {
    if (this.sink?.active && !this.sink.bg) { this.sink.bg = true; this.h.adopt(this.sink); }
    this.phase = 'exit'; this.exitT = 0;
    if (this.sink && !this.sink.active) this.sink = null;
    this.cleanupStrike();
  }

  private finish(): null {
    this.active = false;
    this.cleanup();
    const r = this.resolve; this.resolve = undefined;
    r?.();
    return null;
  }

  // ---------- thời gian chèn hộ vệ ----------
  /** Hộ vệ chèn `G` ms vào mốc thiết kế `gs`. */
  setGuard(gs: number, G: number) { this.gs = gs; this.G = G; }
  sh(t: number) { return t >= this.gs ? t + this.G : t; }
  un(c: number) { return c < this.gs ? c : c < this.gs + this.G ? this.gs : c - this.G; }
  /** Thời gian thật hiện tại (ms). */
  get now() { return this.clock; }

  // ---------- dựng kế hoạch: nguyên liệu (mốc thiết kế) ----------
  at(t: number, fn: () => void) { this.calls.push({ t, fn, done: false }); }
  /** Chạy tại mốc thật (cảnh hộ vệ chèn, không bị đẩy). */
  atR(t: number, fn: () => void) { this.calls.push({ t, fn, done: false, real: true }); }
  range(t0: number, t1: number, fn: (u: number) => void) { this.ranges.push({ t0, t1, fn, ended: false }); }
  /** Dải theo thời gian thật (u tính trên đồng hồ thật). */
  rangeR(r0: number, r1: number, fn: (u: number) => void) { this.realRanges.push({ t0: r0, t1: r1, fn, ended: false }); }
  private realRanges: Range[] = [];
  /** Shot camera theo mốc thiết kế. `layer` 1 = insert cận (cắt cứng ra và vào, che shot nền). */
  shot(t0: number, t1: number, fn: (t: number) => CamPose, blend = 0, layer = 0) {
    this.shots.push({ t0, t1, fn, blend, layer, real: false });
    if (layer > 0) this.closeUps.push({ t0, t1 });
    this.shots.sort((a, b) => a.t0 - b.t0);
  }
  /** Shot camera theo mốc thật (cảnh hộ vệ chèn), ưu tiên cao nhất. */
  shotR(t0: number, t1: number, fn: (t: number) => CamPose) { this.shots.push({ t0, t1, fn, blend: 0, layer: 5, real: true }); }
  slow(t0: number, t1: number, s: number) { if (!this.o.reduced) this.slows.push({ t0, t1, s }); }
  emit(t: number, ev: GameEvent) { this.emits.push({ t, real: false, ev, done: false }); }
  emitR(t: number, ev: GameEvent) { this.emits.push({ t, real: true, ev, done: false }); }
  shake(a: number) { if (this.o.shake && !this.o.reduced) this.h.shake(a); }
  wp = wp;
  add<T extends THREE.Object3D>(o: T): T { this.h.scene.add(o); this.temp.push(o); return o; }
  drop(o: THREE.Object3D) { o.parent?.remove(o); this.temp = this.temp.filter((x) => x !== o); }
  touch(r: ShipRig) { this.touched.add(r); return r; }
  decoyRig(id: ShipId) { const r = this.h.decoy(id); this.ownTemps.push(r); return r; }
  wreck(owner: ZoneOwner, id: ShipId, origin: Cell, orientation: 'h' | 'v') { const r = this.h.wreckRig(owner, id, origin, orientation); this.ownTemps.push(r); return r; }
  /** Ghi nhớ trạng thái cũ của một node để trả về khi dọn. */
  snap<T extends THREE.Object3D>(o: T): T {
    if (!this.snaps.has(o)) this.snaps.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() });
    return o;
  }
  /** Ẩn một node trong cảnh, hiện lại khi dọn. */
  hide(o: THREE.Object3D) { if (o.visible) { o.visible = false; this.hidden.push(o); } }
  /** Đổi vật liệu mesh sang bản sao riêng (không ảnh hưởng tàu cùng loại); khôi phục khi dọn. */
  ownMaterials(root: THREE.Object3D, fn?: (m: THREE.Material) => void) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      this.mats.push([m, m.material]);
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
      if (fn) (Array.isArray(m.material) ? m.material : [m.material]).forEach(fn);
    });
  }
  /** Vật bay ballistic: tách bản sao `src` khỏi tàu (gốc bị ẩn), bay theo cung, rơi xuống nước gây cột nước. `vel` thế giới/giây, `g` thế giới/giây². */
  fly(src: THREE.Object3D, vel: THREE.Vector3, g: number, spin: number, ms = 5000) {
    src.updateWorldMatrix(true, true);
    const clone = src.clone(true);
    const p = V(), q = new THREE.Quaternion(), sc = V();
    src.matrixWorld.decompose(p, q, sc);
    clone.position.copy(p); clone.quaternion.copy(q); clone.scale.copy(sc);
    this.add(clone);
    this.hide(src);
    let landed = false;
    const s0 = this.clock;
    this.range(s0, s0 + ms, () => {
      const e = (this.clock - s0) / 1000;
      const y = p.y + vel.y * e - 0.5 * g * e * e;
      clone.position.set(p.x + vel.x * e, Math.max(y, -0.3 * K), p.z + vel.z * e);
      clone.rotation.x += spin * 0.016; clone.rotation.z += spin * 0.01;
      if (y < 0 && !landed) { landed = true; this.h.fx.splash(clone.position.clone().setY(0), false); clone.visible = false; }
    });
  }

  /** Đang trong khoảng cảnh cận (insert)? Dùng chọn hệ số phóng đại vật bắn. */
  private inClose() { const u = this.un(this.clock); return this.closeUps.some((c) => u >= c.t0 && u < c.t1); }
  barsTo(k: number) { if (this.o.bars !== false) this.h.bars(k); }

  /** Thân vật bắn (hình trụ + mũi nón + quầng sáng đuôi), chưa đặt kích thước: nhân `PROJ_LEN[style] × K × hero`. */
  projMesh(style: ProjStyle) {
    const col = style === 'shell' || style === 'sneak' ? 0xffe3a0 : style === 'torpedo' ? 0x2a343b : 0xf2f4f6;
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(projGeometry(), new THREE.MeshBasicMaterial({ color: col, fog: false })));
    if (style === 'torpedo') { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a1f, fog: false })); st.position.z = -0.1; grp.add(st); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.h.fx.glowTex(), color: style === 'shell' || style === 'sneak' ? 0xffd27a : 0xffb060, opacity: 0.45 * (glare() / 0.55), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, fog: false })); // quầng sáng dịu: cảnh cận không bị chói
    glow.renderOrder = 6;
    glow.position.z = -0.45;
    grp.add(glow);
    this.add(grp);
    return { grp, glow };
  }

  /** Vật bay (đầu sáng có vệt khói; cảnh cận thấy đủ thân). `path` gọi lúc xuất phát để chốt điểm đầu (vd. đầu nòng). `frac` < 1: dừng giữa đường. */
  projectile(path: () => (u: number) => THREE.Vector3, t0: number, t1: number, style: ProjStyle, frac = 1) {
    const { grp, glow } = this.projMesh(style);
    grp.visible = false;
    let fn: ((u: number) => THREE.Vector3) | null = null, frame = 0;
    this.range(t0, t1, (u) => {
      fn ??= path();
      const uu = u * frac;
      const p = fn(uu), nxt = fn(Math.min(1, uu + 0.02)), prv = fn(Math.max(0, uu - 0.02));
      const fwd = nxt.clone().sub(prv);
      grp.visible = u < 1 && u > 0;
      grp.position.copy(p);
      if (fwd.lengthSq() > 1e-12) grp.lookAt(p.clone().add(fwd));
      const hero = this.inClose() ? HERO_CLOSE : HERO_WIDE;
      const L = PROJ_LEN[style] * K * hero;
      grp.scale.setScalar(L);
      glow.scale.setScalar(style === 'sneak' ? 0.6 : style === 'torpedo' || style === 'bomb' ? 0.55 : 0.75);
      const fx = this.h.fx;
      if ((frame++ & 1) === 0) {
        if (style === 'shell') fx.burst({ pos: p, tex: 'glow', size: [0.18 * hero / 2.5, 0.02], life: [0.14, 0.2], additive: true, color: 0xffa83a, opacity: 0.8 });
        else if (style === 'sneak') fx.burst({ pos: p, tex: 'glow', size: [0.05, 0.01], life: [0.1, 0.15], additive: true, color: 0xffd27a, opacity: 0.6 });
        else if (style === 'torpedo') {
          fx.burst({ pos: p.clone().setY(Math.max(0.05, p.y - 0.04 * K)), tex: 'drop', size: [0.12, 0.06], life: [0.5, 0.9], opacity: 0.6, spread: 0.1 });
          fx.burst({ pos: p, tex: 'smoke', size: [0.08, 0.3], life: [0.8, 1.1], opacity: 0.35, color: 0xb8c4cc });
          fx.burst({ pos: p, tex: 'fire', size: [0.1, 0.025], life: [0.08, 0.14], additive: true, color: 0xff8a1f, opacity: 0.6 });
        } else {
          fx.burst({ pos: p, tex: 'smoke', size: [0.07 * hero / 2.5 + 0.03, 0.34], life: [1.0, 1.2], opacity: 0.4, color: 0xc9d1d7 });
          fx.burst({ pos: p, tex: 'fire', size: [0.11, 0.025], life: [0.08, 0.14], additive: true, color: 0xff8a1f, opacity: 0.6 });
        }
      }
      if (u >= 1) this.drop(grp);
    });
  }

  /** Kết quả của một ô khi đạn chạm (hoặc bị hộ vệ triệt tiêu). `small`: phát phụ, nhỏ hơn 25%. */
  cellImpact(c: Ctx, cell: Cell, kind: 'shell' | 'missile' | 'torpedo' | 'bomb', t: number, small = false) {
    const ev = c.results.get(key(cell));
    const pos = c.cw(cell).setY(0.1 * K);
    if (c.nullified.has(key(cell)) && c.G > 0) return; // hộ vệ triệt tiêu: cảnh hộ vệ lo nổ lửng lơ và marker
    if (c.nullified.has(key(cell))) { // chế độ ngắn (không có cảnh hộ vệ): nổ lửng lơ nhanh
      this.at(t, () => {
        const air = pos.clone().setY(1.2 * K), fx = this.h.fx;
        if (kind === 'torpedo') fx.splash(pos, false);
        else {
          fx.burst({ pos: air, count: 5, tex: 'fire', size: [0.3, 0.1], life: [0.12, 0.25], additive: true, color: 0xffa83a, spread: 0.2 });
          fx.burst({ pos: air, count: 6, tex: 'smoke', size: [0.15, 0.5], life: [0.6, 1.0], opacity: 0.5, color: 0xcfcfcf, spread: 0.3 });
        }
        this.shake(0.015);
      });
      return;
    }
    const s = small ? 0.75 : 1;
    this.at(t, () => {
      const fx = this.h.fx;
      if (!ev) fx.burst({ pos, count: 4, tex: 'smoke', size: [0.2, 0.6], life: [0.6, 1.0], opacity: 0.4, spread: 0.3 }); // ô đã có kết quả: chỉ khói/bụi nhỏ
      else if (ev.result === 'hit') { fx.hit(pos.clone().setY(0.45 * K), kind === 'torpedo'); this.shake((kind === 'torpedo' ? 0.08 : 0.06) * s); }
      else { fx.splash(pos, kind !== 'shell'); this.shake((kind === 'shell' ? 0.01 : 0.03) * s); }
    });
    if (ev) this.emit(t, ev);
  }

  /** Xoay tháp pháo (yaw) về một điểm thế giới, mức `k` (0..1). */
  aimTurret(rig: ShipRig, tu: { yaw: THREE.Object3D }, world: THREE.Vector3, k: number) {
    rig.updateWorldMatrix(true, false);
    tu.yaw.parent?.updateWorldMatrix(true, false);
    const l = (tu.yaw.parent ?? rig).worldToLocal(world.clone());
    const a = Math.atan2(l.x - tu.yaw.position.x, l.z - tu.yaw.position.z);
    tu.yaw.rotation.y = a * k;
  }

  /** Đường ngắm cam từ nòng tới hướng ô (tắt khi bắn). */
  aimLine(muzzle: THREE.Object3D, to: THREE.Vector3, t0: number, t1: number) {
    const geo = new THREE.BufferGeometry().setFromPoints([V(), V()]);
    const line = this.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.55, fog: false })));
    this.range(t0, t1, (u) => {
      const a = this.wp(muzzle), b = to;
      const p = geo.attributes.position as THREE.BufferAttribute;
      p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, lerp(a.x, b.x, 0.4), lerp(a.y, b.y + 0.1 * K, 0.4), lerp(a.z, b.z, 0.4)); p.needsUpdate = true;
      if (u >= 1) this.drop(line);
    });
  }

  /** Nòng thụt lùi rồi về (đơn vị ô, ~250 ms). */
  recoil(tu: { recoil: THREE.Object3D }, t: number, amount = 0.012, ms = 250) {
    this.range(t, t + ms, (u) => { tu.recoil.position.z = -amount * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85); });
  }

  // ---------- dựng kế hoạch: một hành động ----------
  private build(events: GameEvent[]) {
    const shot = events.find((e): e is Extract<GameEvent, { type: 'ShotFired' }> => e.type === 'ShotFired');
    if (!shot) { this.shots.push({ t0: 0, t1: 1, fn: () => this.h.tactical(), blend: 0, layer: 0, real: false }); this.endU = 1; return; }
    const results = new Map<string, Extract<GameEvent, { type: 'CellResolved' }>>();
    for (const e of events) if (e.type === 'CellResolved') results.set(key(e.cell), e);
    const sunk = events.filter((e): e is Extract<GameEvent, { type: 'ShipSunk' }> => e.type === 'ShipSunk');
    const shooterOwner: ZoneOwner = shot.player === this.o.viewer ? 'own' : 'enemy';
    const target: ZoneOwner = shooterOwner === 'own' ? 'enemy' : 'own';

    this.emit(0, shot);
    const cw = (c: Cell) => this.h.cellWorld(target, c);
    const cellsW = shot.cells.map(cw);
    const C = cellsW.reduce((a, b) => a.add(b), V()).multiplyScalar(1 / Math.max(1, cellsW.length));
    // Tàu bắn của địch không dùng vị trí thật (khỏi lộ): dựng tàu giả sau lưới địch.
    const shooterRig = this.touch(shooterOwner === 'own' ? (this.h.rig('own', shot.shipId) ?? this.decoyRig(shot.shipId)) : this.decoyRig(shot.shipId));
    shooterRig.updateWorldMatrix(true, true);
    const sc = shooterRig.getWorldPosition(V());
    const dirToTarget = V(C.x - sc.x, 0, C.z - sc.z);
    if (dirToTarget.lengthSq() < 1e-6) dirToTarget.set(0, 0, -1);
    // Gốc khung nằm ở mặt nước ngay dưới tàu (cao độ sóng), để camera sát nước không chui xuống dưới sóng.
    const frameNow = () => { shooterRig.updateWorldMatrix(true, false); const f = shooterRig.getWorldDirection(V()).setY(0).normalize(); const p = shooterRig.getWorldPosition(V()); return new Frame(p.setY(this.h.heightAt(p.x, p.z, this.h.now()) * 0.9 + shipLift(shooterRig.userData.id)), f, V(-f.z, 0, f.x), HEIGHT); }; // gốc khung tính cả phần nâng thân tàu
    const T = Frame.toward(C.clone().setY(this.h.heightAt(C.x, C.z, this.h.now()) * 0.9), dirToTarget);

    const nulled = events.find((e): e is Extract<GameEvent, { type: 'ShotNullified' }> => e.type === 'ShotNullified');
    const nullified = new Set((nulled?.cells ?? []).map(key));
    // Hộ vệ chặn: chèn cảnh phát hiện + chế áp (2810 ms; phát phụ rút còn 70%); chế độ ngắn không chèn.
    const G = nulled && !this.o.short ? Math.round(2810 * (shot.source === 'passive' ? 0.7 : 1)) : 0;
    let lastImpact = 0;
    const ctx: Ctx = { shot, results, shooterOwner, target, cw, cellsW, C, rig: shooterRig, frameNow, T, dir: dirToTarget.clone().normalize(), nullified, G, gs: 0, mark: (t) => { lastImpact = Math.max(lastImpact, t); } };

    if (this.o.short) this.endU = this.buildShort(ctx);
    else {
      switch (shot.attack) {
        case 'sneak': this.endU = buildSneak(this, ctx); break;
        case 'rapid': this.endU = buildRapid(this, ctx); break;
        case 'precision': this.endU = buildPrecision(this, ctx); break;
        case 'cross': this.endU = buildCross(this, ctx); break;
        case 'torpedo': this.endU = buildTorpedo(this, ctx); break;
        case 'line3': this.endU = buildLine3(this, ctx); break;
        case 'barrage': this.endU = buildBarrage(this, ctx); break;
      }
      if (G) {
        if (!Number.isFinite(this.gs)) this.setGuard(Math.min(lastImpact, this.endU * 0.6), G);
        buildGuard(this, ctx, nulled!);
      }
    }
    lastImpact = this.o.short ? this.endU - 700 : lastImpact;
    if (nulled && !G) this.emit(lastImpact, nulled);

    // Event còn lại, theo thứ tự: lộ tàu → chìm → kết thúc
    const rest = events.filter((e) => e.type !== 'ShotFired' && e.type !== 'CellResolved' && e.type !== 'ShipSunk' && e.type !== 'ShotNullified'
      && !(e.type === 'PassiveTriggered' && (e.kind === 'guard' || e.kind === 'sneak')));
    for (const e of events) if (e.type === 'PassiveTriggered') { if (e.kind === 'guard' && G) this.emitR(this.gs, e); else this.emit(0, e); }
    for (const e of events) if (e.type === 'CellResolved' && !this.emits.some((x) => x.ev === e)) this.emit(lastImpact + 50, e);
    const revealT = lastImpact + 150;
    for (const e of rest) if (e.type === 'ShipRevealed') this.emit(revealT, e);
    for (const e of sunk) this.emit(lastImpact + 60, e); // sprite xám + dấu X hiện ngay khi cú nổ cuối chạm (sinking.md 1.2)
    if (sunk.length && this.o.short) this.at(lastImpact + 60, () => Cinematic.backgroundSink(this.h, sunk, this.o)); // cinematic ngắn: vẫn chìm ở nền (wreckage.md 2.1)
    if (sunk.length && !this.o.short) { // chế độ ngắn bỏ hoạt cảnh chìm 3D
      this.sinkEvents = sunk;
      this.sinkAt = this.endU;
    }
    const tail = sunk.length && !this.o.short ? Infinity : this.endU; // có cảnh chìm chặn: phát lúc cuối cảnh chìm (cuối phần chặn)
    for (const e of rest) if (e.type !== 'ShipRevealed') this.emit(tail, e);
  }

  // ---------- chế độ ngắn: chỉ cảnh trúng đích ~1.8 s ----------
  private buildShort(c: Ctx): number {
    this.shot(0, 3000, (t) => ({ pos: c.T.P(-3.0 + 0.4 * prog(t, 0, 1800), 0.5, 3.2), look: c.C.clone(), fov: 36 }));
    const order = c.shot.cells;
    let last = 0;
    const style = c.shot.attack === 'rapid' || c.shot.attack === 'precision' || c.shot.attack === 'sneak' || c.shot.attack === 'barrage' ? 'shell' : c.shot.attack === 'line3' ? 'bomb' : 'missile';
    order.forEach((cell, i) => {
      const ti = (c.shot.attack === 'torpedo' ? 300 : 650) + (i + 1) * (c.shot.attack === 'torpedo' ? 900 / order.length : 120);
      const w = c.cw(cell).setY(0.03 * K);
      if (c.shot.attack === 'torpedo') this.at(ti, () => this.h.fx.ring(w, 0.7, 0.5, 0xbfe6f5));
      else {
        const to = c.cw(cell).setY(0.1 * K), from = to.clone().addScaledVector(c.dir, -8 * K).add(V(0, 5 * K, 0));
        this.projectile(() => (u) => lerpV(from, to, u), ti - 450, ti, style);
      }
      this.cellImpact(c, cell, c.shot.attack === 'torpedo' ? 'torpedo' : style, ti);
      last = Math.max(last, ti);
    });
    return Math.max(1800, last + 700);
  }

  /** Dải theo thời gian thật (cảnh hộ vệ chèn). */
  private runRealRanges() {
    for (const r of this.realRanges) {
      if (r.ended || this.clock < r.t0) continue;
      const u = prog(this.clock, r.t0, r.t1);
      r.fn(u);
      if (u >= 1) r.ended = true;
    }
  }
}

export { Frame, V, deg, lerp, lerpV, prog, smooth };
