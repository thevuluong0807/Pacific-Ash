// Hợp đồng kiểu cho src/core. Chỉ chữ ký, không cài đặt.
// Không đổi tên/kiểu khi chưa hỏi người thiết kế. Luật chi tiết: design/rules.md.

export type ShipId = 'destroyer' | 'cruiser' | 'submarine' | 'missile' | 'carrier' | 'raider' | 'escort'
export type AttackKind = 'rapid' | 'precision' | 'torpedo' | 'cross' | 'line3'
export type ShipAttack = AttackKind | 'none'            // 'none' = tàu chỉ có kỹ năng nội tại
export type ShipShape = 'line' | 'square'               // square = khối size×size, không xoay
export type PassiveKind = 'sneak' | 'guard'
export type PlayerId = 0 | 1
export type Orientation = 'h' | 'v'

export interface Cell { x: number; y: number }          // 0..9, gốc ở trên-trái

export interface ShipSpec {                              // đọc từ design/ships.json
  id: ShipId
  nameVi: string
  size: number
  cooldown: number
  shape: ShipShape            // mặc định 'line'
  attack: ShipAttack
  attackNameVi: string
  descVi: string
  passive?: PassiveSpec       // chỉ raider, escort
  anim: AttackKind | 'sneak' | 'guard'
  model: string
  placeholderColor: string
}

export interface PassiveSpec {
  kind: PassiveKind
  period: number              // 2 = kích hoạt, nghỉ 1, kích hoạt lại
  atMatchStart?: boolean      // sneak: bắn một phát đầu trận
  shots?: number              // sneak
  ratio?: number              // guard: 0.3
  round?: 'ceil'              // guard
}

export interface PlacedShip {
  id: ShipId
  origin: Cell                // ô đầu (trái nhất hoặc trên nhất; với square: góc trên-trái)
  orientation: Orientation    // square luôn 'h'
  hits: boolean[]             // line: độ dài = size, từ origin; square: size² ô theo thứ tự (0,0)(1,0)(0,1)(1,1) quanh origin
  cooldown: number            // lượt nghỉ còn lại, 0 = sẵn sàng
  rest: number                // bộ đếm nghỉ của kỹ năng nội tại (rules.md mục 10), 0 với tàu thường
  sunk: boolean
}

export type CellView = 'unknown' | 'miss' | 'hit' | 'sunk'   // góc nhìn người bắn
// Cờ phụ trên lưới địch: ô từng bị hộ vệ triệt tiêu, chưa bắn lại (rules.md mục 10.2)
export type CellMark = 'blocked' | null

export interface Board {
  ships: PlacedShip[]
  shots: ('none' | 'miss' | 'hit')[][]   // shots[y][x], trạng thái thật do bên bị bắn nắm
}

export interface MatchState {
  boards: [Board, Board]                 // boards[p] = lưới của người chơi p
  turn: PlayerId
  turnNumber: number                     // đếm lượt toàn trận, bắt đầu 1
  revealed: [ShipId[], ShipId[]]         // revealed[p] = tàu của p mà đối thủ đã biết loại
  winner: PlayerId | null
  seed: number
}

// ---- Hành động ----
export type FireTarget =
  | { kind: 'rapid'; cells: [Cell] | [Cell, Cell] }
  | { kind: 'precision'; cell: Cell }
  | { kind: 'torpedo'; axis: 'row' | 'col'; index: number; from: 'start' | 'end' }
  | { kind: 'cross'; center: Cell }
  | { kind: 'line3'; center: Cell; orientation: Orientation }

export interface FireAction { shipId: ShipId; target: FireTarget }

// ---- Event (JSON thuần, thứ tự đúng như rules.md mục 7) ----
export type GameEvent =
  | { type: 'ShotFired'; player: PlayerId; shipId: ShipId; attack: AttackKind | 'sneak'; cells: Cell[]; source: 'action' | 'passive' }
  | { type: 'PassiveTriggered'; owner: PlayerId; shipId: ShipId; kind: PassiveKind }
  | { type: 'ShotNullified'; owner: PlayerId; shipId: ShipId; cells: Cell[] }   // owner = bên có hộ vệ; cells = ô bị triệt tiêu
  | { type: 'CellResolved'; player: PlayerId; cell: Cell; result: 'miss' | 'hit'; shipId?: ShipId }
  | { type: 'ShipRevealed'; owner: PlayerId; shipId: ShipId }
  | { type: 'ShipSunk'; owner: PlayerId; shipId: ShipId; cells: Cell[] }
  | { type: 'TurnSkipped'; player: PlayerId }
  | { type: 'MatchEnded'; winner: PlayerId }
  | { type: 'TurnChanged'; player: PlayerId }

// ---- Hàm lõi (thuần) ----
export declare function loadSpecs(): Record<ShipId, ShipSpec>
export declare function randomPlacement(seed: number, fleet?: ShipId[]): PlacedShip[]   // fleet mặc định = ships.json `fleet`
export declare function isValidPlacement(ships: PlacedShip[]): boolean
export declare function newMatch(p0: PlacedShip[], p1: PlacedShip[], seed: number, first?: PlayerId): MatchState

// Ô sẽ bị đánh (chưa phân giải), theo thứ tự. Dùng cho xem trước vùng nhắm ở UI.
export declare function previewCells(state: MatchState, player: PlayerId, action: FireAction): Cell[]

export declare function isValidAction(state: MatchState, player: PlayerId, action: FireAction): boolean
export declare function readyShips(state: MatchState, player: PlayerId): ShipId[]

// Trả trạng thái mới và event. Không đổi state cũ. Ném lỗi nếu hành động không hợp lệ.
export declare function applyAction(state: MatchState, player: PlayerId, action: FireAction): { state: MatchState; events: GameEvent[] }
// Dùng khi readyShips rỗng.
export declare function skipTurn(state: MatchState, player: PlayerId): { state: MatchState; events: GameEvent[] }

// Góc nhìn của người bắn lên lưới địch, không lộ ô tàu chưa trúng.
export declare function viewOfEnemy(state: MatchState, viewer: PlayerId): { cells: CellView[][]; marks: CellMark[][]; revealed: ShipId[] }

// Chạy các kỹ năng nội tại ở đầu trận (tàu cắn lén của cả hai bên) và ở đầu lượt của một bên.
// Trả event; applyAction/skipTurn tự gọi hàm này nên UI thường không cần gọi riêng.
export declare function runPassivesAtMatchStart(state: MatchState): { state: MatchState; events: GameEvent[] }
export declare function runPassivesAtTurnStart(state: MatchState, player: PlayerId): { state: MatchState; events: GameEvent[] }

// ---- Người chơi ----
export interface Player {
  chooseAction(view: { state: MatchState; me: PlayerId }): Promise<FireAction>
}
export type AiLevel = 'easy' | 'medium' | 'hard'
export declare function createAi(level: AiLevel, seed: number): Player

// ---- RNG ----
export declare function mulberry32(seed: number): () => number   // hoặc tương đương, phải theo seed
