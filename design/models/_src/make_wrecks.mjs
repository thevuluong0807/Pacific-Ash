// Model tàu bị hạ (xác nổi, chìm một nửa): từng loại tàu, có thể gãy thành nhiều mảnh nhưng vẫn nhận ra loại tàu. Tỉ lệ ×10 (world-scale.md).
import {Model,save,hullLoft,hullRing,capGeom,boxR,cyl,sphere,extrude,rows,smooth,revolve,merge,tr,scale} from './glb.mjs'
import {builders} from './make_ships.mjs'
const OUT=process.argv[2]
const S=10
const X=[1,0,0],Y=[0,1,0],Z=[0,0,1]
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]
const qaa=(ax,deg)=>{const h=deg*Math.PI/360,s=Math.sin(h);return [ax[0]*s,ax[1]*s,ax[2]*s,Math.cos(h)]}
// nhóm có điểm xoay `pivot`, quay `rots` [[trục,độ],...], hạ `sink`, dịch `shift`; trả về node trong (tọa độ tuyệt đối của tàu)
const section=(m,name,pivot,rots,sink,shift=[0,0,0])=>{const g=m.node(name,[pivot[0]+shift[0],pivot[1]+sink+shift[1],pivot[2]+shift[2]],m.root);let q=[0,0,0,1];for(const [ax,d] of rots)q=qmul(q,qaa(ax,d));m.nodes[g].rotation=q;return m.node(name+'_in',[-pivot[0],-pivot[1],-pivot[2]],g)}
const prep=id=>{const m=new Model('wreck_'+id);m.S=S;builders[id](m);m.mat('scorch','#15110F',.1,.9);m.mat('ember','#FF6A1A',0,.5,[1,.35,.08]);m.mat('capdark','#2A3138',.2,.7);return m}
const dropAll=(m,names)=>{for(const n of names)while(m.drop(n));}
const GENERIC_ANCHORS=['muzzle','muzzle_1','muzzle_2','launch','bow','stern','takeoff_end','cam_gun','cam_under','cam_close','intercept_cam','dmg_cell0','dmg_cell1','dmg_cell2','dmg_cell3','dmg_cell4','cat_start_0','cat_start_1','cat_end_0','cat_end_1']
const HULLISH=['hull_under','hull','deck','deck_plate','rails','bollards','deck_under']
const parentOf=(m,i)=>m.nodes.findIndex(n=>n.children.includes(i))
// phân phối các nút con trực tiếp của gốc vào các nhóm theo hàm assign(i)->nút nhóm hoặc -1 (giữ ở gốc)
const distribute=(m,kids,assign)=>{for(const i of kids){const t=assign(i);if(t>=0)m.reparent(i,t)}}
// mặt cắt gãy: tấm kín tối, sườn thò ra, viền nóng đỏ
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647
const cap=(m,parent,HP,z,dir,tag)=>{const {wd,hs,dr}=hullRing(HP,z);m.mesh('cap_'+tag,capGeom(HP,z,dir),'capdark',parent)
 const R=[];for(const u of [-.7,-.35,0,.35,.7]){const h=hs*(.55+rnd()*.5),l=.05+rnd()*.07;const z0=dir>0?z:z-l,z1=dir>0?z+l:z;R.push(boxR(u*wd-.004,u*wd+.004,-dr*.6,h,z0,z1))}
 m.mesh('ribs_'+tag,merge(R),'dark',parent)
 const zz=dir>0?[z,z+.014]:[z-.014,z]
 m.mesh('hot_'+tag,merge([boxR(-wd*.92,wd*.92,hs-.004,hs+.003,zz[0],zz[1]),boxR(-wd*.7,wd*.7,-dr*.35,-dr*.35+.007,zz[0],zz[1])]),'ember',parent)}
const hullSec=(m,parent,HP,z0,z1,tag,{lo=false,hi=false}={})=>{const H=hullLoft({...HP,range:[z0,z1]})
 m.mesh('hull_under_'+tag,H.lower,'under',parent);m.mesh('hull_'+tag,H.upper,'hull',parent);m.mesh('deck_'+tag,H.deck,'deck',parent)
 const dz=[];const n=Math.max(4,Math.round((z1-z0)/.05));for(let i=0;i<=n;i++){const z=z1-(z1-z0)*i/n;const f=H.fn(z);dz.push([[-(f.wd-.012),f.hs+.0012,z],[(f.wd-.012),f.hs+.0012,z]])}
 m.mesh('deck_plate_'+tag,rows(dz,{ref:p=>[p[0],p[1]-1,p[2]]}),'decklight',parent)
 if(lo)cap(m,parent,HP,z0,-1,tag+'_lo');if(hi)cap(m,parent,HP,z1,1,tag+'_hi')}
// vết cháy và điểm nóng tại các neo lửa; neo khói cho mỗi nhóm
const damage=(m)=>{for(let i=0;i<m.nodes.length;i++){const n=m.nodes[i];if(/^fire_\d$/.test(n.name)){const p=parentOf(m,i);if(p<0)continue;const [x,y,z]=n.translation
  m.mesh('scorch_'+n.name,boxR(-.07,.07,0,.002,-.07,.07),'scorch',p,[x,y-.0105,z]);m.mesh('hotspot_'+n.name,smooth(sphere(.018,8,5),50),'ember',p,[x,y,z])}}}
const smokeAnchors=(m,list)=>{for(const [parent,name,pos] of list)m.node('smoke_point_'+name,pos,parent)}
const out=[]
const fin=m=>{m.node('float_line',[0,0,0]);damage(m);out.push(save(m,OUT))}
// ===== KHU TRỤC HẠM: gãy làm đôi, mũi chổng lên, đuôi nghiêng =====
{const m=prep('destroyer');const HP=m.HP;dropAll(m,[...HULLISH,...GENERIC_ANCHORS]);const kids=[...m.nodes[m.root].children]
 const fore=section(m,'section_fore',[0,0,.02],[[X,-14],[Z,16]],-.035,[0,0,.05]),aft=section(m,'section_aft',[0,0,-.02],[[X,9],[Z,-12]],-.05,[.07,0,-.14])
 distribute(m,kids,i=>/^cell_/.test(m.nodes[i].name)?-1:(m.zOf(i)>=0?fore:aft))
 hullSec(m,fore,HP,0,.95,'fore',{lo:true});hullSec(m,aft,HP,-.95,0,'aft',{hi:true});smokeAnchors(m,[[fore,'fore',[0,.25,.2]],[aft,'aft',[0,.25,-.2]]]);fin(m)}
// ===== TUẦN DƯƠNG: nghiêng nặng, chìm một nửa, ba tháp pháo lộ =====
{const m=prep('cruiser');dropAll(m,GENERIC_ANCHORS);const kids=[...m.nodes[m.root].children]
 const main=section(m,'section_main',[0,0,0],[[Z,38],[X,-4]],-.06)
 distribute(m,kids,i=>/^cell_/.test(m.nodes[i].name)?-1:main);smokeAnchors(m,[[main,'main',[0,.3,.2]]]);fin(m)}
// ===== TÀU TÊN LỬA: gãy ở sau nhà boong, đuôi chìm, mũi chổng =====
{const m=prep('missile');const HP=m.HP;dropAll(m,[...HULLISH,...GENERIC_ANCHORS]);const kids=[...m.nodes[m.root].children]
 const fore=section(m,'section_fore',[0,0,-.6],[[Z,18],[X,-7]],-.055,[0,0,.03]),aft=section(m,'section_aft',[0,0,-.64],[[Z,-24],[X,-28]],-.07,[-.05,0,-.28])
 distribute(m,kids,i=>/^cell_/.test(m.nodes[i].name)?-1:(m.zOf(i)>=-.62?fore:aft))
 hullSec(m,fore,HP,-.62,1.95,'fore',{lo:true});hullSec(m,aft,HP,-1.95,-.62,'aft',{hi:true});smokeAnchors(m,[[fore,'fore',[0,.3,.6]],[aft,'aft',[0,.3,-1.1]]]);fin(m)}
// ===== TÀU NGẦM: gãy sau mũi, tháp chỉ huy nghiêng nổi, mũi chổng =====
{const m=prep('submarine');const cy=-.045,R=.11;dropAll(m,['hull_main','hull_tiles','casing','casing_slats',...GENERIC_ANCHORS]);const kids=[...m.nodes[m.root].children]
 const bow=section(m,'section_bow',[0,cy,.8],[[X,-32],[Z,20]],-.03,[.1,0,.22]),main=section(m,'section_main',[0,0,0],[[Z,28],[X,5]],-.04,[0,0,-.06])
 distribute(m,kids,i=>/^cell_/.test(m.nodes[i].name)?-1:(m.zOf(i)>=.78?bow:main))
 const r=z=>{let v=R;if(z>1.0){const t=(z-1.0)/.45;v=R*Math.sqrt(Math.max(0,1-t*t))}else if(z<-.9){const t=(-.9-z)/.6;v=R*(1-.86*Math.pow(t,1.6))};return Math.max(v,.001)}
 const prof=(a,b)=>{const p=[];const n=Math.max(6,Math.round(44*(b-a)/2.95));for(let i=0;i<=n;i++){const z=a+(b-a)*i/n;p.push([z,r(z)])};return p}
 m.mesh('hull_bow',smooth(revolve(prof(.78,1.45),28),70),'subhull',bow,[0,cy,0]);m.mesh('hull_main',smooth(revolve(prof(-1.5,.78),28),70),'subhull',main,[0,cy,0])
 const disk=(z,dir,tag,par)=>{const g=cyl(r(z),.004,28,'z');m.mesh('cap_'+tag,tr(g,[0,0,z]),'capdark',par,[0,cy,0]);m.mesh('hot_'+tag,tr(cyl(r(z)*.96,.003,28,'z'),[0,0,z+dir*.003]),'ember',par,[0,cy,0])}
 disk(.78,-1,'bow',bow);disk(.78,1,'main',main)
 const T=[];for(let z=-.8;z<.7;z+=.22)T.push(tr(cyl(R+.0012,.006,28,'z'),[0,0,z]));m.mesh('hull_tiles',merge(T),'tile',main,[0,cy,0])
 m.mesh('casing',boxR(-.045,.045,.062,.07,-1.0,.7),'dark',main)
 smokeAnchors(m,[[bow,'bow',[0,.15,1.1]],[main,'main',[0,.35,.3]]]);fin(m)}
// ===== TÀU SÂN BAY: gãy ở đuôi, boong nghiêng, đảo chỉ huy còn nguyên =====
{const m=prep('carrier');const HP=m.HP;dropAll(m,[...HULLISH,'flight_deck','deck_edge','flight_deck_inner','centerline',...GENERIC_ANCHORS]);const kids=[...m.nodes[m.root].children]
 const main=section(m,'section_main',[0,0,-1.0],[[Z,28],[X,-5]],-.06),aft=section(m,'section_aft',[0,0,-1.15],[[Z,40],[X,8]],-.08,[.12,0,-.3])
 distribute(m,kids,i=>/^cell_/.test(m.nodes[i].name)?-1:(m.zOf(i)>=-1.1?main:aft))
 m.mat('flightdeck','#6F7A84',.15,.85);m.mat('deckedge','#E7C34A',0,.7)
 hullSec(m,main,HP,-1.1,2.45,'main',{lo:true});hullSec(m,aft,HP,-2.45,-1.1,'aft',{hi:true})
 const wf=z=>z>1.4?.4*Math.sqrt(Math.max(0,1-Math.pow((z-1.4)/1.0,2))):(z<-2.1?.3+.1*Math.sqrt(Math.max(0,1-Math.pow((-2.1-z)/.3,2))):.4)
 const fd=(par,z0,z1,tag)=>{const zl=[];for(let z=z1;z>z0;z-=.1)zl.push(z);zl.push(z0);const poly=[...zl.map(z=>[wf(z),z]),...zl.slice().reverse().map(z=>[-wf(z),z])].map(([x,z])=>[x,z])
  m.mesh('flight_deck_'+tag,smooth(extrude(poly,.12,.136),30),'flightdeck',par);m.mesh('deck_edge_'+tag,smooth(extrude(poly.map(([x,z])=>[x*.985,z]),.1361,.1366),30),'deckedge',par)
  const cl=[];for(let z=z0+.1;z<z1-.1;z+=.16)cl.push(boxR(-.004,.004,.1372,.1384,z,z+.08));if(cl.length)m.mesh('centerline_'+tag,merge(cl),'white',par)}
 fd(main,-1.1,2.4,'main');fd(aft,-2.4,-1.1,'aft')
 m.mesh('hot_deck',boxR(-.38,.38,.12,.1375,-1.1,-1.085),'ember',main)
 smokeAnchors(m,[[main,'main',[0,.35,.5]],[aft,'aft',[0,.25,-1.8]]]);fin(m)}
// ===== TÀU CẮN LÉN: lật gần úp, đáy tàu lộ, tháp pháo và cột còn nhận ra =====
{const m=prep('raider');dropAll(m,GENERIC_ANCHORS);const kids=[...m.nodes[m.root].children]
 const main=section(m,'section_main',[0,0,0],[[Z,58],[X,-8]],-.028)
 distribute(m,kids,i=>/^cell_/.test(m.nodes[i].name)?-1:main);smokeAnchors(m,[[main,'main',[0,.25,0]]]);fin(m)}
// ===== TÀU HỘ VỆ: hai thân tách rời, vòm radar bật ra nổi riêng =====
{const m=prep('escort');dropAll(m,['rails',...GENERIC_ANCHORS]);const kids=[...m.nodes[m.root].children]
 const main=section(m,'section_main',[0,0,0],[[X,12],[Z,-4]],-.05),port=section(m,'section_port_hull',[0,0,-.6],[[X,-28]],-.09,[-.1,0,-.25]),dome=section(m,'section_radome',[.18,.15,0],[[Z,18],[X,22]],-.13,[.4,0,.8])
 distribute(m,kids,i=>{const nm=m.nodes[i].name;if(/^cell_/.test(nm))return -1;if(/^radome/.test(nm))return dome;return m.zOf(i)<-.3?port:main})
 smokeAnchors(m,[[main,'main',[.1,.3,.2]],[port,'port',[0,.2,-.6]],[dome,'radome',[.18,.3,0]]]);fin(m)}
console.log(out.map(s=>`${s.name}: ${s.tris} tam giác, ${s.nodes} node, ${(s.bytes/1024).toFixed(1)} KB`).join('\n'))
