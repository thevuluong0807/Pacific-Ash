import type { WebSocket } from 'ws';
import { HULLS, MAX_PLAYERS, PRESET_DESIGNS, normalizeDesign, type ShipDesign } from '../src/arena/data';
import { ArenaBot } from '../src/arena/bot';
import type { BotLevel, TeamMode } from '../src/arena/designs';
import { ArenaSim, NO_INPUT, type PlayerInput, type SimEvent, type SimPlayer } from '../src/arena/sim';
import { takeSnap } from '../src/arena/snap';
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode, type ArenaRoomInfo, type C2S, type S2C } from '../src/net/protocol';

/**
 * Hải chiến online (tối đa 6 chỗ): phòng custom mời bằng mã/link, hoặc phòng ghép trận công khai tự bắt đầu sau đếm ngược.
 * Server giữ mô phỏng `ArenaSim` (60 Hz, tất định), nhận phím của từng người, chạy bot cho chỗ máy, gửi bản chụp 20 Hz.
 * Rớt mạng giữa trận: chỗ đó chuyển sang máy chơi tiếp (chưa có nối lại).
 */
export interface ArenaConn { ws: WebSocket; arena?: { room: ArenaRoom; seat: number } }
type Send = (ws: WebSocket | null | undefined, m: S2C) => void;

interface Seat { bot: boolean; conn: ArenaConn | null; name: string; design: ShipDesign; team: number; in: PlayerInput; sel: number | null; exit: boolean }
export interface ArenaRoom {
  code: string; seats: (Seat | null)[]; host: number; mode: TeamMode; level: BotLevel; public: boolean;
  countdownAt: number | null; countdownTimer?: ReturnType<typeof setInterval>;
  sim?: ArenaSim; shipSeat: number[]; bots: (ArenaBot | null)[]; inputs: PlayerInput[]; events: SimEvent[];
  loop?: ReturnType<typeof setInterval>; tick: number; acc: number; last: number; endAt: number | null;
}

const STEP = 1 / 60;
export const COUNTDOWN_MS = { v: 15000 };
const rooms = new Map<string, ArenaRoom>();
let publicRoom: ArenaRoom | null = null;

const teamCount = (m: TeamMode) => (m === 'ffa' ? MAX_PLAYERS : m === 't2' ? 2 : 3);
const clean = (d: unknown): ShipDesign => {
  const r = d as Partial<ShipDesign> | null;
  if (!r || typeof r.hull !== 'string' || !(r.hull in HULLS) || !Array.isArray(r.slots)) return { ...PRESET_DESIGNS[1], slots: [...PRESET_DESIGNS[1].slots] };
  return normalizeDesign({ id: 'net', name: String(r.name ?? 'Tàu'), hull: r.hull, slots: r.slots as ShipDesign['slots'] });
};
const cleanName = (n: unknown, fb = 'Thủy thủ') => String(n ?? fb).replace(/[<>&"]/g, '').trim().slice(0, 16) || fb;
const newCode = () => { for (;;) { const c = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join(''); if (!rooms.has(c)) return c; } };
const humans = (r: ArenaRoom) => r.seats.filter((s) => s && !s.bot && s.conn).length;
const teamOf = (r: ArenaRoom, i: number) => (r.mode === 'ffa' ? i : (r.seats[i]?.team ?? 0) % teamCount(r.mode));

function infoFor(r: ArenaRoom, seat: number): ArenaRoomInfo {
  return {
    code: r.code, you: seat, host: r.host, mode: r.mode, level: r.level, public: r.public, playing: !!r.sim && !r.endAt,
    countdown: r.countdownAt ? Math.max(0, Math.ceil((r.countdownAt - Date.now()) / 1000)) : null,
    seats: r.seats.map((s, i) => (s ? { name: s.name, bot: s.bot, design: s.design, team: teamOf(r, i), connected: s.bot || !!s.conn } : null)),
  };
}

export function createArena(send: Send) {
  const lobbyCast = (r: ArenaRoom) => r.seats.forEach((s, i) => { if (s?.conn) send(s.conn.ws, { t: 'aRoom', room: infoFor(r, i) }); });
  const newSeat = (name: string, design: ShipDesign, team: number, bot: boolean, conn: ArenaConn | null): Seat => ({ bot, conn, name, design, team, in: { ...NO_INPUT }, sel: null, exit: false });

  function makeRoom(pub: boolean): ArenaRoom {
    const r: ArenaRoom = { code: newCode(), seats: Array(MAX_PLAYERS).fill(null), host: 0, mode: 'ffa', level: 'medium', public: pub, countdownAt: null, shipSeat: [], bots: [], inputs: [], events: [], tick: 0, acc: 0, last: 0, endAt: null };
    rooms.set(r.code, r);
    return r;
  }

  function sit(r: ArenaRoom, c: ArenaConn, name: string, design: ShipDesign): boolean {
    let i = r.seats.findIndex((s) => !s);
    if (i < 0) i = r.seats.findIndex((s) => s?.bot); // đầy: người mới chiếm chỗ của một máy
    if (i < 0) return false;
    r.seats[i] = newSeat(name, design, i % teamCount(r.mode), false, c);
    c.arena = { room: r, seat: i };
    if (humans(r) === 1) r.host = i;
    return true;
  }

  function closeRoom(r: ArenaRoom, notify = true) {
    clearInterval(r.loop); clearInterval(r.countdownTimer);
    if (notify) r.seats.forEach((s) => s?.conn && send(s.conn.ws, { t: 'aClosed' }));
    r.seats.forEach((s) => { if (s?.conn) s.conn.arena = undefined; });
    rooms.delete(r.code);
    if (publicRoom === r) publicRoom = null;
  }

  function armCountdown(r: ArenaRoom) {
    if (!r.public || r.sim) return;
    const n = humans(r);
    if (n >= MAX_PLAYERS) return void start(r);
    if (n >= 2 && !r.countdownAt) {
      r.countdownAt = Date.now() + COUNTDOWN_MS.v;
      r.countdownTimer = setInterval(() => { if (r.countdownAt && Date.now() >= r.countdownAt) start(r); else lobbyCast(r); }, Math.min(1000, COUNTDOWN_MS.v));
    } else if (n < 2 && r.countdownAt) { r.countdownAt = null; clearInterval(r.countdownTimer); }
  }

  function start(r: ArenaRoom): string | null {
    if (r.sim && !r.endAt) return 'Trận đang chạy.';
    clearInterval(r.countdownTimer); r.countdownAt = null;
    const occ = r.seats.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
    if (new Set(occ.map((i) => teamOf(r, i))).size < 2) return 'Cần ít nhất 2 đội khác nhau.';
    if (publicRoom === r) publicRoom = null;
    const seed = (Math.random() * 0x7fffffff) >>> 0;
    const players: SimPlayer[] = occ.map((i) => ({ name: r.seats[i]!.name, team: teamOf(r, i), design: r.seats[i]!.design, bot: r.seats[i]!.bot ? r.level : undefined }));
    r.sim = new ArenaSim(seed, players);
    r.shipSeat = occ;
    r.bots = occ.map((i, k) => (r.seats[i]!.bot ? new ArenaBot(k, r.level, seed) : null));
    r.inputs = occ.map(() => ({ ...NO_INPUT }));
    r.events = []; r.tick = 0; r.acc = 0; r.last = Date.now(); r.endAt = null;
    occ.forEach((i, k) => { const s = r.seats[i]!; if (s.conn) send(s.conn.ws, { t: 'aStart', seed, you: k, players }); });
    r.loop = setInterval(() => run(r), 8);
    return null;
  }

  function run(r: ArenaRoom) {
    const sim = r.sim!, now = Date.now();
    r.acc += Math.min(0.1, (now - r.last) / 1000); r.last = now;
    while (r.acc >= STEP) {
      r.acc -= STEP;
      sim.ships.forEach((s, k) => {
        const seat = r.seats[r.shipSeat[k]]!;
        if (!s.alive) { r.inputs[k] = { ...NO_INPUT }; return; }
        if (seat.bot) { if (r.tick % 3 === 0) r.inputs[k] = r.bots[k]!.think(sim, s, STEP * 3); return; }
        r.inputs[k] = { ...seat.in, select: seat.sel, exit: seat.exit };
        seat.sel = null; seat.exit = false;
      });
      sim.step(STEP, r.inputs);
      r.events.push(...sim.drain());
      r.tick++;
      if (r.tick % 3 === 0) { const snap = takeSnap(sim, r.events, r.inputs); r.events = []; r.seats.forEach((s) => s?.conn && send(s.conn.ws, { t: 'aSnap', s: snap })); }
    }
    if (sim.over && !r.endAt) r.endAt = now + 9000;
    if (r.endAt && now > r.endAt) {
      clearInterval(r.loop); r.sim = undefined; r.endAt = null;
      if (r.public) closeRoom(r);
      else { r.seats.forEach((s, i) => { if (s && s.bot === false && !s.conn) r.seats[i] = null; }); lobbyCast(r); }
    }
  }

  /** Người chơi rời (chủ động hoặc rớt mạng). */
  function leave(c: ArenaConn) {
    const a = c.arena;
    if (!a) return;
    c.arena = undefined;
    const r = a.room, seat = r.seats[a.seat];
    if (!seat) return;
    if (r.sim && !r.endAt) { // giữa trận: máy chơi tiếp
      seat.conn = null; seat.bot = true;
      const k = r.shipSeat.indexOf(a.seat);
      if (k >= 0) r.bots[k] = new ArenaBot(k, r.level, 1);
    } else r.seats[a.seat] = null;
    if (!humans(r)) return void closeRoom(r, false);
    if (a.seat === r.host) r.host = r.seats.findIndex((s) => s && !s.bot && s.conn);
    armCountdown(r);
    if (!r.sim || r.endAt) lobbyCast(r);
  }

  function handle(c: ArenaConn, m: C2S, err: (msg: string) => void): boolean {
    switch (m.t) {
      case 'aCreate': {
        leave(c);
        const r = makeRoom(false);
        sit(r, c, cleanName(m.name), clean(m.design));
        lobbyCast(r);
        return true;
      }
      case 'aJoin': {
        leave(c);
        const r = rooms.get(normalizeCode(String(m.code)));
        if (!r) { err('Không tìm thấy phòng. Kiểm tra lại mã.'); return true; }
        if (r.sim && !r.endAt) { err('Phòng đang trong trận.'); return true; }
        if (!sit(r, c, cleanName(m.name), clean(m.design))) { err('Phòng đã đủ 6 chỗ.'); return true; }
        lobbyCast(r);
        armCountdown(r);
        if (rooms.has(r.code)) lobbyCast(r);
        return true;
      }
      case 'aQuick': {
        leave(c);
        const r = publicRoom && !publicRoom.sim ? publicRoom : (publicRoom = makeRoom(true));
        if (!sit(r, c, cleanName(m.name), clean(m.design))) { err('Phòng ghép trận đã đủ người, thử lại.'); return true; }
        lobbyCast(r);
        armCountdown(r);
        if (rooms.has(r.code)) lobbyCast(r);
        return true;
      }
      case 'aSet': {
        const a = c.arena, seat = a && a.room.seats[a.seat];
        if (!a || !seat || (a.room.sim && !a.room.endAt)) return true;
        if (m.design) seat.design = clean(m.design);
        if (m.name !== undefined) seat.name = cleanName(m.name, seat.name);
        if (Number.isInteger(m.team)) seat.team = Math.max(0, Math.min(MAX_PLAYERS - 1, m.team!)) % teamCount(a.room.mode);
        lobbyCast(a.room);
        return true;
      }
      case 'aCfg': {
        const a = c.arena;
        if (!a || a.room.public || a.seat !== a.room.host || (a.room.sim && !a.room.endAt)) return true;
        const r = a.room;
        if (m.mode && ['ffa', 't2', 't3'].includes(m.mode)) { r.mode = m.mode; r.seats.forEach((s) => { if (s) s.team %= teamCount(r.mode); }); }
        if (m.level && ['easy', 'medium', 'hard'].includes(m.level)) r.level = m.level;
        if (m.bot && Number.isInteger(m.bot.seat) && m.bot.seat >= 0 && m.bot.seat < MAX_PLAYERS) {
          const i = m.bot.seat, cur = r.seats[i];
          if (m.bot.on && !cur) r.seats[i] = newSeat(`Máy ${i + 1}`, m.bot.design ? clean(m.bot.design) : normalizeDesign({ ...PRESET_DESIGNS[i % 3], id: 'bot' }), Number.isInteger(m.bot.team) ? m.bot.team! % teamCount(r.mode) : i % teamCount(r.mode), true, null);
          else if (m.bot.on && cur?.bot) { if (m.bot.design) cur.design = clean(m.bot.design); if (Number.isInteger(m.bot.team)) cur.team = m.bot.team! % teamCount(r.mode); }
          else if (!m.bot.on && cur?.bot) r.seats[i] = null;
        }
        lobbyCast(r);
        return true;
      }
      case 'aStart': {
        const a = c.arena;
        if (!a || a.room.public || a.seat !== a.room.host) return true;
        const e = start(a.room);
        if (e) err(e);
        return true;
      }
      case 'aInput': {
        const a = c.arena, r = a?.room, seat = r && r.seats[a!.seat];
        if (!seat || !r?.sim || r.endAt) return true;
        const i = m.i ?? NO_INPUT, num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 10 ? v : null);
        seat.in = { up: !!i.up, down: !!i.down, left: !!i.left, right: !!i.right, fire: !!i.fire, select: null, exit: false, aim: num(i.aim?.beta) !== null && num(i.aim?.el) !== null ? { beta: i.aim!.beta, el: i.aim!.el } : undefined };
        if (Number.isInteger(i.select) && i.select! >= 0 && i.select! < 8) seat.sel = i.select;
        if (i.exit) seat.exit = true;
        return true;
      }
      case 'aLeave': leave(c); return true;
      default: return false;
    }
  }

  return { handle, leave, closeAll() { for (const r of [...rooms.values()]) closeRoom(r, false); } };
}
