import {solveShockFan} from './shock-fan-example.js';
import {channelOrdinate} from './wave-channel.js';
import {deg,rad} from './physics.js';
// Match fully turned streams only when the incident shock crosses the entire
// fan inside the shared domain, before any intervening wall reflection.
export function customFinalMatch(x,r){
 const g=r.geometry;
 const turns=wall=>{let previous=0;return wall.panels.flatMap(p=>{const d=p.theta-previous;previous=p.theta;return Math.abs(d)>1e-9&&p.a.x<g.end?[p]:[];});};
 const lower=turns(g.lower),upper=turns(g.upper);
 if(lower.length!==1||upper.length!==1||lower[0].theta<=0||upper[0].theta<=0)return null;
 try{
  const ref=solveShockFan({...x,fanShockAngle:deg(lower[0].theta),fanExpansionAngle:deg(upper[0].theta)}).result;
  const A=lower[0].a,C=upper[0].a,ms=Math.tan(rad(ref.shockAngle)),fan=[-Math.asin(1/ref.s1.M),ref.regions[3].theta-Math.asin(1/ref.regions[3].M)];
  const intersections=fan.map(angle=>{const mf=Math.tan(angle),xx=(C.y-A.y+ms*A.x-mf*C.x)/(ms-mf);return {x:xx,y:A.y+ms*(xx-A.x)};});
  if(intersections.some(p=>!Number.isFinite(p.x)||p.x<=Math.max(A.x,C.x)+1e-8||p.x>=g.end-1e-8||p.y<=channelOrdinate(g.lower,p.x)+1e-8||p.y>=channelOrdinate(g.upper,p.x)-1e-8))return null;
  const fullFanX=Math.max(...intersections.map(p=>p.x));
  if(r.tracking.events.some(e=>e.type==='Wall reflection'&&e.x<fullFanX-1e-8))return null;
  return {...ref,fullFanX,note:'Final uniform-stream matching reference, measured from the horizontal. It uses the complete incident expansion; the internal shock–fan interaction remains approximated in the tracked field.'};
 }catch{return null;}
}
