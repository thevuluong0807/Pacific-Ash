import fs from 'fs'
import * as M from './frags.mjs'
const A=process.argv[2]
const cell='<g id="cell"><rect x="1" y="1" width="98" height="98" fill="#0B1117" stroke="rgba(79,195,232,0.45)" stroke-width="1.4"/></g>'
const items=[
 ['unknown','<use href="#cell"/><path d="M1 50 H99 M50 1 V99" stroke="rgba(79,195,232,0.12)"/><path d="M50 50 L98 20" stroke="rgba(79,195,232,0.35)" stroke-width="2"/>'],
 ['miss (hố nước)',`<use href="#cell"/>${M.miss}`],
 ['hit (lỗ đạn nổ)',`<use href="#cell"/>${M.hit}`],
 ['sunk (dấu X)',`<use href="#cell"/>${M.sunk}`],
 ['own ship','<use href="#cell"/><rect x="10" y="10" width="80" height="80" fill="#4FC3E8" fill-opacity=".12" stroke="#4FC3E8" stroke-width="3"/>'],
 ['blocked',`<use href="#cell"/>${M.blocked}`],
 ['aim valid','<use href="#cell"/><rect x="6" y="6" width="88" height="88" fill="#E8742A" fill-opacity=".14"/><path d="M8 30 V8 H30 M70 8 H92 V30 M92 70 V92 H70 M30 92 H8 V70" fill="none" stroke="#E8742A" stroke-width="5"/><path d="M50 36 V64 M36 50 H64" stroke="#E8742A" stroke-width="3"/>'],
 ['aim invalid','<use href="#cell"/><rect x="6" y="6" width="88" height="88" fill="url(#stripe)" stroke="#FF3B2F" stroke-width="3" stroke-dasharray="10 6"/>'],
 ['target 1','<use href="#cell"/><rect x="6" y="6" width="88" height="88" fill="#E8742A" fill-opacity=".14" stroke="#E8742A" stroke-width="3"/><circle cx="50" cy="50" r="22" fill="#0B1117" stroke="#E8742A" stroke-width="4"/><text x="50" y="62" text-anchor="middle" font-size="34" font-weight="700" fill="#E8742A">1</text>'],
 ['target 2','<use href="#cell"/><rect x="6" y="6" width="88" height="88" fill="#E8742A" fill-opacity=".14" stroke="#E8742A" stroke-width="3"/><circle cx="50" cy="50" r="22" fill="#0B1117" stroke="#E8742A" stroke-width="4"/><text x="50" y="62" text-anchor="middle" font-size="34" font-weight="700" fill="#E8742A">2</text>'],
 ['torpedo lane','<use href="#cell"/><rect x="6" y="6" width="88" height="88" fill="#E8742A" fill-opacity=".14"/><path d="M14 50 H78 M56 28 L82 50 L56 72" fill="none" stroke="#E8742A" stroke-width="8" stroke-linecap="square"/>']]
const o=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1360 300" width="2040" height="450" font-family="monospace" font-size="11">
<!-- Marker trên lưới, mỗi ô 100x100. Ô đã bắn dùng hình ảnh hoang tàn: hố nước (miss), lỗ đạn nổ trên thép (hit), đống đổ nát + dầu (sunk). Mỗi loại có HÌNH DẠNG riêng, không chỉ khác màu. Nguồn dựng: art/_src/markers.mjs. -->
<title>grid markers</title>
<defs><pattern id="stripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="#FF3B2F" fill-opacity=".35"/></pattern>${M.defs}${cell}</defs>
<rect width="1360" height="300" fill="#05080B"/>`]
items.forEach(([t,b],i)=>{o.push(`<g transform="translate(${20+i*120},40)">${b}</g><text x="${20+i*120}" y="170" fill="#7F8E9B">${t}</text>`)})
o.push(`<text x="20" y="210" fill="#4FC3E8" font-size="12">Hit: lỗ cháy xé thép, mép kim loại cong ra, lõi than hồng nhấp nháy nhẹ (độ mờ lõi 0.85–1, 1.2 s). Sunk: ô của tàu đã chìm hiện lại sprite tàu (xám tối) kèm dấu X đỏ viền trắng trên mỗi ô; tĩnh. Miss: vành nước bắn ra rồi lặng trong markerPopMs.</text>
<text x="20" y="232" fill="#4FC3E8" font-size="12">Mọi marker phủ lên sprite tàu, không thay sprite. Hit và miss phải đọc được ở ô 32 px: chi tiết nhỏ (vết nứt, giọt) được phép mờ đi, hình khối chính thì không.</text></svg>`)
fs.writeFileSync(A+'/markers.svg',o.join('\n'))
// cập nhật 3 icon trong icons.svg
let s=fs.readFileSync(A+'/icons.svg','utf8')
for(const [id,sym] of [['i-hit',M.iconHit],['i-miss',M.iconMiss],['i-sunk',M.iconSunk]]){s=s.replace(new RegExp(`<symbol id="${id}"[\\s\\S]*?</symbol>`),sym)}
fs.writeFileSync(A+'/icons.svg',s)
