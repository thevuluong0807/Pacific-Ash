import * as THREE from 'three';
import type { Cell, CellMark, CellView, ShipAttack } from '../../design/core-api';
import { glowTexture } from './fx';
import { CELL } from './scale';

export type Zone = 'own' | 'enemy';
const Z_CENTER: Record<Zone, number> = { own: 7.5 * CELL, enemy: -7.5 * CELL };
const cellPos = (zone: Zone, c: Cell, y = 0.12) => new THREE.Vector3((c.x - 4.5) * CELL, y, Z_CENTER[zone] + (c.y - 4.5) * CELL);

/** Nhắm đang chọn của người chơi, để vẽ vùng đánh và đường đạn. */
export interface AimState {
  attack: ShipAttack | null;   // đòn thực tế của tàu chọn
  cells: Cell[];               // vùng sẽ bị đánh (previewCells)
  valid: boolean;
  from: THREE.Vector3 | null;  // điểm xuất phát (nòng / ống phóng của tàu chọn)
}

function tex(draw: (x: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  draw(c.getContext('2d')!);
  return new THREE.CanvasTexture(c);
}

/**
 * Lớp phủ 3D khi xem trận ở chế độ 3D: marker trượt / bị chặn trên mặt nước, ô nhắm, ô rê chuột,
 * đường đạn (cung cho pháo / tên lửa / bom, thẳng cho ngư lôi) kèm tên lửa mô hình chạy dọc đường.
 */
export class AimOverlay {
  readonly group = new THREE.Group();
  private tex = {
    miss: tex((x) => { x.strokeStyle = 'rgba(200,235,255,0.95)'; x.lineWidth = 7; for (const r of [20, 38]) { x.beginPath(); x.arc(64, 64, r, 0, 7); x.stroke(); } }),
    blocked: tex((x) => { x.strokeStyle = 'rgba(255,150,60,0.95)'; x.lineWidth = 9; x.strokeRect(24, 24, 80, 80); x.beginPath(); x.moveTo(24, 24); x.lineTo(104, 104); x.moveTo(104, 24); x.lineTo(24, 104); x.stroke(); }),
    aim: tex((x) => { x.strokeStyle = 'rgba(255,140,40,1)'; x.lineWidth = 8; for (const [a, b, c, d] of [[14, 14, 14, 44], [14, 14, 44, 14], [114, 14, 114, 44], [114, 14, 84, 14], [14, 114, 14, 84], [14, 114, 44, 114], [114, 114, 114, 84], [114, 114, 84, 114]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); } }),
    glow: glowTexture('rgba(255,235,190,1)', 'rgba(255,120,40,0)'),
  };
  private marks = new Map<string, THREE.Mesh>();
  private aimQuads: THREE.Mesh[] = [];
  private hover: THREE.Mesh;
  private arcs: { line: THREE.Line; head: THREE.Group; glow: THREE.Sprite; pts: THREE.Vector3[] }[] = [];
  private plane = new THREE.PlaneGeometry(0.86 * CELL, 0.86 * CELL).rotateX(-Math.PI / 2);

  constructor() {
    this.hover = this.quad(this.tex.aim, 0xffffff, 0.9);
    this.hover.visible = false;
    for (let i = 0; i < 10; i++) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 28 }, () => new THREE.Vector3())),
        new THREE.LineDashedMaterial({ color: 0xffb060, dashSize: 0.35 * CELL, gapSize: 0.25 * CELL, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
      line.frustumCulled = false; line.visible = false;
      const head = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * CELL, 0.035 * CELL, 0.34 * CELL, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdfe6ec, metalness: 0.5, roughness: 0.4, emissive: 0x303a44 }));
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.035 * CELL, 0.11 * CELL, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8742a, emissive: 0x602000 }));
      nose.position.z = 0.22 * CELL;
      head.add(body, nose);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      glow.scale.setScalar(0.5 * CELL); glow.position.z = -0.2 * CELL; head.add(glow);
      head.visible = false;
      this.group.add(line, head);
      this.arcs.push({ line, head, glow, pts: [] });
    }
  }

  private quad(map: THREE.Texture, color: number, opacity: number) {
    const m = new THREE.Mesh(this.plane, new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false, depthTest: false, fog: false })); // vẽ xuyên sóng để marker không biến mất
    m.renderOrder = 6;
    this.group.add(m);
    return m;
  }

  /** Marker trượt (hai vùng) và ô bị hộ vệ chặn (lưới địch). Trúng: lửa do `syncHits` lo. */
  setMarks(own: CellView[][], enemy: CellView[][], enemyMarks: CellMark[][]) {
    const want = new Set<string>();
    const put = (zone: Zone, c: Cell, kind: 'miss' | 'blocked') => {
      const k = `${zone}:${c.x},${c.y}:${kind}`;
      want.add(k);
      let m = this.marks.get(k);
      if (!m) { m = this.quad(this.tex[kind], 0xffffff, kind === 'miss' ? 0.8 : 0.95); m.position.copy(cellPos(zone, c, 0.1)); this.marks.set(k, m); }
    };
    for (const [zone, view] of [['own', own], ['enemy', enemy]] as const) {
      view.forEach((row, y) => row.forEach((v, x) => { if (v === 'miss') put(zone, { x, y }, 'miss'); }));
    }
    enemyMarks.forEach((row, y) => row.forEach((m, x) => { if (m === 'blocked' && enemy[y][x] === 'unknown') put('enemy', { x, y }, 'blocked'); }));
    for (const [k, m] of this.marks) if (!want.has(k)) { this.group.remove(m); this.marks.delete(k); }
  }

  setHover(c: Cell | null) {
    this.hover.visible = !!c;
    if (c) this.hover.position.copy(cellPos('enemy', c, 0.13));
  }

  setAim(a: AimState) {
    while (this.aimQuads.length < a.cells.length) this.aimQuads.push(this.quad(this.tex.aim, 0xffffff, 0.9));
    this.aimQuads.forEach((q, i) => {
      const c = a.cells[i];
      q.visible = !!c;
      if (!c) return;
      q.position.copy(cellPos('enemy', c, 0.14));
      (q.material as THREE.MeshBasicMaterial).color.set(a.valid ? 0xffa040 : 0xff4040);
    });
    // đường đạn: một đường cho mỗi ô (ngư lôi: một đường thẳng dọc cả vệt)
    const lines: THREE.Vector3[][] = [];
    if (a.from && a.attack && a.cells.length) {
      const from = a.from;
      if (a.attack === 'torpedo') {
        const pts = a.cells.map((c) => cellPos('enemy', c, 0.1));
        const entry = pts[0].clone().add(pts.length > 1 ? pts[0].clone().sub(pts[1]).normalize().multiplyScalar(2.2 * CELL) : new THREE.Vector3(0, 0, 2.2 * CELL));
        lines.push([from.clone().setY(0.1), entry, ...pts]);
      } else {
        for (const c of a.cells.slice(0, 10)) {
          const to = cellPos('enemy', c, 0.15), d = from.distanceTo(to);
          const apex = a.attack === 'cross' ? 6 * CELL + 0.4 * d : a.attack === 'line3' ? 1.8 * CELL + 0.1 * d : a.attack === 'precision' ? 5 * CELL + 0.3 * d : 0.15 * d + CELL;
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= 27; i++) { const u = i / 27; pts.push(from.clone().lerp(to, u).add(new THREE.Vector3(0, Math.sin(u * Math.PI) * apex * (a.attack === 'cross' ? 1.3 : 0.55), 0))); }
          lines.push(pts);
        }
      }
    }
    this.arcs.forEach((arc, i) => {
      const pts = lines[i];
      arc.line.visible = arc.head.visible = !!pts;
      if (!pts) return;
      // lấy mẫu lại thành 28 điểm đều
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const pos = arc.line.geometry.attributes.position as THREE.BufferAttribute;
      arc.pts = curve.getPoints(27);
      arc.pts.forEach((p, k) => pos.setXYZ(k, p.x, p.y, p.z));
      pos.needsUpdate = true;
      arc.line.computeLineDistances();
      (arc.line.material as THREE.LineDashedMaterial).color.set(a.valid ? 0xffb060 : 0xff6060);
      arc.head.children[0].visible = arc.head.children[1].visible = a.attack !== 'torpedo' && a.attack !== 'line3';
    });
  }

  update(t: number) {
    this.arcs.forEach((arc, i) => {
      if (!arc.head.visible || !arc.pts.length) return;
      const u = (t * 0.45 + i * 0.07) % 1, f = u * (arc.pts.length - 1), k = Math.min(arc.pts.length - 2, Math.floor(f));
      const p = arc.pts[k].clone().lerp(arc.pts[k + 1], f - k);
      arc.head.position.copy(p);
      arc.head.lookAt(arc.pts[k + 1].clone().add(arc.pts[k + 1].clone().sub(arc.pts[k]).multiplyScalar(0.01)));
    });
    for (const q of this.aimQuads) if (q.visible) (q.material as THREE.MeshBasicMaterial).opacity = 0.65 + 0.3 * Math.sin(t * 5);
  }

  setVisible(on: boolean) { this.group.visible = on; }
}
