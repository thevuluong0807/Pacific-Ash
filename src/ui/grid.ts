import type { Board, Cell, CellMark, CellView, Orientation, ShipId } from '../../design/core-api';
import { shipCells } from '../core/board';
import { GRID } from '../core/specs';
import { shipSprite } from './shipArt';
import { marker, type MarkerId } from './sprites';
import { strings as S } from './strings';

const COLS = 'ABCDEFGHIJ';
export const cellName = (c: Cell) => `${COLS[c.x]}${c.y + 1}`;

export interface ShipDraw { id: ShipId; origin: Cell; orientation: Orientation; sunk?: boolean }
export interface GridOptions {
  onCell?: (c: Cell) => void;
  /** Chạm nhãn hàng/cột ở mép (chỉ khi bật handles): chọn đường ngư lôi. */
  onHandle?: (axis: 'row' | 'col', index: number) => void;
  /** Điều hướng bàn phím bằng phím mũi tên, Enter/Space để chọn ô. */
  interactive?: boolean;
}

/** Marker hoang tàn từ design/art/markers.svg (ui-art.md 2.2): hố nước / lỗ đạn nổ / đổ nát. */
const MARK: Record<CellView, MarkerId | null> = { unknown: null, miss: 'miss', hit: 'hit', sunk: 'sunk' };

/** Lưới 10x10 bằng DOM/CSS grid. Hàng/cột đầu là nhãn (cũng là tay nắm ngư lôi). */
export class GridView {
  readonly el = document.createElement('div');
  private cells: HTMLElement[][] = [];
  private rowHandles: HTMLElement[] = [];
  private colHandles: HTMLElement[] = [];
  private shipEls = new Map<ShipId, HTMLElement>();
  private cursor: Cell = { x: 0, y: 0 };

  constructor(private opts: GridOptions = {}) {
    const el = this.el;
    el.className = 'grid';
    el.setAttribute('role', 'grid');
    if (opts.interactive) el.tabIndex = 0;
    // Mọi phần tử đặt vị trí tường minh: tàu phủ lên bằng grid-area nên không được để auto-placement xô lệch.
    const add = (cls: string, text = '', col = 1, row = 1) => {
      const d = document.createElement('div');
      d.className = cls; d.textContent = text;
      d.style.gridColumn = String(col); d.style.gridRow = String(row);
      el.appendChild(d);
      return d;
    };
    add('g-corner');
    for (let x = 0; x < GRID.width; x++) {
      const h = add('g-label g-handle', COLS[x], x + 2, 1);
      h.dataset.hcol = String(x);
      this.colHandles.push(h);
    }
    for (let y = 0; y < GRID.height; y++) {
      const h = add('g-label g-handle', String(y + 1), 1, y + 2);
      h.dataset.hrow = String(y);
      this.rowHandles.push(h);
      const row: HTMLElement[] = [];
      for (let x = 0; x < GRID.width; x++) {
        const c = add('g-cell', '', x + 2, y + 2);
        c.dataset.x = String(x); c.dataset.y = String(y);
        c.innerHTML = '<span class="g-mk"></span><span class="g-pv"></span>';
        c.setAttribute('role', 'gridcell');
        c.setAttribute('aria-label', `${cellName({ x, y })} ${S.battle.cellState.unknown}`);
        row.push(c);
      }
      this.cells.push(row);
    }
    el.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-x],[data-hrow],[data-hcol]');
      if (!t) return;
      if (t.dataset.x !== undefined) this.opts.onCell?.({ x: +t.dataset.x, y: +t.dataset.y! });
      else if (el.classList.contains('grid--handles')) {
        if (t.dataset.hrow !== undefined) this.opts.onHandle?.('row', +t.dataset.hrow);
        else this.opts.onHandle?.('col', +t.dataset.hcol!);
      }
    });
    if (opts.interactive) {
      el.addEventListener('keydown', (e) => {
        const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (d[e.key]) {
          e.preventDefault();
          this.moveCursor(this.cursor.x + d[e.key][0], this.cursor.y + d[e.key][1]);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.opts.onCell?.({ ...this.cursor });
        }
      });
      this.moveCursor(0, 0);
    }
  }

  private moveCursor(x: number, y: number) {
    this.cells[this.cursor.y][this.cursor.x].classList.remove('c--cursor');
    this.cursor = { x: Math.max(0, Math.min(GRID.width - 1, x)), y: Math.max(0, Math.min(GRID.height - 1, y)) };
    this.cells[this.cursor.y][this.cursor.x].classList.add('c--cursor');
  }

  cell(c: Cell): HTMLElement { return this.cells[c.y][c.x]; }

  /** Ô dưới con trỏ (dùng khi kéo thả). */
  cellAt(clientX: number, clientY: number): Cell | null {
    const t = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-x]');
    return t ? { x: +t.dataset.x!, y: +t.dataset.y! } : null;
  }

  /** Vẽ marker trượt/trúng/chìm từ góc nhìn người bắn; `marks` = cờ `blocked` (ô bị hộ vệ chặn, chưa bắn). */
  setView(view: CellView[][], marks?: CellMark[][]) {
    for (let y = 0; y < GRID.height; y++) for (let x = 0; x < GRID.width; x++) this.mark({ x, y }, view[y][x], marks?.[y][x] ?? null);
  }

  /** Lưới của mình: tàu + ô đã bị bắn. */
  setOwn(board: Board) {
    const view: CellView[][] = board.shots.map((r) => r.map((s): CellView => (s === 'none' ? 'unknown' : s)));
    for (const sh of board.ships) if (sh.sunk) for (const c of shipCells(sh)) view[c.y][c.x] = 'sunk'; // tàu mình chìm: sprite xám + X, không còn marker trúng
    this.setView(view);
    this.setShips(board.ships.map((s) => ({ id: s.id, origin: s.origin, orientation: s.orientation, sunk: s.sunk })));
  }

  private mark(c: Cell, v: CellView, blocked: CellMark = null) {
    const el = this.cells[c.y][c.x];
    el.classList.remove('c--miss', 'c--hit', 'c--sunk', 'c--blocked');
    if (v !== 'unknown') el.classList.add(`c--${v}`);
    const b = v === 'unknown' && blocked === 'blocked';
    if (b) el.classList.add('c--blocked');
    const m = b ? 'blocked' : MARK[v];
    el.firstElementChild!.innerHTML = m ? marker(m) : '';
    el.setAttribute('aria-label', `${cellName(c)} ${S.battle.cellState[b ? 'blocked' : v]}`);
  }

  setShips(ships: ShipDraw[]): Map<ShipId, HTMLElement> {
    this.shipEls.forEach((e) => e.remove());
    this.shipEls.clear();
    for (const s of ships) {
      const e = shipSprite(s.id, s.orientation);
      const size = +e.style.getPropertyValue('--size');
      const sq = e.classList.contains('ship--sq');
      e.style.gridColumn = `${s.origin.x + 2} / span ${sq || s.orientation === 'h' ? size : 1}`;
      e.style.gridRow = `${s.origin.y + 2} / span ${sq || s.orientation === 'v' ? size : 1}`;
      if (s.sunk) e.classList.add('ship--sunk');
      this.el.appendChild(e);
      this.shipEls.set(s.id, e);
    }
    return this.shipEls;
  }

  ship(id: ShipId) { return this.shipEls.get(id); }

  /** Vùng xem trước: 'hostile' = ngoặc nhắm cam (hoặc vạch ngư lôi nếu `lane`), 'bad' = sọc đỏ, 'ok' = đặt tàu hợp lệ. */
  setPreview(cells: Cell[], kind: 'ok' | 'bad' | 'hostile', lane = false) {
    this.clearPreview();
    const mk: MarkerId | null = kind === 'hostile' ? (lane ? 'lane' : 'aim') : kind === 'bad' ? 'bad' : null;
    for (const c of cells) {
      const e = this.cells[c.y]?.[c.x];
      if (!e) continue;
      e.classList.add(`c--prev-${kind}`);
      if (mk) e.lastElementChild!.innerHTML = marker(mk);
    }
  }
  clearPreview() {
    for (const row of this.cells) for (const e of row) {
      e.classList.remove('c--prev-ok', 'c--prev-bad', 'c--prev-hostile');
      if (!e.classList.contains('c--sel')) e.lastElementChild!.innerHTML = '';
    }
  }

  /** Ô được chọn, kèm vòng số 1/2 nếu `numbered` (pháo nhanh). */
  setSelected(cells: Cell[], numbered = false) {
    for (const row of this.cells) for (const e of row) { if (e.classList.contains('c--sel')) { e.classList.remove('c--sel'); e.lastElementChild!.innerHTML = ''; } }
    cells.forEach((c, i) => {
      const e = this.cells[c.y][c.x];
      e.classList.add('c--sel');
      if (numbered) e.lastElementChild!.innerHTML = marker(i === 0 ? 't1' : 't2');
    });
  }

  /** Ô không chọn được (làm mờ). */
  setDisabled(fn: ((c: Cell) => boolean) | null) {
    for (let y = 0; y < GRID.height; y++) for (let x = 0; x < GRID.width; x++) {
      this.cells[y][x].classList.toggle('c--off', !!fn && fn({ x, y }));
    }
  }

  /** Bật/tắt tay nắm ngư lôi; `active` đánh dấu hàng/cột đang chọn và phía vào. */
  setHandles(on: boolean, active?: { axis: 'row' | 'col'; index: number; from: 'start' | 'end' }) {
    this.el.classList.toggle('grid--handles', on);
    for (const h of [...this.rowHandles, ...this.colHandles]) { h.classList.remove('h--active', 'h--start', 'h--end'); }
    if (on && active) {
      const h = (active.axis === 'row' ? this.rowHandles : this.colHandles)[active.index];
      h.classList.add('h--active', active.from === 'start' ? 'h--start' : 'h--end');
    }
  }

  flash(c: Cell) {
    const e = this.cells[c.y][c.x];
    e.classList.remove('c--pop');
    void e.offsetWidth;
    e.classList.add('c--pop');
  }
}
