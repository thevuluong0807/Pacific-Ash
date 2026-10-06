// Mảnh xác tàu nổi (linh kiện chìm nổi) cho ô trúng ở cảnh 3D. Tỉ lệ thế giới ×10 (1 ô = 10 đơn vị), xem design/world-scale.md.
import {Model,box,boxR,cyl,sphere,extrude,tr,scale,merge,smooth,rows,rotY,bevBox,save} from './glb.mjs'
const OUT=process.argv[2]
const S=10
const MATS=m=>{m.mat('hull','#B7C1CB',.3,.5);m.mat('hullb','#8E99A4',.3,.55);m.mat('dark','#34404A',.25,.6);m.mat('scorch','#15110F',.1,.9);m.mat('rust','#8A431F',.1,.85);m.mat('ember','#FF6A1A',0,.5,[1,.35,.08]);m.mat('orange','#E08A2E',0,.6);m.mat('glass','#0C1E2A',.1,.12);m.mat('radome','#E9EEF2',0,.4);m.mat('hazard','#E8B02E',0,.6);m.mat('white','#F4F7FA',0,.8)}
const sc=(r,h,s=14,ax='y',r2)=>smooth(cyl(r,h,s,ax,r2),50),ss=(r,a=14,b=9)=>smooth(sphere(r,a,b),50)
const mk=(name,build)=>{const m=new Model(name);m.S=S;MATS(m);build(m);return m}
const rot=(m,n,ax,deg)=>m.rot(n,[...ax,deg*Math.PI/180])
const pts=(m,fire,smoke,glow)=>{m.node('float_line',[0,0,0]);m.node('fire_point',fire);m.node('smoke_point',smoke);m.node('glow_point',glow)}
const out=[];const sv=m=>save(m,OUT)
// 1. tấm vỏ tàu xé cong (chung)
out.push(sv(mk('debris_plate',m=>{
 const P=[[-.40,-.22],[-.15,-.30],[.12,-.26],[.30,-.12],[.38,.1],[.16,.26],[-.10,.22],[-.34,.14]]
 const a=m.node('plate_a',[0,0.015,0]);m.mesh('plate_a_body',smooth(extrude(P.filter(p=>p[0]<=.02||p[1]<-.2),0,.035),30),'hull',a)
 const b=m.node('plate_b',[.02,0.015,0]);rot(m,b,[0,0,1],-16)
 m.mesh('plate_b_body',smooth(extrude([[.0,-.27],[.12,-.26],[.30,-.12],[.38,.10],[.16,.26],[.0,.24]],0,.035),30),'hullb',b)
 m.mesh('plate_a_full',smooth(extrude([[-.40,-.22],[-.15,-.30],[.0,-.27],[.0,.23],[-.10,.22],[-.34,.14]],0,.035),30),'hull',a)
 m.mesh('scorch',smooth(extrude([[-.30,-.12],[-.08,-.18],[-.02,.05],[-.22,.12]],.035,.0365),30),'scorch',a)
 m.mesh('rust',boxR(-.38,-.15,.035,.037,.08,.13),'rust',a)
 const ribs=[];for(let i=0;i<4;i++)ribs.push(boxR(-.30+i*.2,-.285+i*.2,-.05,.0,-.2,.2));m.mesh('ribs',merge(ribs),'dark',a)
 m.mesh('hot_edge',merge([boxR(.20,.37,.035,.039,.0,.012),boxR(.30,.38,.035,.039,-.1,-.085)]),'ember',b)
 pts(m,[.15,.06,.0],[.15,.2,.0],[.1,.08,0])})))
// 2. đoạn cột bị gãy
out.push(sv(mk('debris_mast',m=>{
 const r=m.node('mast_tilt',[0,.02,0]);rot(m,r,[0,0,1],62)
 m.mesh('mast_pole',sc(.012,.7,10),'dark',r,[0,.35,0]);m.mesh('mast_stump',bevBox([-.04,.04,-.04,.04],[-.035,.035,-.035,.035],-.01,.05,.01),'hullb',r,[0,0,0])
 m.mesh('mast_cross',merge([boxR(-.05,.05,.30,.303,-.002,.002),boxR(-.04,.04,.42,.423,-.002,.002),boxR(-.03,.03,.54,.543,-.002,.002)]),'dark',r)
 const d=m.node('radar_bent',[0,.68,0],r);rot(m,d,[0,0,1],-38);m.mesh('radar_plate',bevBox([-.06,.06,-.01,.01],[-.055,.055,-.008,.008],0,.02,.004),'dark',d)
 m.mesh('mast_scorch',sc(.0135,.14,10),'scorch',r,[0,.07,0]);m.mesh('mast_ember',ss(.016,8,6),'ember',r,[0,.7,0])
 m.mesh('float_plate',smooth(extrude([[-.2,-.12],[.1,-.18],[.22,.0],[.1,.16],[-.18,.12]],0,.025),30),'hullb',m.root,[0,0,0])
 pts(m,[.3,.35,0],[.35,.5,0],[.25,.2,0])})))
// 3. mảnh tháp pháo
out.push(sv(mk('debris_turret',m=>{
 const t=m.node('turret_tilt',[0,.015,0]);rot(m,t,[1,0,0],24)
 m.mesh('base',sc(.07,.03,18),'dark',t,[0,.015,0]);m.mesh('shield',bevBox([-.055,.055,-.07,.07],[-.035,.035,-.04,.05],0,.04,.008),'hull',t,[0,.03,0])
 m.mesh('scorch',bevBox([-.056,.056,-.0,.05],[-.036,.036,-.0,.04],0,.012,.004),'scorch',t,[0,.065,0])
 const b1=m.node('barrel_a',[0,.045,.03],t);m.mesh('barrel_a_m',sc(.006,.10,10,'z'),'dark',b1,[0,0,.05])
 const b2=m.node('barrel_b',[0,0,.1],b1);rot(m,b2,[1,0,0],38);m.mesh('barrel_b_m',sc(.006,.06,10,'z'),'dark',b2,[0,0,.03]);m.mesh('muzzle_brake',sc(.009,.014,10,'z'),'dark',b2,[0,0,.06])
 m.mesh('hot',merge([boxR(-.04,.0,.04,.045,.035,.06)]),'ember',t)
 m.mesh('float_deck',smooth(extrude([[-.14,-.12],[.12,-.15],[.16,.08],[-.1,.14]],0,.02),30),'hullb',m.root)
 pts(m,[0,.1,0],[0,.14,0],[0,.08,0])})))
// 4. khối thân tàu (có sườn)
out.push(sv(mk('debris_hullchunk',m=>{
 const P=[[-.45,-.16],[.12,-.26],[.42,-.1],[.4,.14],[.1,.28],[-.42,.2]]
 m.mesh('chunk_outer',smooth(extrude(P,-.03,.07),30),'hull',m.root);m.mesh('chunk_inner',smooth(extrude(P.map(([x,z])=>[x*.86,z*.86]),.05,.0705),30),'scorch',m.root)
 const R=[];for(let i=0;i<6;i++)R.push(boxR(-.36+i*.15,-.345+i*.15,.07,.15,-.2,.2));m.mesh('ribs',merge(R),'dark',m.root)
 m.mesh('beam',merge([boxR(-.38,.4,.15,.158,-.01,.01)]),'dark');m.mesh('hot',merge([boxR(.2,.4,.07,.078,-.1,.02),boxR(-.4,-.2,.07,.077,.12,.18)]),'ember');m.mesh('rust',boxR(.1,.3,.07,.0715,.06,.14),'rust')
 pts(m,[.0,.1,.0],[.05,.25,.05],[0,.1,0])})))
// 5. thùng hàng và bình cứu sinh
out.push(sv(mk('debris_cargo',m=>{
 const a=m.node('crate_a',[-.1,.02,0]);rot(m,a,[0,1,0],24);m.mesh('crate_a_m',bevBox([-.1,.1,-.07,.07],[-.095,.095,-.065,.065],0,.09,.008),'orange',a)
 const b=m.node('crate_b',[.12,.015,.06]);rot(m,b,[0,1,0],-12);rot(m,b,[0,0,1],14);m.mesh('crate_b_m',bevBox([-.08,.08,-.06,.06],[-.075,.075,-.055,.055],0,.07,.006),'hullb',b)
 const c=m.node('canister',[.0,.012,-.14]);rot(m,c,[0,1,0],40);m.mesh('canister_m',sc(.04,.16,12,'z'),'hazard',c);m.mesh('canister_band',sc(.0415,.02,12,'z'),'dark',c)
 m.mesh('strap',merge([boxR(-.1,.1,.09,.093,-.071,-.069),boxR(-.1,.1,.09,.093,.069,.071)]),'dark',a);m.mesh('scorch',boxR(-.06,.06,.09,.0915,-.04,.04),'scorch',a)
 m.mesh('hot',boxR(-.08,.1,.0,.01,.05,.07),'ember',b)
 pts(m,[.0,.1,0],[.0,.2,0],[0,.1,0])})))
// 6. đoạn ống khói
out.push(sv(mk('debris_funnel',m=>{
 const f=m.node('funnel_tilt',[0,.02,0]);rot(m,f,[0,0,1],70);rot(m,f,[0,1,0],20)
 m.mesh('funnel_body',bevBox([-.05,.05,-.07,.07],[-.04,.04,-.06,.06],0,.2,.01),'dark',f);m.mesh('funnel_grill',boxR(-.034,.034,.2,.204,-.054,.054),'scorch',f)
 const P=[];for(let i=0;i<4;i++)P.push(tr(cyl(.006,.12,8),[-.03+i*.02,.1,.075]));m.mesh('pipes',merge(P),'hullb',f)
 m.mesh('soot',bevBox([-.052,.052,-.072,.072],[-.042,.042,-.062,.062],.14,.2,.01),'scorch',f)
 m.mesh('float_plate',smooth(extrude([[-.15,-.1],[.1,-.14],[.2,.02],[.05,.14],[-.14,.1]],0,.022),30),'hullb',m.root)
 pts(m,[.12,.1,0],[.18,.22,0],[.1,.1,0])})))
// 7. cánh máy bay (tàu sân bay)
out.push(sv(mk('debris_wing',m=>{
 m.mesh('wing',smooth(extrude([[0,.20],[.30,-.06],[.32,-.12],[-.02,-.10]],0,.012),30),'hull',m.root,[0,.02,0]);m.mesh('wing_scorch',smooth(extrude([[.06,.08],[.2,-.02],[.04,-.02]],.012,.0125),30),'scorch',m.root,[0,.02,0])
 const f=m.node('fin',[.2,.03,-.16]);rot(m,f,[0,0,1],72);m.mesh('fin_m',boxR(-.0015,.0015,0,.09,-.05,.05),'hullb',f)
 m.mesh('pylon',boxR(.1,.12,.0,.02,.0,.05),'dark',m.root,[0,.02,0]);m.mesh('rocket_stub',sc(.012,.12,8,'z'),'white',m.root,[.11,.035,.05]);m.mesh('hot',boxR(.28,.31,.02,.026,-.12,-.1),'ember',m.root,[0,.02,0])
 pts(m,[.1,.05,.0],[.15,.2,.0],[.1,.08,0])})))
// 8. mảnh nắp ô phóng VLS (tàu tên lửa)
out.push(sv(mk('debris_vls',m=>{
 m.mesh('panel',bevBox([-.2,.2,-.14,.14],[-.19,.19,-.13,.13],0,.04,.006),'dark',m.root,[0,.01,0])
 const H=[];for(let i=0;i<4;i++)for(let j=0;j<3;j++)H.push(boxR(-.17+i*.09,-.1+i*.09,.05,.056,-.12+j*.085,-.05+j*.085));m.mesh('hatches',merge(H),'hullb',m.root,[0,.01,0])
 const lid=m.node('open_lid',[-.1,.062,.0]);rot(m,lid,[0,0,1],-62);m.mesh('lid',boxR(0,.09,0,.006,-.04,.04),'hullb',lid);m.mesh('missile_stub',sc(.014,.16,8,'z'),'white',m.root,[.07,.07,.0]);m.mesh('hazard',boxR(-.2,-.17,.05,.058,-.14,.14),'hazard',m.root,[0,.01,0]);m.mesh('hot',boxR(.1,.2,.05,.058,-.05,.05),'ember',m.root,[0,.01,0])
 pts(m,[.07,.1,0],[.07,.25,0],[.05,.1,0])})))
// 9. mảnh tháp chỉ huy tàu ngầm
out.push(sv(mk('debris_sail',m=>{
 const s=m.node('sail_tilt',[0,.0,0]);rot(m,s,[0,0,1],28);m.mesh('sail_body',bevBox([-.06,.06,-.22,.22],[-.05,.05,-.19,.19],0,.13,.02),'hullb',s,[0,.02,0])
 const p=m.node('periscope_bent',[0,.15,.06],s);rot(m,p,[0,0,1],-50);m.mesh('periscope_m',sc(.005,.14,8),'dark',p,[0,.07,0]);m.mesh('periscope_head',ss(.008,8,6),'glass',p,[0,.145,0])
 m.mesh('plane',boxR(.05,.2,.04,.047,-.04,.04),'dark',s);m.mesh('scorch',boxR(-.052,.052,.1,.12,-.16,.16),'scorch',s,[0,.02,0]);m.mesh('hot',boxR(-.04,.04,.0,.008,.15,.22),'ember',s,[0,.02,0])
 pts(m,[.0,.12,0],[.0,.25,0],[0,.1,0])})))
// 10. mảnh vòm radar (tàu hộ vệ)
out.push(sv(mk('debris_radome',m=>{
 const r=m.node('dome_tilt',[0,.0,0]);rot(m,r,[1,0,0],26);m.mesh('dome',scale(ss(.17,18,10),[1,.55,1]),'radome',r,[0,.07,0]);m.mesh('dome_base',sc(.175,.02,24),'dark',r,[0,.01,0])
 const C=[];for(let i=0;i<5;i++)C.push(boxR(-.002,.002,.0,.0012,-.12+i*.05,.12-i*.04));m.mesh('cracks',merge(C),'scorch',r,[0,.155,0])
 m.mesh('ciws_stub',sc(.014,.03,10),'dark',m.root,[.2,.012,.08]);m.mesh('antenna_bent',sc(.004,.2,6),'dark',m.root,[-.2,.04,-.1])
 m.mesh('hot',boxR(.1,.17,.04,.048,-.02,.04),'ember',r)
 pts(m,[.1,.14,0],[.1,.3,0],[.1,.12,0])})))
console.log(out.map(s=>`${s.name}: ${s.tris} tam giác, ${s.nodes} node, ${(s.bytes/1024).toFixed(1)} KB`).join('\n'))
