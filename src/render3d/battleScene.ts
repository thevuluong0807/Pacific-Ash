import * as THREE from 'three';
import type { Cell, CellMark, CellView, GameEvent, ShipAttack, ShipId } from '../../design/core-api';
import { AimOverlay } from './aimOverlay';
import { CELL, shipLift } from './scale';
import { loadSpecs } from '../core/specs';
import type { Engine } from './engine';
import { floatOnWaves } from './buoyancy';
import { Cinematic, type CamPose, type CineHost, type CineOpts, type ZoneOwner } from './cinematic';
import { Fx } from './fx3d';
import { ShipWreckFx, WreckField, type HitCell } from './wreck';
import type { RenderScene } from './renderScene';
import { footprintCenter, placeholderShip, type ShipPose, type ShipRig } from './shipModels';
import { createWorld } from './createWorld';
import type { MapWorld, QualityConfig } from './mapWorld';
import type { MapId } from '../ui/settings';

const SPECS = loadSpecs();
export type { ZoneOwner };
const Z_CENTER: Record<ZoneOwner, number> = { own: 7.5 * CELL, enemy: -7.5 * CELL };

/** Hàm duy nhất đổi ô lưới sang tọa độ thế giới (design/env-and-fx.md mục 1): x = cell.x − 4.5, z = zCenter + (cell.y − 4.5). */
export function cellToWorld(owner: ZoneOwner, cell: Cell): THREE.Vector3 {
  return new THREE.Vector3((cell.x - 4.5) * CELL, 0, Z_CENTER[owner] + (cell.y - 4.5) * CELL);
}

export type BattleMode = 'placement' | 'battle' | 'result';
/** Độ đậm của lớp lưới vẽ xuyên sóng, so với lớp thường. */
const GHOST = 0.45;
const TACTICAL = { pos: new THREE.Vector3(0, 17 * CELL, 24 * CELL), look: new THREE.Vector3(0, 0, -1 * CELL), fov: 38 };
/** Zoom ra xa tối đa: quá mức này lộ mép phông nền. */
const MAX_DIST = 44 * CELL;
const DECOY_AT = new THREE.Vector3(0, 0, -16.5 * CELL); // tàu bắn của địch: cố định sau lưới địch, không lộ vị trí thật

interface Entry { obj: ShipRig; pose: ShipPose; owner: ZoneOwner; phase: number; heading: number; fixed?: THREE.Vector3 }

/** Cảnh trận đấu: hai vùng biển 10×10 đối diện, camera tactical/result và cinematic. Tàu là placeholder tới khi có glb. */
export class BattleScene implements RenderScene, CineHost {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.05 * CELL, 420 * CELL); // near 0.5, far 3000 ở CELL 10 (world-scale.md 2.2) cộng đệm vòm trời, tỉ lệ theo CELL
  private world?: MapWorld;
  private renderer?: THREE.WebGLRenderer;
  private map: MapId = 'truong_sa';
  private pendingMap: MapId | null = null;
  get vignette() { return this.world?.style.vignette ?? 0.25; }
  fx!: Fx;
  private cine!: Cinematic;
  /** Cảnh chìm còn chạy sau khi cinematic chính trả quyền camera ("tàu chìm chạy nền", đuôi chìm nốt). */
  private bgSinks: Cinematic[] = [];
  private camRoll = 0;
  private barEls?: [HTMLDivElement, HTMLDivElement];
  private mode: BattleMode = 'battle';
  private modeSince = 0;
  private aspect = 1.6;
  private clockT = 0;
  private ships = new Map<string, Entry>();
  private temps: Entry[] = [];
  /** Xác tàu đắm nửa chìm (sau khi bắn hạ), ở lại cháy nổ đến hết ván; dọn khi đặt tàu ván mới. */
  private wrecks: { e: Entry; fx: ShipWreckFx }[] = [];
  private lattice: Record<ZoneOwner, THREE.LineSegments> | undefined;
  private shakeAmp = 0;
  private lookTarget = TACTICAL.look.clone();
  private tacPose: CamPose = { pos: TACTICAL.pos.clone(), look: TACTICAL.look.clone(), fov: TACTICAL.fov };
  private lastFleets: { own: ShipPose[]; enemySunk: ShipPose[] } = { own: [], enemySunk: [] };
  private pendingFleets: { own: ShipPose[]; enemySunk: ShipPose[] } | null = null;
  private lastHits: { own: HitCell[]; enemy: HitCell[] } = { own: [], enemy: [] };
  wreck!: WreckField;
  private view: '2d' | '3d' = '2d';
  /** Quỹ đạo 360° quanh điểm (cx, cz); kéo chuột phải / Shift / chuột giữa hoặc WASD để dời điểm, nút Lưới địch/Lưới ta nhảy tới. */
  private orbit = { az: 0, el: 0.6, dist: 36 * CELL, cx: 0, cz: 0 };
  private focusGoal: { x: number; z: number } | null = null;
  private overlay!: AimOverlay;
  private input?: { onCell(c: Cell): void; onHover(c: Cell | null): void };
  private dom?: HTMLElement;
  private endUntil = 0;
  private endResolve?: () => void;
  private quality: QualityConfig = { rain: true, fog: true, oceanReflection: false, particleScale: 0.8, pixelRatioMax: 1.5 };

  enter(engine: Engine) {
    if (this.world) return;
    this.renderer = engine.renderer;
    this.world = createWorld(this.map, this.scene, engine.renderer, 'play');
    this.fx = new Fx((x, z, t) => this.world!.heightAt(x, z, t));
    this.fx.style = this.world.style;
    this.fx.unit = CELL;
    this.scene.add(this.fx.group);
    this.wreck = new WreckField(this.fx, (x, z, t) => this.world!.heightAt(x, z, t), cellToWorld, (id) => this.ships.get(`own:${id}`)?.heading);
    this.scene.add(this.wreck.group);
    this.cine = new Cinematic(this);
    this.overlay = new AimOverlay();
    this.overlay.setVisible(false);
    this.scene.add(this.overlay.group);
    this.dom = engine.renderer.domElement;
    const mk = (owner: ZoneOwner, color: string, opacity: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i++) {
        pts.push(new THREE.Vector3((i - 5) * CELL, 0.12, Z_CENTER[owner] - 5 * CELL), new THREE.Vector3((i - 5) * CELL, 0.12, Z_CENTER[owner] + 5 * CELL));
        pts.push(new THREE.Vector3(-5 * CELL, 0.12, Z_CENTER[owner] + (i - 5) * CELL), new THREE.Vector3(5 * CELL, 0.12, Z_CENTER[owner] + (i - 5) * CELL));
      }
      // Lưới sáng hơn 125% so với trước; hai lớp: lớp thường (bị sóng che) và lớp mờ vẽ xuyên sóng để lưới không biến mất khi sóng lướt qua.
      const c = new THREE.Color(color).multiplyScalar(1.25);
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: opacity * 1.25, depthWrite: false, fog: false }));
      const ghost = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: opacity * 1.25 * GHOST, depthWrite: false, depthTest: false, fog: false }));
      l.renderOrder = 4; ghost.renderOrder = 4;
      l.add(ghost);
      this.scene.add(l);
      return l;
    };
    this.lattice = { own: mk('own', '#4FC3E8', 0.35), enemy: mk('enemy', '#E8742A', 0.15) };
    this.applyMode();
    this.setFleets(this.lastFleets.own, this.lastFleets.enemySunk);
    this.syncHits(this.lastHits.own, this.lastHits.enemy);
    this.setQuality(this.quality);
  }

  /** Đổi map: nếu đang phát cinematic thì chờ phát xong mới đổi (maps.md mục 1). Trạng thái trận giữ nguyên. */
  setMap(map: MapId) {
    if (map === this.map && !this.pendingMap) return;
    if (!this.world) { this.map = map; return; }
    this.pendingMap = map;
  }
  get currentMap() { return this.map; }
  private applyPendingMap() {
    const map = this.pendingMap;
    if (!map || !this.world || this.busy()) return;
    this.pendingMap = null;
    if (map === this.map) return;
    this.world.dispose();
    this.map = map;
    this.world = createWorld(map, this.scene, this.renderer!, 'play');
    this.world.setQuality(this.quality);
    this.fx.style = this.world.style;
    this.world.setMood(this.mood);
  }
  private mood: 'win' | 'lose' | null = null;
  setOutcome(win: boolean | null) { this.mood = win === null ? null : win ? 'win' : 'lose'; this.world?.setMood(this.mood); }

  setQuality(q: QualityConfig) {
    this.quality = q;
    this.world?.setQuality(q);
    if (this.fx) this.fx.particleScale = q.particleScale;
    if (this.wreck) this.wreck.low = !q.rain && !q.fog;
  }

  setMode(mode: BattleMode) {
    if (mode === 'placement') this.clearWrecks();
    this.mode = mode;
    this.modeSince = this.clockT;
    this.applyMode();
  }
  private applyMode() {
    if (!this.lattice) return;
    // đặt tàu: chỉ lưới mình sáng; trận đấu: cả hai lưới
    const set = (l: THREE.LineSegments, o: number) => {
      (l.material as THREE.LineBasicMaterial).opacity = o * 1.25;
      ((l.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial).opacity = o * 1.25 * GHOST;
    };
    set(this.lattice.enemy, this.mode === 'placement' ? 0.06 : 0.15);
    set(this.lattice.own, 0.35);
    this.lattice.enemy.visible = this.mode !== 'result';
  }

  // ---------- tàu ----------
  /** Đồng bộ tàu: `own` = tàu người xem (tàu đã chìm chỉ còn vết dầu); `enemySunk` = tàu địch đã chìm (chỉ vết dầu; tàu chưa chìm không vẽ để khỏi lộ vị trí). */
  setFleets(own: ShipPose[], enemySunk: ShipPose[]) {
    this.lastFleets = { own, enemySunk };
    if (!this.world) return;
    if (this.busy()) { this.pendingFleets = { own, enemySunk }; return; } // đang chiếu: chờ xong mới đổi (để cảnh chìm còn tàu)
    const want = new Map<string, { pose: ShipPose; owner: ZoneOwner }>();
    own.filter((p) => !p.sunk).forEach((p) => want.set(`own:${p.id}`, { pose: p, owner: 'own' }));
    for (const [k, v] of this.ships) {
      const w = want.get(k);
      if (!w || w.pose.origin.x !== v.pose.origin.x || w.pose.origin.y !== v.pose.origin.y || w.pose.orientation !== v.pose.orientation) {
        this.scene.remove(v.obj);
        this.ships.delete(k);
      }
    }
    for (const [k, w] of want) {
      const cur = this.ships.get(k);
      if (cur) { cur.pose = w.pose; continue; }
      this.ships.set(k, this.makeEntry(w.pose, w.owner));
    }
    // vết dầu loang nơi tàu đã chìm
    const sunkKeys = new Set<string>();
    const oil = (owner: ZoneOwner, p: ShipPose) => {
      const k = `${owner}:${p.id}`;
      sunkKeys.add(k);
      const size = SPECS[p.id].size, o = cellToWorld(owner, p.origin), fc = footprintCenter(p.id, p.orientation);
      this.fx.setOil(k, new THREE.Vector3(o.x + fc.dx * CELL, 0, o.z + fc.dz * CELL), (0.6 + size * 0.25) * CELL);
    };
    own.filter((p) => p.sunk).forEach((p) => oil('own', p));
    enemySunk.forEach((p) => oil('enemy', p));
    for (const k of this.fx.oilKeys()) if (!sunkKeys.has(k)) this.fx.setOil(k, null);
  }

  /** Model glb nạp xong: dựng lại các tàu đang hiển thị bằng model mới (không đang chiếu cinematic). */
  reloadShips() {
    if (!this.world) return;
    if (this.busy()) { setTimeout(() => this.reloadShips(), 300); return; }
    for (const v of this.ships.values()) this.scene.remove(v.obj);
    this.ships.clear();
    this.setFleets(this.lastFleets.own, this.lastFleets.enemySunk);
  }

  private makeEntry(pose: ShipPose, owner: ZoneOwner): Entry {
    const obj = placeholderShip(pose.id);
    this.scene.add(obj);
    return { obj, pose, owner, phase: [...pose.id].reduce((a, c) => a + c.charCodeAt(0), 0), heading: pose.orientation === 'h' ? Math.PI / 2 : 0 }; // ngang: mũi +X; dọc: mũi +Z
  }

  /** Lửa kéo dài ở các ô đã trúng (tối đa 16 ngọn cùng lúc). */
  /** Ô trúng hiện thành mảnh xác tàu nổi (design/wreckage.md); ô của tàu địch đã chìm không có mảnh. `own[].ship` cho phép mảnh riêng theo loại tàu mình. */
  syncHits(own: HitCell[], enemy: HitCell[]) {
    this.lastHits = { own, enemy };
    if (!this.world || !this.wreck) return;
    const sunk = new Set<string>();
    for (const p of this.lastFleets.enemySunk) {
      const sp = SPECS[p.id], n = sp.size;
      for (let i = 0; i < n; i++) for (let j = 0; j < (sp.shape === 'square' ? n : 1); j++) sunk.add(sp.shape === 'square' ? `${p.origin.x + i},${p.origin.y + j}` : p.orientation === 'h' ? `${p.origin.x + i},${p.origin.y}` : `${p.origin.x},${p.origin.y + i}`);
    }
    this.wreck.sync(own, enemy.filter((c) => !sunk.has(`${c.x},${c.y}`)), this.clockT);
  }
  /** Tàu chìm khi không có cinematic (tắt cinematic): hoạt cảnh chìm bản rút gọn ở nền, không chặn lượt (wreckage.md 2.1). */
  sinkOnly(e: GameEvent, opts: CineOpts) {
    if (e.type !== 'ShipSunk' || !this.world) return;
    Cinematic.backgroundSink(this, [e], opts);
  }

  // ---------- CineHost ----------
  rig(owner: ZoneOwner, id: ShipId) { return this.ships.get(`${owner}:${id}`)?.obj; }
  decoy(id: ShipId): ShipRig {
    const e = this.makeEntry({ id, origin: { x: 0, y: 0 }, orientation: 'v' }, 'enemy');
    e.heading = 0;
    e.fixed = DECOY_AT;
    this.temps.push(e);
    this.poseShip(e, this.clockT); e.obj.updateMatrixWorld(true); // đặt ngay để cinematic đọc được vị trí trong cùng khung hình
    return e.obj;
  }
  wreckRig(owner: ZoneOwner, id: ShipId, origin: Cell, orientation: 'h' | 'v'): ShipRig {
    const e = this.makeEntry({ id, origin, orientation }, owner);
    this.temps.push(e);
    this.poseShip(e, this.clockT); e.obj.updateMatrixWorld(true);
    return e.obj;
  }
  releaseTemp(rigs: ShipRig[]) {
    const set = new Set(rigs);
    this.temps = this.temps.filter((e) => { if (!set.has(e.obj)) return true; this.scene.remove(e.obj); return false; });
  }
  settle() {
    if (this.busy()) return;
    for (const e of this.ships.values()) { e.obj.visible = true; }
    if (this.pendingFleets) { const p = this.pendingFleets; this.pendingFleets = null; this.setFleets(p.own, p.enemySunk); }
    this.syncHits(this.lastHits.own, this.lastHits.enemy);
  }
  /** Cảnh chìm xong: tàu ở lại làm xác nửa chìm cháy nổ (không gỡ rig). */
  leaveWreck(rig: ShipRig, _owner: ZoneOwner) {
    let e = this.temps.find((x) => x.obj === rig);
    if (e) this.temps = this.temps.filter((x) => x !== e);
    else for (const [k, v] of this.ships) if (v.obj === rig) { e = v; this.ships.delete(k); }
    if (!e) return;
    const fx = new ShipWreckFx(rig, this.fx, this.clockT, !this.quality.rain && !this.quality.fog);
    this.scene.add(fx.group);
    this.wrecks.push({ e, fx });
  }
  private clearWrecks() {
    for (const w of this.wrecks) { this.scene.remove(w.e.obj); w.fx.dispose(); }
    this.wrecks = [];
    this.wreck?.clear();
  }
  wreckSink(owner: ZoneOwner, cells: Cell[], center: THREE.Vector3, speed: number) { this.wreck?.absorb(owner, cells, center, this.clockT, speed); }
  adopt(c: Cinematic) { if (!this.bgSinks.includes(c)) this.bgSinks.push(c); }
  /** Đang chiếu cinematic hoặc còn cảnh chìm chạy nền. */
  private busy() { return !!this.cine?.active || this.bgSinks.some((b) => b.active); }
  /** Khung điện ảnh 2.39:1: hai dải đen trên và dưới, `k` 0..1. */
  bars(k: number) {
    const host = this.dom?.parentElement;
    if (!host) return;
    if (!this.barEls) {
      this.barEls = [0, 1].map((i) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:0;right:0;${i ? 'bottom' : 'top'}:0;height:0;background:#000;pointer-events:none`; host.appendChild(d); return d; }) as [HTMLDivElement, HTMLDivElement];
    }
    const h = Math.max(0, (this.dom!.clientHeight - this.dom!.clientWidth / 2.39) / 2) * k;
    for (const d of this.barEls) d.style.height = `${h}px`;
  }
  cellWorld = cellToWorld;
  heightAt = (x: number, z: number, t: number) => this.world!.heightAt(x, z, t);
  tactical() { return this.tacPose; }
  shake(amplitude: number) { this.shakeAmp = Math.max(this.shakeAmp, amplitude * CELL); } // rung nhân 10 theo tỉ lệ thế giới
  setUnderwater(on: boolean) { this.world?.setUnderwater(on); }
  now() { return this.clockT; }

  // ---------- chế độ xem 3D (quỹ đạo, ô nhắm, đường đạn) ----------
  /** Bật/tắt xem 3D. `input` nhận chạm ô lưới địch và rê chuột; null khi tắt. */
  setView(view: '2d' | '3d', input?: { onCell(c: Cell): void; onHover(c: Cell | null): void }) {
    this.detachInput();
    this.view = view;
    this.input = input;
    this.overlay?.setVisible(view === '3d');
    if (view === '3d' && this.dom) this.attachInput(this.dom);
    if (view === '2d') { this.overlay?.setHover(null); this.overlay?.setAim({ attack: null, cells: [], valid: false, from: null }); }
  }
  resetOrbit() { this.orbit = { az: 0, el: 0.6, dist: 36 * CELL, cx: 0, cz: 0 }; this.focusGoal = null; }
  /** Chuyển tâm quỹ đạo sang giữa trận, lưới địch hoặc lưới mình (trượt mượt, zoom gần lại khi nhìn một lưới). */
  setFocus(f: 'center' | 'enemy' | 'own') {
    this.focusGoal = { x: 0, z: f === 'enemy' ? Z_CENTER.enemy : f === 'own' ? Z_CENTER.own : 0 };
    this.orbit.dist = f === 'center' ? 36 * CELL : 24 * CELL;
  }
  private clampOrbit() {
    const o = this.orbit;
    o.cx = Math.min(14 * CELL, Math.max(-14 * CELL, o.cx)); o.cz = Math.min(22 * CELL, Math.max(-22 * CELL, o.cz));
    o.dist = Math.min(MAX_DIST, Math.max(5 * CELL, o.dist));
  }
  /** Dời tâm quỹ đạo theo màn hình: `right` sang phải, `ahead` ra xa (đơn vị thế giới). */
  private panBy(right: number, ahead: number) {
    const o = this.orbit, s = Math.sin(o.az), c = Math.cos(o.az);
    o.cx += c * right - s * ahead; o.cz += -s * right - c * ahead;
    this.focusGoal = null;
    this.clampOrbit();
  }
  private onKey = (e: KeyboardEvent) => {
    if (this.view !== '3d' || this.cine?.active || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const st = this.orbit.dist * 0.08;
    const m: Record<string, [number, number]> = { w: [0, st], s: [0, -st], a: [-st, 0], d: [st, 0], arrowup: [0, st], arrowdown: [0, -st], arrowleft: [-st, 0], arrowright: [st, 0] };
    const v = m[e.key.toLowerCase()];
    if (v) { e.preventDefault(); this.panBy(v[0], v[1]); }
  };
  setOverlay(own: CellView[][], enemy: CellView[][], marks: CellMark[][]) { this.overlay?.setMarks(own, enemy, marks); }
  /** Vùng nhắm và đường đạn của tàu chọn (shipId null: xóa). */
  setAim(a: { shipId: ShipId | null; attack: ShipAttack | null; cells: Cell[]; valid: boolean }) {
    if (!this.overlay) return;
    let from: THREE.Vector3 | null = null;
    const rig = a.shipId ? this.rig('own', a.shipId) : undefined;
    if (rig) {
      const p = rig.userData.parts;
      rig.updateWorldMatrix(true, true);
      const anchor = a.attack === 'cross' && p.launchers.length ? p.launchers[0].muzzle : p.turrets.length && a.attack !== 'torpedo' && a.attack !== 'line3' ? p.turrets[0].muzzle : p.launch;
      from = anchor.getWorldPosition(new THREE.Vector3());
    }
    this.overlay.setAim({ attack: a.shipId ? a.attack : null, cells: a.shipId ? a.cells : [], valid: a.valid, from });
  }

  private ptr = { down: false, moved: false, x: 0, y: 0, pan: false };
  private onDown = (e: PointerEvent) => { this.ptr = { down: true, moved: false, x: e.clientX, y: e.clientY, pan: e.button === 1 || e.button === 2 || e.shiftKey }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  private onMove = (e: PointerEvent) => {
    if (this.cine?.active) return;
    if (this.ptr.down) {
      const dx = e.clientX - this.ptr.x, dy = e.clientY - this.ptr.y;
      if (!this.ptr.moved && Math.hypot(dx, dy) < 5) return;
      this.ptr.moved = true;
      if (this.ptr.pan) { const k = this.orbit.dist * 0.0011; this.panBy(-dx * k, dy * k); } // kéo trượt: cảnh đi theo con trỏ
      else {
        this.orbit.az -= dx * 0.006;
        this.orbit.el = Math.min(1.45, Math.max(0.12, this.orbit.el + dy * 0.005));
      }
      this.ptr.x = e.clientX; this.ptr.y = e.clientY;
      return;
    }
    const c = this.pick(e);
    this.overlay.setHover(c);
    this.input?.onHover(c);
  };
  private onUp = (e: PointerEvent) => {
    const moved = this.ptr.moved;
    this.ptr.down = false;
    if (moved || this.cine?.active) return;
    const c = this.pick(e);
    if (c) this.input?.onCell(c);
  };
  private onWheel = (e: WheelEvent) => { e.preventDefault(); this.orbit.dist *= Math.exp(e.deltaY * 0.001); this.clampOrbit(); };
  private onMenu = (e: Event) => e.preventDefault();
  private attachInput(el: HTMLElement) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.onDown); el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp); el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', this.onMenu);
    addEventListener('keydown', this.onKey);
  }
  private detachInput() {
    const el = this.dom;
    if (!el) return;
    el.style.touchAction = '';
    el.removeEventListener('pointerdown', this.onDown); el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerup', this.onUp); el.removeEventListener('pointercancel', this.onUp);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('contextmenu', this.onMenu);
    removeEventListener('keydown', this.onKey);
  }
  /** Ô lưới địch dưới con trỏ (giao tia với mặt nước y=0), hoặc null. */
  private pick(e: PointerEvent): Cell | null {
    const r = this.dom!.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!hit) return null;
    const x = Math.floor(hit.x / CELL + 5), y = Math.floor((hit.z - Z_CENTER.enemy) / CELL + 5);
    return x >= 0 && x < 10 && y >= 0 && y < 10 ? { x, y } : null;
  }

  // ---------- điều khiển từ UI ----------
  /** Phát cinematic cho các event của một hành động. Resolve khi xong (hoặc sau `skip`). */
  play(events: GameEvent[], opts: CineOpts): Promise<void> {
    if (!this.world) return Promise.resolve();
    this.camera.near = 0.05 * CELL; this.camera.updateProjectionMatrix();
    return this.cine.play(events, opts);
  }
  skip() { if (this.cine?.active) this.cine.skip(); else this.bgSinks.forEach((b) => b.skip()); }
  /** Đồng hồ cinematic (ms), cho kiểm thử hình ảnh. */
  cineClock() { return this.cine?.time ?? 0; }
  get playing() { return !!this.cine?.active; }
  /** Đòn kết thúc ván: slow-motion 0.4× khoảng 1 s, camera kéo ra rộng. */
  endShot(): Promise<void> {
    if (!this.world) return Promise.resolve();
    this.endUntil = this.clockT + 1;
    return new Promise((res) => { this.endResolve = res; });
  }
  /** Mờ lưới 2D: UI tự làm bằng CSS; hàm này cho test. */
  addShake(a: number) { this.shake(a); }

  update(dt: number, t: number) {
    if (!this.world) return;
    this.clockT = t;
    const ending = this.endUntil > t;
    const sdt = ending ? dt * 0.4 : dt;       // thời gian của hiệu ứng (slow-motion khi kết thúc ván)
    const portrait = Math.max(1, 1.5 / this.aspect); // màn dọc: lùi camera để thấy đủ cả hai vùng
    // camera chiến thuật / result
    let pos: THREE.Vector3, look: THREE.Vector3;
    if (this.mode === 'result') {
      const k = Math.min(1, (t - this.modeSince) / 8);
      pos = new THREE.Vector3(0, (3 + 2 * k) * CELL, (18 + 10 * k) * CELL); look = new THREE.Vector3(0, CELL, -6 * CELL);
    } else {
      pos = new THREE.Vector3(0, TACTICAL.pos.y * portrait, TACTICAL.pos.z * portrait); look = TACTICAL.look.clone();
      if (this.view === '3d' && this.mode === 'battle') { // quỹ đạo 360° quanh tâm trận
        const o = this.orbit;
        if (this.focusGoal) { o.cx += (this.focusGoal.x - o.cx) * Math.min(1, dt * 4); o.cz += (this.focusGoal.z - o.cz) * Math.min(1, dt * 4); }
        const { az, el, dist } = o, d = dist * portrait;
        look = new THREE.Vector3(o.cx, 0, o.cz);
        pos = new THREE.Vector3(o.cx + Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, o.cz + Math.cos(az) * Math.cos(el) * d);
      }
      if (ending) pos.add(new THREE.Vector3(0, 6 * CELL, 10 * CELL)); // kéo ra rộng
    }
    this.tacPose = { pos, look, fov: this.mode === 'result' ? 40 : TACTICAL.fov };

    this.applyPendingMap();
    this.world.setPaused(this.busy()); // sự kiện nền tạm hoãn khi cinematic chạy (+800 ms sau đó)
    for (const s of this.ships.values()) this.poseShip(s, t);
    for (const s of this.temps) this.poseShip(s, t);
    for (const w of this.wrecks) { this.poseShip(w.e, t); w.fx.update(t); }
    this.scene.updateMatrixWorld();

    const cin = this.cine.update(dt);
    this.bgSinks = this.bgSinks.filter((b) => !b.updateBg(dt));
    this.camRoll = cin?.roll ?? 0;
    if (cin) {
      this.camera.position.copy(cin.pos); this.lookTarget.copy(cin.look); this.camera.fov = cin.fov;
      if (!this.cine.active) this.camera.position.copy(this.tacPose.pos);
    } else {
      this.camera.position.lerp(pos, this.camera.position.lengthSq() === 0 ? 1 : 0.07); // chuyển camera ~0.4 s
      this.lookTarget.lerp(look, 0.08);
      this.camera.fov = this.tacPose.fov;
    }
    this.camera.updateProjectionMatrix();
    if (this.shakeAmp > 0.0005) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmp;
      this.shakeAmp *= Math.exp(-dt * 8);
    }
    this.camera.lookAt(this.lookTarget);
    if (this.camRoll) this.camera.rotateZ(this.camRoll);

    if (!this.busy() && this.pendingFleets) { const p = this.pendingFleets; this.pendingFleets = null; this.setFleets(p.own, p.enemySunk); }
    this.overlay.update(t);
    this.fx.update(sdt, t);
    this.wreck?.update(sdt, t);
    this.world.update(sdt, t, this.camera);
    if (this.endResolve && !ending) { const r = this.endResolve; this.endResolve = undefined; r(); }
  }

  private poseShip(s: Entry, t: number) {
    const { pose, obj } = s;
    if (s.fixed) obj.position.copy(s.fixed);
    else {
      const o = cellToWorld(s.owner, pose.origin), fc = footprintCenter(pose.id, pose.orientation);
      // tâm tàu = tâm ô đầu + (size-1)/2 dọc theo hướng; ô chỉ số cao ở phía mũi
      obj.position.set(o.x + fc.dx * CELL, 0, o.z + fc.dz * CELL);
    }
    floatOnWaves(obj, s.heading, obj.userData.half, obj.userData.wide, t, this.world!.heightAt, false); // bám dốc sóng như tàu phông nền (không kẹp ±1°/±1.5°)
    // nhấp nhô thêm theo shipId: lăn ±1.5°, nâng hạ 0.02, chu kỳ 5–8 s
    const per = 5 + (s.phase % 3);
    obj.rotation.z += ((1.5 * Math.PI) / 180) * 0.5 * Math.sin((t / per) * Math.PI * 2 + s.phase) + obj.userData.kick.roll;
    obj.rotation.x += obj.userData.kick.pitch;
    obj.position.y += 0.02 * CELL * Math.sin((t / per) * Math.PI * 2 + s.phase * 2) + obj.userData.yOffset + shipLift(pose.id); // nâng thân theo tỉ lệ mạn khô của tàu nền (tàu ngầm 0)
    obj.userData.heading = s.heading;
  }

  resize(w: number, h: number) {
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }
  exit() { this.barEls?.forEach((d) => d.remove()); this.barEls = undefined; }
}
