// E2E giao diện, xem hướng dẫn chạy ở playthrough.mjs. Kiểm tra kéo thả khi con trỏ nằm GIỮA tàu.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 800 });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4599/?no3d');
const click = (s) => page.waitForSelector(s).then(() => page.click(s));
await click('.btn--primary'); await click('[data-start="pve"]');
const center = (sel) => page.$eval(sel, (e) => { const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
const cellC = (x, y) => center(`.place .g-cell[data-x="${x}"][data-y="${y}"]`);
/** Vị trí tàu trên lưới: "x:y:hướng" từ grid-column / grid-row. */
const pos = (id) => page.$eval(`.place .ship[data-ship="${id}"]`, (e) => {
  const c = e.style.gridColumn.split('/').map((t) => t.trim()), r = e.style.gridRow.split('/').map((t) => t.trim());
  return { x: +c[0] - 2, y: +r[0] - 2, w: c[1].startsWith('span') ? +c[1].slice(5) : 1, h: r[1].startsWith('span') ? +r[1].slice(5) : 1 };
});
const dragChip = async (id, x, y) => {
  const [sx, sy] = await center(`.chip--ship[data-id="${id}"]`); const [tx, ty] = await cellC(x, y);
  await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move((sx + tx) / 2, (sy + ty) / 2, { steps: 4 }); await page.mouse.move(tx, ty, { steps: 4 });
  const ghost = await page.$eval('.ship--ghost', (g) => { const b = g.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  await page.mouse.up();
  return { ghost, pointer: [tx, ty] };
};
const res = {};
// Số ô lẻ: con trỏ ở ô giữa. Carrier (5) thả ở cột 4 → ô gốc x=2 (2..6).
let d = await dragChip('carrier', 4, 4); res.carrier = await pos('carrier');
res.carrierGhostPointerInMiddleBlock = d.pointer[0] > d.ghost.x + 2 * d.ghost.w / 5 && d.pointer[0] < d.ghost.x + 3 * d.ghost.w / 5;
// Số ô chẵn: lấy ô gần nhất bên trái tâm. Destroyer (2) thả ở cột 7 → ô gốc x=7 (7..8). Missile (4) thả ở cột 5 → gốc x=4 (4..7).
await dragChip('destroyer', 7, 0); res.destroyer = await pos('destroyer');
await dragChip('missile', 5, 6); res.missile = await pos('missile');
// Tàu 3 ô thả sát mép trái: tâm ở cột 0 → ô gốc -1 → bị từ chối, vẫn còn trong khay.
await dragChip('cruiser', 0, 8); res.cruiserEdgeRejected = (await page.$('.chip--ship[data-id="cruiser"]')) !== null;
await dragChip('cruiser', 1, 8); res.cruiserAtCol1 = await pos('cruiser'); // gốc x=0
// Dọc: R xoay; submarine dọc 3 ô thả ở hàng 8 → gốc y=7.
await click('.chip--ship[data-id="submarine"]'); await page.keyboard.press('r');
await dragChip('submarine', 9, 8); res.submarineV = await pos('submarine');
// Kéo tàu đã đặt bằng bất kỳ ô nào: con trỏ vẫn nhảy về giữa tàu. Carrier (gốc x=2): bắt ở đầu tàu (2,4), thả ở (4,2) → gốc x=2,y=2.
const [hx, hy] = await cellC(2, 4); const [ex, ey] = await cellC(4, 2);
await page.mouse.move(hx, hy); await page.mouse.down(); await page.mouse.move(ex, ey, { steps: 8 }); await page.mouse.up();
res.carrierMoved = await pos('carrier');
// chạm khay rồi chạm ô: con trỏ cũng là giữa tàu
res.errors = errs;
console.log(JSON.stringify(res));
await page.screenshot({ path: process.env.OUT ? `${process.env.OUT}/place_sprites.png` : '/dev/null' });
await browser.close();
