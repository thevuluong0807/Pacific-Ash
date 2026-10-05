import fs from 'fs'
const rad=d=>d*Math.PI/180
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)}
const lerp=(a,b,t)=>a+(b-a)*t
// ---------- hình học ----------
const ST=[[0.95,0.004,0,0,0.075],[0.80,0.07,0.05,0.02,0.068],[0.60,0.14,0.12,0.05,0.060],[0.30,0.19,0.17,0.07,0.054],[0,0.19,0.17,0.08,0.050],[-0.55,0.19,0.17,0.08,0.052],[-0.95,0.16,0.15,0.07,0.055]]
const at=(z,k)=>{for(let i=0;i<ST.length-1;i++){const a=ST[i],b=ST[i+1];if(z<=a[0]&&z>=b[0])return lerp(a[k],b[k],(a[0]-z)/(a[0]-b[0]))}return ST[ST.length-1][k]}
const faces=[] // {pts,mat,cen,under,tag}
const F=(pts,mat,cen,o={})=>faces.push({pts,mat,cen,...o})
// thân tàu
const ring=s=>{const [z,wd,ww,wk,hs]=s;return {dp:[wd,hs,z],wp:[ww,0,z],kp:[wk,-0.045,z],ks:[-wk,-0.045,z],ws:[-ww,0,z],ds:[-wd,hs,z]}}
for(let i=0;i<ST.length-1;i++){const a=ring(ST[i]),b=ring(ST[i+1]),c=[0,0.01,(ST[i][0]+ST[i+1][0])/2]
 F([a.dp,b.dp,b.wp,a.wp],'hull',c); F([a.wp,b.wp,b.kp,a.kp],'under',c,{under:1})
 F([a.ds,b.ds,b.ws,a.ws],'hull',c); F([a.ws,b.ws,b.ks,a.ks],'under',c,{under:1})
 F([a.kp,b.kp,b.ks,a.ks],'under',c,{under:1})
 F([a.dp,b.dp,b.ds,a.ds],'deck',[0,-0.3,c[2]])}
{const r=ring(ST[ST.length-1]);F([r.dp,r.ds,r.ws,r.wp],'hull',[0,0,0.5]);F([r.wp,r.ws,r.ks,r.kp],'under',[0,0,0.5],{under:1})}
// khối có thể thu nhỏ phía trên: bottom/top = 4 góc [x,z]
const hexa=(b,t,y0,y1,mat,tag)=>{const B=b.map(([x,z])=>[x,y0,z]),T=t.map(([x,z])=>[x,y1,z]);const cx=b.concat(t).reduce((s,p)=>s+p[0],0)/8,cz=b.concat(t).reduce((s,p)=>s+p[1],0)/8,c=[cx,(y0+y1)/2,cz]
 for(let i=0;i<4;i++){const j=(i+1)%4;F([B[i],B[j],T[j],T[i]],mat,c,{tag})}F([T[0],T[1],T[2],T[3]],mat,c,{tag});}
const rectR=(x0,x1,z0,z1)=>[[x1,z1],[x1,z0],[x0,z0],[x0,z1]]
const box=(x0,x1,z0,z1,y0,y1,mat)=>hexa(rectR(x0,x1,z0,z1),rectR(x0,x1,z0,z1),y0,y1,mat)
const prism=(cx,cz,r,y0,y1,mat,n=12,r2=r)=>{const P=(r,y)=>Array.from({length:n},(_,i)=>[cx+r*Math.cos(2*Math.PI*i/n),y,cz+r*Math.sin(2*Math.PI*i/n)]);const B=P(r,y0),T=P(r2,y1),c=[cx,(y0+y1)/2,cz]
 for(let i=0;i<n;i++){const j=(i+1)%n;F([B[i],B[j],T[j],T[i]],mat,c)}F(T,mat,c)}
// nhà boong, cầu, nhà chứa
hexa(rectR(-0.10,0.10,0.02,0.30),rectR(-0.088,0.088,0.035,0.285),0.052,0.100,'struct')
hexa(rectR(-0.085,0.085,0.10,0.26),rectR(-0.074,0.074,0.115,0.235),0.100,0.135,'struct')
hexa(rectR(-0.08,0.08,-0.28,0.02),rectR(-0.07,0.07,-0.26,0.0),0.052,0.095,'struct')
hexa(rectR(-0.12,0.12,-0.70,-0.46),rectR(-0.108,0.108,-0.68,-0.48),0.054,0.105,'struct')
// ống khói
hexa(rectR(-0.035,0.035,-0.09,0.01),rectR(-0.03,0.03,-0.12,-0.03),0.095,0.150,'dark')
hexa(rectR(-0.035,0.035,-0.25,-0.15),rectR(-0.03,0.03,-0.28,-0.19),0.095,0.150,'dark')
// cột + radar
box(-0.012,0.012,0.108,0.132,0.135,0.30,'struct')
box(-0.032,0.032,0.114,0.126,0.300,0.312,'dark')
box(-0.002,0.002,0.12,0.12,0.312,0.345,'dark')
// tháp pháo
for(const c of [0.66,-0.40]){prism(0,c,0.034,0.052,0.070,'dark',14)
 hexa(rectR(-0.030,0.030,c-0.034,c+0.034),rectR(-0.020,0.020,c-0.018,c+0.026),0.070,0.094,'struct')
 box(-0.0035,0.0035,c+0.026,c+0.105,0.079,0.087,'dark')}
// VLS
box(-0.04,0.04,0.40,0.52,0.052,0.058,'dark')
// CIWS
for(const [z,y] of [[-0.30,0.095],[-0.52,0.105]]){prism(0,z,0.013,y,y+0.012,'dark',10);prism(0,z,0.011,y+0.012,y+0.030,'radome',10,0.008)}
// xuồng cứu sinh + tời neo
for(const s of [1,-1]){box(s>0?0.080:-0.112,s>0?0.112:-0.080,-0.17,-0.05,0.058,0.074,'orange')}
box(-0.02,0.02,0.70,0.76,0.060,0.075,'dark')
// ---------- vật liệu ----------
const MAT={hull:[212,220,228,.8],under:[48,58,66,.2],deck:[138,148,156,.15],struct:[205,214,222,.75],dark:[62,72,82,.55],radome:[233,238,242,.2],orange:[224,138,46,.1]}
const L1=norm([-0.35,0.85,-0.45]),L2=norm([0.5,0.25,0.8]);
function shade(n,mat,camN){const [r,g,b,sp]=MAT[mat];const d1=Math.max(0,dot(n,L1)),d2=Math.max(0,dot(n,L2))
 let k=0.32+0.80*d1; const H=norm([L1[0]+camN[0],L1[1]+camN[1],L1[2]+camN[2]]);const s=sp*Math.pow(Math.max(0,dot(n,H)),22)
 // phản chiếu bầu trời tối ở mặt đứng, phản chiếu lửa cam ở mặt hướng mũi/trái
 const up=n[1]>0.5?1:0, env=0.05+0.12*up
 const out=[r*k+255*s+d2*34*(sp>0.3?1:0.4)+r*env, g*k+255*s+d2*17+g*env*0.8, b*k+255*s+d2*4+b*env*1.2]
 return '#'+out.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
// ---------- camera ----------
function view(yaw,pitch,s,cx,cy,id){
 const Y=rad(yaw),P=rad(pitch)
 const T=p=>{const x1=p[0]*Math.cos(Y)+p[2]*Math.sin(Y),z1=-p[0]*Math.sin(Y)+p[2]*Math.cos(Y);const y2=p[1]*Math.cos(P)-z1*Math.sin(P),z2=p[1]*Math.sin(P)+z1*Math.cos(P);return [x1,y2,z2]}
 const R=v=>{const x1=v[0]*Math.cos(Y)+v[2]*Math.sin(Y),z1=-v[0]*Math.sin(Y)+v[2]*Math.cos(Y);return [x1,v[1]*Math.cos(P)-z1*Math.sin(P),v[1]*Math.sin(P)+z1*Math.cos(P)]}
 const S=p=>{const q=T(p);return [cx+q[0]*s,cy-q[1]*s]}
 const camN=[0,0,1]; // trong không gian camera; chuyển camN về thế giới bằng R^-1 xấp xỉ: tính lại bằng cách lấy hướng camera
 // hướng tới camera trong thế giới
 const inv=v=>{const y1=v[1]*Math.cos(P)+v[2]*Math.sin(P),z1=-v[1]*Math.sin(P)+v[2]*Math.cos(P);return [v[0]*Math.cos(Y)-z1*Math.sin(Y),y1,v[0]*Math.sin(Y)+z1*Math.cos(Y)]}
 const camW=norm(inv([0,0,1]))
 const out=[]
 const plane=[[-3,0,-3],[3,0,-3],[3,0,3],[-3,0,3]].map(S)
 // nền
 out.push(`<defs><linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080B"/><stop offset=".62" stop-color="#101A22"/><stop offset="1" stop-color="#3a2216"/></linearGradient>
 <linearGradient id="sea${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1a24"/><stop offset="1" stop-color="#04090d"/></linearGradient>
 <radialGradient id="glow${id}" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="#ff7a1a" stop-opacity=".5"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
 <filter id="blur${id}"><feGaussianBlur stdDeviation="${(s*0.012).toFixed(1)}"/></filter></defs>
 <rect x="0" y="0" width="1600" height="1000" fill="url(#sky${id})"/><rect x="0" y="0" width="1600" height="1000" fill="url(#glow${id})"/>`)
 const hz=pitch<20?cy:null
 if(pitch<20){out.push(`<rect x="0" y="${cy}" width="1600" height="${1000-cy}" fill="url(#sea${id})"/>`)} else out.push(`<polygon points="${plane.map(p=>p.join(',')).join(' ')}" fill="url(#sea${id})"/>`)
 // bóng tiếp xúc
 const sh=Array.from({length:40},(_,i)=>{const a=2*Math.PI*i/40;return S([0.58*Math.sin(a)*0.5*1.0+0,0,1.0*Math.cos(a)*1.02])})
 out.push(`<polygon points="${sh.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="#000" opacity=".55" filter="url(#blur${id})"/>`)
 const vis=f=>{const a=f.pts.map(T);const n=norm(cross(sub(f.pts[1],f.pts[0]),sub(f.pts[2],f.pts[0])));const m=[f.pts.reduce((q,p)=>q+p[0],0)/f.pts.length,f.pts.reduce((q,p)=>q+p[1],0)/f.pts.length,f.pts.reduce((q,p)=>q+p[2],0)/f.pts.length]
  const o=sub(m,f.cen);const nn=dot(n,o)<0?n.map(v=>-v):n;return {nn,depth:a.reduce((q,p)=>q+p[2],0)/a.length,vis:dot(nn,camW)>0.0001}}
 const draw=fs=>fs.map(f=>({f,...vis(f)})).filter(o=>o.vis).sort((a,b)=>a.depth-b.depth).forEach(({f,nn})=>{
   out.push(`<polygon points="${f.pts.map(S).map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="${shade(nn,f.mat,camW)}" stroke="rgba(4,8,12,.55)" stroke-width="${Math.max(.5,s*0.0011).toFixed(2)}" stroke-linejoin="round"/>`)})
 draw(faces.filter(f=>f.under))
 out.push(`<polygon points="${plane.map(p=>p.join(',')).join(' ')}" fill="#0a1822" opacity=".7"/>`)
 // vạch nước + gợn
 for(let i=0;i<26;i++){const z=-1.2+i*0.095,w=0.22+0.05*Math.sin(i*1.7),a=S([w,0,z]),b=S([w+0.12+0.05*Math.sin(i),0,z+0.04]);out.push(`<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke="#7fa6bd" stroke-opacity=".28" stroke-width="${(s*0.002).toFixed(1)}"/>`)}
 draw(faces.filter(f=>!f.under&&(f.mat==='hull'||f.mat==='deck')))
 for(const sg of [1,-1]){const wl=[],hl=[];for(const z of [0.95,0.8,0.6,0.3,0,-0.55,-0.95]){wl.push([sg*at(z,2),0.0005,z]);hl.push([sg*(at(z,1)-0.004),at(z,4)-0.010,z])}
  if(dot([sg,0,0],camW)>0){out.push(`<polyline points="${wl.map(S).map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#1c242b" stroke-width="${(s*0.007).toFixed(1)}" stroke-linejoin="round"/><polyline points="${hl.map(S).map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="${(s*0.0025).toFixed(1)}" stroke-linejoin="round"/>`)}}
 draw(faces.filter(f=>!f.under&&f.mat!=='hull'&&f.mat!=='deck'))
 // chi tiết đường
 const line=(pts,col,w,op=1)=>out.push(`<polyline points="${pts.map(S).map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="${(s*w).toFixed(2)}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`)
 const near=p=>dot(norm(sub(p,[0,0.05,p[2]])),camW)>-0.2 // luôn vẽ cả hai lan can, sort nhẹ
 // lan can
 for(const sg of [1,-1]){const pts=[];for(let z=0.80;z>=-0.92;z-=0.05)pts.push([sg*(at(z,1)-0.008),at(z,4)+0.014,z]);
   const front=dot([sg,0,0],camW)>0
   if(front||pitch>20){line(pts,'#cfd8df',0.0018,.85);for(const p of pts)line([[p[0],p[1]-0.014,p[2]],p],'#cfd8df',0.0012,.8)}else line(pts,'#7d8a94',0.0014,.35)}
 // vạch VLS
 for(let i=1;i<8;i++){const z=0.40+0.12*i/8;line([[-0.04,0.0585,z],[0.04,0.0585,z]],'#1a232b',0.0012)}
 for(let i=1;i<4;i++){const x=-0.04+0.08*i/4;line([[x,0.0585,0.40],[x,0.0585,0.52]],'#1a232b',0.0012)}
 // sàn bay
 {const c=[];for(let i=0;i<=36;i++){const a=2*Math.PI*i/36;c.push([0.065*Math.cos(a),0.0555,-0.825+0.065*Math.sin(a)])}line(c,'#eef3f6',0.0025,.9);line([[-0.035,0.0555,-0.825-0.035],[-0.035,0.0555,-0.825+0.035]],'#eef3f6',0.003);line([[0.035,0.0555,-0.825-0.035],[0.035,0.0555,-0.825+0.035]],'#eef3f6',0.003);line([[-0.035,0.0555,-0.825],[0.035,0.0555,-0.825]],'#eef3f6',0.003)}
 // kính cầu chỉ huy + radar panel (mặt trước & hai bên)
 const quad=(pts,col,op=1)=>{const a=pts.map(T);const n=norm(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])));const c=[0,0.08,0.18];const m=pts.reduce((q,p)=>[q[0]+p[0]/4,q[1]+p[1]/4,q[2]+p[2]/4],[0,0,0]);const nn=dot(n,sub(m,c))<0?n.map(v=>-v):n;if(dot(nn,camW)>0.05)out.push(`<polygon points="${pts.map(S).map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')}" fill="${col}" fill-opacity="${op}" stroke="#05090c" stroke-width="${(s*0.0008).toFixed(2)}"/>`)}
 // mặt trước cầu (z lean): đường nghiêng từ (z .26,y .100) lên (z .235,y .135)
 for(let i=0;i<8;i++){const x0=-0.068+i*0.0175,x1=x0+0.0145;quad([[x0,0.112,0.2515],[x1,0.112,0.2515],[x1,0.128,0.2385],[x0,0.128,0.2385]],'#16303f');}
 for(const sg of [1,-1]){for(const [z0,z1] of [[0.20,0.245],[0.065,0.11]]){const xo=0.0995-0.0;quad([[sg*0.0975,0.064,z0],[sg*0.0975,0.064,z1],[sg*0.0925,0.093,z1],[sg*0.0925,0.093,z0]],'#222d36',.95)}}
 quad([[-0.04,0.064,0.2995],[0.04,0.064,0.2995],[0.04,0.092,0.2995],[-0.04,0.092,0.2995]],'#222d36',.9)
 // ăng-ten roi
 for(const [x,z,h] of [[-0.02,0.10,0.2],[0.02,0.14,0.22],[0,-0.14,0.30],[0.01,-0.24,0.28],[-0.015,-0.45,0.19],[0.02,-0.62,0.18]]){line([[x,0.135,z],[x,0.135+h*0.5,z]],'#aab4bc',0.0012,.8)}
 // đèn
 const glow=(p,col,r)=>{const q=S(p);out.push(`<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(s*r*3).toFixed(1)}" fill="${col}" opacity=".25"/><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${(s*r).toFixed(1)}" fill="${col}"/>`)}
 glow([0,0.345,0.12],'#ff3030',0.004);glow([0.098,0.108,0.23],'#ff3030',0.003);glow([-0.098,0.108,0.23],'#30ff70',0.003);glow([0,0.07,-0.93],'#ffffff',0.003)
 for(const [x,z] of [[0.09,0.2],[-0.09,0.2],[0.08,0.12],[-0.08,0.12]])glow([x,0.12,z],'#ffb347',0.002)
 // mưa
 for(let i=0;i<110;i++){const x=(i*137.5)%1600,y=(i*71.3)%1000;out.push(`<path d="M${x} ${y}l-9 30" stroke="#9fb8cc" stroke-opacity=".18" stroke-width="1.2"/>`)}
 return out.join('\n')
}
const cells=[
 {t:'KHU TRỤC HẠM — 3/4 mũi (mạn phải)',yaw:50,pitch:22,s:760,cx:800,cy:560},
 {t:'3/4 đuôi (mạn phải, sàn bay)',yaw:132,pitch:22,s:760,cx:800,cy:560},
 {t:'Cạnh (mạn phải)',yaw:90,pitch:5,s:780,cx:800,cy:560},
 {t:'Trên xuống',yaw:90,pitch:90,s:800,cx:800,cy:500}]
const lab=(t,x,y)=>`<text x="${x}" y="${y}" fill="#4FC3E8" font-family="monospace" font-size="26">${t}</text>`
const sheet=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3200 2000" width="3200" height="2000"><title>destroyer concept sheet</title>`]
cells.forEach((c,i)=>{const ox=(i%2)*1600,oy=Math.floor(i/2)*1000;sheet.push(`<svg x="${ox}" y="${oy}" width="1600" height="1000" viewBox="0 0 1600 1000">${view(c.yaw,c.pitch,c.s,c.cx,c.cy,i)}${lab(c.t,30,50)}<rect x="1" y="1" width="1598" height="998" fill="none" stroke="#1B2630" stroke-width="2"/></svg>`)})
sheet.push('</svg>')
fs.writeFileSync(process.argv[2]+'/destroyer_concept_sheet.svg',sheet.join('\n'))
fs.writeFileSync(process.argv[2]+'/destroyer_concept_hero.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000"><title>destroyer hero</title>${view(42,20,900,800,580,9)}</svg>`)
