import * as THREE from 'three';
import type { Cell, CellMark, CellView, GameEvent, ShipAttack, ShipId } from '../../design/core-api';
import { AimOverlay } from './aimOverlay';
import { CELL } from './scale';
import { loadSpecs } from '../core/specs';
import type { Engine } from './engine';
import { floatOnWaves } from './buoyancy';
import { Cinematic, type CamPose, type CineHost, type CineOpts, type ZoneOwner } from './cinematic';
import { Fx } from './fx3d';
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
const DECOY_AT = new THREE.Vector3(0, 0, -16.5 * CELL); // tàu bắn của địch: cố định sau lưới địch, không lộ vị trí thật

interface Entry { obj: ShipRig; pose: ShipPose; owner: ZoneOwner; phase: number; heading: number; fixed?: THREE.Vector3 }

/** Cảnh trận đấu: hai vùng biển 10×10 đối diện, camera tactical/result và cinematic. Tàu là placeholder tới khi có glb. */
export class BattleScene implements RenderScene, CineHost {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.05, 1500);
  private world?: MapWorld;
  private renderer?: THREE.WebGLRenderer;
  private map: MapId = 'truong_sa';
  private pendingMap: MapId | null = null;
  get vignette() { return this.world?.style.vignette ?? 0.25; }
  fx!: Fx;
  private cine!: Cinematic;
  private mode: BattleMode = 'battle';
  private modeSince = 0;
  private aspect = 1.6;
  private clockT = 0;
  private ships = new Map<string, Entry>();
  private temps: Entry[] = [];
  private lattice: Record<ZoneOwner, THREE.LineSegments> | undefined;
  private shakeAmp = 0;
  private lookTarget = TACTICAL.look.clone();
  private tacPose: CamPose = { pos: TACTICAL.pos.clone(), look: TACTICAL.look.clone(), fov: TACTICAL.fov };
  private lastFleets: { own: ShipPose[]; enemySunk: ShipPose[] } = { own: [], enemySunk: [] };
  private pendingFleets: { own: ShipPose[]; enemySunk: ShipPose[] } | null = null;
  private lastHits: { own: Cell[]; enemy: Cell[] } = { own: [], enemy: [] };
  private view: '2d' | '3d' = '2d';
  private orbit = { az: 0, el: 0.6, dist: 36 * CELL };
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
    if (!map || !this.world || this.cine.active) return;
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
  }

  setMode(mode: BattleMode) {
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
    if (this.cine?.active) { this.pendingFleets = { own, enemySunk }; return; } // đang chiếu: chờ xong mới đổi (để cảnh chìm còn tàu)
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
    if (this.cine?.active) { setTimeout(() => this.reloadShips(), 300); return; }
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
  syncHits(own: Cell[], enemy: Cell[]) {
    this.lastHits = { own, enemy };
    if (!this.world) return;
    const want = new Set<string>();
    const add = (owner: ZoneOwner, cells: Cell[]) => cells.forEach((c) => { const k = `${owner}:${c.x},${c.y}`; want.add(k); this.fx.setFire(k, cellToWorld(owner, c).setY(0.2 * CELL)); });
    add('own', own); add('enemy', enemy);
    for (const k of this.fx.fireKeys()) if (!want.has(k)) this.fx.setFire(k, null);
  }

  // ---------- CineHost ----------
  rig(owner: ZoneOwner, id: ShipId) { return this.ships.get(`${owner}:${id}`)?.obj; }
  decoy(id: ShipId): ShipRig {
    const e = this.makeEntry({ id, origin: { x: 0, y: 0 }, orientation: 'v' }, 'enemy');
    e.heading = 0;
    e.fixed = DECOY_AT;
    this.temps.push(e);
    return e.obj;
  }
  wreckRig(owner: ZoneOwner, id: ShipId, origin: Cell, orientation: 'h' | 'v'): ShipRig {
    const e = this.makeEntry({ id, origin, orientation }, owner);
    this.temps.push(e);
    return e.obj;
  }
  releaseTemp() {
    for (const e of this.temps) this.scene.remove(e.obj);
    this.temps = [];
    for (const e of this.ships.values()) { e.obj.visible = true; }
    if (this.pendingFleets) { const p = this.pendingFleets; this.pendingFleets = null; this.setFleets(p.own, p.enemySunk); }
    this.syncHits(this.lastHits.own, this.lastHits.enemy);
  }
  cellWorld = cellToWorld;
  heightAt = (x: number, z: number, t: number) => this.world!.heightAt(x, z, t);
  tactical() { return this.tacPose; }
  shake(amplitude: number) { this.shakeAmp = Math.max(this.shakeAmp, amplitude); }
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
  resetOrbit() { this.orbit = { az: 0, el: 0.6, dist: 36 * CELL }; }
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

  private ptr = { down: false, moved: false, x: 0, y: 0 };
  private onDown = (e: PointerEvent) => { this.ptr = { down: true, moved: false, x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  private onMove = (e: PointerEvent) => {
    if (this.cine?.active) return;
    if (this.ptr.down) {
      const dx = e.clientX - this.ptr.x, dy = e.clientY - this.ptr.y;
      if (!this.ptr.moved && Math.hypot(dx, dy) < 5) return;
      this.ptr.moved = true;
      this.orbit.az -= dx * 0.006;
      this.orbit.el = Math.min(1.45, Math.max(0.12, this.orbit.el + dy * 0.005));
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
  private onWheel = (e: WheelEvent) => { e.preventDefault(); this.orbit.dist = Math.min(60 * CELL, Math.max(8 * CELL, this.orbit.dist * Math.exp(e.deltaY * 0.001))); };
  private attachInput(el: HTMLElement) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.onDown); el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp); el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
  }
  private detachInput() {
    const el = this.dom;
    if (!el) return;
    el.style.touchAction = '';
    el.removeEventListener('pointerdown', this.onDown); el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerup', this.onUp); el.removeEventListener('pointercancel', this.onUp);
    el.removeEventListener('wheel', this.onWheel);
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
    this.camera.near = 0.05; this.camera.updateProjectionMatrix();
    return this.cine.play(events, opts);
  }
  skip() { this.cine?.skip(); }
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
        const { az, el, dist } = this.orbit, d = dist * portrait;
        pos = new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d); look = new THREE.Vector3(0, 0, 0);
      }
      if (ending) pos.add(new THREE.Vector3(0, 6 * CELL, 10 * CELL)); // kéo ra rộng
    }
    this.tacPose = { pos, look, fov: this.mode === 'result' ? 40 : TACTICAL.fov };

    this.applyPendingMap();
    this.world.setPaused(this.cine.active); // sự kiện nền tạm hoãn khi cinematic chạy (+800 ms sau đó)
    for (const s of this.ships.values()) this.poseShip(s, t);
    for (const s of this.temps) this.poseShip(s, t);
    this.scene.updateMatrixWorld();

    const cin = this.cine.update(dt);
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

    if (!this.cine.active && this.pendingFleets) { const p = this.pendingFleets; this.pendingFleets = null; this.setFleets(p.own, p.enemySunk); }
    this.overlay.update(t);
    this.fx.update(sdt, t);
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
    floatOnWaves(obj, s.heading, obj.userData.half, obj.userData.wide, t, this.world!.heightAt);
    // nhấp nhô thêm theo shipId: lăn ±1.5°, nâng hạ 0.02, chu kỳ 5–8 s
    const per = 5 + (s.phase % 3);
    obj.rotation.z += ((1.5 * Math.PI) / 180) * 0.5 * Math.sin((t / per) * Math.PI * 2 + s.phase) + obj.userData.kick.roll;
    obj.rotation.x += obj.userData.kick.pitch;
    obj.position.y += 0.02 * CELL * Math.sin((t / per) * Math.PI * 2 + s.phase * 2) + obj.userData.yOffset;
    obj.userData.heading = s.heading;
  }

  resize(w: number, h: number) {
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }
  exit() {}
}
