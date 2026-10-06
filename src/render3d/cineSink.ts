import * as THREE from 'three';
import type { GameEvent, ShipId } from '../../design/core-api';
import type { Cinematic, ZoneOwner } from './cinematic';
import { loadSpecs } from '../core/specs';
import { CELL as K, HEIGHT } from './scale';
import { wreckModel } from './shipGlb';
import { type CamPose, Frame, V, deg, lerp, lerpV, named, prog, smooth, wp } from './cineUtil';

/**
 * Hoạt cảnh bắn hạ (design/sinking.md mục 2 và 2.8): tàu KHÔNG chìm. Mỗi loại tàu cháy nổ riêng bằng model nguyên vẹn tới mốc hoán đổi (`SWAP`),
 * một vụ nổ lớn che chỗ ghép, rồi thay bằng model xác `wreck_<id>.glb` (gãy, vỡ, chìm một nửa) và các `section_*` dịch từ pose 0 sang pose cuối
 * tới 10800 ms; xác ở lại đến hết ván (cả tàu ngầm). Chặn 10800 ms (3600 ms nếu bật "Tàu chìm chạy nền"), thêm 6000 ms ổn định chạy nền.
 * Dựng thành một cinematic con (`planSink`), cinematic cha lấy camera của nó trong phần chặn.
 * Chưa làm: `jbd_*` đổ, nắp VLS bay thành mảnh riêng, âm thanh.
 */
export const SINK_BLOCK_MS = 10800;
export const SINK_BLOCK_BG_MS = 3600;
export const SINK_TAIL_MS = 6000;
export const SINK_TOTAL_MS = SINK_BLOCK_MS + SINK_TAIL_MS;

const SPECS = loadSpecs();
/** Mốc hoán đổi tàu nguyên vẹn → xác (sinking.md 2.8). */
const SWAP: Record<ShipId, number> = { destroyer: 5400, cruiser: 7200, missile: 6000, submarine: 6600, carrier: 6600, raider: 4200, escort: 5400 };

/** Gắn model xác vào rig (ẩn model nguyên vẹn) và trả hàm `show(u)`: u 0..1 dịch các `section_*` từ pose 0 tới pose cuối. Không có model xác thì không làm gì. */
function wreckSwap(rig: THREE.Object3D, id: ShipId) {
  let secs: { o: THREE.Object3D; p: THREE.Vector3; q: THREE.Quaternion }[] | null = null;
  const q0 = new THREE.Quaternion();
  return (u: number) => {
    if (!secs) {
      const m = wreckModel(id);
      if (!m) return;
      secs = [];
      m.traverse((o) => { if (/^section_[a-z]+$/.test(o.name)) secs!.push({ o, p: o.position.clone(), q: o.quaternion.clone() }); });
      rig.children[0].visible = false; // mô hình nguyên vẹn (nhóm con đầu tiên của rig)
      rig.add(m);
      rig.userData.wreckRoot = m;
      rig.userData.kick.pitch = 0; rig.userData.kick.roll = 0; rig.userData.yOffset = 0.05 * K; // xác nổi cao hơn mặt sóng để còn nhìn thấy (model đã tự chìm nửa thân)
    }
    for (const x of secs) { x.o.position.copy(x.p).multiplyScalar(u); x.o.quaternion.copy(q0).slerp(x.q, u); }
  };
}

const pose = (pos: THREE.Vector3, look: THREE.Vector3, fov: number): CamPose => ({ pos, look, fov });
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function planSink(cn: Cinematic, sunk: Extract<GameEvent, { type: 'ShipSunk' }>[]) {
  const host = cn.host, fx = host.fx, viewer = cn.opts.viewer;
  const rigs = sunk.map((e) => {
    const o: ZoneOwner = e.owner === viewer ? 'own' : 'enemy';
    const orientation: 'h' | 'v' = e.cells.length > 1 && e.cells[1].y !== e.cells[0].y ? 'v' : 'h';
    const rig = cn.touch((o === 'own' ? host.rig('own', e.shipId) : undefined) ?? cn.wreck(o, e.shipId, e.cells[0], orientation));
    host.wreckSink(o, e.cells, wp(rig), cn.opts.speed);
    return { e, o, rig };
  });
  const owner: ZoneOwner = rigs[0].o;
  const mid = rigs.reduce((a, r) => a.add(cn.wp(r.rig)), V()).multiplyScalar(1 / rigs.length);
  const T = Frame.toward(mid.clone().setY(0), owner === 'enemy' ? V(0, 0, -1) : V(0, 0, 1));
  const big = rigs.reduce((m, r) => Math.max(m, SPECS[r.e.shipId].size), 1);
  const lead = rigs.reduce((a, r) => (SPECS[r.e.shipId].size > SPECS[a.e.shipId].size ? r : a), rigs[0]);

  // ---- máy quay chung: lùi dần 0.4 → 0.9 và nâng lên, xoay chậm 20°; slow-motion do cinematic cha lo ----
  const zoom = lead.e.shipId === 'carrier' ? 1.5 : lead.e.shipId === 'cruiser' ? 1.15 : lead.e.shipId === 'raider' ? 0.75 : 1;
  cn.shot(0, SINK_TOTAL_MS, (t) => {
    const k = smooth(prog(t, 0, SINK_BLOCK_MS)), r = (2.2 + big * 0.5) * (1 + 1.6 * k) * zoom, yaw = deg(20) * k;
    return pose(T.P(-r * Math.cos(yaw), r * Math.sin(yaw) + 0.4, 2.0 + 1.6 * big * 0.3 * k + r * 0.25), mid.clone().setY(0.1 * K), 36);
  });

  for (const { e, o, rig } of rigs) {
    const id = e.shipId, len = SPECS[id].size, parts = rig.userData.parts;
    const side = (e.cells[e.cells.length - 1].x + e.cells[e.cells.length - 1].y) % 2 ? 1 : -1; // nghiêng về mạn có ô trúng cuối
    const nd = (n: string) => named(rig, n);
    const fire = (k: number) => { const a = nd(`fire_${k}`); return a ? wp(a).setY(0.15 * K) : wp(rig).add(rig.getWorldDirection(V()).multiplyScalar((k - 2) * (len / 5) * K)).setY(0.15 * K); };
    const at = (t: number, fn: () => void) => cn.at(t, fn);
    const rangeT = cn.range.bind(cn);
    const rigFrame = () => { rig.updateWorldMatrix(true, false); const f = rig.getWorldDirection(V()).setY(0).normalize(); return new Frame(wp(rig).setY(0), f, V(-f.z, 0, f.x), HEIGHT); };

    // ---- cú giật 0–900 ms, rồi tàu nguyên vẹn nghiêng nhẹ tới mốc hoán đổi (không chúi, không lún) ----
    const swapT = SWAP[id], show = wreckSwap(rig, id);
    cn.range(0, swapT, (u) => {
      const t = u * swapT, shk = t < 900 ? Math.sin((t / 900) * Math.PI * 3) * (1 - t / 900) * deg(2.5) : 0;
      rig.userData.kick.pitch = shk;
      rig.userData.kick.roll = deg(7) * side * smooth(t / swapT) + shk * 0.6;
    });
    // hoán đổi: vụ nổ lớn che chỗ ghép, rồi các mảnh xác dịch từ pose 0 tới pose cuối tới hết 10800 ms
    cn.at(swapT, () => {
      const c = wp(rig).add(V(0, 0.3 * K, 0));
      fx.hit(c, false); fx.burst({ pos: c, count: 14, tex: 'fire', size: [0.6, 1.8], life: [0.3, 0.6], additive: true, vel: V(0, 2.5, 0), spread: 1.6, color: 0xff9a2a });
      fx.light(c, 200, 450); cn.shake(0.12); fx.debrisBurst(c, 12);
      fx.ring(wp(rig).setY(0), 1.4 + len * 0.45, 1.1, 0x9fb4c2);
      show(0);
    });
    cn.range(swapT, SINK_BLOCK_MS, (u) => show(u));
    cn.at(SINK_BLOCK_MS, () => show(1));

    // ---- chung: nổ đầu, khói và bọt khí, xoáy nước, dầu loang, mảnh vỡ, tháp pháo rũ, biến mất ----
    at(0, () => {
      for (let k = 0; k < 5; k++) { const p = fire(k); cn.at(k * 50, () => fx.hit(p, id === 'submarine')); } // fx_hit ở các `fire_N` cùng lúc
      if (id !== 'submarine') fx.light(wp(rig).add(V(0, 0.5 * K, 0)), 160, 450);
      cn.shake(0.12);
      fx.debrisBurst(wp(rig).add(V(0, 0.3 * K, 0)), 10);
    });
    rangeT(900, swapT, () => { // khói đậm, bọt khí, hơi nước phụt quanh mạn thấp
      if (Math.random() < 0.5) fx.burst({ pos: wp(rig).add(V((Math.random() - 0.5) * len * 0.5, 0.1, (Math.random() - 0.5) * 0.5).multiplyScalar(K)), tex: id === 'submarine' ? 'drop' : 'smoke', size: [0.15, 0.7], life: [0.6, 1.2], opacity: 0.5, color: id === 'submarine' ? 0xffffff : 0x1b1d1f, vel: V(0.1, 0.6, 0) });
    });
    for (const t of [900, 2700, 4500]) if (t < swapT) at(t, () => fx.ring(wp(rig).setY(0), (0.8 + len * 0.4), 0.9, 0x9fb4c2)); // vòng sóng quanh thân
    at(3600, () => fx.setOil(`${o}:${id}`, wp(rig).setY(0), (0.6 + len * 0.25) * K)); // dầu loang từ 3600 ms, lan dần đến hết ván
    for (const t of [2400, 5400, 8400]) at(t, () => fx.debrisBurst(wp(rig).add(V(0, 0.2 * K, 0)), 8)); // tối đa 40 mảnh nổi trên nước
    if (id !== 'escort' && id !== 'destroyer' && id !== 'raider') rangeT(3300, 3900, (u) => parts.turrets.forEach((tu, i) => { cn.snap(tu.yaw); tu.yaw.rotation.y = deg(i % 2 ? -30 : 30) * smooth(u); tu.pitch.rotation.x = deg(10) * smooth(u); })); // tháp pháo xoay lệch ±30°, nòng rũ 10°
    cn.registerWreck(rig, id, o, side, show);

    // ---- riêng từng tàu ----
    const explode = (p: THREE.Vector3, big2 = false) => { fx.hit(p, false); if (big2) fx.burst({ pos: p, count: 8, tex: 'fire', size: [0.4, 1.2], life: [0.3, 0.6], additive: true, vel: V(0, 2.5, 0), spread: 1.2, color: 0xff9a2a }); cn.shake(0.05); };
    switch (id) {
      case 'destroyer': {
        for (const [t, k] of [[0, 0], [450, 1], [900, 2], [1350, 0]] as const) at(t, () => explode(fire(k))); // nổ thứ phát dọc thân
        const tu = parts.turrets[0];
        if (tu) at(300, () => { explode(wp(tu.yaw), true); cn.fly(tu.yaw, V(rnd(-0.04, 0.04), 0.35, rnd(-0.04, 0.04)).multiplyScalar(K), 0.23 * K, 4); }); // tháp pháo trước bật bay, rơi xuống ~3900 ms
        rangeT(1500, 5400, () => { if (Math.random() < 0.35) { const b = nd('bridge1'); if (b) fx.burst({ pos: wp(b).add(V(0, 0.1 * K, 0)), count: 2, tex: 'fire', size: [0.2, 0.6], life: [0.2, 0.4], additive: true, vel: V(0, 1.5, 0), spread: 0.6, color: 0xff9a2a }); } }); // lửa phụt từ cầu
        rangeT(900, 1500, () => { const f = nd('funnel_1'); if (f && Math.random() < 0.5) fx.burst({ pos: wp(f), tex: 'smoke', size: [0.2, 0.9], life: [0.8, 1.3], opacity: 0.6, color: 0x111111, vel: V(0, 1.5, 0) }); }); // dầu phun từ ống khói
        cn.shot(0, 2400, () => { const F = rigFrame(); return pose(F.P(0.2, 2.1, 0.7), tu ? wp(tu.yaw) : wp(rig), 34); }, 450, 1); // cận mạn tàu lúc tháp bay (0–2400)
        break;
      }
      case 'cruiser': {
        parts.turrets.slice(0, 3).forEach((tu, i) => at(i * 600, () => { // nổ dây chuyền ba tháp pháo: phụt lửa cao, không bật bay
          const p = wp(tu.yaw);
          explode(p, true);
          fx.burst({ pos: p, count: 10, tex: 'fire', size: [0.5, 1.5], life: [0.4, 0.8], additive: true, vel: V(0, 3.2, 0), spread: 1.0, color: 0xff9a2a });
        }));
        break;
      }
      case 'missile': {
        for (let j = 0; j < 4; j++) at(j * 180, () => { // nắp VLS bật tung theo hàng
          for (const n of ['vls_fwd_array', 'vls_aft_array']) { const a = nd(n); if (a) { const p = wp(a).add(V(0, 0.15 * K, (j - 1.5) * 0.12 * K)); fx.burst({ pos: p, count: 5, tex: 'spark', size: [0.12, 0.03], life: [0.5, 0.9], vel: V(0, 2.2, 0), spread: 1.6, grav: 3, additive: true }); fx.burst({ pos: p, count: 3, tex: 'fire', size: [0.3, 0.8], life: [0.2, 0.4], additive: true, color: 0xff9a2a }); } }
          fx.debrisBurst(wp(rig).add(V(0, 0.2 * K, 0)), 4);
        });
        at(300, () => parts.launchers.forEach((l) => { l.base.visible = true; }));
        // tên lửa tự phóng loạn: tối đa 8 vệt, mỗi quả cách 450–750 ms
        let t = 1800;
        [450, 600, 750, 450, 600, 750, 450, 600].forEach((gap, i) => {
          t += gap;
          const tl = t - gap;
          if (tl > 6000) return;
          const l = parts.launchers[i % Math.max(1, parts.launchers.length)];
          cn.at(tl, () => {
            const from = l ? wp(l.base).add(V(0, 0.15 * K, 0)) : wp(rig);
            const ang = Math.random() * Math.PI * 2, rad = (3 + Math.random() * 6) * K, water = i % 3 === 0;
            const to = from.clone().add(V(Math.cos(ang) * rad, 0, Math.sin(ang) * rad)).setY(0.1 * K);
            const apex = (water ? 3 : 4 + Math.random() * 5) * K;
            fx.burst({ pos: from, vel: V(0, 1.5, 0), count: 8, tex: 'smoke', size: [0.2, 1.0], life: [0.8, 1.4], spread: 0.5, opacity: 0.6, color: 0xffffff });
            fx.burst({ pos: from, count: 3, tex: 'fire', size: [0.3, 0.8], life: [0.15, 0.3], additive: true });
            cn.shake(0.03);
            cn.projectile(() => (u) => lerpV(from, to, u).add(V(0, Math.sin(u * Math.PI) * apex + u * 0.5 * K, 0)).add(V(Math.sin(u * 14) * 0.15 * K * u, 0, 0)), tl, tl + 1200, 'missile'); // vệt khói xoắn
            cn.at(tl + 1200, () => (water ? fx.hit(to, false) : fx.burst({ pos: to.clone().setY(1.5 * K), count: 5, tex: 'fire', size: [0.3, 1.0], life: [0.2, 0.4], additive: true, color: 0xff9a2a })));
          });
        });
        rangeT(1800, 6000, () => { const a = nd('vls_fwd_array'); if (a && Math.random() < 0.3) fx.burst({ pos: wp(a), count: 2, tex: 'fire', size: [0.2, 0.7], life: [0.2, 0.4], additive: true, vel: V(0, 1.5, 0), color: 0xff9a2a }); }); // lửa liếm dọc dãy phóng
        cn.shot(0, 6000, (tt) => { const F = rigFrame(), k = smooth(prog(tt, 0, 6000)); return pose(F.P(lerp(-3, -1.5, k), lerp(3.5, 4.5, k), lerp(6, 3.5, k)), wp(rig).add(V(0, 0.4 * K, 0)), 40); }, 450, 1); // cao xéo, theo các vệt tên lửa loạn rồi hạ xuống
        break;
      }
      case 'submarine': {
        const per = nd('periscope');
        if (per) { cn.snap(per); const y0 = per.position.y; rangeT(0, 2100, (u) => { per.position.y = y0 - 0.17 * smooth(u); }); } // tiềm vọng thụt vào
        const prop = nd('propulsor_spin');
        if (prop) { cn.snap(prop); rangeT(0, 2100, (u) => { prop.rotation.z += (1 - u) * 0.6; }); } // chân vịt quay chậm dần
        rangeT(0, 2100, () => { if (Math.random() < 0.9) fx.burst({ pos: wp(rig).add(V((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 2).multiplyScalar(K)), tex: 'drop', size: [0.1, 0.05], life: [0.5, 0.9], vel: V(0, 1, 0), spread: 0.6, grav: 3 }); }); // xả ballast: bọt khí xối từ hai bên
        at(swapT, () => { // nổi lên rồi vỡ đôi tại mặt nước bằng một vụ nổ nén: sóng xung kích, cột nước thấp, chớp xanh
          const p = wp(rig).setY(0);
          fx.ring(p, 3.5, 0.9, 0xbfe6f5); fx.ring(p, 2.2, 0.7, 0x9fd6ee);
          fx.splash(p, false);
          fx.light(p.clone().setY(0.2 * K), 90, 450, 0x66c8ff);
        });
        break;
      }
      case 'carrier': {
        for (const [t, k] of [[0, 1], [300, 3], [600, 0], [900, 4], [1200, 2], [1600, 3]] as const) at(t, () => explode(fire(k), true)); // nổ lớn trên boong, tối đa 6 điểm
        const isl = nd('island');
        rangeT(0, 3600, () => { if (isl && Math.random() < 0.6) fx.burst({ pos: wp(isl).add(V(0, 0.3 * K, 0)), count: 2, tex: 'fire', size: [0.5, 1.3], life: [0.4, 0.8], additive: true, vel: V(0, 2.2, 0), spread: 0.5, color: 0xff9a2a }); }); // cột lửa từ đảo chỉ huy
        rangeT(900, 7500, () => { if (Math.random() < 0.5) fx.burst({ pos: wp(rig).add(V(rnd(-0.3, 0.3), 0.3, rnd(-1.8, 1.8)).multiplyScalar(K)), tex: 'smoke', size: [0.6, 2.4], life: [1.5, 2.5], opacity: 0.75, color: 0x0b0b0b, vel: V(0.1, 0.8, 0) }); }); // khói đen dày che nửa tàu
        for (const n of ['elevator_fwd', 'elevator_aft']) { const el = nd(n); if (el) { cn.snap(el); const y0 = el.position.y; rangeT(300, 1200, (u) => { el.position.y = y0 + 0.05 * smooth(u); }); } } // thang máy bật lên
        for (let i = 0; i < 4; i++) { const pl = nd(`plane_${i}`); if (pl) at(2100 + i * 750, () => { explode(wp(pl), true); cn.hide(pl); fx.debrisBurst(wp(pl), 6); }); } // máy bay đậu nổ lần lượt cách 750 ms, tại chỗ đậu
        break;
      }
      case 'raider': {
        const tu = parts.turrets[0];
        if (tu) at(150, () => { explode(wp(tu.yaw), false); cn.fly(tu.yaw, V(rnd(-0.1, 0.1), 0.6, rnd(-0.1, 0.1)).multiplyScalar(K), 0.7 * K, 8); }); // pháo nhỏ văng khỏi bệ
        for (const t of [1200, 1900, 2600]) at(t, () => { fx.splash(wp(rig).setY(0), false); cn.shake(0.04); }); // cú nổ làm nước văng quanh thân nhỏ
        cn.shot(0, 4200, (tt) => { const F = rigFrame(), k = smooth(prog(tt, 0, 4200)); return pose(F.P(lerp(-1.2, -1.8, k), lerp(1.7, 2.5, k), lerp(0.9, 1.4, k)), wp(rig), 38); }, 300, 1); // tàu nhỏ nên giữ gần
        break;
      }
      case 'escort': {
        const cw = [1, 2, 3, 4].map((i) => ({ yaw: nd(`ciws_${i}`), spin: nd(`ciws_${i}_spin`), muz: nd(`ciws_${i}_muzzle`) }));
        cw.forEach((w) => { if (w.yaw) cn.snap(w.yaw); if (w.spin) cn.snap(w.spin); });
        rangeT(0, 1800, (u) => { // CIWS bắn loạn, quay tứ phía, rồi lần lượt tắt
          cw.forEach((w, i) => {
            if (!w.yaw) return;
            const alive = u < 0.55 + i * 0.12;
            w.yaw.rotation.y = Math.sin(u * 14 + i * 1.7) * 2.2;
            if (w.spin) w.spin.rotation.z += alive ? 0.8 : 0.05;
            if (alive && w.muz && Math.random() < 0.7) fx.burst({ pos: wp(w.muz), count: 2, tex: 'glow', size: [0.1, 0.03], life: [0.1, 0.2], additive: true, color: 0xffa83a, vel: V(rnd(-3, 3), rnd(0.5, 2.5), rnd(-3, 3)), spread: 1 });
          });
        });
        const dome = nd('radome');
        if (dome) {
          at(1800, () => { explode(wp(dome), false); fx.burst({ pos: wp(dome), count: 8, tex: 'spark', size: [0.1, 0.03], life: [0.5, 1.0], vel: V(0, 1.5, 0), spread: 2.5, grav: 5, additive: true }); }); // vòm radar nứt
          at(2100, () => cn.fly(dome, V(rnd(-0.1, 0.1), 0.9, rnd(-0.1, 0.1)).multiplyScalar(K), 1.2 * K, 4)); // rồi bật tung
          rangeT(2100, 4200, () => { if (Math.random() < 0.4) fx.burst({ pos: wp(dome).add(V(0, 0.05 * K, 0)), count: 2, tex: 'spark', size: [0.08, 0.02], life: [0.2, 0.5], additive: true, vel: V(0, 0.8, 0), spread: 1.4, color: 0x9fd6ff }); }); // tia lửa điện từ chỗ vòm radar
        }
        for (let i = 1; i <= 4; i++) { const dc = nd(`decoy_${i}`); if (dc) at(1800 + i * 150, () => fx.burst({ pos: wp(dc).add(V(0, 0.2 * K, 0)), count: 14, tex: 'spark', size: [0.1, 0.03], life: [0.7, 1.4], vel: V(0, 1.4, 0), spread: 2.4, grav: 0.8, additive: true, color: 0xe8eef4 })); } // chaff bạc
        rangeT(1800, 5400, () => { if (Math.random() < 0.3) fx.burst({ pos: wp(rig).add(V(rnd(-0.6, 0.6), 0.2, rnd(-0.6, 0.6)).multiplyScalar(K)), tex: 'smoke', size: [0.3, 1.2], life: [1, 1.6], opacity: 0.4, color: 0xe6edf2, vel: V(0, 0.6, 0) }); }); // khói trắng nhạt
        cn.shot(0, 1800, () => { const a = nd('ciws_3'); const mm = (x: number, y: number, z: number) => { const model = rig.children[0]?.children[0] ?? rig; model.updateWorldMatrix(true, false); return model.localToWorld(V(x, y, z)); }; return pose(mm(1.02, 0.3, -0.58), a ? wp(a) : mm(0.62, 0.11, -0.3), 34); }, 450, 1); // cận CIWS loạn
        cn.shot(1800, 5400, () => { const model = rig.children[0]?.children[0] ?? rig; model.updateWorldMatrix(true, false); return pose(model.localToWorld(V(-1.6, 2.3, 1.5)), dome ? wp(dome) : wp(rig), 38); }, 300, 1); // cắt lên cao xéo khi vòm radar bật
        break;
      }
    }
  }
}
