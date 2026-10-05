import fs from 'fs'
const f=n=>+n.toFixed(1)
const L={
 P:{w:92,d:'M0 0H70L92 22V60L70 82H34V140H0Z M34 28V54H60V28Z',cut:[[-2,100,40,5]]},
 A:{w:110,d:'M38 0H72L110 140H76L70 112H40L34 140H0Z M47 86H63L55 46Z',cut:[[24,104,60,5]]},
 C:{w:92,d:'M22 0H92V34H40L34 40V100L40 106H92V140H22L0 118V22Z',cut:[[-2,68,40,5]]},
 I:{w:34,d:'M0 0H34V140H0Z',cut:[[-2,68,40,5]]},
 F:{w:84,d:'M0 0H84V30H34V54H70V82H34V140H0Z',cut:[[-2,104,40,5]]},
 S:{w:92,d:'M20 0H92V30H36V48H72L92 66V118L72 140H0V110H56V92H20L0 74V22Z',cut:[[40,44,60,5]]},
 H:{w:100,d:'M0 0H34V52H66V0H100V140H66V88H34V140H0Z',cut:[[-2,36,40,5],[62,100,42,5]]}}
const word=(t,g)=>{let x=0;const it=[];for(const ch of t){it.push({ch,x,g:L[ch]});x+=L[ch].w+g}return {it,w:x-g}}
const WD=w=>w.it.map(i=>`<path transform="translate(${i.x},0)" d="${i.g.d}" fill-rule="evenodd"/>`).join('')
const CUT=w=>w.it.flatMap(i=>i.g.cut.map(([x,y,ww,h])=>`<rect x="${i.x+x}" y="${y}" width="${ww}" height="${h}" fill="#000" transform="rotate(-8 ${i.x+x+ww/2} ${y})"/>`)).join('')
const W1=word('PACIFIC',14),W2=word('ASH',14),GAP=58
const total=W1.w+GAP+W2.w
const s=1.1, x0=(1400-total*s)/2, y0=70
const ship=(x,y,k)=>`<g transform="translate(${f(x)},${f(y)}) scale(${k})" fill="#C9D4DC"><path d="M0 34 H500 L560 8 H590 L540 48 H22Z"/><path d="M286 34 V10 H338 L350 34Z M300 10 V-6 H328 V10Z M312 -6 V-34 M298 -22 H326" stroke="#C9D4DC" stroke-width="3" fill="#C9D4DC"/><path d="M110 34 V22 H146 V34Z M170 34 V18 H200 V34Z M212 34 V24 H226 V34Z"/><path d="M452 34 V20 H482 V34Z M482 24 H520 V28 H482Z"/><rect x="316" y="-40" width="10" height="6" fill="#E8742A"/></g>`
const o=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 400" width="1400" height="400" font-family="'Barlow Condensed','Arial Narrow',Arial,sans-serif">
<title>PACIFIC ASH</title>
<defs><mask id="m1" maskUnits="userSpaceOnUse" x="-20" y="-20" width="${W1.w+40}" height="180"><rect x="-20" y="-20" width="${W1.w+40}" height="180" fill="#fff"/>${CUT(W1)}</mask>
<mask id="m2" maskUnits="userSpaceOnUse" x="-20" y="-20" width="${W2.w+40}" height="180"><rect x="-20" y="-20" width="${W2.w+40}" height="180" fill="#fff"/>${CUT(W2)}</mask></defs>
<!-- chữ: phẳng, một màu thép sáng + một màu cam. Khe stencil cắt nghiêng. Không viền, không bóng, không hiệu ứng. -->
<g transform="translate(${f(x0)},${y0}) scale(${s})"><g mask="url(#m1)" fill="#E9EFF4">${WD(W1)}</g><g transform="translate(${W1.w+GAP},0)" mask="url(#m2)" fill="#E8742A">${WD(W2)}</g></g>
<!-- đường nước + chiến hạm làm gạch chân -->
<path d="M${f(x0)} 296H${f(x0+total*s)}" stroke="#7F8E9B" stroke-width="2"/>
${ship(700-300*0.9,253,0.9)}
<text x="700" y="346" text-anchor="middle" font-size="24" font-weight="700" letter-spacing="16" fill="#7F8E9B" textLength="${f(total*s*.34)}" lengthAdjust="spacing">NAVAL WARFARE</text>
</svg>`]
fs.writeFileSync(process.argv[2]+'/logo.svg',o.join('\n'))
// emblem tối giản
const E=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320"><title>PACIFIC ASH emblem</title>
<rect x="8" y="8" width="304" height="304" fill="#0B1117" stroke="#7F8E9B" stroke-width="3"/>
<path d="M8 40V8H40M280 312H312V280" fill="none" stroke="#E8742A" stroke-width="6"/>
<defs><mask id="me"><rect width="320" height="320" fill="#fff"/><rect x="80" y="196" width="160" height="6" fill="#000" transform="rotate(-8 160 199)"/></mask></defs>
<g transform="translate(86,52) scale(1.28)" mask="url(#me)"><path d="M38 0H72L110 140H76L70 112H40L34 140H0Z M47 86H63L55 46Z" fill="#E9EFF4" fill-rule="evenodd"/></g>
<path d="M44 252H276" stroke="#7F8E9B" stroke-width="2"/>
<g transform="translate(88,254) scale(.24)" fill="#C9D4DC"><path d="M0 34 H500 L560 8 H590 L540 48 H22Z"/><path d="M286 34 V10 H338 L350 34Z M300 10 V-6 H328 V10Z M312 -6 V-34" stroke="#C9D4DC" stroke-width="4" fill="#C9D4DC"/><path d="M110 34 V22 H146 V34Z M452 34 V20 H482 V34Z M482 24 H520 V28 H482Z"/><rect x="316" y="-40" width="10" height="6" fill="#E8742A"/></g>
</svg>`
fs.writeFileSync(process.argv[2]+'/logo_emblem.svg',E)
