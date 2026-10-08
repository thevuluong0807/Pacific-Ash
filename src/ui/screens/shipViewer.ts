import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HULLS, type ShipDesign } from '../../arena/data';
import { buildGlbShip, type GlbRig } from '../../render3d/arenaGlb';
import { buildArenaShip, type ArenaRig } from '../../render3d/arenaShips';

const TEAM = 0x4fc3e8;
const ease = (u: number) => u * u * (3 - 2 * u);

/** Xem tàu 3D trong xưởng chế tạo: xoay 360°, zoom, bay tới khe đang chọn. Dùng renderer riêng (không đụng engine chính). */
export class ShipViewer {
  readonly canvas = document.createElement('canvas');
  onFrame?: () => void;
  autoRotate = true;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.5, 6000);
  private controls: OrbitControls;
  private rig: ArenaRig | GlbRig | null = null;
  private design: ShipDesign | null = null;
  private focusSlot: number | null = null;
  private fly: { t: number; fromT: THREE.Vector3; toT: THREE.Vector3; fromD: number; toD: number } | null = null;
  private raf = 0;
  private clock = new THREE.Clock();
  private t = 0;
  private ro: ResizeObserver;
  private hullId = '';

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    host.appendChild(this.canvas);
    this.scene.background = new THREE.Color(0x0a1015);
    this.scene.fog = new THREE.Fog(0x0a1015, 500, 1800);
    this.scene.add(new THREE.HemisphereLight(0xdde8ff, 0x1c2a36, 1.5));
    const key = new THREE.DirectionalLight(0xffe2c0, 2.4); key.position.set(-120, 220, 160); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fb8ff, 1.1); rim.position.set(200, 80, -220); this.scene.add(rim);
    // sàn: mặt nước tối + lưới, đủ để thấy mớn nước và làm mốc khi xoay
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1500, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0d1c27, roughness: 0.5, metalness: 0.4 }));
    sea.position.y = -0.2; this.scene.add(sea);
    const grid = new THREE.GridHelper(900, 45, 0x2d6b8a, 0x16303f); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.5; grid.position.y = 0.05; this.scene.add(grid);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.49; this.controls.enablePan = false;
    this.controls.addEventListener('start', () => { this.autoRotate = false; this.fly = null; });
    if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __viewer: unknown }).__viewer = this;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
  }

  get ready() { return !!this.rig; }

  /** (Dựng lại) tàu theo thiết kế. Đổi cỡ thân thì đặt lại góc nhìn. */
  setDesign(dz: ShipDesign) {
    const same = this.hullId === dz.hull;
    this.design = { ...dz, slots: [...dz.slots] };
    this.hullId = dz.hull;
    if (this.rig) { this.scene.remove(this.rig.root); this.rig = null; }
    this.rig = buildGlbShip(dz, TEAM) ?? buildArenaShip(dz, TEAM);
    this.scene.add(this.rig.root);
    this.controls.minDistance = 25; this.controls.maxDistance = HULLS[dz.hull].length * 3.2;
    if (!same) this.showAll(true);
    else if (this.focusSlot !== null) this.focus(this.focusSlot);
  }

  private anchor(i: number): THREE.Vector3 {
    const sp = HULLS[this.design!.hull].slots[i];
    return new THREE.Vector3(sp.x, sp.y + 1.5, sp.z);
  }

  /** Bay camera tới khe `i` (giữ hướng nhìn hiện tại, thu gần theo cỡ khe). */
  focus(i: number) {
    if (!this.design) return;
    const sp = HULLS[this.design.hull].slots[i];
    this.focusSlot = i;
    this.startFly(this.anchor(i), 38 + sp.size * 22);
  }
  showAll(snap = false) {
    if (!this.design) return;
    this.focusSlot = null;
    const h = HULLS[this.design.hull];
    if (snap) {
      const d = h.length * 1.25;
      this.controls.target.set(0, h.freeboard * 0.8, 0);
      this.camera.position.set(-d * 0.7, h.length * 0.32, d * 0.75);
      this.controls.update();
      this.fly = null;
    } else this.startFly(new THREE.Vector3(0, h.freeboard * 0.8, 0), h.length * 1.25);
  }
  private startFly(to: THREE.Vector3, dist: number) {
    this.fly = { t: 0, fromT: this.controls.target.clone(), toT: to, fromD: this.camera.position.distanceTo(this.controls.target), toD: dist };
  }

  /** Vị trí khe trên màn hình (px trong khung); behind = sau lưng camera. */
  project(i: number): { x: number; y: number; behind: boolean } {
    const r = this.rig;
    if (!r || !this.design) return { x: 0, y: 0, behind: true };
    const v = this.anchor(i).clone().add(new THREE.Vector3(0, 3, 0)).project(this.camera);
    const w = this.host.clientWidth, h = this.host.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
  }

  start() { if (this.raf) return; this.clock.getDelta(); const loop = () => { this.raf = requestAnimationFrame(loop); this.frame(); }; this.raf = requestAnimationFrame(loop); this.resize(); }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.t += dt;
    if (this.fly) {
      this.fly.t = Math.min(1, this.fly.t + dt / 0.7);
      const k = ease(this.fly.t), tgt = this.fly.fromT.clone().lerp(this.fly.toT, k), d = this.fly.fromD + (this.fly.toD - this.fly.fromD) * k;
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      this.controls.target.copy(tgt);
      this.camera.position.copy(tgt).addScaledVector(dir, d);
      if (this.fly.t >= 1) this.fly = null;
    }
    if (this.autoRotate && !this.fly && this.focusSlot === null) {
      const off = this.camera.position.clone().sub(this.controls.target), a = dt * 0.35, c = Math.cos(a), s = Math.sin(a);
      this.camera.position.set(this.controls.target.x + off.x * c - off.z * s, this.camera.position.y, this.controls.target.z + off.x * s + off.z * c);
    }
    this.controls.update();
    this.animateRig(dt);
    this.renderer.render(this.scene, this.camera);
    this.onFrame?.();
  }

  /** Khí tài đang chọn quét cung bắn để thấy giới hạn xoay; radar quay, cờ rung. */
  private animateRig(dt: number) {
    const r = this.rig as GlbRig | null;
    if (!r || !this.design) return;
    if (r.radar) r.radar.rotation.y += dt * 1.6;
    const h = HULLS[this.design.hull];
    r.mounts.forEach((m, i) => {
      if (!this.design!.slots[i]) return;
      const sp = h.slots[i];
      if (i === this.focusSlot) {
        m.yaw.rotation.y = sp.half >= Math.PI ? this.t * 0.6 : sp.center + Math.sin(this.t * 0.9) * sp.half * 0.85;
        m.pitch.rotation.x = -(0.12 + 0.1 * Math.sin(this.t * 1.7));
      } else { m.yaw.rotation.y = sp.half >= Math.PI ? 0 : sp.center; m.pitch.rotation.x = -0.1; }
    });
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.stop(); this.ro.disconnect(); this.controls.dispose();
    this.scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); });
    this.renderer.dispose();
    this.canvas.remove();
  }
}
