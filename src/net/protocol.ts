import type { Board, FireAction, GameEvent, PlacedShip, PlayerId, ShipId } from '../../design/core-api';

/** Giao thức WebSocket JSON giữa client và server online. Server giữ luật (core/), client chỉ gửi ý định. */
export type C2S =
  | { t: 'create'; equipDamage: boolean; turnLimit: number }          // tạo phòng riêng, nhận mã phòng
  | { t: 'join'; code: string }                     // vào phòng bằng mã hoặc link mời
  | { t: 'quick'; turnLimit: number }               // ghép ngẫu nhiên: vào hàng đợi (chỉ ghép người cùng giới hạn thời gian)
  | { t: 'resume'; code: string; token: string }    // nối lại sau khi rớt mạng
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
  /** Thời gian còn lại của lượt hiện tại (ms) khi phòng có giới hạn thời gian; null nếu không giới hạn. */
  remainMs: number | null;
}

/** Ảnh chụp trạng thái khi nối lại: lưới địch chỉ gồm ô đã bắn, ô bị chặn và tàu đã chìm (như lúc chơi bình thường). */
export interface ResumeSnapshot {
  phase: 'placing' | 'playing';
  you: PlayerId;
  code: string;
  equipDamage: boolean;
  turnLimit: number;
  graceMs: number;
  seed: number;
  foeCount: number;
  update?: Update;
  foe?: { shots: ('none' | 'miss' | 'hit')[][]; blocked: boolean[][]; sunk: PlacedShip[] };
}

export type S2C =
  | { t: 'room'; code: string }                                           // đã tạo phòng, đang chờ người vào
  | { t: 'queued' }                                                       // đang trong hàng đợi ghép ngẫu nhiên
  | { t: 'matched'; code: string; you: PlayerId; equipDamage: boolean; turnLimit: number; token: string; graceMs: number }   // đủ hai người: sang bước xếp tàu
  | { t: 'start'; first: PlayerId; seed: number; foeCount: number; update: Update }
  | { t: 'update'; update: Update }
  | { t: 'opponentLeft' }                                                  // đối thủ thoát hẳn (hoặc quá hạn nối lại): bạn thắng
  | { t: 'opponentDropped'; graceMs: number }                              // đối thủ rớt mạng, đang chờ nối lại
  | { t: 'opponentBack' }
  | { t: 'resumed'; snapshot: ResumeSnapshot }
  | { t: 'resumeFailed' }
  | { t: 'error'; msg: string }
  | { t: 'pong' };

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
