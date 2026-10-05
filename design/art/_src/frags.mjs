// Marker ô đã bắn: lỗ đạn nổ (hit), hố nước (miss), đống đổ nát (sunk). Hệ 100x100, tâm (50,50).
const P=(pts)=>pts.map(p=>p.map(v=>+v.toFixed(1)).join(',')).join(' ')
const pol=(n,rf,cx=50,cy=50,off=0)=>Array.from({length:n},(_,i)=>{const a=off+2*Math.PI*i/n,r=rf(i);return [cx+r*Math.cos(a),cy+r*Math.sin(a)]})
export const defs=`
<radialGradient id="soot" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset=".7" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="ember" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFE08A"/><stop offset=".35" stop-color="#FF8A1F"/><stop offset=".75" stop-color="#8B1A14"/><stop offset="1" stop-color="#1a0d0a"/></radialGradient>
<radialGradient id="pool" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#03070a"/><stop offset=".6" stop-color="#0a1c28"/><stop offset="1" stop-color="#0a1c28" stop-opacity="0"/></radialGradient>
<radialGradient id="glowo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF8A1F" stop-opacity=".55"/><stop offset="1" stop-color="#FF8A1F" stop-opacity="0"/></radialGradient>`
// ---- HIT: lỗ đạn nổ trên tấm thép, mép xé cong ra ngoài, lõi than hồng, vết nứt, bồ hóng ----
const jag=pol(14,i=>i%2?19:31+((i*7)%5)*1.6,50,50,.2)
const hole=pol(14,i=>i%2?15:25+((i*5)%4)*1.5,50,50,.2)
const petals=Array.from({length:7},(_,i)=>{const a=.35+i*(2*Math.PI/7),r0=22,r1=38+((i*3)%3)*3,w=.34;return [[50+r0*Math.cos(a-w),50+r0*Math.sin(a-w)],[50+r1*Math.cos(a),50+r1*Math.sin(a)],[50+r0*Math.cos(a+w),50+r0*Math.sin(a+w)]]})
const cracks=Array.from({length:9},(_,i)=>{const a=.1+i*(2*Math.PI/9),r0=30,r1=44+((i*5)%4);return `<path d="M${50+r0*Math.cos(a)} ${50+r0*Math.sin(a)} L${50+(r0+7)*Math.cos(a+.07)} ${50+(r0+7)*Math.sin(a+.07)} L${50+r1*Math.cos(a)} ${50+r1*Math.sin(a)}" fill="none" stroke="#05080b" stroke-width="2"/>`}).join('')
export const hit=`<circle cx="50" cy="50" r="46" fill="url(#soot)"/><circle cx="50" cy="50" r="48" fill="url(#glowo)"/>${cracks}
${petals.map(t=>`<polygon points="${P(t)}" fill="#8793A0" stroke="#0B1117" stroke-width="2" stroke-linejoin="round"/><polygon points="${P([t[0],[ (t[0][0]+t[1][0])/2,(t[0][1]+t[1][1])/2 ],[50+(t[0][0]-50)*.86,50+(t[0][1]-50)*.86]])}" fill="#C9D4DC" fill-opacity=".55"/>`).join('')}
<polygon points="${P(jag)}" fill="#1b1411" stroke="#0B1117" stroke-width="2.4" stroke-linejoin="miter"/>
<polygon points="${P(hole)}" fill="url(#ember)" stroke="#3a1a10" stroke-width="1.4" stroke-linejoin="miter"/>
<circle cx="50" cy="50" r="36" fill="url(#glowo)"/><circle cx="50" cy="50" r="12" fill="#FFE08A" fill-opacity=".9"/>
<path d="M50 28 Q42 16 52 8 Q50 18 58 14" fill="none" stroke="#3a4048" stroke-width="3" stroke-linecap="round" stroke-opacity=".8"/>
<g fill="#FFC46B"><circle cx="25" cy="30" r="1.6"/><circle cx="76" cy="26" r="1.4"/><circle cx="80" cy="64" r="1.8"/><circle cx="30" cy="76" r="1.4"/><circle cx="66" cy="80" r="1.2"/></g>`
// ---- MISS: hố nước do đạn rơi, vành nước bắn lên, giọt ----
const ripple=pol(16,i=>30+((i%2)?4:0),50,50)
export const miss=`<circle cx="50" cy="50" r="42" fill="url(#pool)"/>
<polygon points="${P(ripple)}" fill="none" stroke="#9FB4C2" stroke-width="3.2" stroke-linejoin="round" stroke-opacity=".85"/>
<circle cx="50" cy="50" r="38" fill="none" stroke="#9FB4C2" stroke-opacity=".3" stroke-width="2" stroke-dasharray="3 5"/>
<ellipse cx="50" cy="50" rx="14" ry="12" fill="#03070a" stroke="#5B7184" stroke-width="2"/>
<path d="M40 46 Q50 38 61 46" fill="none" stroke="#E9F2F8" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>
<g fill="#E9F2F8" fill-opacity=".9">${Array.from({length:10},(_,i)=>{const a=i*.63+.2,r=26+((i*7)%3)*5;return `<circle cx="${50+r*Math.cos(a)}" cy="${50+r*Math.sin(a)}" r="${1.6+(i%3)*.5}"/>`}).join('')}</g>`
// ---- SUNK: đống đổ nát: vết dầu, mảnh vỏ tàu, thanh dầm vặn chéo, lửa nhỏ ----
const oil=pol(18,i=>34+((i*13)%7)*1.6,50,50,.1)
export const sunk=`<rect x="5" y="5" width="90" height="90" fill="#8B1A14" fill-opacity=".12" stroke="#8B1A14" stroke-opacity=".8" stroke-width="3"/>
<path d="M24 24 L76 76 M76 24 L24 76" stroke="#05080B" stroke-width="15" stroke-linecap="square"/><path d="M24 24 L76 76 M76 24 L24 76" stroke="#E9EFF4" stroke-width="9.5" stroke-linecap="square"/><path d="M24 24 L76 76 M76 24 L24 76" stroke="#B3261E" stroke-width="5" stroke-linecap="square"/>`
// bản cũ: đống đổ nát (không còn dùng cho ô chìm; giữ để tham khảo)
export const wreck=`<polygon points="${P(oil)}" fill="#06090b" fill-opacity=".92" stroke="#0B1117" stroke-width="2" stroke-linejoin="round"/>
<ellipse cx="38" cy="36" rx="9" ry="4" fill="#fff" fill-opacity=".08"/>
<g stroke="#0B1117" stroke-width="2" stroke-linejoin="round">
<polygon points="14,60 34,52 40,66 22,76" fill="#6A7682"/><polygon points="58,18 82,24 74,40 56,34" fill="#7A4A2A"/><polygon points="64,60 88,56 84,74 66,80" fill="#8793A0"/><polygon points="20,22 38,16 42,30 24,34" fill="#5C6975"/></g>
<path d="M14 18 Q30 40 52 46 Q74 56 88 84" fill="none" stroke="#0B1117" stroke-width="9" stroke-linecap="round"/><path d="M14 18 Q30 40 52 46 Q74 56 88 84" fill="none" stroke="#C9D4DC" stroke-width="5" stroke-linecap="round"/>
<path d="M86 16 Q70 38 50 50 Q30 62 12 86" fill="none" stroke="#0B1117" stroke-width="9" stroke-linecap="round"/><path d="M86 16 Q70 38 50 50 Q30 62 12 86" fill="none" stroke="#8793A0" stroke-width="5" stroke-linecap="round"/>
<path d="M26 82 Q22 70 30 62 Q30 72 38 70 Q36 78 34 82Z" fill="#FF8A1F" stroke="#0B1117" stroke-width="1.4"/><path d="M70 40 Q66 30 73 24 Q73 32 80 30 Q78 37 76 40Z" fill="#FF8A1F" stroke="#0B1117" stroke-width="1.4"/>
<circle cx="30" cy="74" r="12" fill="url(#glowo)"/><circle cx="73" cy="34" r="10" fill="url(#glowo)"/>
<rect x="4" y="4" width="92" height="92" fill="none" stroke="#8B1A14" stroke-width="5"/>`

// (bản đống đổ nát cũ đã bỏ)
// ---- icon đơn sắc 24x24 ----
export const iconHit=`<symbol id="i-hit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter"><polygon points="${P(pol(12,i=>i%2?5:10.5,12,12,.2))}"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M3 4 L6 6.5 M20.5 3.5 L18 6.5 M21 20 L18 17.5 M3.5 20.5 L6.5 17.5" stroke-linecap="square"/></symbol>`
export const iconMiss=`<symbol id="i-miss" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="3.2" ry="2.8"/><polygon points="${P(pol(12,i=>i%2?9:7.4,12,12))}" stroke-linejoin="round"/><circle cx="3.6" cy="5" r=".9" fill="currentColor" stroke="none"/><circle cx="20.4" cy="5.6" r=".9" fill="currentColor" stroke="none"/><circle cx="21" cy="19" r=".9" fill="currentColor" stroke="none"/><circle cx="3" cy="19.4" r=".9" fill="currentColor" stroke="none"/></symbol>`
export const iconSunk=`<symbol id="i-sunk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"><path d="M3 4 Q8 9 12 11 Q17 13 21 20 M21 4 Q16 9 12 12 Q7 15 3 20"/><path d="M3 21 H8 M16 21 H21 M2 14 L6 13 M18 8 L22 9" stroke-width="1.8"/></symbol>`

// ---- BLOCKED: ô bị hộ vệ triệt tiêu: khiên thép nứt, mũi tên bị bẻ, tia lửa ----
export const blocked=`<circle cx="50" cy="50" r="42" fill="url(#glowo)" opacity=".45"/>
<path d="M50 10 L82 22 V48 Q82 72 50 90 Q18 72 18 48 V22Z" fill="#2c353e" stroke="#0B1117" stroke-width="4" stroke-linejoin="miter"/>
<path d="M50 18 L74 27 V48 Q74 66 50 80 Q26 66 26 48 V27Z" fill="#8F9BA6" stroke="#C9D4DC" stroke-width="2"/>
<path d="M50 18 L74 27 V48" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
<path d="M30 30 L70 70" stroke="#0B1117" stroke-width="7" stroke-linecap="square"/><path d="M30 30 L70 70" stroke="#E8742A" stroke-width="3" stroke-linecap="square"/>
<path d="M58 14 L64 24 L56 26 L62 36" fill="none" stroke="#FFD27A" stroke-width="2.4" stroke-linecap="round"/><path d="M40 70 L34 78 M72 54 L82 58 M26 52 L16 50" stroke="#FFB347" stroke-width="2.4" stroke-linecap="round"/>
<g fill="#FFD27A"><circle cx="76" cy="20" r="2"/><circle cx="22" cy="72" r="1.8"/><circle cx="82" cy="70" r="1.6"/></g>`
