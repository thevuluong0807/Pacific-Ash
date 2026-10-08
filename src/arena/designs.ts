import { HULLS, PRESET_DESIGNS, normalizeDesign, type HullId, type ShipDesign } from './data';

/** Kho thiết kế tàu và cấu hình sảnh của chế độ Hải chiến (localStorage). */
export type TeamMode = 'ffa' | 't2' | 't3';
export type BotLevel = 'easy' | 'medium' | 'hard';
export interface LobbySlot { on: boolean; design: string; team: number }
export interface LobbyCfg { mine: string; mineTeam: number; mode: TeamMode; level: BotLevel; slots: LobbySlot[] }

const KEY = 'pacific-ash.arena.designs';
const LKEY = 'pacific-ash.arena.lobby';

interface Data { designs: ShipDesign[]; seq: number }

const seed = (): Data => ({ designs: PRESET_DESIGNS.map((d) => ({ ...d, slots: [...d.slots] })), seq: 1 });
function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Data;
      if (Array.isArray(d.designs) && d.designs.length) return { designs: d.designs.map(normalizeDesign), seq: d.seq || 1 };
    }
  } catch { /* localStorage có thể bị chặn */ }
  return seed();
}

export class DesignStore {
  private data = load();
  private save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* bỏ qua */ } }

  list(): ShipDesign[] { return this.data.designs; }
  get(id: string) { return this.data.designs.find((d) => d.id === id); }

  create(hull: HullId = 'medium'): ShipDesign {
    const dz: ShipDesign = { id: `d${Date.now().toString(36)}${this.data.seq++}`, name: `Tàu mới ${this.data.seq - 1}`, hull, slots: HULLS[hull].slots.map(() => null) };
    this.data.designs.push(dz);
    this.save();
    return dz;
  }
  duplicate(id: string): ShipDesign | undefined {
    const src = this.get(id);
    if (!src) return undefined;
    const dz: ShipDesign = { ...src, id: `d${Date.now().toString(36)}${this.data.seq++}`, name: `${src.name} (bản sao)`.slice(0, 24), slots: [...src.slots] };
    this.data.designs.push(dz);
    this.save();
    return dz;
  }
  /** Ghi đè thiết kế (chuẩn hoá trước khi lưu). */
  update(dz: ShipDesign) {
    const i = this.data.designs.findIndex((d) => d.id === dz.id);
    if (i >= 0) { this.data.designs[i] = normalizeDesign(dz); this.save(); }
  }
  remove(id: string) {
    if (this.data.designs.length <= 1) return;
    this.data.designs = this.data.designs.filter((d) => d.id !== id);
    this.save();
  }
}

const defaultLobby = (): LobbyCfg => ({
  mine: PRESET_DESIGNS[1].id, mineTeam: 0, mode: 'ffa', level: 'medium',
  slots: [
    { on: true, design: 'random', team: 1 }, { on: true, design: 'random', team: 0 }, { on: true, design: 'random', team: 1 },
    { on: false, design: 'random', team: 0 }, { on: false, design: 'random', team: 1 },
  ],
});

export function loadLobby(): LobbyCfg {
  try {
    const raw = localStorage.getItem(LKEY);
    if (raw) { const d = JSON.parse(raw) as LobbyCfg; if (Array.isArray(d.slots) && d.slots.length === 5) return { ...defaultLobby(), ...d }; }
  } catch { /* bỏ qua */ }
  return defaultLobby();
}
export function saveLobby(c: LobbyCfg) { try { localStorage.setItem(LKEY, JSON.stringify(c)); } catch { /* bỏ qua */ } }
