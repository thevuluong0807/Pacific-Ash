import type { AttackKind, Cell, CellView, FireTarget, MatchState, Orientation, PlayerId, ShipId } from '../../../design/core-api';
import { effectiveAttack } from '../match';
import { GRID } from '../specs';

export const cellsWhere = (view: CellView[][], v: CellView): Cell[] =>
  view.flatMap((row, y) => row.flatMap((c, x) => (c === v ? [{ x, y }] : [])));

export const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
/** Đòn thực tế của tàu (tàu hỏng khí tài chỉ còn bắn 1 ô). */
export const attackOf = (state: MatchState, me: PlayerId, id: ShipId): AttackKind => {
  const a = effectiveAttack(state, me, id);
  if (a === 'none') throw new Error(`Tàu ${id} chỉ có kỹ năng nội tại`);
  return a;
};

export const allCells = (): Cell[] =>
  Array.from({ length: GRID.width * GRID.height }, (_, i) => ({ x: i % GRID.width, y: Math.floor(i / GRID.width) }));

export const neighbors = (c: Cell): Cell[] => [
  { x: c.x, y: c.y - 1 }, { x: c.x + 1, y: c.y }, { x: c.x, y: c.y + 1 }, { x: c.x - 1, y: c.y },
];

export type { FireTarget, Orientation };
