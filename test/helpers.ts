import type { FireAction, MatchState, Orientation, PlacedShip, PlayerId, ShipId } from '../design/core-api';
import { newMatch } from '../src/core';
import { freshShip } from '../src/core/board';

export const ship = (id: ShipId, x: number, y: number, o: Orientation = 'h') => freshShip(id, { x, y }, o);

/** Bố cục cố định: mỗi tàu nằm ngang ở hàng riêng (0, 2, 4, 6, 8), bắt đầu từ cột 0. */
export const rows = (): PlacedShip[] => [
  ship('destroyer', 0, 0), ship('cruiser', 0, 2), ship('submarine', 0, 4), ship('missile', 0, 6), ship('carrier', 0, 8),
];

export const match = (p0 = rows(), p1 = rows(), first: PlayerId = 0): MatchState => newMatch(p0, p1, 1, first);

export const fire = (shipId: ShipId, target: FireAction['target']): FireAction => ({ shipId, target });

export const types = (events: { type: string }[]) => events.map((e) => e.type);

/** Địch (P1) đã chìm hết trừ sân bay; sân bay còn đúng một đoạn chưa trúng ở (4,8). P0 đang tới lượt. */
export const nearlyWon = (): MatchState => {
  const m = match();
  const shots = m.boards[1].shots.map((r) => [...r]);
  const ships = m.boards[1].ships.map((s) => {
    const done = s.id !== 'carrier';
    const hits = s.hits.map((_, i) => done || i < s.hits.length - 1);
    shipCellsOf(s).forEach((c, i) => { if (hits[i]) shots[c.y][c.x] = 'hit'; });
    return { ...s, hits, sunk: done };
  });
  return { ...m, boards: [m.boards[0], { ships, shots }] };
};
import { shipCells as shipCellsOf } from '../src/core';
