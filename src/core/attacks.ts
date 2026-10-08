import type { Board, Cell, FireTarget } from '../../design/core-api';
import { inGrid, segmentAt, setBlocked } from './board';
import { randInt } from './rng';
import { GRID } from './specs';

const keep = (cells: Cell[]) => cells.filter(inGrid);

/** Ô của đường ngư lôi, theo chiều đi. */
function torpedoLine(t: Extract<FireTarget, { kind: 'torpedo' }>): Cell[] {
  const n = t.axis === 'row' ? GRID.width : GRID.height;
  const line = Array.from({ length: n }, (_, i): Cell => (t.axis === 'row' ? { x: i, y: t.index } : { x: t.index, y: i }));
  return t.from === 'start' ? line : line.reverse();
}

/** Ô sẽ bị đánh, chưa phân giải, theo thứ tự. Ngư lôi trả cả đường (UI vẽ mũi tên, không lộ thông tin). */
export function targetCells(t: FireTarget): Cell[] {
  switch (t.kind) {
    case 'rapid':
      return keep([...t.cells]);
    case 'precision':
      return keep([t.cell]);
    case 'torpedo':
      return torpedoLine(t);
    case 'cross': {
      const { x, y } = t.center;
      return keep([{ x, y }, { x, y: y - 1 }, { x: x + 1, y }, { x, y: y + 1 }, { x: x - 1, y }]);
    }
    case 'line3': {
      const { x, y } = t.center;
      return keep(
        t.orientation === 'h'
          ? [{ x: x - 1, y }, { x, y }, { x: x + 1, y }, { x: x + 2, y }]
          : [{ x, y: y - 1 }, { x, y }, { x, y: y + 1 }, { x, y: y + 2 }], // rải thảm 4 ô: tâm là ô thứ hai của dải (rules.md 4.4)
      );
    }
    case 'barrage':
      return []; // ô do core chọn ngẫu nhiên khi bắn (`pickBarrage`), không xem trước được
  }
}

/** Dội pháo (rules.md 4.6): `shots` ô khác nhau, đều, trong các ô chưa có kết quả (ô `blocked` vẫn được chọn); ít hơn thì lấy hết. Thứ tự = thứ tự rút. */
export function pickBarrage(board: Board, shots: number, rng: () => number): Cell[] {
  const free: Cell[] = [];
  for (let y = 0; y < GRID.height; y++) for (let x = 0; x < GRID.width; x++) if (board.shots[y][x] === 'none') free.push({ x, y });
  const out: Cell[] = [];
  while (out.length < shots && free.length) out.push(free.splice(randInt(rng, free.length), 1)[0]);
  return out;
}

/** Phân giải một ô trên lưới bên bị bắn (sửa trực tiếp `board`). Ô đã có kết quả: không đổi, trả null. */
export function resolveCell(board: Board, c: Cell): 'miss' | 'hit' | null {
  if (board.shots[c.y][c.x] !== 'none') return null;
  setBlocked(board, c, false); // ô có kết quả thì mất cờ blocked
  const seg = segmentAt(board, c);
  if (seg && !seg.ship.hits[seg.index]) {
    seg.ship.hits[seg.index] = true;
    board.shots[c.y][c.x] = 'hit';
    return 'hit';
  }
  board.shots[c.y][c.x] = 'miss';
  return 'miss';
}

export interface Resolution {
  cells: Cell[]; // ô đã đi qua / bị đánh, theo thứ tự (gồm cả ô đã có kết quả từ trước)
  results: { cell: Cell; result: 'miss' | 'hit' }[]; // chỉ ô có kết quả mới
}

/**
 * Đường đi của đòn (không sửa `board`): ngư lôi dừng ở đoạn tàu đầu tiên chưa trúng; các đòn khác là cả vùng.
 */
export function attackPath(board: Board, t: FireTarget, fixed?: Cell[]): Cell[] {
  if (t.kind === 'barrage') return fixed ?? [];
  const all = targetCells(t);
  if (t.kind !== 'torpedo') return all;
  const path: Cell[] = [];
  for (const c of all) {
    path.push(c);
    const seg = segmentAt(board, c);
    if (board.shots[c.y][c.x] === 'none' && seg && !seg.ship.hits[seg.index]) break; // ô dừng (sẽ trúng)
  }
  return path;
}

/**
 * Bắn lên `board` (sửa trực tiếp). `nullified` = ô bị hộ vệ triệt tiêu: không phân giải, chỉ đánh dấu `blocked`
 * (rules.md 10.2). Đường ngư lôi không đổi; ô dừng bị triệt tiêu thì không trúng.
 */
export function resolveAttack(board: Board, t: FireTarget, nullified: ReadonlySet<string> = new Set(), fixed?: Cell[]): Resolution {
  const cells = attackPath(board, t, fixed);
  const results: Resolution['results'] = [];
  for (const cell of cells) {
    if (nullified.has(`${cell.x},${cell.y}`)) {
      if (board.shots[cell.y][cell.x] === 'none') setBlocked(board, cell, true);
      continue;
    }
    const result = resolveCell(board, cell);
    if (result) results.push({ cell, result });
  }
  return { cells, results };
}
