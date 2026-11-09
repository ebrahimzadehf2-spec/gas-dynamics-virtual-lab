import {solveWaveChannel,channelOrdinate} from './wave-channel.js';
import {solveInteraction,interactionPair,clipPolygon} from './wave-interaction.js';
import {deg,rad} from './physics.js';
import {requireValue,PhysicsError} from './numerics.js';
export function chapter6Example(number){
 const common={wallShape:'Custom wall',boundaryMode:'Channel',channelSolver:'Shock–Expansion',fluid:'Air',gamma:1.4,R:287,T1:300};
 if(String(number)==='4')return {...common,M1:4,p1:10,channelHeight:1,wallSegments:[{angle:20,length:1.8}],upperWallSegments:[{angle:-10,length:2}]};
 requireValue(String(number)==='5','Choose example 6–4 or 6–5.');
 return {...common,M1:3,p1:100,channelHeight:3,wallSegments:[{angle:10,length:1/Math.cos(rad(10))},{angle:20,length:2}],upperWallSegments:[{angle:0,length:4}]};
}
const turns=(wall,end)=>{let previous=0;const out=[];for(const p of wall.panels){if(p.a.x>=end-1e-9)break;const delta=p.theta-previous;if(Math.abs(delta)>1e-9)out.push({...p,delta});previous=p.theta;}return out;};
export function regularPattern(geometry){
 const lower=turns(geometry.lower,geometry.end),upper=turns(geometry.upper,geometry.end);
 if(lower.length===1&&lower[0].delta>0&&upper.length===1&&upper[0].delta<0)return {same:false,lower,upper};
 if(lower.length===2&&lower.every(p=>p.delta>0)&&upper.length===0)return {same:true,lower,upper};
 return null;
}
export function solveRegularChannel(x,{fallback=true}={}){
 const base=solveWaveChannel(x),pattern=regularPattern(base.geometry);
 if(!pattern){if(fallback)return base;return {...base,status:'unsupported',reason:'Regular matching requires one compression corner on each wall, or two successive lower-wall compression corners with a straight upper wall.'};}
 try{
  const {same,lower,upper}=pattern,first=lower[0],second=same?lower[1]:upper[0],theta1=deg(first.theta),theta2=deg(same?second.delta:-second.theta);
  const r=solveInteraction({...x,thetaUpper:theta1,thetaLower:theta2,interactionType:same?'Same-direction shocks':'Opposing shocks',geometryMode:'Educational',alpha:0});
  const A=[first.a.x,first.a.y],C=[second.a.x,second.a.y],ma=Math.tan(r.n2.beta),mc=Math.tan(same?first.theta+r.n3.beta:-r.n3.beta),bx=(C[1]-A[1]+ma*A[0]-mc*C[0])/(ma-mc),B=[bx,A[1]+ma*(bx-A[0])],g=base.geometry;
  const bottom=xx=>xx<0?0:channelOrdinate(g.lower,xx),top=xx=>xx<0?g.height:channelOrdinate(g.upper,xx);
  requireValue(Number.isFinite(bx)&&bx>Math.max(A[0],C[0])+1e-8&&bx<g.end&&B[1]>bottom(bx)+1e-8&&B[1]<top(bx)-1e-8,'The incident shocks do not meet inside the shared channel before a wall encounter.','geometry-limit');
  requireValue(base.limitX===null||base.limitX>=bx-1e-7*Math.max(1,bx),'Another unresolved wave event occurs before the selected shock interaction.','geometry-limit');
  let firstWallX=Infinity;
  for(const angle of [r.delta,...r.a.rays.map(z=>z.angle),...r.b.rays.map(z=>z.angle)]){
   requireValue(Math.cos(angle)>0,'An outgoing wave is not downstream-directed.','unsupported-pattern');const m=Math.tan(angle);
   for(const wall of [g.lower,g.upper])for(const p of wall.panels){const mw=Math.tan(p.theta),den=m-mw;if(Math.abs(den)<1e-12)continue;const xx=(p.a.y-B[1]+m*bx-mw*p.a.x)/den;if(xx>bx+1e-8&&xx>=p.a.x-1e-9&&xx<=p.b.x+1e-9)firstWallX=Math.min(firstWallX,xx);}
  }
  const endX=Math.min(g.end,Number.isFinite(firstWallX)?bx+.97*(firstWallX-bx):g.end),startX=-.12*Math.min(g.height,g.end);
  const boundary=wall=>[[startX,wall===g.lower?0:g.height],...wall.points.filter(p=>p.x<endX-1e-9).map(p=>[p.x,p.y]),[endX,channelOrdinate(wall,endX)]];
  const lowerBoundary=boundary(g.lower),upperBoundary=boundary(g.upper),domain=[...lowerBoundary,...upperBoundary.slice().reverse()];
  const lines=[{origin:A,angle:r.n2.beta},{origin:C,angle:same?first.theta+r.n3.beta:-r.n3.beta},...[r.a,r.b].flatMap(w=>w.rays.map(ray=>({origin:B,angle:ray.angle}))),{origin:B,angle:r.delta}];
  let cells=[domain];for(const l of lines){const m=Math.tan(l.angle),fn=([xx,yy])=>yy-l.origin[1]-m*(xx-l.origin[0]);cells=cells.flatMap(poly=>[clipPolygon(poly,fn),clipPolygon(poly,p=>-fn(p))]).filter(poly=>poly.length>=3&&Math.abs(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-a[1]*b[0];},0))>1e-12*Math.max(1,g.height*g.end));}
  const classify=([xx,yy])=>{
   if(xx<bx){
    const belowFirst=xx>=A[0]&&yy<A[1]+ma*(xx-A[0]);
    if(same){if(!belowFirst)return r.regions[1];return xx>=C[0]&&yy<C[1]+mc*(xx-C[0])?r.regions[3]:r.regions[2];}
    if(belowFirst)return r.regions[2];return xx>=C[0]&&yy>C[1]+mc*(xx-C[0])?r.regions[3]:r.regions[1];
   }
   const angle=Math.atan2(yy-B[1],xx-bx),w=angle<r.delta?r.a:r.b;
   if(w.kind==='No wave')return w.after;
   if(w.side*(angle-w.rays[0].angle)>0)return w.before;
   if(w.side*(angle-w.rays.at(-1).angle)<=0)return w.after;
   return w.rays.reduce((a,b)=>Math.abs(a.angle-angle)<Math.abs(b.angle-angle)?a:b).state;
  };
  const fields=cells.map(poly=>({poly,state:classify(poly.reduce((c,p)=>[c[0]+p[0]/poly.length,c[1]+p[1]/poly.length],[0,0]))})),segment=angle=>({origin:B,end:[endX,B[1]+Math.tan(angle)*(endX-bx)]});
  const regionLabels=same?{1:'1',2:'2',3:'3',4:'4',5:'5'}:{1:'1',2:'2',3:'3',4:'4′',5:'4'};
  let bookCase=null;if(Math.abs((x.gamma??1.4)-1.4)<1e-10){if(!same&&Math.abs(x.M1-4)<1e-9&&Math.abs(x.p1-10)<1e-9&&Math.abs(theta1-20)<1e-8&&Math.abs(theta2-10)<1e-8)bookCase='6–4';if(same&&Math.abs(x.M1-3)<1e-9&&Math.abs(x.p1-100)<1e-9&&Math.abs(theta1-10)<1e-8&&Math.abs(theta2-10)<1e-8)bookCase='6–5';}
  return {...r,geometryMode:'Custom geometry',channel:true,interaction:true,bookCase,regionLabels,status:'ok',reason:endX<g.end-1e-9?'Regular interaction and slip angle solved. The view ends before the next wall reflection.':null,limitX:endX<g.end-1e-9?endX:null,channelGeometry:g,s1:base.s1,gamma:base.gamma,R:base.R,panels:base.panels,
   geometry:{A,C,B,H:g.height,d:C[0]-A[0],startX,endX,firstWallX,domain,fields,incident:[{origin:A,end:B},{origin:C,end:B}],outgoing:[r.a,r.b].flatMap(w=>w.rays.map(ray=>({...segment(ray.angle),kind:w.kind}))),slip:segment(r.delta),walls:{lower:lowerBoundary,upper:upperBoundary}}};
 }catch(e){if(!(e instanceof PhysicsError))throw e;return {...base,status:'partial',reason:e.message,interactionError:true};}
}
export function regularChannelPlots(r){
 const series=[{name:`Lower stream → ${r.regionLabels[4]}`,points:[]},{name:`Upper stream → ${r.regionLabels[5]}`,points:[]}],lo=Math.max(r.interval[0]+1e-8,r.delta-rad(2)),hi=Math.min(r.interval[1]-1e-8,r.delta+rad(2));
 for(let i=0;i<=80;i++){const phi=lo+(hi-lo)*i/80,{a,b}=interactionPair(r,phi);series[0].points.push([deg(phi),a.after.p/1000]);series[1].points.push([deg(phi),b.after.p/1000]);}
 const plots=[{key:'regular-match',label:'Slip-line pressure matching',chart:{title:'Equal pressure · common flow direction',xlabel:'Slip-line angle φ (°)',ylabel:'Static pressure (kPa)',zeroBaseline:false,series,markers:[{x:r.slipAngle,y:r.regions[4].p/1000,name:'Matched state'}]},note:'The common flow angle is solved, not prescribed. Both pressures coincide at the marker.'}];
 for(const [key,label,unit,value]of [['M','Regional Mach numbers','M',z=>z.M],['p','Regional pressures','p (kPa)',z=>z.p/1000],['T','Regional temperatures','T (K)',z=>z.T],['rho','Regional densities','ρ (kg/m³)',z=>z.rho],['p0','Regional stagnation pressures','p₀ (kPa)',z=>z.p0/1000]])plots.push({key:'regular-'+key,label,chart:{title:label,xlabel:'Canonical state index (1–5)',ylabel:unit,scatter:true,zeroBaseline:false,series:[{name:Object.entries(r.regionLabels).map(([n,name])=>`${n} → ${name}`).join(' · '),points:Object.entries(r.regions).map(([n,z])=>[Number(n),value(z)])}]},note:r.same?'States 4 and 5 have equal pressure and direction.':'Book labels: canonical state 4 = region 4′, canonical state 5 = region 4.'});
 return plots;
}
