import * as THREE from 'three';
import type { Cell } from '../../design/core-api';
import type { Cinematic, Ctx } from './cinematic';
import type { Turret } from './shipModels';
import { CELL as K } from './scale';
import { type CamPose, V, deg, key, lerp, lerpV, named, prog, smooth, wp } from './cineUtil';

/**
 * Bốn đòn đánh "thường" theo design/cinematics.md mục 2–5: khu trục hạm `rapid` 4800 ms, tuần dương `precision` 5250 ms,
 * tàu tên lửa `cross` 6600 ms, tàu ngầm `torpedo` 8100 ms. Mọi mốc là mốc thiết kế (chưa tính chèn hộ vệ).
 * Mỗi hàm trả về tổng thời lượng (ms). Khác bảng thiết kế: mốc chạm `tImpact` của khu trục hạm đặt 3300/3975 thay vì 3000/3675
 * để vụ nổ nằm trong cảnh trúng đích (cảnh đó bắt đầu 3150), xem PROGRESS.md.
 */

const pose = (pos: THREE.Vector3, look: THREE.Vector3, fov: number): CamPose => ({ pos, look, fov });
/** Tháp giả cho tàu hỏng khí tài (không còn tháp pháo): bắn từ neo `launch`. */
const fakeTurret = (c: Ctx): Turret => ({ yaw: new THREE.Object3D(), pitch: new THREE.Object3D(), muzzle: c.rig.userData.parts.launch, recoil: new THREE.Object3D() });
const guardAt = (cn: Cinematic, c: Ctx, gs: number) => { c.gs = gs; if (c.G) cn.setGuard(gs, c.G); };
/** Đạn của ô bị hộ vệ triệt tiêu chỉ bay tới 75% đường (cảnh hộ vệ lo phần còn lại). */
const fracOf = (c: Ctx, cell: Cell) => (c.G && c.nullified.has(key(cell)) ? 0.75 : 1);

/** Bắn một viên đạn pháo từ đầu nòng: lửa mõm, rung, nòng thụt, đạn bay cung. */
function fireShell(cn: Cinematic, c: Ctx, tu: Turret, muzzle: THREE.Object3D, cell: Cell, tf: number, tImp: number, big: boolean, arc: number, kind: 'shell' | 'sneak' = 'shell') {
  cn.at(tf, () => {
    const from = wp(muzzle), to = c.cw(cell).setY(0.1 * K), fx = cn.host.fx;
    fx.muzzle(from, to.clone().sub(from).normalize(), big);
    if (big) {
      fx.ring(from.clone().setY(0), 2.2, 0.8, 0xffd0a0); // sóng xung kích lan trên mặt nước
      fx.light(from.clone().add(V(0, 0.4 * K, 0)), 200, 200); // chiếu sáng cả thân tàu và mặt nước
    }
    cn.shake(big ? 0.05 : 0.02);
  });
  cn.recoil(tu, tf, big ? 0.025 : 0.012);
  cn.projectile(() => {
    const from = wp(muzzle), to = c.cw(cell).setY(0.1 * K), peak = arc * from.distanceTo(to);
    return (u) => lerpV(from, to, u).add(V(0, Math.sin(u * Math.PI) * peak, 0));
  }, tf, tImp, kind, fracOf(c, cell));
}

// ---------- rapid: Khu trục hạm (4800 ms) ----------
export function buildRapid(cn: Cinematic, c: Ctx): number {
  const cells = c.shot.cells, two = cells.length >= 2;
  const real = c.rig.userData.parts.turrets;
  const tus = [real[0] ?? fakeTurret(c), real[1] ?? real[0] ?? fakeTurret(c)];
  const TF = [1725, 2400], TI = [3300, 3975];
  const t3 = two ? 3150 : 2700; // cảnh trúng đích (1 ô: cảnh mạn tàu kéo tới 2700)
  // hai tháp quay về hai hướng khác nhau (0–1800 ms); đường ngắm cam tắt khi bắn
  cells.slice(0, 2).forEach((cell, i) => {
    cn.range(0, 1800, (u) => cn.aimTurret(c.rig, tus[i], c.cw(cell), smooth(u)));
    cn.aimLine(tus[i].muzzle, c.cw(cell), 0, TF[i]);
  });
  cn.shot(0, 1500, (t) => { const F = c.frameNow(), k = prog(t, 0, 1500); return pose(F.P(lerp(-2.2, -1.8, k), lerp(1.2, 1.0, k), 3.0), F.P(0.2, 0, 0.1), 40); });
  cn.shot(1500, t3, (t) => { const F = c.frameNow(), k = prog(t, 1500, 3150); return pose(F.P(lerp(0.1, 0.2, k), lerp(1.35, 1.3, k), lerp(0.30, 0.28, k)), F.P(0.1, 0, lerp(0.08, 0.08, k)), 40); });
  cn.shot(1680, 2250, () => { const F = c.frameNow(); return pose(F.P(1.0, 0.28, 0.14), wp(tus[0].muzzle), 30); }, 0, 1);
  if (two) cn.shot(2355, 2925, () => { const F = c.frameNow(); return pose(F.P(-0.2, 0.30, 0.14), wp(tus[1].muzzle), 30); }, 0, 1);
  const mid = c.cellsW.length > 1 ? lerpV(c.cellsW[0], c.cellsW[1], 0.5) : c.cellsW[0];
  cn.shot(t3, 4800, (t) => pose(c.T.P(lerp(-3.0, -2.6, prog(t, t3, 4800)), 0.5, 3.2), mid.clone(), 36));
  guardAt(cn, c, t3);
  cells.slice(0, 2).forEach((cell, i) => {
    fireShell(cn, c, tus[i], tus[i].muzzle, cell, TF[i], TI[i], false, 0.15);
    c.mark(TI[i]);
    cn.cellImpact(c, cell, 'shell', TI[i]);
  });
  return 4800;
}

// ---------- precision: Tuần dương (5250 ms) ----------
export function buildPrecision(cn: Cinematic, c: Ctx): number {
  const real = c.rig.userData.parts.turrets;
  const tus = real.length ? real : [fakeTurret(c)];
  const cell = c.shot.cells[0];
  const muzzle = named(c.rig, 'muzzle_1R') ?? tus[0].muzzle;
  const TF = 1950, TI = 3675;
  cn.range(0, 1500, (u) => tus.forEach((tu) => { cn.aimTurret(c.rig, tu, c.cw(cell), smooth(u)); tu.pitch.rotation.x = -deg(35) * smooth(u); })); // ba tháp quay, nòng ngẩng 35°
  cn.aimLine(muzzle, c.cw(cell), 0, TF);
  cn.shot(0, 1650, (t) => { // đỉnh nhìn thẳng, chéo từ sau, kéo vào 0.5 ô
    const F = c.frameNow(), look = F.P(0.4, 0, 0), p = F.P(-1.3, 0.5, 5.6);
    return pose(p.add(look.clone().sub(p).setLength(0.5 * K * prog(t, 0, 1650))), look, 36);
  });
  cn.shot(1650, 3450, () => { const F = c.frameNow(); return pose(F.P(0.3, 2.1, 0.25), F.P(0.3, 0, 0.05), 42); }); // mạn tàu thấy cả thân
  cn.shot(1920, 2550, () => { const F = c.frameNow(); return pose(F.P(1.2, 0.55, 0.14), wp(muzzle), 30); }, 0, 1); // cận nòng: đạn pháo lớn rời nòng
  cn.shot(3450, 5250, (t) => pose(c.T.P(lerp(-4.0, -3.2, prog(t, 3450, 5250)), 0, 3.0), c.cw(cell), 34));
  guardAt(cn, c, 3450);
  cn.slow(1875, 2475, 0.6);
  fireShell(cn, c, tus[0], muzzle, cell, TF, TI, true, 0.35);
  // tàu chao: lăn 3° ngược hướng bắn trong 375 ms rồi tắt dần 1350 ms, chúi 1.2°; hai tháp còn lại giật 40%
  const side = Math.sign(c.dir.dot(c.frameNow().R)) || 1;
  cn.range(TF, TF + 1725, (u) => { const ms = u * 1725, k = ms < 375 ? ms / 375 : Math.max(0, 1 - (ms - 375) / 1350); c.rig.userData.kick.roll = deg(3) * k * -side; c.rig.userData.kick.pitch = deg(1.2) * k; });
  tus.slice(1).forEach((tu) => cn.recoil(tu, TF, 0.01));
  c.mark(TI);
  cn.cellImpact(c, cell, 'shell', TI);
  return 5250;
}

// ---------- cross: Tàu tên lửa (6600 ms) ----------
export function buildCross(cn: Cinematic, c: Ctx): number {
  const ls = c.rig.userData.parts.launchers;
  const cells = c.shot.cells.slice(0, 5);
  // nắp khoang mở 450 ms; launcher_0..4 trồi lên và ngẩng 75° trong 1200 ms (lệch nhau 120 ms)
  cn.at(450, () => ls.forEach((l) => { l.base.visible = true; }));
  ls.forEach((l, i) => cn.range(450 + i * 120, 450 + i * 120 + 1200, (u) => { l.base.position.y = (l.base.userData.y0 ?? 0) + lerp(-0.1, 0, smooth(Math.min(1, u * 2))); l.pitch.rotation.x = -deg(75) * smooth(u); }));
  cn.shot(0, 2250, (t) => { const F = c.frameNow(); return pose(F.P(lerp(-0.1, 0.4, prog(t, 0, 2250)), 3.0, 0.8), F.P(-0.1, 0, 0.1), 40); });
  cn.shot(2250, 3450, () => { const F = c.frameNow(); return pose(F.P(0.4, 3.2, 0.5), F.P(-0.1, 0, 0.1), 42); });
  cn.shot(2370, 3000, () => { const F = c.frameNow(); return pose(F.P(0.95, 0.95, 0.40), F.P(0.91, 0, 0.10), 36); }, 0, 1); // dãy trước: 3 tên lửa rời ống
  cn.shot(3000, 3450, () => { const F = c.frameNow(); return pose(F.P(-1.15, 0.9, 0.40), F.P(-1.07, 0, 0.10), 36); }, 0, 1); // dãy sau
  cn.shot(3450, 5100, (t) => pose(c.T.P(-8, 0, lerp(9.0, 7.4, prog(t, 3450, 5100))), c.C.clone(), 40)); // chùm bay vòng parabol
  cn.shot(5100, 6600, () => pose(c.T.P(-3.5, 0, 2.4), c.C.clone(), 34)); // chạm đích
  guardAt(cn, c, 5100);
  cn.at(2250, () => cn.shake(0.07));
  cells.forEach((cell, i) => {
    const tl = 2250 + i * 90, ti = 5175 + i * 180, l = ls[i % Math.max(1, ls.length)];
    cn.at(tl, () => {
      const from = wp(l.base).add(V(0, 0.1 * K, 0)), fx = cn.host.fx;
      fx.burst({ pos: from, vel: V(0, 1.2, 0), count: 10, tex: 'smoke', size: [0.15, 0.9], life: [0.8, 1.4], spread: 0.4, opacity: 0.6, color: 0xffffff }); // fx_launch: cột khói trắng
      fx.burst({ pos: from, count: 3, tex: 'fire', size: [0.3, 0.7], life: [0.15, 0.3], additive: true });
      if (i === 0) fx.light(from, 80, 900);
    });
    cn.projectile(() => {
      const from = wp(l.base).add(V(0, 0.1 * K, 0)), to = c.cw(cell).setY(0.1 * K);
      const apex = (6 + 0.4 * from.distanceTo(to) / K) * K; // đỉnh parabol: 6 + 0.4 × khoảng cách (ô)
      const p1 = from.clone().add(V(0, apex * 1.3, 0)), p2 = to.clone().add(V(0, apex * 1.0, 0)).lerp(to, 0.3);
      return (u) => { const w = 1 - u; return from.clone().multiplyScalar(w * w * w).addScaledVector(p1, 3 * w * w * u).addScaledVector(p2, 3 * w * u * u).addScaledVector(to, u * u * u); };
    }, tl, ti, 'missile', fracOf(c, cell));
    c.mark(ti);
    cn.cellImpact(c, cell, 'missile', ti);
  });
  return 6600;
}

// ---------- torpedo: Tàu ngầm (6300 ms) ----------
/** Một đường camera liên tục không cắt: dưới nước (0–600 ms) → xuyên mặt nước ≈900 ms → lên cao thấy cả tàu và nơi bắn (2400 ms). */
export function buildTorpedo(cn: Cinematic, c: Ctx): number {
  const rig = c.rig, parts = rig.userData.parts, host = cn.host;
  const cells = c.shot.cells, n = cells.length;
  const W = cells.map((x) => c.cw(x).setY(0.03 * K));
  const d = (n > 1 ? W[n - 1].clone().sub(W[0]) : V(0, 0, -1)).setY(0).normalize();
  const entry = W[0].clone().addScaledVector(d, -2.2 * K);
  // ---- tàu trồi lên cùng lúc camera đi lên ----
  cn.at(0, () => host.setUnderwater(true));
  cn.at(880, () => { // camera chạm mặt nước: vệt nước trên ống kính 300 ms, màu chuyển sang cảnh trên mặt
    host.setUnderwater(false);
    const cam = cn.lastCam;
    if (cam) for (let i = 0; i < 12; i++) host.fx.burst({ pos: cam.pos.clone().addScaledVector(cam.look.clone().sub(cam.pos).normalize(), 0.35 * K).add(V((Math.random() - 0.5) * 0.35, (Math.random() - 0.2) * 0.25, (Math.random() - 0.5) * 0.35).multiplyScalar(K)), tex: 'drop', size: [0.06, 0.02], life: [0.2, 0.3], vel: V(0, -0.3, 0), grav: 1, color: 0xa9bcc8, opacity: 0.5 });
  });
  cn.range(0, 1500, (u) => { rig.userData.yOffset = lerp(-0.35, 0.05, smooth(u)) * K; }); // nổi lên Δy +0.05 để nắp ống trên mặt nước
  cn.range(0, 1500, () => { if (Math.random() < 0.5) host.fx.burst({ pos: cn.wp(rig).add(V((Math.random() - 0.5) * 0.4, -0.1, (Math.random() - 0.5) * 2).multiplyScalar(K)), tex: 'drop', size: [0.07, 0.02], life: [0.4, 0.7], vel: V(0, 0.8, 0), color: 0xb4c8d4, opacity: 0.6 }); }); // bọt khí ballast
  parts.flaps.forEach((f, i) => cn.range(1500 + i * 120, 1500 + i * 120 + 300, (u) => { f.rotation.x = deg(80) * smooth(u); })); // nắp ống mở 1500–1900, lệch 120 ms
  cn.at(1500, () => host.fx.burst({ pos: wp(parts.launch), count: 8, tex: 'smoke', size: [0.1, 0.5], life: [0.6, 1.0], vel: V(0, 0.4, 0), spread: 0.4, opacity: 0.2, color: 0xa9b8c2 })); // hơi nước

  // ---- camera ----
  cn.shot(0, 2400, (t) => {
    const F = c.frameNow(), kU = smooth(prog(t, 600, 2100)), kF = smooth(prog(t, 600, 2100)), kL = smooth(prog(t, 600, 2400)), kR = smooth(prog(t, 900, 2100));
    return pose(F.P(lerp(0.4, 0.2, kF), lerp(2.6, 2.2, kR), lerp(-0.15, 1.7, kU)), F.P(lerp(0.4, 0.8, kL), 0, lerp(-0.02, 0, kL)), lerp(50, 44, kL));
  });
  cn.shot(2400, 4500, (t) => { const F = c.frameNow(); return pose(F.P(0.2 + 0.4 * prog(t, 2400, 4500), 2.2, 1.7), F.P(0.8, 0, 0), 44); }); // trên cao, trôi chậm về phía mũi
  cn.shot(2640, 3240, () => { const F = c.frameNow(); return pose(F.P(1.9, 0.7, 0.25), F.P(1.4, 0, 0.05), 32); }, 0, 1); // cận nơi phóng
  // ---- tên lửa-ngư lôi: vọt lên khỏi ống, bay sát mặt biển dọc đường đã chọn ----
  const lenB = entry.distanceTo(W[n - 1]);
  const tB = Math.min(1300, Math.max(900, (lenB / (7 * K)) * 1000));
  const TS = (i: number) => 2700 + i * 225, TE = (i: number) => 4500 + i * 150, TH = (i: number) => TE(i) + tB;
  const Y = 0.16 * K; // cao 0.12–0.2 ô
  for (let i = 0; i < 4; i++) {
    cn.at(TS(i), () => { const p = wp(parts.launch); host.fx.burst({ pos: p, count: 6, tex: 'drop', size: [0.1, 0.04], life: [0.4, 0.8], vel: V(0, 1.2, 0), spread: 0.8, grav: 3, color: 0xa9bcc8, opacity: 0.6 }); host.fx.burst({ pos: p, count: 4, tex: 'smoke', size: [0.15, 0.6], life: [0.6, 1.0], opacity: 0.3, color: 0xb4bec6 }); if (i === 0) cn.shake(0.02); });
    cn.projectile(() => {
      const launch = wp(parts.launch), tA = TE(i) - TS(i), uA = tA / (tA + tB);
      return (u) => {
        if (u < uA) { const a = u / uA; return lerpV(launch, entry, a).setY(lerp(launch.y, Y, smooth(a)) + 0.6 * K * Math.sin(Math.PI * Math.min(1, a * 2.5)) * (1 - a)); }
        const b = (u - uA) / (1 - uA), p = lerpV(entry, W[n - 1], b);
        return p.setY(b > 0.9 ? lerp(Y, 0.05 * K, (b - 0.9) / 0.1) : Y);
      };
    }, TS(i), TH(i), 'torpedo', 1);
  }
  cn.shot(4500, 6300, (t) => { const k = prog(t, 4500, 6300); return pose(entry.clone().addScaledVector(d, (-2.0 - 0.8 * k) * K).add(V(0, 4.5 * K, 0)), lerpV(entry, W[n - 1], 0.7), 45); });
  guardAt(cn, c, 4500);
  // ---- kết quả từng ô theo đầu ngư lôi đi qua ----
  const last = c.results.get(key(cells[n - 1]));
  const hit = last?.result === 'hit';
  cells.forEach((cell, k) => {
    const ti = TE(0) + (entry.distanceTo(W[k]) / lenB) * tB, w = W[k], ev = c.results.get(key(cell)), isLast = k === n - 1;
    if (c.nullified.has(key(cell)) && c.G) { if (isLast) c.mark(ti); return; }
    cn.at(ti, () => {
      host.fx.ring(w, 0.7, 0.6, 0xbfe6f5); // mỗi ô đi qua phát một vòng sóng
      if (ev?.result === 'miss') host.fx.burst({ pos: w, count: 3, tex: 'drop', size: [0.08, 0.03], life: [0.3, 0.5], vel: V(0, 0.8, 0), spread: 0.4, grav: 3 });
      if (isLast && hit) { host.fx.hit(w.clone().setY(0.1 * K), true); cn.shake(0.06); } // nổ dưới thân, cột nước 1.4 (fx_hit_torpedo)
    });
    if (ev) cn.emit(ti, ev);
    if (isLast) c.mark(ti);
  });
  if (hit && !(c.nullified.has(key(cells[n - 1])) && c.G)) for (let i = 1; i < 4; i++) cn.at(TH(i), () => host.fx.hit(W[n - 1].clone().addScaledVector(d, -0.35 * i * K).setY(0.1 * K), true)); // ba quả sau nổ thứ phát cách 150 ms
  if (!hit) cn.at(TH(3), () => host.fx.ring(W[n - 1], 1.2, 0.8, 0xbfe6f5)); // trượt hết: vòng sóng cuối, chìm dần
  return 6300;
}
