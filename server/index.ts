import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { hub } from './hub';

/**
 * Server online chạy bằng Node (dev/kiểm thử): phục vụ `dist/` nếu có + WebSocket cùng cổng. Logic phòng/trận ở `hub.ts`.
 * Bản chạy thật là Cloudflare Durable Object (`worker.ts`). Chạy: `npm run server` (mặc định cổng 8787).
 */
const PORT = Number(process.env.PORT ?? 8787);
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
  hub.setUnit(opts.unitMs ?? 1000);
  const wss = new WebSocketServer({ server: http, maxPayload: 64 * 1024 });
  wss.on('connection', (ws) => {
    const h = hub.connect(ws);
    ws.on('pong', h.pong);
    ws.on('message', (data) => h.message(String(data)));
    ws.on('close', h.close);
  });
  // Giữ kết nối qua proxy và dọn kết nối chết
  const hb = setInterval(hub.heartbeat, 25000);
  hb.unref();
  return new Promise<{ port: number; close(): void }>((res) => http.listen(port, () => res({ port: (http.address() as { port: number }).port, close: () => { clearInterval(hb); hub.closeAll(); wss.close(); http.close(); } })));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startServer(PORT).then((s) => console.log(`Pacific Ash online: http://localhost:${s.port} (ws cùng cổng)`));
}
