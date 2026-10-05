// Cảnh Trường Sa 1600x900 dùng chung cho thumbnail, mock Menu, mock Trận. Trả {defs, body}.
let seed=17;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647
const f=n=>+n.toFixed(1)
const flame=(x,y,h,w,op=1)=>`<path transform="translate(${f(x)},${f(y)})" d="M${f(-w/2)} 0 Q${f(-w*.62)} ${f(-h*.4)} ${f(-w*.12)} ${f(-h*.62)} Q${f(-w*.05)} ${f(-h*.85)} ${f(w*.06)} ${f(-h)} Q${f(w*.12)} ${f(-h*.62)} ${f(w*.52)} ${f(-h*.4)} Q${f(w*.62)} ${f(-h*.15)} ${f(w/2)} 0Z" fill="url(#fl)" opacity="${op}"/>`
const smoke=(x,y,h,w,n=7)=>Array.from({length:n},(_,i)=>`<circle cx="${f(x+Math.sin(i*1.4)*w*(i/n))}" cy="${f(y-h*i/n)}" r="${f(12+i*7)}" fill="url(#sm)"/>`).join('')
const palm=(x,y,h,k=1,lean=1)=>`<g transform="translate(${x},${y}) scale(${k})"><path d="M0 0 Q${-h*.12*lean} ${-h*.5} ${h*.1*lean} ${-h}" fill="none" stroke="#070305" stroke-width="7" stroke-linecap="round"/>${[-70,-35,10,45,80,120].map(a=>`<path d="M${h*.1*lean} ${-h} q${Math.cos(a*Math.PI/180)*h*.4} ${Math.sin(a*Math.PI/180)*h*.18-h*.08} ${Math.cos(a*Math.PI/180)*h*.55} ${h*.12}" fill="none" stroke="#070305" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>`
const rock=(x,y,w,h)=>`<path d="M${x} ${y} L${x+w*.2} ${y-h} L${x+w*.55} ${y-h*.7} L${x+w*.8} ${y-h*.95} L${x+w} ${y}Z" fill="#0d0709"/>`
// chiến hạm silhouette, dir=1 mũi phải, -1 mũi trái
const ship=(x,y,k,dir=1,fire=true,rot=0)=>`<g transform="translate(${x},${y}) scale(${dir*k},${k}) rotate(${rot})"><path d="M-110 -10 H100 L124 -34 L128 -34 L112 16 H-96Z" fill="#070305" stroke="#3a2420" stroke-width="2"/><rect x="-60" y="-34" width="62" height="24" fill="#070305"/><rect x="-36" y="-56" width="26" height="22" fill="#070305"/><path d="M-26 -56 V-86 M-34 -76 H-18" stroke="#070305" stroke-width="3"/><rect x="-78" y="-28" width="12" height="18" fill="#070305"/><rect x="10" y="-26" width="34" height="16" fill="#070305"/><rect x="62" y="-24" width="30" height="14" fill="#070305"/><rect x="88" y="-20" width="28" height="4" fill="#070305"/><path d="M-110 -10 H100 L124 -34" fill="none" stroke="#ff9a3a" stroke-opacity=".7" stroke-width="2"/>${fire?`<g transform="translate(26,-26)">${flame(0,0,34,16,.95)}</g><circle cx="26" cy="-30" r="14" fill="url(#gl)" opacity=".8"/>`:''}</g>`
// tên lửa đang bay: đường cong bậc 2, đầu tên lửa ở t
const missile=(p0,p1,p2,t=.62)=>{const B=(t)=>[ (1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0], (1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1] ];const [x,y]=B(t),dx=2*(1-t)*(p1[0]-p0[0])+2*t*(p2[0]-p1[0]),dy=2*(1-t)*(p1[1]-p0[1])+2*t*(p2[1]-p1[1]),a=Math.atan2(dy,dx)*180/Math.PI
 return `<path d="M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f(700*t)} 2000"/><path d="M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}" fill="none" stroke="#f3e6d6" stroke-opacity=".85" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="${f(700*t)} 2000"/><g transform="translate(${f(x)},${f(y)}) rotate(${f(a)})"><path d="M-14 -3.5 L8 0 L-14 3.5Z" fill="#fff" stroke="#05080b" stroke-width="1"/><path d="M-14 0 L-26 -4 L-26 4Z" fill="#FFB347"/><circle cx="-26" cy="0" r="6" fill="url(#gl)"/></g>`}
export function scene(o={}){
 const defs=`<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0710"/><stop offset=".42" stop-color="#2b1424"/><stop offset=".7" stop-color="#8a3216"/><stop offset=".86" stop-color="#e0661f"/><stop offset="1" stop-color="#ff9a3a"/></linearGradient>
<linearGradient id="se" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a3420"/><stop offset=".25" stop-color="#3a1d18"/><stop offset=".6" stop-color="#1c0f12"/><stop offset="1" stop-color="#0c070a"/></linearGradient>
<linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a8a82"/><stop offset="1" stop-color="#1d3a3c"/></linearGradient>
<linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFE9A0"/><stop offset=".25" stop-color="#FFA21F"/><stop offset=".65" stop-color="#E8451C"/><stop offset="1" stop-color="#8B1A14" stop-opacity="0"/></linearGradient>
<radialGradient id="sm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1a1014" stop-opacity=".9"/><stop offset="1" stop-color="#1a1014" stop-opacity="0"/></radialGradient>
<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a"/><stop offset=".3" stop-color="#ff7a1a" stop-opacity=".75"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>`
 const b=[]
 const p=s=>b.push(s)
 p(`<rect width="1600" height="900" fill="url(#sk)"/>`)
 p(`<circle cx="800" cy="640" r="300" fill="url(#gl)"/><rect x="560" y="636" width="480" height="3" fill="#ffd27a" opacity=".6"/>`)
 p(`<g fill="#14090f"><path d="M0 220 Q160 170 320 224 Q480 180 600 230 L600 290 L0 290Z"/><path d="M1000 200 Q1160 160 1300 210 Q1460 170 1600 214 L1600 280 L1000 280Z"/><path d="M0 330 Q200 300 380 340 L380 372 L0 372Z"/><path d="M1180 320 Q1380 290 1600 330 L1600 380 L1180 380Z"/></g><g fill="none" stroke="#ff7a1a" stroke-opacity=".5" stroke-width="2"><path d="M0 290 Q160 270 320 292 Q480 274 600 292"/><path d="M1000 280 Q1160 262 1300 284 Q1460 268 1600 282"/></g>`)
 // biển sáng hơn
 p(`<rect y="650" width="1600" height="250" fill="url(#se)"/><path d="M0 650H1600" stroke="#ffa24a" stroke-opacity=".7" stroke-width="2"/>`)
 p(`<g stroke="#ffb15a" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"><path d="M680 668H920"/><path d="M640 690H960"/><path d="M690 716H910"/><path d="M730 748H870"/><path d="M760 790H840"/></g>`)
 // quần đảo xa mờ (lớp xa) + vài đảo giữa rõ
 p(`<g fill="#1b0f12"><path d="M380 652 Q430 636 480 646 Q540 636 600 652Z"/><path d="M1000 652 Q1060 640 1110 648 Q1160 638 1230 652Z"/><path d="M600 652 Q640 644 680 652Z"/></g>`)
 // ====== QUẦN ĐẢO TRÁI (gần, rõ) ======
 p(`<ellipse cx="230" cy="690" rx="410" ry="38" fill="url(#sh)"/><ellipse cx="230" cy="686" rx="330" ry="26" fill="#6aa89a" opacity=".25"/>`)
 p(`<path d="M-30 696 Q70 614 220 620 Q400 590 560 628 Q640 648 660 696Z" fill="#241414"/><path d="M-20 696 Q80 630 230 636 Q400 612 548 648 Q612 662 640 696Z" fill="#6a5040"/><path d="M60 672 Q220 654 420 664" fill="none" stroke="#ffb15a" stroke-opacity=".6" stroke-width="3"/>`)
 p(rock(20,690,70,26)+rock(540,694,80,30)+rock(600,698,50,20))
 p(palm(70,660,170)+palm(150,658,210,.95,-1)+palm(250,642,150,.8)+palm(430,648,170)+palm(520,654,130,.8,-1)+palm(580,660,110,.7))
 p(`<g transform="translate(330,640) rotate(10)"><path d="M-14 0 L-8 -160 H8 L14 0Z" fill="#070305"/><rect x="-14" y="-180" width="28" height="20" fill="#070305"/>${flame(0,-180,100,46)}</g>`)
 p(`<path d="M330 460 Q300 380 340 310 Q320 240 360 190" fill="none" stroke="#15090c" stroke-opacity=".9" stroke-width="34" stroke-linecap="round"/>`)
 p(`<g fill="#070305"><path d="M470 650 L474 624 H520 L526 650Z"/><rect x="480" y="610" width="30" height="14"/></g><path d="M498 610 V590" stroke="#070305" stroke-width="3"/>`)
 p(`<circle cx="150" cy="650" r="62" fill="url(#gl)"/><circle cx="150" cy="650" r="18" fill="#fff0b0"/><path d="M130 640 Q96 560 130 500 Q100 440 150 400 Q210 390 226 440 Q260 480 220 520 Q210 580 180 640Z" fill="#1a0f12" fill-opacity=".95"/>`)
 p(`<g stroke="#ffe0bc" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"><path d="M-10 704H140M170 710H340M370 706H520M540 708H640"/></g>`)
 // ====== QUẦN ĐẢO PHẢI (gần, rõ) ======
 p(`<ellipse cx="1370" cy="690" rx="400" ry="36" fill="url(#sh)"/><ellipse cx="1370" cy="686" rx="320" ry="24" fill="#6aa89a" opacity=".25"/>`)
 p(`<path d="M960 696 Q1060 650 1200 650 Q1380 626 1560 640 Q1640 650 1660 696Z" fill="#241414"/><path d="M980 696 Q1070 664 1200 664 Q1380 644 1540 658 Q1610 666 1630 696Z" fill="#6a5040"/><path d="M1060 680 Q1240 666 1440 672" fill="none" stroke="#ffb15a" stroke-opacity=".6" stroke-width="3"/>`)
 p(rock(980,696,70,24)+rock(1560,696,70,26))
 p(palm(1530,664,150,.95,-1)+palm(1090,670,120,.85)+palm(1600,672,110,.8,-1)+palm(1010,676,100,.75))
 p(`<g transform="translate(1390,662) scale(2.4)"><g stroke="#050306" stroke-width="3" fill="none"><path d="M-30 -52 L-36 0 M0 -52 L0 0 M30 -52 L36 0 M-33 -26 H33 M-30 -52 L28 -4 M28 -52 L-30 -4"/></g><rect x="-44" y="-66" width="88" height="16" fill="#070305"/><rect x="-14" y="-84" width="28" height="18" fill="#070305"/><path d="M26 -66 V-110 M20 -104 H38" stroke="#070305" stroke-width="3"/>${flame(-4,-84,70,30)}${flame(30,-66,44,20)}</g>`)
 p(`<circle cx="1390" cy="540" r="90" fill="url(#gl)" opacity=".7"/><path d="M1390 470 Q1340 380 1400 300 Q1360 230 1420 160" fill="none" stroke="#15090c" stroke-opacity=".9" stroke-width="38" stroke-linecap="round"/>`)
 p(`<g fill="#070305"><path d="M1130 660 L1134 634 H1190 L1196 660Z"/><rect x="1146" y="620" width="34" height="14"/></g>${flame(1170,620,50,22)}`)
 p(`<g stroke="#ffe0bc" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"><path d="M950 706H1100M1130 712H1300M1330 708H1500M1520 710H1620"/></g>`)
 // ====== TÀU ĐẮM ======
 p(`<ellipse cx="410" cy="752" rx="100" ry="12" fill="#050306" opacity=".85"/>${ship(410,738,.95,1,false,50)}<rect x="320" y="744" width="200" height="40" fill="#1c0f12" opacity=".82"/><path d="M330 744H510" stroke="#ffe0bc" stroke-opacity=".6" stroke-width="3"/>${flame(440,730,50,26)}`)
 p(`<ellipse cx="1210" cy="748" rx="130" ry="12" fill="#050306" opacity=".85"/>${ship(1215,736,1.1,1,false,20)}<rect x="1110" y="744" width="220" height="40" fill="#1c0f12" opacity=".82"/><path d="M1100 740H1320" stroke="#ffe0bc" stroke-opacity=".6" stroke-width="3"/>`)
 p(`<path d="M1230 690 Q1206 630 1240 590" fill="none" stroke="#15090c" stroke-opacity=".9" stroke-width="22" stroke-linecap="round"/>`)
 // ====== TÀU ĐANG GIAO TRANH (bắn tên lửa qua nhau) ======
 // bên trái bắn sang phải
 p(ship(300,742,1.05,1,true))
 p(ship(120,730,.75,1,true))
 p(ship(480,712,.58,1,true))
 // bên phải bắn sang trái
 p(ship(1300,744,1.05,-1,true))
 p(ship(1500,728,.78,-1,true))
 p(ship(1130,712,.58,-1,true))
 // đường tên lửa: từ tàu trái sang phải và ngược lại, vòng cao
 p(missile([320,700],[760,-40],[1280,700],.6))
 p(missile([140,690],[700,40],[1160,660],.44))
 p(missile([500,690],[880,150],[1250,640],.7))
 p(missile([1280,700],[860,-20],[330,690],.62))
 p(missile([1480,690],[900,60],[470,640],.5))
 p(missile([1110,690],[780,150],[470,650],.72))
 // nổ do tên lửa trúng
 p(`<circle cx="1230" cy="640" r="40" fill="url(#gl)"/><circle cx="1230" cy="640" r="12" fill="#fff0b0"/><circle cx="470" cy="642" r="34" fill="url(#gl)"/><circle cx="470" cy="642" r="10" fill="#fff0b0"/>`)
 // khói các tàu
 p(smoke(300,712,70,18,5)+smoke(1300,714,70,-18,5))
 // tro lửa
 p(`<g fill="#ffb347">${Array.from({length:44},(_,i)=>{const side=i%2?1:0;const x=side?1060+rnd()*520:20+rnd()*520;return `<circle cx="${f(x)}" cy="${f(300+rnd()*360)}" r="${f(1.2+rnd()*2.4)}"/>`}).join('')}</g><g fill="#ffb347" opacity=".6">${Array.from({length:10},()=>`<circle cx="${f(600+rnd()*400)}" cy="${f(300+rnd()*340)}" r="${f(1+rnd()*1.4)}"/>`).join('')}</g>`)
 // vệt đạn sáng
 p(`<g stroke="#ffd27a" stroke-opacity=".6" stroke-width="3" stroke-dasharray="14 8" fill="none"><path d="M1590 60 Q1380 40 1180 560"/><path d="M40 90 Q200 60 360 600"/></g>`)
 return {defs,body:b.join('\n')}}
