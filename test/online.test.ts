import assert from 'node:assert/strict';
import test from 'node:test';
import WebSocket from 'ws';
import type { MatchState, PlayerId } from '../design/core-api';
import { createAi, randomPlacement } from '../src/core';
import { applyUpdate, mirrorStart } from '../src/core/mirror';
import type { C2S, S2C } from '../src/net/protocol';
import { startServer } from '../server/index';

/** Client thử nghiệm: kết nối, gom tin nhắn, chờ tin theo loại. */
class Bot {
  ws!: WebSocket;
  msgs: S2C[] = [];
  waiters: ((m: S2C) => void)[] = [];
  state: MatchState | null = null;
  me: PlayerId = 0;
  mine = randomPlacement(7);
  async open(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}`);
    this.ws.on('message', (d) => { const m = JSON.parse(String(d)) as S2C; const w = this.waiters.shift(); if (w) w(m); else this.msgs.push(m); });
    await new Promise((r) => this.ws.once('open', r));
    return this;
  }
  send(m: C2S) { this.ws.send(JSON.stringify(m)); }
  next(): Promise<S2C> { const m = this.msgs.shift(); return m ? Promise.resolve(m) : new Promise((r) => this.waiters.push(r)); }
  async expect<T extends S2C['t']>(t: T): Promise<Extract<S2C, { t: T }>> {
    for (;;) { const m = await this.next(); if (m.t === t) return m as Extract<S2C, { t: T }>; if (m.t === 'error') throw new Error(m.msg); }
  }
}

async function play(a: Bot, b: Bot) {
  const bots = [a, b];
  const starts = await Promise.all(bots.map((x) => x.expect('start')));
  bots.forEach((x, i) => { x.me = i as PlayerId; x.state = applyUpdate(mirrorStart(x.mine, x.me, starts[i].foeCount, starts[i].first, starts[i].seed, false), starts[i].update, x.me); });
  const ais = bots.map((_, i) => createAi('medium', 100 + i));
  let winner: PlayerId | null = bots[0].state!.winner;
  for (let n = 0; n < 600 && winner === null; n++) {
    const actor = bots.find((x) => x.state!.turn === x.me)!;
    const action = await ais[actor.me].chooseAction({ state: actor.state!, me: actor.me });
    actor.send({ t: 'fire', action });
    const ups = await Promise.all(bots.map((x) => x.expect('update')));
    bots.forEach((x, i) => { x.state = applyUpdate(x.state!, ups[i].update, x.me); });
    winner = ups[0].update.winner;
  }
  return { winner, bots };
}

test('phòng bằng mã: tạo, vào, xếp tàu, chơi trọn ván; mỗi bên chỉ thấy tàu địch đã chìm', async () => {
  const srv = await startServer(0);
  try {
    const a = await new Bot().open(srv.port), b = await new Bot().open(srv.port);
    b.mine = randomPlacement(9);
    a.send({ t: 'create', equipDamage: false, turnLimit: 0 });
    const { code } = await a.expect('room');
    assert.match(code, /^[A-Z0-9]{5}$/);
    b.send({ t: 'join', code: code.toLowerCase() });
    const [ma, mb] = await Promise.all([a.expect('matched'), b.expect('matched')]);
    assert.equal(ma.you, 0); assert.equal(mb.you, 1);
    a.send({ t: 'place', ships: a.mine }); b.send({ t: 'place', ships: b.mine });
    const { winner, bots } = await play(a, b);
    assert.notEqual(winner, null);
    for (const x of bots) {
      const foe = x.state!.boards[x.me === 0 ? 1 : 0];
      assert.ok(foe.ships.every((s) => s.sunk || s.origin.x < 0), 'tàu địch chưa chìm không lộ vị trí');
    }
    a.ws.close(); b.ws.close();
  } finally { srv.close(); }
});

test('ghép ngẫu nhiên: hai người cùng vào hàng đợi được ghép; vào phòng sai mã báo lỗi; xếp tàu sai bị từ chối', async () => {
  const srv = await startServer(0);
  try {
    const a = await new Bot().open(srv.port), b = await new Bot().open(srv.port), c = await new Bot().open(srv.port);
    c.send({ t: 'join', code: 'ZZZZZ' });
    await assert.rejects(c.expect('matched'), /Không tìm thấy phòng/);
    a.send({ t: 'quick', turnLimit: 0 }); await a.expect('queued');
    b.send({ t: 'quick', turnLimit: 0 });
    const [ma, mb] = await Promise.all([a.expect('matched'), b.expect('matched')]);
    assert.equal(ma.code, mb.code);
    a.send({ t: 'place', ships: [{ ...a.mine[0], origin: { x: 9, y: 9 } }] });
    await assert.rejects(a.expect('start'), /không hợp lệ/);
    a.ws.close(); b.ws.close(); c.ws.close();
  } finally { srv.close(); }
});

test('đối thủ thoát giữa chừng: bên còn lại nhận opponentLeft', async () => {
  const srv = await startServer(0);
  try {
    const a = await new Bot().open(srv.port), b = await new Bot().open(srv.port);
    a.send({ t: 'create', equipDamage: true, turnLimit: 0 });
    const { code } = await a.expect('room');
    b.send({ t: 'join', code });
    await Promise.all([a.expect('matched'), b.expect('matched')]);
    b.send({ t: 'leave' }); // thoát chủ động: thua ngay (rớt mạng thì được nối lại, xem test bên dưới)
    await a.expect('opponentLeft');
    a.ws.close();
  } finally { srv.close(); }
});

/** Tạo phòng 15 "giây" (mỗi giây = 20 ms) và đưa hai bot tới lúc bắt đầu. */
async function startedRoom(srv: { port: number }) {
  const a = await new Bot().open(srv.port), b = await new Bot().open(srv.port);
  b.mine = randomPlacement(9);
  a.send({ t: 'create', equipDamage: false, turnLimit: 15 });
  const { code } = await a.expect('room');
  b.send({ t: 'join', code });
  const [ma, mb] = await Promise.all([a.expect('matched'), b.expect('matched')]);
  a.send({ t: 'place', ships: a.mine }); b.send({ t: 'place', ships: b.mine });
  const [sa, sb] = await Promise.all([a.expect('start'), b.expect('start')]);
  return { a, b, ma, mb, sa, sb, code };
}

test('giới hạn thời gian: hết giờ server tự bắn thay người chơi và lượt chuyển sang đối thủ', async () => {
  const srv = await startServer(0, { unitMs: 20 });
  try {
    const { a, b, sa } = await startedRoom(srv);
    assert.ok(sa.update.remainMs !== null && sa.update.remainMs <= 300);
    const idle = sa.update.turn === 0 ? a : b;
    const up = await idle.expect('update');
    assert.ok(up.update.events.some((e) => e.type === 'ShotFired' && e.player === sa.update.turn), 'server tự bắn cho bên hết giờ');
    assert.notEqual(up.update.turn, sa.update.turn);
    a.ws.close(); b.ws.close();
  } finally { srv.close(); }
});

test('nối lại: rớt mạng giữa trận, nối lại bằng mã đúng nhận ảnh chụp; mã sai bị từ chối', async () => {
  const srv = await startServer(0, { unitMs: 20 });
  try {
    const { a, b, ma, code } = await startedRoom(srv);
    a.ws.close();
    const drop = await b.expect('opponentDropped');
    assert.ok(drop.graceMs > 0);
    const a2 = await new Bot().open(srv.port);
    a2.send({ t: 'resume', code, token: 'sai' });
    await a2.expect('resumeFailed');
    a2.send({ t: 'resume', code, token: ma.token });
    const r = await a2.expect('resumed');
    assert.equal(r.snapshot.phase, 'playing'); assert.equal(r.snapshot.you, 0);
    assert.equal(r.snapshot.update!.board.ships.length, a.mine.length);
    await b.expect('opponentBack');
    a2.ws.close(); b.ws.close();
  } finally { srv.close(); }
});

test('nối lại: quá thời gian cho phép thì bên còn lại thắng', async () => {
  const srv = await startServer(0, { unitMs: 20 });
  try {
    const { a, b } = await startedRoom(srv);
    a.ws.close();
    await b.expect('opponentDropped');
    await b.expect('opponentLeft'); // grace = 30 "giây" = 600 ms
    b.ws.close();
  } finally { srv.close(); }
});

test('ghép ngẫu nhiên chỉ ghép người cùng giới hạn thời gian', async () => {
  const srv = await startServer(0);
  try {
    const a = await new Bot().open(srv.port), b = await new Bot().open(srv.port), c = await new Bot().open(srv.port);
    a.send({ t: 'quick', turnLimit: 30 }); await a.expect('queued');
    b.send({ t: 'quick', turnLimit: 60 }); await b.expect('queued');
    c.send({ t: 'quick', turnLimit: 30 });
    const [ma, mc] = await Promise.all([a.expect('matched'), c.expect('matched')]);
    assert.equal(ma.code, mc.code); assert.equal(ma.turnLimit, 30);
    a.ws.close(); b.ws.close(); c.ws.close();
  } finally { srv.close(); }
});
