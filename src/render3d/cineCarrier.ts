import * as THREE from 'three';
import type { Cinematic, Ctx } from './cinematic';
import { CELL as K } from './scale';
import { type CamPose, UP, V, key, lerp, lerpV, prog, smooth, wp } from './cineUtil';

/**
 * Tàu sân bay `line3` (cinematics.md mục 6, 6750 ms, đúng ba cảnh chính):
 *  1. 0–2400 máy bay cất cánh, camera thấp ở mép mũi nhìn ngược dọc ray, từ 1150 lia theo máy bay;
 *  2. 2400–4350 camera đứng yên thấp sát mặt nước bên địch nhìn lên, đội hình ba máy bay bay qua đầu (3300–3600);
 *  3. 4350–6750 camera thấp bên cạnh dải mục tiêu, tên lửa rơi xuống từng ô (tImpact 5400, 5625, 5850), chậm 0.6× quanh vụ nổ đầu.
 * Dải đen 2.39:1 vào 450 ms đầu, ra 450 ms cuối. Chưa làm: độ sâu trường ảnh, `jbd_*` dựng lên.
 */
const TK = [700, 700, 1150];        // mốc ray bắn / lăn bánh của plane_0, 1, 2
const TP = [3300, 3450, 3600];      // mốc bay qua đầu camera cảnh 2
const REL = [4350, 4575, 4800];     // mốc thả
const FALL = 1050;                  // thả → chạm (5400, 5625, 5850)
const END = 6750;
const SPEED = 9;                    // ô/giây của đội hình ở cảnh 2
const pose = (pos: THREE.Vector3, look: THREE.Vector3, fov: number): CamPose => ({ pos, look, fov });

export function buildLine3(cn: Cinematic, c: Ctx): number {
  const host = cn.host, rig = c.rig, parts = rig.userData.parts;
  const cells = c.shot.cells, n = cells.length;
  const frame = () => c.frameNow();
  const dir = c.dir;
  const np = V(-dir.z, 0, dir.x);

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

  const slot = (i: number) => wp(planes[i]);
  const cs = (i: number) => wp(parts.catStart[Math.min(i, parts.catStart.length - 1)]);
  const ce = (i: number) => wp(parts.catEnd[Math.min(i, parts.catEnd.length - 1)]);
  const rail = (i: number) => (i < 2 ? 450 : 600);

  // cảnh 2: camera đứng yên ở nước bên bị tấn công, đội hình chữ V bay dọc `dir` qua đầu camera
  const camPos = () => c.T.P(-2.0, 1.0, 0.10);
  const lat = [0, -0.9, 0.9];
  const pass = (i: number) => camPos().addScaledVector(np, lat[i] * K).setY(2.2 * K);
  const line = (i: number, t: number) => pass(i).addScaledVector(dir, SPEED * K * ((t - TP[i]) / 1000)).add(V(0, 0.6 * K * ((t - TP[i]) / 1000), 0));
  const T1 = 2400; // hết cảnh 1: máy bay tới đầu đoạn thẳng cảnh 2
  const curves: (THREE.CatmullRomCurve3 | null)[] = [null, null, null];
  const curve = (i: number) => (curves[i] ??= (() => {
    const F = frame().F, a = ce(i), e = line(i, T1);
    return new THREE.CatmullRomCurve3([a, a.clone().addScaledVector(F, 0.6 * K).add(V(0, 0.3 * K, 0)), a.clone().addScaledVector(F, 5 * K).add(V(0, 1.4 * K, 0)), lerpV(a, e, 0.5).add(V(0, 2.6 * K, 0)), e.clone().addScaledVector(dir, -3 * K), e], false, 'centripetal');
  })());
  const pos = (i: number, t: number): THREE.Vector3 => {
    const tk = TK[i], te = tk + rail(i);
    if (t < tk) return i < 2 && t > 100 ? lerpV(slot(i), cs(i), smooth(prog(t, 100, 600))) : slot(i); // lăn vào ray
    if (t < te) { const u = prog(t, tk, te); return lerpV(i < 2 ? cs(i) : slot(i), ce(i), u * u); } // lao theo ray, tăng tốc
    if (t < T1) return curve(i).getPoint(prog(t, te, T1));
    return line(i, t);
  };
  const dirOf = (i: number, t: number) => pos(i, t + 40).sub(pos(i, t - 40));
  planes.forEach((_, i) => {
    cn.range(0, END, (u) => {
      const t = u * END, g = group[i];
      if (t > TP[i] + 1300) { g.visible = false; return; }
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

  // ---- cảnh 1: góc thấp ở mép mũi nhìn ngược dọc ray, từ 1150 lia theo máy bay đầu ----
  cn.shot(0, T1, (t) => {
    const F = frame(), k = smooth(prog(t, 1150, T1));
    const look = lerpV(F.P(1.2, 0.1, 0.15), pos(0, t).add(V(0, 0.2 * K, 0)), k);
    return pose(F.P(2.75, 0.25, lerp(0.20, 0.45, k)), look, 24);
  });
  // ---- cảnh 2: camera đứng yên thấp sát mặt nước bên địch, nhìn lên ----
  cn.shot(T1, 4350, () => pose(camPos(), c.T.P(-0.6, 0, 3.2), 34));
  // ---- cảnh 3: camera thấp bên cạnh dải mục tiêu, đứng yên / đẩy vào rất chậm ----
  cn.shot(4350, END, (t) => {
    const k = 0.3 * prog(t, 4350, END);
    return pose(c.T.P(-3.2 + k, 1.8, 0.60), c.T.P(0, 0, 0.20), 32);
  });
  c.gs = 4350; if (c.G) cn.setGuard(4350, c.G);
  cn.slow(5300, 5800, 0.6); // chậm 0.6× quanh vụ nổ đầu

  // ---- thả tên lửa: rơi từ mép trên khung xuống từng ô (hero ×1.5, đầu sáng nhỏ, vệt khói xám) ----
  cells.slice(0, 3).forEach((cell, i) => {
    const tr = REL[i], ti = tr + FALL;
    cn.projectile(() => {
      const to = c.cw(cell).setY(0.1 * K), from = to.clone().addScaledVector(dir, -2.0 * K).setY(8 * K);
      return (u) => lerpV(from, to, u).setY(lerp(from.y, to.y, u ** 1.5));
    }, tr, ti, 'bomb', c.G && c.nullified.has(key(cell)) ? 0.75 : 1);
    c.mark(ti);
    cn.cellImpact(c, cell, 'missile', ti);
  });
  void UP; void n;
  return END;
}
