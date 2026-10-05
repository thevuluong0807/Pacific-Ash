import type { MatchState, PlacedShip, PlayerId } from '../../design/core-api';
import type { Update } from '../net/protocol';
import { cloneBoard, emptyShots, freshShip, other, setBlocked } from './board';
import { ROSTER } from './specs';

/**
 * Trạng thái phía người chơi online: lưới của mình là thật (server gửi mỗi lượt), lưới địch chỉ có ô đã bắn,
 * ô bị hộ vệ chặn và tàu đã chìm (từ event công khai). Tàu địch chưa chìm là chỗ giữ chỗ nằm ngoài lưới,
 * để UI vẫn dùng được `readyShips`, `isValidAction`, `viewOfEnemy`, `previewCells` như khi chơi cục bộ.
 */
type Mirror = MatchState & { equipDamage?: boolean };

const OFF = { x: -20, y: -20 };
const isPlaceholder = (s: PlacedShip) => s.origin.x < 0;

export function mirrorStart(mine: PlacedShip[], me: PlayerId, foeCount: number, first: PlayerId, seed: number, equipDamage: boolean): MatchState {
  const own = { ships: mine.map((s) => freshShip(s.id, s.origin, s.orientation)), shots: emptyShots() };
  const foe = { ships: Array.from({ length: foeCount }, (_, i) => freshShip(ROSTER[i % ROSTER.length], OFF, 'h')), shots: emptyShots() };
  const st: Mirror = { boards: me === 0 ? [own, foe] : [foe, own], turn: first, turnNumber: 1, revealed: [[], []], winner: null, seed, equipDamage };
  return st;
}

/** Áp một bản cập nhật của server lên trạng thái phía người chơi `me`. Không sửa `state` cũ. */
export function applyUpdate(state: MatchState, u: Update, me: PlayerId): MatchState {
  const foeId = other(me);
  const boards: [typeof state.boards[0], typeof state.boards[0]] = [cloneBoard(state.boards[0]), cloneBoard(state.boards[1])];
  const foe = boards[foeId];
  for (const e of u.events) {
    if (e.type === 'CellResolved' && e.player === me) {
      foe.shots[e.cell.y][e.cell.x] = e.result;
      setBlocked(foe, e.cell, false);
    } else if (e.type === 'ShotNullified' && e.owner === foeId) {
      for (const c of e.cells) if (foe.shots[c.y][c.x] === 'none') setBlocked(foe, c, true);
    } else if (e.type === 'ShipSunk' && e.owner === foeId) {
      const real = freshShip(e.shipId, e.cells[0], e.cells[1] && e.cells[1].y !== e.cells[0].y ? 'v' : 'h');
      real.hits = real.hits.map(() => true);
      real.sunk = true;
      const i = foe.ships.findIndex((s) => isPlaceholder(s) && s.id === e.shipId);
      const j = i >= 0 ? i : foe.ships.findIndex(isPlaceholder);
      if (j >= 0) foe.ships.splice(j, 1);
      foe.ships.push(real);
    }
  }
  boards[me] = cloneBoard(u.board);
  return { ...(state as Mirror), boards, revealed: [[...u.revealed[0]], [...u.revealed[1]]], turn: u.turn, turnNumber: u.turnNumber, winner: u.winner };
}
