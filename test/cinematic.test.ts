import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import type { Cell, FireAction, GameEvent, ShipId } from '../design/core-api';
import { applyAction, isValidAction, newMatch, runPassivesAtMatchStart } from '../src/core';
import { Cinematic, type CineHost, type CineOpts, type ZoneOwner } from '../src/render3d/cinematic';
import { placeholderShip, type ShipRig } from '../src/render3d/shipModels';
import { match, ship } from './helpers';

/** Host giả: không cần WebGL/DOM. Đo mốc phát event so với bảng thời gian trong design/cinematics.md. */
function makeHost() {
  const noop: any = new Proxy(() => noop, { get: (_t, p) => (p === 'then' ? undefined : noop), apply: () => noop });
  const rigs = new Map<string, ShipRig>();
  const host: CineHost = {
    fx: noop, scene: new THREE.Scene(), heightAt: () => 0,
    rig: (o, id) => rigs.get(`${o}:${id}`),
    decoy: (id) => { const r = placeholderShip(id); r.position.set(0, 0, -16.5); return r; },
    wreckRig: (_o, id) => placeholderShip(id),
    releaseTemp: () => {},
    cellWorld: (o: ZoneOwner, c: Cell) => new THREE.Vector3(c.x - 4.5, 0, (o === 'own' ? 7.5 : -7.5) + (c.y - 4.5)),
    tactical: () => ({ pos: new THREE.Vector3(0, 17, 24), look: new THREE.Vector3(0, 0, -1), fov: 38 }),
    shake: () => {}, setUnderwater: () => {}, now: () => 0,
  };
  const addOwn = (id: ShipId, x: number, z: number, heading: number) => {
    const r = placeholderShip(id); r.position.set(x, 0, z); r.rotation.y = heading; host.scene.add(r); r.updateMatrixWorld(true); rigs.set(`own:${id}`, r);
  };
  addOwn('destroyer', -3, 10, Math.PI / 2); addOwn('cruiser', 0, 12, Math.PI / 2); addOwn('missile', 2, 8, Math.PI / 2);
  addOwn('submarine', 0, 5, Math.PI / 2); addOwn('carrier', 0, 14, Math.PI / 2);
  return host;
}

const opts = (log: { t: number; e: GameEvent }[], clock: () => number, over: Partial<CineOpts> = {}): CineOpts => ({
  viewer: 0, speed: 1, short: false, shake: true, reduced: false, onEvent: (e) => log.push({ t: clock(), e }), ...over,
});

/** Chạy cinematic tới khi xong; trả danh sách (thời điểm mô phỏng ms, event) và tổng thời gian mô phỏng. */
async function run(events: GameEvent[], over: Partial<CineOpts> = {}, skipAt?: number) {
  const host = makeHost();
  const cine = new Cinematic(host);
  const log: { t: number; e: GameEvent }[] = [];
  let sim = 0;
  const p = cine.play(events, opts(log, () => sim, over));
  let done = false;
  p.then(() => { done = true; });
  const dt = 1 / 60;
  while (!done && sim < 30000) {
    sim += dt * 1000;
    if (skipAt !== undefined && sim >= skipAt) { cine.skip(); skipAt = undefined; }
    cine.update(dt);
    await Promise.resolve();
  }
  return { log, total: sim, done };
}

function fireEvents(shipId: ShipId, target: FireAction['target'], p1 = [ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('missile', 0, 6), ship('carrier', 0, 8)]) {
  const m = match(undefined, p1);
  const a: FireAction = { shipId, target };
  assert.ok(isValidAction(m, 0, a));
  return applyAction(m, 0, a).events;
}
const at = (log: { t: number; e: GameEvent }[], type: GameEvent['type']) => log.filter((x) => x.e.type === type).map((x) => Math.round(x.t));
const near = (v: number, ms: number, tol = 60) => assert.ok(Math.abs(v - ms) <= tol, `${v} không gần ${ms}`);

test('rapid: ShotFired ở 0, hai ô chạm ≈2050 và ≈2500, tổng ≈2800 + 500 ra cảnh', async () => {
  const ev = fireEvents('destroyer', { kind: 'rapid', cells: [{ x: 5, y: 5 }, { x: 6, y: 1 }] });
  const r = await run(ev);
  assert.ok(r.done);
  near(at(r.log, 'ShotFired')[0], 0);
  const cr = at(r.log, 'CellResolved');
  assert.equal(cr.length, 2);
  near(cr[0], 2050); near(cr[1], 2500);
  near(at(r.log, 'TurnChanged')[0], 2800, 80);
  near(r.total, 3300, 120);
});

test('rapid một ô: bỏ shot tháp sau, vẫn chạm ≈2050', async () => {
  const m = match();
  const shots = m.boards[1].shots.map((row) => row.map(() => 'miss' as const)); shots[5][5] = 'none';
  const st = { ...m, boards: [m.boards[0], { ...m.boards[1], shots }] as typeof m.boards };
  const ev = applyAction(st, 0, { shipId: 'destroyer', target: { kind: 'rapid', cells: [{ x: 5, y: 5 }] } }).events;
  const r = await run(ev);
  assert.equal(at(r.log, 'CellResolved').length, 1);
  near(at(r.log, 'CellResolved')[0], 2050);
});

test('precision: chạm ≈2450; trúng thì ShipRevealed ngay sau; tổng ≈3000 (cảnh bắn dừng khi đạn rời nòng)', async () => {
  const ev = fireEvents('cruiser', { kind: 'precision', cell: { x: 0, y: 8 } }); // trúng tàu sân bay
  const r = await run(ev, { reduced: true }); // reduced: không slow-motion nên đồng hồ thực = đồng hồ cảnh
  near(at(r.log, 'CellResolved')[0], 2450);
  const rev = at(r.log, 'ShipRevealed')[0];
  assert.ok(rev > at(r.log, 'CellResolved')[0] && rev < 3000, 'lộ loại tàu sau khi chạm');
  near(at(r.log, 'TurnChanged')[0], 3000, 80);
});

test('precision có slow-motion 0.6x ở 1250–1650: thời gian thực dài hơn mốc', async () => {
  const ev = fireEvents('cruiser', { kind: 'precision', cell: { x: 9, y: 9 } });
  const a = await run(ev), b = await run(ev, { reduced: true });
  assert.ok(a.total > b.total + 100, `slow-mo ${a.total} vs reduced ${b.total}`);
});

test('cross: 5 quả chạm ≈3050 + 120 i theo thứ tự tâm, lên, phải, xuống, trái; tổng ≈3800', async () => {
  const ev = fireEvents('missile', { kind: 'cross', center: { x: 5, y: 5 } });
  const r = await run(ev);
  const cr = at(r.log, 'CellResolved');
  assert.equal(cr.length, 5);
  cr.forEach((t, i) => near(t, 3050 + 120 * i));
  near(at(r.log, 'TurnChanged')[0], 3800, 80);
});

test('cross ở góc (0,0): chỉ 3 quả', async () => {
  const ev = fireEvents('missile', { kind: 'cross', center: { x: 0, y: 0 } });
  const r = await run(ev);
  assert.equal(at(r.log, 'CellResolved').length, 3);
});

test('torpedo trúng: ô cuối chạm ≈3950, các ô trước lần lượt sớm hơn; tổng ≈4600', async () => {
  const ev = fireEvents('submarine', { kind: 'torpedo', axis: 'row', index: 4, from: 'start' }, [ship('destroyer', 6, 4), ship('cruiser', 0, 2), ship('submarine', 0, 6), ship('missile', 0, 8), ship('carrier', 0, 0)]);
  const r = await run(ev);
  const cr = at(r.log, 'CellResolved');
  assert.equal(cr.length, 7); // 6 ô trượt + 1 trúng
  near(cr[cr.length - 1], 3950);
  assert.ok(cr.every((t, i) => i === 0 || t >= cr[i - 1]), 'tăng dần');
  assert.ok(cr[0] > 2100, 'ô đầu không trước lúc phóng');
  near(at(r.log, 'TurnChanged')[0], 4600, 80);
});

test('torpedo trượt hết: 10 ô, không nổ, vẫn kết thúc ≈4600', async () => {
  const ev = fireEvents('submarine', { kind: 'torpedo', axis: 'col', index: 9, from: 'start' });
  const r = await run(ev);
  assert.equal(at(r.log, 'CellResolved').length, 10);
  near(at(r.log, 'TurnChanged')[0], 4600, 80);
});

test('line3: ba ô chạm ≈3800, 3950, 4100; tổng ≈5000', async () => {
  const ev = fireEvents('carrier', { kind: 'line3', center: { x: 4, y: 4 }, orientation: 'h' });
  const r = await run(ev, { reduced: true });
  const cr = at(r.log, 'CellResolved');
  assert.equal(cr.length, 3);
  [3800, 3950, 4100].forEach((t, i) => near(cr[i], t));
  near(at(r.log, 'TurnChanged')[0], 5000, 80);
});

test('line3 sát mép: chỉ 2 ô thả', async () => {
  const ev = fireEvents('carrier', { kind: 'line3', center: { x: 9, y: 5 }, orientation: 'h' });
  const r = await run(ev);
  assert.equal(at(r.log, 'CellResolved').length, 2);
});

test('tàu chìm: ShipSunk (sprite xám + X) ngay sau ô cuối chạm; cảnh chìm 3600 ms + đuôi 1200 ms sau cảnh trúng', async () => {
  const ev = fireEvents('missile', { kind: 'cross', center: { x: 0, y: 0 } }); // chìm khu trục (0,0),(1,0)
  assert.ok(ev.some((e) => e.type === 'ShipSunk'));
  const r = await run(ev);
  const lastCell = Math.max(...at(r.log, 'CellResolved'));
  near(at(r.log, 'ShipSunk')[0], lastCell + 10, 80);
  near(at(r.log, 'TurnChanged')[0], 3800 + 3600 + 1200, 150);
});

test('tốc độ x2 chia đôi thời lượng', async () => {
  const ev = fireEvents('missile', { kind: 'cross', center: { x: 5, y: 5 } });
  const a = await run(ev), b = await run(ev, { speed: 2 });
  assert.ok(Math.abs(a.total / 2 - b.total) < 200, `${a.total} / 2 vs ${b.total}`);
});

test('bỏ qua: phát nốt mọi event ngay, đúng thứ tự, xong trong ≈150 ms', async () => {
  const ev = fireEvents('missile', { kind: 'cross', center: { x: 5, y: 5 } });
  const r = await run(ev, {}, 500);
  assert.ok(r.done);
  assert.equal(r.log.length, ev.length);
  assert.deepEqual(r.log.map((x) => x.e.type), ev.map((e) => e.type), 'giữ thứ tự event');
  assert.ok(r.total < 500 + 250, `tổng ${r.total}`);
});

test('cinematic ngắn: ≈1.2 s, vẫn phát đủ event', async () => {
  for (const [id, target] of [
    ['destroyer', { kind: 'rapid', cells: [{ x: 5, y: 5 }, { x: 6, y: 1 }] }],
    ['missile', { kind: 'cross', center: { x: 5, y: 5 } }],
    ['submarine', { kind: 'torpedo', axis: 'row', index: 4, from: 'start' }],
    ['carrier', { kind: 'line3', center: { x: 4, y: 4 }, orientation: 'h' }],
  ] as [ShipId, FireAction['target']][]) {
    const ev = fireEvents(id, target);
    const r = await run(ev, { short: true });
    assert.equal(at(r.log, 'CellResolved').length, ev.filter((e) => e.type === 'CellResolved').length, id);
    assert.ok(r.total < 2600, `${id}: ${r.total} ms`);
  }
});

test('mọi event được phát đúng một lần, ShotFired đầu, TurnChanged cuối', async () => {
  for (const [id, target] of [
    ['destroyer', { kind: 'rapid', cells: [{ x: 5, y: 5 }, { x: 6, y: 1 }] }],
    ['cruiser', { kind: 'precision', cell: { x: 0, y: 8 } }],
    ['missile', { kind: 'cross', center: { x: 0, y: 0 } }],
    ['submarine', { kind: 'torpedo', axis: 'row', index: 2, from: 'end' }],
    ['carrier', { kind: 'line3', center: { x: 1, y: 2 }, orientation: 'h' }],
  ] as [ShipId, FireAction['target']][]) {
    const ev = fireEvents(id, target);
    const r = await run(ev);
    assert.equal(r.log.length, ev.length, id);
    assert.equal(r.log[0].e.type, 'ShotFired', id);
    assert.equal(r.log[r.log.length - 1].e.type, ev[ev.length - 1].type, id);
    assert.equal(new Set(r.log.map((x) => x.e)).size, ev.length, `${id}: trùng event`);
  }
});

test('địch bắn (viewer là bên kia): vẫn chạy trọn, dùng tàu giả', async () => {
  const m = match(undefined, undefined, 1);
  const ev = applyAction(m, 1, { shipId: 'missile', target: { kind: 'cross', center: { x: 5, y: 5 } } }).events;
  const r = await run(ev, { viewer: 0 });
  assert.ok(r.done);
  assert.equal(at(r.log, 'CellResolved').length, 5);
});

test('tàu cắn lén: 1000 ms, chạm ≈750, PassiveTriggered ở 0', async () => {
  const mk = () => [ship('raider', 9, 9), ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('carrier', 0, 8)];
  const m = runPassivesAtMatchStart(newMatch(mk(), mk(), 3));
  const chunk = m.events.slice(0, m.events.findIndex((e, i) => i > 0 && e.type === 'PassiveTriggered') >>> 0 || undefined);
  const r = await run(chunk.length ? chunk : m.events);
  assert.ok(r.done);
  near(at(r.log, 'PassiveTriggered')[0], 0, 80);
  near(at(r.log, 'CellResolved')[0], 750, 120);
  assert.ok(r.total < 1900, `tổng ${r.total}`);
});

test('hộ vệ: chèn 700 ms, ShotNullified lúc ô bị chặn, ô còn lại vẫn chạm', async () => {
  const p1 = [ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('escort', 5, 5), ship('carrier', 0, 8)];
  const ev = fireEvents('missile', { kind: 'cross', center: { x: 5, y: 5 } }, p1);
  const r = await run(ev);
  assert.ok(r.done);
  const pt = at(r.log, 'PassiveTriggered')[0], sn = at(r.log, 'ShotNullified')[0];
  assert.ok(pt < sn, 'kích hoạt trước khi triệt tiêu');
  near(at(r.log, 'TurnChanged')[0], 3800 + 700, 120);
  assert.equal(r.log.filter((x) => x.e.type === 'CellResolved').length, 3);
});

test('cảnh bắn dừng trước cảnh kết quả: chạm ô của tên lửa không sớm hơn mốc 70% đường bay', async () => {
  const r = await run(fireEvents('missile', { kind: 'cross', center: { x: 5, y: 5 } }));
  assert.ok(at(r.log, 'CellResolved')[0] >= 3000);
});
