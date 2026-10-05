// Chụp khung hình cinematic ở các mốc thời gian cố định (đồng hồ cảnh chạy chậm). Dùng ?debug. Ảnh vào $OUT/frame_<đòn>_<ms>.png.
// Chạy: OUT=thư-mục node cine_frames.mjs [rapid|precision|cross|torpedo|line3 ...]
import puppeteer from 'puppeteer-core';
const kinds = process.argv.slice(2).length ? process.argv.slice(2) : ['rapid', 'precision', 'cross', 'torpedo', 'line3'];
const MARKS = { rapid: [500, 1200, 1700, 2100, 2500], precision: [600, 1400, 2000, 2460, 2800], cross: [700, 1500, 2300, 3100, 3500], torpedo: [700, 1800, 2500, 3300, 4100], line3: [800, 1700, 2800, 3800, 4300] };
const SHIP = { rapid: 'destroyer', precision: 'cruiser', cross: 'missile', torpedo: 'submarine', line3: 'carrier' };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.evaluateOnNewDocument(() => localStorage.setItem('pacific-ash.settings', JSON.stringify({ anim: 'x1', quality: 'medium' })));
await page.goto('http://localhost:4599/?debug');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (s) => page.waitForSelector(s).then(() => page.click(s));
await sleep(2500);
await click('[data-id="play"]'); await sleep(700); await click('[data-start="pve"]'); await sleep(1200);
await click('[data-random]'); await sleep(500); await click('[data-confirm]'); await page.waitForSelector('.battle'); await sleep(2000);
await page.evaluate(() => { document.getElementById('ui').style.visibility = 'hidden'; });
const C = (x, y) => ({ x, y });
const events = {
  rapid: [{ type: 'ShotFired', player: 0, shipId: 'destroyer', attack: 'rapid', cells: [C(3, 3), C(6, 4)] }, { type: 'CellResolved', player: 0, cell: C(3, 3), result: 'hit' }, { type: 'CellResolved', player: 0, cell: C(6, 4), result: 'miss' }],
  precision: [{ type: 'ShotFired', player: 0, shipId: 'cruiser', attack: 'precision', cells: [C(4, 4)] }, { type: 'CellResolved', player: 0, cell: C(4, 4), result: 'hit' }],
  cross: [{ type: 'ShotFired', player: 0, shipId: 'missile', attack: 'cross', cells: [C(5, 5), C(5, 4), C(6, 5), C(5, 6), C(4, 5)] }, ...[C(5, 5), C(5, 4), C(6, 5), C(5, 6), C(4, 5)].map((c, i) => ({ type: 'CellResolved', player: 0, cell: c, result: i % 2 ? 'miss' : 'hit' }))],
  torpedo: [{ type: 'ShotFired', player: 0, shipId: 'submarine', attack: 'torpedo', cells: [0, 1, 2, 3, 4].map((x) => C(x, 4)) }, ...[0, 1, 2, 3].map((x) => ({ type: 'CellResolved', player: 0, cell: C(x, 4), result: 'miss' })), { type: 'CellResolved', player: 0, cell: C(4, 4), result: 'hit' }],
  line3: [{ type: 'ShotFired', player: 0, shipId: 'carrier', attack: 'line3', cells: [C(3, 5), C(4, 5), C(5, 5)] }, ...[C(3, 5), C(4, 5), C(5, 5)].map((c, i) => ({ type: 'CellResolved', player: 0, cell: c, result: i === 1 ? 'hit' : 'miss' }))],
};
for (const k of kinds) {
  await page.evaluate((ev, kind) => {
    const { battleScene } = window.__pa;
    window.__done = false;
    battleScene.play([...ev, { type: 'TurnChanged', player: 1 }], { viewer: 0, speed: 0.4, short: false, shake: false, reduced: true, onEvent: () => {} }).then(() => { window.__done = true; });
  }, events[k], k);
  for (const mark of MARKS[k]) {
    await page.waitForFunction((m) => window.__pa.battleScene.cineClock() >= m || window.__done, { timeout: 240000, polling: 100 }, mark);
    await page.screenshot({ path: `${process.env.OUT}/frame_${k}_${mark}.png` });
  }
  await page.waitForFunction(() => window.__done, { timeout: 240000, polling: 200 });
  await sleep(500);
}
console.log(JSON.stringify({ errors: errs.slice(0, 5) }));
await browser.close();
