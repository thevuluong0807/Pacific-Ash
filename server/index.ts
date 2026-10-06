import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import type { FireAction, MatchState, PlacedShip, PlayerId } from '../design/core-api';
import { applyAction, createAi, isValidAction, newMatch, readyShips, runPassivesAtMatchStart, runPassivesAtTurnStart, skipTurn } from '../src/core';
import { freshShip, isBlocked, isValidPlacement } from '../src/core/board';
import { loadSpecs } from '../src/core/specs';
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode, type C2S, type ResumeSnapshot, type S2C, type Update } from '../src/net/protocol';

/**
 * Server online: tạo phòng bằng mã, vào bằng mã/link, ghép ngẫu nhiên. Server giữ trạng thái trận bằng `core/`,
 * kiểm mọi hành động, chỉ gửi cho mỗi bên lưới của chính họ và các event công khai (không lộ tàu địch).
 * Chạy: `npm run server` (mặc định cổng 8787, phục vụ luôn thư mục `dist/` nếu đã build).
 */
const PORT = Number(process.env.PORT ?? 8787);
const SPECS = loadSpecs();

interface Room {
  code: string;
  equipDamage: boolean;
  turnLimit: number;                       // giây mỗi lượt, 0 = không giới hạn
  players: (WebSocket | null)[];          // chỉ số = PlayerId; null = chưa vào hoặc đang rớt mạng
  tokens: [string, string];                // mã nối lại của từng chỗ ngồi
  placements: (PlacedShip[] | null)[];
  state: MatchState | null;
  first: PlayerId;
  seed: number;
  deadline: number | null;                 // mốc hết giờ của lượt hiện tại (epoch ms)
  timer?: ReturnType<typeof setTimeout>;
  drop: (ReturnType<typeof setTimeout> | null)[]; // hạn nối lại của từng chỗ ngồi
  matched: boolean;                        // đã đủ hai người (qua giai đoạn chờ ở sảnh)
}
interface Conn { ws: WebSocket; room?: Room; me?: PlayerId; alive: boolean; turnLimitQ?: number }

const rooms = new Map<string, Room>();
const conns = new Map<WebSocket, Conn>();
const queues = new Map<number, Conn>(); // ghép ngẫu nhiên: mỗi mức giới hạn thời gian một người đang chờ
const LIMITS = [0, 15, 30, 60, 90, 120];
const cleanLimit = (n: unknown) => (LIMITS.includes(Number(n)) ? Number(n) : 0);
/** Thời gian chờ nối lại: bằng giới hạn mỗi lượt (tối thiểu 30 s); không giới hạn thì 90 s. */
let UNIT = 1000; // ms mỗi "giây" của giới hạn thời gian (kiểm thử đặt nhỏ lại)
const graceMs = (room: Room) => (room.turnLimit > 0 ? Math.max(room.turnLimit, 30) * UNIT : 90 * UNIT);
const rand = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

const send = (ws: WebSocket | null | undefined, m: S2C) => { if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(m)); };
const err = (ws: WebSocket, msg: string) => send(ws, { t: 'error', msg });

function newCode(): string {
  for (;;) {
    const c = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    if (!rooms.has(c)) return c;
  }
}

function makeRoom(equipDamage: boolean, turnLimit: number): Room {
  const room: Room = { code: newCode(), equipDamage, turnLimit, players: [null, null], tokens: [rand(), rand()], placements: [null, null], state: null,
    first: Math.random() < 0.5 ? 0 : 1, seed: (Math.random() * 0x7fffffff) >>> 0, deadline: null, drop: [null, null], matched: false };
  rooms.set(room.code, room);
  return room;
}

function seat(room: Room, c: Conn): PlayerId {
  const me: PlayerId = room.players[0] ? 1 : 0;
  room.players[me] = c.ws; c.room = room; c.me = me;
  return me;
}

function startPlacing(room: Room) {
  room.matched = true;
  room.players.forEach((ws, i) => send(ws, { t: 'matched', code: room.code, you: i as PlayerId, equipDamage: room.equipDamage, turnLimit: room.turnLimit, token: room.tokens[i], graceMs: graceMs(room) }));
}

/** Xóa phòng và dọn mọi hẹn giờ. */
function closeRoom(room: Room) {
  clearTimeout(room.timer);
  room.drop.forEach((t) => t && clearTimeout(t));
  rooms.delete(room.code);
  room.players.forEach((ws) => { const c = ws && conns.get(ws); if (c) c.room = undefined; });
}

/** Người chơi thoát hẳn (hoặc quá hạn nối lại): bên còn lại thắng, phòng đóng. */
function forfeit(room: Room, loser: PlayerId) {
  send(room.players[loser === 0 ? 1 : 0], { t: 'opponentLeft' });
  closeRoom(room);
}

function leave(c: Conn) {
  for (const [k, q] of queues) if (q === c) queues.delete(k);
  const room = c.room;
  if (!room || c.me === undefined) return;
  c.room = undefined;
  room.players[c.me] = null;
  forfeit(room, c.me);
}

/** Mất kết nối ngoài ý muốn: giữ chỗ trong thời gian nối lại thay vì xử thua ngay. */
function dropped(c: Conn) {
  for (const [k, q] of queues) if (q === c) queues.delete(k);
  const room = c.room;
  if (!room || c.me === undefined || room.players[c.me] !== c.ws) return;
  c.room = undefined;
  const me = c.me, foe: PlayerId = me === 0 ? 1 : 0;
  room.players[me] = null;
  if (!room.matched) return void closeRoom(room); // còn ở sảnh chờ: hủy phòng
  send(room.players[foe], { t: 'opponentDropped', graceMs: graceMs(room) });
  room.drop[me] = setTimeout(() => forfeit(room, me), graceMs(room));
}

/** Sanitize cách xếp tàu từ client: dựng lại từ id/gốc/hướng, bỏ mọi trường khác. */
function cleanPlacement(raw: unknown): PlacedShip[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 5) return null;
  const ships: PlacedShip[] = [];
  for (const r of raw) {
    const s = r as Partial<PlacedShip>;
    if (!s || typeof s.id !== 'string' || !(s.id in SPECS) || !s.origin || !Number.isInteger(s.origin.x) || !Number.isInteger(s.origin.y)) return null;
    ships.push(freshShip(s.id, { x: s.origin.x, y: s.origin.y }, s.orientation === 'v' ? 'v' : 'h'));
  }
  if (!isValidPlacement(ships)) return null;
  if (!ships.some((s) => SPECS[s.id].attack !== 'none')) return null; // cần ít nhất một tàu có đòn đánh
  return ships;
}

const updateFor = (room: Room, p: PlayerId, events: Update['events']): Update => {
  const st = room.state!;
  return { events, board: st.boards[p], revealed: st.revealed, turn: st.turn, turnNumber: st.turnNumber, winner: st.winner, remainMs: room.deadline ? Math.max(0, room.deadline - Date.now()) : null };
};

/** Chạy kỹ năng nội tại đầu lượt và tự bỏ lượt cho tới khi có người cần hành động hoặc hết trận. */
function advance(room: Room, events: Update['events']) {
  for (let guard = 0; guard < 300 && room.state!.winner === null; guard++) {
    const p = room.state!.turn;
    const pre = runPassivesAtTurnStart(room.state!, p);
    room.state = pre.state; events.push(...pre.events);
    if (room.state.winner !== null) return;
    if (readyShips(room.state, p).length > 0) return;
    const sk = skipTurn(room.state, p);
    room.state = sk.state; events.push(...sk.events);
  }
}

/** Hẹn giờ cho lượt hiện tại; hết giờ thì server tự bắn một phát hợp lệ thay người chơi. */
function armTimer(room: Room) {
  clearTimeout(room.timer);
  room.deadline = null;
  if (room.turnLimit <= 0 || !room.state || room.state.winner !== null) return;
  room.deadline = Date.now() + room.turnLimit * UNIT;
  room.timer = setTimeout(() => void autoMove(room), room.turnLimit * UNIT);
}

async function autoMove(room: Room) {
  const st = room.state;
  if (!st || st.winner !== null || !rooms.has(room.code)) return;
  const p = st.turn;
  const action = await createAi('easy', (Math.random() * 1e9) >>> 0).chooseAction({ state: st, me: p });
  if (room.state === st) perform(room, p, action);
}

/** Thực hiện một hành động đã được kiểm, rồi gửi cập nhật cho cả hai bên. */
function perform(room: Room, p: PlayerId, action: FireAction) {
  const r = applyAction(room.state!, p, action);
  room.state = r.state;
  const events = [...r.events];
  advance(room, events);
  armTimer(room);
  room.players.forEach((ws, i) => send(ws, { t: 'update', update: updateFor(room, i as PlayerId, events) }));
  if (room.state.winner !== null) closeRoom(room);
}

function maybeStart(room: Room) {
  if (!room.placements[0] || !room.placements[1] || room.state) return;
  let st = newMatch(room.placements[0], room.placements[1], room.seed, room.first, { equipDamage: room.equipDamage });
  const start = runPassivesAtMatchStart(st);
  st = start.state;
  room.state = st;
  const events = [...start.events];
  advance(room, events);
  armTimer(room);
  room.players.forEach((ws, i) => send(ws, { t: 'start', first: room.first, seed: room.seed, foeCount: room.placements[i === 0 ? 1 : 0]!.length, update: updateFor(room, i as PlayerId, events) }));
}

/** Ảnh chụp để người chơi nối lại (hoặc mở lại trang) dựng lại trạng thái. */
function snapshot(room: Room, p: PlayerId): ResumeSnapshot {
  const foeId: PlayerId = p === 0 ? 1 : 0;
  const base = { you: p, code: room.code, equipDamage: room.equipDamage, turnLimit: room.turnLimit, graceMs: graceMs(room), seed: room.seed, foeCount: room.placements[foeId]?.length ?? 0 };
  if (!room.state) return { phase: 'placing', ...base };
  const foe = room.state.boards[foeId];
  return {
    phase: 'playing', ...base, update: updateFor(room, p, []),
    foe: { shots: foe.shots, blocked: foe.shots.map((row, y) => row.map((v, x) => v === 'none' && isBlocked(foe, { x, y }))), sunk: foe.ships.filter((x) => x.sunk) },
  };
}

function onMessage(c: Conn, m: C2S) {
  switch (m.t) {
    case 'ping': return send(c.ws, { t: 'pong' });
    case 'create': {
      if (c.room) leave(c);
      const room = makeRoom(!!m.equipDamage, cleanLimit(m.turnLimit));
      seat(room, c);
      return send(c.ws, { t: 'room', code: room.code });
    }
    case 'join': {
      if (c.room) leave(c);
      const room = rooms.get(normalizeCode(String(m.code)));
      if (!room) return err(c.ws, 'Không tìm thấy phòng. Kiểm tra lại mã.');
      if (room.matched || (room.players[0] && room.players[1])) return err(c.ws, 'Phòng đã đủ người.');
      seat(room, c);
      return startPlacing(room);
    }
    case 'quick': {
      if (c.room) leave(c);
      const limit = cleanLimit(m.turnLimit), waiting = queues.get(limit);
      if (waiting && waiting !== c && waiting.ws.readyState === waiting.ws.OPEN) {
        queues.delete(limit);
        const room = makeRoom(false, limit);
        seat(room, waiting); seat(room, c);
        return startPlacing(room);
      }
      queues.set(limit, c);
      return send(c.ws, { t: 'queued' });
    }
    case 'resume': {
      const room = rooms.get(normalizeCode(String(m.code)));
      const who = !room ? -1 : room.tokens[0] === m.token ? 0 : room.tokens[1] === m.token ? 1 : -1;
      if (!room || who < 0 || !room.matched) return send(c.ws, { t: 'resumeFailed' });
      const me = who as PlayerId;
      const old = room.players[me];
      if (old && old !== c.ws) { const oc = conns.get(old); if (oc) oc.room = undefined; old.terminate(); }
      const t = room.drop[me]; if (t) { clearTimeout(t); room.drop[me] = null; }
      room.players[me] = c.ws; c.room = room; c.me = me;
      send(c.ws, { t: 'resumed', snapshot: snapshot(room, me) });
      return send(room.players[me === 0 ? 1 : 0], { t: 'opponentBack' });
    }
    case 'cancel': return leave(c);
    case 'leave': return leave(c);
    case 'place': {
      const room = c.room;
      if (!room || c.me === undefined) return err(c.ws, 'Chưa ở trong phòng.');
      if (room.state) return err(c.ws, 'Trận đã bắt đầu.');
      const ships = cleanPlacement(m.ships);
      if (!ships) return err(c.ws, 'Cách xếp tàu không hợp lệ (cần đủ ô, không chồng, ít nhất một tàu có đòn đánh).');
      room.placements[c.me] = ships;
      return maybeStart(room);
    }
    case 'fire': {
      const room = c.room;
      if (!room?.state || c.me === undefined) return err(c.ws, 'Trận chưa bắt đầu.');
      const action = m.action as FireAction;
      if (!isValidAction(room.state, c.me, action)) return err(c.ws, 'Hành động không hợp lệ.');
      perform(room, c.me, action);
    }
  }
}

// ---- HTTP (phục vụ dist/ nếu có) + WebSocket ----
const DIST = join(process.cwd(), 'dist');
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.glb': 'model/gltf-binary' };
const http = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/health') { res.writeHead(200); return void res.end('ok'); }
  let file = normalize(join(DIST, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); return void res.end('Chưa build client: chạy `npm run build`.'); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

export function startServer(port: number, opts: { unitMs?: number } = {}) {
  UNIT = opts.unitMs ?? 1000;
  const wss = new WebSocketServer({ server: http, maxPayload: 64 * 1024 });
  wss.on('connection', (ws) => {
    const c: Conn = { ws, alive: true };
    conns.set(ws, c);
    ws.on('pong', () => { c.alive = true; });
    ws.on('message', (data) => {
      let m: C2S;
      try { m = JSON.parse(String(data)) as C2S; } catch { return; }
      try { onMessage(c, m); } catch (e) { console.error(e); err(ws, 'Lỗi máy chủ.'); }
    });
    ws.on('close', () => { dropped(c); conns.delete(ws); });
  });
  // Giữ kết nối qua proxy và dọn kết nối chết
  const hb = setInterval(() => { for (const c of conns.values()) { if (!c.alive) { c.ws.terminate(); continue; } c.alive = false; c.ws.ping(); } }, 25000);
  hb.unref();
  return new Promise<{ port: number; close(): void }>((res) => http.listen(port, () => res({ port: (http.address() as { port: number }).port, close: () => { clearInterval(hb); for (const r of [...rooms.values()]) closeRoom(r); for (const c of conns.values()) c.ws.terminate(); wss.close(); http.close(); } })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startServer(PORT).then((s) => console.log(`Pacific Ash online: http://localhost:${s.port} (ws cùng cổng)`));
}
