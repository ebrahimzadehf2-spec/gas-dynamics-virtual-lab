import {solveWedgeWall,wedgeWallPlots} from './wedge-wall.js?v=20261114-wedge-wall';
import {obliqueShock,expansion,shockLimit,isentropic,rad,deg} from './physics.js';
import {requireValue,finite} from './numerics.js';
import {cone} from './cone.js';
import {coneLimits} from './cone-limits.js';
export function solveWedge({M=2,thetaCone=10,wedgeAlpha=0,gamma=1.4}={}){
 requireValue(finite(M,thetaCone,wedgeAlpha,gamma)&&M>1&&thetaCone>0&&thetaCone<70&&Math.abs(wedgeAlpha)<45,'Require M > 1, 0 < half-angle < 70°, and |α| < 45°.');
 const theta=rad(thetaCone),alpha=rad(wedgeAlpha),limit=shockLimit(M,gamma),faces=['Upper','Lower'].map((side,i)=>{
  const sign=i?-1:1,wall=sign*theta,turn=wall-alpha,compression=sign*turn,base={side,sign,wall,turn,compression};
  if(compression>limit.theta+1e-12)return {...base,status:'detached',kind:'Detached shock',reason:`${side} surface exceeds the attached-shock turn limit (${deg(limit.theta).toFixed(3)}°).`};
  try{const kind=Math.abs(compression)<1e-12?'No wave':compression>0?'Oblique shock':'Expansion fan',w=kind==='Oblique shock'?obliqueShock(M,compression,gamma):kind==='Expansion fan'?expansion(M,-compression,gamma):{M2:M,p:1,T:1,rho:1,p0:1},surface={M:w.M2,p:w.p,T:w.T,rho:w.rho,p0:w.p0,u:w.M2/M*Math.sqrt(w.T),theta:wall};return {...base,status:'ok',kind,beta:w.beta??null,wave:w,surface};}catch(e){return {...base,status:'unsupported',kind:'Model limit',reason:e.message};}
 });
 return {M,gamma,theta,alpha,faces,thetaMax:limit.theta,status:faces.every(f=>f.status==='ok')?'ok':faces.some(f=>f.status==='ok')?'partial':'detached'};
}
export const bodyProperties=[['M','Surface Mach','',s=>s.M],['p','Surface pressure ratio','p/p∞',s=>s.p],['T','Surface temperature ratio','T/T∞',s=>s.T],['rho','Surface density ratio','ρ/ρ∞',s=>s.rho],['p0','Stagnation-pressure recovery','p₀/p₀∞',s=>s.p0],['u','Surface speed ratio','u/u∞',s=>s.u]];
export function solveBodyLab(x){
 const mode=x.bodyGeometry??'Cone',wedge=mode==='Cone'?null:solveWedge(x);let c=null,reason='';
 if(mode==='Compare both'){
  try{const limits=coneLimits(x.M,x.thetaCone,x.gamma);c=rad(x.thetaCone)>limits.thetaMax+2e-8?{status:'detached',limits}:{...cone({...x,alpha:0,betaLimit:limits.betaAtLimit}),limits};}catch(e){c={status:'unsupported',reason:e.message};}
  if(x.wedgeAlpha)reason='Wedge uses the selected incidence; the axisymmetric cone uses α = 0°. These are different incidence conditions.';
 }
 const warnings=wedge.faces.filter(f=>f.reason).map(f=>f.reason);if(c&&c.status!=='ok')warnings.push(c.reason??'Cone: detached shock; no attached Taylor–Maccoll field.');
 const r={bodyLab:true,bodyComparison:mode==='Compare both',wedge,cone:c,status:wedge.status,reason:[reason,...warnings].filter(Boolean).join(' ')||null};
 if(c){const accepted=wedge.faces.filter(f=>f.surface).length+(c.status==='ok'?1:0);r.status=accepted===3?'ok':accepted?'partial':'unsupported';}
 const columns=[...(c?[{name:'Cone · α = 0°',state:c.status==='ok'?{...c.surface,p0:c.history[0].p*isentropic(c.Mpost,x.gamma).p0p/isentropic(x.M,x.gamma).p0p,u:c.surface.M/x.M*Math.sqrt(c.surface.T)}:null,beta:c.beta,turn:c.thetaCone,status:c.status}]:[]),...wedge.faces.map(f=>({name:`Wedge ${f.side.toLowerCase()} · ${f.kind}`,state:f.surface,beta:f.beta,turn:f.turn,status:f.status}))];
 r.bodyTable={columns:columns.map(c=>c.name),statuses:columns.map(c=>c.status),rows:[{label:'Wave angle β to incident flow',unit:'°',values:columns.map(c=>c.beta==null?null:deg(c.beta))},{label:'Signed flow turn from inlet',unit:'°',values:columns.map(c=>c.turn==null?null:deg(c.turn))},...bodyProperties.map(([,label,unit,get])=>({label,unit,values:columns.map(c=>c.state?get(c.state):null)}))]};
 if(mode==='Wedge'&&x.nearbyWall&&x.nearbyWall!=='None'){
 r.wallReflection=solveWedgeWall(x,wedge);const q=r.wallReflection,states=Object.values(q.regions);
 r.bodyTable={columns:['Region 1 · freestream','Region 2 · wall-side shock','Region 3 · reflected shock','Region 4 · opposite face'],statuses:states.map(()=>'ok'),rows:[{label:'Wave angle β to incident flow',unit:'°',values:[null,deg(q.face.beta),deg(q.shock.beta),deg(q.other.beta)]},{label:'Flow direction',unit:'°',values:states.map(z=>deg(z.theta))},...bodyProperties.map(([,label,unit,get])=>({label,unit,values:states.map(get)}))]};
 }
 return r;
}
export function bodyPlots(r){
 if(r.wallReflection)return wedgeWallPlots(r);if(!r.bodyLab)return [];const c=r.cone;
 return bodyProperties.map(([key,label,unit,get])=>({key:'body-'+key,label:label.replace('Surface ',''),note:'Normalized angular coordinate within each body’s own surface-to-wave layer; different physical polar angles. Wedge curves show uniform surface-side states, excluding expansion-fan interiors.',chart:{title:label.replace('Surface ',''),xlabel:'Surface → wave · normalized angular coordinate η',ylabel:unit||'M',zeroBaseline:false,series:[...(c?.history?[{name:'Cone · α = 0°',points:c.history.slice().reverse().map(z=>[(z.theta-c.thetaCone)/(c.beta-c.thetaCone),get({...z,p0:c.history[0].p*isentropic(c.Mpost,r.wedge.gamma).p0p/isentropic(r.wedge.M,r.wedge.gamma).p0p,u:z.M/r.wedge.M*Math.sqrt(z.T)})])}]:[]),...r.wedge.faces.filter(f=>f.surface).map((f,i)=>({name:`Wedge ${f.side.toLowerCase()} · uniform`,dash:i?'6 3':'',points:[[0,get(f.surface)],[1,get(f.surface)]]}))]}}));
}
