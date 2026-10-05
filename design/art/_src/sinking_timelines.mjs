import fs from 'fs'
const A=process.argv[2]
const rows=[
 ['Khu trục hạm','lao mũi, đuôi dựng đứng',[[0,1000,'nổ thứ phát, tháp trước bật bay','#E8742A'],[1000,3600,'mũi chúi mạnh','#C9A227'],[3600,6000,'đuôi dựng, chân vịt lộ','#4FC3E8'],[6000,7200,'trượt hẳn, xoáy nước','#7F8E9B']]],
 ['Tuần dương','lật úp nặng nề',[[0,1200,'nổ dây chuyền 3 tháp','#E8742A'],[1200,4800,'nghiêng rất chậm','#C9A227'],[4800,6000,'lật úp','#4FC3E8'],[6000,7200,'nổi úp, chìm','#7F8E9B']]],
 ['Tàu tên lửa','cháy dây chuyền, đuôi chìm trước',[[0,1200,'nắp VLS bật tung','#E8742A'],[1200,4000,'tên lửa phóng loạn','#FF3B2F'],[4000,7200,'đuôi chìm trước, mũi chổng','#4FC3E8']]],
 ['Tàu ngầm','nén vỡ dưới sâu',[[0,1400,'tiềm vọng thụt, xả ballast','#4FC3E8'],[1400,4400,'lặn sâu, mờ dần','#3A4856'],[4400,5400,'nén vỡ + sóng','#FFE9A0'],[5400,7200,'bọt khí và dầu','#7F8E9B']]],
 ['Tàu sân bay','boong nổ liên hoàn, nghiêng lớn',[[0,1400,'nổ boong','#E8742A'],[1400,4400,'máy bay nổ lần lượt','#FF3B2F'],[4400,6600,'nghiêng 45°, đuôi nhấc','#C9A227'],[6600,7200,'bắt đầu chìm (+4000 đuôi)','#7F8E9B']]],
 ['Tàu cắn lén','lật nhanh, nổi úp, chìm',[[0,800,'giật','#E8742A'],[800,2800,'lật úp','#C9A227'],[2800,4800,'nổi úp','#4FC3E8'],[4800,7200,'chìm thẳng','#7F8E9B']]],
 ['Tàu hộ vệ','vỡ phòng thủ, chìm lệch',[[0,1200,'CIWS bắn loạn rồi tắt','#E8742A'],[1200,3600,'vòm radar bật, mồi nhử nổ','#FF3B2F'],[3600,6000,'một thân chìm trước','#C9A227'],[6000,7200,'thân còn lại chìm','#7F8E9B']]]]
const X0=250,W=900,T=7200
const o=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 ${rows.length*86+120}" width="1240" height="${rows.length*86+120}" font-family="monospace" font-size="12"><title>sinking timelines</title><rect width="1240" height="${rows.length*86+120}" fill="#0B1117"/>
<text x="20" y="30" fill="#4FC3E8" font-size="15">Hoạt cảnh chìm 3D: mỗi loại tàu một kiểu, dài 7200 ms (x1)</text>`]
for(let t=0;t<=T;t+=1200){const x=X0+t/T*W;o.push(`<path d="M${x} 50V${rows.length*86+70}" stroke="#1B2630"/><text x="${x}" y="46" fill="#7F8E9B" text-anchor="middle">${t}</text>`)}
rows.forEach(([n,sub,ph],i)=>{const y=70+i*86;o.push(`<text x="20" y="${y+22}" fill="#C9D4DC" font-size="14" font-weight="700">${n}</text><text x="20" y="${y+40}" fill="#7F8E9B">${sub}</text>`)
 ph.forEach(([a,b,l,c])=>{const x=X0+a/T*W,w=(b-a)/T*W;o.push(`<rect x="${x}" y="${y}" width="${w-2}" height="34" fill="${c}" fill-opacity=".85"/><text x="${x+5}" y="${y+21}" fill="#0B1117" font-weight="700" font-size="11">${l.length*6.4>w?l.slice(0,Math.floor(w/6.4)-1)+'…':l}</text>`)})})
o.push(`<text x="${X0}" y="${rows.length*86+98}" fill="#7F8E9B">Sau 7200 ms game cho chơi tiếp (hoặc sau 2400 ms nếu bật "Tàu chìm chạy nền"); tàu còn chìm nốt tối đa 4000 ms (không chặn). Có nút bỏ qua riêng cho cảnh chìm.</text></svg>`)
fs.writeFileSync(A+'/sinking_timelines.svg',o.join('\n'))
