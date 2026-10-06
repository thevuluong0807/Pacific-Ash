// Chụp khung hình cảnh chìm (sink:<tàu>, bỏ qua cảnh bắn rồi chụp từ đầu cảnh chìm), cắn lén (sneak), hộ vệ (guard). OUT=thư-mục node cine_scenes.mjs sink:destroyer sneak guard ... Cần dev server cổng 4599.
import puppeteer from 'puppeteer-core';
const cases = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
await page.evaluateOnNewDocument(() => localStorage.setItem('pacific-ash.settings', JSON.stringify({ anim: 'x1', quality: 'medium' })));
await page.goto('http://localhost:4599/?debug');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (s) => page.waitForSelector(s).then(() => page.click(s));
await sleep(2500);
await click('[data-id="play"]'); await sleep(700); await click('[data-start="pve"]'); await sleep(1200);
await click('[data-random]'); await sleep(500); await click('[data-confirm]'); await page.waitForSelector('.battle'); await sleep(2000);
await page.evaluate(() => { document.getElementById('ui').style.visibility = 'hidden'; });
const C = (x, y) => ({ x, y });
const SINK_MARKS = [600, 2400, 4800, 7200, 9600, 10500];
for (const k of cases) {
  let events, marks, skipAt = null, opts = {};
  if (k.startsWith('sink:')) {
    const id = k.slice(5);
    const cells = { destroyer: [C(3, 3), C(4, 3)], cruiser: [C(2, 5), C(3, 5), C(4, 5)], missile: [C(1, 1), C(2, 1), C(3, 1), C(4, 1)], submarine: [C(5, 6), C(6, 6), C(7, 6)], carrier: [C(1, 8), C(2, 8), C(3, 8), C(4, 8), C(5, 8)], raider: [C(7, 7)], escort: [C(6, 2), C(7, 2), C(6, 3), C(7, 3)] }[id];
    events = [{ type: 'ShotFired', player: 0, shipId: 'cruiser', attack: 'precision', source: 'action', cells: [cells[0]] }, { type: 'CellResolved', player: 0, cell: cells[0], result: 'hit' }, { type: 'ShipSunk', owner: 1, shipId: id, cells }];
    marks = SINK_MARKS.map((m) => 5250 + m); skipAt = 600;
  } else if (k === 'sneak') {
    events = [{ type: 'PassiveTriggered', owner: 0, shipId: 'raider', kind: 'sneak' }, { type: 'ShotFired', player: 0, shipId: 'raider', attack: 'sneak', source: 'passive', cells: [C(4, 4)] }, { type: 'CellResolved', player: 0, cell: C(4, 4), result: 'hit' }];
    marks = [200, 450, 700, 900, 1150, 1400];
  } else if (k === 'guard') {
    const cs = [C(5, 5), C(5, 4), C(6, 5), C(5, 6), C(4, 5)];
    events = [{ type: 'ShotFired', player: 0, shipId: 'missile', attack: 'cross', source: 'action', cells: cs }, { type: 'PassiveTriggered', owner: 1, shipId: 'escort', kind: 'guard' }, { type: 'ShotNullified', owner: 1, shipId: 'escort', cells: [C(5, 5), C(5, 4), C(6, 5)] }, { type: 'CellResolved', player: 0, cell: C(5, 6), result: 'miss' }, { type: 'CellResolved', player: 0, cell: C(4, 5), result: 'miss' }];
    marks = [5100 + 150, 5100 + 450, 5100 + 750, 5100 + 1050, 5100 + 1250, 5100 + 1600, 5100 + 1900, 5100 + 2150, 5100 + 2500];
  }
  await page.evaluate((ev, kind, sk) => {
    const { battleScene } = window.__pa;
    window.__done = false;
    battleScene.play([...ev, { type: 'TurnChanged', player: 1 }], { viewer: 0, speed: 0.25, short: false, shake: false, reduced: true, onEvent: () => {} }).then(() => { window.__done = true; });
    if (sk != null) setTimeout(() => battleScene.skip(), 600 / 0.25 / 1.0 * 0.5);
  }, events, k, skipAt);
  for (const mark of marks) {
    await page.waitForFunction((m) => window.__pa.battleScene.cineClock() >= m || window.__done, { timeout: 600000, polling: 100 }, mark);
    await page.screenshot({ path: `${process.env.OUT}/f_${k.replace(':', '_')}_${mark}.png` });
  }
  for (let i = 0; i < 2000 && !(await page.evaluate(() => window.__done)); i++) await sleep(200);
  await sleep(500);
}
console.log(JSON.stringify({ errors: errs.slice(0, 5) }));
await browser.close();
