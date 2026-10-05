// E2E cảnh 3D (menu, đặt tàu, trận) bằng Chrome headless + SwiftShader; chụp ảnh vào $OUT. Q=low|medium|high chọn chất lượng. Xem hướng dẫn cài ở playthrough.mjs. Không đo được fps (không có GPU thật).
import puppeteer from 'puppeteer-core';
const [, , w = '1300', h = '800'] = process.argv;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(); await page.setViewport({ width: +w, height: +h });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errs.push(m.text().slice(0, 200)));
await page.evaluateOnNewDocument((q) => localStorage.setItem('pacific-ash.settings', JSON.stringify({ anim: 'off', quality: q })), process.env.Q || 'high');
await page.goto('http://localhost:4599/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (s) => page.waitForSelector(s).then(() => page.click(s));
const shot = (n) => page.screenshot({ path: `${process.env.OUT}/gl_${n}_${w}.png` });
await sleep(3500); await shot('menu');
await click('[data-id="play"]'); await sleep(800); await click('[data-start="pve"]'); await sleep(2500);
await click('[data-random]'); await sleep(1500); await shot('placement');
await click('[data-confirm]'); await page.waitForSelector('.battle'); await sleep(3000); await shot('battle');
// bắn vài lượt
for (let i = 0; i < 6; i++) { await page.evaluate(() => { const c = document.querySelector('.frow:not(:disabled)'); if (!c) return; c.click(); const cells = [...document.querySelectorAll('.b-enemy .g-cell')].filter((x) => !/c--(off|miss|hit|sunk)/.test(x.className)); const id = c.dataset.ship; if (id === 'submarine') document.querySelector('.b-enemy .g-handle[data-hrow="4"]').click(); else { cells[Math.floor(Math.random() * cells.length)].click(); if (id === 'destroyer') cells[Math.floor(Math.random() * cells.length)].click(); } document.querySelector('[data-fire]').click(); }); await sleep(1800); }
await shot('battle2');
console.log(JSON.stringify({ errs: errs.slice(0, 8) }));
await browser.close();
