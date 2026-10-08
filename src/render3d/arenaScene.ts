import * as THREE from 'three';
import type { MapId } from '../ui/settings';
import { WEAPONS, type WeaponId } from '../arena/data';
import { trajectory } from '../arena/ballistics';
import { ArenaBot } from '../arena/bot';
import { ArenaSim, NO_INPUT, muzzleOf, toWorld, type PlayerInput, type Projectile, type ShipState, type SimEvent, type SimPlayer } from '../arena/sim';
import { floatOnWaves } from './buoyancy';
import { createWorld } from './createWorld';
import type { Engine } from './engine';
import type { MapWorld, QualityConfig } from './mapWorld';
import type { RenderScene } from './renderScene';
import { ArenaFx } from './arenaFx';
import { TEAM_COLORS, buildArenaShip, type ArenaRig } from './arenaShips';
import { buildGlbProj, buildGlbShip, type GlbRig, type ProjKindId } from './arenaGlb';

export interface ArenaSetup { players: SimPlayer[]; seed: number; map: MapId }
export interface FeedItem { at: number; text: string; team: number }

const STEP = 1 / 60;
const UPV = new THREE.Vector3(0, 1, 0);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (u: number) => u * u * (3 - 2 * u);
const angLerp = (a: number, b: number, k: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

/** Cảnh 3D của chế độ Hải chiến: chạy mô phỏng cố định 60 Hz, vẽ tàu khối, đạn, hiệu ứng, và camera ngôi thứ ba ↔ ngôi thứ nhất. */
export class ArenaScene implements RenderScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1.6, 1, 60000);
  sim?: ArenaSim;
  /** Tàu của người chơi (luôn là chỗ 0). */
  readonly me = 0;
  paused = false;
  showAim = true;
  feed: FeedItem[] = [];
  /** Giây kể từ lần bắn trúng địch / bị trúng, cho HUD nháy. */
  hitConfirm = 99; hurt = 99;
  aim: { beta: number; el: number; range: number; tof: number; ok: boolean } | null = null;

  private world?: MapWorld;
  private renderer?: THREE.WebGLRenderer;
  private map: MapId = 'truong_sa';
  private fx!: ArenaFx;
  private rigs: (ArenaRig | GlbRig)[] = [];
  private recoilT: number[][] = [];
  private bots: (ArenaBot | null)[] = [];
  private inputs: PlayerInput[] = [];
  private projViews = new Map<number, { obj: THREE.Object3D; k: number; t: number }>();
  private keys = new Set<string>();
  private firing = false;
  /** Phím gõ nhanh (nhấn rồi thả trong cùng một khung hình) vẫn tính một bước mô phỏng. */
  private tapped = new Set<string>();
  /** Đích ngắm bằng chuột của khí tài đang cầm (góc tháp so với mũi, góc ngẩng). */
  private aimT = { beta: 0, el: 0 };
  private wasWeapon = false;
  private pendingSelect: number | null = null;
  private pendingExit = false;
  private acc = 0;
  private tick = 0;
  private clock = 0;
  private quality?: QualityConfig;
  private aimLine!: THREE.Line;
  private aimRing!: THREE.Mesh;
  // camera
  private camYaw = 0;
  private look = { yaw: 0, pitch: 0.0, dist: 1 };
  private blend = 0;
  private fovNow = 62;
  private shake = 0;
  private spectateId = -1;
  private dragging = false;
  private specCycle = 0;
  private fpPos = new THREE.Vector3();
  private fpPoseSmooth = { theta: 0, el: 0 };
  private dom?: HTMLElement;
  private smokeT = 0;

  get mode(): 'drive' | 'weapon' | 'spectate' {
    const s = this.sim?.ships[this.me];
    return !s?.alive ? 'spectate' : s.control !== null ? 'weapon' : 'drive';
  }

  enter(engine: Engine) {
    this.renderer = engine.renderer;
    this.dom = engine.renderer.domElement;
    this.buildWorld();
    this.dom.addEventListener('pointerdown', this.onDown);
    addEventListener('pointerup', this.onUp);
    addEventListener('pointermove', this.onMove);
    this.dom.addEventListener('wheel', this.onWheel, { passive: true });
    this.dom.addEventListener('contextmenu', this.onCtx);
    document.addEventListener('pointerlockchange', this.onLock);
    this.refit();
  }

  exit() {
    this.dom?.removeEventListener('pointerdown', this.onDown);
    removeEventListener('pointerup', this.onUp);
    removeEventListener('pointermove', this.onMove);
    this.dom?.removeEventListener('wheel', this.onWheel);
    this.dom?.removeEventListener('contextmenu', this.onCtx);
    document.removeEventListener('pointerlockchange', this.onLock);
    if (document.pointerLockElement) document.exitPointerLock();
    this.firing = false; this.dragging = false;
  }

  private buildWorld() {
    if (this.world || !this.renderer) return;
    this.world = createWorld(this.map, this.scene, this.renderer, 'play');
    if (this.quality) this.world.setQuality(this.quality);
    this.fx = new ArenaFx((x, z) => this.world!.heightAt(x, z, this.clock));
    this.scene.add(this.fx.group);
    // đường đạn ngắm + vòng điểm rơi
    this.aimLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffd9a0, dashSize: 14, gapSize: 10, transparent: true, opacity: 0.8, depthTest: false, fog: false }));
    this.aimLine.renderOrder = 8; this.aimLine.frustumCulled = false; this.aimLine.visible = false;
    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0.85, depthTest: false, fog: false, side: THREE.DoubleSide }));
    this.aimRing.renderOrder = 8; this.aimRing.visible = false;
    this.scene.add(this.aimLine, this.aimRing);
    this.scene.add(new THREE.HemisphereLight(0xffe2c0, 0x20303c, 0.9));
    if (this.sim) this.buildShips();
  }

  setMap(map: MapId) {
    if (map === this.map) return;
    this.map = map;
    if (!this.world) return;
    this.world.dispose();
    this.world = createWorld(map, this.scene, this.renderer!, 'play');
    if (this.quality) this.world.setQuality(this.quality);
  }

  setQuality(q: QualityConfig) { this.quality = q; this.world?.setQuality(q); }

  /** Bắt đầu một trận mới. */
  start(setup: ArenaSetup) {
    this.clear();
    this.setMap(setup.map);
    this.map = setup.map;
    this.sim = new ArenaSim(setup.seed, setup.players);
    this.bots = this.sim.ships.map((s) => (s.bot ? new ArenaBot(s.id, s.bot, setup.seed) : null));
    this.inputs = this.sim.ships.map(() => NO_INPUT);
    this.feed = []; this.acc = 0; this.tick = 0; this.paused = false; this.hitConfirm = 99; this.hurt = 99; this.aim = null;
    this.blend = 0; this.spectateId = -1; this.keys.clear(); this.firing = false;
    const h = this.sim.ships[this.me].h;
    this.camYaw = h; this.look = { yaw: 0, pitch: 0, dist: 1 };
    if (this.world) this.buildShips();
  }

  private buildShips() {
    for (const r of this.rigs) this.scene.remove(r.root);
    this.rigs = this.sim!.ships.map((s) => { const c = TEAM_COLORS[s.team % TEAM_COLORS.length], r = buildGlbShip(s.design, c) ?? buildArenaShip(s.design, c); this.scene.add(r.root); return r; });
    this.recoilT = this.sim!.ships.map((s) => s.mounts.map(() => 0));
  }
  /** Model glb nạp xong sau khi trận đã bắt đầu: thay khối placeholder. */
  reloadShips() { if (this.sim && this.world) this.buildShips(); }

  /** Dọn trận cũ (rời màn hình). */
  clear() {
    for (const r of this.rigs) this.scene.remove(r.root);
    this.rigs = [];
    for (const v of this.projViews.values()) this.scene.remove(v.obj);
    this.projViews.clear();
    this.sim = undefined;
  }

  // ---- nhập liệu ----
  keyDown(e: KeyboardEvent): boolean {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (e.repeat && !['w', 'a', 's', 'd', ' '].includes(k)) return false;
    const mine = this.sim?.ships[this.me];
    if (/^[1-7]$/.test(k)) { this.pendingSelect = +k - 1; return true; }
    if ((k === 'q' || k === 'e') && mine) { this.cycleWeapon(k === 'e' ? 1 : -1); return true; }
    if (k === 'x' && mine?.control != null) { this.pendingExit = true; return true; }
    if (k === 't') { this.showAim = !this.showAim; return true; }
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) { this.keys.add(k); this.tapped.add(k); return true; }
    if (k === ' ') { this.firing = true; this.tapped.add(' '); return true; }
    return false;
  }
  keyUp(e: KeyboardEvent) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    this.keys.delete(k);
    if (k === ' ') this.firing = false;
  }
  releaseAll() { this.keys.clear(); this.tapped.clear(); this.firing = false; }
  /** Rời khí tài (Esc) nếu đang cầm; trả true nếu đã xử lý. */
  requestExit(): boolean {
    if (this.mode !== 'weapon') return false;
    this.pendingExit = true;
    return true;
  }

  private cycleWeapon(dir: number) {
    const s = this.sim!.ships[this.me];
    if (!s.alive) { this.specCycle += dir; this.spectateId = -1; return; }
    const n = s.mounts.length;
    let i = s.control ?? (dir > 0 ? -1 : n);
    for (let k = 0; k < n; k++) { i = (i + dir + n) % n; const m = s.mounts[i]; if (m.weapon && m.cd <= 0) { this.pendingSelect = i; return; } }
  }

  private onDown = (e: PointerEvent) => {
    if (e.button === 0) this.firing = true;
    else if (e.button === 2) this.dragging = true;
  };
  private onUp = (e: PointerEvent) => { if (e.button === 0) this.firing = false; if (e.button === 2) this.dragging = false; };
  /** Mất khóa chuột giữa lúc cầm khí tài (Esc của trình duyệt) = thoát khí tài. */
  private onLock = () => { if (!document.pointerLockElement && this.wasWeapon && !this.paused) this.pendingExit = true; };
  private onMove = (e: PointerEvent) => {
    if (this.mode === 'weapon') {
      // chuột phải/trái đều quay nòng: phải = sang mạn phải (góc giảm), lên = ngẩng nòng; nhạy theo FOV để ngắm xa không quá nhạy
      const k = 0.0028 * (this.camera.fov / 52);
      this.aimT.beta -= e.movementX * k;
      this.aimT.el -= e.movementY * k;
      return;
    }
    if (!this.dragging) return;
    this.look.yaw = clamp(this.look.yaw - e.movementX * 0.006, -Math.PI, Math.PI);
    this.look.pitch = clamp(this.look.pitch + e.movementY * 0.004, -0.2, 0.9);
  };
  private onWheel = (e: WheelEvent) => { this.look.dist = clamp(this.look.dist * (1 + Math.sign(e.deltaY) * 0.1), 0.5, 2.4); };
  private onCtx = (e: Event) => e.preventDefault();

  /** Vào/ra chế độ cầm khí tài: lấy đích ngắm từ góc nòng hiện tại, khóa/nhả chuột, giữ đích trong giới hạn, phím W/A/S/D tinh chỉnh đích. */
  private syncWeaponMode(dt: number) {
    const sim = this.sim!, me = sim.ships[this.me], wm = this.mode === 'weapon';
    if (wm && !this.wasWeapon) {
      const m = me.mounts[me.control!];
      this.aimT = { beta: m.beta, el: m.el };
      this.dom?.requestPointerLock?.();
    } else if (!wm && this.wasWeapon && document.pointerLockElement) document.exitPointerLock();
    this.wasWeapon = wm;
    if (!wm) return;
    const m = me.mounts[me.control!], w = WEAPONS[m.weapon!], sp = me.hull.slots[me.control!], k = this.keys;
    const fine = 0.45 * (this.camera.fov / 52); // rad/s
    this.aimT.beta += ((k.has('a') || k.has('ArrowLeft') ? 1 : 0) - (k.has('d') || k.has('ArrowRight') ? 1 : 0)) * fine * dt;
    this.aimT.el += ((k.has('w') || k.has('ArrowUp') ? 1 : 0) - (k.has('s') || k.has('ArrowDown') ? 1 : 0)) * fine * dt;
    this.aimT.el = clamp(this.aimT.el, w.elMin, w.elHi);
    if (sp.half < Math.PI) this.aimT.beta = clamp(this.aimT.beta, sp.center - sp.half, sp.center + sp.half);
  }

  private humanInput(): PlayerInput {
    this.syncWeaponMode(0);
    const k = this.keys, tp = this.tapped, on = (...ks: string[]) => ks.some((x) => k.has(x) || tp.has(x)), inp: PlayerInput = {
      up: on('w', 'ArrowUp'), down: on('s', 'ArrowDown'), left: on('a', 'ArrowLeft'), right: on('d', 'ArrowRight'),
      fire: this.firing || tp.has(' '), select: this.pendingSelect, exit: this.pendingExit,
      aim: this.mode === 'weapon' ? { ...this.aimT } : undefined,
    };
    this.pendingSelect = null; this.pendingExit = false; tp.clear();
    return inp;
  }

  // ---- vòng lặp ----
  update(dt: number, t: number) {
    void t;
    const sim = this.sim;
    if (!sim || !this.world) { this.world?.update(dt, this.clock += dt, this.camera); return; }
    this.clock += dt;
    this.hitConfirm += dt; this.hurt += dt;
    if (!this.paused) {
      this.acc += Math.min(dt, 0.1);
      while (this.acc >= STEP) {
        this.acc -= STEP;
        const mineAlive = sim.ships[this.me].alive;
        if (mineAlive) this.inputs[this.me] = this.humanInput(); else { this.inputs[this.me] = NO_INPUT; this.pendingSelect = null; this.pendingExit = false; }
        if (this.tick % 3 === 0) sim.ships.forEach((s, i) => { const b = this.bots[i]; if (b && s.alive) this.inputs[i] = b.think(sim, s, STEP * 3); else if (i !== this.me && !s.alive) this.inputs[i] = NO_INPUT; });
        sim.step(STEP, this.inputs);
        this.tick++;
        this.handle(sim.drain());
      }
    }
    this.syncWeaponMode(dt);
    this.syncShips(dt);
    this.syncProjectiles(dt);
    this.updateCamera(dt);
    this.updateAim();
    this.shake *= Math.exp(-5 * dt);
    this.fx.setViewport((this.renderer?.domElement.height ?? 800) * 0.5 / Math.tan((this.camera.fov * Math.PI) / 360));
    this.fx.update(this.paused ? 0 : dt);
    this.world.update(this.paused ? 0 : dt, this.clock, this.camera);
  }

  // ---- sự kiện mô phỏng ----
  private handle(evs: SimEvent[]) {
    const sim = this.sim!;
    for (const e of evs) {
      switch (e.k) {
        case 'fire': {
          const w = WEAPONS[e.weapon], s = w.size;
          this.fx.muzzle({ x: e.x, y: e.y, z: e.z }, { x: e.dx, y: e.dy, z: e.dz }, w.kind === 'bullet' ? 0.4 : s);
          if (this.recoilT[e.ship]) this.recoilT[e.ship][e.slot] = 0.3;
          if (e.ship === this.me) this.shake += w.size === 3 ? 0.9 : w.size === 2 ? 0.45 : 0.08;
          else this.shake += this.nearMe(e.x, e.z, 700) * (w.size === 3 ? 0.35 : 0.1);
          break;
        }
        case 'hit': {
          const s = sim.ships[e.ship];
          this.fx.explode({ x: e.x, y: Math.max(e.y, 2), z: e.z }, clamp(e.dmg / 60, 0.2, 2));
          if (e.by === this.me) this.hitConfirm = 0;
          if (e.ship === this.me) { this.hurt = 0; this.shake += clamp(e.dmg / 40, 0.15, 1.2); }
          void s;
          break;
        }
        case 'splash': this.fx.splash(e.x, e.z, e.r, this.clock); break;
        case 'bump': this.fx.explode({ x: e.x, y: 6, z: e.z }, 0.3); if (e.ship === this.me) this.shake += 0.5; break;
        case 'sunk': {
          const s = sim.ships[e.ship];
          for (let i = 0; i < 4; i++) this.fx.explode({ x: s.x + (Math.random() - 0.5) * s.hull.length * 0.5, y: 8 + Math.random() * 10, z: s.z + (Math.random() - 0.5) * s.hull.length * 0.5 }, 1.6);
          const by = e.by !== null && e.by !== e.ship ? sim.ships[e.by] : null;
          this.feed.push({ at: this.clock, text: by ? `${by.name} đã hạ ${s.name}` : `${s.name} bị chìm`, team: by ? by.team : s.team });
          if (this.feed.length > 6) this.feed.shift();
          if (e.ship === this.me) this.shake += 1.5;
          break;
        }
        default: break;
      }
    }
  }

  private nearMe(x: number, z: number, r: number) { const m = this.sim!.ships[this.me]; return clamp(1 - Math.hypot(m.x - x, m.z - z) / r, 0, 1); }

  // ---- đồng bộ hình ảnh ----
  private syncShips(dt: number) {
    const sim = this.sim!;
    this.smokeT -= dt;
    const smoke = this.smokeT <= 0;
    if (smoke) this.smokeT = 0.12;
    sim.ships.forEach((s, i) => {
      const rig = this.rigs[i];
      if (!rig) return;
      const sunkFor = s.alive ? 0 : sim.time - s.sunkAt;
      rig.root.visible = sunkFor < 16;
      rig.root.position.set(s.x, 0, s.z);
      floatOnWaves(rig.root, s.h, s.hull.length * 0.4, s.hull.beam / 2, this.clock, (x, z, t) => this.world!.heightAt(x, z, t), false);
      const u = s.vx * Math.sin(s.h) + s.vz * Math.cos(s.h);
      rig.root.rotation.z += s.r * Math.abs(u) * 0.0095; // nghiêng ra ngoài khi cua
      rig.root.rotation.x += -clamp(u / s.vmax, -1, 1) * 0.015;
      if (!s.alive) {
        rig.root.position.y -= sunkFor * 3.2 + sunkFor * sunkFor * 0.35;
        rig.root.rotation.z += Math.min(sunkFor / 8, 1) * 0.55;
        rig.root.rotation.x += Math.min(sunkFor / 10, 1) * 0.25;
      }
      s.mounts.forEach((m, k) => {
        const mr = rig.mounts[k];
        mr.yaw.rotation.y = m.beta;
        mr.pitch.rotation.x = -m.el;
      });
      rig.flag.rotation.y = Math.sin(this.clock * 4 + i) * 0.15;
      const g = rig as GlbRig;
      if (g.radar) g.radar.rotation.y += dt * 1.6;
      if (g.recoil) s.mounts.forEach((m, k) => {
        const rt = this.recoilT[i]?.[k] ?? 0;
        if (rt > 0) this.recoilT[i][k] = Math.max(0, rt - dt);
        const kick = m.weapon ? Math.sin(Math.min(1, rt / 0.3) * Math.PI) * 0.03 * WEAPONS[m.weapon].barrel : 0;
        for (const b of g.recoil[k]) { b.userData.z0 ??= b.position.z; b.position.z = b.userData.z0 - kick; }
      });
      if (smoke) {
        const hp01 = s.hp / s.hull.hp;
        if ((s.alive && hp01 < 0.55) || (!s.alive && sunkFor < 14)) {
          const gd = (rig as GlbRig).dmg;
          if (gd?.length) {
            const a = gd[Math.floor(Math.random() * gd.length)], v = a.getWorldPosition(new THREE.Vector3());
            this.fx.damageSmoke({ x: v.x, y: v.y, z: v.z }, s.alive ? hp01 : 0.1);
          } else {
            const p = toWorld(s, 0, -s.hull.length * 0.15);
            this.fx.damageSmoke({ x: p.x, y: rig.root.position.y + s.hull.freeboard + s.hull.tower * 0.6, z: p.z }, s.alive ? hp01 : 0.1);
          }
        }
        // sóng vỗ mũi tàu
        const sp = Math.hypot(s.vx, s.vz);
        if (s.alive && sp > 6) {
          const bow = toWorld(s, 0, s.hull.length * 0.46);
          this.fx.wake({ x: bow.x, y: 0, z: bow.z });
          const st = toWorld(s, 0, -s.hull.length * 0.48);
          this.fx.wake({ x: st.x, y: 0, z: st.z });
        }
      }
    });
  }

  private syncProjectiles(dt: number) {
    const sim = this.sim!, seen = new Set<number>();
    for (const p of sim.projs) {
      seen.add(p.id);
      let v = this.projViews.get(p.id);
      if (!v) { v = { obj: this.makeProj(p), k: 0, t: 0 }; this.scene.add(v.obj); this.projViews.set(p.id, v); }
      v.obj.position.set(p.b.x, p.b.y + (p.spec.kind === 'torpedo' ? this.world!.heightAt(p.b.x, p.b.z, this.clock) + 0.4 : 0), p.b.z);
      const sp = Math.hypot(p.b.vx, p.b.vy, p.b.vz) || 1;
      v.obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(p.b.vx / sp, p.b.vy / sp, p.b.vz / sp));
      v.t -= dt;
      if (v.t <= 0 && !this.paused) {
        const pos = v.obj.position;
        switch (p.spec.kind) {
          case 'shell': v.t = 0.05; this.fx.trail(pos, p.weapon === 'heavy' ? 2.6 : 1.8, true); break;
          case 'missile': v.t = 0.03; this.fx.flame(pos, 3.4); this.fx.trail(pos, 3); break;
          case 'rocket': v.t = 0.04; this.fx.flame(pos, 2); this.fx.trail(pos, 1.6); break;
          case 'torpedo': v.t = 0.1; this.fx.wake(pos); break;
          default: v.t = 0.1; break;
        }
      }
    }
    for (const [id, v] of this.projViews) if (!seen.has(id)) { this.scene.remove(v.obj); this.projViews.delete(id); }
  }

  private makeProj(p: Projectile): THREE.Object3D {
    const w = p.spec, col = w.color;
    const glb = buildGlbProj(w.kind as ProjKindId, TEAM_COLORS[p.team % TEAM_COLORS.length]);
    if (glb) return glb.obj;
    const basic = (c: number, op = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: op < 1, opacity: op, fog: false });
    switch (w.kind) {
      case 'bullet': {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, p.weapon === 'mg' ? 16 : 22), new THREE.MeshBasicMaterial({ color: col, blending: THREE.AdditiveBlending, fog: false, transparent: true }));
        return m;
      }
      case 'torpedo': { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 9, 8).rotateX(Math.PI / 2), basic(0x2b3a44)); return m; }
      case 'missile': { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 8, 8).rotateX(Math.PI / 2), basic(0xe8e8e8)); const n = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 8).rotateX(Math.PI / 2), basic(0xff5a3a)); n.position.z = 5.5; g.add(b, n); return g; }
      case 'rocket': { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 5, 6).rotateX(Math.PI / 2), basic(0xd0d0d0)); const n = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.6, 6).rotateX(Math.PI / 2), basic(col)); n.position.z = 3.2; g.add(b, n); return g; }
      default: {
        const r = p.weapon === 'heavy' ? 2.8 : p.weapon === 'howitzer' ? 2.5 : 1.9;
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8).scale(1, 1, 1.9), basic(0xffe2b0)));
        const glow = new THREE.Mesh(new THREE.SphereGeometry(r * 1.9, 10, 8), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        g.add(glow);
        return g;
      }
    }
  }

  // ---- camera ----
  /** Tàu đang theo dõi bằng camera ngôi thứ ba: mình, hoặc người khác nếu mình chìm. */
  get focus(): ShipState {
    const sim = this.sim!, m = sim.ships[this.me];
    if (m.alive) return m;
    const alive = sim.ships.filter((s) => s.alive).sort((a, b) => Number(b.team === m.team) - Number(a.team === m.team) || a.id - b.id);
    if (!alive.length) return m;
    if (this.spectateId < 0 || !sim.ships[this.spectateId]?.alive) this.spectateId = alive[((this.specCycle % alive.length) + alive.length) % alive.length].id;
    return sim.ships[this.spectateId];
  }

  private updateCamera(dt: number) {
    const sim = this.sim!, s = this.focus, h = s.hull, me = sim.ships[this.me];
    const weapon = me.alive && me.control !== null;
    this.blend = clamp(this.blend + (weapon ? 1 : -1) * dt * 2.6, 0, 1);

    // ngôi thứ ba: bám sau thân, đuổi hướng mũi có độ trễ; chuột phải kéo xoay tạm
    this.camYaw = angLerp(this.camYaw, s.h, 1 - Math.exp(-dt * (this.dragging ? 0.5 : 2.4)));
    if (!this.dragging) { this.look.yaw *= Math.exp(-dt * 0.8); this.look.pitch *= Math.exp(-dt * 0.8); }
    const yaw = this.camYaw + this.look.yaw, dist = h.cam.dist * this.look.dist, hgt = h.cam.height * this.look.dist + this.look.pitch * dist * 0.9;
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const root = this.rigs[s.id]?.root;
    const base = new THREE.Vector3(s.x, root ? root.position.y : 0, s.z);
    const p3 = base.clone().addScaledVector(dir, -dist).add(new THREE.Vector3(0, hgt, 0));
    const look3 = base.clone().addScaledVector(dir, dist * 0.55).add(new THREE.Vector3(0, h.freeboard + 4, 0));
    const wy = this.world!.heightAt(p3.x, p3.z, this.clock);
    if (p3.y < wy + 6) p3.y = wy + 6;
    const q3 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p3, look3, UPV));

    let pos = p3, q = q3, fov = 62;
    if (this.blend > 0 && me.alive) {
      const slot = me.control ?? this.lastSlot, ms = me.mounts[slot];
      if (me.control !== null) this.lastSlot = me.control;
      const spc = me.hull.slots[slot], w = ms.weapon ? WEAPONS[ms.weapon] : null;
      const base1 = toWorld(me, spc.x, spc.z), th = me.h + ms.beta;
      const fy = this.rigs[me.id].root.position.y;
      this.fpPoseSmooth.theta = th; this.fpPoseSmooth.el = ms.el;
      const d = new THREE.Vector3(Math.cos(ms.el) * Math.sin(th), Math.sin(ms.el), Math.cos(ms.el) * Math.cos(th));
      const up = new THREE.Vector3(0, 1, 0);
      // sau và trên nòng một đoạn để thấy nòng ở đáy khung hình mà không bị che; chênh vài chục đơn vị so với tầm bắn nên lệch song song không đáng kể
      const p1 = new THREE.Vector3(base1.x, fy + spc.y + 2.2, base1.z).addScaledVector(d, -(8 + spc.size * 4)).addScaledVector(up, 5 + spc.size * 1.5);
      this.fpPos.copy(p1);
      const q1 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p1, p1.clone().add(d), UPV));
      const e = ease(this.blend);
      pos = p3.clone().lerp(p1, e); q = q3.clone().slerp(q1, e); fov = 62 + ((w?.fov ?? 45) - 62) * e;
    }
    this.fovNow += (fov - this.fovNow) * (1 - Math.exp(-dt * 12));
    this.camera.fov = this.fovNow; this.camera.updateProjectionMatrix();
    const sh = this.shake;
    this.camera.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 3 * sh, (Math.random() - 0.5) * 3 * sh, (Math.random() - 0.5) * 3 * sh));
    this.camera.quaternion.copy(q);
    const roll = (Math.random() - 0.5) * 0.006 * sh;
    this.camera.rotateZ(roll);
  }
  private lastSlot = 0;

  /** Chiếu điểm thế giới ra pixel màn hình (HUD nhãn tàu). z > 1 nghĩa là sau lưng camera. */
  project(x: number, y: number, z: number, w: number, h: number): { x: number; y: number; behind: boolean } {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
  }

  // ---- đường ngắm ----
  private updateAim() {
    const sim = this.sim!, me = sim.ships[this.me];
    const on = me.alive && me.control !== null;
    if (!on) { this.aimLine.visible = false; this.aimRing.visible = false; this.aim = null; return; }
    const m = me.mounts[me.control!], w = WEAPONS[m.weapon!], mz = muzzleOf(me, me.control!);
    const inh = w.kind === 'torpedo' ? { x: 0, z: 0 } : { x: me.vx, z: me.vz };
    const l = trajectory(w, mz.x, mz.y, mz.z, mz.theta, w.kind === 'torpedo' ? 0 : mz.el, inh, 1 / 20, w.kind === 'torpedo' ? 8 : 14);
    const range = Math.hypot(l.x - mz.x, l.z - mz.z);
    this.aim = { beta: m.beta, el: m.el, range: w.kind === 'torpedo' ? w.v * w.life * 0.75 : range, tof: l.t, ok: true };
    if (!this.showAim) { this.aimLine.visible = false; this.aimRing.visible = false; return; }
    const pts: THREE.Vector3[] = [];
    if (w.kind === 'torpedo') {
      for (let i = 0; i <= 20; i++) pts.push(new THREE.Vector3(mz.x + mz.dir.x * i * 40, 1, mz.z + mz.dir.z * i * 40));
    } else for (let i = 0; i < l.points.length; i += 3) pts.push(new THREE.Vector3(l.points[i], l.points[i + 1], l.points[i + 2]));
    this.aimLine.geometry.dispose();
    this.aimLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    this.aimLine.computeLineDistances();
    this.aimLine.visible = true;
    if (w.kind === 'torpedo') this.aimRing.visible = false;
    else {
      this.aimRing.visible = true;
      this.aimRing.position.set(l.x, this.world!.heightAt(l.x, l.z, this.clock) + 1, l.z);
      this.aimRing.scale.setScalar(Math.max(10, w.splash));
    }
  }

  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  private refit() { if (this.dom) this.resize(this.dom.clientWidth || innerWidth, this.dom.clientHeight || innerHeight); }
  get weaponId(): WeaponId | null { const s = this.sim?.ships[this.me]; return s && s.control !== null ? s.mounts[s.control].weapon : null; }
}
