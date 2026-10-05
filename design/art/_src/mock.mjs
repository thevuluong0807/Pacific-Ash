import fs from 'fs'
import * as FR from './frags.mjs'
const A=process.argv[2]
const inner=f=>{const s=fs.readFileSync(`${A}/${f}_2d.svg`,'utf8');return s.replace(/<\?xml[^>]*>/,'').replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title>.*?<\/title>/,'').replace(/<!--[\s\S]*?-->/g,'')}
const NS={destroyer:2,cruiser:3,submarine:3,missile:4,carrier:5}
const sprite=(id,x,y,c,vert=false,extra='')=>{const n=NS[id];const body=`<svg width="${n*c}" height="${c}" viewBox="0 0 ${n*100} 100" ${extra}>${inner(id)}</svg>`;return vert?`<g transform="translate(${x+c},${y}) rotate(90)">${body}</g>`:`<g transform="translate(${x},${y})">${body}</g>`}
const icons=fs.readFileSync(`${A}/icons.svg`,'utf8').match(/<defs>([\s\S]*?)<\/defs>/)[1]
const o=[]; const p=s=>o.push(s)
const F="font-family=\"'Barlow Condensed','Arial Narrow',Arial,sans-serif\"", M="font-family=\"'JetBrains Mono',monospace\""
p(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900"><title>battle screen mock</title>
<defs>${icons}${FR.defs}
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080B"/><stop offset=".6" stop-color="#0d1820"/><stop offset="1" stop-color="#2a1a10"/></linearGradient>
<radialGradient id="glow" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="#ff7a1a" stop-opacity=".35"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
<pattern id="stripeI" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="#FF3B2F" fill-opacity=".35"/></pattern>
<radialGradient id="fireg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF3C4"/><stop offset=".35" stop-color="#FF8A1F"/><stop offset="1" stop-color="#FF3B2F" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1600" height="900" fill="url(#bg)"/><rect width="1600" height="900" fill="url(#glow)"/>`)
// skyline xa
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647
for(let x=0;x<1600;x+=22){const h=40+rnd()*150;p(`<rect x="${x}" y="${900-h}" width="20" height="${h}" fill="#070d12"/>`);if(rnd()<.35)p(`<rect x="${x+5}" y="${900-h+rnd()*h*.8}" width="4" height="5" fill="#ff8a1f" opacity=".8"/>`)}
for(let i=0;i<120;i++){const x=(i*137.5)%1600,y=(i*71.3)%900;p(`<path d="M${x} ${y}l-8 26" stroke="#9fb8cc" stroke-opacity=".12" stroke-width="1.2"/>`)}
const panel=(x,y,w,h)=>p(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#121A22" fill-opacity=".86" stroke="rgba(122,138,153,.4)"/><path d="M${x} ${y+10}V${y}H${x+10}" fill="none" stroke="#4FC3E8" stroke-width="2"/><path d="M${x+w-10} ${y+h}H${x+w}V${y+h-10}" fill="none" stroke="#4FC3E8" stroke-width="2"/>`)
const txt=(x,y,t,sz,fill,ex='')=>p(`<text x="${x}" y="${y}" font-size="${sz}" fill="${fill}" ${ex}>${t}</text>`)
// thanh trên
panel(24,16,1552,52)
txt(48,50,'LƯỢT 12 · CỦA BẠN',28,'#C9D4DC',F+' font-weight="700" letter-spacing="3"')
txt(1180,48,'TỐC ĐỘ',14,'#7F8E9B',M);p(`<rect x="1250" y="30" width="60" height="28" fill="#1B2630" stroke="#4FC3E8"/>`);txt(1280,50,'x1',16,'#4FC3E8',M+' text-anchor="middle"')
p(`<use href="#i-gear" x="1500" y="26" width="32" height="32" color="#C9D4DC"/>`)
// panel đội
panel(24,84,330,792)
txt(46,118,'ĐỘI CỦA BẠN',20,'#4FC3E8',F+' font-weight="700" letter-spacing="3"')
const fleet=[['destroyer','Khu trục hạm',[1,1],'ready',0],['cruiser','Tuần dương',[1,1,1],'cd',1],['submarine','Tàu ngầm',[1,1,1],'cd',2],['missile','Tàu tên lửa',[1,1,0,1],'sel',0],['carrier','Tàu sân bay',[1,1,1,1,1],'cd',3]]
fleet.forEach(([id,name,pips,st,cd],i)=>{const y=136+i*146;const sel=st==='sel'
 p(`<rect x="40" y="${y}" width="298" height="130" fill="${sel?'#E8742A':'#1B2630'}" fill-opacity="${sel?.14:.7}" stroke="${sel?'#E8742A':'#3A4856'}" stroke-width="${sel?2.5:1}"/>`)
 const dim=st==='cd'
 p(`<use href="#ship-${id}" x="52" y="${y+12}" width="96" height="48" color="${dim?'#7F8E9B':'#C9D4DC'}"/>`)
 txt(160,y+34,name,22,dim?'#7F8E9B':'#C9D4DC',F+' font-weight="700" letter-spacing="1"')
 const lbl={destroyer:'Pháo nhanh',cruiser:'Pháo chính',submarine:'Ngư lôi',missile:'Tên lửa chùm',carrier:'Không kích'}[id]
 txt(160,y+54,lbl,13,'#7F8E9B',M)
 pips.forEach((v,k)=>p(`<rect x="${52+k*22}" y="${y+78}" width="16" height="16" fill="${v?'#4FC3E8':'none'}" stroke="#4FC3E8" stroke-width="2"/>${v?'':`<path d="M${52+k*22} ${y+78}l16 16" stroke="#FF3B2F" stroke-width="2"/>`}`))
 if(st==='cd'){p(`<use href="#i-cooldown" x="52" y="${y+100}" width="22" height="22" color="#C9A227"/>`);txt(80,y+117,`HỒI CHIÊU ${cd}`,13,'#C9A227',M)}
 else{p(`<use href="#i-check" x="52" y="${y+100}" width="22" height="22" color="#5BD98A"/>`);txt(80,y+117,sel?'ĐANG CHỌN':'SẴN SÀNG',13,sel?'#E8742A':'#5BD98A',M)}})
// lưới địch
const C=50,GX=470,GY=150
panel(GX-44,GY-44,C*10+60,C*10+60)
txt(GX-30,GY-52+0,'',1,'#000')
txt(GX+(C*10)/2,GY-66+0,'LƯỚI ĐỊCH',20,'#E8742A',F+' font-weight="700" letter-spacing="3" text-anchor="middle"')
'ABCDEFGHIJ'.split('').forEach((l,i)=>txt(GX+i*C+C/2,GY-10,l,13,'#7F8E9B',M+' text-anchor="middle"'))
for(let i=0;i<10;i++)txt(GX-12,GY+i*C+C/2+5,String(i+1),13,'#7F8E9B',M+' text-anchor="end"')
for(let y=0;y<10;y++)for(let x=0;x<10;x++)p(`<rect x="${GX+x*C}" y="${GY+y*C}" width="${C}" height="${C}" fill="#0B1117" stroke="rgba(79,195,232,0.3)"/>`)
// tàu địch đã chìm lộ ra
p(`<g style="filter:grayscale(.85) brightness(.55)">${sprite('destroyer',GX+7*C,GY+1*C,C)}</g>`)
const mk=(x,y,kind)=>{const cx=GX+x*C+C/2,cy=GY+y*C+C/2,s=C/100;
 if(kind==='miss')p(`<g transform="translate(${cx-C/2},${cy-C/2}) scale(${s})">${FR.miss}</g>`)
 if(kind==='hit')p(`<g transform="translate(${cx-C/2},${cy-C/2}) scale(${s})">${FR.hit}</g>`)
 if(kind==='sunk')p(`<g transform="translate(${cx-C/2},${cy-C/2}) scale(${s})">${FR.sunk}</g>`)
 if(kind==='aim')p(`<g transform="translate(${cx-C/2},${cy-C/2}) scale(${s})"><rect x="6" y="6" width="88" height="88" fill="#E8742A" fill-opacity=".2"/><path d="M8 30 V8 H30 M70 8 H92 V30 M92 70 V92 H70 M30 92 H8 V70" fill="none" stroke="#E8742A" stroke-width="5"/></g>`)
 if(kind==='aimc')p(`<g transform="translate(${cx-C/2},${cy-C/2}) scale(${s})"><rect x="6" y="6" width="88" height="88" fill="#E8742A" fill-opacity=".32"/><path d="M8 30 V8 H30 M70 8 H92 V30 M92 70 V92 H70 M30 92 H8 V70" fill="none" stroke="#E8742A" stroke-width="5"/><path d="M50 36 V64 M36 50 H64" stroke="#E8742A" stroke-width="4"/></g>`)}
;[[2,2],[5,1],[1,5],[3,7],[8,4],[9,8],[6,3],[2,9],[7,8],[4,8]].forEach(([x,y])=>mk(x,y,'miss'))
mk(4,3,'hit');mk(4,4,'hit');mk(7,1,'sunk');mk(8,1,'sunk')
mk(6,6,'aimc');mk(6,5,'aim');mk(7,6,'aim');mk(6,7,'aim');mk(5,6,'aim')
// lưới của mình thu nhỏ
const c2=18,MX=GX,MY=GY+C*10+50
txt(MX,MY-8,'LƯỚI CỦA BẠN',13,'#4FC3E8',F+' font-weight="700" letter-spacing="2"')
for(let y=0;y<10;y++)for(let x=0;x<10;x++)p(`<rect x="${MX+x*c2}" y="${MY+y*c2}" width="${c2}" height="${c2}" fill="#0B1117" stroke="rgba(79,195,232,0.28)"/>`)
const place=[['destroyer',0,0,false],['cruiser',3,2,false],['submarine',7,4,true],['missile',1,6,false],['carrier',0,8,false]]
place.forEach(([id,x,y,v])=>p(sprite(id,MX+x*c2,MY+y*c2,c2,v)))
// hit trên lưới của mình
;[[4,6],[2,2]].forEach(([x,y])=>p(`<g transform="translate(${MX+x*c2},${MY+y*c2}) scale(${c2/100})">${FR.hit}</g>`))
// panel phải
panel(1010,84,566,792)
txt(1034,118,'NHẬT KÝ',20,'#4FC3E8',F+' font-weight="700" letter-spacing="3"')
const log=[['12','BẠN','Tên lửa chùm tại G7 chờ lệnh…','#C9D4DC'],['11','ĐỊCH','Pháo chính tại C3 trượt','#E8742A'],['10','BẠN','Không kích E2 — 1 trúng','#C9D4DC'],['9','ĐỊCH','Ngư lôi hàng 7 trúng Tuần dương','#FF3B2F'],['8','BẠN','Pháo nhanh H2, I2 — Khu trục hạm địch CHÌM','#5BD98A'],['7','ĐỊCH','Tên lửa chùm D5 — 2 trúng','#FF3B2F']]
log.forEach(([t,w,m,c],i)=>{const y=150+i*40;txt(1034,y,t.padStart(2,'0'),13,'#7F8E9B',M);txt(1070,y,w,13,w==='BẠN'?'#4FC3E8':'#E8742A',M+' font-weight="700"');txt(1130,y,m,13,c,M)})
p(`<path d="M1034 400 H1552" stroke="#3A4856"/>`)
txt(1034,436,'TÀU ĐANG CHỌN',14,'#7F8E9B',M)
p(`<use href="#ship-missile" x="1034" y="450" width="128" height="64" color="#E8742A"/>`)
txt(1180,478,'Tàu tên lửa',32,'#C9D4DC',F+' font-weight="700"')
txt(1180,504,'Tên lửa chùm',16,'#E8742A',M)
p(`<use href="#atk-cross" x="1034" y="534" width="120" height="120" color="#E8742A"/>`)
txt(1180,566,'Đánh vùng chữ thập 5 ô.',15,'#C9D4DC',M)
txt(1180,592,'Hồi chiêu sau khi bắn: 2 lượt.',15,'#C9D4DC',M)
txt(1180,626,'Chạm một ô để chọn tâm.',15,'#7F8E9B',M)
p(`<rect x="1034" y="690" width="240" height="48" fill="#1B2630" stroke="#3A4856"/><use href="#i-back" x="1048" y="702" width="24" height="24" color="#C9D4DC"/><text x="1084" y="722" font-size="20" fill="#C9D4DC" ${F} font-weight="700" letter-spacing="2">HỦY CHỌN</text>`)
p(`<rect x="1034" y="770" width="518" height="84" fill="#FF3B2F"/><path d="M1034 782 V770 H1046 M1540 854 H1552 V842" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/><use href="#i-aim" x="1064" y="796" width="32" height="32" color="#fff"/><text x="1310" y="826" text-anchor="middle" font-size="40" fill="#fff" ${F} font-weight="700" letter-spacing="8">BẮN</text>`)
txt(1034,874,'Tâm: G7 · Vùng 5 ô hợp lệ',13,'#5BD98A',M)
p('</svg>')
fs.writeFileSync(A+'/ui_battle_mock.svg',o.join('\n'))
