import type { C2S, S2C } from './protocol';

/**
 * Kết nối WebSocket tới server online. Tin nhắn chưa có người nhận (đang chuyển màn hình) được giữ lại và
 * phát cho người đăng ký kế tiếp, nên không mất cập nhật giữa lúc đổi màn.
 */
export class OnlineClient {
  private fn: ((m: S2C) => void) | null = null;
  private pending: S2C[] = [];
  private ping?: ReturnType<typeof setInterval>;
  closed = false;
  onClose?: () => void;

  private constructor(private ws: WebSocket) {
    ws.addEventListener('message', (e) => {
      let m: S2C;
      try { m = JSON.parse(String(e.data)) as S2C; } catch { return; }
      if (m.t === 'pong') return;
      if (this.fn) this.fn(m); else this.pending.push(m);
    });
    ws.addEventListener('close', () => { this.closed = true; clearInterval(this.ping); this.onClose?.(); });
    this.ping = setInterval(() => this.send({ t: 'ping' }), 20000);
  }

  static connect(url: string, timeoutMs = 6000): Promise<OnlineClient> {
    return new Promise((res, rej) => {
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch (e) { return rej(e); }
      const timer = setTimeout(() => { ws.close(); rej(new Error('timeout')); }, timeoutMs);
      ws.addEventListener('open', () => { clearTimeout(timer); res(new OnlineClient(ws)); });
      ws.addEventListener('error', () => { clearTimeout(timer); rej(new Error('connect')); });
    });
  }

  send(m: C2S) { if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m)); }

  /** Đặt người nhận tin; phát ngay các tin đã giữ lại. Truyền null để bỏ. */
  subscribe(fn: ((m: S2C) => void) | null) {
    this.fn = fn;
    if (!fn) return;
    const q = this.pending; this.pending = [];
    for (const m of q) fn(m);
  }

  close() { this.fn = null; clearInterval(this.ping); this.closed = true; this.ws.close(); }
}

/** Địa chỉ server mặc định: cùng máy chủ với trang (server phục vụ luôn client); chạy dev hoặc mở file thì dùng cổng 8787. */
export function defaultServer(): string {
  const { protocol, hostname, host, port } = location;
  if (protocol !== 'http:' && protocol !== 'https:') return 'ws://localhost:8787';
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '8787') return 'ws://localhost:8787';
  return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}`;
}
