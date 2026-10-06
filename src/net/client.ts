import type { C2S, S2C } from './protocol';

/**
 * Kết nối WebSocket tới server online. Tin nhắn chưa có người nhận (đang chuyển màn hình) được giữ lại và
 * phát cho người đăng ký kế tiếp. Nếu đã `setResume`, rớt mạng ngoài ý muốn sẽ tự nối lại (thử mỗi 1.5 s) trong
 * thời gian cho phép rồi gửi `resume`; hết hạn thì gọi `onGiveUp`.
 */
export class OnlineClient {
  private fn: ((m: S2C) => void) | null = null;
  private pending: S2C[] = [];
  private ping?: ReturnType<typeof setInterval>;
  private ws!: WebSocket;
  private resume?: { code: string; token: string; graceMs: number };
  private intentional = false;
  closed = false;
  reconnecting = false;
  /** Rớt mạng và không thể nối lại (chưa đặt resume, hoặc hết hạn). */
  onClose?: () => void;
  /** Bắt đầu / kết thúc giai đoạn nối lại. */
  onStatus?: (reconnecting: boolean) => void;

  private constructor(private url: string) {}

  private static open(url: string, timeoutMs: number): Promise<WebSocket> {
    return new Promise((res, rej) => {
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch (e) { return rej(e); }
      const timer = setTimeout(() => { ws.close(); rej(new Error('timeout')); }, timeoutMs);
      ws.addEventListener('open', () => { clearTimeout(timer); res(ws); });
      ws.addEventListener('error', () => { clearTimeout(timer); rej(new Error('connect')); });
    });
  }

  static async connect(url: string, timeoutMs = 6000): Promise<OnlineClient> {
    const c = new OnlineClient(url);
    c.attach(await OnlineClient.open(url, timeoutMs));
    c.ping = setInterval(() => c.send({ t: 'ping' }), 20000);
    return c;
  }

  private attach(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener('message', (e) => {
      let m: S2C;
      try { m = JSON.parse(String(e.data)) as S2C; } catch { return; }
      if (m.t === 'pong') return;
      if (this.fn) this.fn(m); else this.pending.push(m);
    });
    ws.addEventListener('close', () => { if (ws === this.ws && !this.intentional) void this.lost(); });
  }

  /** Cho phép tự nối lại bằng mã phòng + mã chỗ ngồi trong `graceMs`. */
  setResume(code: string, token: string, graceMs: number) { this.resume = { code, token, graceMs }; }

  private async lost() {
    if (!this.resume) { this.closed = true; clearInterval(this.ping); this.onClose?.(); return; }
    this.reconnecting = true; this.onStatus?.(true);
    const giveUp = Date.now() + this.resume.graceMs;
    while (!this.intentional && Date.now() < giveUp) {
      await new Promise((r) => setTimeout(r, 1500));
      if (this.intentional) return;
      try {
        const ws = await OnlineClient.open(this.url, 4000);
        this.attach(ws);
        this.reconnecting = false; this.onStatus?.(false);
        this.send({ t: 'resume', code: this.resume.code, token: this.resume.token });
        return;
      } catch { /* thử lại */ }
    }
    this.reconnecting = false; this.closed = true; clearInterval(this.ping); this.onStatus?.(false); this.onClose?.();
  }

  send(m: C2S) { if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m)); }

  /** Đặt người nhận tin; phát ngay các tin đã giữ lại. Truyền null để bỏ. */
  subscribe(fn: ((m: S2C) => void) | null) {
    this.fn = fn;
    if (!fn) return;
    const q = this.pending; this.pending = [];
    for (const m of q) fn(m);
  }

  close() { this.intentional = true; this.fn = null; clearInterval(this.ping); this.closed = true; this.ws.close(); }
}

/** Địa chỉ server mặc định: cùng máy chủ với trang (server phục vụ luôn client); chạy dev hoặc mở file thì dùng cổng 8787. */
export function defaultServer(): string {
  const { protocol, hostname, host, port } = location;
  if (protocol !== 'http:' && protocol !== 'https:') return 'ws://localhost:8787';
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '8787') return 'ws://localhost:8787';
  return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}`;
}

const KEY = 'pacific-ash.online';
/** Lưu thông tin nối lại để mở lại trang vẫn vào được trận đang dở. */
export const resumeStore = {
  save(v: { server: string; code: string; token: string; graceMs: number }) { try { sessionStorage.setItem(KEY, JSON.stringify({ ...v, at: Date.now() })); } catch { /* bỏ qua */ } },
  load(): { server: string; code: string; token: string; graceMs: number; at: number } | null {
    try { const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null'); return v && Date.now() - v.at < v.graceMs + 3 * 3600_000 ? v : null; } catch { return null; }
  },
  clear() { try { sessionStorage.removeItem(KEY); } catch { /* bỏ qua */ } },
};
