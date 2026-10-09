import assert from 'node:assert/strict';
import test from 'node:test';
import WebSocket from 'ws';
import { PRESET_DESIGNS } from '../src/arena/data';
import { ArenaSim, NO_INPUT } from '../src/arena/sim';
import { applySnap } from '../src/arena/snap';
import type { C2S, S2C } from '../src/net/protocol';
import { startServer } from '../server/index';
import { COUNTDOWN_MS } from '../server/arena';

class Cl {
  ws!: WebSocket; msgs: S2C[] = []; waiters: ((m: S2C) => void)[] = [];
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
const D = PRESET_DESIGNS[1];

test('Hải chiến online: tạo phòng bằng mã, bạn vào, chủ thêm máy và bắt đầu, nhận bản chụp, phím điều khiển tàu', async () => {
  const srv = await startServer(0);
  try {
    const a = await new Cl().open(srv.port), b = await new Cl().open(srv.port);
    a.send({ t: 'aCreate', name: 'An', design: D });
    const r0 = await a.expect('aRoom');
    assert.equal(r0.room.code.length, 5);
    assert.equal(r0.room.host, 0);
    b.send({ t: 'aJoin', code: r0.room.code.toLowerCase(), name: 'Bình', design: PRESET_DESIGNS[2] });
    const rb = await b.expect('aRoom');
    assert.equal(rb.room.you, 1);
    assert.equal(rb.room.seats.filter(Boolean).length, 2);
    // người không phải chủ không bắt đầu được
    b.send({ t: 'aStart' }); b.send({ t: 'aCfg', mode: 't2' });
    a.send({ t: 'aCfg', bot: { seat: 2, on: true } });
    a.send({ t: 'aStart' });
    const [sa, sb] = await Promise.all([a.expect('aStart'), b.expect('aStart')]);
    assert.equal(sa.players.length, 3); assert.equal(sa.you, 0); assert.equal(sb.you, 1);
    assert.equal(sa.players[2].bot, 'medium');
    // client dựng bản sim phía mình rồi áp bản chụp
    const sim = new ArenaSim(sa.seed, sa.players); sim.remote = true;
    const first = (await a.expect('aSnap')).s, x0 = first.s[0].x, z0 = first.s[0].z;
    for (let i = 0; i < 3; i++) b.send({ t: 'aInput', i: { ...NO_INPUT } });
    a.send({ t: 'aInput', i: { ...NO_INPUT, up: true } });
    let last = first;
    for (let i = 0; i < 80; i++) last = (await a.expect('aSnap')).s;
    const inputs = applySnap(sim, last);
    assert.ok(last.s[0].th > 0.3, `cần ga tăng (${last.s[0].th})`);
    assert.ok(Math.hypot(last.s[0].x - x0, last.s[0].z - z0) > 5, 'tàu đã chạy');
    assert.ok(inputs[0].up && Math.abs(sim.ships[0].throttle - last.s[0].th) < 1e-6);
    assert.equal(sim.projs.length, last.p.length);
    // rời giữa trận: chỗ đó thành máy, trận vẫn chạy
    b.send({ t: 'aLeave' });
    const after = (await a.expect('aSnap')).s;
    assert.equal(after.s.length, 3);
    a.ws.close(); b.ws.close();
  } finally { srv.close(); }
});

test('Hải chiến online: ghép trận công khai tự bắt đầu sau đếm ngược khi đủ 2 người', async () => {
  COUNTDOWN_MS.v = 300;
  const srv = await startServer(0);
  try {
    const a = await new Cl().open(srv.port), b = await new Cl().open(srv.port);
    a.send({ t: 'aQuick', name: 'An', design: D });
    const r = await a.expect('aRoom');
    assert.equal(r.room.public, true); assert.equal(r.room.countdown, null);
    b.send({ t: 'aQuick', name: 'Bình', design: D });
    const rb = await b.expect('aRoom');
    assert.equal(rb.room.code, r.room.code);
    const [sa, sb] = await Promise.all([a.expect('aStart'), b.expect('aStart')]);
    assert.equal(sa.players.length, 2); assert.notEqual(sa.you, sb.you);
    assert.notEqual(sa.players[0].team, sa.players[1].team);
    a.ws.close(); b.ws.close();
  } finally { COUNTDOWN_MS.v = 15000; srv.close(); }
});

test('Hải chiến online: phòng sai mã báo lỗi', async () => {
  const srv = await startServer(0);
  try {
    const a = await new Cl().open(srv.port);
    a.send({ t: 'aJoin', code: 'ZZZZZ', name: 'x', design: D });
    await assert.rejects(a.expect('aRoom'), /Không tìm thấy phòng/);
    a.ws.close();
  } finally { srv.close(); }
});
