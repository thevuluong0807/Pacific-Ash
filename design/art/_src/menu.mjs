import fs from 'fs'
const A=process.argv[2]
let seed=5;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647
const f=n=>+n.toFixed(1)
let logo=fs.readFileSync(A+'/logo.svg','utf8').replace(/<\?xml[^>]*>/,'').replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title>.*?<\/title>/,'')
for(const i of new Set([...logo.matchAll(/id="([^"]+)"/g)].map(m=>m[1])))logo=logo.split(`id="${i}"`).join(`id="lg_${i}"`).split(`url(#${i})`).join(`url(#lg_${i})`).split(`#${i})`).join(`#lg_${i})`)
const icons=fs.readFileSync(A+'/icons.svg','utf8').match(/<defs>([\s\S]*?)<\/defs>/)[1]
const o=[],p=s=>o.push(s)
const flame=(x,y,h,w)=>`<path transform="translate(${f(x)},${f(y)})" d="M${f(-w/2)} 0 Q${f(-w*.62)} ${f(-h*.4)} ${f(-w*.12)} ${f(-h*.62)} Q${f(-w*.05)} ${f(-h*.85)} ${f(w*.06)} ${f(-h)} Q${f(w*.12)} ${f(-h*.62)} ${f(w*.52)} ${f(-h*.4)} Q${f(w*.62)} ${f(-h*.15)} ${f(w/2)} 0Z" fill="url(#fl)"/>`
const smoke=(x,y,h,w,n=7)=>Array.from({length:n},(_,i)=>`<circle cx="${f(x+Math.sin(i*1.4)*w*(i/n))}" cy="${f(y-h*i/n)}" r="${f(14+i*8)}" fill="url(#sm)"/>`).join('')
const palm=(x,y,h,k=1)=>`<g transform="translate(${x},${y}) scale(${k})"><path d="M0 0 Q${-h*.1} ${-h*.5} ${h*.08} ${-h}" fill="none" stroke="#070305" stroke-width="7" stroke-linecap="round"/>${[-70,-35,10,45,80,120].map(a=>`<path d="M${h*.08} ${-h} q${Math.cos(a*Math.PI/180)*h*.4} ${Math.sin(a*Math.PI/180)*h*.18-h*.08} ${Math.cos(a*Math.PI/180)*h*.55} ${h*.12}" fill="none" stroke="#070305" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>`
const ship=(x,y,s,rot,sink=0)=>`<g transform="translate(${x},${y}) rotate(${rot}) scale(${s})"><path d="M-70 -8 H66 L52 14 H-56Z" fill="#070305"/><rect x="-34" y="-30" width="44" height="22" fill="#070305"/><rect x="-18" y="-46" width="16" height="16" fill="#070305"/><path d="M26 -8 V-22 H44 V-8" fill="#070305"/>${flame(-14,-46,60,26)}</g>`
p(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" font-family="'Barlow Condensed','Arial Narrow',Arial,sans-serif"><title>menu mock truong sa</title>
<defs>${icons}
<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0710"/><stop offset=".45" stop-color="#2b1424"/><stop offset=".72" stop-color="#8a3216"/><stop offset=".86" stop-color="#e0661f"/><stop offset="1" stop-color="#ff9a3a"/></linearGradient>
<linearGradient id="se" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1a14"/><stop offset=".4" stop-color="#150a0c"/><stop offset="1" stop-color="#050306"/></linearGradient>
<linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a4a44"/><stop offset="1" stop-color="#14262a"/></linearGradient>
<linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFE9A0"/><stop offset=".25" stop-color="#FFA21F"/><stop offset=".65" stop-color="#E8451C"/><stop offset="1" stop-color="#8B1A14" stop-opacity="0"/></linearGradient>
<radialGradient id="sm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1a1014" stop-opacity=".9"/><stop offset="1" stop-color="#1a1014" stop-opacity="0"/></radialGradient>
<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a"/><stop offset=".3" stop-color="#ff7a1a" stop-opacity=".75"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>
<filter id="bl"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="1600" height="900" fill="url(#sk)"/>
<!-- vùng giữa THOÁNG: chỉ có mặt trời thấp, chân trời, mặt biển -->
<circle cx="800" cy="640" r="300" fill="url(#gl)"/><rect x="560" y="636" width="480" height="3" fill="#ffd27a" opacity=".6"/>
<g fill="#14090f"><path d="M0 220 Q160 170 320 224 Q480 180 600 230 L600 290 L0 290Z"/><path d="M1000 200 Q1160 160 1300 210 Q1460 170 1600 214 L1600 280 L1000 280Z"/><path d="M0 330 Q200 300 380 340 L380 372 L0 372Z"/><path d="M1180 320 Q1380 290 1600 330 L1600 380 L1180 380Z"/></g>
<g fill="none" stroke="#ff7a1a" stroke-opacity=".5" stroke-width="2"><path d="M0 290 Q160 270 320 292 Q480 274 600 292"/><path d="M1000 280 Q1160 262 1300 284 Q1460 268 1600 282"/></g>
<rect y="650" width="1600" height="250" fill="url(#se)"/><path d="M0 650H1600" stroke="#ff8a3a" stroke-opacity=".6" stroke-width="2"/>
<g stroke="#ff9a3a" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"><path d="M680 668H920"/><path d="M640 690H960"/><path d="M690 716H910"/><path d="M730 748H870"/><path d="M760 790H840"/></g>
<!-- ===== BÊN TRÁI (dày) ===== -->
<ellipse cx="240" cy="672" rx="360" ry="30" fill="url(#sh)"/>
<path d="M-20 676 Q80 620 220 626 Q380 600 520 636 Q580 650 600 676Z" fill="#241414"/><path d="M-10 676 Q90 636 230 640 Q380 620 510 650 Q560 660 580 676Z" fill="#5a4234"/>
<path d="M40 668 Q200 650 380 656" fill="none" stroke="#ff9a3a" stroke-opacity=".5" stroke-width="3"/>
${palm(70,650,150)}${palm(150,652,190,.9)}${palm(430,640,140)}${palm(520,650,110,.8)}
<g transform="translate(300,640) rotate(10)"><path d="M-14 0 L-8 -150 H8 L14 0Z" fill="#070305"/><rect x="-14" y="-170" width="28" height="20" fill="#070305"/>${flame(0,-170,100,46)}</g>
<path d="M300 480 Q270 400 310 330 Q290 260 330 210" fill="none" stroke="#15090c" stroke-opacity=".9" stroke-width="34" stroke-linecap="round"/>
<circle cx="150" cy="650" r="62" fill="url(#gl)"/><circle cx="150" cy="650" r="18" fill="#fff0b0"/>
<path d="M130 640 Q96 560 130 500 Q100 440 150 400 Q210 390 226 440 Q260 480 220 520 Q210 580 180 640Z" fill="#1a0f12" fill-opacity=".95"/><path d="M140 620 Q116 560 138 500" fill="none" stroke="#ff7a1a" stroke-opacity=".6" stroke-width="5"/>
<g fill="#ffb347">${Array.from({length:14},()=>`<circle cx="${f(40+rnd()*300)}" cy="${f(380+rnd()*260)}" r="${f(1.5+rnd()*2.5)}"/>`).join('')}</g>
<ellipse cx="420" cy="746" rx="120" ry="12" fill="#050306" opacity=".85"/>${ship(420,730,1.3,52)}<rect x="320" y="736" width="220" height="40" fill="#150a0c" opacity=".82"/><path d="M330 736H530" stroke="#ffd9b0" stroke-opacity=".6" stroke-width="3"/>
<g stroke="#ffd9b0" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"><path d="M20 690H140M170 696H330M360 692H520"/></g>
<ellipse cx="540" cy="700" rx="90" ry="9" fill="#070305"/>
<!-- ===== BÊN PHẢI (dày) ===== -->
<ellipse cx="1360" cy="672" rx="300" ry="26" fill="url(#sh)"/><path d="M1080 676 Q1200 640 1340 646 Q1500 630 1640 668Z" fill="#241414"/><path d="M1100 676 Q1210 650 1340 654 Q1480 642 1620 672Z" fill="#5a4234"/>
${palm(1560,660,130,.9)}${palm(1130,664,100,.8)}
<g transform="translate(1390,660) scale(2.3)"><g stroke="#050306" stroke-width="3" fill="none"><path d="M-30 -52 L-36 0 M0 -52 L0 0 M30 -52 L36 0 M-33 -26 H33 M-30 -52 L28 -4 M28 -52 L-30 -4"/></g><rect x="-44" y="-66" width="88" height="16" fill="#070305"/><rect x="-14" y="-84" width="28" height="18" fill="#070305"/><path d="M26 -66 V-110 M20 -104 H38" stroke="#070305" stroke-width="3"/>${flame(-4,-84,70,30)}${flame(30,-66,44,20)}</g>
<circle cx="1390" cy="540" r="90" fill="url(#gl)" opacity=".7"/>
<path d="M1390 470 Q1340 380 1400 300 Q1360 230 1420 160" fill="none" stroke="#15090c" stroke-opacity=".9" stroke-width="38" stroke-linecap="round"/>
<ellipse cx="1210" cy="742" rx="130" ry="12" fill="#050306" opacity=".85"/>${ship(1210,728,1.5,20)}<rect x="1090" y="736" width="240" height="40" fill="#150a0c" opacity=".82"/><path d="M1100 736H1320" stroke="#ffd9b0" stroke-opacity=".6" stroke-width="3"/>
<path d="M1220 700 Q1196 640 1230 600" fill="none" stroke="#15090c" stroke-opacity=".9" stroke-width="22" stroke-linecap="round"/>
<g transform="translate(1520,650) scale(1.6)"><path d="M-70 -8 H66 L52 14 H-56Z" fill="#050306"/><rect x="-34" y="-30" width="44" height="22" fill="#050306"/>${flame(-14,-30,50,22)}</g>
<path d="M1520 612 Q1496 560 1526 520" fill="none" stroke="#15090c" stroke-opacity=".9" stroke-width="20" stroke-linecap="round"/>
<g stroke="#ffd27a" stroke-opacity=".7" stroke-width="3" stroke-dasharray="14 8" fill="none"><path d="M1590 60 Q1380 40 1180 560"/><path d="M1560 120 Q1400 100 1260 560"/><path d="M40 90 Q200 60 360 600"/></g>
<g fill="#ffb347">${Array.from({length:24},()=>`<circle cx="${f(1080+rnd()*500)}" cy="${f(300+rnd()*340)}" r="${f(1.5+rnd()*2.5)}"/>`).join('')}</g>
<g stroke="#ffd9b0" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"><path d="M1090 690H1220M1250 694H1400M1430 690H1590"/></g>
<!-- tro lửa lác đác ở giữa -->
<g fill="#ffb347" opacity=".7">${Array.from({length:10},()=>`<circle cx="${f(600+rnd()*400)}" cy="${f(300+rnd()*340)}" r="${f(1+rnd()*1.5)}"/>`).join('')}</g>
<!-- ===== UI GIỮA ===== -->
<g transform="translate(300,10) scale(.714)">${logo}</g>
`)
const btn=(y,t,primary)=>`<g><rect x="590" y="${y}" width="420" height="64" fill="${primary?'#FF3B2F':'#121A22'}" fill-opacity="${primary?1:.9}" stroke="${primary?'#fff':'#7A8A99'}" stroke-opacity="${primary?.0:.6}"/><path d="M590 ${y+12}V${y}H602 M998 ${y+64}H1010V${y+52}" fill="none" stroke="${primary?'#fff':'#4FC3E8'}" stroke-width="3" stroke-opacity=".8"/><text x="800" y="${y+43}" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="8" fill="#fff">${t}</text></g>`
p(btn(540,'CHƠI',true)+btn(620,'KHÍ TÀI')+btn(700,'CÀI ĐẶT'))
p(`<rect x="24" y="24" width="52" height="52" fill="#121A22" fill-opacity=".9" stroke="#7A8A99" stroke-opacity=".6"/><use href="#i-sound" x="34" y="34" width="32" height="32" color="#C9D4DC"/><text x="1576" y="880" text-anchor="end" font-family="monospace" font-size="13" fill="#7F8E9B">v0.1</text></svg>`)
fs.writeFileSync(A+'/ui_menu_mock_truong_sa.svg',o.join('\n'))
