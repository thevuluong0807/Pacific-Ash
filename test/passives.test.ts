import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameEvent, MatchState } from '../design/core-api';
import { applyAction, isValidAction, newMatch, randomPlacement, readyShips, runPassivesAtMatchStart, skipTurn, viewOfEnemy } from '../src/core';
import { createAi } from '../src/core';
import { playMatch } from '../src/core/runner';
import { fire, rows, ship, types } from './helpers';

// P1 có hộ vệ + cắn lén; P0 có đội hình cổ điển
const withGuards = () => {
  const p1 = [ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('raider', 9, 9), ship('escort', 5, 6)];
  return newMatch(rows(), p1, 7);
};
const cellsOf = (e: GameEvent[], t: string) => e.filter((x) => x.type === t);

test('hộ vệ: đòn 1 ô bị triệt tiêu hoàn toàn, không CellResolved, có ShotNullified 1 ô', () => {
  const r = applyAction(withGuards(), 0, fire('cruiser', { kind: 'precision', cell: { x: 0, y: 0 } }));
  assert.equal(cellsOf(r.events, 'CellResolved').length, 0);
  const n = cellsOf(r.events, 'ShotNullified')[0] as Extract<GameEvent, { type: 'ShotNullified' }>;
  assert.equal(n.cells.length, 1);
  assert.equal(viewOfEnemy(r.state, 0).marks[0][0], 'blocked');
  assert.equal(r.state.boards[1].shots[0][0], 'none');
});

test('hộ vệ: tên lửa 5 ô mất đúng 2 ô, 3 ô còn lại phân giải', () => {
  const r = applyAction(withGuards(), 0, fire('missile', { kind: 'cross', center: { x: 5, y: 5 } }));
  assert.equal((cellsOf(r.events, 'ShotNullified')[0] as any).cells.length, 2);
  assert.equal(cellsOf(r.events, 'CellResolved').length, 3);
});

test('hộ vệ: kích hoạt đòn 1, nghỉ đòn 2, kích hoạt đòn 3', () => {
  let s: MatchState = withGuards();
  const seen: boolean[] = [];
  for (let i = 0; i < 3; i++) {
    const a = applyAction(s, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: i, y: 9 }, { x: i, y: 8 }] }));
    seen.push(types(a.events).includes('ShotNullified'));
    s = a.state;
    if (s.turn === 1) { // P1 chỉ còn raider/cruiser...: đi bằng tàu sẵn sàng để trả lượt
      const b = applyAction(s, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: i }, { x: 8, y: i }] }));
      s = b.state;
    }
  }
  assert.deepEqual(seen, [true, false, true]);
});

test('ngư lôi: đường đi không đổi, ô dừng bị triệt tiêu thì không trúng', () => {
  const m = newMatch(rows(), [ship('submarine', 4, 0), ship('escort', 0, 6), ship('destroyer', 0, 3), ship('cruiser', 0, 8), ship('carrier', 5, 2)], 1);
  for (let seed = 0; seed < 30; seed++) {
    const r = applyAction({ ...m, seed }, 0, fire('submarine', { kind: 'torpedo', axis: 'row', index: 0, from: 'start' }));
    const shot = r.events.find((e) => e.type === 'ShotFired') as any;
    assert.equal(shot.cells.length, 5); // (0..4,0), dừng ở (4,0)
    const nul = (cellsOf(r.events, 'ShotNullified')[0] as any).cells as { x: number }[];
    assert.equal(nul.length, 2); // ceil(0.3×5)
    const hit = r.events.some((e) => e.type === 'CellResolved' && e.result === 'hit');
    assert.equal(hit, !nul.some((c) => c.x === 4));
  }
});

test('cắn lén: bắn đầu trận, nghỉ lượt 1, bắn lượt 2; không bị hộ vệ chặn, không lộ loại khi trúng', () => {
  const m = newMatch([ship('raider', 9, 9), ship('escort', 0, 0), ship('destroyer', 0, 3), ship('cruiser', 0, 5), ship('carrier', 0, 7)],
    [ship('raider', 9, 9), ship('escort', 0, 0), ship('destroyer', 0, 3), ship('cruiser', 0, 5), ship('carrier', 0, 7)], 3);
  const st = runPassivesAtMatchStart(m);
  assert.deepEqual(types(st.events).filter((t) => t === 'ShotFired').length, 2);
  assert.ok(st.events.every((e) => e.type !== 'ShipRevealed' && e.type !== 'ShotNullified'));
  let s = st.state;
  const shots = (b: MatchState['boards'][0]) => b.shots.flat().filter((x) => x !== 'none').length;
  assert.equal(shots(s.boards[1]), 1);
  // lượt 1 của P0: rest 1 → không bắn
  const a1 = applyAction(s, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 5, y: 5 }, { x: 6, y: 5 }] })).state;
  // (P0 không có tàu chủ động ngoài destroyer/cruiser/carrier; destroyer cooldown 0)
  assert.equal(a1.turn, 1);
  assert.equal(readyShips(a1, 1).includes('raider' as never), false);
});

test('cắn lén: lượt 2 của chủ bắn một phát PassiveTriggered + ShotFired passive', () => {
  const mk = () => [ship('raider', 9, 9), ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('carrier', 0, 6)];
  let s = runPassivesAtMatchStart(newMatch(mk(), mk(), 5)).state;
  const play = (p: 0 | 1) => {
    const r = applyAction(s, p, fire('destroyer', { kind: 'rapid', cells: [{ x: 5 + (s.turnNumber % 4), y: 9 }, { x: 5 + (s.turnNumber % 4), y: 8 }] }));
    s = r.state;
    return r.events;
  };
  const ev1 = play(0), ev2 = play(1), ev3 = play(0);
  assert.equal(types(ev1).includes('PassiveTriggered'), false);
  assert.equal(types(ev2).includes('PassiveTriggered'), false);
  assert.ok(ev3.some((e) => e.type === 'ShotFired' && e.source === 'passive' && e.attack === 'sneak'));
});

test('tàu 1×1 chìm sau 1 ô; hộ vệ 2×2 chìm sau 4 ô; tàu nội tại không chọn được', () => {
  const m = withGuards();
  assert.equal(readyShips(m, 1).includes('raider' as never), false);
  assert.equal(readyShips(m, 1).includes('escort' as never), false);
  assert.equal(isValidAction(m, 1, fire('raider' as never, { kind: 'precision', cell: { x: 0, y: 0 } })), false);
  // P0 bắn trực tiếp từng ô: dùng state P1 không có hộ vệ
  const m2 = newMatch(rows(), [ship('raider', 3, 3), ship('submarine', 5, 5), ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('carrier', 0, 7)], 1);
  const r = applyAction(m2, 0, fire('cruiser', { kind: 'precision', cell: { x: 3, y: 3 } }));
  assert.ok(types(r.events).includes('ShipSunk'));
});

test('hộ vệ chìm thì ngừng chặn', () => {
  const m = newMatch(rows(), [ship('escort', 5, 5), ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('carrier', 0, 7)], 1);
  const hits = m.boards[1].ships[0].hits.map(() => true);
  const board = { ...m.boards[1], ships: m.boards[1].ships.map((s) => (s.id === 'escort' ? { ...s, hits, sunk: true } : s)) };
  const r = applyAction({ ...m, boards: [m.boards[0], board] }, 0, fire('cruiser', { kind: 'precision', cell: { x: 0, y: 0 } }));
  assert.equal(types(r.events).includes('ShotNullified'), false);
});

test('đội hình 7 loại: randomPlacement hợp lệ, AI chơi trọn ván với raider+escort', async () => {
  const ids = ['carrier', 'raider', 'escort', 'cruiser', 'destroyer'] as const;
  for (let seed = 1; seed <= 6; seed++) {
    const m = newMatch(randomPlacement(seed, [...ids]), randomPlacement(seed + 50, [...ids]), seed);
    for (const lvl of ['easy', 'medium', 'hard'] as const) {
      const r = await playMatch(m, [createAi(lvl, seed), createAi(lvl, seed + 1)]);
      assert.notEqual(r.state.winner, null);
    }
  }
});

test('chỉ còn tàu nội tại: skipTurn, cắn lén vẫn chạy', () => {
  const mk = () => [ship('raider', 9, 9), ship('escort', 0, 0), ship('destroyer', 0, 3), ship('cruiser', 0, 5), ship('carrier', 0, 7)];
  const m = newMatch(mk(), mk(), 2);
  const sunk = (b: MatchState['boards'][0]) => ({ ...b, ships: b.ships.map((s) => (s.id === 'raider' || s.id === 'escort' ? s : { ...s, sunk: true, hits: s.hits.map(() => true) })) });
  const s = { ...m, boards: [sunk(m.boards[0]), m.boards[1]] as MatchState['boards'] };
  assert.equal(readyShips(s, 0).length, 0);
  const r = skipTurn(s, 0);
  assert.ok(types(r.events).includes('TurnSkipped'));
});

// ---- Hỏng hóc khí tài ----
import { effectiveAttack, isDamaged } from '../src/core';
const damagedMatch = (on: boolean, hitsOnCarrier = 3) => {
  const m = newMatch(rows(), [ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('escort', 5, 5), ship('missile', 0, 6), ship('carrier', 0, 8)], 1, 0, { equipDamage: on });
  const boards = [m.boards[0], { ...m.boards[1], ships: m.boards[1].ships.map((s) => (s.id === 'missile' || s.id === 'escort' ? { ...s, hits: s.hits.map((_, i) => i < hitsOnCarrier) } : s)) }] as MatchState['boards'];
  return { ...m, boards, turn: 1 as const };
};

test('hỏng khí tài: >50% ô trúng thì tàu chủ động chỉ còn bắn 1 ô, không lộ loại', () => {
  const m = damagedMatch(true);
  assert.equal(isDamaged(m.boards[1].ships.find((s) => s.id === 'missile')!), true);
  assert.equal(effectiveAttack(m, 1, 'missile'), 'precision');
  assert.equal(isValidAction(m, 1, fire('missile', { kind: 'cross', center: { x: 1, y: 1 } })), false);
  const r = applyAction(m, 1, fire('missile', { kind: 'precision', cell: { x: 0, y: 0 } }));
  assert.equal(r.events.filter((e) => e.type === 'CellResolved').length, 1);
  assert.equal(r.events.some((e) => e.type === 'ShipRevealed'), false);
});

test('hỏng khí tài tắt: tàu nhiều ô trúng vẫn dùng đòn gốc; đúng 50% chưa hỏng', () => {
  const m = damagedMatch(false);
  assert.equal(effectiveAttack(m, 1, 'missile'), 'cross');
  const half = damagedMatch(true, 2);
  assert.equal(effectiveAttack(half, 1, 'missile'), 'cross'); // 2/4 = 50%, chưa quá
});

test('hỏng khí tài: hộ vệ trúng quá 50% thì ngừng chặn', () => {
  const on = damagedMatch(true), off = damagedMatch(false);
  const p0 = { ...on, turn: 0 as const }, q0 = { ...off, turn: 0 as const };
  const a = applyAction(p0, 0, fire('cruiser', { kind: 'precision', cell: { x: 0, y: 9 } }));
  const b = applyAction(q0, 0, fire('cruiser', { kind: 'precision', cell: { x: 0, y: 9 } }));
  assert.equal(types(a.events).includes('ShotNullified'), false);
  assert.equal(types(b.events).includes('ShotNullified'), true);
});

test('AI chơi trọn ván khi bật hỏng khí tài (cả ba mức)', async () => {
  const ids = ['carrier', 'raider', 'escort', 'cruiser', 'missile'] as const;
  for (let seed = 1; seed <= 8; seed++) {
    const m = newMatch(randomPlacement(seed, [...ids]), randomPlacement(seed + 50, [...ids]), seed, 0, { equipDamage: true });
    for (const lvl of ['easy', 'medium', 'hard'] as const) {
      const r = await playMatch(m, [createAi(lvl, seed), createAi(lvl, seed + 1)]);
      assert.notEqual(r.state.winner, null);
    }
  }
});
