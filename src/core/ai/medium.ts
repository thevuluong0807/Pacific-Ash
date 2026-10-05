import type { AttackKind, Cell, CellView, FireAction, Orientation, Player, ShipId } from '../../../design/core-api';
import { readyShips, viewOfEnemy } from '../match';
import { mulberry32, pick } from '../rng';
import { attackOf, cellsWhere, neighbors, sameCell } from './common';

const AREA_ORDER = ['cross', 'line3', 'rapid', 'torpedo', 'precision'];

const isHit = (view: CellView[][], c: Cell) => view[c.y]?.[c.x] === 'hit';

/** Dựng đòn của `shipId` xoay quanh ô `anchor`. `pool` là ô ưu tiên cho phát thứ hai của pháo nhanh. */
function actionAt(kind: AttackKind, shipId: ShipId, anchor: Cell, pool: Cell[], unknown: Cell[], view: CellView[][], rng: () => number): FireAction {
  switch (kind) {
    case 'rapid': {
      const others = (pool.length > 1 ? pool : unknown).filter((c) => !sameCell(c, anchor));
      return { shipId, target: { kind, cells: others.length ? [anchor, pick(rng, others)] : [anchor] } };
    }
    case 'precision':
      return { shipId, target: { kind, cell: anchor } };
    case 'torpedo': {
      const axis = pick(rng, ['row', 'col'] as const);
      return { shipId, target: { kind, axis, index: axis === 'row' ? anchor.y : anchor.x, from: pick(rng, ['start', 'end'] as const) } };
    }
    case 'cross':
      return { shipId, target: { kind, center: anchor } };
    case 'line3': {
      const [up, right, down, left] = neighbors(anchor);
      const orientation: Orientation = isHit(view, left) || isHit(view, right) ? 'h' : isHit(view, up) || isHit(view, down) ? 'v' : pick(rng, ['h', 'v'] as const);
      return { shipId, target: { kind, center: anchor, orientation } };
    }
  }
}

/**
 * AI vừa: như dễ, nhưng sau khi có ô `hit` chưa chìm thì nhắm ô kề;
 * khi chưa có `hit` thì ưu tiên tàu cho vùng lớn. Chỉ dùng góc nhìn người bắn.
 */
export function createMediumAi(seed: number): Player {
  const rng = mulberry32(seed);
  return {
    async chooseAction({ state, me }) {
      const ready = readyShips(state, me);
      const view = viewOfEnemy(state, me).cells;
      const unknown = cellsWhere(view, 'unknown');
      const hits = cellsWhere(view, 'hit');
      const adjacent = unknown.filter((c) => neighbors(c).some((n) => hits.some((h) => sameCell(h, n))));
      if (adjacent.length) { const id = pick(rng, ready); return actionAt(attackOf(state, me, id), id, pick(rng, adjacent), adjacent, unknown, view, rng); }
      const byArea = [...ready].sort((a, b) => AREA_ORDER.indexOf(attackOf(state, me, a)) - AREA_ORDER.indexOf(attackOf(state, me, b)));
      return actionAt(attackOf(state, me, byArea[0]), byArea[0], pick(rng, unknown), [], unknown, view, rng);
    },
  };
}

