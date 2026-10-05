import * as THREE from 'three';
import type { Cell, GameEvent, PlayerId, ShipId } from '../../design/core-api';
import type { Fx } from './fx3d';
import type { ShipRig } from './shipModels';
import { loadSpecs } from '../core/specs';
import { CELL as K } from './scale';

/**
 * Cinematic cho 5 đòn đánh theo design/cinematics.md (nguồn sự thật về camera, mốc thời gian, thời lượng:
 * rapid 2800 · precision 3200 · cross 3800 · torpedo 4600 · line3 5000 ms, cộng cảnh chìm 1800 ms nếu có).
 * Cinematic chỉ nhận danh sách event + tọa độ ô, không đọc trạng thái core.
 */

export type ZoneOwner = 'own' | 'enemy';
export interface CamPose { pos: THREE.Vector3; look: THREE.Vector3; fov: number }

export interface CineHost {
  fx: Fx;
  scene: THREE.Scene;
  heightAt(x: number, z: number, t: number): number;
  rig(owner: ZoneOwner, id: ShipId): ShipRig | undefined;
  /** Tàu bắn của địch: đặt ở chỗ cố định sau lưới địch (không lộ vị trí thật). */
  decoy(id: ShipId): ShipRig;
  /** Tàu địch đã chìm lộ vị trí: dựng tạm để chìm. */
  wreckRig(owner: ZoneOwner, id: ShipId, origin: Cell, orientation: 'h' | 'v'): ShipRig;
  releaseTemp(): void;
  cellWorld(owner: ZoneOwner, cell: Cell): THREE.Vector3;
  tactical(): CamPose;
  shake(amplitude: number): void;
  setUnderwater(on: boolean): void;
  now(): number;
}

export interface CineOpts {
  viewer: PlayerId;
  speed: number; // 1 hoặc 2 (x2 chia đôi các mốc); số khác chỉ dùng khi kiểm thử hình ảnh
  short: boolean;
  shake: boolean;
  reduced: boolean;
  onEvent(e: GameEvent): void;
}

const SPECS = loadSpecs();
/** Khoảng chèn khi hộ vệ kích hoạt (cinematics.md 9.2: 600–900 ms). */
const GUARD_MS = 700;
const UP = new THREE.Vector3(0, 1, 0);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const smooth = (u: number) => { const k = Math.min(1, Math.max(0, u)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerpV = (a: THREE.Vector3, b: THREE.Vector3, u: number) => a.clone().lerp(b, u);
const prog = (t: number, t0: number, t1: number) => Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
const key = (c: Cell) => `${c.x},${c.y}`;
const deg = (d: number) => (d * Math.PI) / 180;

/** Khung toạ độ: `P(f, r, u)` = gốc + dọc thân f + ngang r (mạn phải dương) + lên u. */
class Frame {
  constructor(public c: THREE.Vector3, public F: THREE.Vector3, public R: THREE.Vector3) {}
  /** f, r, u tính theo ô lưới; nhân `K` (kích thước ô trong thế giới). */
  P(f: number, r: number, u: number) { return this.c.clone().addScaledVector(this.F, f * K).addScaledVector(this.R, r * K).addScaledVector(UP, u * K); }
  static toward(c: THREE.Vector3, dir: THREE.Vector3) {
    const F = V(dir.x, 0, dir.z).normalize();
    return new Frame(c, F, V(-F.z, 0, F.x));
  }
}

interface Range { t0: number; t1: number; fn: (u: number) => void; ended: boolean }
interface Call { t: number; fn: () => void; done: boolean }
interface Shot { t0: number; t1: number; fn: (t: number) => CamPose; blend: number }

export class Cinematic {
  active = false;
  private o!: CineOpts;
  private clock = 0;
  private end = 0;
  private phase: 'run' | 'exit' | 'skip' = 'run';
  private exitT = 0;
  private lastPose: CamPose | null = null;
  private calls: Call[] = [];
  private ranges: Range[] = [];
  private shots: Shot[] = [];
  private slows: { t0: number; t1: number; s: number }[] = [];
  private emits: { t: number; ev: GameEvent; done: boolean }[] = [];
  private resolve?: () => void;
  private temp: THREE.Object3D[] = [];
  private touched = new Set<ShipRig>();
  private hidden: THREE.Object3D[] = [];          // bộ phận đã ẩn để bay rời (tháp pháo, vòm radar, máy bay): hiện lại khi dọn
  private moved = new Map<THREE.Object3D, THREE.Vector3>(); // bộ phận đã dịch (tiềm vọng): trả về vị trí cũ

  constructor(private h: CineHost) {}

  // ---------- điều khiển ----------
  play(events: GameEvent[], o: CineOpts): Promise<void> {
    this.o = o;
    this.reset();
    this.active = true;
    this.build(events);
    this.emits.sort((a, b) => a.t - b.t);
    this.shots.sort((a, b) => a.t0 - b.t0);
    return new Promise((res) => { this.resolve = res; });
  }

  /** Đồng hồ cảnh (ms). Dùng cho kiểm thử hình ảnh. */
  get time() { return this.clock; }

  /** Bỏ qua: phát nốt event còn lại ngay, dọn hiệu ứng, về camera chiến thuật trong 150 ms (animations.md mục 1). */
  skip() {
    if (!this.active || this.phase === 'skip') return;
    for (const e of this.emits) if (!e.done) { e.done = true; this.o.onEvent(e.ev); }
    this.cleanup();
    this.phase = 'skip';
    this.exitT = 0;
  }

  private reset() {
    this.clock = 0; this.end = 0; this.phase = 'run'; this.exitT = 0; this.lastPose = null;
    this.calls = []; this.ranges = []; this.shots = []; this.slows = []; this.emits = [];
  }

  private cleanup() {
    this.h.fx.clearTransient();
    this.h.setUnderwater(false);
    for (const t of this.temp) t.parent?.remove(t);
    this.temp = [];
    for (const r of this.touched) this.restore(r);
    this.touched.clear();
    for (const o of this.hidden) o.visible = true;
    this.hidden = [];
    for (const [o, p] of this.moved) o.position.copy(p);
    this.moved.clear();
    this.h.releaseTemp();
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
  /** Trả tư thế camera ghi đè (null nếu không đang chiếu). `dt` tính bằng giây thực. */
  update(dt: number): CamPose | null {
    if (!this.active) return null;
    const speed = this.o.speed;
    if (this.phase === 'run') {
      const slow = this.slows.find((s) => this.clock >= s.t0 && this.clock < s.t1)?.s ?? 1;
      this.clock += dt * 1000 * speed * (this.o.reduced ? 1 : slow);
      for (const c of this.calls) if (!c.done && c.t <= this.clock) { c.done = true; c.fn(); }
      for (const e of this.emits) if (!e.done && e.t <= this.clock) { e.done = true; this.o.onEvent(e.ev); }
      for (const r of this.ranges) {
        if (r.ended || this.clock < r.t0) continue;
        const u = prog(this.clock, r.t0, r.t1);
        r.fn(u);
        if (u >= 1) r.ended = true;
      }
      if (this.clock >= this.end) {
        for (const e of this.emits) if (!e.done) { e.done = true; this.o.onEvent(e.ev); }
        this.phase = 'exit'; this.exitT = 0;
      }
    } else this.exitT += dt * 1000 * speed;
    if (this.phase === 'exit' && this.exitT >= 500) return this.finish();
    if (this.phase === 'skip' && this.exitT >= 150) return this.finish();

    const tac = this.h.tactical();
    if (this.phase !== 'run') { // ra cảnh: về tactical 500 ms (bỏ qua: 150 ms)
      const u = smooth(this.exitT / (this.phase === 'skip' ? 150 : 500));
      const from = this.lastPose ?? tac;
      return { pos: lerpV(from.pos, tac.pos, u), look: lerpV(from.look, tac.look, u), fov: lerp(from.fov, tac.fov, u) };
    }
    const idx = this.shots.reduce((a, s, i) => (this.clock >= s.t0 ? i : a), 0);
    const shot = this.shots[idx];
    let pose = shot.fn(this.clock);
    if (shot.blend > 0 && idx > 0 && this.clock - shot.t0 < shot.blend) {
      const prev = this.shots[idx - 1].fn(this.clock), k = smooth((this.clock - shot.t0) / shot.blend);
      pose = { pos: lerpV(prev.pos, pose.pos, k), look: lerpV(prev.look, pose.look, k), fov: lerp(prev.fov, pose.fov, k) };
    }
    const u = smooth(this.clock / 300); // vào cảnh: blend 300 ms từ tactical
    this.lastPose = pose;
    return u >= 1 ? pose : { pos: lerpV(tac.pos, pose.pos, u), look: lerpV(tac.look, pose.look, u), fov: lerp(tac.fov, pose.fov, u) };
  }

  private finish(): null {
    this.cleanup();
    this.active = false;
    const r = this.resolve; this.resolve = undefined;
    r?.();
    return null;
  }

  // ---------- dựng kế hoạch ----------
  private at(t: number, fn: () => void) { this.calls.push({ t, fn, done: false }); }
  private range(t0: number, t1: number, fn: (u: number) => void) { this.ranges.push({ t0, t1, fn, ended: false }); }
  /** `blend` ms: chuyển mượt từ shot trước (cảnh bắn → cảnh kết quả); 0 = cắt cứng. */
  private shot(t0: number, t1: number, fn: (t: number) => CamPose, blend = 0) { this.shots.push({ t0, t1, fn, blend }); }
  private slow(t0: number, t1: number, s: number) { if (!this.o.reduced) this.slows.push({ t0, t1, s }); }
  private emit(t: number, ev: GameEvent) { this.emits.push({ t, ev, done: false }); }
  private shake(a: number) { if (this.o.shake && !this.o.reduced) this.h.shake(a); }
  private wp(o: THREE.Object3D) { o.updateWorldMatrix(true, false); return o.getWorldPosition(V()); }
  private add<T extends THREE.Object3D>(o: T): T { this.h.scene.add(o); this.temp.push(o); return o; }
  private drop(o: THREE.Object3D) { o.parent?.remove(o); this.temp = this.temp.filter((x) => x !== o); }
  private touch(r: ShipRig) { this.touched.add(r); return r; }

  private build(events: GameEvent[]) {
    const shot = events.find((e): e is Extract<GameEvent, { type: 'ShotFired' }> => e.type === 'ShotFired');
    if (!shot) { this.shots.push({ t0: 0, t1: 1, fn: () => this.h.tactical(), blend: 0 }); this.end = 1; return; }
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
    const shooterRig = this.touch(shooterOwner === 'own' ? (this.h.rig('own', shot.shipId) ?? this.h.decoy(shot.shipId)) : this.h.decoy(shot.shipId));
    shooterRig.updateWorldMatrix(true, true);
    const sc = shooterRig.getWorldPosition(V());
    const dirToTarget = V(C.x - sc.x, 0, C.z - sc.z);
    if (dirToTarget.lengthSq() < 1e-6) dirToTarget.set(0, 0, -1);
    const sF = shooterRig.getWorldDirection(V()).setY(0).normalize();
    const SF = new Frame(sc, sF, V(-sF.z, 0, sF.x)); // khung tàu bắn (cập nhật theo nhấp nhô ở camera fn)
    // Gốc khung nằm ở mặt nước ngay dưới tàu (cao độ sóng), để camera sát nước không chui xuống dưới sóng.
    const frameNow = () => { shooterRig.updateWorldMatrix(true, false); const f = shooterRig.getWorldDirection(V()).setY(0).normalize(); const p = shooterRig.getWorldPosition(V()); return new Frame(p.setY(this.h.heightAt(p.x, p.z, this.h.now()) * 0.9), f, V(-f.z, 0, f.x)); };
    const T = Frame.toward(C.clone().setY(this.h.heightAt(C.x, C.z, this.h.now()) * 0.9), dirToTarget);

    const nulled = events.find((e): e is Extract<GameEvent, { type: 'ShotNullified' }> => e.type === 'ShotNullified');
    const nullified = new Set((nulled?.cells ?? []).map(key));
    // Hộ vệ chặn: chèn khoảng GUARD_MS vào cảnh kết quả (cinematics.md mục 9.2); chế độ ngắn không chèn.
    const G = nulled && !this.o.short ? Math.round(GUARD_MS * (shot.source === 'passive' ? 0.7 : 1)) : 0;
    const ctx: Ctx = { shot, results, shooterOwner, target, cw, cellsW, C, rig: shooterRig, SF, frameNow, T, dir: dirToTarget.clone().normalize(), nullified, nullTimes: [], G, gs: 0, bcam: () => this.h.tactical() };
    let lastImpact = 0;
    const markImpact = (t: number) => { lastImpact = Math.max(lastImpact, t); };

    if (this.o.short) lastImpact = this.buildShort(ctx);
    else {
      switch (shot.attack) {
        case 'sneak': this.sneak(ctx, markImpact); this.end = 1000; break;
        case 'rapid': this.rapid(ctx, markImpact); this.end = 2800 + G; break;
        case 'precision': this.precision(ctx, markImpact); this.end = 3000 + G; break;
        case 'cross': this.cross(ctx, markImpact); this.end = 3800 + G; break;
        case 'torpedo': this.torpedo(ctx, markImpact); this.end = 4600 + G; break;
        case 'line3': this.line3(ctx, markImpact); this.end = 5000 + G; break;
      }
      if (G) this.guardInterlude(ctx, nulled!);
    }
    if (this.o.short) this.end = lastImpact + 600;
    if (nulled) this.emit(ctx.nullTimes.length ? Math.min(...ctx.nullTimes) : lastImpact, nulled);

    // Event còn lại, theo thứ tự: lộ tàu → chìm → kết thúc
    const rest = events.filter((e) => e.type !== 'ShotFired' && e.type !== 'CellResolved' && e.type !== 'ShipSunk' && e.type !== 'ShotNullified'
      && !(e.type === 'PassiveTriggered' && (e.kind === 'guard' || e.kind === 'sneak')));
    for (const e of events) if (e.type === 'PassiveTriggered') this.emit(e.kind === 'guard' ? ctx.gs : 0, e);
    for (const e of events) if (e.type === 'CellResolved' && !this.emits.some((x) => x.ev === e)) this.emit(lastImpact + 50, e);
    const revealT = lastImpact + 150;
    for (const e of rest) if (e.type === 'ShipRevealed') this.emit(revealT, e);
    for (const e of sunk) this.emit(lastImpact + 60, e); // sprite xám + dấu X hiện ngay khi cú nổ cuối chạm (sinking.md 1.2)
    if (sunk.length && !this.o.short) { // chế độ ngắn bỏ hoạt cảnh chìm 3D
      const s0 = this.end;
      this.sinkPhase(sunk, s0);
      this.end = s0 + SINK_MS + SINK_TAIL;
    }
    const tail = this.end;
    for (const e of rest) if (e.type !== 'ShipRevealed') this.emit(tail, e);
  }

  private cellImpact(ctx: Ctx, cell: Cell, kind: 'shell' | 'missile' | 'torpedo' | 'bomb', t: number) {
    const ev = ctx.results.get(key(cell));
    const pos = ctx.cw(cell).setY(0.1);
    if (ctx.nullified.has(key(cell))) { // hộ vệ triệt tiêu: nổ lửng lơ giữa trời (fx_airburst) hoặc cột nước nhỏ (fx_counter_splash), không marker hit/miss
      ctx.nullTimes.push(t);
      this.at(t, () => {
        const fx = this.h.fx;
        if (kind === 'torpedo') fx.splash(pos, false);
        else {
          const air = pos.clone().setY(1.2 * K);
          fx.burst({ pos: air, count: 5, tex: 'fire', size: [0.3, 0.1], life: [0.12, 0.25], additive: true, color: 0xffa83a, spread: 0.2 });
          fx.burst({ pos: air, count: 6, tex: 'smoke', size: [0.15, 0.5], life: [0.6, 1.0], opacity: 0.5, color: 0xcfcfcf, spread: 0.3 });
          fx.burst({ pos: air, count: 5, tex: 'drop', size: [0.05, 0.02], life: [0.5, 0.8], vel: V(0, -0.4, 0), spread: 0.4, grav: 4 });
        }
        this.shake(0.015);
      });
      return;
    }
    this.at(t, () => {
      const fx = this.h.fx;
      if (!ev) fx.burst({ pos, count: 4, tex: 'smoke', size: [0.2, 0.6], life: [0.6, 1.0], opacity: 0.4, spread: 0.3 }); // ô đã có kết quả: chỉ khói/bụi nhỏ
      else if (ev.result === 'hit') { fx.hit(pos.clone().setY(0.45 * K), kind === 'torpedo'); this.shake(kind === 'torpedo' ? 0.08 : 0.06); }
      else { fx.splash(pos, kind !== 'shell'); this.shake(kind === 'shell' ? 0.01 : 0.03); }
    });
    if (ev) this.emit(t, ev);
  }

  /** Vật bay: sprite sáng đi theo `path(u)` từ t0 tới t1, để lại vệt. Biến mất đúng mốc chạm. */
  private projectile(path: (u: number) => THREE.Vector3, t0: number, t1: number, style: 'shell' | 'missile' | 'bomb') {
    const mat = new THREE.SpriteMaterial({ map: this.h.fx.glowTex(), color: style === 'shell' ? 0xffe3a0 : 0xfff0d0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    const s = new THREE.Sprite(mat);
    s.scale.setScalar((style === 'shell' ? 0.55 : 0.45) * K);
    s.visible = false;
    this.add(s);
    this.range(t0, t1, (u) => {
      const p = path(u);
      s.visible = u < 1; s.position.copy(p);
      const fx = this.h.fx;
      if (style === 'shell') fx.burst({ pos: p, tex: 'glow', size: [0.18, 0.02], life: [0.14, 0.2], additive: true, color: 0xffa83a, opacity: 0.8 }); // vệt cam #FFD27A + viền #FF8A1F
      else if (style === 'missile') {
        fx.burst({ pos: p, tex: 'smoke', size: [0.06, 0.3], life: [1.0, 1.2], opacity: 0.55, color: 0xffffff });
        fx.burst({ pos: p, tex: 'fire', size: [0.14, 0.03], life: [0.08, 0.14], additive: true, color: 0xff8a1f });
      } else fx.burst({ pos: p, tex: 'smoke', size: [0.04, 0.12], life: [0.4, 0.6], opacity: 0.35, color: 0xffffff });
      if (u >= 1) this.drop(s);
    });
  }

  // ---------- rapid: Khu trục hạm ----------
  private rapid(c: Ctx, mark: (t: number) => void) {
    const two = c.shot.cells.length >= 2;
    const parts = c.rig.userData.parts.turrets;
    const aim = (tu: typeof parts[number], cell: Cell, t0: number, t1: number) => {
      this.range(t0, t1, (u) => this.aimTurret(c.rig, tu, c.cw(cell), smooth(u)));
    };
    aim(parts[0], c.shot.cells[0], 0, 800);                       // tháp trước -> ô 1
    if (two) aim(parts[1], c.shot.cells[1], 0, 800);              // tháp sau -> ô 2 (hướng khác)
    this.aimLines(c, parts, [c.shot.cells[0], c.shot.cells[1] ?? c.shot.cells[0]], 0, 1150);
    this.shot(0, 1000, (t) => { const F = c.frameNow(); return { pos: F.P(lerp(-2.2, -1.8, prog(t, 0, 1000)), lerp(1.2, 1.0, prog(t, 0, 1000)), 3.0), look: F.P(0.2, 0, 0.1), fov: 40 }; });
    // Cảnh bắn kết thúc khi viên cuối rời nòng (+250 ms), rồi chuyển mượt sang cảnh kết quả.
    const tB = two ? 1850 : 1400;
    this.shot(1000, two ? 1550 : tB, () => { const F = c.frameNow(); return { pos: F.P(0.55, 0.45, 0.16), look: this.wp(parts[0].muzzle).addScaledVector(F.F, 0.25 * K), fov: 32 }; });
    if (two) this.shot(1550, tB, () => { const F = c.frameNow(); return { pos: F.P(-0.35, -0.42, 0.16), look: this.wp(parts[1].muzzle).addScaledVector(F.F, 0.25 * K), fov: 32 }; });
    const G = c.G, tImp = [2050 + G, 2500 + G];
    const mid = c.cellsW.length > 1 ? lerpV(c.cellsW[0], c.cellsW[1], 0.5) : c.cellsW[0];
    c.bcam = this.resultCam(c, mid, tB, tImp[0], 2800 + G);
    this.shot(tB, 2800 + G, c.bcam, 450);
    c.gs = tB + 150;
    [1150, 1600].slice(0, two ? 2 : 1).forEach((tf, i) => {
      const tu = parts[i];
      this.at(tf, () => this.fireShell(c, tu, c.shot.cells[i], tImp[i] - tf, false));
      mark(tImp[i]);
      this.cellImpact(c, c.shot.cells[i], 'shell', tImp[i]);
    });
  }

  /**
   * Cảnh kết quả riêng: máy dolly tới tâm vùng đánh. Trúng: máy cao hơn, tiến vào, rồi hơi lùi và nâng lên theo khói.
   * Trượt: máy sát mặt nước, trôi ngang theo cột nước.
   */
  private resultCam(c: Ctx, look: THREE.Vector3, tB: number, tImp: number, tEnd: number): (t: number) => CamPose {
    const hit = [...c.results.values()].some((r) => r.result === 'hit');
    return (t) => {
      const k = smooth(prog(t, tB, tImp)), after = smooth(prog(t, tImp, tEnd));
      if (hit) return { pos: c.T.P(lerp(-6.0, -3.2, k) + 0.5 * after, lerp(0.8, 0.4, k), lerp(3.6, 2.0, k) + 0.5 * after), look: look.clone().add(V(0, 0.15 * after * K, 0)), fov: lerp(46, 40, k) };
      return { pos: c.T.P(lerp(-5.0, -3.6, k), lerp(1.0, 0.7, k) + 0.4 * after, lerp(1.3, 0.8, k)), look: look.clone().add(V(0, 0.3 * k * K, 0)), fov: lerp(46, 38, k) };
    };
  }

  // ---------- sneak: tàu cắn lén (1000 ms, cinematics.md 9.1) ----------
  private sneak(c: Ctx, mark: (t: number) => void) {
    const tu = c.rig.userData.parts.turrets[0], cell = c.shot.cells[0];
    this.range(0, 150, (u) => this.aimTurret(c.rig, tu, c.cw(cell), smooth(u)));
    this.shot(0, 400, () => { const F = c.frameNow(); return { pos: F.P(0.45, 0.38, 0.14), look: this.wp(tu.muzzle), fov: 34 }; });
    this.at(250, () => {
      const from = this.wp(tu.muzzle), to = c.cw(cell).setY(0.1);
      this.h.fx.muzzle(from, to.clone().sub(from).normalize(), false);
      this.shake(0.01);
      this.projectile((u) => lerpV(from, to, u).add(V(0, Math.sin(u * Math.PI) * 0.25 * K, 0)), this.clock, 750, 'bomb'); // đạn rất nhanh, vệt mảnh, không cầu lửa lúc bắn
      this.range(250, 450, (u) => { tu.recoil.position.z = -0.01 * Math.sin(u * Math.PI); });
    });
    c.bcam = this.resultCam(c, c.cellsW[0], 400, 750, 1000);
    this.shot(400, 1000, c.bcam, 300);
    mark(750);
    this.cellImpact(c, cell, 'shell', 750);
  }

  // ---------- hộ vệ chặn: chèn GUARD_MS vào cảnh kết quả (cinematics.md 9.2) ----------
  private guardInterlude(c: Ctx, ev: Extract<GameEvent, { type: 'ShotNullified' }>) {
    const { gs, G } = c;
    const escort = this.touch(c.target === 'own' ? (this.h.rig('own', ev.shipId) ?? this.h.decoy(ev.shipId)) : this.h.decoy(ev.shipId)); // vị trí hộ vệ địch không lộ: dùng tàu giả
    const ep = () => this.wp(escort);
    const tPush = gs + 0.3 * G, tCut = gs + 0.65 * G;
    this.shot(gs, tPush, (t) => { const p = c.bcam(t), k = smooth(prog(t, gs, tPush)); return { ...p, pos: lerpV(p.pos, p.look, 0.1 * k) }; });
    this.shot(tPush, tCut, () => ({ pos: escort.localToWorld(V(0, 0.9, -1.4)), look: ep().add(V(0, 0.15, 0)), fov: 40 })); // intercept_cam
    this.shot(tCut, gs + G, c.bcam, 250);
    this.at(gs, () => this.h.fx.light(ep().add(V(0, 0.4 * K, 0)), 120, 400)); // vòm radar sáng viền cam
    this.at(tPush, () => {
      const fx = this.h.fx, from = ep().add(V(0, 0.25 * K, 0));
      escort.userData.parts.turrets.forEach((tu) => this.aimTurret(escort, tu, c.C, 1));
      fx.burst({ pos: from, count: 10, tex: 'glow', size: [0.1, 0.02], life: [0.1, 0.25], additive: true, color: 0xffa83a, vel: V(0, 0.6, 0), spread: 0.8 });       // CIWS bắn loạt
      fx.burst({ pos: from, count: 8, tex: 'smoke', size: [0.1, 0.5], life: [0.6, 1.0], opacity: 0.5, color: 0xffffff, vel: V(0, 0.5, 0), spread: 0.9 }); // chaff
    });
  }

  private aimLines(c: Ctx, turrets: { muzzle: THREE.Object3D }[], cells: Cell[], t0: number, tOff: number) {
    cells.slice(0, turrets.length).forEach((cell, i) => {
      const geo = new THREE.BufferGeometry().setFromPoints([V(), V()]);
      const line = this.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.55, fog: false })));
      this.range(t0, tOff, (u) => {
        const a = this.wp(turrets[i].muzzle), b = c.cw(cell);
        const p = geo.attributes.position as THREE.BufferAttribute;
        p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, lerp(a.x, b.x, 0.4), lerp(a.y, b.y + 0.1, 0.4), lerp(a.z, b.z, 0.4)); p.needsUpdate = true;
        if (u >= 1) this.drop(line);
      });
    });
  }

  private aimTurret(rig: ShipRig, tu: { yaw: THREE.Object3D }, world: THREE.Vector3, k: number) {
    rig.updateWorldMatrix(true, false);
    const l = (tu.yaw.parent ?? rig).worldToLocal(world.clone());
    const a = Math.atan2(l.x - tu.yaw.position.x, l.z - tu.yaw.position.z);
    tu.yaw.rotation.y = a * k;
  }

  private fireShell(c: Ctx, tu: { muzzle: THREE.Object3D; recoil: THREE.Object3D }, cell: Cell, flightMs: number, big: boolean, arc = 0.15) {
    const from = this.wp(tu.muzzle), to = c.cw(cell).setY(0.1);
    const dir = to.clone().sub(from).normalize();
    this.h.fx.muzzle(from, dir, big);
    this.shake(big ? 0.05 : 0.02);
    const now = this.clock;
    const peak = arc * from.distanceTo(to);
    this.projectile((u) => lerpV(from, to, u).add(V(0, Math.sin(u * Math.PI) * peak, 0)), now, now + flightMs, 'shell');
    // nòng thụt lùi 0.012 rồi về trong ~250 ms
    this.range(now, now + 250, (u) => { tu.recoil.position.z = -0.012 * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85); });
  }

  // ---------- precision: Tuần dương ----------
  private precision(c: Ctx, mark: (t: number) => void) {
    const real = c.rig.userData.parts.turrets;
    // Tàu hỏng khí tài (không có tháp pháo) bắn 1 ô từ neo `launch`.
    const tus = real.length ? real : [{ yaw: new THREE.Object3D(), pitch: new THREE.Object3D(), muzzle: c.rig.userData.parts.launch, recoil: new THREE.Object3D() }];
    const cell = c.shot.cells[0];
    this.range(0, 1100, (u) => tus.forEach((tu) => { this.aimTurret(c.rig, tu, c.cw(cell), smooth(u)); tu.pitch.rotation.x = -deg(35) * smooth(u); }));
    this.aimLines(c, tus.slice(0, 1), [cell], 0, 1300);
    this.shot(0, 1100, (t) => { const F = c.frameNow(); const k = prog(t, 0, 1100) * 0.5; const p = F.P(-1.3, 0.5, 5.6), look = F.P(0.4, 0, 0); return { pos: p.lerp(look, k * 0.2), look, fov: 36 }; });
    this.shot(1100, 1650, (t) => {
      const F = c.frameNow();
      const look = this.wp(tus[0].muzzle).addScaledVector(F.F, -0.1);
      return { pos: F.P(0.7, 1.35, 0.12 + Math.sin(t * 0.004) * 0.01), look, fov: 30 };
    });
    // Cảnh bắn dừng sau khi đạn rời nòng; cảnh kết quả theo đạn tới đích.
    c.bcam = this.resultCam(c, c.cellsW[0], 1650, 2450 + c.G, 3000 + c.G);
    this.shot(1650, 3000 + c.G, c.bcam, 450);
    c.gs = 1800;
    this.slow(1250, 1650, 0.6);
    this.at(1300, () => {
      const from = this.wp(tus[0].muzzle), to = c.cw(cell).setY(0.1);
      this.h.fx.muzzle(from, to.clone().sub(from).normalize(), true);
      this.h.fx.ring(from.clone().setY(0), 2.2, 0.8, 0xffd0a0);                 // sóng xung kích lan trên mặt nước
      this.h.fx.light(from.clone().add(V(0, 0.4 * K, 0)), 200, 200);               // chiếu sáng cả thân tàu và mặt nước
      this.shake(0.05);
      const peak = 6 * K + 0.4 * from.distanceTo(to);                               // cung cao
      this.projectile((u) => lerpV(from, to, u).add(V(0, Math.sin(u * Math.PI) * peak * 0.5, 0)), this.clock, 2450 + c.G, 'shell');
      this.range(1300, 1550, (u) => { tus[0].recoil.position.z = -0.025 * Math.sin(u * Math.PI); });
      // tàu chao: lăn 3° ngược hướng bắn trong 250 ms rồi tắt dần 900 ms; chúi 1.2°; hai tháp còn lại giật 40%
      const side = Math.sign(c.dir.dot(c.frameNow().R)) || 1;
      this.range(1300, 2450, (u) => { const ms = u * 1150; const k = ms < 250 ? ms / 250 : Math.max(0, 1 - (ms - 250) / 900); c.rig.userData.kick.roll = deg(3) * k * -side; c.rig.userData.kick.pitch = deg(1.2) * k; });
      tus.slice(1).forEach((tu) => this.range(1300, 1550, (u) => { tu.recoil.position.z = -0.01 * Math.sin(u * Math.PI); }));
    });
    mark(2450 + c.G);
    this.cellImpact(c, cell, 'shell', 2450 + c.G);
  }

  // ---------- cross: Tàu tên lửa ----------
  private cross(c: Ctx, mark: (t: number) => void) {
    const ls = c.rig.userData.parts.launchers;
    ls.forEach((l, i) => this.range(300 + i * 80, 1100 + i * 80, (u) => { l.base.visible = true; l.base.position.y = (l.base.userData.y0 ?? 0) + lerp(-0.08, 0.2, smooth(Math.min(1, u * 2))); l.pitch.rotation.x = -deg(75) * smooth(u); }));
    this.shot(0, 1300, (t) => { const F = c.frameNow(); return { pos: F.P(lerp(0.1, 0.7, prog(t, 0, 1300)), 2.3, 0.6), look: F.P(0.1, 0, 0.15), fov: 38 }; });
    this.shot(1300, 1900, (t) => { const F = c.frameNow(); const k = prog(t, 1300, 1900); return { pos: F.P(0.7 - 0.5 * k, 2.3, 0.6 - 0.2 * k), look: F.P(0.1, 0, 0.15), fov: lerp(38, 42, k) }; });
    this.shot(1900, 2550, (t) => { const k = prog(t, 1900, 2550); return { pos: c.T.P(-8, 0, lerp(9.0, 7.4, k)), look: c.C.clone(), fov: 40 }; }); // theo chùm tên lửa tới ~70% đường bay
    c.bcam = this.resultCam(c, c.C, 2550, 3050 + c.G, 3800 + c.G);
    this.shot(2550, 3800 + c.G, c.bcam, 450);                                                   // cảnh kết quả, chuyển mượt
    c.gs = 2700;
    this.at(1300, () => this.shake(0.07));
    c.shot.cells.slice(0, 5).forEach((cell, i) => {
      const tl = 1300 + i * 60, ti = 3050 + i * 120 + c.G, l = ls[i % ls.length];
      this.at(tl, () => {
        const from = this.wp(l.muzzle), to = c.cw(cell).setY(0.1);
        const apex = 6 * K + 0.4 * from.distanceTo(to);
        const p1 = from.clone().add(V(0, apex * 1.3, 0)), p2 = to.clone().add(V(0, apex * 1.0, 0)).lerp(to, 0.3);
        this.projectile((u) => { const w = 1 - u; return from.clone().multiplyScalar(w * w * w).addScaledVector(p1, 3 * w * w * u).addScaledVector(p2, 3 * w * u * u).addScaledVector(to, u * u * u); }, this.clock, ti, 'missile');
        this.h.fx.burst({ pos: from, vel: V(0, 1.2, 0), count: 10, tex: 'smoke', size: [0.15, 0.9], life: [0.8, 1.4], spread: 0.4, opacity: 0.6, color: 0xffffff });
        this.h.fx.burst({ pos: from, count: 3, tex: 'fire', size: [0.3, 0.7], life: [0.15, 0.3], additive: true });
        if (i === 0) this.h.fx.light(from, 80, 600);
      });
      mark(ti);
      this.cellImpact(c, cell, 'missile', ti);
    });
  }

  // ---------- torpedo: Tàu ngầm ----------
  private torpedo(c: Ctx, mark: (t: number) => void) {
    const rig = c.rig, parts = rig.userData.parts;
    this.at(0, () => this.h.setUnderwater(true));
    this.at(2100, () => this.h.setUnderwater(false));
    this.range(0, 1500, (u) => { rig.userData.yOffset = lerp(-0.35, 0, smooth(u)) * K; });       // trồi lên
    this.range(0, 1500, () => { if (Math.random() < 0.5) this.h.fx.burst({ pos: this.wp(rig).add(V((Math.random() - 0.5) * 0.4, -0.1, (Math.random() - 0.5) * 2).multiplyScalar(K)), tex: 'drop', size: [0.07, 0.02], life: [0.4, 0.7], vel: V(0, 0.8, 0), color: 0xbfe6f5 }); });
    parts.flaps.forEach((f, i) => this.range(1500 + i * 120, 1500 + i * 120 + 350, (u) => { f.rotation.x = deg(80) * smooth(u); }));
    this.shot(0, 1500, (t) => { const F = c.frameNow(); const a = deg(20) * prog(t, 0, 1500); const p = F.P(1.0, -0.35, -0.16); const rot = p.clone().sub(F.c).applyAxisAngle(UP, a); return { pos: F.c.clone().add(rot), look: F.P(-0.2, 0, -0.02), fov: 50 }; });
    this.shot(1500, 2100, () => { const F = c.frameNow(); return { pos: F.P(1.7, -0.12, -0.12), look: this.wp(parts.launch), fov: 38 }; });

    // đường ngư lôi: từ nắp ống tới mép vào của đường, rồi dọc các ô
    const cells = c.shot.cells.map((x) => c.cw(x).setY(0.03));
    const d = (cells.length > 1 ? cells[cells.length - 1].clone().sub(cells[0]) : V(0, 0, -1)).setY(0).normalize();
    const entry = cells[0].clone().addScaledVector(d, -2.2 * K);
    const launch = this.wp(parts.launch);
    const tHit = 3950 + c.G, t0 = 2100;
    const len0 = launch.distanceTo(entry), len1 = entry.distanceTo(cells[cells.length - 1]) + 0.01;
    const tEntry = t0 + (len0 / (len0 + len1)) * (tHit - t0);
    const poly = (u: number) => { const s = u * (len0 + len1); return s < len0 ? lerpV(launch, entry, s / len0) : lerpV(entry, cells[cells.length - 1], (s - len0) / len1); };
    const lastRes = c.results.get(key(c.shot.cells[c.shot.cells.length - 1]));
    const hit = lastRes?.result === 'hit';
    const heads: THREE.Vector3[] = [launch.clone()];
    for (let i = 0; i < 4; i++) {
      const ts = t0 + i * 240, te = tHit + i * 240; // 90 ms giữa các lần phóng + 150 ms giãn cách trên đường
      const body = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01 * K, 0.01 * K, 0.15 * K, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1f272d, metalness: 0.7, roughness: 0.4 })));
      body.visible = false;
      this.range(ts, te, (u) => {
        const p = poly(u).setY(0.03);
        body.visible = u < 1;
        body.position.copy(p);
        body.lookAt(poly(Math.min(1, u + 0.02)).setY(0.03));
        if (i === 0) heads[0] = p;
        this.h.fx.burst({ pos: p.clone().setY(0.06), tex: 'drop', size: [0.12, 0.06], life: [0.5, 0.9], opacity: 0.6, spread: 0.1 });       // vệt bọt trắng sủi
      });
    }
    // Cảnh phóng kết thúc lúc ngư lôi rời ống (2100); cảnh kết quả bám đầu ngư lôi rồi nhìn xuống đường chạy.
    this.shot(t0, 2700, () => { const h = heads[0]; return { pos: h.clone().add(V(0, 0.55 * K, 0)).addScaledVector(d, -0.8 * K), look: h.clone().addScaledVector(d, 3 * K), fov: 55 }; }, 450);
    const view = (back: number) => ({ pos: entry.clone().addScaledVector(d, (-2.0 - back) * K).add(V(0, 4.5 * K, 0)), look: lerpV(entry, cells[cells.length - 1], 0.7), fov: 45 });
    c.bcam = () => view(0);
    c.gs = 2750;
    this.shot(2700, tHit - 50, () => view(0), 500);
    this.shot(tHit - 50, 4600 + c.G, (t) => view(0.8 * prog(t, tHit - 50, 4600 + c.G)));
    // mỗi ô đi qua phát một vòng sóng; kết quả ô lộ ra khi đầu ngư lôi tới
    c.shot.cells.forEach((cell, i) => {
      const ti = tEntry + ((i + 1) / c.shot.cells.length) * (tHit - tEntry);
      const w = cells[i];
      const ev = c.results.get(key(cell));
      const isLast = i === c.shot.cells.length - 1;
      this.at(ti, () => {
        this.h.fx.ring(w, 0.7, 0.6, 0xbfe6f5);
        if (ev && ev.result === 'miss') this.h.fx.burst({ pos: w, count: 3, tex: 'drop', size: [0.08, 0.03], life: [0.3, 0.5], vel: V(0, 0.8, 0), spread: 0.4, grav: 3 });
        if (ev && ev.result === 'hit') {
          this.h.fx.hit(w.clone().setY(0.1), true);                                                  // nổ dưới thân, cột nước 1.4
          this.shake(0.08);
          for (let k = 1; k <= 3; k++) this.at(this.clock + k * 100, () => this.h.fx.hit(w.clone().addScaledVector(d, -0.35 * k * K).setY(0.1), true)); // ba quả sau nổ thứ phát
        }
      });
      if (ev) this.emit(ti, ev);
      if (isLast) mark(tHit);
    });
    if (!hit) this.at(4100 + c.G, () => this.h.fx.ring(cells[cells.length - 1], 1.2, 0.8, 0xbfe6f5)); // trượt hết: lăn vòng sóng cuối, chìm dần
  }

  // ---------- line3: Tàu sân bay ----------
  private line3(c: Ctx, mark: (t: number) => void) {
    const parts = c.rig.userData.parts;
    const cells = c.shot.cells.map((x) => c.cw(x));
    const d = (cells.length > 1 ? cells[cells.length - 1].clone().sub(cells[0]) : V(1, 0, 0)).setY(0).normalize();
    const planes = parts.planes;
    // đường bay của từng máy bay: ray phóng -> leo, rẽ -> thẳng hàng tiếp cận -> qua ô thả
    const drops = [3800 + c.G, 3950 + c.G, 4100 + c.G], fall = 350;
    const paths = planes.map((_, i) => {
      const cat = i < 2 ? i : 0;
      const tk = i === 0 ? 400 : i === 1 ? 400 : 700;
      const ci = Math.min(i, cells.length - 1);
      const over = cells[ci].clone().addScaledVector(d, 0.2 * K).setY(1.9 * K);
      const approach = over.clone().addScaledVector(d, -9 * K).setY(3.6 * K);
      return { cat, tk, over, approach, tRel: drops[Math.min(i, 2)] - fall, drop: i < cells.length };
    });
    const worldPlanes: THREE.Group[] = planes.map((p) => { void p; const g = this.add(new THREE.Group()); g.visible = false; g.scale.setScalar(K); return g; });
    planes.forEach((p, i) => { const clone = p.clone(true); worldPlanes[i].add(clone); });
    const pos = (i: number, t: number): THREE.Vector3 => {
      const P = paths[i], F = c.frameNow();
      const cs = this.wp(parts.catStart[Math.min(P.cat, parts.catStart.length - 1)]), ce = this.wp(parts.catEnd[Math.min(P.cat, parts.catEnd.length - 1)]);
      const away = ce.clone().addScaledVector(F.F, 6 * K).add(V(0, 2.2 * K, 0)).addScaledVector(F.R, (i - 1) * 1.2 * K);
      const t1 = P.tk + 500;
      if (t < P.tk) return cs.clone();
      if (t < t1) return lerpV(cs, ce, (t - P.tk) / 500);                                         // lao theo ray 500 ms
      const curve = new THREE.CatmullRomCurve3([ce, away, P.approach, P.over], false, 'catmullrom', 0.4);
      return curve.getPoint(prog(t, t1, P.tRel));
    };
    const dirOf = (i: number, t: number) => pos(i, t + 30).sub(pos(i, t - 30));
    planes.forEach((p, i) => {
      const P = paths[i];
      this.range(0, 5000 + c.G, () => {
        const t = this.clock, g = worldPlanes[i];
        if (t < P.tk) { p.visible = true; g.visible = false; return; }
        p.visible = false;
        if (t > P.tRel + 700) { g.visible = false; return; }
        g.visible = true;
        if (t <= P.tRel) { g.position.copy(pos(i, t)); g.lookAt(g.position.clone().add(dirOf(i, t))); }
        else { const e = (t - P.tRel) / 1000; g.position.copy(P.over).addScaledVector(d, 14 * e * K).add(V(0, e * 6 * K, 0)); g.lookAt(g.position.clone().add(d).add(V(0, 0.5, 0))); }  // thả xong vọt lên
        if (Math.random() < 0.6) this.h.fx.burst({ pos: g.position.clone().addScaledVector(d, -0.1), tex: 'smoke', size: [0.04, 0.2], life: [0.5, 0.8], opacity: 0.35, color: 0xffffff });
      });
    });
    this.at(300, () => this.shake(0.03));
    this.range(400, 1000, () => { if (Math.random() < 0.7) this.h.fx.burst({ pos: this.wp(parts.catEnd[0]), tex: 'smoke', size: [0.1, 0.5], life: [0.4, 0.8], vel: V(0, 0.5, 0), spread: 0.8, opacity: 0.5, color: 0xffffff }); });

    // cảnh quay
    this.shot(0, 1200, () => { const F = c.frameNow(); return { pos: F.P(1.7, 0.45, 0.15), look: F.P(0.9, 0, 0.15), fov: 38 }; });
    this.shot(1200, 2200, (t) => {
      const k = prog(t, 1200, 2200);
      const p0 = worldPlanes[0].position;
      const a = deg(-60 + 120 * k);                                                              // quay quanh máy bay 120° trong 1000 ms
      const off = V(-1.2 * K, 0.25 * K, 0.4 * K).applyAxisAngle(UP, a);
      return { pos: p0.clone().add(off), look: p0.clone(), fov: 45 };
    });
    // Cảnh bắn kết thúc khi máy bay cất cánh và bay ra (2200); cảnh kết quả từ xa rồi bám máy bay thả bom.
    c.bcam = () => ({ pos: c.T.P(-7, 3, 6.5), look: lerpV(cells[0], cells[cells.length - 1], 0.5), fov: 38 });
    c.gs = 2400;
    this.shot(2200, 3400 + c.G, c.bcam, 500);
    this.slow(3600 + c.G, 3950 + c.G, 0.6);
    this.shot(3400 + c.G, 4400 + c.G, () => {
      const p0 = worldPlanes[0].position;
      const R = V(-d.z, 0, d.x);
      return { pos: p0.clone().addScaledVector(d, -1.5 * K).addScaledVector(R, 1.2 * K).add(V(0, 0.4 * K, 0)), look: p0.clone().addScaledVector(d, 2 * K), fov: 36 };
    });
    this.shot(4400 + c.G, 5000 + c.G, (t) => { const tac = this.h.tactical(); const k = smooth(prog(t, 4400 + c.G, 5000 + c.G)); const p0 = worldPlanes[0].position.clone().add(V(0, 4 * K, 0)); return { pos: lerpV(c.T.P(-1.5, 1.2, 1.4), p0.clone().add(V(0, 4 * K, 6 * K)), 0.5).lerp(tac.pos, k), look: lerpV(cells[0], tac.look, k), fov: lerp(40, tac.fov, k) }; });
    // thả bom/tên lửa, mỗi quả một ô theo trục tăng
    c.shot.cells.slice(0, 3).forEach((cell, i) => {
      const ti = drops[i];
      this.at(ti - fall, () => {
        const from = pos(i, this.clock).setY(1.8 * K), to = c.cw(cell).setY(0.1);
        this.projectile((u) => lerpV(from, to, u).add(V(0, -0.2 * K * Math.sin(u * Math.PI), 0)).setY(lerp(from.y, 0.1, u * u)), this.clock, ti, 'bomb');
      });
      mark(ti);
      this.cellImpact(c, cell, 'bomb', ti);
    });
  }

  // ---------- chế độ ngắn: chỉ cảnh trúng đích ~1.2 s ----------
  private buildShort(c: Ctx): number {
    this.shot(0, 3000, (t) => ({ pos: c.T.P(-3.0 + 0.4 * prog(t, 0, 1500), 0.5, 3.2), look: c.C.clone(), fov: 36 }));
    const order = c.shot.cells;
    let last = 0;
    if (c.shot.attack === 'torpedo') {
      order.forEach((cell, i) => {
        const ti = 150 + (i + 1) * (700 / order.length);
        const w = c.cw(cell).setY(0.03);
        this.at(ti, () => this.h.fx.ring(w, 0.7, 0.5, 0xbfe6f5));
        this.cellImpact(c, cell, 'torpedo', ti);
        last = Math.max(last, ti);
      });
      return last;
    }
    order.forEach((cell, i) => {
      const ti = 600 + i * 150;
      const to = c.cw(cell).setY(0.1), from = to.clone().addScaledVector(c.dir, -8 * K).add(V(0, 5 * K, 0));
      this.projectile((u) => lerpV(from, to, u), ti - 450, ti, c.shot.attack === 'rapid' || c.shot.attack === 'precision' ? 'shell' : 'missile');
      this.cellImpact(c, cell, c.shot.attack === 'line3' ? 'bomb' : c.shot.attack === 'cross' ? 'missile' : 'shell', ti);
      last = Math.max(last, ti);
    });
    return last;
  }

  // ---------- cảnh chìm 3600 ms + đuôi chìm nốt (design/sinking.md) ----------
  /**
   * Mỗi loại tàu một kiểu: khóa (chúi°, nghiêng°, Δy ô) tại 0/600/…/3600 ms (sinking.md 2.2) cộng chuyển động và hiệu ứng riêng (2.3).
   * Đuôi chìm nốt (sau 3600) đáng lẽ không chặn; ở đây chặn thêm SINK_TAIL ms để cinematic dọn sạch an toàn (ghi ở PROGRESS).
   */
  private sinkPhase(sunk: Extract<GameEvent, { type: 'ShipSunk' }>[], s0: number) {
    const owner: ZoneOwner = sunk[0].owner === this.o.viewer ? 'own' : 'enemy';
    const rigs = sunk.map((e) => {
      const o: ZoneOwner = e.owner === this.o.viewer ? 'own' : 'enemy';
      const existing = o === 'own' ? this.h.rig('own', e.shipId) : undefined;
      const cells = e.cells;
      const orientation: 'h' | 'v' = cells.length > 1 && cells[1].y !== cells[0].y ? 'v' : 'h';
      return { e, o, rig: this.touch(existing ?? this.h.wreckRig(o, e.shipId, cells[0], orientation)) };
    });
    const mid = rigs.reduce((a, r) => a.add(this.wp(r.rig)), V()).multiplyScalar(1 / rigs.length);
    const dir = owner === 'enemy' ? V(0, 0, -1) : V(0, 0, 1);
    const T = Frame.toward(mid.clone().setY(0), dir);
    const big = rigs.reduce((m, r) => Math.max(m, SPECS[r.e.shipId].size), 1);
    // máy quay: bắt đầu gần, lùi dần 0.4 → 0.9 và nâng lên, xoay chậm 20°
    const cam = (t: number) => {
      const k = smooth(prog(t, s0, s0 + SINK_MS)), r = (2.2 + big * 0.5) * (1 + 1.6 * k), yaw = deg(20) * k;
      const p = T.P(-r * Math.cos(yaw), r * Math.sin(yaw) + 0.4, 2.0 + 1.6 * big * 0.3 * k + r * 0.25);
      return { pos: p, look: mid.clone().setY(0.1 * K), fov: 36 };
    };
    this.shot(s0, s0 + SINK_MS + SINK_TAIL, cam);
    for (const { e, o, rig } of rigs) {
      const id = e.shipId, parts = rig.userData.parts, len = SPECS[id].size, key = SINK_KEYS[id];
      const side = (e.cells[e.cells.length - 1].x + e.cells[e.cells.length - 1].y) % 2 ? 1 : -1; // nghiêng về mạn có ô trúng cuối
      const fire = (k: number) => this.wp(rig).add(rig.getWorldDirection(V()).multiplyScalar((k - 2) * (len / 5) * K)).setY(0.15 * K);
      // giật 0–300 ms do sức nổ, rồi nội suy bảng khóa
      this.range(s0, s0 + SINK_MS + SINK_TAIL, () => {
        const t = this.clock - s0, kf = SINK_TAIL_KEY(key, t);
        const shake = t < 300 ? Math.sin((t / 300) * Math.PI) * deg(2) : 0;
        rig.userData.kick.pitch = deg(kf[0]) + shake;
        rig.userData.kick.roll = deg(kf[1]) * side + shake * 0.5;
        rig.userData.yOffset = kf[2] * K;
      });
      // nổ đầu (0–300 ms): fx_hit ở các điểm dọc thân, rung, chớp cam
      this.at(s0, () => {
        for (let k = 0; k < 5; k++) { const p = fire(k); this.at(this.clock + k * 50, () => this.h.fx.hit(p, id === 'submarine')); }
        this.h.fx.light(this.wp(rig).add(V(0, 0.5 * K, 0)), 160, 300);
        this.shake(0.12);
      });
      // khói và bọt khí suốt cảnh (id tàu ngầm: bọt khí nhiều, không lửa)
      this.range(s0 + 300, s0 + 2400, () => {
        if (Math.random() < 0.55) this.h.fx.burst({ pos: this.wp(rig).add(V((Math.random() - 0.5) * len * 0.5, 0.1, (Math.random() - 0.5) * 0.5).multiplyScalar(K)), tex: id === 'submarine' ? 'drop' : 'smoke', size: [0.15, 0.7], life: [0.6, 1.2], opacity: 0.5, color: id === 'submarine' ? 0xffffff : 0x1b1d1f, vel: V(0.1, 0.6, 0) });
      });
      this.at(s0 + 1200, () => this.h.fx.setOil(`${o}:${id}`, this.wp(rig).setY(0), (0.6 + len * 0.25) * K)); // dầu loang từ 1200 ms
      this.at(s0 + SINK_MS + SINK_TAIL - 100, () => { rig.visible = false; this.h.fx.ring(this.wp(rig).setY(0), 2.5, 0.8, 0x777777); });
      // tháp pháo xoay lệch ±30° ở 800 ms (trừ trường hợp riêng), đèn/radar tắt là chi tiết model nên bỏ qua
      if (id !== 'escort' && id !== 'destroyer') this.range(s0 + 800, s0 + 1200, (u) => parts.turrets.forEach((tu, i) => { tu.yaw.rotation.y = deg(i % 2 ? -30 : 30) * smooth(u); tu.pitch.rotation.x = deg(10) * smooth(u); }));
      this.sinkExtras(id, rig, s0, T);
    }
  }

  /** Vật bay ballistic: hiện bản sao `src` (tách khỏi tàu), bay theo cung, rơi xuống nước gây cột nước. */
  private fly(src: THREE.Object3D, s0: number, vel: THREE.Vector3, spin: number) {
    src.updateWorldMatrix(true, true);
    const clone = src.clone(true);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    src.matrixWorld.decompose(p, q, sc);
    clone.position.copy(p); clone.quaternion.copy(q); clone.scale.copy(sc);
    clone.visible = false;
    this.add(clone);
    this.hidden.push(src);
    let landed = false;
    this.range(s0, s0 + 2600, () => {
      const e = (this.clock - s0) / 1000;
      if (e < 0) return;
      clone.visible = true; src.visible = false;
      const y = p.y + vel.y * e - 0.5 * 2.0 * K * e * e;
      clone.position.set(p.x + vel.x * e, Math.max(y, -0.2 * K), p.z + vel.z * e);
      clone.rotation.x += spin * 0.016; clone.rotation.z += spin * 0.01;
      if (y < 0 && !landed) { landed = true; this.h.fx.splash(clone.position.clone().setY(0), false); clone.visible = false; }
    });
  }

  private sinkExtras(id: ShipId, rig: ShipRig, s0: number, T: Frame) {
    const parts = rig.userData.parts;
    const wpos = (o: THREE.Object3D) => this.wp(o);
    const named = (n: string) => { let f: THREE.Object3D | undefined; rig.traverse((o) => { if (!f && o.name === n) f = o; }); return f; };
    switch (id) {
      case 'destroyer': { // tháp pháo trước bị bật bay
        const tu = parts.turrets[0];
        if (tu) this.at(s0 + 50, () => { this.h.fx.hit(wpos(tu.yaw), false); this.fly(tu.yaw, this.clock, V((Math.random() - 0.5) * 0.2, 0.9, (Math.random() - 0.5) * 0.2).multiplyScalar(K), 6); });
        break;
      }
      case 'cruiser': // nổ dây chuyền ba tháp pháo, cách 200 ms
        parts.turrets.slice(0, 3).forEach((tu, i) => this.at(s0 + i * 200, () => {
          const p = wpos(tu.yaw);
          this.h.fx.hit(p, false);
          this.h.fx.burst({ pos: p, count: 8, tex: 'fire', size: [0.4, 1.2], life: [0.3, 0.6], additive: true, vel: V(0, 2.5, 0), spread: 1.2, color: 0xff9a2a });
          this.shake(0.05);
        }));
        break;
      case 'missile': { // tên lửa tự phóng loạn từ 600 đến 2000 ms (tối đa 8 vệt)
        parts.launchers.forEach((l, i) => this.range(s0 + 300 + i * 60, s0 + 800 + i * 60, () => { l.base.visible = true; }));
        let n = 0;
        for (let i = 0; i < 8; i++) {
          this.at(s0 + 600 + i * 175, () => {
            const l = parts.launchers[n++ % Math.max(1, parts.launchers.length)];
            const from = l ? wpos(l.muzzle) : wpos(rig);
            const ang = Math.random() * Math.PI * 2, rad = (3 + Math.random() * 5) * K;
            const to = from.clone().add(V(Math.cos(ang) * rad, 0, Math.sin(ang) * rad)).setY(0.1);
            const apex = (4 + Math.random() * 5) * K;
            this.projectile((u) => lerpV(from, to, u).add(V(0, Math.sin(u * Math.PI) * apex + u * 0.5 * K, 0)), this.clock, this.clock + 900, 'missile');
            this.h.fx.burst({ pos: from, vel: V(0, 1.5, 0), count: 8, tex: 'smoke', size: [0.2, 1.0], life: [0.8, 1.4], spread: 0.5, opacity: 0.6, color: 0xffffff });
            this.h.fx.burst({ pos: from, count: 3, tex: 'fire', size: [0.3, 0.8], life: [0.15, 0.3], additive: true });
            this.at(this.clock + 900, () => this.h.fx.hit(to.clone().setY(0.1), false));
          });
        }
        break;
      }
      case 'submarine': { // tiềm vọng thụt, nén vỡ ở 2200 ms: vòng sóng xung kích và cột nước thấp
        const per = named('periscope');
        if (per) { const y0 = per.position.y; this.moved.set(per, per.position.clone()); this.range(s0, s0 + 700, (u) => { per.position.y = y0 - 0.17 * smooth(u); }); }
        this.range(s0, s0 + 700, () => { if (Math.random() < 0.8) this.h.fx.burst({ pos: wpos(rig).add(V((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 2).multiplyScalar(K)), tex: 'drop', size: [0.1, 0.05], life: [0.5, 0.9], vel: V(0, 1, 0), spread: 0.6, grav: 3 }); });
        this.at(s0 + 2200, () => {
          const p = wpos(rig).setY(0);
          this.h.fx.ring(p, 3.5, 0.9, 0xbfe6f5);
          this.h.fx.splash(p, false);
          this.h.fx.light(p.clone().setY(-0.2 * K), 80, 300, 0x66c8ff);
          this.shake(0.1);
        });
        this.range(s0 + 2700, s0 + 3600, () => { if (Math.random() < 0.7) this.h.fx.burst({ pos: wpos(rig).setY(0.05).add(V((Math.random() - 0.5) * K, 0, (Math.random() - 0.5) * K)), tex: 'drop', size: [0.15, 0.08], life: [0.6, 1.0], vel: V(0, 0.8, 0), spread: 0.4, grav: 2 }); });
        break;
      }
      case 'carrier': // máy bay đậu nổ lần lượt cách 250 ms
        [...parts.planes, ...(() => { const extra: THREE.Object3D[] = []; rig.traverse((o) => { if (o.name === 'plane_3') extra.push(o); }); return extra; })()].forEach((pl, i) => this.at(s0 + 700 + i * 250, () => {
          const p = wpos(pl);
          this.h.fx.hit(p, false);
          this.h.fx.burst({ pos: p, count: 6, tex: 'fire', size: [0.5, 1.4], life: [0.3, 0.6], additive: true, vel: V(0, 2, 0), spread: 1.2, color: 0xff9a2a });
          pl.visible = false; this.hidden.push(pl);
          this.shake(0.06);
        }));
        for (let i = 0; i < 6; i++) this.at(s0 + 150 + i * 350, () => this.h.fx.hit(wpos(rig).add(V((Math.random() - 0.5) * 3, 0.4, (Math.random() - 0.5) * 8).multiplyScalar(K * 0.5)), false));
        break;
      case 'escort': { // CIWS bắn loạn, vòm radar bật tung, giàn mồi nhử bung chaff
        parts.turrets.forEach((tu) => this.range(s0, s0 + 600, (u) => { tu.yaw.rotation.y = Math.sin(u * 14 + tu.yaw.id) * 2; if (Math.random() < 0.5) this.h.fx.burst({ pos: wpos(tu.yaw).add(V(0, 0.15 * K, 0)), count: 2, tex: 'glow', size: [0.08, 0.02], life: [0.08, 0.15], additive: true, color: 0xffa83a, vel: V((Math.random() - 0.5) * 3, 1.5, (Math.random() - 0.5) * 3), spread: 1 }); }));
        const dome = named('radome');
        if (dome) this.at(s0 + 900, () => { this.h.fx.hit(wpos(dome), false); this.fly(dome, this.clock, V((Math.random() - 0.5) * 0.3, 1.1, (Math.random() - 0.5) * 0.3).multiplyScalar(K), 4); });
        for (let i = 1; i <= 4; i++) {
          const d = named(`decoy_${i}`);
          if (d) this.at(s0 + 700 + i * 150, () => this.h.fx.burst({ pos: wpos(d).add(V(0, 0.2 * K, 0)), count: 14, tex: 'spark', size: [0.1, 0.03], life: [0.7, 1.4], vel: V(0, 1.4, 0), spread: 2.4, grav: 0.8, additive: true, color: 0xe8eef4 })); // chaff bạc
        }
        break;
      }
      default: break; // raider: chỉ theo bảng khóa (lật úp nhanh)
    }
    void T;
  }
}

/** Thời lượng chặn của cảnh chìm (sinking.md 2.1) và phần đuôi chìm nốt (sinking.md: tối đa 2000 ms, ở đây 1200 ms nằm trong thời gian chặn). */
const SINK_MS = 3600, SINK_TAIL = 1200;

/** Khóa (chúi°, nghiêng°, Δy ô) tại 0, 600, …, 3600 ms (sinking.md 2.2). `@` trong tài liệu (mốc riêng của tàu cắn lén) được làm tròn về lưới 600 ms. */
const SINK_KEYS: Record<ShipId, [number, number, number][]> = {
  destroyer: [[0, 0, 0], [2, 4, -0.01], [18, 10, -0.10], [34, 16, -0.30], [52, 22, -0.55], [68, 26, -0.85], [78, 28, -1.20]],
  cruiser: [[0, 0, 0], [0, 4, -0.01], [3, 16, -0.03], [5, 36, -0.08], [6, 62, -0.16], [8, 84, -0.28], [12, 96, -0.60]],
  missile: [[0, 0, 0], [0, 2, -0.01], [-4, 5, -0.04], [-10, 8, -0.10], [-20, 12, -0.22], [-32, 16, -0.45], [-42, 18, -0.80]],
  submarine: [[0, 0, 0], [2, 0, -0.03], [6, 2, -0.12], [10, 3, -0.30], [16, 5, -0.60], [24, 6, -1.00], [30, 8, -1.50]],
  carrier: [[0, 0, 0], [0, 3, -0.01], [1, 10, -0.03], [3, 22, -0.07], [-4, 34, -0.12], [-8, 42, -0.20], [-10, 48, -0.30]],
  raider: [[0, 0, 0], [8, 12, -0.01], [14, 60, -0.03], [12, 110, -0.04], [6, 178, -0.10], [6, 180, -0.20], [10, 180, -0.45]],
  escort: [[0, 0, 0], [0, 2, -0.01], [2, 8, -0.04], [3, 16, -0.12], [4, 24, -0.28], [5, 28, -0.50], [6, 32, -0.80]],
};
/** Đuôi chìm nốt: tiếp tục theo xu hướng dòng cuối; tàu sân bay nghiêng tới 60° rồi chìm hẳn. */
const SINK_TAIL_END: Record<ShipId, [number, number, number]> = {
  destroyer: [84, 30, -2.2], cruiser: [14, 100, -1.6], missile: [-48, 20, -1.8], submarine: [34, 8, -2.4],
  carrier: [-12, 60, -2.2], raider: [10, 180, -1.2], escort: [7, 34, -1.8],
};
/** Nội suy mượt (cosine) giữa các khóa, rồi tới đuôi chìm nốt. */
function SINK_TAIL_KEY(key: [number, number, number][], t: number): [number, number, number] {
  const id = Object.keys(SINK_KEYS).find((k) => SINK_KEYS[k as ShipId] === key) as ShipId;
  const frames = [...key, SINK_TAIL_END[id]], times = [0, 600, 1200, 1800, 2400, 3000, 3600, 3600 + SINK_TAIL];
  if (t <= 0) return key[0];
  if (t >= times[times.length - 1]) return frames[frames.length - 1];
  let i = 0;
  while (t > times[i + 1]) i++;
  const u = smooth((t - times[i]) / (times[i + 1] - times[i]));
  return [lerp(frames[i][0], frames[i + 1][0], u), lerp(frames[i][1], frames[i + 1][1], u), lerp(frames[i][2], frames[i + 1][2], u)];
}

interface Ctx {
  shot: Extract<GameEvent, { type: 'ShotFired' }>;
  results: Map<string, Extract<GameEvent, { type: 'CellResolved' }>>;
  shooterOwner: ZoneOwner; target: ZoneOwner;
  cw: (c: Cell) => THREE.Vector3; cellsW: THREE.Vector3[]; C: THREE.Vector3;
  rig: ShipRig; SF: Frame; frameNow: () => Frame; T: Frame; dir: THREE.Vector3;
  /** Ô bị hộ vệ triệt tiêu, các mốc tImpact của chúng, khoảng chèn G (ms), mốc bắt đầu chèn, camera cảnh kết quả. */
  nullified: Set<string>; nullTimes: number[]; G: number; gs: number; bcam: (t: number) => CamPose;
}
