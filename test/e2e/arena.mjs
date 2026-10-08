// Hải chiến: vào sảnh, ra khơi, dàn địch phía trước, cầm pháo 406 và bắn. Cần `npm run dev -- --port 4599`; ảnh vào $OUT/f_*.png.
import puppeteer from 'puppeteer-core';
const OUT = process.env.OUT;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.evaluateOnNewDocument(() => localStorage.setItem('pacific-ash.settings', JSON.stringify({ anim: 'x1', quality: 'low' })));
await page.goto('http://localhost:4599/?debug');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (s) => page.waitForSelector(s).then(() => page.click(s));
await sleep(5000);
await click('[data-id="play"]'); await sleep(800);
await click('[data-arena]'); await sleep(1200);
await click('[data-go]'); await sleep(6000);
// dàn trận: địch Máy 1 cách 450 đv phía trước, đứng yên
await page.evaluate(() => {
  const sim = window.__pa.arenaScene.sim; const a = sim.ships[0], b = sim.ships[1];
  for (const s of sim.ships) { s.vx = s.vz = 0; }
  a.x = 0; a.z = 0; a.h = 0; b.x = 30; b.z = 500; b.h = 1.2; b.team = 1;
  sim.ships.forEach((s, i) => { if (i > 1) { s.x = 1200 + i * 10; s.z = 1200; } });
});
await sleep(1500);
await page.screenshot({ path: `${OUT}/f_setup.png` });
await page.keyboard.press('1'); await sleep(2500);
// ngẩng nòng chút rồi bắn
await page.keyboard.down('w'); await sleep(1200); await page.keyboard.up('w');
await page.screenshot({ path: `${OUT}/f_aim.png` });
await page.keyboard.press(' '); await sleep(600);
await page.screenshot({ path: `${OUT}/f_fire0.png` });
await sleep(1500);
await page.screenshot({ path: `${OUT}/f_fire1.png` });
await sleep(2500);
await page.screenshot({ path: `${OUT}/f_fire2.png` });
const st = await page.evaluate(() => { const sim = window.__pa.arenaScene.sim; return sim.ships.map((s) => [s.name, Math.round(s.hp), s.alive]); });
console.log(JSON.stringify({ st, errors: errs.slice(0, 8) }));
await browser.close();
