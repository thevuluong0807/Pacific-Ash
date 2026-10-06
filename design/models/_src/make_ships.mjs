// Model tàu v2: thân loft mượt, thượng tầng vát mép, nhiều chi tiết, bám theo sprite 2D. Hợp đồng node/neo giữ nguyên v1.
import {Model,box,boxR,cyl,sphere,extrude,tr,scale,merge,smooth,rows,rotY,revolve,bevBox,hullLoft,save} from './glb.mjs'
const OUT=process.argv[2]
const WORLD_SCALE=10   // 1 ô lưới = 10 đơn vị thế giới (model nhân 10, ngang cỡ tàu ở nền màn chờ)
const MATS=m=>{m.mat('hull','#C4CDD6',.3,.45);m.mat('under','#2C353D',.2,.7);m.mat('deck','#8A949C',.15,.75);m.mat('decklight','#B4BEC7',.15,.7);m.mat('struct','#B9C4CE',.3,.5);m.mat('dark','#3A444E',.25,.6);m.mat('orange','#E08A2E',0,.6);m.mat('glass','#0C1E2A',.1,.12);m.mat('radome','#E9EEF2',0,.35);m.mat('white','#F4F7FA',0,.8);m.mat('hazard','#E8B02E',0,.6);m.mat('rail','#CBD4DC',.3,.5);m.mat('navred','#FF3030',0,.5,[1,.1,.1]);m.mat('navgreen','#30FF70',0,.5,[.1,1,.3]);m.mat('navwhite','#FFFFFF',0,.5,[1,1,1])}
const sc=(r,h,s=18,ax='y',r2)=>smooth(cyl(r,h,s,ax,r2),50),ss=(r,a=16,b=10)=>smooth(sphere(r,a,b),50)
const anch=(m,l)=>{for(const [n,t] of l)m.node(n,t)}
const stats=[];export const builders={};export const MATS_EXPORT=MATS
// --- chi tiết dùng chung ---
const hullParts=(m,H,{deckInset=.012,rails=true,railZ0,railZ1,railStep=.05}={})=>{
 m.mesh('hull_under',H.lower,'under');m.mesh('hull',H.upper,'hull');m.mesh('deck',H.deck,'deck')
 const f=H.fn;const dz=[];const zs=[];for(let z=railZ1;z>=railZ0;z-=0.02)zs.push(z)
 const dr=zs.map(z=>{const {wd,hs}=f(z);return [[-(wd-deckInset),hs+.0012,z],[(wd-deckInset),hs+.0012,z]]})
 m.mesh('deck_plate',rows(dr,{ref:(p)=>[p[0],p[1]-1,p[2]]}),'decklight')
 if(rails){const R=[];for(const s of [-1,1]){let prev=null;for(let z=railZ1;z>=railZ0;z-=railStep){const {wd,hs}=f(z);const x=s*(wd-.007);R.push(boxR(x-.0009,x+.0009,hs,hs+.016,z-.0009,z+.0009));if(prev){R.push(boxR((x+prev.x)/2-.0007,(x+prev.x)/2+.0007,hs+.0155,hs+.0172,Math.min(z,prev.z),Math.max(z,prev.z)));R.push(boxR((x+prev.x)/2-.0006,(x+prev.x)/2+.0006,hs+.0078,hs+.0092,Math.min(z,prev.z),Math.max(z,prev.z)))};prev={x,z}}}
  m.mesh('rails',merge(R),'rail')}
 // bích buộc dây và đèn hành trình
 const B=[];for(const s of [-1,1])for(let z=railZ1-.1;z>=railZ0+.1;z-=.3){const {wd,hs}=f(z);B.push(tr(scale(cyl(.005,.012,8),[1,1,1]),[s*(wd-.02),hs+.006,z]))}
 m.mesh('bollards',merge(B),'dark')}
const lights=(m,zw,y,x=.09,zs)=>{m.mesh('nav_port',ss(.004,8,6),'navred',m.root,[x,y,zw]);m.mesh('nav_stbd',ss(.004,8,6),'navgreen',m.root,[-x,y,zw]);m.mesh('nav_stern',ss(.004,8,6),'navwhite',m.root,[0,y-.02,zs])}
const winRow=(m,name,xs,y0,y1,z,t=.0025,n=6)=>{const [a,b]=xs;const G=[];const w=(b-a)/n;for(let i=0;i<n;i++)G.push(boxR(a+i*w+.002,a+(i+1)*w-.002,y0,y1,z,z+t));m.mesh(name,merge(G),'glass')}
const winSide=(m,name,x,y0,y1,z0,z1,n=5)=>{const G=[];const w=(z1-z0)/n;for(const s of [-1,1])for(let i=0;i<n;i++)G.push(boxR(s>0?x:-x-.0025,s>0?x+.0025:-x,y0,y1,z0+i*w+.002,z0+(i+1)*w-.002));m.mesh(name,merge(G),'glass')}
const ciws6=(m,name,pos)=>{const n=m.node(name,pos);m.mesh(name+'_base',sc(.012,.012,12),'dark',n,[0,.006,0]);const pt=m.node(name+'_pitch',[0,.018,0],n);m.mesh(name+'_dome',ss(.0095,12,8),'radome',pt,[0,.002,0]);const sp=m.node(name+'_spin',[0,0,0],pt);const B=[];for(let k=0;k<6;k++){const a=k/6*Math.PI*2;B.push(tr(cyl(.0012,.016,5,'z'),[Math.cos(a)*.0035,Math.sin(a)*.0035,.012]))};m.mesh(name+'_barrels',merge(B),'dark',sp);m.mesh(name+'_barrel_ring',sc(.0046,.002,12,'z'),'dark',sp,[0,0,.018]);m.node(name+'_muzzle',[0,0,.022],pt);return n}
const turret=(m,name,pos,twin=false,rad=.034)=>{const t=m.node('turret_'+name,pos);m.mesh('turret_base_'+name,sc(rad,.02,20),'dark',t,[0,.01,0]);m.mesh('turret_ring_'+name,sc(rad*1.08,.004,20),'struct',t,[0,.002,0]);m.mesh('turret_shield_'+name,bevBox([-rad*.9,rad*.9,-rad,rad],[-rad*.62,rad*.62,-rad*.55,rad*.8],0,.026,.006),'struct',t,[0,.02,0])
 const offs=twin?[-.012,.012]:[0];offs.forEach((dx,i)=>{const sfx=twin?(i?'R':'L'):'';const b=m.node('barrel_'+name+sfx,[dx,.037,.03],t);m.mesh('barrel_mesh_'+name+sfx,sc(.0035,.075,10,'z'),'dark',b,[0,0,.0375]);m.mesh('muzzle_brake_'+name+sfx,sc(.0052,.009,10,'z'),'dark',b,[0,0,.07]);m.node('muzzle_'+name+sfx,[0,0,.077],b)});return t}
const mast=(m,x,z,y0,h,dish=true)=>{m.mesh('mast',sc(.0065,h,10),'dark',m.root,[x,y0+h/2,z]);m.mesh('mast_base',sc(.012,.01,12),'dark',m.root,[x,y0+.005,z]);const A=[];for(let i=0;i<3;i++){const yy=y0+h*(.45+i*.18);A.push(boxR(x-.028+i*.006,x+.028-i*.006,yy,yy+.0025,z-.0015,z+.0015))};m.mesh('mast_cross',merge(A),'dark')
 const r=m.node('radar_rotor',[x,y0+h+.004,z]);m.mesh('radar_pedestal',sc(.008,.012,10),'dark',r,[0,0,0]);m.mesh('radar_plate',bevBox([-.032,.032,-.007,.007],[-.03,.03,-.005,.005],0,.014,.003),'dark',r,[0,.012,0]);m.mesh('radar_dome',ss(.005,8,6),'radome',m.root,[x,y0+h+.034,z]);return r}
const antennas=(m,list)=>{const A=[];for(const [x,z,y,h] of list)A.push(tr(cyl(.0012,h,5),[x,y+h/2,z]));m.mesh('antennas',merge(A),'dark')}
const helideck=(m,z,r=.065,y=.0525)=>{m.mesh('helideck_disc',sc(r+.008,.002,28),'deck',m.root,[0,y,z]);m.mesh('helideck_ring',sc(r,.0025,28),'white',m.root,[0,y+.0006,z]);m.mesh('helideck_inner',sc(r-.006,.0028,28),'deck',m.root,[0,y+.0008,z]);m.mesh('helideck_h',merge([boxR(-.022,-.016,0,.0032,-.025,.025),boxR(.016,.022,0,.0032,-.025,.025),boxR(-.016,.016,0,.0032,-.003,.003)].map(g=>tr(g,[0,y+.001,z]))),'white')}
const boat=(m,name,x,z,y,len=.12)=>{const n=m.node(name,[x,y,z]);m.mesh(name+'_hull',scale(ss(.028,12,8),[1,.5,len/.056]),'orange',n);m.mesh(name+'_console',bevBox([-.012,.012,-.01,.01],[-.009,.009,-.007,.007],0,.012,.003),'dark',n,[0,.012,.0]);return n}
const funnel=(m,name,b,t,y0,y1)=>{m.mesh(name,bevBox(b,t,y0,y1,.006),'dark');const cx=(t[0]+t[1])/2,cz=(t[2]+t[3])/2;m.mesh(name+'_grill',boxR(t[0]+.006,t[1]-.006,y1,y1+.003,t[2]+.006,t[3]-.006),'under');m.node('exhaust_'+name.slice(-1),[cx,y1+.004,cz])}
const rafts=(m,pts)=>{const G=[];for(const [x,y,z] of pts)G.push(tr(cyl(.007,.03,8,'z'),[x,y,z]));m.mesh('life_rafts',merge(G),'hazard')}
const hatches=(m,pts,r=.008)=>{const G=pts.map(([x,y,z])=>tr(cyl(r,.003,10),[x,y,z]));m.mesh('hatches',merge(G),'dark')}
const vlsGrid=(m,name,x0,x1,z0,z1,y,cols,rowsN)=>{m.mesh(name,boxR(x0,x1,y,y+.006,z0,z1),'dark');const hs=[];for(let i=0;i<cols;i++)for(let j=0;j<rowsN;j++){const zc=z0+(i+.5)*(z1-z0)/cols,xc=x0+(j+.5)*(x1-x0)/rowsN;const hw=(x1-x0)/rowsN/2*.8,hz=(z1-z0)/cols/2*.8;hs.push(boxR(xc-hw,xc+hw,y+.006,y+.0085,zc-hz,zc+hz))};m.mesh(name+'_hatches',merge(hs),'deck');m.mesh(name+'_hz1',boxR(x0,x0+.02,y+.006,y+.009,z0,z0+.04),'hazard');m.mesh(name+'_hz2',boxR(x1-.02,x1,y+.006,y+.009,z1-.04,z1),'hazard')}
const anchorGear=(m,z,y)=>{m.mesh('windlass',sc(.011,.018,10,'x'),'dark',m.root,[0,y+.012,z]);m.mesh('anchor_port',boxR(.03,.044,y-.006,y+.01,z+.05,z+.07),'dark');m.mesh('anchor_stbd',boxR(-.044,-.03,y-.006,y+.01,z+.05,z+.07),'dark')}
// ============ KHU TRỤC HẠM ============
builders.destroyer=(m)=>{MATS(m)
 const H=hullLoft(m.HP={zb:.95,zs:-.95,W:.19,wr:.88,draft:.045,hsB:.075,hsM:.05,hsS:.055,zmB:.3,zmS:-.55,bp:2.1,bq:.7,sw:.84})
 hullParts(m,H,{railZ0:-.9,railZ1:.82});lights(m,.2,.108,.098,-.93)
 m.mesh('bridge1',bevBox([-.1,.1,.02,.3],[-.088,.088,.035,.285],.05,.1,.009),'struct');m.mesh('bridge2',bevBox([-.085,.085,.1,.26],[-.074,.074,.115,.235],.1,.135,.008),'struct')
 winRow(m,'bridge_win_front1',[-.068,.068],.074,.092,.2915,.0025,8);winRow(m,'bridge_win_front2',[-.058,.058],.115,.129,.2375,.0025,7);winSide(m,'bridge_win_side',.0795,.114,.128,.12,.22,5)
 const rp=[];for(const s of [-1,1]){rp.push(boxR(s>0?.094:-.098,s>0?.098:-.094,.06,.092,.2,.245),boxR(s>0?.094:-.098,s>0?.098:-.094,.06,.092,.06,.105))};m.mesh('radar_panels',merge(rp),'dark')
 m.mesh('midhouse',bevBox([-.08,.08,-.28,.02],[-.07,.07,-.26,0],.05,.095,.007),'struct');winSide(m,'midhouse_win',.0775,.07,.082,-.24,-.02,6)
 m.mesh('hangar',bevBox([-.12,.12,-.7,-.46],[-.108,.108,-.68,-.48],.052,.105,.009),'struct');m.mesh('hangar_door',boxR(-.1,.1,.056,.098,-.7005,-.699),'dark');m.mesh('hangar_seam',boxR(-.0012,.0012,.058,.1,-.7015,-.6995),'under')
 funnel(m,'funnel_1',[-.035,.035,-.09,.01],[-.03,.03,-.12,-.03],.095,.15);funnel(m,'funnel_2',[-.035,.035,-.25,-.15],[-.03,.03,-.28,-.19],.095,.15)
 mast(m,0,.12,.135,.17);antennas(m,[[-.02,.1,.135,.12],[.022,.14,.135,.14],[0,-.14,.15,.12],[.012,-.24,.15,.11],[-.015,-.45,.105,.1]])
 turret(m,'fwd',[0,.05,.66]);turret(m,'aft',[0,.05,-.4])
 vlsGrid(m,'vls_fwd',-.04,.04,.4,.52,.05,8,4)
 ciws6(m,'ciws_1',[0,.095,-.3]);ciws6(m,'ciws_2',[0,.105,-.52])
 boat(m,'boat_port',.092,-.11,.063);boat(m,'boat_stbd',-.092,-.11,.063);rafts(m,[[.07,.092,-.13],[-.07,.092,-.13],[.07,.092,-.2],[-.07,.092,-.2]])
 helideck(m,-.825);anchorGear(m,.78,.075);hatches(m,[[.06,.0525,.62],[-.06,.0525,.62],[.05,.0525,-.1],[-.05,.0525,-.1],[0,.0525,-.64]])
 anch(m,[['muzzle',[0,.087,.74]],['muzzle_1',[0,.087,.735]],['muzzle_2',[0,.087,-.325]],['launch',[0,.058,.46]],['bow',[0,.06,.95]],['stern',[0,.06,-.95]],['deck',[0,.05,0]],['cell_0',[0,.05,-.5]],['cell_1',[0,.05,.5]],['fire_0',[0,.06,-.5]],['fire_1',[0,.06,.5]]])
 m.node('dmg_cell0');m.node('dmg_cell1')}
// ============ TUẦN DƯƠNG ============
builders.cruiser=(m)=>{MATS(m)
 const H=hullLoft(m.HP={zb:1.45,zs:-1.45,W:.2,wr:.88,draft:.05,hsB:.085,hsM:.055,hsS:.06,zmB:.5,zmS:-1.0,bp:2.2,bq:.7,sw:.85,zN:48})
 hullParts(m,H,{railZ0:-1.38,railZ1:1.3,railStep:.06});lights(m,.3,.12,.108,-1.42)
 m.mesh('bridge1',bevBox([-.11,.11,.12,.4],[-.095,.095,.14,.38],.055,.12,.01),'struct');m.mesh('bridge2',bevBox([-.085,.085,.17,.34],[-.07,.07,.19,.32],.12,.17,.009),'struct')
 winRow(m,'bridge_win_front1',[-.08,.08],.082,.1,.3925,.0025,8);winRow(m,'bridge_win_front2',[-.058,.058],.14,.158,.3225,.0025,7);winSide(m,'bridge_win_side',.0895,.136,.152,.2,.32,5)
 const rp=[];for(const s of [-1,1])rp.push(boxR(s>0?.104:-.108,s>0?.108:-.104,.065,.105,.18,.24),boxR(s>0?.104:-.108,s>0?.108:-.104,.065,.105,.3,.36));m.mesh('radar_panels',merge(rp),'dark')
 m.mesh('midhouse',bevBox([-.09,.09,-.2,.12],[-.08,.08,-.18,.1],.055,.1,.008),'struct');winSide(m,'midhouse_win',.0875,.075,.088,-.17,.08,8)
 funnel(m,'funnel_1',[-.06,.06,-.1,.02],[-.05,.05,-.12,0],.1,.17)
 m.mesh('hangar',bevBox([-.12,.12,-.92,-.62],[-.108,.108,-.9,-.64],.057,.105,.009),'struct');m.mesh('hangar_door',boxR(-.1,.1,.06,.1,-.9205,-.919),'dark')
 mast(m,0,.28,.17,.25);antennas(m,[[-.03,.2,.17,.2],[.03,.34,.17,.22],[0,-.1,.17,.14],[.02,-.7,.105,.12],[-.02,-.8,.057,.0]])
 turret(m,'1',[0,.055,1.0],true,.048);m.mesh('barbette_2',sc(.052,.03,20),'dark',m.root,[0,.07,.74]);turret(m,'2',[0,.085,.74],true,.048);turret(m,'3',[0,.055,-.42],true,.048)
 ciws6(m,'ciws_1',[0,.1,.2]);ciws6(m,'ciws_2',[0,.105,-.65])
 boat(m,'boat_port',.1,-.08,.067,.14);boat(m,'boat_stbd',-.1,-.08,.067,.14);rafts(m,[[.08,.098,-.12],[-.08,.098,-.12],[.08,.098,-.16],[-.08,.098,-.16],[.08,.098,.0],[-.08,.098,.0]])
 helideck(m,-1.17,.08,.0575);anchorGear(m,1.22,.08);hatches(m,[[.07,.058,.55],[-.07,.058,.55],[.06,.058,-.1],[-.06,.058,-.1]])
 anch(m,[['muzzle',[.012,.092,1.075]],['muzzle_1',[.012,.092,1.075]],['launch',[0,.06,-1.17]],['bow',[0,.065,1.45]],['stern',[0,.065,-1.45]],['deck',[0,.055,0]],['cell_0',[0,.055,-1]],['cell_1',[0,.055,0]],['cell_2',[0,.055,1]],['fire_0',[0,.065,-1]],['fire_1',[0,.065,0]],['fire_2',[0,.065,1]],['cam_gun',[0,.1,.7]]])
 m.node('dmg_cell0');m.node('dmg_cell1');m.node('dmg_cell2')}
// ============ TÀU NGẦM ============
builders.submarine=(m)=>{MATS(m);m.mat('subhull','#4A5866',.25,.5);m.mat('sail','#9AA8B5',.35,.4);m.mat('tile','#3A4652',.2,.6)
 const cy=-.045;const R=.11;const prof=[];for(let i=0;i<=44;i++){const z=-1.5+2.95*i/44;let r=R;if(z>1.0){const t=(z-1.0)/.45;r=R*Math.sqrt(Math.max(0,1-t*t))}else if(z<-.9){const t=(-.9-z)/.6;r=R*(1-.86*Math.pow(t,1.6))};prof.push([z,Math.max(r,.001)])}
 m.mesh('hull_main',smooth(revolve(prof,28),70),'subhull',m.root,[0,cy,0])
 const T=[];for(let z=-.8;z<1.0;z+=.22)T.push(tr(cyl(R+.0012,.006,28,'z'),[0,0,z]));m.mesh('hull_tiles',merge(T),'tile',m.root,[0,cy,0])
 m.mesh('casing',boxR(-.045,.045,.062,.07,-1.0,1.1),'dark');const ch=[];for(let z=-.95;z<1.1;z+=.1)ch.push(boxR(-.043,.043,.07,.0725,z,z+.006));m.mesh('casing_slats',merge(ch),'under')
 m.mesh('sail',bevBox([-.06,.06,.13,.57],[-.05,.05,.17,.52],.05,.17,.018),'sail');m.mesh('sail_glass',boxR(-.04,.04,.12,.14,.53,.535),'glass');m.mesh('sail_fairing',scale(ss(.06,16,8),[1,.5,1.6]),'sail',m.root,[0,.052,.6])
 const p=m.node('periscope',[0,.17,.4]);m.mesh('periscope_mesh',sc(.006,.09,10),'dark',p,[0,.045,0]);m.mesh('periscope_head',ss(.009,10,6),'glass',p,[0,.092,0]);m.mesh('radar_mast',sc(.005,.08,8),'dark',m.root,[0,.21,.26]);m.mesh('snorkel',sc(.004,.07,8),'dark',m.root,[.02,.205,.18])
 m.mesh('planes_sail_l',bevBox([.05,.2,.3,.4],[.05,.19,.31,.39],.1,.112,.003),'dark');m.mesh('planes_sail_r',bevBox([-.2,-.05,.3,.4],[-.19,-.05,.31,.39],.1,.112,.003),'dark')
 m.mesh('planes_stern_h',bevBox([-.2,.2,-1.46,-1.34],[-.19,.19,-1.45,-1.35],cy-.004,cy+.004,.002),'dark');m.mesh('planes_stern_v',bevBox([-.005,.005,-1.46,-1.34],[-.004,.004,-1.45,-1.35],cy-.14,cy+.14,.002),'dark')
 const pr=m.node('propulsor_spin',[0,cy,-1.5]);m.mesh('propulsor_ring',sc(.055,.06,22,'z'),'dark',pr);m.mesh('propulsor_hub',sc(.02,.07,10,'z'),'under',pr)
 ;[[.03,.03],[-.03,.03],[.03,-.03],[-.03,-.03]].forEach(([x,y],i)=>{m.mesh('torpedo_flap_'+i,sc(.021,.005,14,'z'),'dark',m.root,[x,cy+y,1.37]);m.mesh('torpedo_port_'+i,sc(.016,.006,12,'z'),'under',m.root,[x,cy+y,1.365])})
 ;[1.1,.9,-.1,-.45,-.8].forEach((z,i)=>m.mesh('hatch_'+i,sc(.022,.008,14),'struct',m.root,[0,.07,z]))
 anch(m,[['launch',[0,cy,1.4]],['muzzle',[0,cy,1.4]],['bow',[0,0,1.45]],['stern',[0,0,-1.45]],['deck',[0,.065,0]],['cell_0',[0,.065,-1]],['cell_1',[0,.065,0]],['cell_2',[0,.065,1]],['fire_0',[0,.07,-1]],['fire_1',[0,.07,0]],['fire_2',[0,.07,1]],['cam_under',[-.35,-.16,1]]])
 m.node('dmg_cell0');m.node('dmg_cell1');m.node('dmg_cell2')}
// ============ TÀU TÊN LỬA ============
builders.missile=(m)=>{MATS(m)
 const H=hullLoft(m.HP={zb:1.95,zs:-1.95,W:.21,wr:.88,draft:.05,hsB:.08,hsM:.05,hsS:.055,zmB:.6,zmS:-1.4,bp:2.2,bq:.7,sw:.86,zN:56})
 hullParts(m,H,{railZ0:-1.9,railZ1:1.8,railStep:.07});lights(m,.2,.15,.108,-1.92)
 vlsGrid(m,'vls_fwd_array',-.12,.12,.55,1.25,.05,8,4);vlsGrid(m,'vls_aft_array',-.12,.12,-1.46,-.68,.05,8,4)
 ;[.71,.91,1.11,-1.17,-.97].forEach((z,i)=>{const l=m.node('launcher_'+i,[0,.0585,z]);const pv=m.node('launcher_'+i+'_pitch',[0,0,-.03],l);const C=[];for(const dx of [-.02,.02])for(const dy of [.016,.044])C.push(tr(cyl(.0155,.07,10,'z'),[dx,dy,.03]));m.mesh('launcher_'+i+'_canisters',merge(C),'dark',pv);m.mesh('launcher_'+i+'_frame',bevBox([-.04,.04,-.01,.065],[-.038,.038,-.008,.063],0,.012,.003),'struct',pv);m.node('vls_slot_'+i,[0,.06,z])})
 m.mesh('bridge1',bevBox([-.12,.12,-.02,.38],[-.105,.105,0,.36],.05,.12,.01),'struct');m.mesh('bridge2',bevBox([-.095,.095,.06,.3],[-.08,.08,.08,.28],.12,.15,.009),'struct')
 winRow(m,'bridge_win_front',[-.08,.08],.128,.144,.2825,.0025,7);winSide(m,'bridge_win_side',.0805,.126,.142,.1,.26,6)
 const rp=[];for(const s of [-1,1]){rp.push(boxR(s>0?.118:-.132,s>0?.132:-.118,.07,.13,.02,.09),boxR(s>0?.118:-.132,s>0?.132:-.118,.07,.13,.24,.31))};m.mesh('radar_panels',merge(rp),'dark')
 mast(m,0,.18,.15,.19);antennas(m,[[-.03,.1,.15,.14],[.03,.3,.15,.15],[.01,-.4,.1,.13]])
 m.mesh('midhouse',bevBox([-.09,.09,-.54,-.12],[-.08,.08,-.52,-.14],.05,.1,.008),'struct');winSide(m,'midhouse_win',.0875,.07,.082,-.5,-.15,8)
 funnel(m,'funnel_1',[-.03,.03,-.5,-.38],[-.025,.025,-.52,-.4],.1,.15);funnel(m,'funnel_2',[-.03,.03,-.36,-.24],[-.025,.025,-.38,-.26],.1,.15)
 turret(m,'1',[0,.05,1.52],false,.032);ciws6(m,'ciws_1',[0,.1,-.3]);ciws6(m,'ciws_2',[0,.058,-1.3])
 boat(m,'boat_port',.092,-.44,.063);boat(m,'boat_stbd',-.092,-.44,.063);rafts(m,[[.07,.092,-.3],[-.07,.092,-.3],[.07,.092,-.34],[-.07,.092,-.34]])
 helideck(m,-1.76);anchorGear(m,1.78,.075)
 anch(m,[['muzzle',[0,.087,1.595]],['muzzle_1',[0,.087,1.595]],['launch',[0,.06,1.11]],['bow',[0,.06,1.95]],['stern',[0,.06,-1.95]],['deck',[0,.05,0]],['cell_0',[0,.05,-1.5]],['cell_1',[0,.05,-.5]],['cell_2',[0,.05,.5]],['cell_3',[0,.05,1.5]],['fire_0',[0,.06,-1.5]],['fire_1',[0,.06,-.5]],['fire_2',[0,.06,.5]],['fire_3',[0,.06,1.5]]])
 ;[0,1,2,3].forEach(i=>m.node('dmg_cell'+i))}
// ============ TÀU SÂN BAY ============
builders.carrier=(m)=>{MATS(m);m.mat('flightdeck','#6F7A84',.15,.85);m.mat('deckedge','#E7C34A',0,.7)
 const H=hullLoft(m.HP={zb:2.45,zs:-2.45,W:.31,wr:.9,draft:.08,hsB:.13,hsM:.12,hsS:.12,zmB:.8,zmS:-1.8,bp:2.3,bq:.7,sw:.88,zN:60})
 m.mesh('hull_under',H.lower,'under');m.mesh('hull',H.upper,'hull');m.mesh('deck_under',H.deck,'deck')
 const fd=[];const wf=(z)=>z>1.4?.4*Math.sqrt(Math.max(0,1-Math.pow((z-1.4)/1.0,2))):(z<-2.1?.3+.1*Math.sqrt(Math.max(0,1-Math.pow((-2.1-z)/.3,2))):.4)
 const zl=[];for(let z=2.4;z>1.4;z-=.1)zl.push(z);for(let z=1.4;z>=-2.1;z-=.5)zl.push(z);for(let z=-2.1;z>=-2.4;z-=.06)zl.push(z)
 const poly=[...zl.map(z=>[wf(z),z]),...zl.slice().reverse().map(z=>[-wf(z),z])]
 m.mesh('flight_deck',smooth(extrude(poly,.12,.136),30),'flightdeck');m.mesh('deck_edge',smooth(extrude(poly.map(([x,z])=>[x*.985,z*.985]),.1361,.1366),30),'deckedge')
 m.mesh('flight_deck_inner',smooth(extrude(poly.map(([x,z])=>[x*.97,z*.985]),.1366,.1372),30),'flightdeck')
 const cl=[];for(let z=-2.1;z<2.0;z+=.16)cl.push(boxR(-.004,.004,.1372,.1384,z,z+.08));m.mesh('centerline',merge(cl),'white')
 const ang=m.mesh('landing_strip',boxR(-.007,.007,.1372,.1386,-.85,.85),'white',m.root,[.12,0,-1.5]);m.rot(ang,[0,1,0,.2]);const ang2=m.mesh('landing_strip2',boxR(-.004,.004,.1372,.1384,-.85,.85),'deckedge',m.root,[.16,0,-1.5]);m.rot(ang2,[0,1,0,.2])
 const wires=[];for(let i=0;i<4;i++)wires.push(boxR(-.12,.2,.1372,.1382,-1.55+i*.09,-1.545+i*.09));m.mesh('arresting_wires',merge(wires),'dark')
 ;[.12,-.12].forEach((x,i)=>{m.mesh('catapult_'+i,boxR(x-.01,x+.01,.1372,.139,1.3,2.28),'dark');m.mesh('catapult_slot_'+i,boxR(x-.003,x+.003,.139,.1396,1.3,2.28),'under');const j=m.mesh('jbd_'+i,bevBox([x-.05,x+.05,-.005,.005],[x-.048,x+.048,-.004,.004],0,.05,.004),'dark',m.root,[0,.137,1.28]);m.rot(j,[1,0,0,-.35])})
 const elev=(name,x0,x1,z0,z1)=>{m.mesh(name,boxR(x0,x1,.1372,.141,z0,z1),'dark');const hz=[];for(let t=z0;t<z1-.03;t+=.07)hz.push(boxR(x0,x1,.141,.1416,t,t+.028));m.mesh(name+'_hazard',merge(hz),'hazard')}
 elev('elevator_fwd',.16,.3,1.02,1.38);elev('elevator_aft',-.32,-.18,-.4,-.04)
 m.mesh('island',bevBox([-.38,-.16,.38,.94],[-.34,-.19,.44,.88],.136,.3,.02),'struct');m.mesh('island_bridge',bevBox([-.36,-.2,.5,.8],[-.34,-.22,.54,.76],.3,.34,.012),'struct')
 winRow(m,'island_win',[-.34,-.2],.215,.245,.881,.0025,6);winRow(m,'island_win2',[-.34,-.22],.305,.325,.76,.0025,5);winSide(m,'island_win_side',.0,.0,.0,0,0.001,1)
 const iw=[];for(let i=0;i<8;i++)iw.push(boxR(-.162,-.1595,.2,.23,.45+i*.06,.49+i*.06));m.mesh('island_win_port',merge(iw),'glass')
 m.mesh('island_panels',merge([boxR(-.385,-.38,.2,.29,.5,.62),boxR(-.385,-.38,.2,.29,.7,.82)]),'dark')
 m.mesh('mast',sc(.008,.14,10),'dark',m.root,[-.27,.41,.66]);const rr=m.node('radar_rotor',[-.27,.485,.66]);m.mesh('radar_plate',bevBox([-.05,.05,-.007,.007],[-.048,.048,-.005,.005],0,.014,.003),'dark',rr);m.mesh('radar_dome',ss(.01,10,8),'radome',m.root,[-.27,.52,.66]);m.mesh('island_antennas',merge([tr(cyl(.0014,.12,5),[-.3,.36,.6]),tr(cyl(.0014,.1,5),[-.24,.35,.72]),tr(cyl(.0014,.14,5),[-.28,.37,.8])]),'dark')
 m.mesh('sponson_1',bevBox([.3,.42,-1.9,-1.7],[.3,.41,-1.89,-1.71],.1,.12,.004),'dark');m.mesh('sponson_2',bevBox([.3,.4,1.85,2.1],[.3,.39,1.86,2.09],.1,.12,.004),'dark');m.mesh('sponson_3',bevBox([-.44,-.3,-1.85,-1.65],[-.43,-.3,-1.84,-1.66],.1,.12,.004),'dark');m.mesh('sponson_4',bevBox([-.4,-.3,1.8,2.0],[-.39,-.3,1.81,1.99],.1,.12,.004),'dark')
 ;[[.28,-1.8],[.24,2.1],[-.34,-1.74],[-.3,1.9]].forEach(([x,z],i)=>ciws6(m,'ciws_'+(i+1),[x,.136,z]))
 const planes=[[.16,-1.1],[.2,-.82],[.2,.5],[-.1,.8]]
 planes.forEach(([x,z],i)=>{const p=m.node('plane_'+i,[x,.137,z]);const fus=revolve([[-.11,.002],[-.09,.008],[0,.014],[.06,.011],[.12,.004],[.14,.001]],10);m.mesh('plane_'+i+'_fuselage',smooth(fus,60),'dark',p,[0,.014,0]);m.mesh('plane_'+i+'_wing',smooth(extrude([[0,.07],[.1,-.04],[.1,-.06],[-.1,-.06],[-.1,-.04]],0,.004),30),'struct',p,[0,.012,0]);m.mesh('plane_'+i+'_canopy',scale(ss(.01,8,6),[.8,.7,1.6]),'glass',p,[0,.025,.03]);m.mesh('plane_'+i+'_tail',smooth(extrude([[0,-.09],[.035,-.12],[-.035,-.12]],0,.003),30),'struct',p,[0,.018,0]);m.mesh('plane_'+i+'_fin',boxR(-.0015,.0015,.016,.045,-.115,-.09),'struct',p);m.node('plane_slot_'+i,[x,.137,z])})
 m.mesh('tractor',bevBox([.1,.15,-.6,-.5],[.105,.145,-.59,-.51],.137,.152,.004),'orange')
 const cr=[];for(const [x,z] of [[.06,.2],[-.08,-.9],[.1,-.3]])cr.push(tr(box(.03,.02,.04),[x,.147,z]));m.mesh('deck_crates',merge(cr),'dark')
 anch(m,[['muzzle',[.12,.137,1.3]],['launch',[.12,.137,1.3]],['bow',[0,.137,2.45]],['stern',[0,.137,-2.45]],['deck',[0,.137,0]],['cell_0',[0,.137,-2]],['cell_1',[0,.137,-1]],['cell_2',[0,.137,0]],['cell_3',[0,.137,1]],['cell_4',[0,.137,2]],['fire_0',[0,.142,-2]],['fire_1',[0,.142,-1]],['fire_2',[0,.142,0]],['fire_3',[0,.142,1]],['fire_4',[0,.142,2]],['cat_start_0',[.12,.137,1.3]],['cat_start_1',[-.12,.137,1.3]],['cat_end_0',[.12,.137,2.28]],['cat_end_1',[-.12,.137,2.28]],['takeoff_end',[0,.137,2.45]]])
 ;[0,1,2,3,4].forEach(i=>m.node('dmg_cell'+i))}
// ============ TÀU CẮN LÉN ============
builders.raider=(m)=>{MATS(m);m.mat('rhull','#3C4A56',.25,.5)
 const H=hullLoft(m.HP={zb:.45,zs:-.45,W:.17,wr:.82,draft:.035,hsB:.06,hsM:.05,hsS:.052,zmB:.05,zmS:-.2,bp:1.5,bq:.75,sw:.8,zN:9,K1:4,K2:2})
 m.mesh('hull_under',H.lower,'under');m.mesh('hull',H.upper,'rhull');m.mesh('deck',H.deck,'dark')
 const dr=[];for(let z=.4;z>=-.42;z-=.04){const {wd,hs}=H.fn(z);dr.push([[-(wd-.014),hs+.001,z],[(wd-.014),hs+.001,z]])};m.mesh('deck_plate',rows(dr,{ref:(p)=>[p[0],p[1]-1,p[2]]}),'deck')
 m.mesh('superstructure',bevBox([-.07,.07,-.1,.12],[-.05,.05,-.06,.08],.05,.11,.012),'struct');m.mesh('glass',boxR(-.04,.04,.075,.095,.078,.0835),'glass');winSide(m,'side_win',.0585,.078,.092,-.06,.06,4)
 mast(m,0,-.02,.11,.12);antennas(m,[[-.02,-.06,.11,.1],[.02,.04,.11,.08]])
 turret(m,'1',[0,.05,.22],false,.026);m.node('cam_close',[.35,.12,.25])
 m.mesh('decoy_port',boxR(.07,.1,.05,.07,-.36,-.3),'orange');m.mesh('decoy_stbd',boxR(-.1,-.07,.05,.07,-.36,-.3),'orange');m.mesh('exhaust_vents',merge([boxR(-.03,-.012,.05,.06,-.28,-.22),boxR(.012,.03,.05,.06,-.28,-.22)]),'dark')
 m.mesh('nav_port',ss(.003,8,6),'navred',m.root,[.1,.075,.08]);m.mesh('nav_stbd',ss(.003,8,6),'navgreen',m.root,[-.1,.075,.08])
 anch(m,[['muzzle',[0,.087,.295]],['launch',[0,.087,.295]],['bow',[0,.05,.45]],['stern',[0,.05,-.45]],['deck',[0,.05,0]],['cell_0',[0,.05,0]],['fire_0',[0,.06,0]]]);m.node('dmg_cell0')}
// ============ TÀU HỘ VỆ 2x2 (mũi +X) ============
builders.escort=(m)=>{MATS(m)
 const mk=(zc,tag)=>{const H=hullLoft(m.HP={zb:.95,zs:-.92,W:.25,wr:.86,draft:.05,hsB:.075,hsM:.06,hsS:.06,zmB:.4,zmS:-.7,bp:2,bq:.7,sw:.85,zN:36});const rot=g=>tr(rotY(g,Math.PI/2),[0,0,zc]);m.mesh('hull_under_'+tag,rot(H.lower),'under');m.mesh('hull_'+tag,rot(H.upper),'hull');m.mesh('hull_deck_'+tag,rot(H.deck),'deck');return H}
 const Hp=mk(-.6,'port');mk(.6,'stbd')
 // lan can quanh hai thân
 const Rg=[];for(const zc of [-.6,.6])for(const s of [-1,1])for(let x=-.85;x<=.85;x+=.07){const hw=Hp.fn(x).wd;const zz=zc+s*(hw-.007);Rg.push(boxR(x-.0009,x+.0009,.06,.076,zz-.0009,zz+.0009));Rg.push(boxR(x,x+.07,.0755,.0772,zz-.0007,zz+.0007))};m.mesh('rails',merge(Rg),'rail')
 m.mesh('deck',bevBox([-.3,.7,-.5,.5],[-.28,.68,-.48,.48],.055,.085,.008),'deck');m.mesh('deck_plate',boxR(-.28,.68,.0852,.0862,-.48,.48),'decklight');const dl=[];for(let x=-.26;x<.66;x+=.1)dl.push(boxR(x,x+.05,.0863,.0872,-.004,.004));m.mesh('deck_dashes',merge(dl),'white')
 m.mesh('bridge',bevBox([.1,.55,-.3,.3],[.14,.5,-.26,.26],.085,.16,.014),'struct');winRow(m,'bridge_win_front_rot',[-.0,.0],0,0,0,0.0001,1)
 const bw=[];for(let k=0;k<8;k++){const zc=-.2+k*.05;bw.push(boxR(.51,.5125,.11,.14,zc,zc+.035))};m.mesh('bridge_win_front',merge(bw),'glass');const bs=[];for(const s of [-1,1])for(let k=0;k<6;k++){const xc=.15+k*.06;bs.push(boxR(xc,xc+.04,.11,.14,s>0?.27:-.2725,s>0?.2725:-.27))};m.mesh('bridge_win_side',merge(bs),'glass')
 m.mesh('radome',scale(ss(.17,24,12),[1,.55,1]),'radome',m.root,[.18,.145,0]);m.mesh('radome_base',sc(.175,.02,28),'dark',m.root,[.18,.09,0]);m.mesh('radome_ribs',merge([0,1,2].map(i=>{const g=sc(.172,.002,28,'y');return tr(g,[0,.13+i*.025,0])})),'dark',m.root,[.18,0,0])
 m.mesh('antenna',sc(.005,.28,8),'dark',m.root,[.45,.3,0]);m.mesh('antenna_cross',merge([boxR(.4,.5,.38,.383,-.03,.03),boxR(.42,.48,.34,.343,-.04,.04)]),'dark');m.mesh('antennas_more',merge([tr(cyl(.0014,.14,5),[.12,.23,.1]),tr(cyl(.0014,.12,5),[.3,.22,-.12]),tr(cyl(.0014,.16,5),[.52,.24,.2])]),'dark')
 ;[[-.1,-.32],[-.1,.32],[.62,-.3],[.62,.3]].forEach(([x,z],i)=>ciws6(m,'ciws_'+(i+1),[x,.085,z]))
 ;[[-.55,-.6],[-.2,-.6],[-.55,.6],[-.2,.6]].forEach(([x,z],i)=>{const d=m.node('decoy_'+(i+1),[x,.06,z]);m.mesh('decoy_'+(i+1)+'_box',bevBox([-.11,.11,-.06,.06],[-.1,.1,-.055,.055],0,.05,.006),'dark',d);const T=[];for(let a=0;a<4;a++)for(let b=0;b<2;b++)T.push(tr(cyl(.009,.005,8),[-.08+a*.054,.052,-.027+b*.054]));m.mesh('decoy_'+(i+1)+'_tubes',merge(T),'under',d);m.mesh('decoy_'+(i+1)+'_tip',boxR(-.11,-.08,.05,.056,-.06,.06),'orange',d);m.node('decoy_'+(i+1)+'_launch',[0,.06,0],d)})
 m.mesh('deck_bar',boxR(-.2,-.03,.0872,.0932,-.02,.02),'orange');hatches(m,[[.05,.0865,.4],[.05,.0865,-.4],[.65,.0865,0]],.012)
 m.mesh('nav_port',ss(.004,8,6),'navred',m.root,[.5,.17,.28]);m.mesh('nav_stbd',ss(.004,8,6),'navgreen',m.root,[.5,.17,-.28]);m.mesh('nav_stern',ss(.004,8,6),'navwhite',m.root,[-.9,.09,0])
 anch(m,[['muzzle',[-.1,.12,-.32]],['launch',[-.55,.11,-.6]],['bow',[.95,.06,0]],['stern',[-.92,.06,0]],['deck',[0,.07,0]],['cell_0',[-.5,.06,-.5]],['cell_1',[.5,.06,-.5]],['cell_2',[-.5,.06,.5]],['cell_3',[.5,.06,.5]],['fire_0',[-.5,.07,-.5]],['fire_1',[.5,.07,-.5]],['fire_2',[-.5,.07,.5]],['fire_3',[.5,.07,.5]],['intercept_cam',[0,.9,-1.4]]])
 ;[0,1,2,3].forEach(i=>m.node('dmg_cell'+i))}
import {pathToFileURL} from 'url'
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 for(const [k,b] of Object.entries(builders)){const m=new Model('ship_'+k);m.S=WORLD_SCALE;b(m);stats.push(save(m,OUT))}
 console.log(stats.map(s=>`${s.name}: ${s.tris} tam giác, ${s.nodes} node, ${(s.bytes/1024).toFixed(1)} KB`).join('\n'))}
