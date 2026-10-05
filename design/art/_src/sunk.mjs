import fs from 'fs'
import * as FR from './frags.mjs'
const A=process.argv[2]
const inner=f=>fs.readFileSync(`${A}/${f}_2d.svg`,'utf8').replace(/<\?xml[^>]*>/,'').replace(/<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title>.*?<\/title>/,'').replace(/<!--[\s\S]*?-->/g,'')
const ships=[['destroyer',2,1],['cruiser',3,1],['submarine',3,1],['missile',4,1],['carrier',5,1],['raider',1,1],['escort',2,2]]
const C=90,GAP=36,LX=150
let y=70;const o=[]
o.push(`<defs>${FR.defs}<filter id="sunkfx"><feColorMatrix type="saturate" values=".15"/><feComponentTransfer><feFuncR type="linear" slope=".55"/><feFuncG type="linear" slope=".55"/><feFuncB type="linear" slope=".55"/></feComponentTransfer></filter></defs>`)
o.push(`<text x="20" y="30" fill="#4FC3E8" font-size="16">Tàu chìm trên lưới: bên trái nguyên vẹn, bên phải sau khi chìm (sprite xám tối + dấu X đỏ viền trắng trên mỗi ô)</text><text x="${LX}" y="56" fill="#7F8E9B">nguyên vẹn</text><text x="${LX+560}" y="56" fill="#7F8E9B">đã chìm</text>`)
for(const [id,n,rowsN] of ships){
 const w=n*C,h=rowsN*C
 o.push(`<text x="20" y="${y+h/2+4}" fill="#C9D4DC">${id}</text>`)
 for(const [x0,sunk] of [[LX,false],[LX+560,true]]){
  o.push(`<g transform="translate(${x0},${y})">`)
  for(let r=0;r<rowsN;r++)for(let c=0;c<n;c++)o.push(`<rect x="${c*C}" y="${r*C}" width="${C}" height="${C}" fill="#0B1117" stroke="rgba(79,195,232,.35)"/>`)
  o.push(`<g ${sunk?'filter="url(#sunkfx)"':''}><svg width="${w}" height="${h}" viewBox="0 0 ${n*100} ${rowsN*100}">${inner(id)}</svg></g>`)
  if(sunk)for(let r=0;r<rowsN;r++)for(let c=0;c<n;c++)o.push(`<g transform="translate(${c*C},${r*C}) scale(${C/100})">${FR.sunk}</g>`)
  o.push('</g>')}
 y+=h+GAP}
const H=y+10
fs.writeFileSync(A+'/sunk_states.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 ${H}" width="1240" height="${H}" font-family="monospace" font-size="13"><title>sunk states</title><rect width="1240" height="${H}" fill="#05080B"/>${o.join('\n')}</svg>`)
