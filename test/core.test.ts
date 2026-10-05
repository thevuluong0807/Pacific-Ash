import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FLEET, applyAction, isValidAction, isValidPlacement, loadSpecs, previewCells, randomPlacement, readyShips, skipTurn, viewOfEnemy } from '../src/core';
import { fire, match, nearlyWon, rows, ship, types } from './helpers';
import ships from '../design/ships.json';

const cells = (e: { type: string; cells?: unknown }) => (e as { cells: { x: number; y: number }[] }).cells.map((c) => `${c.x},${c.y}`);
const resolved = (events: { type: string }[]) =>
  events.filter((e) => e.type === 'CellResolved').map((e) => { const r = e as unknown as { cell: { x: number; y: number }; result: string }; return `${r.cell.x},${r.cell.y}:${r.result}`; });

test('specs đọc từ ships.json', () => {
  const s = loadSpecs();
  assert.equal(s.carrier.size, ships.ships.carrier.size);
  assert.equal(s.missile.cooldown, ships.ships.missile.cooldown);
});

test('đặt tàu: hợp lệ, chồng, ngoài lưới, thiếu, trùng loại, chạm cạnh', () => {
  assert.ok(isValidPlacement(rows()));
  assert.ok(isValidPlacement(rows().slice(1)), 'mang 4 tàu là hợp lệ');
  assert.ok(isValidPlacement([ship('destroyer', 0, 0)]), 'mang 1 tàu là hợp lệ');
  assert.ok(!isValidPlacement([]), 'không có tàu');
  assert.ok(!isValidPlacement([ship('destroyer', 0, 0), ship('cruiser', 1, 0), ...rows().slice(2)]), 'chồng');
  assert.ok(!isValidPlacement([ship('destroyer', 9, 0), ...rows().slice(1)]), 'ngoài lưới ngang');
  assert.ok(!isValidPlacement([ship('destroyer', 0, 9, 'v'), ...rows().slice(1)]), 'ngoài lưới dọc');
  assert.ok(!isValidPlacement([ship('destroyer', 0, 0), ship('destroyer', 5, 0), ...rows().slice(2)]), 'trùng loại');
  assert.ok(isValidPlacement([ship('destroyer', 0, 0), ship('cruiser', 0, 1), ship('submarine', 0, 2), ship('missile', 0, 3), ship('carrier', 0, 4)]), 'chạm cạnh được phép');
});

test('xếp ngẫu nhiên: hợp lệ và tái lập theo seed', () => {
  for (let seed = 0; seed < 300; seed++) assert.ok(isValidPlacement(randomPlacement(seed)), `seed ${seed}`);
  assert.deepEqual(randomPlacement(7), randomPlacement(7));
  assert.notDeepEqual(randomPlacement(7), randomPlacement(8));
});

// ---- cross ----
test('cross: giữa lưới 5 ô đúng thứ tự tâm, lên, phải, xuống, trái', () => {
  const m = match();
  const { events } = applyAction(m, 0, fire('missile', { kind: 'cross', center: { x: 5, y: 5 } }));
  assert.deepEqual(cells(events[0]), ['5,5', '5,4', '6,5', '5,6', '4,5']);
});
test('cross: góc (0,0) chỉ 3 ô; góc (9,9) chỉ 3 ô', () => {
  const m = match();
  assert.deepEqual(cells(applyAction(m, 0, fire('missile', { kind: 'cross', center: { x: 0, y: 0 } })).events[0]), ['0,0', '1,0', '0,1']);
  assert.deepEqual(cells(applyAction(m, 0, fire('missile', { kind: 'cross', center: { x: 9, y: 9 } })).events[0]), ['9,9', '9,8', '8,9']);
});
test('cross: ô đã bắn không phát event mới và không đổi trạng thái', () => {
  let m = match();
  m = applyAction(m, 0, fire('cruiser', { kind: 'precision', cell: { x: 5, y: 5 } })).state; // trượt (5,5)
  m = applyAction(m, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 9 }, { x: 8, y: 9 }] })).state;
  const r = applyAction(m, 0, fire('missile', { kind: 'cross', center: { x: 5, y: 5 } }));
  assert.equal(cells(r.events[0]).length, 5);
  assert.equal(resolved(r.events).length, 4, '(5,5) đã bắn nên bỏ qua');
  assert.ok(!resolved(r.events).includes('5,5:miss'));
});
test('cross: trúng và chìm', () => {
  // khu trục (0,0),(1,0): tâm (0,0) trúng, ô (1,0) cũng trúng
  const r = applyAction(match(), 0, fire('missile', { kind: 'cross', center: { x: 0, y: 0 } }));
  assert.deepEqual(resolved(r.events), ['0,0:hit', '1,0:hit', '0,1:miss']);
  assert.deepEqual(types(r.events), ['ShotFired', 'CellResolved', 'CellResolved', 'CellResolved', 'ShipSunk', 'TurnChanged']);
  assert.deepEqual(r.state.revealed[1], ['destroyer']);
});

// ---- line3 ----
test('line3: sát mép phải (9,5) h chỉ 2 ô; mép trái (0,5) h 2 ô; mép dọc', () => {
  const m = match();
  assert.deepEqual(cells(applyAction(m, 0, fire('carrier', { kind: 'line3', center: { x: 9, y: 5 }, orientation: 'h' })).events[0]), ['8,5', '9,5']);
  assert.deepEqual(cells(applyAction(m, 0, fire('carrier', { kind: 'line3', center: { x: 0, y: 5 }, orientation: 'h' })).events[0]), ['0,5', '1,5']);
  assert.deepEqual(cells(applyAction(m, 0, fire('carrier', { kind: 'line3', center: { x: 4, y: 0 }, orientation: 'v' })).events[0]), ['4,0', '4,1']);
});
test('line3: giữa lưới, thứ tự tăng của trục', () => {
  const m = match();
  assert.deepEqual(cells(applyAction(m, 0, fire('carrier', { kind: 'line3', center: { x: 4, y: 4 }, orientation: 'v' })).events[0]), ['4,3', '4,4', '4,5']);
});
test('line3: trúng và chìm (tuần dương 3 ô ở hàng 2)', () => {
  const r = applyAction(match(), 0, fire('carrier', { kind: 'line3', center: { x: 1, y: 2 }, orientation: 'h' }));
  assert.deepEqual(resolved(r.events), ['0,2:hit', '1,2:hit', '2,2:hit']);
  assert.ok(types(r.events).includes('ShipSunk'));
});
test('line3: ô đã bắn không phát event mới', () => {
  let m = match();
  m = applyAction(m, 0, fire('cruiser', { kind: 'precision', cell: { x: 4, y: 4 } })).state;
  m = applyAction(m, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 9 }, { x: 8, y: 9 }] })).state;
  const r = applyAction(m, 0, fire('carrier', { kind: 'line3', center: { x: 4, y: 4 }, orientation: 'v' }));
  assert.deepEqual(resolved(r.events), ['4,3:miss', '4,5:miss']);
});

// ---- torpedo ----
const target = (axis: 'row' | 'col', index: number, from: 'start' | 'end') => fire('submarine', { kind: 'torpedo', axis, index, from });
const enemyAt43 = () => [ship('destroyer', 0, 0), ship('cruiser', 4, 3), ship('submarine', 0, 4), ship('missile', 0, 6), ship('carrier', 0, 8)];

test('torpedo: row 3 from start, tàu địch ở (4,3): (0..3,3) trượt, (4,3) trúng', () => {
  const r = applyAction(match(rows(), enemyAt43()), 0, target('row', 3, 'start'));
  assert.deepEqual(resolved(r.events), ['0,3:miss', '1,3:miss', '2,3:miss', '3,3:miss', '4,3:hit']);
  assert.equal(cells(r.events[0]).length, 5);
});
test('torpedo: from end đi từ x=9 về', () => {
  const r = applyAction(match(rows(), enemyAt43()), 0, target('row', 3, 'end'));
  assert.deepEqual(resolved(r.events).slice(-1), ['6,3:hit']);
  assert.equal(resolved(r.events).length, 4);
});
test('torpedo: đi qua đoạn đã trúng, trúng đoạn tiếp theo', () => {
  let m = match(rows(), enemyAt43());
  m = applyAction(m, 0, target('row', 3, 'start')).state; // trúng (4,3)
  m = applyAction(m, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 9 }, { x: 8, y: 9 }] })).state;
  m = applyAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 0 }, { x: 8, y: 0 }] })).state;
  m = applyAction(m, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 7, y: 9 }, { x: 6, y: 9 }] })).state;
  m = applyAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 1 }, { x: 8, y: 1 }] })).state;
  m = applyAction(m, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 5, y: 9 }, { x: 4, y: 9 }] })).state;
  const r = applyAction(m, 0, target('row', 3, 'start'));
  assert.deepEqual(resolved(r.events), ['5,3:hit'], 'chỉ ô mới: (4,3) đã trúng, đi qua; (5,3) trúng');
  assert.equal(cells(r.events[0]).length, 6);
});
test('torpedo: hết đường không trúng, mọi ô trượt; cột sát mép', () => {
  const r = applyAction(match(), 0, target('col', 9, 'start'));
  assert.equal(resolved(r.events).length, 10);
  assert.ok(resolved(r.events).every((s) => s.endsWith(':miss')));
  const r2 = applyAction(match(), 0, target('col', 0, 'end')); // cột 0 có tàu ở y=0,2,4,6,8; đi từ y=9: trúng (0,8)
  assert.deepEqual(resolved(r2.events), ['0,9:miss', '0,8:hit']);
});
test('torpedo: chìm khi trúng đoạn cuối', () => {
  const m = match(rows(), [ship('destroyer', 4, 3), ...rows().slice(1)]);
  let s = applyAction(m, 0, target('row', 3, 'start')).state; // hit (4,3)
  s = applyAction(s, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 9 }, { x: 8, y: 9 }] })).state;
  s = applyAction(s, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 0 }, { x: 8, y: 0 }] })).state;
  s = applyAction(s, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 7, y: 9 }, { x: 6, y: 9 }] })).state;
  s = applyAction(s, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 1 }, { x: 8, y: 1 }] })).state;
  s = applyAction(s, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 5, y: 9 }, { x: 4, y: 9 }] })).state;
  const r = applyAction(s, 0, target('row', 3, 'start'));
  assert.deepEqual(resolved(r.events), ['5,3:hit']);
  assert.ok(types(r.events).includes('ShipSunk'));
});

// ---- rapid ----
test('rapid: hai ô hợp lệ, giữa lưới và sát mép; c1 chìm tàu, c2 vẫn bắn', () => {
  const r = applyAction(match(), 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 0, y: 0 }, { x: 9, y: 9 }] }));
  assert.deepEqual(resolved(r.events), ['0,0:hit', '9,9:miss']);
  const r2 = applyAction(match(), 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 5, y: 5 }, { x: 0, y: 9 }] }));
  assert.deepEqual(resolved(r2.events), ['5,5:miss', '0,9:miss']);
});
test('rapid: c1 trùng c2 bị từ chối; ô ngoài lưới; ô đã bắn; 1 ô khi còn nhiều ô', () => {
  const m = match();
  const a = { x: 3, y: 3 };
  assert.ok(!isValidAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [a, a] })));
  assert.ok(!isValidAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [a, { x: 10, y: 0 }] })));
  assert.ok(!isValidAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [a] })));
  assert.throws(() => applyAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [a, a] })));
  const after = applyAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 3, y: 3 }, { x: 4, y: 3 }] })).state;
  assert.ok(!isValidAction({ ...after, turn: 0 }, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 3, y: 3 }, { x: 5, y: 5 }] })), 'ô đã bắn');
});
test('rapid: 1 ô hợp lệ khi địch còn dưới 2 ô chưa bắn', () => {
  const m = match();
  const shots = m.boards[1].shots.map((row) => row.map(() => 'miss' as const));
  shots[5][5] = 'none';
  const near = { ...m, boards: [m.boards[0], { ...m.boards[1], shots }] as typeof m.boards };
  assert.ok(isValidAction(near, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 5, y: 5 }] })));
});

// ---- precision ----
test('precision: trượt không lộ; trúng tàu chưa chìm lộ loại tàu', () => {
  const miss = applyAction(match(), 0, fire('cruiser', { kind: 'precision', cell: { x: 9, y: 9 } }));
  assert.deepEqual(types(miss.events), ['ShotFired', 'CellResolved', 'TurnChanged']);
  const hit = applyAction(match(), 0, fire('cruiser', { kind: 'precision', cell: { x: 0, y: 8 } }));
  assert.deepEqual(types(hit.events), ['ShotFired', 'CellResolved', 'ShipRevealed', 'TurnChanged']);
  assert.deepEqual(hit.state.revealed[1], ['carrier']);
  assert.ok(!hit.state.boards[1].ships.find((s) => s.id === 'carrier')!.sunk);
  assert.deepEqual(viewOfEnemy(hit.state, 0).revealed, ['carrier']);
});
test('precision: sát mép; ô đã bắn bị từ chối; trúng và chìm', () => {
  const m = match();
  assert.deepEqual(resolved(applyAction(m, 0, fire('cruiser', { kind: 'precision', cell: { x: 0, y: 0 } })).events), ['0,0:hit']);
  // ô đã bắn: cruiser nghỉ 1 lượt rồi bắn lại đúng ô cũ
  const filler = (x: number, y: number) => fire('destroyer', { kind: 'rapid', cells: [{ x, y }, { x: x - 1, y }] });
  let s = applyAction(m, 0, fire('cruiser', { kind: 'precision', cell: { x: 4, y: 4 } })).state;
  s = applyAction(s, 1, filler(9, 9)).state;
  s = applyAction(s, 0, filler(9, 0)).state;
  s = applyAction(s, 1, filler(9, 8)).state;
  assert.ok(readyShips(s, 0).includes('cruiser'));
  assert.ok(!isValidAction(s, 0, fire('cruiser', { kind: 'precision', cell: { x: 4, y: 4 } })), 'ô đã bắn');
  assert.ok(isValidAction(s, 0, fire('cruiser', { kind: 'precision', cell: { x: 4, y: 5 } })));
  // chìm: khu trục (0,0),(1,0): trúng (0,0) rồi (1,0)
  let t = applyAction(m, 0, fire('cruiser', { kind: 'precision', cell: { x: 0, y: 0 } })).state;
  t = applyAction(t, 1, filler(9, 9)).state;
  const r = applyAction(t, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 1, y: 0 }, { x: 9, y: 0 }] }));
  assert.ok(types(r.events).includes('ShipSunk'));
  assert.ok(r.state.boards[1].ships[0].sunk);
});

// ---- hồi chiêu ----
test('hồi chiêu 2: bắn lượt 1, không chọn được lượt 2 và 3, chọn được lượt 4 (theo lượt của chính bên đó)', () => {
  let m = match();
  const opp = (i: number) => fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 9 - i }, { x: 8, y: 9 - i }] });
  const mine = (i: number) => fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: i }, { x: 8, y: i }] });
  m = applyAction(m, 0, fire('missile', { kind: 'cross', center: { x: 5, y: 5 } })).state; // lượt 1 của P0
  assert.ok(!readyShips(m, 0).includes('missile'));
  m = applyAction(m, 1, opp(0)).state;
  assert.ok(!readyShips(m, 0).includes('missile'), 'lượt 2');
  assert.throws(() => applyAction(m, 0, fire('missile', { kind: 'cross', center: { x: 1, y: 1 } })));
  m = applyAction(m, 0, mine(0)).state;
  m = applyAction(m, 1, opp(1)).state;
  assert.ok(!readyShips(m, 0).includes('missile'), 'lượt 3');
  m = applyAction(m, 0, mine(1)).state;
  m = applyAction(m, 1, opp(2)).state;
  assert.ok(readyShips(m, 0).includes('missile'), 'lượt 4');
});
test('hồi chiêu 0: bắn mỗi lượt; hồi chiêu 1 nghỉ đúng 1 lượt', () => {
  let m = match();
  m = applyAction(m, 0, fire('cruiser', { kind: 'precision', cell: { x: 5, y: 5 } })).state;
  assert.ok(readyShips(m, 0).includes('destroyer') && !readyShips(m, 0).includes('cruiser'));
  m = applyAction(m, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 9 }, { x: 8, y: 9 }] })).state;
  m = applyAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 0 }, { x: 8, y: 0 }] })).state;
  m = applyAction(m, 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 7, y: 9 }, { x: 6, y: 9 }] })).state;
  assert.ok(readyShips(m, 0).includes('cruiser'));
});
test('không có tàu sẵn sàng: skipTurn, TurnSkipped, giảm hồi chiêu, sang lượt đối thủ', () => {
  const m = match();
  const busy = m.boards[0].ships.map((s) => ({ ...s, cooldown: 2, sunk: s.id === 'destroyer' }));
  const st = { ...m, boards: [{ ...m.boards[0], ships: busy }, m.boards[1]] as typeof m.boards };
  assert.deepEqual(readyShips(st, 0), []);
  assert.throws(() => skipTurn(match(), 0), 'còn tàu sẵn sàng thì không được bỏ');
  const r = skipTurn(st, 0);
  assert.deepEqual(types(r.events), ['TurnSkipped', 'TurnChanged']);
  assert.equal(r.state.turn, 1);
  assert.ok(r.state.boards[0].ships.filter((s) => !s.sunk).every((s) => s.cooldown === 1));
});

// ---- kết thúc, bất biến, góc nhìn ----
test('thắng: MatchEnded sau ShipSunk, không có TurnChanged, hết hành động hợp lệ', () => {
  const m = nearlyWon();
  const last = m.boards[1].ships.find((x) => !x.sunk)!;
  assert.equal(last.id, 'carrier');
  const r = applyAction(m, 0, fire('cruiser', { kind: 'precision', cell: { x: 4, y: 8 } }));
  assert.deepEqual(types(r.events), ['ShotFired', 'CellResolved', 'ShipRevealed', 'ShipSunk', 'MatchEnded']);
  assert.equal(r.state.winner, 0);
  assert.equal(r.state.turn, 0);
  assert.ok(!isValidAction(r.state, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 9 }, { x: 8, y: 9 }] })));
  assert.throws(() => skipTurn(r.state, 0));
});
test('bắn trượt khi địch còn tàu thì chưa thắng, sang lượt địch', () => {
  const m = nearlyWon();
  const r = applyAction(m, 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 9, y: 9 }, { x: 8, y: 9 }] }));
  assert.equal(r.state.winner, null);
  assert.deepEqual(types(r.events).slice(-1), ['TurnChanged']);
});
test('applyAction không đổi state cũ', () => {
  const m = match();
  const before = JSON.stringify(m);
  applyAction(m, 0, fire('missile', { kind: 'cross', center: { x: 0, y: 0 } }));
  assert.equal(JSON.stringify(m), before);
});
test('viewOfEnemy không lộ ô tàu chưa trúng', () => {
  const m = match();
  const v = viewOfEnemy(m, 0);
  assert.ok(v.cells.flat().every((c) => c === 'unknown'));
  const after = applyAction(m, 0, fire('missile', { kind: 'cross', center: { x: 0, y: 2 } })).state;
  const v2 = viewOfEnemy(after, 0);
  assert.equal(v2.cells[2][0], 'hit');
  assert.equal(v2.cells[2][1], 'hit');
  assert.equal(v2.cells[2][2], 'unknown', '(2,2) cùng tàu nhưng nằm ngoài chữ thập, chưa trúng');
  assert.deepEqual(v2.revealed, []);
});
test('người chơi không được bắn khi không phải lượt', () => {
  assert.ok(!isValidAction(match(), 1, fire('destroyer', { kind: 'rapid', cells: [{ x: 5, y: 5 }, { x: 6, y: 6 }] })));
  assert.ok(!isValidAction(match(), 0, fire('cruiser', { kind: 'rapid', cells: [{ x: 5, y: 5 }, { x: 6, y: 6 }] })), 'sai loại đòn');
});
test('previewCells khớp vùng đánh', () => {
  const m = match();
  assert.deepEqual(previewCells(m, 0, fire('missile', { kind: 'cross', center: { x: 0, y: 0 } })).length, 3);
  assert.equal(previewCells(m, 0, target('row', 3, 'start')).length, 10);
});
test('rapid: hai phát cùng chìm khu trục', () => {
  const r = applyAction(match(), 0, fire('destroyer', { kind: 'rapid', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }] }));
  assert.deepEqual(types(r.events), ['ShotFired', 'CellResolved', 'CellResolved', 'ShipSunk', 'TurnChanged']);
  assert.deepEqual(r.state.revealed[1], ['destroyer']);
});

test('hạm đội nhỏ: 1 đến 5 tàu khác loại, tối đa MAX_FLEET', () => {
  assert.equal(MAX_FLEET, 5);
  for (const ids of [['destroyer'], ['carrier', 'submarine'], ['cruiser', 'missile', 'destroyer'], ['destroyer', 'cruiser', 'submarine', 'missile']] as const) {
    for (let seed = 0; seed < 50; seed++) {
      const p = randomPlacement(seed, ids);
      assert.deepEqual(p.map((s) => s.id), [...ids], 'đúng thứ tự ids');
      assert.ok(isValidPlacement(p), `${ids.join()} seed ${seed}`);
    }
  }
  const six = [...rows(), ship('destroyer', 5, 0)];
  assert.ok(!isValidPlacement(six), 'trùng loại / quá 5');
});
test('hạm đội lệch (1 tàu vs 2 tàu): thắng đúng khi tàu cuối của đối phương chìm', () => {
  const rapid = (a: [number, number], b: [number, number]) => fire('destroyer', { kind: 'rapid', cells: [{ x: a[0], y: a[1] }, { x: b[0], y: b[1] }] });
  let s = match([ship('destroyer', 0, 0)], [ship('destroyer', 0, 0), ship('cruiser', 0, 2)]);
  s = applyAction(s, 0, rapid([0, 0], [1, 0])).state; // chìm khu trục địch
  assert.equal(s.winner, null, 'địch còn tuần dương');
  s = applyAction(s, 1, fire('cruiser', { kind: 'precision', cell: { x: 9, y: 9 } })).state; // khu trục đã chìm, tuần dương bắn
  s = applyAction(s, 0, rapid([0, 2], [1, 2])).state; // tuần dương mới trúng 2/3
  assert.equal(s.winner, null);
  assert.deepEqual(readyShips(s, 1), [], 'tuần dương đang hồi chiêu, không còn tàu sẵn sàng');
  s = skipTurn(s, 1).state;
  const r = applyAction(s, 0, rapid([2, 2], [9, 0]));
  assert.equal(r.state.winner, 0);
  assert.ok(types(r.events).includes('MatchEnded'));
  // chiều ngược lại: bên chỉ có 1 tàu thua khi tàu đó chìm
  const t = match([ship('destroyer', 0, 0)], rows(), 1);
  const lost = applyAction(t, 1, rapid([0, 0], [1, 0]));
  assert.equal(lost.state.winner, 1);
});
