import {wallGeometry} from './wave-wall.js';
import {channelOrdinate} from './wave-channel.js';
import {state,obliqueShock,expansion,shockLimit,prandtlMeyer,rad,deg} from './physics.js';
import {requireValue,finite,bisect,PhysicsError} from './numerics.js';

// Event-driven, piecewise-constant wave-front approximation. Every finite
// compression uses the weak oblique-shock polar, every rarefaction jump uses
// the isentropic PM curve, and every contact matches p and theta. There is no
// finite-volume grid. Rarefaction fronts have a finite angular width: this is
// an approximation, not an exact characteristic field or a general CFD code.
const small=1e-9;
const apply=(s,w,theta,g,R)=>({...state(w.M2,s.T*w.T,s.p*w.p,g,R),theta});
const rel=(a,b)=>Math.abs(a-b)/Math.max(1,Math.abs(a),Math.abs(b));
function accepted(s){
 requireValue(finite(s.M,s.T,s.p,s.theta)&&s.M>1.000001&&s.M<=50,'A sonic/subsonic state or Mach-50 expansion limit was reached. The accepted upstream field is retained.','tracking-limit');
 requireValue(Math.abs(s.theta)+Math.asin(1/s.M)<Math.PI/2-1e-5,'A characteristic points upstream in x. This downstream wave tracker stops here.','tracking-limit');
 return s;
}
function turn(s,theta,side,g,R){
 const d=theta-s.theta,a=Math.abs(d);
 if(a<1e-11)return {kind:'No wave',before:s,after:s,side,beta:null};
 const shock=side*d>0,w=shock?obliqueShock(s.M,a,g):expansion(s.M,a,g),after=apply(s,w,theta,g,R);
 accepted(after);
 return {...w,kind:shock?'Oblique shock':'Expansion fan',before:s,after,side};
}
export function matchTrackingStreams(lower,upper,g=1.4,R=287){
 accepted(lower);accepted(upper);
 const maxNu=prandtlMeyer(50,g),lo=Math.max(lower.theta-shockLimit(lower.M,g).theta,upper.theta-(maxNu-prandtlMeyer(upper.M,g)))+1e-10,
 hi=Math.min(upper.theta+shockLimit(upper.M,g).theta,lower.theta+(maxNu-prandtlMeyer(lower.M,g)))-1e-10;
 requireValue(lo<hi,'No shared attached-wave interval exists. Detached shocks and Mach reflections are not followed.','tracking-limit');
 // The pressure root may be bracketed through states whose downstream Mach
 // is subsonic. Only the final, physically accepted root is marched onward.
 const pressure=(s,theta,side)=>{const d=theta-s.theta;if(Math.abs(d)<1e-12)return s.p;return s.p*(side*d>0?obliqueShock(s.M,Math.abs(d),g):expansion(s.M,Math.abs(d),g)).p;};
 const f=theta=>Math.log(pressure(lower,theta,-1)/pressure(upper,theta,1));
 requireValue(f(lo)*f(hi)<=0,'No regular weak-wave pressure match exists. The field stops before an unsupported reflection pattern.','tracking-limit');
 const root=bisect(f,lo,hi,{xtol:2e-12,ftol:2e-11}),theta=root.value,
 a=turn(lower,theta,-1,g,R),b=turn(upper,theta,1,g,R);
 requireValue(Math.abs(Math.log(a.after.p/b.after.p))<1e-7,'The pressure-matching tolerance was not met.','tracking-limit');
 return {a,b,theta,pressure:(a.after.p+b.after.p)/2,residual:Math.abs(Math.log(a.after.p/b.after.p))};
}
function bundle(w,origin,step,g,R,allocate){
 if(w.kind==='No wave')return [];
 const fronts=[];
 const add=(before,after,angle,kind,beta=null)=>{accepted(before);accepted(after);requireValue(Math.abs(angle)<Math.PI/2-1e-5,'An emitted wave is not downstream-directed.','tracking-limit');fronts.push({origin:{...origin},m:Math.tan(angle),angle,kind,beta,before,after,side:w.side,lower:w.side>0?after:before,upper:w.side>0?before:after});};
 if(w.kind==='Oblique shock')add(w.before,w.after,w.before.theta+w.side*w.beta,w.kind,w.beta);
 else{
  const n=Math.max(1,Math.ceil(Math.abs(w.after.theta-w.before.theta)/step));let before=w.before;
  for(let i=1;i<=n;i++){
   const theta=w.before.theta+(w.after.theta-w.before.theta)*i/n,after=i===n?w.after:apply(w.before,expansion(w.before.M,Math.abs(theta-w.before.theta),g),theta,g,R);
   allocate(after);
   const angle=.5*(before.theta+after.theta+w.side*(Math.asin(1/before.M)+Math.asin(1/after.M)));
   add(before,after,angle,'Expansion front');before=after;
  }
 }
 return fronts.sort((a,b)=>a.m-b.m);
}
export function trackingPreset(name){
 const common={wallShape:'Custom wall',boundaryMode:'Channel',channelSolver:'Attached-wave tracking',fluid:'Air',gamma:1.4,R:287,T1:300,p1:100,M1:3,channelHeight:1,trackingStep:.5,trackingStation:1,trackingRefine:'Off'};
 if(name==='reflection')return {...common,wallSegments:[{angle:5,length:6}],upperWallSegments:[{angle:0,length:6}]};
 if(name==='shock-fan')return {...common,wallSegments:[{angle:2,length:4}],upperWallSegments:[{angle:2,length:4}]};
 if(name==='fans')return {...common,wallSegments:[{angle:-3,length:4}],upperWallSegments:[{angle:3,length:4}]};
 requireValue(false,'Choose a wave-tracking example.');
}
const ordinate=(f,x)=>f.origin.y+f.m*(x-f.origin.x);
function geometry(x){
 const lower=wallGeometry({...x,wallSide:'Gas above wall'}),upper=wallGeometry({...x,wallSide:'Gas below wall',wallSegments:x.upperWallSegments});
 requireValue(finite(x.channelHeight)&&x.channelHeight>=.01&&x.channelHeight<=100,'Channel height must be 0.01–100 m.');
 for(const p of new Set([...upper.points,...upper.panels.flatMap(p=>[p.a,p.b])]))p.y+=x.channelHeight;
 const end=Math.min(lower.end,upper.end),g={lower,upper,end,height:x.channelHeight};
 const xs=[0,end,...lower.points.map(p=>p.x),...upper.points.map(p=>p.x)].filter(a=>a<=end);
 requireValue(xs.every(a=>channelOrdinate(upper,a)-channelOrdinate(lower,a)>1e-8),'The walls close or cross before the shared channel exit.');
 return g;
}
function trackCore(x){
 const g=geometry(x),gamma=x.gamma??1.4,R=x.R??287,step=rad(Number(x.trackingStep??.5)),s1=accepted({...state(x.M1,x.T1,x.p1*1000,gamma,R),theta:0});
 requireValue(x.M1>1&&x.M1<=20&&x.T1>0&&x.p1>0,'Require 1 < inlet Mach ≤ 20 and positive temperature and pressure.');
 requireValue(step>=rad(.125)-1e-12&&step<=rad(2),'Expansion-front width must be 0.125–2°.');
 const allStates={};let nextState=1;const allocate=z=>{if(!z.stateId)z.stateId=String(nextState++);allStates[z.stateId]=z;return z;};allocate(s1);
 const active=[],traces=[],slabs=[],events=[],surfaces={lower:[],upper:[]};let xNow=0,lowState=s1,highState=s1,reason=null,lastMatch=null,cellCount=0;
 const eps=1e-9*Math.max(1,g.end,g.height),yEps=1e-8*Math.max(1,g.height),wallY=(side,xx)=>channelOrdinate(g[side],xx);
 const wallTheta=(side,xx)=>{const panels=g[side].panels;return (panels.find(p=>xx<p.b.x-eps)??panels.at(-1)).theta;};
 const corners=[];
 for(const side of ['lower','upper']){let previous=0;for(const p of g[side].panels){if(p.a.x>=g.end-eps)break;if(Math.abs(p.theta-previous)>1e-10)corners.push({x:p.a.x,side});previous=p.theta;}}
 corners.sort((a,b)=>a.x-b.x);
 let ci=0;
 const install=fronts=>{for(const f of fronts){f.start={...f.origin};traces.push(f);}return fronts;};
 const endFront=(f,point)=>{f.end={...point};};
 const commitWall=(side,xx,reflection=false)=>{
  const lower=side==='lower',point={x:xx,y:wallY(side,xx)};let before=lower?lowState:highState,remove=0;
  if(reflection){
   while(remove<active.length&&Math.abs(ordinate(active[lower?remove:active.length-1-remove],xx)-point.y)<yEps*5)remove++;
   requireValue(remove>0,'A wall event could not be located within tolerance.','tracking-limit');
   const consumed=lower?active.slice(0,remove):active.slice(-remove);before=lower?consumed.at(-1).upper:consumed[0].lower;
   // Solve before changing the accepted active list: failed events leave the
   // valid incoming solution available right up to this station.
  }
  const theta=wallTheta(side,xx),w=turn(before,theta,lower?1:-1,gamma,R);allocate(w.after);
  const fronts=bundle(w,point,step,gamma,R,allocate);
  const consumed=reflection?(lower?active.splice(0,remove):active.splice(active.length-remove,remove)):[];
  consumed.forEach(f=>endFront(f,point));install(fronts);
  if(lower){active.unshift(...fronts);lowState=w.after;}else{active.push(...fronts);highState=w.after;}
  const e={index:events.length+1,type:reflection?'Wall reflection':'Wall corner',side,x:xx,y:point.y,before,after:w.after,waves:[w],incoming:consumed.map(f=>f.kind),theta,pressure:w.after.p};events.push(e);
  surfaces[side].push({x:xx,state:w.after});
 };
 const recordSlab=right=>{
  if(right-xNow<eps*.01)return;
  const bottoms=[wallY('lower',xNow),...active.map(f=>ordinate(f,xNow)),wallY('upper',xNow)],tops=[wallY('lower',right),...active.map(f=>ordinate(f,right)),wallY('upper',right)],states=[lowState,...active.map(f=>f.upper)];
  for(let i=0;i<states.length;i++)requireValue(bottoms[i+1]>=bottoms[i]-yEps&&tops[i+1]>=tops[i]-yEps*5,'Wave ordering failed; the accepted field stops before crossing fronts.','tracking-limit');
  requireValue(cellCount+states.length<=80000,'The display-cell budget was reached. Increase expansion-front width or shorten the channel.','tracking-budget');
  const flux=states.reduce((v,z,i)=>v+z.rho*z.u*Math.cos(z.theta)*Math.max(0,tops[i+1]-tops[i]),0),inlet=s1.rho*s1.u*g.height;
  requireValue(Math.abs(flux-inlet)/inlet<.005,'The mass-flow discrepancy exceeds 0.5%. Refine the expansion fronts; the downstream field is withheld.','tracking-accuracy');
  slabs.push({left:xNow,right,bottoms,tops,states});cellCount+=states.length;
 };
 try{
  while(ci<corners.length&&corners[ci].x<eps){commitWall(corners[ci].side,0);ci++;}
  while(xNow<g.end-eps){
   requireValue(events.length<1600&&active.length<300,'The wave-tracking event/front budget was reached. Increase expansion-front width or shorten the channel.','tracking-budget');
   let next={type:'exit',x:g.end};
   const candidate=e=>{if(e.x>=xNow-eps*.01&&e.x<next.x-eps*.001)next={...e,x:Math.max(xNow,e.x)};};
   if(ci<corners.length)candidate({type:'corner',x:corners[ci].x,side:corners[ci].side});
   for(let i=0;i<active.length-1;i++){
    const a=active[i],b=active[i+1],den=a.m-b.m;if(den<=1e-13)continue;
    const xx=xNow+(ordinate(b,xNow)-ordinate(a,xNow))/den;candidate({type:'collision',x:xx,i});
   }
   for(const [side,f]of [['lower',active[0]],['upper',active.at(-1)]])if(f)for(const p of g[side].panels){
    const mw=Math.tan(p.theta),den=f.m-mw;if(Math.abs(den)<1e-13)continue;
    if((side==='lower'&&den>=0)||(side==='upper'&&den<=0))continue;
    const xx=(p.a.y-f.origin.y+f.m*f.origin.x-mw*p.a.x)/den;
    if(xx>=p.a.x-eps&&xx<=p.b.x+eps)candidate({type:'wall',x:xx,side});
   }
   recordSlab(next.x);xNow=next.x;
   if(next.type==='exit')break;
   if(next.type==='collision'){
    let i=next.i,j=i+1;const yy=.5*(ordinate(active[i],xNow)+ordinate(active[j],xNow));
    while(i>0&&Math.abs(ordinate(active[i-1],xNow)-yy)<yEps)i--;
    while(j+1<active.length&&Math.abs(ordinate(active[j+1],xNow)-yy)<yEps)j++;
    if(Math.abs(yy-wallY('lower',xNow))<yEps*5){commitWall('lower',xNow,true);}
    else if(Math.abs(yy-wallY('upper',xNow))<yEps*5){commitWall('upper',xNow,true);}
    else{
     const lower=active[i].lower,upper=active[j].upper,match=matchTrackingStreams(lower,upper,gamma,R),point={x:xNow,y:yy};
     allocate(match.a.after);allocate(match.b.after);
     const a=bundle(match.a,point,step,gamma,R,allocate),b=bundle(match.b,point,step,gamma,R,allocate),contact=[];
     if(rel(match.a.after.M,match.b.after.M)>1e-8||rel(match.a.after.T,match.b.after.T)>1e-8){contact.push({origin:{...point},m:Math.tan(match.theta),angle:match.theta,kind:'Slip line',side:0,lower:match.a.after,upper:match.b.after});}
     const outgoing=[...a,...contact,...b];
     requireValue(outgoing.every((f,k)=>!k||f.m>=outgoing[k-1].m-1e-10),'The regular outgoing waves are not ordered downstream.','tracking-limit');
     const consumed=active.splice(i,j-i+1,...install(outgoing));consumed.forEach(f=>endFront(f,point));
     if(!active.length){lowState=match.a.after;highState=match.b.after;}
     else{lowState=active[0].lower;highState=active.at(-1).upper;}
     const e={index:events.length+1,type:'Wave interaction',x:xNow,y:yy,lower,upper,match,waves:[match.a,match.b],incoming:consumed.map(f=>f.kind),theta:match.theta,pressure:match.pressure,hasSlip:!!contact.length};events.push(e);lastMatch=e;
    }
   }else if(next.type==='wall')commitWall(next.side,xNow,true);
   // A corner and a reflection can occupy the same station; the wall solver
   // already used the downstream segment angle, so do not turn it twice.
   while(ci<corners.length&&corners[ci].x<=xNow+eps){const c=corners[ci++];if(!(next.type==='wall'&&c.side===next.side&&Math.abs(c.x-xNow)<eps))commitWall(c.side,xNow);}
  }
 }catch(e){if(!(e instanceof PhysicsError))throw e;reason=e.message;}
 for(const f of active)if(!f.end)endFront(f,{x:xNow,y:ordinate(f,xNow)});
 const final=slabs.at(-1),fluxAt=(slab,end)=>{const ys=end?slab.tops:slab.bottoms;return slab.states.reduce((sum,z,i)=>sum+z.rho*z.u*Math.cos(z.theta)*Math.max(0,ys[i+1]-ys[i]),0);};
 const inletFlux=s1.rho*s1.u*g.height,massResidual=final?Math.abs(fluxAt(final,true)-inletFlux)/inletFlux:0,maxMassResidual=slabs.reduce((max,z)=>Math.max(max,Math.abs(fluxAt(z,true)-inletFlux)/inletFlux),0),maxPressureResidual=events.reduce((v,e)=>Math.max(v,e.match?.residual??0),0);
 const usedStates=new Set([s1,...slabs.flatMap(s=>s.states),...events.flatMap(e=>e.waves.flatMap(w=>[w.before,w.after]))]);
 const acceptedStates=Object.fromEntries([...usedStates].map(z=>[z.stateId,z]));
 const tracking={step:deg(step),events,traces:traces.filter(f=>f.end&&f.end.x-f.origin.x>eps*.01),slabs,allStates:acceptedStates,surfaces,endX:xNow,cellCount,massResidual,maxMassResidual,maxPressureResidual,lastMatchIndex:lastMatch?.index??null};
 return {channel:true,tracking,status:reason?'partial':'ok',reason,limitX:reason?xNow:null,geometry:g,s1,gamma,R,regions:{Inlet:s1},panels:[],waves:[]};
}
export function trackingProfile(r,fraction=1){
 const ss=r.tracking.slabs;if(!ss.length)return null;
 const target=Math.min(r.tracking.endX,r.geometry.end*Math.max(0,Math.min(1,fraction))),slab=ss.find(s=>target<s.right-1e-10)??ss.at(-1),t=Math.max(0,Math.min(1,(target-slab.left)/(slab.right-slab.left)));
 return {x:Math.max(slab.left,Math.min(slab.right,target)),states:slab.states,ys:slab.bottoms.map((a,i)=>a+(slab.tops[i]-a)*t)};
}
export function solveWaveTracker(x){
 requireValue(finite(x.trackingStation??1)&&(x.trackingStation??1)>=0&&(x.trackingStation??1)<=1,'Profile station x/L must be between 0 and 1.');
 const r=trackCore(x),profile=trackingProfile(r,x.trackingStation??1);
 if(profile){const locate=y=>profile.states[Math.max(0,profile.ys.findIndex((v,i)=>i>0&&y<=v)-1)]??profile.states.at(-1);r.regions={Inlet:r.s1,'Lower sample':profile.states[0],'Centre sample':locate((profile.ys[0]+profile.ys.at(-1))/2),'Upper sample':profile.states.at(-1)};}
 if(x.trackingRefine==='On'&&r.tracking.slabs.length){
  const fine=trackCore({...x,trackingStep:Math.max(.125,(x.trackingStep??.5)/2)}),a=trackingProfile(r,x.trackingStation??1),b=trackingProfile(fine,x.trackingStation??1);
  const comparable=r.status==='ok'&&fine.status==='ok'&&Math.abs(a.x-b.x)<1e-7*Math.max(1,r.geometry.end);
  const sample=(p,t)=>{const y=p.ys[0]+t*(p.ys.at(-1)-p.ys[0]);return p.states[Math.max(0,p.ys.findIndex((v,i)=>i>0&&y<=v)-1)]??p.states.at(-1);};
  let pressureL1=0,machL1=0;for(let i=0;i<201;i++){const t=(i+.5)/201,u=sample(a,t),v=sample(b,t);pressureL1+=Math.abs(u.p-v.p)/r.s1.p/201;machL1+=Math.abs(u.M-v.M)/r.s1.M/201;}
  r.tracking.refinement={comparable,fineStep:fine.tracking.step,fineStatus:fine.status,pressureL1:comparable?pressureL1:null,machL1:comparable?machL1:null,massResidual:fine.tracking.massResidual};
 }
 return r;
}
export function trackingPlots(r,fraction=1){
 const p=trackingProfile(r,fraction);if(!p)return [];
 return [['M','Mach number','M',s=>s.M],['p','Static pressure','p (kPa)',s=>s.p/1000],['T','Static temperature','T (K)',s=>s.T],['rho','Density','ρ (kg/m³)',s=>s.rho],['theta','Flow direction','θ (°)',s=>deg(s.theta)],['p0','Stagnation pressure','p₀ (kPa)',s=>s.p0/1000]].map(([key,label,unit,value])=>({key:'tracking-'+key,label:'Cross-channel '+label.toLowerCase(),chart:{title:label+' · x = '+Number(p.x.toPrecision(5))+' m',xlabel:'Height y (m)',ylabel:unit,zeroBaseline:false,series:[{name:label,points:p.states.flatMap((s,i)=>[[p.ys[i],value(s)],[p.ys[i+1],value(s)]])}]},note:'Piecewise-constant wave-front approximation. Refine expansion-front width to assess sensitivity.'}));
}
