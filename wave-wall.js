import {state,obliqueShock,expansion,rad,deg} from './physics.js';
import {requireValue,finite,PhysicsError} from './numerics.js';
export const wallPresets={
 'Compression ramp':[{angle:12,length:1}],
 'Expansion corner':[{angle:-15,length:1}],
 'Custom wall':[{angle:8,length:1},{angle:12,length:.6},{angle:0,length:.4}]
};
export function wallGeometry(x){
 const segments=x.wallSegments??wallPresets[x.wallShape??'Compression ramp'];
 requireValue(Array.isArray(segments)&&segments.length>=1&&segments.length<=8,'Use 1–8 wall segments.');
 requireValue(['Gas above wall','Gas below wall'].includes(x.wallSide??'Gas above wall'),'Choose the gas side of the wall.');
 let p={x:0,y:0};const panels=segments.map((s,i)=>{
  requireValue(finite(s.angle,s.length)&&Math.abs(s.angle)<75&&s.length>=.01&&s.length<=100,'Each segment requires |angle| < 75° and 0.01 ≤ length ≤ 100 m.');
  const theta=rad(s.angle),a=p,b={x:a.x+s.length*Math.cos(theta),y:a.y+s.length*Math.sin(theta)};p=b;
  return {id:String(i+2),a,b,theta,length:s.length};
 });return {panels,points:[{x:0,y:0},...panels.map(p=>p.b)],end:p.x,side:x.wallSide??'Gas above wall'};
}
export function solveWaveWall(x){
 const geometry=wallGeometry(x),g=x.gamma??1.4,R=x.R??287;
 requireValue(finite(x.M1,x.T1,x.p1)&&x.M1>1&&x.M1<=20&&x.T1>0&&x.p1>0,'Require 1 < M ≤ 20 and positive inlet temperature and pressure.');
 const sign=geometry.side==='Gas above wall'?1:-1,s1={...state(x.M1,x.T1,x.p1*1000,g,R),theta:0};
 const waves=[],panels=[],regions={1:s1};let before=s1,reason=null,limitX=Infinity;
 for(const p of geometry.panels){
  try{
   requireValue(before.M>1,'A later corner cannot be marched from a subsonic incoming stream.','wall-limit');
   const delta=p.theta-before.theta,turn=sign*delta,angle=Math.abs(delta),kind=angle<1e-12?'No wave':turn>0?'Oblique shock':'Expansion fan';
   const ratios=kind==='No wave'?{M2:before.M,T:1,p:1}:kind==='Oblique shock'?obliqueShock(before.M,angle,g):expansion(before.M,angle,g);
   const after={...state(ratios.M2,before.T*ratios.T,before.p*ratios.p,g,R),theta:p.theta};
   const rays=kind==='No wave'?[]:kind==='Oblique shock'?[before.theta+sign*ratios.beta]:Array.from({length:9},(_,i)=>{const d=angle*i/8,z=d?expansion(before.M,d,g):{M2:before.M};return before.theta-sign*d+sign*Math.asin(1/z.M2);});
   requireValue(rays.every(a=>Math.cos(a)>0),'A wave points upstream in this frame; this downstream marching model cannot resolve it.','wall-limit');
   panels.push({...p,state:after});regions[p.id]=after;waves.push({id:p.id,kind,origin:p.a,side:sign,before,after,beta:ratios.beta??null,turn:deg(delta),rays});before=after;
  }catch(e){if(!(e instanceof PhysicsError))throw e;reason=e.message;limitX=p.a.x;break;}
 }
 // Stop at the first local-wave intersection or wave encounter with a later wall.
 const hits=[],rays=waves.flatMap(w=>w.rays.map(angle=>({origin:w.origin,m:Math.tan(angle),id:w.id})));
 const ywall=x=>{const p=geometry.panels.find(p=>x>=p.a.x-1e-9&&x<=p.b.x+1e-9);return p?p.a.y+Math.tan(p.theta)*(x-p.a.x):null;};
 for(const r of rays){
  for(const p of geometry.panels){if(p.a.x<=r.origin.x+1e-9)continue;const m=Math.tan(p.theta),den=r.m-m;if(Math.abs(den)<1e-12)continue;const xx=(p.a.y-r.origin.y+r.m*r.origin.x-m*p.a.x)/den;if(xx>r.origin.x+1e-8&&xx>=p.a.x-1e-9&&xx<=p.b.x+1e-9)hits.push({x:xx,reason:'An emitted wave reaches a later wall segment.'});}
 }
 for(let i=0;i<rays.length;i++)for(let j=i+1;j<rays.length;j++){
  const a=rays[i],b=rays[j];if(a.id===b.id||Math.abs(a.m-b.m)<1e-12)continue;
  const xx=(b.origin.y-a.origin.y+a.m*a.origin.x-b.m*b.origin.x)/(a.m-b.m),yy=a.origin.y+a.m*(xx-a.origin.x),wall=ywall(xx);
  if(xx>Math.max(a.origin.x,b.origin.x)+1e-8&&xx<geometry.end&&wall!==null&&sign*(yy-wall)>1e-9)hits.push({x:xx,reason:'Emitted waves intersect; their subsequent interaction requires a separate solution.'});
 }
 hits.sort((a,b)=>a.x-b.x);if(hits[0]&&hits[0].x<limitX){limitX=hits[0].x;reason=hits[0].reason;}
 const accepted=panels.filter(p=>p.a.x<limitX-1e-9),acceptedRegions={1:s1};for(const p of accepted)acceptedRegions[p.id]=p.state;
 return {status:reason?'partial':'ok',geometry,s1,panels:accepted,waves:waves.filter(w=>Number(w.id)<=accepted.length+1),regions:acceptedRegions,limitX:Number.isFinite(limitX)?limitX:null,reason,gamma:g,R};
}
export function wallPlots(r){
 const samples=[[-r.geometry.end*.18,r.s1],[0,r.s1]];
 for(const p of r.panels)samples.push([p.a.x,p.state],[Math.min(p.b.x,r.limitX??Infinity),p.state]);
 return [['M','Mach number','M',z=>z.M],['p','Static pressure','p (kPa)',z=>z.p/1000],['T','Static temperature','T (K)',z=>z.T],['rho','Density','ρ (kg/m³)',z=>z.rho],['u','Flow speed','u (m/s)',z=>z.u],['p0','Stagnation pressure','p₀ (kPa)',z=>z.p0/1000]].map(([key,label,unit,value])=>({key:'wall-'+key,label,chart:{title:label,xlabel:'Wall station x (m)',ylabel:unit,zeroBaseline:false,series:[{name:label,points:samples.map(([x,z])=>[x,value(z)])}]},note:'Local surface states; the curve stops at the first unresolved wave interaction or wall encounter.'}));
}
