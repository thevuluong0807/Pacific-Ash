import type { AiLevel, Cell, CellMark, CellView, ShipAttack, ShipId, GameEvent, MatchState, PlacedShip, Player, PlayerId } from '../../design/core-api';
import type { ShipPose } from '../render3d/shipModels';
import type { OnlineClient } from '../net/client';
import type { ResumeSnapshot, Update } from '../net/protocol';
import { ProfileStore } from './profiles';
import { loadSettings, saveSettings, type Settings } from './settings';

export type ScreenId = 'menu' | 'online' | 'modeSelect' | 'hangar' | 'placement' | 'passDevice' | 'battle' | 'result';

export interface ScreenParams {
  menu: undefined;
  online: undefined;
  modeSelect: undefined;
  hangar: undefined;
  placement: { player: PlayerId };
  passDevice: { to: PlayerId; next: 'placement' | 'battle' };
  battle: undefined;
  result: undefined;
}

export interface ScreenInstance {
  dispose(): void;
  key?(e: KeyboardEvent): void;
}
export type ScreenFactory<K extends ScreenId> = (app: App, root: HTMLElement, params: ScreenParams[K]) => ScreenInstance;

/** Cảnh 3D trận đấu (render3d/battleScene). UI chỉ cần biết các hàm này; không có khi chạy `?no3d`. */
export interface BattleView3D {
  setFleets(own: ShipPose[], enemySunk: ShipPose[]): void;
  setMode(mode: 'placement' | 'battle' | 'result'): void;
  /** Xem trận 3D: quỹ đạo 360°, ô nhắm, đường đạn; `input` nhận chạm ô địch và rê chuột. */
  setView(view: '2d' | '3d', input?: { onCell(c: { x: number; y: number }): void; onHover(c: { x: number; y: number } | null): void }): void;
  setOverlay(own: CellView[][], enemy: CellView[][], marks: CellMark[][]): void;
  setAim(a: { shipId: ShipId | null; attack: ShipAttack | null; cells: Cell[]; valid: boolean }): void;
  resetOrbit(): void;
  /** Dời tâm xem 3D sang giữa trận / lưới địch / lưới mình. */
  setFocus(f: 'center' | 'enemy' | 'own'): void;
  /** Lửa kéo dài ở các ô đã trúng (ô của mình / ô địch). */
  syncHits(own: { x: number; y: number; ship?: ShipId }[], enemy: { x: number; y: number }[]): void;
  /** Tàu chìm khi tắt cinematic: hoạt cảnh chìm rút gọn ở nền. */
  sinkOnly(e: GameEvent, opts: { viewer: PlayerId; speed: number; short: boolean; shake: boolean; reduced: boolean; onEvent(e: GameEvent): void }): void;
  /** Phát cinematic cho các event của một hành động; gọi `onEvent` đúng mốc (chạm ô -> CellResolved...). */
  play(events: GameEvent[], opts: { viewer: PlayerId; speed: number; short: boolean; shake: boolean; reduced: boolean; bars?: boolean; sinkBg?: boolean; onEvent(e: GameEvent): void }): Promise<void>;
  skip(): void;
  endShot(): Promise<void>;
  /** Màn kết quả: thắng/thua đổi độ sáng cảnh (map truong_sa); null = bình thường. */
  setOutcome(win: boolean | null): void;
}

export type Mode = 'pve' | 'hotseat' | 'online';

/** Thông tin phiên online: kết nối, chỗ ngồi, bản cập nhật khởi đầu của server. */
export interface OnlineSession { net: OnlineClient; me: PlayerId; code: string; equipDamage: boolean; turnLimit: number; resumed?: ResumeSnapshot; start?: { first: PlayerId; seed: number; foeCount: number; update: Update } }
export interface Tally { hit: number; miss: number }

/** Phiên chơi hiện tại, sống qua các màn hình. */
export interface Session {
  mode: Mode;
  difficulty: AiLevel;
  seed: number;
  placements: [PlacedShip[] | null, PlacedShip[] | null];
  match: MatchState | null;
  ai: Player | null; // đối thủ máy (PvE), luôn là người chơi 1
  stats: [Tally, Tally];
  /** Đã chạy cắn lén đầu trận chưa (chỉ một lần mỗi ván). */
  started: boolean;
  /** Hỏng hóc khí tài: tàu bị trúng quá 50% ô mất kỹ năng đặc biệt. */
  equipDamage: boolean;
  /** Giây mỗi lượt, 0 = không giới hạn. */
  turnLimit: number;
  online?: OnlineSession;
}

export const newSession = (mode: Mode, difficulty: AiLevel, equipDamage = false, turnLimit = 0): Session => ({
  mode, difficulty, seed: (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0,
  placements: [null, null], match: null, ai: null, stats: [{ hit: 0, miss: 0 }, { hit: 0, miss: 0 }], started: false, equipDamage, turnLimit,
});

/** State machine màn hình: enum + hàm chuyển (screens.md mục 1). */
export class App {
  settings: Settings = loadSettings();
  readonly profiles = new ProfileStore();
  battleScene?: BattleView3D;
  /** Gắn bởi main.ts để đổi cảnh 3D theo màn hình và áp dụng chất lượng đồ họa. */
  onScreen?: (id: ScreenId) => void;
  onSettings?: (s: Settings) => void;
  session: Session = newSession('pve', 'medium');
  /** Mã phòng từ link mời (`?room=`): sảnh online tự vào khi mở. */
  pendingRoom?: string;
  /** Thông tin nối lại lưu từ lần trước (mở lại trang giữa trận online). */
  pendingResume?: { server: string; code: string; token: string; graceMs: number };
  private current?: ScreenInstance;
  private screens: { [K in ScreenId]?: ScreenFactory<K> } = {};

  constructor(readonly root: HTMLElement) {
    addEventListener('keydown', (e) => this.current?.key?.(e));
  }

  register<K extends ScreenId>(id: K, factory: ScreenFactory<K>) {
    (this.screens as Record<string, unknown>)[id] = factory;
  }

  go<K extends ScreenId>(id: K, ...params: ScreenParams[K] extends undefined ? [] : [ScreenParams[K]]) {
    this.current?.dispose();
    this.root.replaceChildren();
    this.onScreen?.(id);
    const el = document.createElement('div');
    el.className = `screen screen--${id}`;
    this.root.appendChild(el);
    const factory = this.screens[id] as ScreenFactory<K> | undefined;
    if (!factory) throw new Error(`Chưa đăng ký màn hình ${id}`);
    this.current = factory(this, el, params[0] as ScreenParams[K]);
  }

  updateSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
    this.onSettings?.(this.settings);
  }
}
