import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import type { FireAction, MatchState, PlacedShip, PlayerId } from '../design/core-api';
import { applyAction, isValidAction, newMatch, readyShips, runPassivesAtMatchStart, runPassivesAtTurnStart, skipTurn } from '../src/core';
import { freshShip, isValidPlacement } from '../src/core/board';
import { loadSpecs } from '../src/core/specs';
import { CODE_ALPHABET, CODE_LENGTH, normalizeCode, type C2S, type S2C, type Update } from '../src/net/protocol';

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
  players: (WebSocket | null)[];          // chỉ số = PlayerId
  placements: (PlacedShip[] | null)[];
  state: MatchState | null;
  first: PlayerId;
}
interface Conn { ws: WebSocket; room?: Room; me?: PlayerId; queued?: boolean; alive: boolean }

const rooms = new Map<string, Room>();
const conns = new Map<WebSocket, Conn>();
let queue: Conn | null = null; // ghép ngẫu nhiên: người đang chờ

const send = (ws: WebSocket | null | undefined, m: S2C) => { if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(m)); };
const err = (ws: WebSocket, msg: string) => send(ws, { t: 'error', msg });

function newCode(): string {
  for (;;) {
    const c = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
    if (!rooms.has(c)) return c;
  }
}

function makeRoom(equipDamage: boolean): Room {
  const room: Room = { code: newCode(), equipDamage, players: [null, null], placements: [null, null], state: null, first: Math.random() < 0.5 ? 0 : 1 };
  rooms.set(room.code, room);
  return room;
}

function seat(room: Room, c: Conn): PlayerId {
  const me: PlayerId = room.players[0] ? 1 : 0;
  room.players[me] = c.ws; c.room = room; c.me = me; c.queued = false;
  return me;
}

function startPlacing(room: Room) {
  room.players.forEach((ws, i) => send(ws, { t: 'matched', code: room.code, you: i as PlayerId, equipDamage: room.equipDamage }));
}

function leave(c: Conn) {
  if (queue === c) queue = null;
  c.queued = false;
  const room = c.room;
  if (!room) return;
  c.room = undefined;
  const other = room.players[c.me === 0 ? 1 : 0];
  room.players[c.me!] = null;
  if (other) send(other, { t: 'opponentLeft' }); // đối thủ thoát: bên còn lại thắng
  rooms.delete(room.code);
  if (other) { const oc = conns.get(other); if (oc) oc.room = undefined; }
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

const updateFor = (state: MatchState, p: PlayerId, events: Update['events']): Update => ({
  events, board: state.boards[p], revealed: state.revealed, turn: state.turn, turnNumber: state.turnNumber, winner: state.winner,
});

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

function maybeStart(room: Room) {
  if (!room.placements[0] || !room.placements[1] || !room.players[0] || !room.players[1]) return;
  const seed = (Math.random() * 0x7fffffff) >>> 0;
  let st = newMatch(room.placements[0], room.placements[1], seed, room.first, { equipDamage: room.equipDamage });
  const start = runPassivesAtMatchStart(st);
  st = start.state;
  room.state = st;
  const events = [...start.events];
  advance(room, events);
  room.players.forEach((ws, i) => send(ws, { t: 'start', first: room.first, seed, foeCount: room.placements[i === 0 ? 1 : 0]!.length, update: updateFor(room.state!, i as PlayerId, events) }));
}

function onMessage(c: Conn, m: C2S) {
  switch (m.t) {
    case 'ping': return send(c.ws, { t: 'pong' });
    case 'create': {
      if (c.room) leave(c);
      const room = makeRoom(!!m.equipDamage);
      seat(room, c);
      return send(c.ws, { t: 'room', code: room.code });
    }
    case 'join': {
      if (c.room) leave(c);
      const room = rooms.get(normalizeCode(String(m.code)));
      if (!room) return err(c.ws, 'Không tìm thấy phòng. Kiểm tra lại mã.');
      if (room.players[0] && room.players[1]) return err(c.ws, 'Phòng đã đủ người.');
      seat(room, c);
      return startPlacing(room);
    }
    case 'quick': {
      if (c.room) leave(c);
      if (queue && queue !== c && queue.ws.readyState === queue.ws.OPEN) {
        const other = queue; queue = null;
        const room = makeRoom(false);
        seat(room, other); seat(room, c);
        return startPlacing(room);
      }
      queue = c; c.queued = true;
      return send(c.ws, { t: 'queued' });
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
      const r = applyAction(room.state, c.me, action);
      room.state = r.state;
      const events = [...r.events];
      advance(room, events);
      room.players.forEach((ws, i) => send(ws, { t: 'update', update: updateFor(room.state!, i as PlayerId, events) }));
      if (room.state.winner !== null) { room.players.forEach((ws) => { const cc = ws && conns.get(ws); if (cc) cc.room = undefined; }); rooms.delete(room.code); }
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

export function startServer(port: number) {
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
    ws.on('close', () => { leave(c); conns.delete(ws); });
  });
  // Giữ kết nối qua proxy và dọn kết nối chết
  const hb = setInterval(() => { for (const c of conns.values()) { if (!c.alive) { c.ws.terminate(); continue; } c.alive = false; c.ws.ping(); } }, 25000);
  hb.unref();
  return new Promise<{ port: number; close(): void }>((res) => http.listen(port, () => res({ port: (http.address() as { port: number }).port, close: () => { clearInterval(hb); for (const c of conns.values()) c.ws.terminate(); wss.close(); http.close(); } })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startServer(PORT).then((s) => console.log(`Pacific Ash online: http://localhost:${s.port} (ws cùng cổng)`));
}
