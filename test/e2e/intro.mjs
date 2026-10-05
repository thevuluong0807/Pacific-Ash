// E2E giao diện: chụp chuyển động mở màn logo ở 350/800/1250/1700 ms (?no3d). Xem hướng dẫn ở playthrough.mjs.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 720 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4599/?no3d');
for (const ms of [350, 800, 1250, 1700]) { await new Promise((r) => setTimeout(r, ms === 350 ? 350 : 450)); await page.screenshot({ path: `${process.env.OUT}/intro_${ms}.png` }); }
await new Promise((r) => setTimeout(r, 1200));
console.log(JSON.stringify({ introGone: !(await page.$('.logo--intro')), errs }));
await browser.close();
