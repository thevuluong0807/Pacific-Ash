import fs from 'fs'
const o=[],p=s=>o.push(s)
const PW=760,PH=330,GAP=14
const cols=['#4FC3E8','#E8742A','#5BD98A','#C9A227','#FF3B2F']
const S=55,S2=22
const attacks=[
 {t:'KHU TRỤC HẠM — rapid (2800 ms)',len:1.9,cells:[[0,0],[2,1]],grid:'rapid',shots:[
   [1,'s',-2.2,1.2,3.0,.2,0,'0–1000 nghiêng trên xuống'],[2,'s',.55,.45,.16,.9,0,'1000–1550 cận tháp trước'],[3,'s',-.35,-.42,.16,-.05,0,'1550–2000 cận tháp sau'],[4,'t',-3,.5,3.2,0,0,'2000–2800 trúng đích']],tl:[[0,1000],[1000,1550],[1550,2000],[2000,2800]],total:2800},
 {t:'TUẦN DƯƠNG — precision (3200 ms)',len:2.9,cells:[[1,1]],shots:[
   [1,'s',-1.3,.5,5.6,.4,0,'0–1100 đỉnh, chéo sau'],[2,'s',.7,1.35,.12,1.0,0,'1100–2100 cận mạn tàu, khai hỏa'],[3,'t',-4,0,3,0,0,'2100–3200 trúng đích']],tl:[[0,1100],[1100,2100],[2100,3200]],total:3200},
 {t:'TÀU TÊN LỬA — cross (3800 ms)',len:3.9,cells:[[1,1],[0,1],[2,1],[1,0],[1,2]],shots:[
   [1,'s',.1,2.3,.6,.1,0,'0–1300 mạn tàu, tháp ngẩng'],[2,'s',-.4,2.3,.4,.1,0,'1300–1900 khai hỏa'],[3,'t',-8,0,9,0,0,'1900–3400 chùm parabol'],[4,'t',-3.5,0,2.4,0,0,'3000–3800 chạm đích']],tl:[[0,1300],[1300,1900],[1900,3000],[3000,3800]],total:3800,arc:1},
 {t:'TÀU NGẦM — torpedo (4600 ms)',len:2.9,cells:[[0,1],[1,1],[2,1]],lane:1,shots:[
   [1,'s',1.0,-.35,-.16,-.2,0,'0–1500 dưới nước, trồi lên'],[2,'s',1.7,-.12,-.12,1.4,0,'1500–2100 mở nắp ống'],[3,'s',.6,0,.55,2.2,0,'2100–2700 bám ngư lôi'],[4,'t',-2,0,4.5,3,0,'2700–4600 toàn cảnh đường đi, trúng']],tl:[[0,1500],[1500,2100],[2100,2700],[2700,4600]],total:4600},
 {t:'TÀU SÂN BAY — line3 (5000 ms)',len:4.9,cells:[[0,1],[1,1],[2,1]],shots:[
   [1,'s',1.7,.45,.15,.9,0,'0–1200 cất cánh trên boong'],[2,'s',2.6,1.2,1.0,3.0,0,'1200–2200 bám, đổi góc'],[3,'t',-7,3,6.5,0,0,'2200–3400 tổng thể'],[4,'t',-1.5,1.2,1.4,0,0,'3400–4400 rải tên lửa'],[5,'t',-6,0,8,0,0,'4400–5000 rút lên']],tl:[[0,1200],[1200,2200],[2200,3400],[3400,4400],[4400,5000]],total:5000,chase:1}]
p(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW*2+GAP*3} ${(PH+GAP)*3+GAP+40}" width="${PW*2+GAP*3}" height="${(PH+GAP)*3+GAP+40}" font-family="monospace" font-size="11"><title>cinematic plan</title>
<rect width="100%" height="100%" fill="#0B1117"/><text x="14" y="26" fill="#4FC3E8" font-size="15">Sơ đồ camera (nhìn từ trên xuống, mũi tàu hướng phải; số = shot; u = độ cao camera; chấm xanh = tàu bắn, lưới = vùng mục tiêu)</text>`)
attacks.forEach((a,i)=>{
 const ox=GAP+(i%2)*(PW+GAP),oy=40+Math.floor(i/2)*(PH+GAP)
 p(`<g transform="translate(${ox},${oy})"><rect width="${PW}" height="${PH}" fill="#121A22" stroke="#3A4856"/><text x="12" y="22" fill="#C9D4DC" font-size="14" font-weight="700">${a.t}</text>`)
 const cx=210,cy=150
 // tàu
 p(`<rect x="${cx-a.len*S/2}" y="${cy-14}" width="${a.len*S}" height="28" rx="3" fill="#8F9BA6" fill-opacity=".5" stroke="#C9D4DC"/><path d="M${cx+a.len*S/2} ${cy-14} L${cx+a.len*S/2+14} ${cy} L${cx+a.len*S/2} ${cy+14}" fill="#8F9BA6" fill-opacity=".5" stroke="#C9D4DC"/><text x="${cx}" y="${cy+30}" fill="#7F8E9B" text-anchor="middle">tàu bắn</text>`)
 // lưới mục tiêu
 const gx=560,gy=96,g=26
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
  x=Math.max(30,Math.min(PW-30,x));y=Math.max(40,Math.min(PH-90,y))
  const ang=Math.atan2(ly-y,lx-x),col=cols[k%5]
  p(`<path d="M${x} ${y} L${x+Math.cos(ang-.45)*30} ${y+Math.sin(ang-.45)*30} L${x+Math.cos(ang+.45)*30} ${y+Math.sin(ang+.45)*30}Z" fill="${col}" fill-opacity=".22" stroke="${col}"/><circle cx="${x}" cy="${y}" r="10" fill="${col}"/><text x="${x}" y="${y+4}" fill="#0B1117" text-anchor="middle" font-weight="700">${n}</text><text x="${x}" y="${y-14}" fill="${col}" text-anchor="middle" font-size="10">u=${u}</text>`)
 })
 if(a.chase)p(`<path d="M${cx+a.len*S/2+30} ${cy-8} Q${cx+a.len*S/2+120} ${cy-70} ${cx+a.len*S/2+170} ${cy-30}" fill="none" stroke="${cols[1]}" stroke-dasharray="4 4"/>`)
 // thanh thời gian
 const tx=14,ty=PH-60,tw=PW-28
 p(`<text x="${tx}" y="${ty-6}" fill="#7F8E9B">thời gian (ms)</text>`)
 a.tl.forEach(([s,e],k)=>{const x=tx+s/a.total*tw,w=(e-s)/a.total*tw;p(`<rect x="${x}" y="${ty}" width="${w-2}" height="22" fill="${cols[k%5]}" fill-opacity=".85"/><text x="${x+4}" y="${ty+15}" fill="#0B1117" font-weight="700">${k+1}</text><text x="${x}" y="${ty+38}" fill="#C9D4DC" font-size="10">${a.shots[k][7]}</text>`)})
 p('</g>')
})
p('</svg>')
fs.writeFileSync(process.argv[2]+'/cinematic_plan.svg',o.join('\n'))
