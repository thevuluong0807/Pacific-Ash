import type { Board, Cell, Orientation, PlacedShip, PlayerId, ShipId } from '../../design/core-api';
import { mulberry32, pick, randInt } from './rng';
import { FLEET, FLEET_SIZE, GRID, ROSTER, cellCount, loadSpecs } from './specs';

const SPECS = loadSpecs();

/** Mở rộng nội bộ của Board: cờ `blocked` (ô từng bị hộ vệ triệt tiêu, chưa bắn lại; rules.md mục 10.2). */
export type CoreBoard = Board & { blocked?: boolean[][] };

export const inGrid = (c: Cell) =>
  Number.isInteger(c.x) && Number.isInteger(c.y) && c.x >= 0 && c.x < GRID.width && c.y >= 0 && c.y < GRID.height;

export const other = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);

/** Ô tàu chiếm, theo thứ tự của `hits`: `line` từ origin; `square` (0,0)(1,0)(0,1)(1,1) quanh origin. */
export function shipCells(s: Pick<PlacedShip, 'id' | 'origin' | 'orientation'>): Cell[] {
  const spec = SPECS[s.id];
  if (spec.shape === 'square') {
    const n = spec.size, cells: Cell[] = [];
    for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) cells.push({ x: s.origin.x + dx, y: s.origin.y + dy });
    return cells;
  }
  const cells: Cell[] = [];
  for (let i = 0; i < spec.size; i++) {
    cells.push(s.orientation === 'h' ? { x: s.origin.x + i, y: s.origin.y } : { x: s.origin.x, y: s.origin.y + i });
  }
  return cells;
}

export function freshShip(id: ShipId, origin: Cell, orientation: Orientation): PlacedShip {
  const o: Orientation = SPECS[id].shape === 'square' ? 'h' : orientation; // tàu vuông không xoay
  return { id, origin: { ...origin }, orientation: o, hits: Array(cellCount(id)).fill(false), cooldown: 0, rest: 0, sunk: false };
}

const key = (c: Cell) => c.y * GRID.width + c.x;

/** Tàu nằm trọn trong lưới và không đè lên tàu đã đặt. */
export function fits(placed: PlacedShip[], cand: PlacedShip): boolean {
  const used = new Set(placed.flatMap(shipCells).map(key));
  return shipCells(cand).every((c) => inGrid(c) && !used.has(key(c)));
}

/**
 * 1..FLEET_SIZE tàu khác loại (trong ROSTER), nằm trọn trong lưới, không chồng. Được phép chạm cạnh.
 * (rules.md mục 1 nói "đúng 5", ships.json nói "tối đa 5": giữ cách linh hoạt cũ, xem PROGRESS câu hỏi mở.)
 */
export function isValidPlacement(ships: PlacedShip[]): boolean {
  if (ships.length < 1 || ships.length > FLEET_SIZE) return false;
  if (new Set(ships.map((s) => s.id)).size !== ships.length || !ships.every((s) => ROSTER.includes(s.id))) return false;
  return ships.every((s, i) => fits(ships.slice(0, i), s));
}

/** Xếp ngẫu nhiên theo seed các tàu `ids` (mặc định đội hình mặc định). Trả theo thứ tự `ids`. */
export function randomPlacement(seed: number, ids: readonly ShipId[] = FLEET): PlacedShip[] {
  const rng = mulberry32(seed);
  const order = [...ids].sort((a, b) => cellCount(b) - cellCount(a));
  const placed: PlacedShip[] = [];
  for (const id of order) {
    const spec = SPECS[id], size = spec.size, square = spec.shape === 'square';
    for (;;) {
      const o = square ? 'h' : pick<Orientation>(rng, ['h', 'v']);
      const w = square ? size : o === 'h' ? size : 1, h = square ? size : o === 'v' ? size : 1;
      const origin = { x: randInt(rng, GRID.width - (w - 1)), y: randInt(rng, GRID.height - (h - 1)) };
      const cand = freshShip(id, origin, o);
      if (fits(placed, cand)) {
        placed.push(cand);
        break;
      }
    }
  }
  return ids.map((id) => placed.find((s) => s.id === id)!);
}

export function cloneBoard(b: Board): Board {
  const nb: CoreBoard = {
    ships: b.ships.map((s) => ({ ...s, origin: { ...s.origin }, hits: [...s.hits] })),
    shots: b.shots.map((r) => [...r]),
  };
  const bl = (b as CoreBoard).blocked;
  if (bl) nb.blocked = bl.map((r) => [...r]);
  return nb;
}

export function emptyShots(): Board['shots'] {
  return Array.from({ length: GRID.height }, () => Array<'none' | 'miss' | 'hit'>(GRID.width).fill('none'));
}

export const isBlocked = (b: Board, c: Cell) => !!(b as CoreBoard).blocked?.[c.y]?.[c.x];
export function setBlocked(b: Board, c: Cell, on: boolean) {
  const cb = b as CoreBoard;
  if (!cb.blocked) cb.blocked = Array.from({ length: GRID.height }, () => Array<boolean>(GRID.width).fill(false));
  cb.blocked[c.y][c.x] = on;
}

/** Đoạn tàu tại ô (nếu có). */
export function segmentAt(board: Board, cell: Cell): { ship: PlacedShip; index: number } | undefined {
  for (const ship of board.ships) {
    const i = shipCells(ship).findIndex((c) => c.x === cell.x && c.y === cell.y);
    if (i >= 0) return { ship, index: i };
  }
  return undefined;
}
