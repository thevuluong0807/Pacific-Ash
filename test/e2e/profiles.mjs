// E2E giao diện, xem hướng dẫn chạy ở playthrough.mjs. Kiểm tra profile (Khí tài) và chọn tàu mang theo khi đặt tàu.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1300, height: 900 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.evaluateOnNewDocument(() => { if (!sessionStorage.getItem('init')) { localStorage.clear(); sessionStorage.setItem('init', '1'); localStorage.setItem('pacific-ash.settings', JSON.stringify({ anim: 'off' })); } });
await page.goto('http://localhost:4599/?no3d');
const click = (s) => page.waitForSelector(s).then(() => page.click(s));
const texts = (s) => page.$$eval(s, (a) => a.map((e) => e.textContent.trim().replace(/\s+/g, ' ')));
const count = (s) => page.$$eval(s, (a) => a.length);
const r = {};
await click('[data-id="armory"]');
r.defaultProfiles = await texts('.prow__name');
await click('[data-pnew]'); r.newSelected = await page.$eval('[data-pname]', (i) => i.value);
await page.$eval('[data-pname]', (i) => { i.value = ''; }); await page.type('[data-pname]', 'Săn ngầm'); await page.keyboard.press('Enter');
r.renamed = await page.$eval('[data-pname]', (i) => i.value);
await click('[data-sadd="submarine"]'); await click('[data-sadd="destroyer"]');
r.chips = await texts('.chips .chip');
await click('[data-pfav="p2"]');
r.profilesOrderAfterFav = await texts('.prow__name span');
await click('[data-sfav="carrier"]');
r.tileOrder = await texts('.tile__body span:not(.tile__art)');
await click('[data-pdrop="destroyer"]'); r.chipsAfterDrop = await texts('.chips .chip');
// đủ 5 tàu thì nút gắn của tàu khác bị vô hiệu: profile mặc định đã đủ
await click('.prow__name[data-psel="p1"]'); r.fullDisabled = await page.$$eval('[data-sadd]', (a) => a.filter((b) => b.disabled).length);
// xóa 2 bước profile mới
await click('.prow__name[data-psel="p2"]'); await click('[data-pdel]'); r.armedText = await page.$eval('[data-pdel]', (b) => b.textContent);
// giữ lại; quay ra tải lại trang để kiểm tra lưu
await page.reload(); await click('[data-id="armory"]'); r.persisted = await texts('.prow__name span');
await click('[data-back]');
// đặt tàu
await click('[data-id="play"]'); await click('[data-start="pve"]');
r.allViewOrder = await texts('.rrow__name');
await click('[data-bring="missile"]'); r.bringAfterLeave = await texts('[data-count]');
await click('[data-view="profile"]');
r.profileViewOrder = await texts('.rprof .rrow__name');
r.favFirst = r.profileViewOrder[0];
await click('[data-use]:not([disabled])'); r.trayAfterUse = await count('.chip--ship');
await click('[data-random]'); r.confirmEnabled = !(await page.$eval('[data-confirm]', (b) => b.disabled));
r.shipsOnGrid = await count('.place .ship');
await click('[data-confirm]');
await page.waitForSelector('.battle');
r.fleetCards = await count('.frow'); r.enemyUnknown = await count('.ef--unknown');
// chơi hết ván với hạm đội 1 tàu để kiểm tra giao diện không lỗi và kết quả hiển thị x/1
for (let i = 0; i < 800 && !(await page.$('.result')); i++) {
  await page.evaluate(() => {
    const card = document.querySelector('.frow:not(:disabled)'); if (!card) return;
    card.click();
    const id = card.dataset.ship;
    const cells = [...document.querySelectorAll('.b-enemy .g-cell')].filter((c) => !c.classList.contains('c--off') && !/c--(miss|hit|sunk)/.test(c.className));
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    if (id === 'submarine') document.querySelector(`.b-enemy .g-handle[data-hrow="${Math.floor(Math.random() * 10)}"]`).click();
    else if (id === 'destroyer') { rnd(cells).click(); rnd(document.querySelectorAll('.b-enemy .g-cell:not(.c--off):not(.c--sel)')).click(); }
    else rnd(cells).click();
    document.querySelector('[data-fire]').click();
  });
  await new Promise((r) => setTimeout(r, 30));
}
r.finished = !!(await page.$('.result'));
r.resultAlive = r.finished ? await texts('.stat-table tbody tr:last-child td') : null;
r.errors = errs;
console.log(JSON.stringify(r, null, 1));
await browser.close();
