// E2E cinematic 3D (cần WebGL: Chrome headless + SwiftShader). Chơi PvE, bắn đủ 5 loại đòn, chụp ảnh giữa lúc chiếu vào $OUT.
// Kiểm tra: không lỗi trang, lớp `cine` bật rồi tắt, mọi marker cập nhật, nút Bỏ qua chạy.
import puppeteer from 'puppeteer-core';
const [, , anim = 'x1', short = '0', skipAfter = ''] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
await page.evaluateOnNewDocument((a, sh) => { localStorage.setItem('pacific-ash.settings', JSON.stringify({ anim: a, quality: 'medium', shortCinematic: sh === '1' })); }, anim, short);
await page.goto('http://localhost:4599/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (s) => page.waitForSelector(s).then(() => page.click(s));
await sleep(2500);
await click('[data-id="play"]'); await sleep(700); await click('[data-level="easy"]'); await click('[data-start="pve"]'); await sleep(1500);
await click('[data-random]'); await sleep(600); await click('[data-confirm]'); await page.waitForSelector('.battle');
const res = { shots: [], errors: [] };
const done = new Set();
for (let guard = 0; guard < 200 && done.size < 5 && !(await page.$('.result')); guard++) {
  const pick = await page.evaluate((done) => {
    const cards = [...document.querySelectorAll('.frow:not(:disabled)')];
    if (!cards.length) return null;
    const fresh = cards.find((c) => !done.includes(c.dataset.ship));
    return (fresh ?? cards.find((c) => c.dataset.ship === 'destroyer') ?? cards[0]).dataset.ship;
  }, [...done]);
  if (!pick) { await sleep(400); continue; }
  await page.evaluate((id) => {
    document.querySelector(`.frow[data-ship="${id}"]`).click();
    const cells = [...document.querySelectorAll('.b-enemy .g-cell')].filter((x) => !/c--(off|miss|hit|sunk)/.test(x.className));
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    if (id === 'submarine') document.querySelector(`.b-enemy .g-handle[data-hrow="${Math.floor(Math.random() * 10)}"]`).click();
    else { r(cells).click(); if (id === 'destroyer') r(document.querySelectorAll('.b-enemy .g-cell:not(.c--off):not(.c--sel)')).click(); }
  }, pick);
  if (await page.$eval('[data-fire]', (b) => b.disabled)) { await page.keyboard.press('Escape'); continue; }
  await page.click('[data-fire]');
  done.add(pick);
  const t0 = Date.now(); let n = 0, sawCine = false, skipped = false;
  while (Date.now() - t0 < 60000) {
    const cine = await page.$('.battle.cine');
    if (cine) { sawCine = true; if (n < 5 && process.env.OUT) { if (process.env.HIDEUI) await page.evaluate(() => { document.getElementById('ui').style.visibility = 'hidden'; }); await page.screenshot({ path: `${process.env.OUT}/cine_${pick}_${n++}.png` }); if (process.env.HIDEUI) await page.evaluate(() => { document.getElementById('ui').style.visibility = 'visible'; }); } if (skipAfter && !skipped && Date.now() - t0 > +skipAfter) { await page.click('[data-skip]'); skipped = true; } }
    else if (sawCine) break;
    await sleep(skipAfter ? 250 : 450);
  }
  res.shots.push({ ship: pick, sawCine, ms: Date.now() - t0, skipped });
  // chờ tới lượt mình (đối thủ bắn cũng chiếu cinematic)
  await page.waitForFunction(() => document.querySelector('.result') || (document.querySelector('.frow:not(:disabled)') && !document.querySelector('.battle.cine')), { timeout: 90000 }).catch(() => res.errors.push('timeout chờ lượt'));
}
res.markers = await page.$$eval('.b-enemy .c--hit, .b-enemy .c--miss', (a) => a.length);
res.errors.push(...errs.slice(0, 5));
console.log(JSON.stringify(res));
await browser.close();
