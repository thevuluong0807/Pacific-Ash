import * as THREE from 'three';
import type { Cinematic, Ctx } from './cinematic';
import { CELL as K } from './scale';
import type { Cell } from '../../design/core-api';
import { type CamPose, V, key, lerp, lerpV, prog, smooth, wp } from './cineUtil';

/**
 * Tàu sân bay `line3` rải thảm 4 ô (cinematics.md mục 6, 6450 ms, hai cảnh):
 *  1. 0–3000 một cú máy liên tục, không cắt: camera thấp cạnh cuối ray, từ 700 lia theo máy bay dẫn đầu, đẩy theo 35% tốc độ bay và nâng dần, FOV 28° → 34°;
 *  2. 3000–6450 camera đứng ở mặt nước bên cạnh dải mục tiêu (lùi 4.6 ô, cao 3.5 ĐV), bốn máy bay nối đuôi nhau (cách 10 ĐV, 90 ĐV/s, cao 22 ĐV) bay ngang;
 *     máy bay i thả một tên lửa xuống ô i của dải ở 3600 + 225·i (ô ngoài lưới: không thả), tImpact = thả + 1050, chậm 0.6× quanh 4600–5200.
 * Dải đen 2.39:1 vào 450 ms đầu, ra 450 ms cuối. Chưa làm: độ sâu trường ảnh, `jbd_*` dựng lên, giọt nước trên ống kính.
 */
const TK = [700, 700, 1150, 1600];  // mốc ray bắn / lăn bánh của plane_0..3
const TD = [3600, 3825, 4050, 4275]; // mốc thả của máy bay 0..3
const FALL = 1050;                  // thả → chạm (4650, 4875, 5100, 5325)
const END = 6450;
const T1 = 3000;                    // hết cảnh 1 (cắt duy nhất)
const SPEED = 9;                    // ô/giây của đội hình (90 ĐV/s)
const ALT = 2.2;                    // độ cao đội hình (22 ĐV)
const pose = (pos: THREE.Vector3, look: THREE.Vector3, fov: number): CamPose => ({ pos, look, fov });

export function buildLine3(cn: Cinematic, c: Ctx): number {
  const host = cn.host, rig = c.rig, parts = rig.userData.parts;
  const cells = c.shot.cells;
  const frame = () => c.frameNow();

  // ---- dải 4 ô: chiều tăng của trục, vị trí ô thứ k (có thể nằm ngoài lưới), ô thật của từng ô ----
  const axis = cells.length > 1 ? c.cw(cells[1]).sub(c.cw(cells[0])).setY(0).normalize() : V(1, 0, 0);
  const alongX = cells.length > 1 && cells[0].y === cells[1].y;
  const miss0 = cells.length < 4 && (alongX ? cells[0].x : cells[0].y) === 0 ? 4 - cells.length : 0; // ô thiếu nằm ở đầu hay cuối dải
  const slot = (k: number) => c.cw(cells[0]).addScaledVector(axis, (k - miss0) * K).setY(0);
  const cellOf = (k: number) => cells[k - miss0] as Cell | undefined;
  const M = slot(1.5);
  const Rax = V(-axis.z, 0, axis.x);

  // ---- máy bay: bản sao thế giới (gốc bị ẩn), mỗi chiếc mang hai tên lửa dưới cánh ----
  const planes = parts.planes;
  const group = planes.map((p) => {
    cn.snap(p);
    const g = cn.add(new THREE.Group());
    g.scale.setScalar(K);
    const clone = p.clone(true);
    clone.position.set(0, 0, 0); clone.quaternion.identity(); clone.scale.set(1, 1, 1); clone.visible = true;
    g.add(clone);
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcfd6dc, fog: false }));
      m.position.set(0.055 * s, -0.03, 0.01);
      g.add(m);
    }
    return g;
  });
  cn.at(0, () => planes.forEach((p) => cn.hide(p)));

  const slotP = (i: number) => wp(planes[i]);
  const cs = (i: number) => wp(parts.catStart[Math.min(i, parts.catStart.length - 1)]);
  const ce = (i: number) => wp(parts.catEnd[Math.min(i, parts.catEnd.length - 1)]);
  const rail = (i: number) => (i < 2 ? 450 : 600);

  // quỹ đạo: ray (hoặc boong) → đường cong → hàng thẳng dọc trục dải ở độ cao 22 ĐV, máy bay i qua ô i đúng lúc thả
  const line = (i: number, t: number) => slot(i).setY(ALT * K).addScaledVector(axis, SPEED * K * ((t - TD[i]) / 1000));
  const Tc = 2400; // điểm nối đường cong với hàng thẳng
  const curves: (THREE.CatmullRomCurve3 | null)[] = [null, null, null, null];
  const curve = (i: number) => (curves[i] ??= (() => {
    const F = frame().F, a = ce(i), e = line(i, Tc);
    return new THREE.CatmullRomCurve3([a, a.clone().addScaledVector(F, 0.6 * K).add(V(0, 0.3 * K, 0)), a.clone().addScaledVector(F, 5 * K).add(V(0, 1.4 * K, 0)), lerpV(a, e, 0.5).add(V(0, 2.6 * K, 0)), e.clone().addScaledVector(axis, -3 * K), e], false, 'centripetal');
  })());
  const pos = (i: number, t: number): THREE.Vector3 => {
    const tk = TK[i], te = tk + rail(i);
    if (t < tk) return i < 2 && t > 100 ? lerpV(slotP(i), cs(i), smooth(prog(t, 100, 600))) : slotP(i); // lăn vào ray
    if (t < te) { const u = prog(t, tk, te); return lerpV(i < 2 ? cs(i) : slotP(i), ce(i), u * u); } // lao theo ray, tăng tốc
    if (t < Tc) return curve(i).getPoint(prog(t, te, Tc));
    return line(i, t);
  };
  const dirOf = (i: number, t: number) => pos(i, t + 40).sub(pos(i, t - 40));
  planes.forEach((_, i) => {
    cn.range(0, END, (u) => {
      const t = u * END, g = group[i];
      if (t > TD[i] + 1500) { g.visible = false; return; }
      g.visible = true;
      const p = pos(i, t), dr = dirOf(i, t);
      g.position.copy(p);
      if (dr.lengthSq() > 1e-9) g.lookAt(p.clone().add(dr)); else g.quaternion.copy(rig.quaternion);
      if (t > TK[i] && Math.random() < 0.6) { // vệt khói mỏng + tia chói nhẹ lửa đuôi (độ mờ thấp)
        const tail = p.clone().addScaledVector(dr.normalize(), -0.1 * K);
        host.fx.burst({ pos: tail, tex: 'smoke', size: [0.03, 0.14], life: [0.5, 0.8], opacity: 0.22, color: 0xaeb8c0 });
        host.fx.burst({ pos: tail, tex: 'glow', size: [0.04, 0.01], life: [0.08, 0.14], additive: true, color: 0xff9a50, opacity: 0.3 });
      }
    });
  });

  // ---- ray phóng: đèn, hơi nước, rung ----
  cn.range(0, 700, () => { if (Math.random() < 0.4) host.fx.burst({ pos: wp(parts.catStart[0]), tex: 'smoke', size: [0.1, 0.5], life: [0.4, 0.8], vel: V(0, 0.5, 0), spread: 0.8, opacity: 0.22, color: 0xb4bec6 }); }); // hơi nước từ ray
  cn.at(TK[0], () => { cn.shake(0.03); parts.catStart.forEach((a) => host.fx.burst({ pos: wp(a), count: 10, tex: 'smoke', size: [0.15, 0.8], life: [0.5, 1.0], vel: V(0, 0.6, 0), spread: 0.8, opacity: 0.3, color: 0xb4bec6 })); host.fx.light(wp(parts.catEnd[0]), 12, 80); });
  cn.at(TK[2], () => cn.shake(0.02));

  // ---- khung điện ảnh ----
  cn.range(0, 450, (u) => cn.barsTo(smooth(u)));
  cn.range(END - 450, END, (u) => cn.barsTo(1 - smooth(u)));

  // ---- cảnh 1: một cú máy liên tục: thấp cạnh cuối ray, từ 700 lia theo máy bay dẫn đầu, đẩy theo 35% tốc độ bay và nâng dần ----
  cn.shot(0, T1, (t) => {
    const F = frame(), k = prog(t, 700, T1), lookK = smooth(prog(t, 700, 1100));
    const p = F.P(2.2 + 0.35 * SPEED * Math.max(0, t - 700) / 1000, lerp(0.9, 1.6, smooth(k)), lerp(0.12, 1.0, smooth(k)));
    return pose(p, lerpV(F.P(1.4, 0.1, 0.15), pos(0, t), lookK), lerp(28, 34, t / T1));
  });
  // ---- cảnh 2: camera đứng ở mặt nước bên cạnh dải mục tiêu, nhìn lên đàn máy bay ----
  cn.shot(T1, END, (t) => {
    const bob = 0.15 * K * Math.sin(t / 650) * 0.4;
    return pose(M.clone().addScaledVector(axis, -0.4 * K).addScaledVector(Rax, 4.6 * K).add(V(0, 0.35 * K + bob, 0)), M.clone().add(V(0, 1.1 * K, 0)), 38);
  });
  c.gs = T1; if (c.G) cn.setGuard(T1, c.G);
  cn.slow(4600, 5200, 0.6);

  // ---- thả tên lửa: máy bay i thả một quả xuống ô i; tách giá, nổ máy sau 250 ms rồi lao xuống (hero ×1.5) ----
  for (let i = 0; i < 4; i++) {
    const cell = cellOf(i);
    if (!cell) continue; // ô ngoài lưới: máy bay vẫn bay qua nhưng không thả
    const tr = TD[i], ti = tr + FALL;
    cn.at(tr, () => { const m = group[i]?.children[2]; if (m) m.visible = false; }); // quả tên lửa tách khỏi giá treo
    cn.at(tr + 250, () => host.fx.burst({ pos: line(i, tr + 250).add(V(0, -0.3 * K, 0)), count: 4, tex: 'fire', size: [0.2, 0.05], life: [0.15, 0.3], additive: true, color: 0xff9a50, spread: 0.2 })); // nổ máy: lửa đuôi cam
    cn.projectile(() => {
      const from = line(i, tr).add(V(0, -0.05 * K, 0)), to = c.cw(cell).setY(0.1 * K);
      return (u) => lerpV(from, to, u).setY(lerp(from.y, to.y, u ** 1.5));
    }, tr, ti, 'missile', c.G && c.nullified.has(key(cell)) ? 0.75 : 1);
    c.mark(ti);
    cn.cellImpact(c, cell, 'missile', ti);
  }
  return END;
}
