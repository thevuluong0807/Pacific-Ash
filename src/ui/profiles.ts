import type { ShipId } from '../../design/core-api';
import { FLEET, MAX_FLEET, ROSTER } from '../core';

/** Profile = bộ tàu mang vào trận (1..MAX_FLEET tàu khác loại), có tên và có thể gắn yêu thích. */
export interface Profile { id: string; name: string; ships: ShipId[]; favorite: boolean }
export type RosterView = 'all' | 'profile';

interface Data {
  profiles: Profile[];
  favoriteShips: ShipId[];
  view: RosterView;
  lastBring: ShipId[] | null;
  seq: number;
}

const KEY = 'pacific-ash.profiles';
const byFleet = (ships: ShipId[]) => ROSTER.filter((id) => ships.includes(id));
const seed = (): Data => ({
  profiles: [{ id: 'p1', name: 'Hạm đội chuẩn', ships: [...FLEET], favorite: false }],
  favoriteShips: [], view: 'all', lastBring: null, seq: 2,
});

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Data;
      if (Array.isArray(d.profiles) && Array.isArray(d.favoriteShips)) return { ...seed(), ...d };
    }
  } catch { /* localStorage có thể bị chặn */ }
  return seed();
}

export class ProfileStore {
  private data = load();

  private save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* bỏ qua */ }
  }

  /** Yêu thích lên đầu, còn lại giữ thứ tự tạo. */
  profiles(): Profile[] {
    return [...this.data.profiles].sort((a, b) => Number(b.favorite) - Number(a.favorite));
  }
  get(id: string) { return this.data.profiles.find((p) => p.id === id); }

  create(): Profile {
    const p: Profile = { id: `p${this.data.seq}`, name: `Profile ${this.data.seq}`, ships: [], favorite: false };
    this.data.seq++;
    this.data.profiles.push(p);
    this.save();
    return p;
  }
  rename(id: string, name: string) {
    const p = this.get(id), n = name.trim().slice(0, 30);
    if (p && n) { p.name = n; this.save(); }
  }
  remove(id: string) {
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);
    this.save();
  }
  toggleFavorite(id: string) {
    const p = this.get(id);
    if (p) { p.favorite = !p.favorite; this.save(); }
  }
  /** Thêm/bỏ tàu khỏi profile. Trả false nếu thêm quá MAX_FLEET. */
  toggleShip(id: string, ship: ShipId): boolean {
    const p = this.get(id);
    if (!p) return false;
    if (p.ships.includes(ship)) p.ships = p.ships.filter((s) => s !== ship);
    else if (p.ships.length >= MAX_FLEET) return false;
    else p.ships = byFleet([...p.ships, ship]);
    this.save();
    return true;
  }

  isFavShip(ship: ShipId) { return this.data.favoriteShips.includes(ship); }
  toggleFavShip(ship: ShipId) {
    const f = this.data.favoriteShips;
    this.data.favoriteShips = f.includes(ship) ? f.filter((s) => s !== ship) : [...f, ship];
    this.save();
  }
  /** Tàu yêu thích lên đầu, còn lại theo thứ tự hạm đội. */
  sortShips(ships: readonly ShipId[]): ShipId[] {
    const fav = (s: ShipId) => Number(this.isFavShip(s));
    return byFleet([...ships]).sort((a, b) => fav(b) - fav(a));
  }

  get view(): RosterView { return this.data.view; }
  setView(v: RosterView) { this.data.view = v; this.save(); }

  setLastBring(ships: ShipId[]) { this.data.lastBring = byFleet(ships); this.save(); }
  /** Bộ tàu mặc định khi vào đặt tàu: lần trước → profile yêu thích đầu tiên → profile đầu tiên có tàu → cả hạm đội. */
  defaultBring(): ShipId[] {
    const last = this.data.lastBring;
    if (last && last.length) return last;
    const p = this.profiles().find((x) => x.ships.length > 0);
    return p ? [...p.ships] : [...FLEET];
  }
}
