import {Model,box,boxR,frustum,extrude,cyl,sphere,tr,scale,merge,save} from './glb.mjs'
const OUT=process.argv[2]
const MATS=m=>{m.mat('hull','#C4CDD6',.3,.5);m.mat('under','#2C353D',.2,.7);m.mat('deck','#8A949C',.15,.75);m.mat('struct','#B9C4CE',.3,.5);m.mat('dark','#3A444E',.25,.6);m.mat('orange','#E08A2E',0,.6);m.mat('glass','#0C1E2A',.1,.1);m.mat('radome','#E9EEF2',0,.4);m.mat('white','#F4F7FA',0,.8);m.mat('hazard','#E8B02E',0,.6)}
const outline=(st)=>[...st.map(([z,w])=>[w,z]),...st.slice().reverse().map(([z,w])=>[-w,z])].filter((p,i,a)=>!(i>0&&p[0]===a[i-1][0]&&p[1]===a[i-1][1]))
const hullOf=(m,st,dr,fb,mid=0.0)=>{const o=outline(st);m.mesh('hull_under',extrude(o,-dr,0),'under');m.mesh('hull',extrude(o,0,fb),'hull')}
const anch=(m,list)=>{for(const [n,t] of list)m.node(n,t)}
const turret=(m,name,pos,twin=false,parent)=>{const t=m.node('turret_'+name,pos,parent);m.mesh('turret_base_'+name,cyl(.034,.02,14),'dark',t,[0,.01,0]);m.mesh('turret_shield_'+name,frustum([-.03,.03,-.034,.034],[-.02,.02,-.018,.026],0,.024),'struct',t,[0,.02,0])
 const offs=twin?[-.012,.012]:[0];offs.forEach((dx,i)=>{const sfx=twin?(i?'R':'L'):'';const b=m.node('barrel_'+name+sfx,[dx,.037,.03],t);m.mesh('barrel_mesh_'+name+sfx,cyl(.0035,.075,8,'z'),'dark',b,[0,0,.0375]);m.node('muzzle_'+name+sfx,[0,0,.075],b)});return t}
const ciws=(m,name,pos)=>{const n=m.node(name,pos);m.mesh(name+'_base',cyl(.012,.012,10),'dark',n,[0,.006,0]);m.mesh(name+'_dome',sphere(.009,10,6),'radome',n,[0,.02,0]);return n}
const radar=(m,y,z,w=.064)=>{const n=m.node('radar_rotor',[0,y,z]);m.mesh('radar_plate',box(w,.012,.012),'dark',n);return n}
const helideck=(m,z,r=.065,y=.0525)=>{m.mesh('helideck_ring',cyl(r,.002,24),'white',m.root,[0,y,z]);m.mesh('helideck_h1',box(.006,.003,.05),'dark',m.root,[-.018,y+.001,z]);m.mesh('helideck_h2',box(.006,.003,.05),'dark',m.root,[.018,y+.001,z]);m.mesh('helideck_h3',box(.04,.003,.006),'dark',m.root,[0,y+.001,z])}
const stats=[]
// ============ KHU TRỤC HẠM ============
{const m=new Model('ship_destroyer');MATS(m)
 hullOf(m,[[.95,0],[.8,.07],[.6,.14],[.3,.19],[-.55,.19],[-.95,.16]],.045,.05)
 m.mesh('bridge1',frustum([-.1,.1,.02,.3],[-.088,.088,.035,.285],.05,.1),'struct');m.mesh('bridge2',frustum([-.085,.085,.1,.26],[-.074,.074,.115,.235],.1,.135),'struct')
 m.mesh('bridge_glass',boxR(-.066,.066,.112,.126,.236,.2395),'glass')
 m.mesh('midhouse',frustum([-.08,.08,-.28,.02],[-.07,.07,-.26,0],.05,.095),'struct');m.mesh('hangar',frustum([-.12,.12,-.7,-.46],[-.108,.108,-.68,-.48],.052,.105),'struct')
 m.mesh('funnel_1',frustum([-.035,.035,-.09,.01],[-.03,.03,-.12,-.03],.095,.15),'dark');m.mesh('funnel_2',frustum([-.035,.035,-.25,-.15],[-.03,.03,-.28,-.19],.095,.15),'dark')
 m.mesh('mast',cyl(.006,.195,8),'dark',m.root,[0,.2325,.12]);radar(m,.306,.12)
 turret(m,'fwd',[0,.05,.66],false);turret(m,'aft',[0,.05,-.4],false)
 m.mesh('vls_fwd',boxR(-.04,.04,.05,.056,.4,.52),'dark')
 ciws(m,'ciws_1',[0,.095,-.3]);ciws(m,'ciws_2',[0,.105,-.52])
 m.mesh('boat_port',boxR(.08,.112,.058,.074,-.17,-.05),'orange');m.mesh('boat_stbd',boxR(-.112,-.08,.058,.074,-.17,-.05),'orange')
 helideck(m,-.825)
 anch(m,[['muzzle',[0,.087,.74]],['muzzle_1',[0,.087,.735]],['muzzle_2',[0,.087,-.325]],['launch',[0,.056,.46]],['bow',[0,.06,.95]],['stern',[0,.06,-.95]],['deck',[0,.05,0]],['cell_0',[0,.05,-.5]],['cell_1',[0,.05,.5]],['fire_0',[0,.06,-.5]],['fire_1',[0,.06,.5]]])
 m.node('dmg_cell0');m.node('dmg_cell1');stats.push(save(m,OUT))}
// ============ TUẦN DƯƠNG ============
{const m=new Model('ship_cruiser');MATS(m)
 hullOf(m,[[1.45,0],[1.25,.08],[.95,.16],[.5,.2],[-1,.2],[-1.45,.17]],.05,.055)
 m.mesh('bridge1',frustum([-.11,.11,.12,.4],[-.095,.095,.14,.38],.055,.12),'struct');m.mesh('bridge2',frustum([-.085,.085,.17,.34],[-.07,.07,.19,.32],.12,.17),'struct');m.mesh('bridge_glass',boxR(-.06,.06,.135,.152,.321,.3235),'glass')
 m.mesh('midhouse',frustum([-.09,.09,-.2,.12],[-.08,.08,-.18,.1],.055,.1),'struct');m.mesh('funnel',frustum([-.06,.06,-.1,.02],[-.05,.05,-.12,0],.1,.17),'dark')
 m.mesh('hangar',frustum([-.12,.12,-.92,-.62],[-.108,.108,-.9,-.64],.057,.105),'struct')
 m.mesh('mast',cyl(.007,.25,8),'dark',m.root,[0,.295,.28]);radar(m,.42,.28,.08)
 turret(m,'1',[0,.055,1.0],true);turret(m,'2',[0,.085,.74],true);turret(m,'3',[0,.055,-.42],true)
 m.mesh('barbette_2',cyl(.046,.03,14),'dark',m.root,[0,.07,.74])
 ciws(m,'ciws_1',[0,.1,.2]);ciws(m,'ciws_2',[0,.105,-.65])
 m.mesh('boat_port',boxR(.09,.125,.06,.076,-.16,-.04),'orange');m.mesh('boat_stbd',boxR(-.125,-.09,.06,.076,-.16,-.04),'orange')
 helideck(m,-1.17,.08,.0575)
 anch(m,[['muzzle',[.012,.092,1.075]],['muzzle_1',[.012,.092,1.075]],['launch',[0,.06,-1.17]],['bow',[0,.065,1.45]],['stern',[0,.065,-1.45]],['deck',[0,.055,0]],['cell_0',[0,.055,-1]],['cell_1',[0,.055,0]],['cell_2',[0,.055,1]],['fire_0',[0,.065,-1]],['fire_1',[0,.065,0]],['fire_2',[0,.065,1]],['cam_gun',[0,.1,.7]]])
 m.node('dmg_cell0');m.node('dmg_cell1');m.node('dmg_cell2');stats.push(save(m,OUT))}
// ============ TÀU NGẦM ============
{const m=new Model('ship_submarine');MATS(m);m.mat('subhull','#4A5866',.25,.55);m.mat('sail','#9AA8B5',.35,.45)
 const cy=-.045
 m.mesh('hull_main',cyl(.11,2.25,16,'z'),'subhull',m.root,[0,cy,.075]);m.mesh('hull_bow',scale(sphere(.11,16,8),[1,1,1.5]),'subhull',m.root,[0,cy,1.2]);m.mesh('hull_tail',cyl(.045,.45,16,'z',.11),'subhull',m.root,[0,cy,-1.275])
 m.mesh('casing',boxR(-.045,.045,.06,.068,-1.0,1.1),'dark')
 m.mesh('sail',frustum([-.06,.06,.13,.57],[-.05,.05,.17,.52],.05,.17),'sail');m.mesh('sail_glass',boxR(-.04,.04,.12,.14,.53,.535),'glass')
 const p=m.node('periscope',[0,.17,.4]);m.mesh('periscope_mesh',cyl(.006,.09,8),'dark',p,[0,.045,0]);m.mesh('radar_mast',cyl(.005,.08,8),'dark',m.root,[0,.21,.26])
 m.mesh('planes_sail',boxR(-.2,.2,.105,.112,.3,.4),'dark');m.mesh('planes_stern_h',boxR(-.2,.2,cy-.004,cy+.004,-1.46,-1.34),'dark');m.mesh('planes_stern_v',boxR(-.004,.004,cy-.14,cy+.14,-1.46,-1.34),'dark')
 const pr=m.node('propulsor_spin',[0,cy,-1.5]);m.mesh('propulsor_ring',cyl(.05,.05,14,'z'),'dark',pr)
 ;[[.03,.03],[-.03,.03],[.03,-.03],[-.03,-.03]].forEach(([x,y],i)=>m.mesh('torpedo_flap_'+i,cyl(.02,.004,10,'z'),'dark',m.root,[x,cy+y,1.325]))
 ;[1.1,.9,-.1,-.45,-.8].forEach((z,i)=>m.mesh('hatch_'+i,cyl(.02,.008,10),'struct',m.root,[0,.07,z]))
 anch(m,[['launch',[0,cy,1.4]],['muzzle',[0,cy,1.4]],['bow',[0,0,1.45]],['stern',[0,0,-1.45]],['deck',[0,.065,0]],['cell_0',[0,.065,-1]],['cell_1',[0,.065,0]],['cell_2',[0,.065,1]],['fire_0',[0,.07,-1]],['fire_1',[0,.07,0]],['fire_2',[0,.07,1]],['cam_under',[-.35,-.16,1]]])
 m.node('dmg_cell0');m.node('dmg_cell1');m.node('dmg_cell2');stats.push(save(m,OUT))}
// ============ TÀU TÊN LỬA ============
{const m=new Model('ship_missile');MATS(m)
 hullOf(m,[[1.95,0],[1.7,.08],[1.3,.16],[.6,.21],[-1.4,.21],[-1.95,.18]],.05,.05)
 const array=(z0,z1,name)=>{m.mesh(name,boxR(-.12,.12,.05,.058,z0,z1),'dark');const hs=[];for(let i=0;i<8;i++)for(let j=0;j<4;j++){const zc=z0+(i+.5)*(z1-z0)/8,xc=-.12+(j+.5)*.24/4;hs.push(boxR(xc-.022,xc+.022,.058,.0605,zc-.034,zc+.034))}m.mesh(name+'_hatches',merge(hs),'deck')
  m.mesh(name+'_hz1',boxR(-.12,-.1,.058,.061,z0,z0+.04),'hazard');m.mesh(name+'_hz2',boxR(.1,.12,.058,.061,z1-.04,z1),'hazard')}
 array(.55,1.25,'vls_fwd_array');array(-1.46,-.68,'vls_aft_array')
 ;[.71,.91,1.11,-1.17,-.97].forEach((z,i)=>{const l=m.node('launcher_'+i,[0,.058,z]);const pv=m.node('launcher_'+i+'_pitch',[0,0,-.03],l);m.mesh('launcher_'+i+'_mesh',boxR(-.05,.05,0,.06,0,.06),'dark',pv,[0,0,0]);m.node('vls_slot_'+i,[0,.06,z])})
 m.mesh('bridge1',frustum([-.12,.12,-.02,.38],[-.105,.105,0,.36],.05,.12),'struct');m.mesh('bridge2',frustum([-.095,.095,.06,.3],[-.08,.08,.08,.28],.12,.15),'struct')
 ;[-1,1].forEach(s=>{m.mesh('panel_'+s+'_a',boxR(s>0?.118:-.132,s>0?.132:-.118,.07,.13,.02,.09),'glass');m.mesh('panel_'+s+'_b',boxR(s>0?.118:-.132,s>0?.132:-.118,.07,.13,.24,.31),'glass')})
 m.mesh('mast',cyl(.007,.18,8),'dark',m.root,[0,.24,.18]);radar(m,.34,.18)
 m.mesh('midhouse',frustum([-.09,.09,-.54,-.12],[-.08,.08,-.52,-.14],.05,.1),'struct');m.mesh('funnel_1',frustum([-.03,.03,-.5,-.38],[-.025,.025,-.52,-.4],.1,.15),'dark');m.mesh('funnel_2',frustum([-.03,.03,-.36,-.24],[-.025,.025,-.38,-.26],.1,.15),'dark')
 turret(m,'1',[0,.05,1.52],false);ciws(m,'ciws_1',[0,.1,-.3]);ciws(m,'ciws_2',[0,.058,-1.3])
 m.mesh('boat_port',boxR(.09,.125,.058,.074,-.5,-.38),'orange');m.mesh('boat_stbd',boxR(-.125,-.09,.058,.074,-.5,-.38),'orange')
 helideck(m,-1.76)
 anch(m,[['muzzle',[0,.087,1.595]],['muzzle_1',[0,.087,1.595]],['launch',[0,.06,1.11]],['bow',[0,.06,1.95]],['stern',[0,.06,-1.95]],['deck',[0,.05,0]],['cell_0',[0,.05,-1.5]],['cell_1',[0,.05,-.5]],['cell_2',[0,.05,.5]],['cell_3',[0,.05,1.5]],['fire_0',[0,.06,-1.5]],['fire_1',[0,.06,-.5]],['fire_2',[0,.06,.5]],['fire_3',[0,.06,1.5]]])
 ;[0,1,2,3].forEach(i=>m.node('dmg_cell'+i));stats.push(save(m,OUT))}
// ============ TÀU SÂN BAY ============
{const m=new Model('ship_carrier');MATS(m);m.mat('flightdeck','#6F7A84',.15,.85)
 hullOf(m,[[2.45,0],[2.2,.1],[1.6,.24],[.8,.31],[-1.8,.31],[-2.45,.27]],.08,.12)
 m.mesh('flight_deck',extrude([[2.4,0],[2.0,.34],[1.4,.4],[-2.1,.4],[-2.4,.3],[-2.4,-.3],[-2.1,-.4],[1.4,-.4],[2.0,-.34]].map(([z,x])=>[x,z]),.12,.135),'flightdeck')
 m.mesh('centerline',boxR(-.004,.004,.1351,.1365,-2.2,2.2),'white')
 const ang=m.mesh('landing_strip',boxR(-.008,.008,.1351,.1365,-.85,.85),'white',m.root,[.12,0,-1.5]);m.rot(ang,[0,1,0,.2])
 ;[.12,-.12].forEach((x,i)=>{m.mesh('catapult_'+i,boxR(x-.01,x+.01,.1351,.1368,1.3,2.28),'dark');const j=m.mesh('jbd_'+i,boxR(x-.05,x+.05,0,.05,-.004,.004),'dark',m.root,[0,.135,1.28]);m.rot(j,[1,0,0,-.35])})
 m.mesh('elevator_fwd',boxR(.16,.3,.135,.139,1.02,1.38),'dark');m.mesh('elevator_aft',boxR(-.32,-.18,.135,.139,-.4,-.04),'dark')
 m.mesh('island',frustum([-.38,-.16,.38,.94],[-.34,-.19,.44,.88],.135,.3),'struct');m.mesh('island_glass',boxR(-.34,-.19,.24,.27,.881,.886),'glass')
 m.mesh('mast',cyl(.008,.18,8),'dark',m.root,[-.27,.39,.66]);radar(m,.48,.66,.1)
 m.mesh('sponson_1',boxR(.3,.42,.1,.12,-1.9,-1.7),'dark')
 ;[[.28,-1.8],[.24,2.1],[-.34,-1.74],[-.3,1.9]].forEach(([x,z],i)=>ciws(m,'ciws_'+(i+1),[x,.135,z]))
 const planes=[[.16,-1.1],[.2,-.82],[.2,.5],[-.1,.8]]
 planes.forEach(([x,z],i)=>{const p=m.node('plane_'+i,[x,.135,z]);m.mesh('plane_'+i+'_fuselage',cyl(.012,.2,8,'z'),'dark',p,[0,.012,0]);m.mesh('plane_'+i+'_wing',boxR(-.08,.08,.011,.015,-.03,.03),'struct',p);m.mesh('plane_'+i+'_tail',boxR(-.03,.03,.016,.02,-.1,-.075),'struct',p);m.mesh('plane_'+i+'_fin',boxR(-.002,.002,.012,.04,-.1,-.075),'struct',p);m.node('plane_slot_'+i,[x,.135,z])})
 m.mesh('tractor',boxR(.1,.15,.135,.15,-.6,-.5),'orange')
 anch(m,[['muzzle',[.12,.135,1.3]],['launch',[.12,.135,1.3]],['bow',[0,.135,2.45]],['stern',[0,.135,-2.45]],['deck',[0,.135,0]],['cell_0',[0,.135,-2]],['cell_1',[0,.135,-1]],['cell_2',[0,.135,0]],['cell_3',[0,.135,1]],['cell_4',[0,.135,2]],['fire_0',[0,.14,-2]],['fire_1',[0,.14,-1]],['fire_2',[0,.14,0]],['fire_3',[0,.14,1]],['fire_4',[0,.14,2]],['cat_start_0',[.12,.135,1.3]],['cat_start_1',[-.12,.135,1.3]],['cat_end_0',[.12,.135,2.28]],['cat_end_1',[-.12,.135,2.28]],['takeoff_end',[0,.135,2.45]]])
 ;[0,1,2,3,4].forEach(i=>m.node('dmg_cell'+i));stats.push(save(m,OUT))}
// ============ TÀU CẮN LÉN ============
{const m=new Model('ship_raider');MATS(m);m.mat('rhull','#3C4A56',.25,.55)
 const o=outline([[.45,0],[.32,.1],[.18,.17],[-.3,.17],[-.45,.13]])
 m.mesh('hull_under',extrude(o,-.035,0),'under');m.mesh('hull',extrude(o,0,.05),'rhull')
 m.mesh('superstructure',frustum([-.07,.07,-.1,.12],[-.05,.05,-.06,.08],.05,.11),'struct');m.mesh('glass',boxR(-.04,.04,.075,.095,.075,.082),'glass')
 m.mesh('mast',cyl(.004,.18,8),'dark',m.root,[0,.14,-.02]);radar(m,.23,-.02,.04)
 turret(m,'1',[0,.05,.22],false);m.node('cam_close',[.35,.12,.25])
 m.mesh('decoy_port',boxR(.07,.1,.05,.07,-.36,-.3),'orange');m.mesh('decoy_stbd',boxR(-.1,-.07,.05,.07,-.36,-.3),'orange')
 anch(m,[['muzzle',[0,.087,.295]],['launch',[0,.087,.295]],['bow',[0,.05,.45]],['stern',[0,.05,-.45]],['deck',[0,.05,0]],['cell_0',[0,.05,0]],['fire_0',[0,.06,0]]]);m.node('dmg_cell0');stats.push(save(m,OUT))}
// ============ TÀU HỘ VỆ 2x2 (mũi +X) ============
{const m=new Model('ship_escort');MATS(m)
 const hull=(zc)=>[[.95,zc],[.78,zc+.12],[.55,zc+.25],[-.8,zc+.25],[-.92,zc+.2],[-.92,zc-.2],[-.8,zc-.25],[.55,zc-.25],[.78,zc-.12]]
 ;[-.6,.6].forEach((zc,i)=>{const o=hull(zc);m.mesh('hull_under_'+i,extrude(o,-.05,0),'under');m.mesh('hull_'+(i?'stbd':'port'),extrude(o,0,.06),'hull')})
 m.mesh('deck',boxR(-.3,.7,.055,.085,-.5,.5),'deck')
 m.mesh('bridge',frustum([.1,.55,-.3,.3],[.14,.5,-.26,.26],.085,.16),'struct');m.mesh('bridge_glass',boxR(.5,.505,.11,.14,-.2,.2),'glass')
 m.mesh('radome',scale(sphere(.17,16,8),[1,.55,1]),'radome',m.root,[.18,.15,0]);m.mesh('antenna',cyl(.005,.28,8),'dark',m.root,[.45,.3,0])
 ;[[-.1,-.32],[-.1,.32],[.62,-.3],[.62,.3]].forEach(([x,z],i)=>ciws(m,'ciws_'+(i+1),[x,.085,z]))
 ;[[-.55,-.6],[-.2,-.6],[-.55,.6],[-.2,.6]].forEach(([x,z],i)=>{const d=m.node('decoy_'+(i+1),[x,.06,z]);m.mesh('decoy_'+(i+1)+'_box',boxR(-.11,.11,0,.05,-.06,.06),'dark',d);m.mesh('decoy_'+(i+1)+'_tip',boxR(-.11,-.08,.05,.056,-.06,.06),'orange',d);m.node('decoy_'+(i+1)+'_launch',[0,.06,0],d)})
 anch(m,[['muzzle',[-.1,.12,-.32]],['launch',[-.55,.11,-.6]],['bow',[.95,.06,0]],['stern',[-.92,.06,0]],['deck',[0,.07,0]],['cell_0',[-.5,.06,-.5]],['cell_1',[.5,.06,-.5]],['cell_2',[-.5,.06,.5]],['cell_3',[.5,.06,.5]],['fire_0',[-.5,.07,-.5]],['fire_1',[.5,.07,-.5]],['fire_2',[-.5,.07,.5]],['fire_3',[.5,.07,.5]],['intercept_cam',[0,.9,-1.4]]])
 ;[0,1,2,3].forEach(i=>m.node('dmg_cell'+i));stats.push(save(m,OUT))}
console.log(stats.map(s=>`${s.name}: ${s.tris} tam giác, ${s.nodes} node, ${(s.bytes/1024).toFixed(1)} KB`).join('\n'))
