import type { Cell, FireAction, FireTarget, Orientation, Player, ShipId } from '../../../design/core-api';
import { readyShips, viewOfEnemy } from '../match';
import { mulberry32, pick, randInt } from '../rng';
import { GRID } from '../specs';
import { attackOf } from './common';

const randomCell = (rng: () => number): Cell => ({ x: randInt(rng, GRID.width), y: randInt(rng, GRID.height) });

/** AI dễ: tàu sẵn sàng ngẫu nhiên, mục tiêu hợp lệ ngẫu nhiên. Chỉ dùng góc nhìn người bắn. */
export function createEasyAi(seed: number): Player {
  const rng = mulberry32(seed);
  return {
    async chooseAction({ state, me }) {
      const ready = readyShips(state, me);
      if (ready.length === 0) throw new Error('Không có tàu sẵn sàng (người điều khiển phải gọi skipTurn)');
      const shipId: ShipId = pick(rng, ready);
      const view = viewOfEnemy(state, me).cells;
      const unknown: Cell[] = view.flatMap((row, y) => row.flatMap((v, x) => (v === 'unknown' ? [{ x, y }] : [])));
      const kind = attackOf(state, me, shipId);
      let target: FireTarget;
      switch (kind) {
        case 'rapid': {
          const a = pick(rng, unknown);
          const rest = unknown.filter((c) => c.x !== a.x || c.y !== a.y);
          target = { kind, cells: rest.length ? [a, pick(rng, rest)] : [a] };
          break;
        }
        case 'precision':
          target = { kind, cell: pick(rng, unknown) };
          break;
        case 'torpedo':
          target = { kind, axis: pick(rng, ['row', 'col'] as const), index: randInt(rng, GRID.width), from: pick(rng, ['start', 'end'] as const) };
          break;
        case 'cross':
          target = { kind, center: randomCell(rng) };
          break;
        case 'line3':
          target = { kind, center: randomCell(rng), orientation: pick<Orientation>(rng, ['h', 'v']) };
          break;
      }
      const action: FireAction = { shipId, target };
      return action;
    },
  };
}
