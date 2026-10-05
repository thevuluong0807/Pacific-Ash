import type { Board, FireAction, GameEvent, PlacedShip, PlayerId, ShipId } from '../../design/core-api';

/** Giao thức WebSocket JSON giữa client và server online. Server giữ luật (core/), client chỉ gửi ý định. */
export type C2S =
  | { t: 'create'; equipDamage: boolean }          // tạo phòng riêng, nhận mã phòng
  | { t: 'join'; code: string }                     // vào phòng bằng mã hoặc link mời
  | { t: 'quick' }                                  // ghép ngẫu nhiên: vào hàng đợi
  | { t: 'cancel' }                                 // rời hàng đợi / hủy phòng chờ
  | { t: 'place'; ships: PlacedShip[] }             // chốt cách xếp tàu
  | { t: 'fire'; action: FireAction }
  | { t: 'leave' }
  | { t: 'ping' };

/** Cập nhật sau mỗi hành động. `events` công khai cho cả hai bên; `board` là lưới của chính người nhận (đầy đủ, có hồi chiêu). */
export interface Update {
  events: GameEvent[];
  board: Board;
  revealed: [ShipId[], ShipId[]];
  turn: PlayerId;
  turnNumber: number;
  winner: PlayerId | null;
}

export type S2C =
  | { t: 'room'; code: string }                                           // đã tạo phòng, đang chờ người vào
  | { t: 'queued' }                                                       // đang trong hàng đợi ghép ngẫu nhiên
  | { t: 'matched'; code: string; you: PlayerId; equipDamage: boolean }   // đủ hai người: sang bước xếp tàu
  | { t: 'start'; first: PlayerId; seed: number; foeCount: number; update: Update }
  | { t: 'update'; update: Update }
  | { t: 'opponentLeft' }
  | { t: 'error'; msg: string }
  | { t: 'pong' };

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
