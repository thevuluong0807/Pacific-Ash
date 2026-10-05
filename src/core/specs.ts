import data from '../../design/ships.json';
import type { ShipId, ShipSpec } from '../../design/core-api';

export const GRID = data.grid;
/** Đội hình mặc định (5 tàu cổ điển). */
export const FLEET = data.fleet as ShipId[];
/** Toàn bộ loại tàu (7). Người chơi chọn `FLEET_SIZE` trong số này. */
export const ROSTER = data.roster as ShipId[];
/** Số tàu mỗi bên mang vào trận. */
export const FLEET_SIZE = data.fleetSize;
/** Tên cũ của `FLEET_SIZE`, giữ cho UI. */
export const MAX_FLEET = FLEET_SIZE;

const SPECS = Object.fromEntries(
  ROSTER.map((id) => [id, { id, ...(data.ships as Record<string, object>)[id] } as unknown as ShipSpec]),
) as Record<ShipId, ShipSpec>;

/** Đọc từ design/ships.json, không hard-code số liệu tàu. */
export function loadSpecs(): Record<ShipId, ShipSpec> {
  return SPECS;
}

/** Số ô của tàu: `line` = size, `square` = size². */
export const cellCount = (id: ShipId) => (SPECS[id].shape === 'square' ? SPECS[id].size ** 2 : SPECS[id].size);
