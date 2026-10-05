import fs from 'fs'
import {scene} from './scene.mjs'
const A=process.argv[2]
const pre=(s,x)=>{for(const i of new Set([...s.matchAll(/id="([^"]+)"/g)].map(m=>m[1])))s=s.split(`id="${i}"`).join(`id="${x}${i}"`).split(`url(#${i})`).join(`url(#${x}${i})`);return s}
let m=fs.readFileSync(A+'/ui_battle_mock.svg','utf8')
const sc=scene();const ids=[...new Set([...sc.defs.matchAll(/id="([^"]+)"/g)].map(m=>m[1]))];const ren=t=>{for(const i of ids)t=t.split(`id="${i}"`).join(`id="sc_${i}"`).split(`url(#${i})`).join(`url(#sc_${i})`);return t};const defs=ren(sc.defs),body=ren(sc.body)
const a=m.indexOf('<rect width="1600" height="900" fill="url(#bg)"/>'),b=m.indexOf('<rect x="24" y="16" width="1552"')
if(a<0||b<0)throw new Error('không tìm thấy mốc')
m=m.slice(0,a)+body+'\n'+m.slice(b)
m=m.replace('</defs>',defs+'</defs>').replace('<title>battle screen mock</title>','<title>battle screen mock truong sa</title>')
fs.writeFileSync(A+'/ui_battle_mock_truong_sa.svg',m)
// nhúng thumbnail vào ui_settings_mock
let s=fs.readFileSync(A+'/ui_settings_mock.svg','utf8')
const ren2=t=>{for(const i of ids)t=t.split(`id="${i}"`).join(`id="a_${i}"`).split(`url(#${i})`).join(`url(#a_${i})`);return t}
const th=fs.readFileSync(A+'/map_truong_sa.svg','utf8')
let inner=th.replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title>.*?<\/title>/,'').replace(/<!--.*?-->/,'')
inner=ren2(inner)
s=s.replace(/(<svg x="436" y="508" width="128" height="72" viewBox=")[^"]*(">).*?(<\/svg>)/s,(x,p1,p2,p3)=>p1+'0 0 1600 900'+p2+inner+p3)
fs.writeFileSync(A+'/ui_settings_mock.svg',s)
