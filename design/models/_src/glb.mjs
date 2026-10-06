// Bộ dựng GLB tối giản (không phụ thuộc thư viện). Hình khối cơ bản, bóng phẳng.
import fs from 'fs'
export const V=(a)=>a
// ---------- hình học: {p:[],n:[],i:[]} ----------
const G=()=>({p:[],n:[],i:[]})
const addTri=(g,a,b,c)=>{ // vertices a,b,c ngược chiều kim đồng hồ nhìn từ ngoài; pháp tuyến phẳng
 const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]]
 let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;n=n.map(x=>x/l)
 const k=g.p.length/3;for(const q of [a,b,c]){g.p.push(...q);g.n.push(...n)}g.i.push(k,k+1,k+2)}
const quad=(g,a,b,c,d)=>{addTri(g,a,b,c);addTri(g,a,c,d)}
export const tr=(g,[x,y,z])=>{for(let i=0;i<g.p.length;i+=3){g.p[i]+=x;g.p[i+1]+=y;g.p[i+2]+=z}return g}
export const box=(w,h,d)=>{const g=G(),x=w/2,y=h/2,z=d/2
 const P=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]
 quad(g,P[4],P[5],P[6],P[7]);quad(g,P[1],P[0],P[3],P[2]);quad(g,P[5],P[1],P[2],P[6]);quad(g,P[0],P[4],P[7],P[3]);quad(g,P[7],P[6],P[2],P[3]);quad(g,P[0],P[1],P[5],P[4]);return g}
export const boxR=(x0,x1,y0,y1,z0,z1)=>tr(box(x1-x0,y1-y0,z1-z0),[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2])
// hình thang khối: đáy rect b=[x0,x1,z0,z1] ở y0, đỉnh rect t ở y1
export const frustum=(b,t,y0,y1)=>{const g=G()
 const B=[[b[0],y0,b[2]],[b[1],y0,b[2]],[b[1],y0,b[3]],[b[0],y0,b[3]]],T=[[t[0],y1,t[2]],[t[1],y1,t[2]],[t[1],y1,t[3]],[t[0],y1,t[3]]]
 quad(g,B[3],B[2],B[1],B[0]);quad(g,T[0],T[1],T[2],T[3])
 quad(g,B[0],B[1],T[1],T[0]);quad(g,B[1],B[2],T[2],T[1]);quad(g,B[2],B[3],T[3],T[2]);quad(g,B[3],B[0],T[0],T[3]);return g}
// đa giác lồi trong mặt phẳng XZ, đùn từ y0 tới y1
export const extrude=(poly,y0,y1)=>{const g=G(),n=poly.length
 for(let i=1;i<n-1;i++){addTri(g,[poly[0][0],y1,poly[0][1]],[poly[i+1][0],y1,poly[i+1][1]],[poly[i][0],y1,poly[i][1]]);addTri(g,[poly[0][0],y0,poly[0][1]],[poly[i][0],y0,poly[i][1]],[poly[i+1][0],y0,poly[i+1][1]])}
 for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n];quad(g,[a[0],y0,a[1]],[b[0],y0,b[1]],[b[0],y1,b[1]],[a[0],y1,a[1]])};return g}
export const cyl=(r,h,seg=12,axis='y',r2)=>{const g=G();const rt=r2??r;const pt=(a,rr,y)=>[Math.cos(a)*rr,y,Math.sin(a)*rr]
 for(let s=0;s<seg;s++){const a0=2*Math.PI*s/seg,a1=2*Math.PI*(s+1)/seg
  quad(g,pt(a0,r,-h/2),pt(a1,r,-h/2),pt(a1,rt,h/2),pt(a0,rt,h/2))
  addTri(g,[0,h/2,0],pt(a1,rt,h/2),pt(a0,rt,h/2));addTri(g,[0,-h/2,0],pt(a0,r,-h/2),pt(a1,r,-h/2))}
 if(axis==='z'){for(let i=0;i<g.p.length;i+=3){const y=g.p[i+1],z=g.p[i+2];g.p[i+1]=-z;g.p[i+2]=y;const ny=g.n[i+1],nz=g.n[i+2];g.n[i+1]=-nz;g.n[i+2]=ny}}
 if(axis==='x'){for(let i=0;i<g.p.length;i+=3){const x=g.p[i],y=g.p[i+1];g.p[i]=y;g.p[i+1]=-x;const nx=g.n[i],ny=g.n[i+1];g.n[i]=ny;g.n[i+1]=-nx}}
 return g}
export const sphere=(r,ws=10,hs=6)=>{const g=G();const P=(i,j)=>{const th=Math.PI*i/hs,ph=2*Math.PI*j/ws;return [r*Math.sin(th)*Math.cos(ph),r*Math.cos(th),r*Math.sin(th)*Math.sin(ph)]}
 for(let i=0;i<hs;i++)for(let j=0;j<ws;j++){const a=P(i,j),b=P(i+1,j),c=P(i+1,j+1),d=P(i,j+1);if(i>0)addTri(g,a,d,c);if(i<hs-1)addTri(g,a,c,b)};return g}
export const merge=(gs)=>{const g=G();for(const q of gs){const k=g.p.length/3;g.p.push(...q.p);g.n.push(...q.n);for(const i of q.i)g.i.push(i+k)}return g}
export const scale=(g,[sx,sy,sz])=>{for(let i=0;i<g.p.length;i+=3){g.p[i]*=sx;g.p[i+1]*=sy;g.p[i+2]*=sz}for(let i=0;i<g.n.length;i+=3){let a=g.n[i]/sx,b=g.n[i+1]/sy,c=g.n[i+2]/sz;const l=Math.hypot(a,b,c)||1;g.n[i]=a/l;g.n[i+1]=b/l;g.n[i+2]=c/l}return g}
// ---------- cây node + vật liệu -> GLB ----------
export class Model{
 constructor(name){this.name=name;this.S=1;this.nodes=[];this.meshes=[];this.mats=[];this.matIdx={};this.root=this.node(name,[0,0,0],null)}
 mat(key,color,metal=0,rough=.6,emis){if(this.matIdx[key]!=null)return this.matIdx[key];const hex=color.replace('#','');const c=[0,2,4].map(i=>Math.pow(parseInt(hex.slice(i,i+2),16)/255,2.2));const m={name:key,doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[...c,1],metallicFactor:metal,roughnessFactor:rough}};if(emis)m.emissiveFactor=emis.map(x=>x);this.mats.push(m);return this.matIdx[key]=this.mats.length-1}
 node(name,t=[0,0,0],parent=this.root){const idx=this.nodes.length;this.nodes.push({name,translation:t,children:[]});if(parent!=null)this.nodes[parent].children.push(idx);return idx}
 mesh(name,g,matKey,parent=this.root,t){const n=this.node(name,t||[0,0,0],parent);this.meshes.push({g,mat:this.matIdx[matKey]});this.nodes[n].mesh=this.meshes.length-1;return n}
 find(name){return this.nodes.findIndex(n=>n.name===name)}
 drop(name){const i=this.find(name);if(i<0)return false;const n=this.nodes[i];if(n.mesh!=null){this.meshes[n.mesh]=null;n.mesh=undefined};this.nodes.forEach(x=>{x.children=x.children.filter(c=>c!==i)});n.name='__dropped__';return true}
 reparent(i,p){this.nodes.forEach(x=>{x.children=x.children.filter(c=>c!==i)});this.nodes[p].children.push(i)}
 zOf(i){const n=this.nodes[i];const z=n.translation[2];if(n.mesh!=null&&this.meshes[n.mesh]){const g=this.meshes[n.mesh].g;let a=1e9,b=-1e9;for(let k=2;k<g.p.length;k+=3){a=Math.min(a,g.p[k]);b=Math.max(b,g.p[k])};return (a+b)/2+z}if(n.translation.some(v=>v))return z;const cs=n.children.map(c=>this.zOf(c));return cs.length?cs.reduce((t,v)=>t+v,0)/cs.length:0}
 rot(n,axisAngle){const [x,y,z,a]=axisAngle,s=Math.sin(a/2);this.nodes[n].rotation=[x*s,y*s,z*s,Math.cos(a/2)];return n}
 build(){const idxMap=[];const live=[];this.meshes.forEach((g,i)=>{if(g){idxMap[i]=live.length;live.push(g)}});const bin=[];let off=0;const bv=[],ac=[],ms=[]
  const push=(arr,Type,comp)=>{const buf=Buffer.from(new Type(arr).buffer);const pad=(4-off%4)%4;if(pad){bin.push(Buffer.alloc(pad));off+=pad};bv.push({buffer:0,byteOffset:off,byteLength:buf.length,target:comp});bin.push(buf);off+=buf.length;return bv.length-1}
  live.forEach(({g,mat})=>{
   const P=g.p.map(v=>v*this.S);const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(let i=0;i<P.length;i+=3)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],P[i+k]);mx[k]=Math.max(mx[k],P[i+k])}
   const pv=push(P,Float32Array,34962),nv=push(g.n,Float32Array,34962),iv=push(g.i,Uint16Array,34963)
   ac.push({bufferView:pv,componentType:5126,count:g.p.length/3,type:'VEC3',min:mn,max:mx});const pa=ac.length-1
   ac.push({bufferView:nv,componentType:5126,count:g.n.length/3,type:'VEC3'});const na=ac.length-1
   ac.push({bufferView:iv,componentType:5123,count:g.i.length,type:'SCALAR'});const ia=ac.length-1
   ms.push({primitives:[{attributes:{POSITION:pa,NORMAL:na},indices:ia,material:mat}]})})
  const nodes=this.nodes.map(n=>{const o={name:n.name};if(n.translation.some(v=>v))o.translation=n.translation.map(v=>v*this.S);if(n.rotation)o.rotation=n.rotation;if(n.children.length)o.children=n.children;if(n.mesh!=null&&idxMap[n.mesh]!=null)o.mesh=idxMap[n.mesh];return o})
  const json={asset:{version:'2.0',generator:'pacific-ash basic ship builder'},scene:0,scenes:[{nodes:[0]}],nodes,meshes:ms,materials:this.mats,accessors:ac,bufferViews:bv,buffers:[{byteLength:off}]}
  let js=Buffer.from(JSON.stringify(json));const jp=(4-js.length%4)%4;js=Buffer.concat([js,Buffer.alloc(jp,0x20)])
  const bb=Buffer.concat(bin);const bp=(4-bb.length%4)%4;const bbp=Buffer.concat([bb,Buffer.alloc(bp)])
  const len=12+8+js.length+8+bbp.length;const h=Buffer.alloc(12);h.writeUInt32LE(0x46546C67,0);h.writeUInt32LE(2,4);h.writeUInt32LE(len,8)
  const c1=Buffer.alloc(8);c1.writeUInt32LE(js.length,0);c1.writeUInt32LE(0x4E4F534A,4);const c2=Buffer.alloc(8);c2.writeUInt32LE(bbp.length,0);c2.writeUInt32LE(0x004E4942,4)
  return {glb:Buffer.concat([h,c1,js,c2,bbp]),tris:this.meshes.reduce((s,m)=>s+(m?m.g.i.length/3:0),0)}}
}
export const save=(m,dir)=>{const {glb,tris}=m.build();fs.writeFileSync(`${dir}/${m.name}.glb`,glb);return {name:m.name,bytes:glb.length,tris,nodes:m.nodes.length}}

// ================= v2: bề mặt mượt, thân tàu loft, vành quay =================
const sub3=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],cr3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dt3=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
const nz3=a=>{const l=Math.hypot(...a)||1;return [a[0]/l,a[1]/l,a[2]/l]}
// làm mượt pháp tuyến theo góc gập (độ): các mặt kề nhau có góc < deg thì dùng chung pháp tuyến
export const smooth=(g,deg=48)=>{const T=g.i.length/3,fn=[],key=(k)=>`${Math.round(g.p[k*3]*2e4)},${Math.round(g.p[k*3+1]*2e4)},${Math.round(g.p[k*3+2]*2e4)}`
 for(let f=0;f<T;f++){const [a,b,c]=[g.i[f*3],g.i[f*3+1],g.i[f*3+2]];const P=k=>[g.p[k*3],g.p[k*3+1],g.p[k*3+2]];fn.push(nz3(cr3(sub3(P(b),P(a)),sub3(P(c),P(a)))))}
 const map=new Map();for(let f=0;f<T;f++)for(let c=0;c<3;c++){const k=key(g.i[f*3+c]);if(!map.has(k))map.set(k,[]);map.get(k).push(f)}
 const cs=Math.cos(deg*Math.PI/180),n=new Array(g.p.length)
 for(let f=0;f<T;f++)for(let c=0;c<3;c++){const vi=g.i[f*3+c];let s=[0,0,0];for(const h of map.get(key(vi))){if(dt3(fn[h],fn[f])>=cs){s[0]+=fn[h][0];s[1]+=fn[h][1];s[2]+=fn[h][2]}};s=nz3(s);n[vi*3]=s[0];n[vi*3+1]=s[1];n[vi*3+2]=s[2]}
 g.n=n;return g}
// lưới hàng điểm -> hình học; ref(p) cho điểm tham chiếu "bên trong" để định hướng mặt ra ngoài
export const rows=(R,{closed=false,ref}={})=>{const g=G();const m=R.length
 for(let j=0;j<m-1;j++){const A=R[j],B=R[j+1];const nK=closed?A.length:A.length-1
  for(let k=0;k<nK;k++){const k2=(k+1)%A.length;const a=A[k],b=A[k2],c=B[k2],d=B[k]
   for(const t of [[a,b,c],[a,c,d]]){const n=cr3(sub3(t[1],t[0]),sub3(t[2],t[0]));if(Math.hypot(...n)<1e-12)continue
    const ct=[(t[0][0]+t[1][0]+t[2][0])/3,(t[0][1]+t[1][1]+t[2][1])/3,(t[0][2]+t[1][2]+t[2][2])/3];const rf=ref?ref(ct):[0,0,0]
    if(dt3(n,sub3(ct,rf))<0)addTri(g,t[0],t[2],t[1]);else addTri(g,t[0],t[1],t[2])}}}
 return g}
export const rotY=(g,a)=>{const c=Math.cos(a),s=Math.sin(a);for(let i=0;i<g.p.length;i+=3){const x=g.p[i],z=g.p[i+2];g.p[i]=x*c+z*s;g.p[i+2]=-x*s+z*c;const nx=g.n[i],nzv=g.n[i+2];g.n[i]=nx*c+nzv*s;g.n[i+2]=-nx*s+nzv*c}return g}
// vành quay quanh trục z: profile [[z,r],...], seg đoạn quanh
export const revolve=(prof,seg=20)=>{const R=prof.map(([z,r])=>Array.from({length:seg},(_,k)=>{const a=2*Math.PI*k/seg;return [Math.cos(a)*r,Math.sin(a)*r,z]}));return rows(R,{closed:true,ref:(p)=>[0,0,p[2]]})}
// xếp chồng các hình chữ nhật [x0,x1,z0,z1] ở các độ cao y: hình thang khối vát mép
export const stack=(items)=>{const R=items.map(([r,y])=>[[r[0],y,r[2]],[r[1],y,r[2]],[r[1],y,r[3]],[r[0],y,r[3]]]);const cy=(items[0][1]+items[items.length-1][1])/2
 const g=rows(R,{closed:true,ref:(p)=>{const k=items.reduce((b,it)=>Math.abs(it[1]-p[1])<Math.abs(b[1]-p[1])?it:b);return [(k[0][0]+k[0][1])/2,p[1],(k[0][2]+k[0][3])/2]}})
 const top=items[items.length-1],bot=items[0];const cap=(r,y,up)=>{const q=[[r[0],y,r[2]],[r[1],y,r[2]],[r[1],y,r[3]],[r[0],y,r[3]]];if(up){addTri(g,q[0],q[2],q[1]);addTri(g,q[0],q[3],q[2])}else{addTri(g,q[0],q[1],q[2]);addTri(g,q[0],q[2],q[3])}}
 cap(top[0],top[1],true);cap(bot[0],bot[1],false);return g}
// hộp vát mép trên: đáy b, đỉnh t (x0,x1,z0,z1), vát bev
export const bevBox=(b,t,y0,y1,bev=.008)=>{const lerp=(a,c,u)=>a+(c-a)*u;const u=(y1-bev-y0)/(y1-y0);const mid=b.map((v,i)=>lerp(v,t[i],u));const top=[t[0]+bev,t[1]-bev,t[2]+bev,t[3]-bev];return smooth(stack([[b,y0],[mid,y1-bev],[top,y1]]),50)}
// thân tàu loft: trả {lower,upper,deck,fn:{hw,hs,dr}}
export const hullLoft=(P)=>{const {zb,zs,W,wr=.9,draft,hsB,hsM,hsS,zmB,zmS,bp=2,bq=.7,sw=.85,zN=36,K1=8,K2=3}=P
 const fn=(z)=>{let wd=W,dr=draft,hs=hsM;if(z>zmB){const t=Math.min(1,(z-zmB)/(zb-zmB));wd=W*Math.pow(Math.max(0,1-Math.pow(t,bp)),bq);dr=draft*(1-.8*Math.pow(t,2.5));hs=hsM+(hsB-hsM)*t*t}
  else if(z<zmS){const t=Math.min(1,(zmS-z)/(zmS-zs));wd=W*(1-(1-sw)*t*t);dr=draft*(1-.5*Math.pow(t,3));hs=hsM+(hsS-hsM)*t*t}
  return {wd,ww:wd*wr,dr,hs}}
 const [r0,r1]=P.range||[zs,zb];const nn=P.range?Math.max(4,Math.round(zN*(r1-r0)/(zb-zs))):zN;const zsmp=Array.from({length:nn+1},(_,i)=>r0+(r1-r0)*i/nn)
 const lower=[],upR=[],upL=[],deck=[]
 for(const z of zsmp){const {wd,ww,dr,hs}=fn(z);const lo=[];for(let k=0;k<=K1;k++){const a=-Math.PI/2+Math.PI*k/K1*1;const aa=Math.abs(a);lo.push([Math.sign(a||1)*ww*Math.sin(aa),-dr*Math.cos(aa),z])}
  // lo: từ trái (a=-90°) qua keel (0) tới phải (+90°)
  const L2=[];for(let k=0;k<=K1;k++){const a=-Math.PI/2+Math.PI*k/K1;L2.push([ww*Math.sin(a),-dr*Math.cos(a),z])}
  lower.push(L2)
  const r=[],l=[];for(let k=0;k<=K2;k++){const s=k/K2;r.push([ww+(wd-ww)*s,hs*Math.pow(s,.85),z]);l.push([-(ww+(wd-ww)*s),hs*Math.pow(s,.85),z])}
  upR.push(r);upL.push(l);deck.push([[-wd,hs,z],[wd,hs,z]])}
 const ref=(p)=>[0,0,p[2]]
 const gl=rows(lower,{ref:(p)=>[0,-.0,p[2]]}),gu=(()=>{const a=rows(upR,{ref}),b=rows(upL,{ref});a.p.push(...b.p);a.n.push(...b.n);const k=a.p.length/3-b.p.length/3;for(const i of b.i)a.i.push(i+k);return a})()
 const gd=rows(deck,{ref:(p)=>[p[0],p[1]-1,p[2]]})
 smooth(gl,60);smooth(gu,60)
 return {lower:gl,upper:gu,deck:gd,fn}}

// vòng mặt cắt thân tàu tại z: danh sách [x,y], đi từ mép boong trái xuống đáy rồi lên mép boong phải
export const hullRing=(P,z,K1=8,K2=3)=>{const {zb,zs,W,wr=.9,draft,hsB,hsM,hsS,zmB,zmS,bp=2,bq=.7,sw=.85}=P
 let wd=W,dr=draft,hs=hsM;if(z>zmB){const t=Math.min(1,(z-zmB)/(zb-zmB));wd=W*Math.pow(Math.max(0,1-Math.pow(t,bp)),bq);dr=draft*(1-.8*Math.pow(t,2.5));hs=hsM+(hsB-hsM)*t*t}else if(z<zmS){const t=Math.min(1,(zmS-z)/(zmS-zs));wd=W*(1-(1-sw)*t*t);dr=draft*(1-.5*Math.pow(t,3));hs=hsM+(hsS-hsM)*t*t}
 const ww=wd*wr,pts=[];for(let k=K2;k>=0;k--){const u=k/K2;pts.push([-(ww+(wd-ww)*u),hs*Math.pow(u,.85)])}
 for(let k=1;k<=K1-1;k++){const a=-Math.PI/2+Math.PI*k/K1;pts.push([ww*Math.sin(a),-dr*Math.cos(a)])}
 for(let k=0;k<=K2;k++){const u=k/K2;pts.push([ww+(wd-ww)*u,hs*Math.pow(u,.85)])}
 return {pts,wd,ww,dr,hs}}
// mặt cắt kín: đa giác quạt từ trọng tâm, quay ra hướng dir (+1 hoặc -1 theo z)
export const capGeom=(P,z,dir)=>{const {pts}=hullRing(P,z);const g=G();let cx=0,cy=0;for(const p of pts){cx+=p[0];cy+=p[1]};cx/=pts.length;cy/=pts.length
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];const A=[a[0],a[1],z],B=[b[0],b[1],z],C=[cx,cy,z];const n=cr3(sub3(B,A),sub3(C,A));if(n[2]*dir>=0)addTri(g,A,B,C);else addTri(g,A,C,B)}
 return g}
