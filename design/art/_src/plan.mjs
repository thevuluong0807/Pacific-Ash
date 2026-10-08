import fs from 'fs'
const o=[],p=s=>o.push(s)
const PW=760,PH=410,GAP=14
const cols=['#4FC3E8','#E8742A','#5BD98A','#C9A227','#FF3B2F']
const S=38,S2=20
const attacks=[
 {t:'KHU TRỤC HẠM — rapid (4800 ms)',len:1.9,cells:[[0,0],[2,1]],shots:[
   [1,'s',-2.2,1.2,3.0,.2,0,'0–1500 nghiêng trên xuống'],[2,'s',.1,1.35,.3,.1,0,'1500–3150 mạn tàu 90% thân'],[3,'s',1.0,.28,.14,.74,0,'insert nòng trước'],[4,'s',-.2,.3,.14,-.325,0,'insert nòng sau'],[5,'t',-3,.5,3.2,0,0,'3150–4800 trúng đích']],tl:[[0,1500],[1500,3150],[1680,2250],[2355,2925],[3150,4800]],total:4800},
 {t:'TUẦN DƯƠNG — precision (5250 ms)',len:2.9,cells:[[1,1]],shots:[
   [1,'s',-1.3,.5,5.6,.4,0,'0–1650 đỉnh, chéo sau'],[2,'s',.3,2.1,.25,.3,0,'1650–3450 mạn tàu 100% thân'],[3,'s',1.2,.55,.14,1.075,0,'insert nòng (đạn lớn)'],[4,'t',-4,0,3,0,0,'3450–5250 trúng đích']],tl:[[0,1650],[1650,3450],[1920,2550],[3450,5250]],total:5250},
 {t:'TÀU TÊN LỬA — cross (6600 ms)',len:3.9,cells:[[1,1],[0,1],[2,1],[1,0],[1,2]],shots:[
   [1,'s',-.1,3.0,.8,-.1,0,'0–2250 mạn tàu 100% thân'],[2,'s',-.1,3.2,.5,-.1,0,'2250–3450 khai hỏa'],[3,'s',.95,.95,.4,.91,0,'insert dãy trước'],[4,'s',-1.15,.9,.4,-1.07,0,'insert dãy sau'],[5,'t',-8,0,9,0,0,'3450–5700 chùm parabol'],[6,'t',-3.5,0,2.4,0,0,'5100–6600 chạm đích']],tl:[[0,2250],[2250,3450],[2370,3000],[3000,3450],[3450,5100],[5100,6600]],total:6600,arc:1},
 {t:'TÀU NGẦM — torpedo (6300 ms)',len:2.9,cells:[[0,1],[1,1],[2,1]],lane:1,shots:[
   [1,'s',.4,2.6,-.15,.4,0,'0–2400 camera đi liên tục: dưới nước → lên cao'],[2,'s',.2,2.2,1.7,.8,0,'2400–4500 trên cao, thấy tàu + nơi bắn'],[3,'s',1.9,.7,.25,1.4,0,'insert cận nơi phóng'],[4,'t',-2,0,4.5,3,0,'4500–6300 trúng đích']],tl:[[0,2400],[2400,4500],[2640,3240],[4500,6300]],total:6300},
 {t:'TÀU SÂN BAY — line3 (6450 ms, 2 cảnh)',len:4.9,cells:[[-1,1],[0,1],[1,1],[2,1]],shots:[
   [1,'s',2.2,.9,.12,1.4,.1,'0–3000 một cú máy: cất cánh, lia theo đàn bay'],[2,'t',-.4,4.6,.35,0,0,'3000–6450 mặt nước: thả tên lửa xuống từng ô']],tl:[[0,3000],[3000,6450]],total:6450,chase:1}]
p(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW*2+GAP*3} ${(PH+GAP)*3+GAP+40}" width="${PW*2+GAP*3}" height="${(PH+GAP)*3+GAP+40}" font-family="monospace" font-size="11"><title>cinematic plan</title>
<rect width="100%" height="100%" fill="#0B1117"/><text x="14" y="26" fill="#4FC3E8" font-size="15">Sơ đồ camera (nhìn từ trên xuống, mũi tàu hướng phải; số = shot; u = độ cao camera; chấm xanh = tàu bắn, lưới = vùng mục tiêu)</text>`)
attacks.forEach((a,i)=>{
 const ox=GAP+(i%2)*(PW+GAP),oy=40+Math.floor(i/2)*(PH+GAP)
 p(`<g transform="translate(${ox},${oy})"><rect width="${PW}" height="${PH}" fill="#121A22" stroke="#3A4856"/><text x="12" y="22" fill="#C9D4DC" font-size="14" font-weight="700">${a.t}</text>`)
 const cx=230,cy=130
 // tàu
 p(`<rect x="${cx-a.len*S/2}" y="${cy-14}" width="${a.len*S}" height="28" rx="3" fill="#8F9BA6" fill-opacity=".5" stroke="#C9D4DC"/><path d="M${cx+a.len*S/2} ${cy-14} L${cx+a.len*S/2+14} ${cy} L${cx+a.len*S/2} ${cy+14}" fill="#8F9BA6" fill-opacity=".5" stroke="#C9D4DC"/><text x="${cx}" y="${cy+30}" fill="#7F8E9B" text-anchor="middle">tàu bắn</text>`)
 // lưới mục tiêu
 const gx=560,gy=90,g=26
 for(let y=0;y<5;y++)for(let x=0;x<5;x++)p(`<rect x="${gx+x*g}" y="${gy+y*g}" width="${g}" height="${g}" fill="#0B1117" stroke="rgba(79,195,232,.3)"/>`)
 ;(a.cells||[]).forEach(([x,y])=>p(`<rect x="${gx+(x+1.5)*g-(a.lane?0:0)}" y="${gy+(y+1)*g}" width="${g}" height="${g}" fill="#E8742A" fill-opacity=".45" stroke="#E8742A"/>`))
 if(a.lane)p(`<path d="M${gx-8} ${gy+2.5*g} H${gx+5*g}" stroke="#E8742A" stroke-dasharray="5 4" stroke-width="2"/>`)
 p(`<text x="${gx+2.5*g}" y="${gy+5*g+20}" fill="#7F8E9B" text-anchor="middle">mục tiêu</text>`)
 // đường nối bắn
 p(`<path d="M${cx+a.len*S/2+22} ${cy} Q${(cx+gx)/2} ${a.arc?cy-120:cy-36} ${gx-6} ${gy+2.5*g}" fill="none" stroke="#E8742A" stroke-opacity=".55" stroke-dasharray="6 5" stroke-width="2"/>`)
 const tcx=gx+2.5*g,tcy=gy+2.5*g
 a.shots.forEach(([n,sp,f,r,u,lf,lr],k)=>{
  let x,y,lx,ly
  if(sp==='s'){x=cx+f*S;y=cy+r*S;lx=cx+lf*S;ly=cy+lr*S}else{x=tcx+Math.max(-9,f)*S2*1.0;y=tcy+r*S2;lx=tcx+lf*S2;ly=tcy+lr*S2}
  x=Math.max(30,Math.min(PW-30,x));y=Math.max(36,Math.min(PH-96,y))
  const ang=Math.atan2(ly-y,lx-x),col=cols[k%5]
  p(`<path d="M${x} ${y} L${x+Math.cos(ang-.45)*30} ${y+Math.sin(ang-.45)*30} L${x+Math.cos(ang+.45)*30} ${y+Math.sin(ang+.45)*30}Z" fill="${col}" fill-opacity=".22" stroke="${col}"/><circle cx="${x}" cy="${y}" r="10" fill="${col}"/><text x="${x}" y="${y+4}" fill="#0B1117" text-anchor="middle" font-weight="700">${n}</text><text x="${x}" y="${y-14}" fill="${col}" text-anchor="middle" font-size="10">u=${u}</text>`)
 })
 if(a.chase)p(`<path d="M${cx+a.len*S/2+30} ${cy-8} Q${cx+a.len*S/2+120} ${cy-70} ${cx+a.len*S/2+170} ${cy-30}" fill="none" stroke="${cols[1]}" stroke-dasharray="4 4"/>`)
 // thanh thời gian
 const tx=14,ty=PH-60,tw=PW-28
 p(`<text x="${tx}" y="${ty-6}" fill="#7F8E9B">thời gian (ms)</text>`)
 a.tl.forEach(([s,e],k)=>{const ins=/insert/.test(a.shots[k][7]);const x=tx+s/a.total*tw,w=(e-s)/a.total*tw;const yy=ins?ty-14:ty,hh=ins?10:22;p(`<rect x="${x}" y="${yy}" width="${w-2}" height="${hh}" fill="${cols[k%5]}" fill-opacity="${ins?.95:.85}"/>${ins?'':`<text x="${x+4}" y="${ty+15}" fill="#0B1117" font-weight="700">${k+1}</text>`}<text x="${x}" y="${ins?ty-18:ty+38}" fill="#C9D4DC" font-size="10">${ins?'':a.shots[k][7]}</text>`)})
 p('</g>')
})
p('</svg>')
fs.writeFileSync(process.argv[2]+'/cinematic_plan.svg',o.join('\n'))
