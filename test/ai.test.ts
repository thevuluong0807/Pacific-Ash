import test from 'node:test';
import assert from 'node:assert/strict';
import type { AiLevel, PlayerId } from '../design/core-api';
import { applyAction, createAi, isValidAction, newMatch, playMatch, randomPlacement } from '../src/core';
import { ship } from './helpers';

/** `a` đấu `b`, luân phiên bên đi trước. Trả số ván thắng của `a`. */
async function duel(a: AiLevel, b: AiLevel, games: number) {
  let aWins = 0;
  for (let g = 1; g <= games; g++) {
    const aSide: PlayerId = g % 2 === 0 ? 0 : 1;
    const players = aSide === 0 ? [createAi(a, g), createAi(b, g + 7)] : [createAi(b, g + 7), createAi(a, g)];
    const state = newMatch(randomPlacement(g * 2), randomPlacement(g * 2 + 1), g, (g % 4 < 2 ? 0 : 1) as PlayerId);
    const r = await playMatch(state, players as [ReturnType<typeof createAi>, ReturnType<typeof createAi>]);
    if (r.state.winner === aSide) aWins++;
  }
  return aWins;
}

test('AI vừa và khó: mọi hành động hợp lệ, mọi ván kết thúc', async () => {
  for (const level of ['medium', 'hard'] as const) {
    for (let g = 1; g <= 60; g++) {
      const state = newMatch(randomPlacement(g), randomPlacement(g + 500), g);
      const r = await playMatch(state, [createAi(level, g), createAi(level, g + 1)]); // applyAction ném lỗi nếu hành động sai
      assert.notEqual(r.state.winner, null, `${level} seed ${g}`);
    }
  }
});

test('AI vừa thắng AI dễ phần lớn số ván', async () => {
  const wins = await duel('medium', 'easy', 200);
  assert.ok(wins >= 140, `vừa thắng ${wins}/200`);
});

test('AI khó thắng AI dễ vượt trội và hơn AI vừa', async () => {
  const vsEasy = await duel('hard', 'easy', 200);
  assert.ok(vsEasy >= 180, `khó thắng dễ ${vsEasy}/200`);
  const vsMedium = await duel('hard', 'medium', 200);
  assert.ok(vsMedium >= 110, `khó thắng vừa ${vsMedium}/200`);
});

const rowsLayout = () => [ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('missile', 0, 6), ship('carrier', 0, 8)];
const otherLayout = () => [ship('destroyer', 8, 0, 'v'), ship('cruiser', 6, 5), ship('submarine', 1, 9), ship('missile', 3, 3, 'v'), ship('carrier', 4, 7)];

test('AI không đọc lưới thật: hai thế trận khác tàu địch nhưng cùng góc nhìn thì cùng hành động', async () => {
  for (const level of ['easy', 'medium', 'hard'] as const) {
    const sA = newMatch(rowsLayout(), rowsLayout(), 1, 1); // AI là P1, bắn lưới P0
    const sB = newMatch(otherLayout(), rowsLayout(), 1, 1);
    const x = await createAi(level, 99).chooseAction({ state: sA, me: 1 });
    const y = await createAi(level, 99).chooseAction({ state: sB, me: 1 });
    assert.deepEqual(x, y, level);
  }
});

test('AI vừa và khó nhắm gần ô đã trúng', async () => {
  const mine = rowsLayout();
  const enemy = [ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('missile', 0, 6), ship('carrier', 3, 8)];
  let s = newMatch(mine, enemy, 1, 0);
  s = applyAction(s, 0, { shipId: 'cruiser', target: { kind: 'precision', cell: { x: 5, y: 8 } } }).state; // trúng sân bay
  s = applyAction(s, 1, { shipId: 'destroyer', target: { kind: 'rapid', cells: [{ x: 9, y: 9 }, { x: 8, y: 9 }] } }).state;
  for (const level of ['medium', 'hard'] as const) {
    let near = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const act = await createAi(level, seed).chooseAction({ state: s, me: 0 });
      assert.ok(isValidAction(s, 0, act));
      const t = act.target;
      const aimed = t.kind === 'cross' || t.kind === 'line3' ? [t.center] : t.kind === 'precision' ? [t.cell] : t.kind === 'rapid' ? t.cells : [];
      if (t.kind === 'torpedo' ? (t.axis === 'row' ? t.index === 8 : t.index >= 3 && t.index <= 7) : aimed.some((c) => Math.abs(c.x - 5) + Math.abs(c.y - 8) <= 1)) near++;
    }
    assert.ok(near >= 25, `${level}: ${near}/30 gần ô trúng`);
  }
});
