import * as THREE from 'three';
import type { Cinematic, Ctx } from './cinematic';
import { CELL as K } from './scale';
import { type CamPose, UP, V, deg, key, lerp, lerpV, named, prog, smooth, wp } from './cineUtil';

/**
 * Siêu chiến hạm `barrage` (design/cinematics.md mục 11, 8400 ms, ba cảnh):
 *  1. 0–1800 quay nòng: năm tháp xoay về năm ô khác nhau, từ trên chéo sau;
 *  2. 1800–3900 mạn tàu thấy cả thân: tháp i khai hỏa ở 2100/2250/2400/2700/2850, mỗi tháp ba viên cách nhau 40 ms (15 viên),
 *     chèn hai cận nòng (2040–2640 đội mũi, 2640–3240 đội lái), chậm 0.6× quanh 2070–2670;
 *  3. 3900–8400 toàn chiến trường: camera nhìn xuống tâm lưới bị bắn từ độ cao 11 ô, đi vòng 60° (−30° → +30°), năm cụm đạn rơi ở 4500/4650/4800/5100/5250.
 * Ô thứ i do tháp i + 1 bắn (thứ tự rút của core); còn n < 5 ô thì n tháp đầu bắn, các tháp còn lại chỉ quay nòng.
 * Toạ độ thiết kế theo ĐV với CELL = 10, nên đổi sang thế giới nhân `K / 10`.
 */
const TF = [2100, 2250, 2400, 2700, 2850];  // tháp i khai hỏa
const TI = [4500, 4650, 4800, 5100, 5250];  // tháp i chạm đích (bay 2400 ms)
const SALVO_GAP = 40;                       // ba nòng một tháp cách nhau
const END = 8400;
const S = K / 10;                           // ĐV thiết kế → thế giới
const pose = (pos: THREE.Vector3, look: THREE.Vector3, fov: number): CamPose => ({ pos, look, fov });

export function buildBarrage(cn: Cinematic, c: Ctx): number {
  const rig = c.rig, parts = rig.userData.parts, host = cn.host, fx = host.fx;
  const cells = c.shot.cells, n = cells.length;
  const tus = parts.turrets.slice(0, 5);
  const aimCell = (i: number) => cells[i % Math.max(1, n)];
  const frac = (i: number) => (c.G && c.nullified.has(key(cells[i])) ? 0.75 : 1);

  // ---- cảnh 1: quay nòng (tháp lệch nhau 80 ms, tối đa 1400 ms), nòng ngẩng 40°, pháo phụ xoay theo, đường ngắm cam ----
  tus.forEach((tu, i) => {
    const w = () => c.cw(aimCell(i));
    cn.range(i * 80, 1400, (u) => { cn.aimTurret(rig, tu, w(), smooth(u)); tu.pitch.rotation.x = -deg(40) * smooth(u); });
    if (i < n) cn.aimLine(tu.muzzle, w(), 0, TF[i]);
  });
  for (let k = 1; k <= 8; k++) { // pháo phụ chỉ xoay theo cho đẹp, không bắn
    const s = named(rig, `turret_s${k}`);
    if (!s) continue;
    cn.snap(s);
    const to = (k % 2 ? 1 : -1) * deg(40 + 7 * k);
    cn.range(0, 1400, (u) => { s.rotation.y = to * smooth(u); });
  }
  cn.at(0, () => { const p = wp(rig).add(V(0, 0.5 * K, 0)); fx.light(p, 60, 500, 0xff8a1f); }); // đèn hazard nhấp nháy mở màn

  cn.shot(0, 1800, (t) => { const F = c.frameNow(), k = prog(t, 0, 1800); return pose(F.P(lerp(-3.0, -2.4, k), lerp(1.8, 1.5, k), lerp(4.6, 4.4, k)), F.P(0, 0, 0.1), 40); });
  // ---- cảnh 2: mạn tàu, thấy cả thân (100%) và khoảng trống phía mũi để thấy đạn bay ----
  cn.shot(1800, 3900, () => { const F = c.frameNow(); return pose(F.P(0, 4.2, 0.45), F.P(0, 0, 0.15), 42); });
  if (n > 0) cn.shot(2040, 2640, () => { const F = c.frameNow(); return pose(F.P(1.5, 0.9, 0.5), wp(tus[Math.min(1, tus.length - 1)].yaw), 32); }, 0, 1); // đội mũi
  if (n > 3) cn.shot(2640, 3240, () => { const F = c.frameNow(); return pose(F.P(-1.2, 0.9, 0.5), wp(tus[Math.min(3, tus.length - 1)].yaw), 32); }, 0, 1); // đội lái
  cn.slow(2070, 2670, 0.6);

  // ---- cảnh 3: toàn chiến trường, nhìn xuống tâm lưới bị bắn, đi vòng 1/6 đường tròn ----
  const grid = c.cw({ x: 4, y: 4 }).add(c.cw({ x: 5, y: 5 })).multiplyScalar(0.5).setY(0);
  const D = c.T.F.clone().multiplyScalar(-1); // từ tâm lưới về phía bên bắn
  const RAD = 60 * S, HGT = 110 * S;
  const orbit = (t: number) => {
    const phi = deg(-30 + 60 * smooth(prog(t, 3900, END)));
    return grid.clone().addScaledVector(D, RAD * Math.cos(phi)).addScaledVector(c.T.R, RAD * Math.sin(phi)).addScaledVector(UP, HGT);
  };
  cn.shot(3900, END, (t) => pose(orbit(t), grid.clone(), 45));
  c.gs = 3900; if (c.G) cn.setGuard(3900, c.G);

  // ---- khai hỏa: ba viên cách nhau 40 ms, bay cung cao 2400 ms, rơi lệch tối đa 0.4 ĐV quanh ô ----
  const side = Math.sign(c.dir.dot(c.frameNow().R)) || 1;
  for (let i = 0; i < Math.min(n, tus.length); i++) {
    const tu = tus[i], cell = cells[i], ms = tu.muzzles ?? [tu.muzzle];
    cn.at(TF[i], () => {
      const from = wp(ms[0]), dir = c.cw(cell).sub(from).setY(0).normalize();
      fx.muzzle(from, dir, true);
      fx.ring(from.clone().setY(0), 3.0, 0.9, 0xffd0a0);
      fx.light(from.clone().add(V(0, 0.4 * K, 0)), 200, 220);
      fx.burst({ pos: from, count: 8, tex: 'smoke', size: [0.3, 1.2], life: [0.8, 1.4], opacity: 0.5, color: 0xcfcfcf, vel: V(0, 0.5, 0), spread: 0.8 });
      cn.shake(0.08);
    });
    cn.recoil(tu, TF[i], 0.025, 300);
    ms.forEach((m, j) => {
      const tf = TF[i] + SALVO_GAP * j, ti = TI[i] + SALVO_GAP * j;
      const off = V((Math.random() - 0.5) * 0.8 * S, 0, (Math.random() - 0.5) * 0.8 * S); // lệch tối đa 0.4 ĐV
      if (j > 0) cn.at(tf, () => fx.muzzle(wp(m), c.cw(cell).sub(wp(m)).setY(0).normalize(), true));
      cn.projectile(() => {
        const from = wp(m), to = c.cw(cell).setY(0.1 * K).add(off), d = from.distanceTo(to) / S; // d: ĐV thiết kế
        const peak = (35 + 0.4 * d) * S;
        return (u) => lerpV(from, to, u).add(V(0, Math.sin(u * Math.PI) * peak, 0));
      }, tf, ti, 'shell', frac(i));
      if (j > 0 && !(c.G && c.nullified.has(key(cell)))) cn.at(ti, () => fx.burst({ pos: c.cw(cell).add(off).setY(0.15 * K), count: 3, tex: 'fire', size: [0.25, 0.05], life: [0.15, 0.3], additive: true, color: 0xff9a2a, spread: 0.2 }));
    });
    c.mark(TI[i]);
    cn.cellImpact(c, cell, 'shell', TI[i]);
  }
  // tàu chao: lăn +4° trong 450 ms rồi tắt dần 1500 ms, chúi 1.6°, nhấc lên 0.5 ĐV (hướng ngược chiều bắn)
  cn.range(TF[0], TF[0] + 1950, (u) => {
    const t = u * 1950, k = t < 450 ? t / 450 : Math.max(0, 1 - (t - 450) / 1500);
    rig.userData.kick.roll = deg(4) * k * -side; rig.userData.kick.pitch = deg(1.6) * k; rig.userData.yOffset = 0.05 * K * k;
  });
  return END;
}
