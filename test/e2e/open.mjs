// Mở trang (file:// hoặc http://) và kiểm tra menu hiện, không lỗi console. Dùng: node test/e2e/open.mjs <url>. Xem hướng dẫn cài ở playthrough.mjs.
import puppeteer from 'puppeteer-core';
const url = process.argv[2];
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1300, height: 800 });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text()));
page.on('requestfailed', (r) => errs.push('failed: ' + r.url().slice(-60)));
await page.goto(url);
await new Promise((r) => setTimeout(r, 3000));
const menu = await page.$('.menu');
console.log(JSON.stringify({ menuRendered: !!menu, errs: errs.slice(0, 6) }));
if (process.env.OUT) await page.screenshot({ path: process.env.OUT });
await browser.close();
