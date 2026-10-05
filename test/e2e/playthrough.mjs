// E2E giao diện (không thuộc npm test). Cần: npm i --no-save puppeteer-core; Chrome tại /usr/bin/google-chrome; npm run build && npx vite preview --port 4599.
// Chạy: node test/e2e/playthrough.mjs <pve|hotseat> <easy|medium|hard> <w> <h> [ảnh: đặt OUT=thư mục và thêm tham số 1]
import puppeteer from 'puppeteer-core';
const [,, mode = 'pve', level = 'hard', w = '1440', h = '900', shots = ''] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
await page.evaluateOnNewDocument(() => localStorage.setItem('pacific-ash.settings', JSON.stringify({ anim: 'off' })));
await page.goto('http://localhost:4599/?no3d');
const shot = async (n) => shots && page.screenshot({ path: `${process.env.OUT}/${n}_${w}.png` });
const click = (sel) => page.waitForSelector(sel, { timeout: 4000 }).then(() => page.click(sel));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await shot('menu');
await click('.btn--primary'); // Chơi
if (mode === 'pve') await click(`[data-level="${level}"]`);
await shot('mode');
await click(`[data-start="${mode}"]`);
await shot('hangar');

const place = async () => { await click('[data-random]'); await wait(50); await shot('placement'); await click('[data-confirm]'); };
await place();
if (mode === 'hotseat') { await click('[data-ok]'); await place(); await click('[data-ok]'); }
await wait(200);
let turns = 0, shotTaken = false;
for (let i = 0; i < 600; i++) {
  if (await page.$('.result')) break;
  if (await page.$('[data-ok]')) { await page.click('[data-ok]'); continue; }
  const acted = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.frow:not(:disabled)')];
    if (!cards.length) return 'wait';
    const card = cards[Math.floor(Math.random() * cards.length)];
    card.click();
    const id = card.dataset.ship;
    const cells = () => [...document.querySelectorAll('.b-enemy .g-cell')].filter((c) => !c.classList.contains('c--off') && !/c--(miss|hit|sunk)/.test(c.className));
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    if (id === 'submarine') document.querySelector(`.b-enemy .g-handle[data-hrow="${Math.floor(Math.random() * 10)}"]`).click();
    else if (id === 'destroyer') { const c = cells(); rnd(c).click(); if (c.length > 1) rnd(cells().filter((x) => x.dataset.n === undefined)).click(); }
    else rnd(cells()).click();
    const fire = document.querySelector('[data-fire]');
    if (fire.disabled) return 'retry';
    fire.click();
    return 'fired';
  });
  if (acted === 'fired') turns++;
  if (turns === 2 && !shotTaken) { shotTaken = true; await wait(100); await shot('battle'); }
  if (turns === 22) { await wait(100); await shot('battle2'); }
  await wait(acted === 'wait' ? 120 : 20);
}
const done = !!(await page.$('.result'));
await shot('result');
const title = done ? await page.$eval('.result__title', (e) => e.textContent) : null;
console.log(JSON.stringify({ mode, level, w, done, title, humanShots: turns, errors: errors.slice(0, 5) }));
await browser.close();
