import fs from 'fs'
import {scene} from './scene.mjs'
const A=process.argv[2]
const pre=(s,x)=>{for(const i of new Set([...s.matchAll(/id="([^"]+)"/g)].map(m=>m[1])))s=s.split(`id="${i}"`).join(`id="${x}${i}"`).split(`url(#${i})`).join(`url(#${x}${i})`);return s}
let logo=fs.readFileSync(A+'/logo.svg','utf8').replace(/<\?xml[^>]*>/,'').replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title>.*?<\/title>/,'')
logo=pre(logo,'lg_')
const icons=fs.readFileSync(A+'/icons.svg','utf8').match(/<defs>([\s\S]*?)<\/defs>/)[1]
const sc=scene();const defs=sc.defs,body=sc.body
const btn=(y,t,primary)=>`<g><rect x="590" y="${y}" width="420" height="64" fill="${primary?'#FF3B2F':'#121A22'}" fill-opacity="${primary?1:.9}" stroke="${primary?'#fff':'#7A8A99'}" stroke-opacity="${primary?0:.6}"/><path d="M590 ${y+12}V${y}H602 M998 ${y+64}H1010V${y+52}" fill="none" stroke="${primary?'#fff':'#4FC3E8'}" stroke-width="3" stroke-opacity=".8"/><text x="800" y="${y+43}" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="8" fill="#fff">${t}</text></g>`
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" font-family="'Barlow Condensed','Arial Narrow',Arial,sans-serif"><title>menu mock truong sa</title><defs>${icons}${defs}</defs>
${body}
<g transform="translate(300,80) scale(.714)">${logo}</g>
${btn(540,'CHƠI',true)+btn(620,'KHÍ TÀI')+btn(700,'CÀI ĐẶT')}
<rect x="24" y="24" width="52" height="52" fill="#121A22" fill-opacity=".9" stroke="#7A8A99" stroke-opacity=".6"/><use href="#i-sound" x="34" y="34" width="32" height="32" color="#C9D4DC"/><text x="1576" y="880" text-anchor="end" font-family="monospace" font-size="13" fill="#7F8E9B">v0.1</text></svg>`
fs.writeFileSync(A+'/ui_menu_mock_truong_sa.svg',svg)
// thumbnail = chính cảnh (16:9)
fs.writeFileSync(A+'/map_truong_sa.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="960" height="540"><title>map truong sa</title><!-- Thumbnail map Trường Sa: sinh từ art/_src/scene.mjs -->
<defs>${defs}</defs>${body}</svg>`)
