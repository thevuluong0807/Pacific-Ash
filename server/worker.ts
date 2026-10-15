import { hub } from './hub';
import type { Sock } from './sock';

/**
 * Cloudflare Worker + Durable Object: cùng `hub.ts` với bản Node. Mọi kết nối vào MỘT Durable Object (`idFromName('main')`)
 * nên phòng/ghép trận/mô phỏng dùng chung bộ nhớ như server Node. Worker chỉ chuyển WebSocket và chặn Origin lạ để khỏi tốn hạn mức.
 * Chạy thử: `npm run worker:dev`; đưa lên: `npm run worker:deploy`.
 */
interface CfSocket {
  readonly readyState: number;
  accept(): void; send(data: string): void; close(code?: number, reason?: string): void;
  addEventListener(type: string, fn: (e: { data?: unknown }) => void): void;
}
declare const WebSocketPair: new () => Record<0 | 1, CfSocket>;
interface Env { HUB: { idFromName(name: string): unknown; get(id: unknown): { fetch(req: Request): Promise<Response> } } }

const ALLOWED_ORIGIN = [/^https:\/\/([a-z0-9-]+\.)*vrealm\.dev$/, /^https:\/\/([a-z0-9-]+\.)?pacific-ash\.pages\.dev$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const MAX_PAYLOAD = 64 * 1024;

export class Hub {
  constructor() { hub.closeAll(); } // module có thể còn trạng thái cũ sau khi đối tượng bị thu hồi

  fetch(req: Request): Response {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Cần WebSocket', { status: 426 });
    const pair = new WebSocketPair(), client = pair[0], server = pair[1];
    server.accept();
    const sock: Sock = { get readyState() { return server.readyState; }, send: (d) => server.send(d), terminate: () => server.close(1011, 'terminated') };
    const h = hub.connect(sock);
    let closed = false;
    const end = () => { if (!closed) { closed = true; h.close(); } };
    server.addEventListener('message', (e) => {
      if (typeof e.data !== 'string') return;
      if (e.data.length > MAX_PAYLOAD) return void server.close(1009, 'too big');
      h.message(e.data);
    });
    server.addEventListener('close', end);
    server.addEventListener('error', end);
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }
}

export default {
  fetch(req: Request, env: Env): Promise<Response> | Response {
    if (new URL(req.url).pathname === '/health') return new Response('ok');
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Pacific Ash online server', { status: 200 });
    const origin = req.headers.get('Origin');
    if (origin && !ALLOWED_ORIGIN.some((re) => re.test(origin))) return new Response('Forbidden', { status: 403 });
    return env.HUB.get(env.HUB.idFromName('main')).fetch(req);
  },
};
