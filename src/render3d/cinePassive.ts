import * as THREE from 'three';
import type { Cell, GameEvent } from '../../design/core-api';
import type { Cinematic, Ctx, ProjStyle } from './cinematic';
import type { Turret } from './shipModels';
import { CELL as K } from './scale';
import { type CamPose, V, deg, key, lerp, lerpV, named, prog, smooth, wp } from './cineUtil';

/**
 * Hai kỹ năng nội tại (cinematics.md mục 9): tàu cắn lén `sneak` (1500 ms) và tàu hộ vệ `guard`
 * (cảnh 1 PHÁT HIỆN 0–900 ms, cảnh 2 CHẾ ÁP 900–2250 ms, chèn vào cảnh trúng đích của đòn địch).
 */
const pose = (pos: THREE.Vector3, look: THREE.Vector3, fov: number): CamPose => ({ pos, look, fov });

// ---------- sneak ----------
export function buildSneak(cn: Cinematic, c: Ctx): number {
  const real = c.rig.userData.parts.turrets[0];
  const tu: Turret = real ?? { yaw: new THREE.Object3D(), pitch: new THREE.Object3D(), muzzle: c.rig.userData.parts.launch, recoil: new THREE.Object3D() };
  const cell = c.shot.cells[0];
  const close = named(c.rig, 'cam_close');
  cn.range(100, 290, (u) => cn.aimTurret(c.rig, tu, c.cw(cell), smooth(u))); // pháo nhỏ quay nhanh tới ô ngẫu nhiên (190 ms)
  cn.shot(0, 655, () => { const F = c.frameNow(); return pose(close ? wp(close) : F.P(0.45, 0.38, 0.14), wp(tu.muzzle), 34); });
  const TF = 700, TI = 1500;
  const from = () => wp(tu.muzzle), to = () => c.cw(cell).setY(0.1 * K);
  cn.shot(655, 1405, (t) => pose(c.T.P(-3.0, 0.4, 2.6), lerpV(from(), to(), prog(t, TF, TI)), 36));
  cn.shot(1405, 1875, () => pose(c.T.P(-3.0, 0.4, 2.6), to(), 36));
  c.gs = 1405; if (c.G) cn.setGuard(1405, c.G);
  cn.at(TF, () => { const f = from(); cn.host.fx.muzzle(f, to().sub(f).normalize(), false); cn.shake(0.01); }); // fx_sneak_shot: chớp mõm nhỏ, ít tiếng
  cn.recoil(tu, TF, 0.01);
  cn.projectile(() => { const a = from(), b = to(); return (u) => lerpV(a, b, u).add(V(0, Math.sin(u * Math.PI) * 0.1 * a.distanceTo(b), 0)); }, TF, TI, 'sneak', c.G && c.nullified.has(key(cell)) ? 0.75 : 1);
  c.mark(TI);
  cn.cellImpact(c, cell, 'shell', TI, true);
  return 1875;
}

// ---------- guard ----------
export function buildGuard(cn: Cinematic, c: Ctx, ev: Extract<GameEvent, { type: 'ShotNullified' }>) {
  const host = cn.host, fx = host.fx;
  const f = c.G / 2810, gs = c.gs;
  const R = (ms: number) => gs + ms * f; // mốc thật
  const escort = cn.touch(c.target === 'own' ? (host.rig('own', ev.shipId) ?? cn.decoyRig(ev.shipId)) : cn.decoyRig(ev.shipId)); // vị trí hộ vệ địch không lộ: dùng tàu giả
  const model = escort.children[0]?.children[0] ?? escort;
  const M = (x: number, y: number, z: number) => { model.updateWorldMatrix(true, false); return model.localToWorld(V(x, y, z)); };
  const node = (n: string) => cn.snap(named(escort, n) ?? new THREE.Object3D());
  const radome = named(escort, 'radome') ?? escort;
  const ciws = [1, 2, 3, 4].map((i) => ({ yaw: node(`ciws_${i}`), pitch: node(`ciws_${i}_pitch`), spin: node(`ciws_${i}_spin`), muz: named(escort, `ciws_${i}_muzzle`) ?? escort }));
  const decoys = [1, 2, 3, 4].map((i) => named(escort, `decoy_${i}`)).filter((x): x is THREE.Object3D => !!x);
  const cells: Cell[] = ev.cells.slice(0, 5);
  const style: ProjStyle = c.shot.attack === 'torpedo' ? 'torpedo' : c.shot.attack === 'cross' || c.shot.attack === 'line3' ? 'missile' : c.shot.attack === 'sneak' ? 'sneak' : 'shell';
  const torpedo = style === 'torpedo';

  // đạn tới: dừng lửng lơ trên trời (tên lửa-ngư lôi: sát mặt nước) trước ô bị triệt tiêu
  const I = cells.map((cell) => c.cw(cell).addScaledVector(c.dir, -3.5 * K).setY((torpedo ? 0.16 : 3.0) * K));
  const ghosts = I.map((p) => { const g = cn.projMesh(style); g.grp.position.copy(p); g.grp.visible = false; g.grp.lookAt(p.clone().add(c.dir)); g.grp.scale.setScalar(K * 2.5 * ({ shell: 0.08, missile: 0.12, torpedo: 0.15, bomb: 0.12, sneak: 0.05 })[style]); return g; });
  const centroid = () => I.reduce((a, b) => a.add(b), V()).multiplyScalar(1 / Math.max(1, I.length));
  const alive = I.map(() => true);

  // ----- radar quét, khung ngắm, đường nét đứt -----
  const sweep = cn.add(new THREE.Mesh(new THREE.CircleGeometry(14 * K, 14, -0.22, 0.44).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })));
  sweep.visible = false;
  const reticles = I.map(() => { const s = cn.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: fx.reticleTex(), transparent: true, depthWrite: false, depthTest: false, fog: false, color: 0xff8a1f }))); s.scale.setScalar(1.3 * K); s.visible = false; return s; });
  const dashes = I.map(() => { const geo = new THREE.BufferGeometry().setFromPoints([V(), V()]); const l = cn.add(new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xff8a1f, dashSize: 0.25 * K, gapSize: 0.18 * K, transparent: true, opacity: 0.8, fog: false }))); l.visible = false; return l; });
  const rd = () => wp(radome);

  // cảnh 1 (0–900): phát hiện
  cn.atR(R(0), () => { fx.light(rd().add(V(0, 0.3 * K, 0)), 120, 450 * f); fx.burst({ pos: rd(), tex: 'glow', size: [0.9, 1.6], life: [0.4, 0.5], additive: true, color: 0xff8a1f, opacity: 0.8 }); }); // vòm radar sáng viền cam
  cn.rangeR(R(375), R(1250), (u) => { sweep.visible = u < 1; sweep.position.copy(rd()); sweep.rotation.y = u * Math.PI * 2; }); // fx_radar_sweep: quét 360° trong 700 ms
  cells.forEach((_, i) => cn.atR(R(375 + i * 125), () => { ghosts[i].grp.visible = true; reticles[i].visible = true; dashes[i].visible = true; })); // khóa từng đạn, cách nhau 100 ms
  cn.rangeR(R(375), R(2625), (u) => {
    const blink = Math.floor(u * 2250 * f / 90) % 2 === 0;
    cells.forEach((_, i) => {
      if (!alive[i]) return;
      reticles[i].position.copy(I[i]); (reticles[i].material as THREE.SpriteMaterial).opacity = blink ? 1 : 0.55;
      const a = rd(), geo = dashes[i].geometry as THREE.BufferGeometry, p = geo.attributes.position as THREE.BufferAttribute;
      p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, I[i].x, I[i].y, I[i].z); p.needsUpdate = true; dashes[i].computeLineDistances();
    });
  });
  [0, 1, 2].forEach((k) => cn.atR(R(750 + k * 150), () => fx.ring(rd().setY(0), 1.6 + k * 0.5, 0.5, 0xffb070))); // ping radar 3 nhịp
  // bốn CIWS xoay đồng loạt về hướng đạn (250 ms), cụm nòng bắt đầu quay lấy đà
  cn.rangeR(R(750), R(1060), (u) => {
    const tgt = centroid();
    ciws.forEach((w) => {
      const parent = w.yaw.parent ?? escort;
      parent.updateWorldMatrix(true, false);
      const l = parent.worldToLocal(tgt.clone());
      const yaw = Math.atan2(l.x - w.yaw.position.x, l.z - w.yaw.position.z);
      const horiz = Math.hypot(l.x - w.yaw.position.x, l.z - w.yaw.position.z);
      w.yaw.rotation.y = lerp(0, yaw, smooth(u));
      w.pitch.rotation.x = -Math.atan2(l.y - w.yaw.position.y, horiz) * smooth(u);
    });
  });
  cn.rangeR(R(750), R(2625), (u) => { const ms = u * 1875 * f; ciws.forEach((w, i) => { w.spin.rotation.z = (ms / 1000) * 40 * (ms < 560 * f ? ms / (560 * f) : 1) + i; }); });

  // cảnh 2 (900–2250): chế áp bằng pháo nhiều nòng bắn cực nhanh
  const beams = ciws.map(() => cn.add(new THREE.Mesh(new THREE.CylinderGeometry(0.005 * K, 0.005 * K, 1, 5).translate(0, 0.5, 0).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))));
  const strobes = ciws.map(() => { const s = cn.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: fx.glowTex(), color: 0xffa83a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }))); s.scale.setScalar(0.12 * K); s.visible = false; return s; });
  beams.forEach((b) => { b.visible = false; });
  const burstEnd = (j: number) => R(1875 + 250 * j); // thời điểm nổ lửng lơ của đạn j
  const lastBurst = burstEnd(Math.max(0, cells.length - 1));
  cn.rangeR(R(1310), lastBurst + 190 * f, (u) => {
    const live = I.map((p, i) => ({ p, i })).filter((x) => alive[x.i]);
    const stop = live.length === 0;
    ciws.forEach((w, k) => {
      const tg = live.length ? live[k % live.length].p : I[0];
      const a = wp(w.muz), dir = tg.clone().sub(a), len = dir.length();
      beams[k].visible = !stop;
      strobes[k].visible = !stop && Math.floor(u * 3000 * f / 20) % 2 === 0; // nhấp nháy 24 Hz
      if (stop) return;
      beams[k].position.copy(a); beams[k].lookAt(tg); beams[k].scale.set(1, 1, len); beams[k].scale.x = beams[k].scale.y = 0.7 + Math.random() * 0.6;
      strobes[k].position.copy(a);
      const dn = dir.normalize();
      fx.burst({ pos: a, vel: dn.clone().multiplyScalar(45), count: 2, tex: 'glow', size: [0.1, 0.04], life: [0.08, 0.12], additive: true, color: 0xffd27a, spread: 0.6 }); // fx_ciws_stream: tia đạn dày
      fx.burst({ pos: a, vel: V(0.5 - Math.random(), 1.2, 0.5 - Math.random()).addScaledVector(dn.clone().cross(V(0, 1, 0)), 1.5), tex: 'spark', size: [0.05, 0.02], life: [0.4, 0.6], grav: 6, additive: true, color: 0xe0b04a }); // fx_casings: vỏ đạn vàng văng ra
      if (Math.random() < 0.1) fx.burst({ pos: a, tex: 'smoke', size: [0.05, 0.25], life: [0.4, 0.7], opacity: 0.25, color: 0xcfcfcf });
    });
    if (u >= 1) { beams.forEach((b) => { b.visible = false; }); strobes.forEach((s) => { s.visible = false; }); }
  });
  cn.rangeR(R(1310), R(2625), () => cn.shake(0.01)); // rung liên tục 0.01 suốt loạt bắn
  // nổ lửng lơ (fx_airburst) hoặc cột nước nhỏ (fx_counter_splash) tại vị trí đạn, cách nhau 200 ms
  cells.forEach((_, j) => cn.atR(burstEnd(j), () => {
    alive[j] = false; ghosts[j].grp.visible = false; reticles[j].visible = false; dashes[j].visible = false;
    const p = I[j];
    if (torpedo) fx.splash(p.clone().setY(0.05 * K), false);
    else {
      fx.burst({ pos: p, count: 5, tex: 'fire', size: [0.3, 0.1], life: [0.12, 0.25], additive: true, color: 0xffa83a, spread: 0.2 });
      fx.burst({ pos: p, count: 6, tex: 'smoke', size: [0.15, 0.5], life: [0.6, 1.0], opacity: 0.5, color: 0xcfcfcf, spread: 0.3 });
      fx.burst({ pos: p, count: 5, tex: 'drop', size: [0.05, 0.02], life: [0.5, 0.8], vel: V(0, -0.4, 0), spread: 0.4, grav: 4 });
      fx.light(p, 70, 375 * f);
    }
    cn.shake(0.02);
    decoys.forEach((d) => fx.burst({ pos: wp(d).add(V(0, 0.2 * K, 0)), count: 6, tex: 'spark', size: [0.1, 0.03], life: [0.7, 1.4], vel: V(0, 1.4, 0), spread: 2.4, grav: 0.8, additive: true, color: 0xe8eef4 })); // fx_chaff
  }));
  cn.atR(R(2625), () => { ghosts.forEach((g) => { g.grp.visible = false; }); });
  cn.emitR(R(2625), ev); // các ô bị triệt tiêu hiện marker `blocked`
  cn.atR(R(2810), () => { sweep.visible = false; });
  c.mark(gs);

  // ----- camera (mốc thật) -----
  cn.shotR(R(0), R(375), (t) => { const k = prog(t, R(0), R(375)), p = M(-1.5, 1.1, 0.6), l = M(0.18, 0.15, 0); return pose(p.addScaledVector(l.clone().sub(p).normalize(), 0.3 * K * k), l, 34); });
  cn.shotR(R(375), R(750), (t) => { const k = smooth(prog(t, R(375), R(750))), l = M(0.18, 0.15, 0), p = M(-1.5, 1.1, 0.6); const off = p.clone().sub(l).addScaledVector(l.clone().sub(p).normalize(), 0.3 * K); off.applyAxisAngle(V(0, 1, 0), deg(15) * k); return pose(l.clone().add(off), k < 0.5 ? l : lerpV(l, centroid(), (k - 0.5) * 0.6), 34); });
  cn.shotR(R(750), R(1125), () => pose(M(-0.2, 0.8, 0.5), centroid(), 30));
  cn.shotR(R(1125), R(1690), () => pose(M(1.02, 0.30, -0.58), M(0.62, 0.11, -0.30), 28)); // cận CIWS: cụm 6 nòng quay lấy đà rồi xả đạn
  cn.shotR(R(1690), R(2625), (t) => { const k = prog(t, R(1690), R(2625)); return pose(lerpV(M(0, 0.9, -1.4), M(-0.2, 1.0, -1.6), k), centroid(), 40); }); // intercept_cam
  cn.shotR(R(2625), R(2810) + 1, (t) => { const k = smooth(prog(t, R(2625), R(2810))); return pose(lerpV(M(-0.2, 1.0, -1.6), M(-0.4, 1.3, -2.2), k), lerpV(centroid(), c.C, k), 40); });
}
