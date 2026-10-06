export type Quality = 'low' | 'medium' | 'high';
export type AnimSpeed = 'off' | 'x1' | 'x2';
export type MapId = 'truong_sa' | 'hai_phong';
export const MAP_IDS: readonly MapId[] = ['truong_sa', 'hai_phong'];
/** Đổi mặc định chỉ là một dòng (design/maps.md mục 1). */
export const DEFAULT_MAP: MapId = 'truong_sa';

export interface Settings {
  master: number; sfx: number; music: number; // 0..1
  quality: Quality;
  anim: AnimSpeed;
  shake: boolean;
  shortCinematic: boolean; // chỉ phát cảnh trúng đích (~1.2 s), dùng ở P4
  turnLimit: number;       // giây mỗi lượt, 0 = không giới hạn
  equipDamage: boolean;    // chế độ "hỏng hóc khí tài" (nhớ lựa chọn lần trước)
  battleView: '2d' | '3d'; // cách xem trận
  onlineServer: string;    // địa chỉ server online (ws://...); rỗng = mặc định
  map: MapId;              // phông cảnh chờ; lưu riêng ở khóa `pacific-ash.map`
}

const KEY = 'pacific-ash.settings';
const MAP_KEY = 'pacific-ash.map';
export const defaultSettings: Settings = { master: 0.8, sfx: 1, music: 0.6, quality: 'medium', anim: 'x1', shake: true, shortCinematic: false, turnLimit: 0, equipDamage: false, battleView: '2d', onlineServer: '', map: DEFAULT_MAP };

function loadMap(): MapId {
  try {
    const m = localStorage.getItem(MAP_KEY) as MapId | null;
    if (m && MAP_IDS.includes(m)) return m;
  } catch { /* localStorage có thể bị chặn */ }
  return DEFAULT_MAP;
}

export function loadSettings(): Settings {
  let s = { ...defaultSettings };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...s, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch { /* bỏ qua */ }
  return { ...s, map: loadMap() };
}

export function saveSettings(s: Settings) {
  try {
    const { map, ...rest } = s;
    localStorage.setItem(KEY, JSON.stringify(rest));
    localStorage.setItem(MAP_KEY, map);
  } catch { /* bỏ qua */ }
}
