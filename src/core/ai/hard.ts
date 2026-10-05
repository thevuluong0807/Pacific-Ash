import type { Cell, CellView, FireAction, FireTarget, Player, ShipId } from '../../../design/core-api';
import { targetCells } from '../attacks';
import { inGrid } from '../board';
import { readyShips, sunkShips, viewOfEnemy } from '../match';
import { mulberry32, randInt } from '../rng';
import { GRID, loadSpecs } from '../specs';
import { allCells, attackOf } from './common';

const SPECS = loadSpecs();
const HIT_WEIGHT = 30; // mỗi ô `hit` mà một cách đặt phủ lên được nhân thêm trọng số này

/**
 * Xác suất mỗi ô đang chứa một tàu địch còn sống.
 * XẤP XỈ (đã chốt Q5): từng loại tàu xét độc lập, không loại trừ chồng lấn giữa các tàu;
 * cách đặt nào phủ ô `hit` được ưu tiên. Giới hạn: bỏ qua ràng buộc không chồng giữa các tàu.
 */
export function cellProbabilities(view: CellView[][], remaining: ShipId[]): number[][] {
  const p = Array.from({ length: GRID.height }, () => Array<number>(GRID.width).fill(0));
  for (const id of remaining) {
    const spec = SPECS[id], square = spec.shape === 'square';
    const placements: { cells: Cell[]; w: number }[] = [];
    for (const o of square ? (['h'] as const) : (['h', 'v'] as const)) {
      const bw = square ? spec.size : o === 'h' ? spec.size : 1, bh = square ? spec.size : o === 'v' ? spec.size : 1;
      for (let y = 0; y <= GRID.height - bh; y++) {
        for (let x = 0; x <= GRID.width - bw; x++) {
          const cells: Cell[] = [];
          for (let dy = 0; dy < bh; dy++) for (let dx = 0; dx < bw; dx++) cells.push({ x: x + dx, y: y + dy });
          if (cells.some((c) => view[c.y][c.x] === 'miss' || view[c.y][c.x] === 'sunk')) continue;
          const hits = cells.filter((c) => view[c.y][c.x] === 'hit').length;
          placements.push({ cells, w: 1 + HIT_WEIGHT * hits });
        }
      }
    }
    const total = placements.reduce((a, b) => a + b.w, 0);
    if (total === 0) continue;
    for (const pl of placements) for (const c of pl.cells) p[c.y][c.x] += pl.w / total;
  }
  return p;
}

interface Candidate { shipId: ShipId; target: FireTarget; score: number }

/**
 * AI khó: với mỗi cặp (tàu sẵn sàng, mục tiêu) tính số ô trúng kỳ vọng, chọn cặp lớn nhất;
 * ngang nhau thì ưu tiên tàu hồi chiêu ngắn hơn. Chỉ dùng góc nhìn người bắn và danh sách tàu địch đã chìm (công khai).
 */
export function createHardAi(seed: number): Player {
  const rng = mulberry32(seed);
  return {
    async chooseAction({ state, me }) {
      const view = viewOfEnemy(state, me).cells;
      const sunk = sunkShips(state, me);
      // Đội hình địch = bản sao đội hình của mình (rules.md mục 1)
      const p = cellProbabilities(view, state.boards[me].ships.map((x) => x.id).filter((id) => !sunk.includes(id)));
      const fresh = (c: Cell) => inGrid(c) && view[c.y][c.x] === 'unknown';
      const sum = (cells: Cell[]) => cells.filter(fresh).reduce((a, c) => a + p[c.y][c.x], 0);
      const byProb = allCells().filter(fresh).sort((a, b) => p[b.y][b.x] - p[a.y][a.x]);

      const cands: Candidate[] = [];
      for (const shipId of readyShips(state, me)) {
        const kind = attackOf(state, me, shipId);
        const add = (target: FireTarget, score: number) => cands.push({ shipId, target, score });
        switch (kind) {
          case 'rapid': {
            const best = byProb.slice(0, 2);
            add({ kind, cells: best.length === 2 ? [best[0], best[1]] : [best[0]] }, sum(best));
            break;
          }
          case 'precision':
            add({ kind, cell: byProb[0] }, p[byProb[0].y][byProb[0].x]);
            break;
          case 'torpedo':
            for (const axis of ['row', 'col'] as const) for (let index = 0; index < 10; index++) for (const from of ['start', 'end'] as const) {
              const t: FireTarget = { kind, axis, index, from };
              // xác suất trúng ít nhất một đoạn tàu trên đường đi (độc lập xấp xỉ)
              const miss = targetCells(t).filter(fresh).reduce((a, c) => a * (1 - Math.min(p[c.y][c.x], 1)), 1);
              add(t, 1 - miss);
            }
            break;
          case 'cross':
            for (const c of allCells()) add({ kind, center: c }, sum(targetCells({ kind, center: c })));
            break;
          case 'line3':
            for (const c of allCells()) for (const orientation of ['h', 'v'] as const) {
              add({ kind, center: c, orientation }, sum(targetCells({ kind, center: c, orientation })));
            }
            break;
        }
      }
      const eps = 1e-9;
      let best = cands[0];
      let ties = 1;
      for (const c of cands.slice(1)) {
        const dScore = c.score - best.score;
        const dCool = SPECS[best.shipId].cooldown - SPECS[c.shipId].cooldown; // dương: c hồi chiêu ngắn hơn
        if (dScore > eps || (Math.abs(dScore) <= eps && dCool > 0)) { best = c; ties = 1; }
        else if (Math.abs(dScore) <= eps && dCool === 0) { ties++; if (randInt(rng, ties) === 0) best = c; }
      }
      const action: FireAction = { shipId: best.shipId, target: best.target };
      return action;
    },
  };
}
