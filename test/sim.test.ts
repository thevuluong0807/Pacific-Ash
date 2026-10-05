import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FLEET, MAX_FLEET, createAi, newMatch, playMatch, randomPlacement, mulberry32 } from '../src/core';

async function game(seed: number) {
  const rng = mulberry32(seed);
  const state = newMatch(randomPlacement(seed * 2), randomPlacement(seed * 2 + 1), seed, rng() < 0.5 ? 0 : 1);
  return playMatch(state, [createAi('easy', seed * 3), createAi('easy', seed * 3 + 1)]);
}

test('1000 ván AI dễ vs AI dễ: kết thúc hết, có người thắng, không kẹt', async () => {
  const wins = [0, 0];
  for (let seed = 1; seed <= 1000; seed++) {
    const { state, events } = await game(seed);
    assert.notEqual(state.winner, null, `seed ${seed}`);
    assert.equal(events.filter((e) => e.type === 'MatchEnded').length, 1, `seed ${seed}`);
    assert.ok(state.boards[state.winner === 0 ? 1 : 0].ships.every((s) => s.sunk), `seed ${seed}`);
    wins[state.winner!]++;
  }
  assert.equal(wins[0] + wins[1], 1000);
});

test('cùng seed cho cùng kết quả', async () => {
  for (const seed of [1, 7, 42, 999]) {
    const a = await game(seed), b = await game(seed);
    assert.equal(JSON.stringify(a), JSON.stringify(b), `seed ${seed}`);
  }
});

test('core/ không import three, document, window', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  for (const file of walk('src/core').filter((f) => f.endsWith('.ts'))) {
    const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/from\s+['"]three/.test(code), `${file} import three`);
    assert.ok(!/\b(document|window)\b/.test(code), `${file} dùng document/window`);
  }
});

test('300 ván với hạm đội 1-5 tàu ngẫu nhiên (cả ba mức AI): kết thúc hết', async () => {
  const levels = ['easy', 'medium', 'hard'] as const;
  for (let seed = 1; seed <= 300; seed++) {
    const rng = mulberry32(seed);
    const subset = () => FLEET.filter(() => rng() < 0.6).slice(0, MAX_FLEET);
    const pickFleet = (fallback: (typeof FLEET)[number]) => { const f = subset(); return f.length ? f : [fallback]; };
    const a = pickFleet(FLEET[0]), b = pickFleet(FLEET[1]);
    const state = newMatch(randomPlacement(seed, a), randomPlacement(seed + 9, b), seed, seed % 2 === 0 ? 0 : 1);
    const lv = levels[seed % 3];
    const r = await playMatch(state, [createAi(lv, seed), createAi(levels[(seed + 1) % 3], seed + 5)]);
    assert.notEqual(r.state.winner, null, `seed ${seed} ${a}/${b}`);
  }
});
