import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HULLS, PRESET_DESIGNS, WEAPONS, WEAPON_IDS, canMount, normalizeDesign, designStats, type ShipDesign } from '../src/arena/data';
import { ArenaSim, NO_INPUT, type PlayerInput, type SimPlayer } from '../src/arena/sim';
import { ArenaBot } from '../src/arena/bot';
import { trajectory, solveElevation } from '../src/arena/ballistics';

const DT = 1 / 60;
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ ...NO_INPUT, ...o });
const duel = (a: ShipDesign, b: ShipDesign) => new ArenaSim(1, [{ name: 'A', team: 0, design: a }, { name: 'B', team: 1, design: b }]);
const [SMALL, MEDIUM, LARGE] = PRESET_DESIGNS;

function run(sim: ArenaSim, sec: number, f: (t: number) => PlayerInput[]) {
  for (let t = 0; t < sec; t += DT) sim.step(DT, f(t));
}
const speed = (s: { vx: number; vz: number }) => Math.hypot(s.vx, s.vz);

test('khí tài: cỡ nặng chỉ lắp vào chỗ đủ lớn; thiết kế chuẩn hoá', () => {
  assert.equal(canMount('small', 1, 'heavy'), false);
  assert.equal(canMount('large', 0, 'heavy'), true);
  assert.equal(canMount('small', 0, 'mg'), true);
  const bad = normalizeDesign({ id: 'x', name: 'x', hull: 'small', slots: ['heavy', 'mg', 'mg', 'mg', 'mg'] });
  assert.equal(bad.slots.length, HULLS.small.slots.length);
  assert.equal(bad.slots[0], null);
  assert.equal(WEAPON_IDS.length, 8);
  assert.ok(designStats(LARGE).speedMul < designStats(SMALL).speedMul);
});

test('vật lý tàu: quán tính, trễ quay, tàu lớn chậm hơn tàu nhỏ', () => {
  const sim = new ArenaSim(1, [{ name: 'S', team: 0, design: SMALL }, { name: 'L', team: 1, design: LARGE }]);
  run(sim, 6, () => [inp({ up: true }), inp({ up: true })]);
  const [s, l] = sim.ships;
  assert.ok(speed(s) > speed(l) * 1.2, 'nhỏ tăng tốc nhanh hơn');
  assert.ok(speed(l) < l.vmax * 0.6, 'tàu lớn chưa đạt tốc độ tối đa sau 6 s');
  // thả ga: vẫn trôi (quán tính)
  const before = speed(l);
  run(sim, 5, () => [inp({}), inp({})]);
  assert.ok(speed(l) > before * 0.5, 'tàu lớn còn đà sau 5 s');
  // bánh lái bẻ từ từ, đà quay có trễ
  const h0 = s.h;
  run(sim, 0.3, () => [inp({ left: true }), inp({})]);
  assert.ok(s.rudder < 1 && s.rudder > 0, 'bánh lái chưa bẻ hết');
  assert.ok(Math.abs(s.h - h0) < 0.12, 'chưa quay đột ngột');
  run(sim, 6, () => [inp({ left: true }), inp({ left: true })]);
  assert.ok(Math.abs(s.r) > Math.abs(l.r) * 2, 'tàu nhỏ quay nhanh hơn nhiều');
});

test('đường đạn: pháo nặng cong hơn súng máy', () => {
  const peak = (id: 'heavy' | 'mg', range: number) => {
    const w = WEAPONS[id];
    const el = solveElevation(w, 0, 12, 0, 0, range, { x: 0, z: 0 });
    assert.ok(el !== null, `${id} đạt ${range}`);
    const l = trajectory(w, 0, 12, 0, 0, el!, { x: 0, z: 0 });
    let hi = 0; for (let i = 1; i < l.points.length; i += 3) hi = Math.max(hi, l.points[i]);
    return { el: el!, hi: hi - 12, t: l.t };
  };
  const heavy = peak('heavy', 800), mg = peak('mg', 800);
  assert.ok(heavy.el > mg.el * 5 && heavy.hi > 8 * mg.hi && heavy.t > mg.t * 2, JSON.stringify({ heavy, mg }));
});

test('tháp có độ trễ: nòng nặng tăng tốc xoay dần, nhẹ nhanh hơn', () => {
  const dz: ShipDesign = { id: 't', name: 't', hull: 'large', slots: ['heavy', 'mg', null, null, null, null, null] };
  const sim = duel(dz, MEDIUM);
  sim.step(DT, [inp({ select: 0 }), NO_INPUT]);
  assert.equal(sim.ships[0].control, 0);
  const m = sim.ships[0].mounts[0], b0 = m.beta;
  run(sim, 0.25, () => [inp({ left: true }), NO_INPUT]);
  const quarter = m.beta - b0;
  assert.ok(quarter > 0 && quarter < 0.02, `0.25 s mới quay rất ít (${quarter})`);
  run(sim, 5, () => [inp({ left: true }), NO_INPUT]);
  assert.ok(m.betaW > 0 && m.betaW <= WEAPONS.heavy.yawMax + 1e-9);
  // thả phím: còn trượt thêm (quán tính)
  const b1 = m.beta;
  run(sim, 0.2, () => [NO_INPUT, NO_INPUT]);
  assert.ok(m.beta > b1, 'nòng vẫn trôi sau khi thả');
});

test('bắn xong chuyển sang nạp lại và thoát về góc nhìn thứ ba', () => {
  const sim = duel(LARGE, SMALL);
  sim.step(DT, [inp({ select: 0 }), NO_INPUT]);
  sim.step(DT, [inp({ fire: true }), NO_INPUT]);
  const a = sim.ships[0];
  assert.equal(a.control, null);
  assert.ok(a.mounts[0].cd > 6);
  assert.equal(sim.projs.length, 1);
  const ev = sim.drain();
  assert.ok(ev.some((e) => e.k === 'fire') && ev.some((e) => e.k === 'exit' && e.reload));
  // đang nạp thì không vào được
  sim.step(DT, [inp({ select: 0 }), NO_INPUT]);
  assert.equal(a.control, null);
  run(sim, 7.2, () => [NO_INPUT, NO_INPUT]);
  assert.equal(a.mounts[0].cd, 0);
  sim.step(DT, [inp({ select: 0 }), NO_INPUT]);
  assert.equal(a.control, 0);
});

test('súng máy: băng đạn, bắn liên thanh, hết băng thì tự thoát', () => {
  const dz: ShipDesign = { id: 'm', name: 'm', hull: 'small', slots: [null, null, 'mg'] };
  const sim = duel(dz, LARGE);
  sim.step(DT, [inp({ select: 2 }), NO_INPUT]);
  run(sim, 3.5, () => [inp({ fire: true }), NO_INPUT]);
  const a = sim.ships[0];
  assert.equal(a.control, null, 'hết 40 phát thì thoát');
  assert.ok(a.mounts[2].cd > 0);
  assert.ok(sim.drain().filter((e) => e.k === 'fire').length === 40);
});

test('sát thương: đạn trúng thân trừ máu theo giáp, đồng đội không bị', () => {
  const sim = new ArenaSim(3, [{ name: 'A', team: 0, design: LARGE }, { name: 'B', team: 1, design: MEDIUM }, { name: 'C', team: 0, design: SMALL }]);
  const a = sim.ships[0], b = sim.ships[1], c = sim.ships[2];
  // đặt B ngay trước mũi A, tắt chuyển động
  a.x = 0; a.z = 0; a.h = 0; b.x = 0; b.z = 600; b.h = 0; c.x = 0; c.z = 300; c.h = 0;
  const m = a.mounts[0];
  const el = solveElevation(WEAPONS.heavy, 0, 17, 92, 0, 600 - 92, { x: 0, z: 0 })!;
  m.el = el; m.beta = 0;
  sim.step(DT, [inp({ select: 0 }), NO_INPUT, NO_INPUT]);
  sim.step(DT, [inp({ fire: true }), NO_INPUT, NO_INPUT]);
  run(sim, 8, () => [NO_INPUT, NO_INPUT, NO_INPUT]);
  assert.ok(b.hp < b.hull.hp, 'B bị trúng hoặc nổ lan');
  assert.equal(c.hp, c.hull.hp, 'đồng đội không bị thương');
  assert.ok(a.damage > 0);
});

test('ngư lôi chạy thẳng và trúng thân', () => {
  const dz: ShipDesign = { id: 'p', name: 'p', hull: 'medium', slots: [null, 'torpedo', null, null, null] };
  const sim = duel(dz, LARGE);
  const [a, b] = sim.ships;
  a.x = 0; a.z = 0; a.h = 0; b.x = 0; b.z = -400; b.h = 0; a.mounts[1].beta = Math.PI;
  sim.step(DT, [inp({ select: 1 }), NO_INPUT]);
  sim.step(DT, [inp({ fire: true }), NO_INPUT]);
  run(sim, 8, () => [NO_INPUT, NO_INPUT]);
  assert.ok(b.hp < b.hull.hp - 50);
});

test('trận 3v3 toàn máy: chạy ổn định, có sát thương, không ra NaN', () => {
  const designs = [SMALL, MEDIUM, LARGE];
  const players: SimPlayer[] = Array.from({ length: 6 }, (_, i) => ({ name: `B${i}`, team: i % 2, design: designs[i % 3], bot: 'hard' as const }));
  const sim = new ArenaSim(7, players);
  const bots = sim.ships.map((s) => new ArenaBot(s.id, 'hard', 7));
  const ins: PlayerInput[] = sim.ships.map(() => NO_INPUT);
  let t = 0;
  while (t < 240 && !sim.over) {
    if (Math.round(t * 60) % 3 === 0) sim.ships.forEach((s, i) => { ins[i] = s.alive ? bots[i].think(sim, s, DT * 3) : NO_INPUT; });
    sim.step(DT, ins);
    t += DT;
  }
  for (const s of sim.ships) assert.ok(Number.isFinite(s.x) && Number.isFinite(s.z) && Number.isFinite(s.h));
  const dmg = sim.ships.reduce((a, s) => a + s.damage, 0);
  assert.ok(dmg > 100, `tổng sát thương ${dmg}`);
});

test('ngắm bằng chuột: tháp đuổi đích có trễ, không vọt quá, tới đúng đích', () => {
  const dz: ShipDesign = { id: 'a', name: 'a', hull: 'large', slots: ['heavy', null, null, null, null, null, null] };
  const sim = duel(dz, MEDIUM);
  sim.step(DT, [inp({ select: 0 }), NO_INPUT]);
  const m = sim.ships[0].mounts[0], aim = { beta: 0.6, el: 0.3 };
  let peak = 0;
  run(sim, 0.3, () => [inp({ aim }), NO_INPUT]);
  assert.ok(m.beta > 0 && m.beta < 0.1, `0.3 s mới quay một chút (${m.beta})`);
  run(sim, 12, () => { peak = Math.max(peak, m.beta); return [inp({ aim }), NO_INPUT]; });
  assert.ok(Math.abs(m.beta - 0.6) < 0.01 && Math.abs(m.el - 0.3) < 0.01, `tới đích (${m.beta}, ${m.el})`);
  assert.ok(peak < 0.6 + 0.03, `không vọt quá (${peak})`);
  assert.ok(m.betaW <= WEAPONS.heavy.yawMax + 1e-9);
});
