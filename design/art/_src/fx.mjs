import fs from 'fs'
const W=300,H=200,o=[];const p=s=>o.push(s)
p(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1560 920" width="1560" height="920" font-family="monospace" font-size="12"><title>FX storyboard</title>
<defs>
<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080B"/><stop offset="1" stop-color="#18222b"/></linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1a24"/><stop offset="1" stop-color="#04090d"/></linearGradient>
<radialGradient id="fb" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF3C4"/><stop offset=".3" stop-color="#FF9A2A"/><stop offset=".7" stop-color="#E8451C" stop-opacity=".8"/><stop offset="1" stop-color="#8B1A14" stop-opacity="0"/></radialGradient>
<radialGradient id="sm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#2a2f35" stop-opacity=".95"/><stop offset="1" stop-color="#14181c" stop-opacity="0"/></radialGradient>
<radialGradient id="wt" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E9F2F8" stop-opacity=".95"/><stop offset="1" stop-color="#8fb2c6" stop-opacity="0"/></radialGradient>
<linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9EFF4"/><stop offset=".5" stop-color="#9AA6B1"/><stop offset="1" stop-color="#4E5A66"/></linearGradient>
</defs><rect width="1560" height="920" fill="#0B1117"/>`)
const frame=(c,r,title,body)=>{const x=20+c*308,y=50+r*218;p(`<g transform="translate(${x},${y})"><clipPath id="c${c}${r}"><rect width="${W}" height="${H}"/></clipPath><g clip-path="url(#c${c}${r})"><rect width="${W}" height="${H}" fill="url(#sk)"/><rect y="132" width="${W}" height="68" fill="url(#sea)"/><path d="M0 132H${W}" stroke="#4a6a7e" stroke-opacity=".5"/>${body}</g><rect width="${W}" height="${H}" fill="none" stroke="#1B2630"/><text x="8" y="${H-8}" fill="#C9D4DC" font-size="11">${title}</text></g>`)}
const ship=(x,y,s=1,tilt=0,sink=0)=>`<g transform="translate(${x},${y+sink}) rotate(${tilt}) scale(${s})"><path d="M-70 0 H70 L58 14 H-60 Z" fill="url(#hl)" stroke="#0B1117" stroke-width="1.6"/><path d="M-20 0 V-12 H8 V0 M-6 -12 V-24" fill="#B9C4CE" stroke="#0B1117" stroke-width="1.4"/><rect x="28" y="-6" width="12" height="6" fill="#7E8B97" stroke="#0B1117"/><rect x="-52" y="-5" width="18" height="5" fill="#7E8B97" stroke="#0B1117"/></g>`
const flash=(x,y,r,col='#FFF3C4')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity=".9"/><circle cx="${x}" cy="${y}" r="${r*2.2}" fill="url(#fb)"/>`
const smoke=(x,y,n,h,w)=>Array.from({length:n},(_,i)=>`<circle cx="${x+Math.sin(i*1.7)*w*(i/n)}" cy="${y-h*i/n}" r="${8+i*3.2}" fill="url(#sm)"/>`).join('')
const ring=(x,y,r,ry,op=.6,col='#9fc4d6')=>`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${ry}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="2"/>`
const tit=(a,b)=>p(`<text x="20" y="${a}" fill="#4FC3E8" font-size="14">${b}</text>`)
// A: trúng
tit(38,'A  ĐẠN TRÚNG TÀU (0 → 1.8 s): cú chớp → cầu lửa → khói đen → lửa cháy kéo dài')
frame(0,0,'1 · lửa mõm + vệt đạn (0 ms)',ship(70,118,.9)+flash(112,106,6)+`<path d="M118 106 L270 118" stroke="#FFD27A" stroke-width="2.5" stroke-linecap="round"/><path d="M118 106 L270 118" stroke="#FF8A1F" stroke-width="7" stroke-opacity=".25" stroke-linecap="round"/>`)
frame(1,0,'2 · chớp trắng lõi 80 ms',ship(150,118,1.3)+`<circle cx="150" cy="112" r="34" fill="#fff" opacity=".95"/><circle cx="150" cy="112" r="64" fill="url(#fb)"/>`)
frame(2,0,'3 · cầu lửa + mảnh vỡ + sóng xung kích 400 ms',ship(150,118,1.3)+`<circle cx="150" cy="104" r="56" fill="url(#fb)"/>${Array.from({length:14},(_,i)=>{const a=i*.45,l=30+((i*37)%40);return `<path d="M150 104 L${150+Math.cos(a)*l*1.5} ${104-Math.abs(Math.sin(a))*l*1.4}" stroke="#FFC46B" stroke-width="2"/><rect x="${150+Math.cos(a)*l*1.55}" y="${104-Math.abs(Math.sin(a))*l*1.45}" width="4" height="3" fill="#8793A0"/>`}).join('')}${ring(150,132,70,10,.5)}`)
frame(3,0,'4 · khói đen đặc bốc lên, tia lửa',ship(150,118,1.3)+smoke(150,100,9,100,34)+`<circle cx="150" cy="108" r="26" fill="url(#fb)" opacity=".8"/>${Array.from({length:10},(_,i)=>`<circle cx="${130+i*6}" cy="${96-(i*13)%50}" r="1.6" fill="#FFB347"/>`).join('')}`)
frame(4,0,'5 · lửa nhỏ cháy suốt ván, khói mỏng',ship(150,118,1.3)+smoke(150,106,6,86,22)+`<path d="M146 112 Q140 96 150 86 Q150 100 160 96 Q158 108 154 112 Z" fill="#FF8A1F"/><path d="M149 112 Q146 102 151 96 Q152 104 156 104 Q155 110 153 112Z" fill="#FFE08A"/><circle cx="150" cy="108" r="30" fill="url(#fb)" opacity=".35"/>`)
// B: trượt
tit(262,'B  ĐẠN TRƯỢT (0 → 0.5 s): vòng sóng → cột nước → đổ xuống → gợn tắt')
frame(0,1,'1 · chạm nước, vòng sóng',ring(150,150,16,4,.9)+`<circle cx="150" cy="150" r="5" fill="#E9F2F8"/>`)
frame(1,1,'2 · cột nước vọt lên',ring(150,150,30,6,.7)+`<path d="M138 150 Q142 90 150 70 Q158 90 162 150 Z" fill="url(#wt)"/>`)
frame(2,1,'3 · đỉnh cột nước, giọt bắn',ring(150,150,46,8,.6)+`<path d="M132 150 Q138 80 150 50 Q162 80 168 150 Z" fill="url(#wt)"/><circle cx="150" cy="46" r="14" fill="url(#wt)"/>${Array.from({length:12},(_,i)=>`<circle cx="${120+i*5.5}" cy="${60+((i*29)%40)}" r="1.8" fill="#E9F2F8"/>`).join('')}`)
frame(3,1,'4 · đổ xuống, bọt trắng',ring(150,150,62,10,.5)+`<ellipse cx="150" cy="146" rx="40" ry="9" fill="url(#wt)"/><path d="M136 146 Q142 120 150 112 Q158 120 164 146 Z" fill="url(#wt)" opacity=".7"/>`)
frame(4,1,'5 · gợn lan ra rồi tắt',ring(150,150,74,12,.35)+ring(150,150,52,9,.3)+ring(150,150,30,6,.25))
// C: chìm
tit(480,'C  TÀU CHÌM (1.8 s): nổ dọc thân → nghiêng → mũi chìm → dầu loang và lửa trên nước')
frame(0,2,'1 · nổ lớn dọc thân',ship(150,118,1.4)+flash(110,108,18)+flash(150,110,22)+flash(190,110,16)+ring(150,132,90,12,.5))
frame(1,2,'2 · nghiêng ~15°, lửa và khói',ship(150,118,1.4,-15)+smoke(130,100,8,90,30)+`<circle cx="130" cy="108" r="30" fill="url(#fb)"/>`)
frame(2,2,'3 · nghiêng ~30°, mũi chìm trước',ship(150,126,1.4,-30,8)+smoke(120,110,8,80,26)+`<circle cx="190" cy="132" r="26" fill="url(#wt)" opacity=".6"/>${ring(190,134,40,7,.5)}`)
frame(3,2,'4 · chỉ còn đuôi, bọt khí, mảnh vỡ',ship(100,150,1.2,-48,16)+`${Array.from({length:12},(_,i)=>`<circle cx="${130+i*14}" cy="${140+((i*17)%26)}" r="${2+(i%3)}" fill="#cfe3ee" opacity=".7"/>`).join('')}<rect x="200" y="136" width="14" height="4" fill="#6a7682" transform="rotate(20 200 136)"/><rect x="230" y="142" width="10" height="3" fill="#6a7682"/>`)
frame(4,2,'5 · dầu loang đen, lửa trên mặt nước',`<ellipse cx="150" cy="150" rx="110" ry="14" fill="#06090b" opacity=".9"/><path d="M110 148 Q106 132 114 124 Q114 136 122 134 Q120 144 118 148Z" fill="#FF8A1F"/><path d="M180 150 Q176 138 183 130 Q183 140 190 138 Q188 146 186 150Z" fill="#FF8A1F"/><circle cx="116" cy="140" r="26" fill="url(#fb)" opacity=".4"/>${smoke(116,126,5,60,14)}<rect x="40" y="26" width="220" height="30" fill="#0B1117" opacity=".8" stroke="#4FC3E8"/><text x="150" y="46" fill="#C9D4DC" text-anchor="middle" font-size="13">Đã đánh chìm: Khu trục hạm</text>`)
// D: tên lửa
tit(698,'D  TÊN LỬA CHÙM (3.4 s): nắp ô mở → 5 quả lên → vòng → lao xuống → 5 vụ nổ hình chữ thập')
const cell=(x,y,s)=>`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#0B1117" stroke="rgba(79,195,232,.35)"/>`
frame(0,3,'1 · nắp ô phóng mở, khói cột',ship(150,126,1.3)+`<rect x="130" y="108" width="12" height="3" fill="#E08A2E"/><rect x="150" y="108" width="12" height="3" fill="#E08A2E"/>${smoke(136,108,6,70,10)}${smoke(156,108,6,64,10)}<circle cx="146" cy="110" r="12" fill="url(#fb)"/>`)
frame(1,3,'2 · 5 quả bay lên, vệt khói trắng',`${[0,1,2,3,4].map(i=>`<path d="M${110+i*20} 130 L${110+i*20+(i-2)*6} ${50-i*3}" stroke="#E9EFF4" stroke-width="5" stroke-opacity=".5"/><rect x="${106+i*20+(i-2)*6}" y="${44-i*3}" width="8" height="14" fill="#C9D4DC" stroke="#0B1117"/><circle cx="${110+i*20}" cy="132" r="6" fill="url(#fb)"/>`).join('')}`)
frame(2,3,'3 · bay vòng trên cao (camera kéo lên)',`${[0,1,2,3,4].map(i=>`<path d="M${60+i*18} 150 Q${100+i*30} -10 ${260-i*12} ${80+i*8}" fill="none" stroke="#E9EFF4" stroke-opacity=".5" stroke-width="3"/><rect x="${255-i*12}" y="${76+i*8}" width="10" height="5" fill="#C9D4DC" stroke="#0B1117"/>`).join('')}`)
const grid=(ox,oy,s)=>Array.from({length:7},(_,y)=>Array.from({length:9},(_,x)=>cell(ox+x*s,oy+y*s,s)).join('')).join('')
frame(3,3,'4 · lao xuống, nhắm 5 ô (nhìn từ trên)',grid(42,20,24)+[[4,3],[4,2],[5,3],[4,4],[3,3]].map(([x,y])=>`<rect x="${42+x*24}" y="${20+y*24}" width="24" height="24" fill="#E8742A" fill-opacity=".25" stroke="#E8742A" stroke-width="2"/><path d="M${54+x*24} ${y*24-30} V${32+y*24}" stroke="#E9EFF4" stroke-width="3"/>`).join(''))
frame(4,3,'5 · 5 vụ nổ, khói chùm',grid(42,20,24)+[[4,3],[4,2],[5,3],[4,4],[3,3]].map(([x,y],i)=>i%2?`<circle cx="${54+x*24}" cy="${32+y*24}" r="14" fill="url(#wt)"/>${ring(54+x*24,32+y*24,18,18,.8)}`:`<circle cx="${54+x*24}" cy="${32+y*24}" r="18" fill="url(#fb)"/>`).join(''))
p('</svg>')
fs.writeFileSync(process.argv[2]+'/fx_storyboard.svg',o.join('\n'))
