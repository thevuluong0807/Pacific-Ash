// Model chế độ "Hải chiến": 3 thân tàu, 8 khí tài, 5 loại đạn. Đơn vị = đơn vị thế giới của src/arena (1 đv ≈ 1 m), KHÔNG nhân WORLD_SCALE.
// Mũi +Z, y = 0 là mặt nước, gốc giữa thân. Hợp đồng node: design/arena-models.md.
// Chạy: node make_arena.mjs <thư mục ra>  (mặc định ../arena)
import fs from 'fs'
import {fileURLToPath} from 'url'
import {Model,box,boxR,cyl,sphere,tr,scale,merge,smooth,bevBox,hullLoft,save} from './glb.mjs'
const OUT=process.argv[2]||fileURLToPath(new URL('../arena',import.meta.url))
fs.mkdirSync(OUT,{recursive:true})
const PI=Math.PI
// ---- dữ liệu thân: sao chép từ src/arena/data.ts (HULLS). Đổi bên đó thì đổi ở đây. ----
const HULLS={
 small:{L:90,B:20,fb:7,dr:3,tw:8,slots:[[2,0,8.5,26,'Mũi'],[1,0,8.5,-30,'Đuôi'],[1,0,16.5,-9,'Đỉnh']]},
 medium:{L:160,B:30,fb:11,dr:5,tw:14,slots:[[3,0,12.5,52,'Mũi'],[2,0,12.5,-52,'Đuôi'],[2,11,12.5,14,'Mạn trái'],[2,-11,12.5,14,'Mạn phải'],[1,0,26.5,-16,'Đỉnh']]},
 large:{L:260,B:42,fb:16,dr:8,tw:24,slots:[[3,0,17.5,92,'Mũi 1'],[3,0,25,60,'Mũi 2'],[2,17,17.5,14,'Mạn trái'],[2,-17,17.5,14,'Mạn phải'],[2,0,17.5,-88,'Đuôi'],[1,0,41.5,-26,'Đỉnh 1'],[1,0,17.5,-62,'Đỉnh 2']]}}
const WEAP={heavy:{barrel:22,size:3},cannon:{barrel:16,size:2},howitzer:{barrel:8,size:2},torpedo:{barrel:6,size:2},missile:{barrel:8,size:2},rocket:{barrel:6,size:1},autocannon:{barrel:8,size:1},mg:{barrel:4,size:1}}
const sc=(r,h,s=16,ax='y',r2)=>smooth(cyl(r,h,s,ax,r2),50)
const cz=(r,len,z0,s=12,r2)=>tr(cyl(r,len,s,'z',r2),[0,0,z0+len/2])   // trụ dọc trục Z, đáy ở z0
const MATS=m=>{m.mat('hull','#6C7A86',.4,.5);m.mat('under','#2A3138',.2,.75);m.mat('deck','#3A444D',.2,.8);m.mat('struct','#7C8995',.35,.5);m.mat('dark','#2A3138',.5,.6);m.mat('steel','#4A545E',.45,.55)
 m.mat('team','#4FC3E8',0,.5,[.3,.76,.91]);m.mat('glass','#0C1E2A',.1,.12);m.mat('radome','#E9EEF2',0,.35);m.mat('hazard','#E8B02E',0,.6);m.mat('white','#F4F7FA',0,.8)
 m.mat('brass','#C9A227',.7,.35);m.mat('glow','#FFD24A',0,.4,[1,.8,.2]);m.mat('rocket','#9AA3AB',.4,.5);m.mat('orange','#E0782A',0,.6);m.mat('navred','#FF3030',0,.5,[1,.1,.1])}
const anch=(m,l,p=m.root)=>{for(const [n,t] of l)m.node(n,t,p)}

// ================= THÂN TÀU =================
function hull(id){const h=HULLS[id],{L,B,fb,dr,tw}=h;const m=new Model('arena_hull_'+id);MATS(m)
 const P={zb:L/2,zs:-L/2,W:B/2,wr:.88,draft:dr,hsB:fb*1.1,hsM:fb,hsS:fb,zmB:.45*L/2,zmS:-.85*L/2,bp:1.4,bq:.9,sw:.88,zN:40}
 const H=hullLoft(P)
 m.mesh('hull_under',H.lower,'under');m.mesh('hull',H.upper,'hull');m.mesh('deck',H.deck,'deck')
 const hs=z=>H.fn(z).hs, wd=z=>H.fn(z).wd
 // sọc màu đội dọc mạn (bám đường mạn thân), lan can hai bên
 const S=[],R=[];for(const s of [-1,1])for(let z=-L*.42;z<L*.36;z+=L*.04){const w=wd(z)-.05,z2=z+L*.04;S.push(boxR(s*w-.05,s*w+.05,hs(z)-1.2,hs(z)-.7,z,z2));R.push(boxR(s*w-.04,s*w+.04,hs(z),hs(z)+.9,z,z+.2))}
 m.mesh('team_stripe',merge(S),'team');m.mesh('rails',merge(R),'steel')
 // cầu chỉ huy: tầng thân + tầng lái + mái phẳng cho khe "Đỉnh"
 const zt=-.1*L,tl=.16*L,bw=B*.5
 m.mesh('bridge',bevBox([-bw,bw,zt-tl/2,zt+tl/2],[-bw*.8,bw*.8,zt-tl/2*.85,zt+tl/2*.85],fb,fb+tw*.7,tw*.05),'struct')
 m.mesh('bridge_top',bevBox([-bw*.9,bw*.9,zt-tl/2*.9,zt+tl/2*.9],[-bw*.85,bw*.85,zt-tl/2*.85,zt+tl/2*.85],fb+tw*.7,fb+tw,tw*.03),'hull')
 const wz=zt+tl/2*.85+.05;const G=[];for(let i=0;i<7;i++){const x0=-bw*.8*.9+i*bw*.8*1.8/7;G.push(boxR(x0+.2,x0+bw*.8*1.8/7-.2,fb+tw*.74,fb+tw*.92,wz-.4,wz+.1))};m.mesh('bridge_win',merge(G),'glass')
 m.mesh('bridge_wing',boxR(-bw*1.08,bw*1.08,fb+tw*.68,fb+tw*.72,zt-tl*.2,zt+tl*.3),'steel')
 // ống khói đặt cạnh mạn để chừa tim tàu cho các khe nòng
 const fz=id==='small'?-.22*L:id==='medium'?-.2*L:-.18*L;const fx=id==='small'?0:B*.2;const fr=id==='small'?B*.14:B*.11,fh=tw*(id==='large'?.9:.8)
 const fxs=id==='small'?[0]:[-fx,fx]
 fxs.forEach((x,i)=>{m.mesh('funnel_'+(i+1),sc(fr,fh,16),'steel',m.root,[x,fb+fh/2,fz]);m.mesh('funnel_band_'+(i+1),sc(fr*1.03,fh*.14,16),'team',m.root,[x,fb+fh*.7,fz]);m.mesh('funnel_grill_'+(i+1),sc(fr*.85,.3,12),'under',m.root,[x,fb+fh+.1,fz]);m.node('smoke_'+i,[x,fb+fh,fz])})
 // cột radar sau cầu, cờ đội trên đỉnh cột
 const mz=zt-tl/2*.7,my=fb+tw*.7,mh=tw*.9
 m.mesh('mast',sc(.45,mh,8),'dark',m.root,[0,my+mh/2,mz]);m.mesh('mast_cross',boxR(-bw*.5,bw*.5,my+mh*.55,my+mh*.55+.3,mz-.2,mz+.2),'dark')
 const rr=m.node('radar_rotor',[0,my+mh,mz]);m.mesh('radar_plate',bevBox([-tw*.35,tw*.35,-.6,.6],[-tw*.33,tw*.33,-.5,.5],0,tw*.12,.15),'dark',rr,[0,.4,0])
 const fl=m.node('flag',[0,my+mh+tw*.15,mz-.3]);m.mesh('flag_pole',sc(.12,tw*.3,6),'dark',fl,[0,tw*.15,0]);m.mesh('flag_cloth',boxR(-.08,.08,tw*.12,tw*.28,-tw*.5,0),'team',fl)
 // neo, tời mũi, nắp hầm
 m.mesh('windlass',sc(B*.04,B*.06,10,'x'),'dark',m.root,[0,hs(L*.4)+B*.03,L*.4]);m.mesh('anchor_l',boxR(wd(L*.42)-B*.1,wd(L*.42)-B*.04,hs(L*.42)-B*.05,hs(L*.42)+B*.03,L*.42,L*.42+B*.07),'dark');m.mesh('anchor_r',boxR(-wd(L*.42)+B*.04,-wd(L*.42)+B*.1,hs(L*.42)-B*.05,hs(L*.42)+B*.03,L*.42,L*.42+B*.07),'dark')
 const HT=[];for(const z of [L*.2,-L*.3,-L*.38])HT.push(tr(cyl(B*.07,.3,10),[B*.15,fb+.15,z]),tr(cyl(B*.07,.3,10),[-B*.15,fb+.15,z]));m.mesh('hatches',merge(HT),'steel')
 // chân vịt và bánh lái lộ dưới đuôi
 for(const x of (id==='small'?[0]:[-B*.2,B*.2]))m.mesh('prop_'+(x<0?'r':x>0?'l':'c'),merge([sc(B*.1,B*.025,10,'z'),box(B*.2,B*.012,B*.02),box(B*.012,B*.2,B*.02)]),'brass',m.root,[x,-dr*.7,-L/2-.5])
 m.mesh('rudder',boxR(-.3,.3,-dr*1.1,-dr*.1,-L/2-2.5,-L/2-.3),'dark')
 // chỗ gắn khí tài: bệ, mâm; slot_N = tâm đế khí tài (y = slot.y - 1.5, khớp yaw.position.y của mã)
 h.slots.forEach(([size,x,y,z,label],i)=>{const by=y-1.5,r=size*2.2+1
  if(by>fb+.2){m.mesh('barbette_'+i,sc(r,by-fb,18),'steel',m.root,[x,fb+(by-fb)/2,z])}
  if(by>fb+.2&&z<-L*.05&&Math.abs(z-zt)>tl/2){} // bệ trên boong thấp: chỉ bệ ống
  m.mesh('slot_ring_'+i,sc(r*.95,.5,20),'under',m.root,[x,by+.25,z])
  m.mesh('slot_pad_'+i,sc(r*.5,.7,12),'team',m.root,[x,by+.6,z])  // mâm trống: ẩn khi gắn khí tài
  m.node('slot_'+i,[x,by,z])})
 anch(m,[['bow',[0,fb,L/2]],['stern',[0,fb,-L/2]],['deck',[0,fb,0]],['bow_wave',[0,0,L/2-1]],['wake_l',[B*.35,0,-L/2]],['wake_r',[-B*.35,0,-L/2]],['dmg_0',[0,fb,L*.3]],['dmg_1',[0,fb+tw*.4,zt]],['dmg_2',[0,fb,-L*.35]],['cam_top',[0,fb+tw*1.2,zt]]])
 return m}

// ================= KHÍ TÀI =================
// root = đế khí tài (y=0 sàn bệ). base: vòng đế tĩnh. yaw: quay ngang. pitch: gắn tại trục nâng (0,1.5,0) khớp với sim (muzzle = slot.y + sin(el)*barrel).
// muzzle = (0,0,barrel) trong hệ pitch; barrel_N là nòng giật lùi (dịch -Z). Mọi nòng/ống/bể nằm dưới pitch.
function weapon(id){const m=new Model('arena_weapon_'+id);MATS(m)
 const spec=WEAP[id],bl=spec.barrel,R=m.root
 const yaw=m.node('yaw',[0,0,0],R),pitch=m.node('pitch',[0,1.5,0],yaw)
 const muz=(z=bl,n='muzzle',p=pitch,x=0,y=0)=>m.node(n,[x,y,z],p)
 const recoilBarrel=(name,x,y,z0,len,r,mat='dark',brake=true)=>{const b=m.node(name,[x,y,0],pitch);m.mesh(name+'_tube',sc(r,len,12,'z'),mat,b,[0,0,z0+len/2]);if(brake){m.mesh(name+'_brake',merge([sc(r*1.5,r*3,12,'z'),tr(sc(r*1.2,r*.6,12,'z'),[0,0,-r*3.3])]),'steel',b,[0,0,z0+len-r*1.5]);}return b}
 if(id==='heavy'||id==='cannon'){const big=id==='heavy',r=big?6.5:4.4,bw=big?1.0:.62
  m.mesh('base',sc(r*1.05,1.1,24),'steel',R,[0,.55,0]);m.mesh('base_ring',sc(r*1.12,.35,24),'under',R,[0,1.1,0])
  m.mesh('turret_body',bevBox([-r*.95,r*.95,-r*1.05,r*.9],[-r*.7,r*.7,-r*.75,r*.55],1.1,big?4.4:3.5,.5),'struct',yaw)
  m.mesh('turret_top',bevBox([-r*.7,r*.7,-r*.75,r*.55],[-r*.55,r*.55,-r*.6,r*.4],big?4.4:3.5,big?5.0:4.0,.3),'hull',yaw)
  m.mesh('turret_team',boxR(-r*.96,r*.96,(big?3.6:2.9),(big?4.0:3.2),-r*.5,-r*.35),'team',yaw)
  m.mesh('mantlet',bevBox([-r*.8,r*.8,0,r*.5],[-r*.7,r*.7,.1,r*.45],-.6,big?2.4:1.8,.3),'dark',pitch,[0,0,r*.45])
  for(const [s,n] of [[-1,'L'],[1,'R']]){recoilBarrel('barrel_'+n,s*bw*1.7,0,r*.5,bl-r*.5,bw*.52)}
  m.mesh('hood_shell',merge([box(1,1,1)].map(g=>scale(g,[r*.5,.4,.2]))),'dark',pitch,[0,bw*1.0,r*.5+.2]);muz(bl,'muzzle');muz(bl,'muzzle_L',pitch,-bw*1.7);muz(bl,'muzzle_R',pitch,bw*1.7)}
 else if(id==='howitzer'){const r=5
  m.mesh('base',sc(r*1.05,1.1,22),'steel',R,[0,.55,0]);m.mesh('turret_body',bevBox([-r*.9,r*.9,-r,r*.8],[-r*.75,r*.75,-r*.8,r*.5],1.1,3.4,.4),'struct',yaw);m.mesh('turret_team',boxR(-r*.9,r*.9,2.4,2.8,-r*.4,-r*.25),'team',yaw)
  m.mesh('cradle',bevBox([-r*.55,r*.55,0,r*.45],[-r*.45,r*.45,.1,r*.4],-.5,2.2,.2),'dark',pitch,[0,0,r*.3])
  m.mesh('recoil_sleeve',sc(1.8,6,14,'z'),'steel',pitch,[0,0,r*.3+2.5]);recoilBarrel('barrel_0',0,0,r*.5,bl-r*.5+1.5,1.1);muz(bl,'muzzle')}
 else if(id==='torpedo'){const bx=3.2
  m.mesh('base',boxR(-4,4,0,1.4,-4.5,4.5),'steel',R);m.mesh('base_rail',boxR(-4.2,4.2,1.4,1.7,-4.7,4.7),'under',R)
  m.mesh('shield',bevBox([-3.6,3.6,-3.6,-1.6],[-3.2,3.2,-3.2,-2],1.4,4.2,.3),'struct',yaw)
  for(const [s,n] of [[-1,'0'],[1,'1']]){const t=m.node('tube_'+n,[s*bx/2,0,0],pitch);m.mesh('tube_'+n+'_body',sc(1.3,bl+3,16,'z'),'dark',t,[0,0,(bl-3)/2]);m.mesh('tube_'+n+'_cap',sc(1.45,.4,16,'z'),'steel',t,[0,0,bl+.2]);m.mesh('tube_'+n+'_band',sc(1.4,.5,16,'z'),'team',t,[0,0,1]);m.mesh('tube_'+n+'_torp',sc(1.0,2,12,'z',.2),'orange',t,[0,0,bl-1.8])}
  m.mesh('cradle',boxR(-bx/2-1.6,bx/2+1.6,-.4,.4,-1.5,bl-1),'steel',pitch);muz(bl,'muzzle');muz(bl,'muzzle_0',pitch,-bx/2);muz(bl,'muzzle_1',pitch,bx/2)}
 else if(id==='missile'){
  m.mesh('base',sc(3.2,1.2,18),'steel',R,[0,.6,0]);m.mesh('yaw_box',bevBox([-3,3,-3,3],[-2.4,2.4,-2.4,2.4],1.2,2.4,.3),'struct',yaw);m.mesh('yaw_team',boxR(-3.02,3.02,1.6,1.9,-2,-1.4),'team',yaw)
  const rl=m.node('rail',[0,0,0],pitch);m.mesh('rail_beam',boxR(-.5,.5,-.9,-.3,-2,bl-1),'dark',rl);m.mesh('rail_arm',boxR(-1,1,-.9,.9,-2.6,-1.6),'steel',rl)
  for(const [s,n] of [[-1,'0'],[1,'1']]){const t=m.node('canister_'+n,[s*1.5,.6,0],rl);m.mesh('canister_'+n+'_body',merge([cz(.9,bl-2,-1.8,12)]),'steel',t);m.mesh('canister_'+n+'_nose',cz(.9,2,bl-3.8,12,.15),'white',t);m.mesh('canister_'+n+'_band',cz(.95,.5,bl-4.5,12),'orange',t);m.mesh('canister_'+n+'_fin',merge([boxR(-1.6,1.6,-.06,.06,-1.8,-.8),boxR(-.06,.06,-1.6,1.6,-1.8,-.8)]),'dark',t)}
  muz(bl,'muzzle');muz(bl,'muzzle_0',pitch,-1.5,.6);muz(bl,'muzzle_1',pitch,1.5,.6)}
 else if(id==='rocket'){
  m.mesh('base',boxR(-2.6,2.6,0,1.4,-2.6,2.6),'steel',R);m.mesh('yaw_pivot',sc(1.8,.8,14),'dark',yaw,[0,1.5,0])
  const pod=m.node('pod',[0,0,0],pitch);m.mesh('pod_box',bevBox([-2.4,2.4,-.5,bl-.2],[-2.2,2.2,-.3,bl-.4],-1.2,1.5,.15),'rocket',pod,[0,.0,0]);m.mesh('pod_band',boxR(-2.45,2.45,.2,.55,.5,1.1),'team',pod)
  for(let i=0;i<6;i++){const tx=((i%3)-1)*1.5,ty=-.55+Math.floor(i/3)*1.2;m.mesh('tube_'+i,sc(.5,.7,10,'z'),'dark',pod,[tx,ty,bl-.15]);m.node('muzzle_'+i,[tx,ty,bl],pod)}
  m.mesh('sights',boxR(-.8,.8,1.5,1.9,.5,1.5),'dark',pod);muz(bl,'muzzle',pod)}
 else if(id==='autocannon'){
  m.mesh('base',sc(2.6,1.0,16),'steel',R,[0,.5,0]);m.mesh('yaw_barbette',bevBox([-2.2,2.2,-2.4,2],[-1.8,1.8,-2,1.6],1,2.2,.3),'struct',yaw);m.mesh('yaw_team',boxR(-2.22,2.22,1.4,1.7,-1.6,-1),'team',yaw)
  m.mesh('gun_shield',bevBox([-1.8,1.8,-.8,1.4],[-1.4,1.4,-.5,1.2],-.9,1.4,.2),'hull',pitch,[0,0,.3]);m.mesh('ammo_drum',sc(1.2,1.2,14,'x'),'brass',pitch,[1.4,-.2,-1])
  recoilBarrel('barrel_0',0,0,.8,bl-.8,.32);m.mesh('cooler',cz(.6,bl*.5,.8,10),'steel',pitch,[0,0,0]);muz(bl,'muzzle')}
 else{ // mg
  m.mesh('base',sc(1.7,1.0,14),'steel',R,[0,.5,0]);m.mesh('pintle',sc(.35,1.2,8),'dark',yaw,[0,1.4,0]);m.mesh('fork',boxR(-.9,.9,.7,1.0,-.5,.5),'dark',yaw,[0,.4,0])
  m.mesh('shield',bevBox([-1.2,1.2,.3,.6],[-1.0,1.0,.3,.55],-.7,.9,.1),'hull',pitch,[0,0,.5]);m.mesh('receiver',boxR(-.35,.35,-.4,.4,-1.2,.8),'steel',pitch);m.mesh('ammo_box',boxR(.5,1.2,-.9,-.1,-.6,.6),'hazard',pitch)
  m.mesh('grips',boxR(-.9,.9,-.1,.1,-1.4,-1.1),'dark',pitch);recoilBarrel('barrel_0',0,0,.8,bl-.8,.16,'dark',false);m.mesh('flash_hider',cz(.28,.6,bl-.5,8),'steel',pitch);muz(bl,'muzzle')}
 return m}

// ================= ĐẠN =================
// Hướng bay +Z, gốc ở tâm thân đạn. `tail` = chỗ phát vệt khói/lửa.
function proj(id){const m=new Model('arena_proj_'+id);MATS(m);const R=m.root
 if(id==='shell'){m.mesh('body',merge([cz(.55,3.2,-1.6,10,.55),cz(.55,1.4,1.5,10,.1)]),'brass',R);m.mesh('band',cz(.58,.4,-1.1,10),'team',R);m.mesh('glow',sphere(.9,8,6),'glow',R,[0,0,-.4]);m.node('tail',[0,0,-1.8])}
 else if(id==='bullet'){m.mesh('tracer',cz(.16,3.4,-1.7,6,.05),'glow',R);m.node('tail',[0,0,-1.7])}
 else if(id==='torpedo'){m.mesh('body',merge([cz(1,6.5,-3.4,14,1),cz(1,1.8,3,14,.2)]),'orange',R);m.mesh('band',cz(1.02,.5,.4,14),'team',R);m.mesh('fins',merge([boxR(-1.8,1.8,-.08,.08,-3.6,-2.6),boxR(-.08,.08,-1.8,1.8,-3.6,-2.6)]),'dark',R);m.mesh('screw',merge([box(2,.1,.3),box(.1,2,.3)]),'steel',R,[0,0,-3.8]);m.node('tail',[0,0,-4])}
 else if(id==='missile'){m.mesh('body',merge([cz(.55,5.8,-3,12,.55),cz(.55,2.4,2.8,12,.1)]),'white',R);m.mesh('band',cz(.58,.5,.8,12),'orange',R);m.mesh('wings',merge([boxR(-2.2,2.2,-.05,.05,-.6,.9),boxR(-.05,.05,-2.2,2.2,-.6,.9)]),'dark',R);m.mesh('fins',merge([boxR(-1.3,1.3,-.05,.05,-3.1,-2.2),boxR(-.05,.05,-1.3,1.3,-3.1,-2.2)]),'dark',R);m.mesh('flame',cz(.4,2,-5,8,.05),'glow',R);m.node('tail',[0,0,-5])}
 else{m.mesh('body',merge([cz(.3,3.4,-1.8,8,.3),cz(.3,1,1.6,8,.06)]),'rocket',R);m.mesh('fins',merge([boxR(-.8,.8,-.04,.04,-1.9,-1.3),boxR(-.04,.04,-.8,.8,-1.9,-1.3)]),'dark',R);m.mesh('flame',cz(.25,1.4,-3.2,8,.04),'glow',R);m.node('tail',[0,0,-3.2])}
 return m}

const out=[]
for(const id of Object.keys(HULLS))out.push(save(hull(id),OUT))
for(const id of Object.keys(WEAP))out.push(save(weapon(id),OUT))
for(const id of ['shell','bullet','torpedo','missile','rocket'])out.push(save(proj(id),OUT))
console.log(out.map(s=>`${s.name}: ${s.tris} tam giác, ${s.nodes} node, ${(s.bytes/1024).toFixed(1)} KB`).join('\n'))
