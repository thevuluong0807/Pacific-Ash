import fs from 'fs'
const A=process.argv[2]
const rows=[
 ['Khu trục hạm','lao mũi, đuôi dựng đứng',[[0,1500,'nổ thứ phát, tháp trước bật bay','#E8742A'],[1500,5400,'mũi chúi mạnh','#C9A227'],[5400,9000,'đuôi dựng, chân vịt lộ','#4FC3E8'],[9000,10800,'trượt hẳn, xoáy nước','#7F8E9B']]],
 ['Tuần dương','lật úp nặng nề',[[0,1800,'nổ dây chuyền 3 tháp','#E8742A'],[1800,7200,'nghiêng rất chậm','#C9A227'],[7200,9000,'lật úp','#4FC3E8'],[9000,10800,'nổi úp, chìm','#7F8E9B']]],
 ['Tàu tên lửa','cháy dây chuyền, đuôi chìm trước',[[0,1800,'nắp VLS bật tung','#E8742A'],[1800,6000,'tên lửa phóng loạn','#FF3B2F'],[6000,10800,'đuôi chìm trước, mũi chổng','#4FC3E8']]],
 ['Tàu ngầm','nén vỡ dưới sâu',[[0,2100,'tiềm vọng thụt, xả ballast','#4FC3E8'],[2100,6600,'lặn sâu, mờ dần','#3A4856'],[6600,8100,'nén vỡ + sóng','#FFE9A0'],[8100,10800,'bọt khí và dầu','#7F8E9B']]],
 ['Tàu sân bay','boong nổ liên hoàn, nghiêng lớn',[[0,2100,'nổ boong','#E8742A'],[2100,6600,'máy bay nổ lần lượt','#FF3B2F'],[6600,9900,'nghiêng 45°, đuôi nhấc','#C9A227'],[9900,10800,'bắt đầu chìm (+6000 đuôi)','#7F8E9B']]],
 ['Tàu cắn lén','lật nhanh, nổi úp, chìm',[[0,1200,'giật','#E8742A'],[1200,4200,'lật úp','#C9A227'],[4200,7200,'nổi úp','#4FC3E8'],[7200,10800,'chìm thẳng','#7F8E9B']]],
 ['Tàu hộ vệ','vỡ phòng thủ, chìm lệch',[[0,1800,'CIWS bắn loạn rồi tắt','#E8742A'],[1800,5400,'vòm radar bật, mồi nhử nổ','#FF3B2F'],[5400,9000,'một thân chìm trước','#C9A227'],[9000,10800,'thân còn lại chìm','#7F8E9B']]]]
const X0=250,W=900,T=10800
const o=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 ${rows.length*86+120}" width="1240" height="${rows.length*86+120}" font-family="monospace" font-size="12"><title>sinking timelines</title><rect width="1240" height="${rows.length*86+120}" fill="#0B1117"/>
<text x="20" y="30" fill="#4FC3E8" font-size="15">Hoạt cảnh chìm 3D: mỗi loại tàu một kiểu, dài 10800 ms (x1)</text>`]
for(let t=0;t<=T;t+=1800){const x=X0+t/T*W;o.push(`<path d="M${x} 50V${rows.length*86+70}" stroke="#1B2630"/><text x="${x}" y="46" fill="#7F8E9B" text-anchor="middle">${t}</text>`)}
rows.forEach(([n,sub,ph],i)=>{const y=70+i*86;o.push(`<text x="20" y="${y+22}" fill="#C9D4DC" font-size="14" font-weight="700">${n}</text><text x="20" y="${y+40}" fill="#7F8E9B">${sub}</text>`)
 ph.forEach(([a,b,l,c])=>{const x=X0+a/T*W,w=(b-a)/T*W;o.push(`<rect x="${x}" y="${y}" width="${w-2}" height="34" fill="${c}" fill-opacity=".85"/><text x="${x+5}" y="${y+21}" fill="#0B1117" font-weight="700" font-size="11">${l.length*6.4>w?l.slice(0,Math.floor(w/6.4)-1)+'…':l}</text>`)})})
o.push(`<text x="${X0}" y="${rows.length*86+98}" fill="#7F8E9B">Sau 10800 ms game cho chơi tiếp (hoặc sau 3600 ms nếu bật "Tàu chìm chạy nền"); tàu còn chìm nốt tối đa 6000 ms (không chặn). Có nút bỏ qua riêng cho cảnh chìm.</text></svg>`)
fs.writeFileSync(A+'/sinking_timelines.svg',o.join('\n'))
