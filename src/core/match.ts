import type {
  Board, Cell, CellMark, CellView, FireAction, GameEvent, MatchState, PlacedShip, PlayerId, ShipAttack, ShipId,
} from '../../design/core-api';
import { attackPath, resolveAttack, resolveCell, targetCells } from './attacks';
import { cloneBoard, emptyShots, freshShip, inGrid, isBlocked, isValidPlacement, other, segmentAt, shipCells } from './board';
import { mulberry32, randInt } from './rng';
import { GRID, loadSpecs } from './specs';

const SPECS = loadSpecs();

/** Mở rộng nội bộ: đầu lượt nào đã chạy kỹ năng nội tại (để gọi nhiều lần không bắn lại). */
type CoreState = MatchState & { passiveTurn?: number; equipDamage?: boolean };
type Result = { state: MatchState; events: GameEvent[] };

/**
 * Chế độ "hỏng hóc khí tài" (không thuộc `rules.md`, yêu cầu người dùng): tàu bị trúng quá 50% tổng ô mất kỹ năng đặc biệt.
 * Tàu có đòn chủ động trở thành tàu thường (bắn 1 ô, không lộ loại tàu, hồi chiêu giữ nguyên); tàu nội tại mất tác dụng hẳn.
 */
export const isDamaged = (s: PlacedShip) => !s.sunk && s.hits.filter(Boolean).length * 2 > s.hits.length;
const damagedOn = (state: MatchState, s: PlacedShip) => !!(state as CoreState).equipDamage && isDamaged(s);

/** Đòn thực tế của tàu `shipId` bên `player`: tàu hỏng khí tài chỉ còn `precision` (1 ô). */
export function effectiveAttack(state: MatchState, player: PlayerId, shipId: ShipId): ShipAttack {
  const s = state.boards[player].ships.find((x) => x.id === shipId);
  const a = SPECS[shipId].attack;
  return s && a !== 'none' && damagedOn(state, s) ? 'precision' : a;
}

export function newMatch(p0: PlacedShip[], p1: PlacedShip[], seed: number, first: PlayerId = 0, opts: { equipDamage?: boolean } = {}): MatchState {
  if (!isValidPlacement(p0) || !isValidPlacement(p1)) throw new Error('Cách đặt tàu không hợp lệ');
  const board = (ships: PlacedShip[]): Board => ({
    ships: ships.map((s) => freshShip(s.id, s.origin, s.orientation)),
    shots: emptyShots(),
  });
  const st: CoreState = { boards: [board(p0), board(p1)], turn: first, turnNumber: 1, revealed: [[], []], winner: null, seed, equipDamage: !!opts.equipDamage };
  return st;
}

/** Tàu có đòn chủ động, còn sống, hết hồi chiêu. Tàu nội tại không bao giờ sẵn sàng. */
export function readyShips(state: MatchState, player: PlayerId): ShipId[] {
  return state.boards[player].ships
    .filter((s) => !s.sunk && s.cooldown === 0 && SPECS[s.id].attack !== 'none')
    .map((s) => s.id);
}

/** Ô sẽ bị đánh (chưa phân giải), theo thứ tự. Dùng cho xem trước vùng nhắm. */
export function previewCells(_state: MatchState, _player: PlayerId, action: FireAction): Cell[] {
  return targetCells(action.target);
}

export function isValidAction(state: MatchState, player: PlayerId, action: FireAction): boolean {
  if (state.winner !== null || state.turn !== player) return false;
  const ship = state.boards[player].ships.find((s) => s.id === action.shipId);
  if (!ship || ship.sunk || ship.cooldown !== 0) return false;
  const t = action.target;
  if (SPECS[ship.id].attack === 'none' || t.kind !== effectiveAttack(state, player, ship.id)) return false;
  const shots = state.boards[other(player)].shots;
  const fresh = (c: Cell) => inGrid(c) && shots[c.y][c.x] === 'none';
  switch (t.kind) {
    case 'rapid': {
      const unshot = shots.flat().filter((s) => s === 'none').length;
      if (t.cells.length < 1 || t.cells.length > 2 || !t.cells.every(fresh)) return false;
      if (t.cells.length === 2 && t.cells[0].x === t.cells[1].x && t.cells[0].y === t.cells[1].y) return false;
      return t.cells.length === 2 || unshot < 2; // 1 ô chỉ khi địch còn ít hơn 2 ô chưa bắn
    }
    case 'precision':
      return fresh(t.cell);
    case 'torpedo': {
      const max = t.axis === 'row' ? GRID.height : GRID.width;
      return Number.isInteger(t.index) && t.index >= 0 && t.index < max && (t.from === 'start' || t.from === 'end');
    }
    case 'cross':
      return inGrid(t.center);
    case 'line3':
      return inGrid(t.center) && (t.orientation === 'h' || t.orientation === 'v');
  }
}

/** Cuối lượt: tàu còn sống của bên vừa đi giảm hồi chiêu 1, trừ tàu vừa bắn. */
function tickCooldowns(board: Board, except?: ShipId) {
  for (const s of board.ships) if (!s.sunk && s.id !== except) s.cooldown = Math.max(0, s.cooldown - 1);
}

function nextTurn(state: MatchState, boards: [Board, Board], revealed: [ShipId[], ShipId[]], player: PlayerId, events: GameEvent[]): MatchState {
  const turn = other(player);
  events.push({ type: 'TurnChanged', player: turn });
  return { ...state, boards, revealed, turn, turnNumber: state.turnNumber + 1 };
}

/** RNG theo (seed, lượt, mục đích): không cần lưu trạng thái RNG, cùng seed cho cùng kết quả. */
const rngFor = (state: MatchState, salt: number) => mulberry32(Math.imul(state.seed >>> 0 ^ 0x9e3779b9, 31) + state.turnNumber * 16 + salt);

/** Đánh dấu tàu chìm sau một đòn: lộ loại, phát `ShipSunk`. */
function markSunk(def: Board, owner: PlayerId, revealed: ShipId[], events: GameEvent[]) {
  for (const ship of def.ships) {
    if (ship.sunk || !ship.hits.every(Boolean)) continue;
    ship.sunk = true;
    if (!revealed.includes(ship.id)) revealed.push(ship.id);
    events.push({ type: 'ShipSunk', owner, shipId: ship.id, cells: shipCells(ship) });
  }
}

/** Tàu cắn lén của `owner` bắn 1 ô ngẫu nhiên chưa có kết quả (rules.md 10.1). Sửa trực tiếp boards. */
function sneakShot(state: MatchState, boards: [Board, Board], revealed: [ShipId[], ShipId[]], owner: PlayerId, salt: number, events: GameEvent[]) {
  const def = boards[other(owner)];
  const free: Cell[] = [];
  for (let y = 0; y < GRID.height; y++) for (let x = 0; x < GRID.width; x++) if (def.shots[y][x] === 'none') free.push({ x, y });
  events.push({ type: 'PassiveTriggered', owner, shipId: 'raider', kind: 'sneak' });
  if (!free.length) return;
  const cell = free[randInt(rngFor(state, salt), free.length)];
  events.push({ type: 'ShotFired', player: owner, shipId: 'raider', attack: 'sneak', cells: [cell], source: 'passive' });
  const result = resolveCell(def, cell)!;
  events.push({ type: 'CellResolved', player: owner, cell, result }); // không lộ loại tàu khi trúng
  markSunk(def, other(owner), revealed[other(owner)], events);
}

const raiderOf = (b: Board) => b.ships.find((s) => s.id === 'raider' && !s.sunk);

function finish(state: CoreState, boards: [Board, Board], revealed: [ShipId[], ShipId[]], owner: PlayerId, events: GameEvent[]): Result {
  if (boards[other(owner)].ships.every((s) => s.sunk)) {
    events.push({ type: 'MatchEnded', winner: owner });
    return { state: { ...state, boards, revealed, winner: owner }, events };
  }
  return { state: { ...state, boards, revealed }, events };
}

/** Đầu trận: tàu cắn lén của bên đi trước rồi bên đi sau. */
export function runPassivesAtMatchStart(state: MatchState): Result {
  const boards: [Board, Board] = [cloneBoard(state.boards[0]), cloneBoard(state.boards[1])];
  const revealed: [ShipId[], ShipId[]] = [[...state.revealed[0]], [...state.revealed[1]]];
  const events: GameEvent[] = [];
  let cur: CoreState = state;
  for (const [i, p] of ([state.turn, other(state.turn)] as PlayerId[]).entries()) {
    const r = raiderOf(boards[p]);
    if (!r || cur.winner !== null) continue;
    sneakShot(state, boards, revealed, p, 100 + i, events);
    r.rest = SPECS.raider.passive!.period - 1;
    cur = finish(cur, boards, revealed, p, events).state;
  }
  return { state: cur, events };
}

/** Đầu lượt của `player`: tàu cắn lén theo bộ đếm. Gọi nhiều lần trong cùng lượt chỉ chạy một lần. */
export function runPassivesAtTurnStart(state: MatchState, player: PlayerId): Result {
  const st = state as CoreState;
  if (st.winner !== null || st.passiveTurn === st.turnNumber) return { state, events: [] };
  const boards: [Board, Board] = [cloneBoard(state.boards[0]), cloneBoard(state.boards[1])];
  const revealed: [ShipId[], ShipId[]] = [[...state.revealed[0]], [...state.revealed[1]]];
  const events: GameEvent[] = [];
  const marked: CoreState = { ...st, passiveTurn: st.turnNumber };
  const r = raiderOf(boards[player]);
  if (!r) return { state: marked, events };
  if (r.rest > 0) { r.rest -= 1; return { state: { ...marked, boards }, events }; }
  sneakShot(state, boards, revealed, player, 200, events);
  r.rest = SPECS.raider.passive!.period - 1;
  return finish(marked, boards, revealed, player, events);
}

export function applyAction(state: MatchState, player: PlayerId, action: FireAction): Result {
  const pre = runPassivesAtTurnStart(state, player);
  if (pre.state.winner !== null) return pre;
  state = pre.state;
  if (!isValidAction(state, player, action)) throw new Error('Hành động không hợp lệ');
  const defender = other(player);
  const boards: [Board, Board] = [cloneBoard(state.boards[0]), cloneBoard(state.boards[1])];
  const revealed: [ShipId[], ShipId[]] = [[...state.revealed[0]], [...state.revealed[1]]];
  const def = boards[defender];
  const events: GameEvent[] = [...pre.events];

  const path = attackPath(def, action.target);
  events.push({ type: 'ShotFired', player, shipId: action.shipId, attack: action.target.kind, cells: path, source: 'action' });

  // Hộ vệ (rules.md 10.2): bộ đếm rest; kích hoạt thì triệt tiêu ceil(0.3 × N) ô ngẫu nhiên trong vùng đòn.
  const nullified = new Set<string>();
  const guard = def.ships.find((s) => s.id === 'escort' && !s.sunk && !damagedOn(state, s));
  if (guard) {
    if (guard.rest > 0) guard.rest -= 1;
    else {
      guard.rest = SPECS.escort.passive!.period - 1;
      const g = SPECS.escort.passive!;
      const k = Math.min(path.length, Math.ceil(g.ratio! * path.length - 1e-9));
      const pool = [...path], gone: Cell[] = [], rng = rngFor(state, 300);
      for (let i = 0; i < k; i++) gone.push(pool.splice(randInt(rng, pool.length), 1)[0]);
      gone.forEach((c) => nullified.add(`${c.x},${c.y}`));
      events.push({ type: 'PassiveTriggered', owner: defender, shipId: 'escort', kind: 'guard' });
      events.push({ type: 'ShotNullified', owner: defender, shipId: 'escort', cells: gone });
    }
  }

  const { results } = resolveAttack(def, action.target, nullified);
  // Không gắn shipId vào CellResolved: người bắn không được biết loại tàu trừ khi tuần dương trúng hoặc tàu chìm.
  for (const r of results) events.push({ type: 'CellResolved', player, cell: r.cell, result: r.result });

  if (action.target.kind === 'precision' && SPECS[action.shipId].attack === 'precision' && !damagedOn(state, boards[player].ships.find((x) => x.id === action.shipId)!) && results[0]?.result === 'hit') {
    const ship = segmentAt(def, results[0].cell)!.ship;
    if (!revealed[defender].includes(ship.id)) revealed[defender].push(ship.id);
    events.push({ type: 'ShipRevealed', owner: defender, shipId: ship.id });
  }
  markSunk(def, defender, revealed[defender], events);

  const me = boards[player].ships.find((s) => s.id === action.shipId)!;
  tickCooldowns(boards[player], action.shipId);
  me.cooldown = SPECS[me.id].cooldown;

  if (def.ships.every((s) => s.sunk)) {
    events.push({ type: 'MatchEnded', winner: player });
    return { state: { ...state, boards, revealed, winner: player }, events };
  }
  return { state: nextTurn(state, boards, revealed, player, events), events };
}

/** Dùng khi `readyShips` rỗng. Vẫn chạy tàu cắn lén đầu lượt và bước kết lượt. */
export function skipTurn(state: MatchState, player: PlayerId): Result {
  if (state.winner !== null || state.turn !== player || readyShips(state, player).length > 0) {
    throw new Error('Không được bỏ lượt');
  }
  const pre = runPassivesAtTurnStart(state, player);
  if (pre.state.winner !== null) return pre;
  state = pre.state;
  const boards: [Board, Board] = [cloneBoard(state.boards[0]), cloneBoard(state.boards[1])];
  tickCooldowns(boards[player]);
  const events: GameEvent[] = [...pre.events, { type: 'TurnSkipped', player }];
  return { state: nextTurn(state, boards, state.revealed, player, events), events };
}

/** Loại tàu địch đã chìm (thông tin công khai: tàu chìm thì lộ loại). */
export function sunkShips(state: MatchState, viewer: PlayerId): ShipId[] {
  return state.boards[other(viewer)].ships.filter((s) => s.sunk).map((s) => s.id);
}

/** Góc nhìn của người bắn lên lưới địch, không lộ ô tàu chưa trúng. */
export function viewOfEnemy(state: MatchState, viewer: PlayerId): { cells: CellView[][]; marks: CellMark[][]; revealed: ShipId[] } {
  const enemy = state.boards[other(viewer)];
  const cells: CellView[][] = enemy.shots.map((row) => row.map((s): CellView => (s === 'none' ? 'unknown' : s)));
  for (const ship of enemy.ships) if (ship.sunk) for (const c of shipCells(ship)) cells[c.y][c.x] = 'sunk';
  const marks: CellMark[][] = enemy.shots.map((row, y) => row.map((s, x) => (s === 'none' && isBlocked(enemy, { x, y }) ? 'blocked' : null)));
  return { cells, marks, revealed: [...state.revealed[other(viewer)]] };
}
