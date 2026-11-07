import {gas,positive,requireValue,finite,bisect,maximum,rad,deg,linspace,PhysicsError} from './numerics.js';
export {rad,deg,linspace,PhysicsError};
export function isentropic(M,g=1.4){gas(g);requireValue(finite(M)&&M>=0,'Mach number must be finite and nonnegative.');let t=1+(g-1)*M*M/2;return {T0T:t,p0p:t**(g/(g-1)),rho0rho:t**(1/(g-1))};}
export function isentropicRelations(M,g=1.4){
 const r=isentropic(M,g),tr=(g+1)/(2*r.T0T);
 return {M,pP0:1/r.p0p,rhoRho0:1/r.rho0rho,TT0:1/r.T0T,pPstar:tr**(g/(g-1)),rhoRhostar:tr**(1/(g-1)),TTstar:tr,areaRatio:M===0?null:areaMach(M,g),areaUnbounded:M===0,machAngle:M>=1?deg(Math.asin(1/M)):null,pmAngle:M>=1?deg(prandtlMeyer(M,g)):null};
}
export function state(M,T,p,g=1.4,R=287){gas(g,R);positive(T,'Temperature');positive(p,'Pressure');let a=Math.sqrt(g*R*T),u=M*a,rho=p/(R*T),s=isentropic(M,g);return {M,T,p,rho,a,u,T0:T*s.T0T,p0:p*s.p0p};}
export function normalShock(M,g=1.4){gas(g);requireValue(finite(M)&&M>=1,'A compression shock requires upstream normal Mach ≥ 1.');let m=M*M,p=1+2*g/(g+1)*(m-1),rho=(g+1)*m/((g-1)*m+2),M2=Math.sqrt((1+(g-1)*m/2)/(g*m-(g-1)/2));let p0=p*isentropic(M2,g).p0p/isentropic(M,g).p0p;return {M2,p,rho,T:p/rho,u:1/rho,p0,ds_R:-Math.log(p0)};}
export function areaMach(M,g=1.4){gas(g);positive(M,'Mach');return (2/(g+1)*(1+(g-1)*M*M/2))**((g+1)/(2*(g-1)))/M;}
export function machFromArea(A,branch='supersonic',g=1.4){gas(g);requireValue(finite(A)&&A>=1,'A/A* must be at least 1.');if(A===1)return 1;requireValue(['subsonic','supersonic'].includes(branch),'Choose a Mach branch.');if(branch==='subsonic')return bisect(M=>areaMach(M,g)-A,1e-10,1).value;let hi=2;while(areaMach(hi,g)<A&&hi<1e6)hi*=2;return bisect(M=>areaMach(M,g)-A,1,hi).value;}
export function turnAngle(M,beta,g=1.4){return Math.atan(2/Math.tan(beta)*(M*M*Math.sin(beta)**2-1)/(M*M*(g+Math.cos(2*beta))+2));}
export function shockLimit(M,g=1.4){gas(g);requireValue(finite(M)&&M>1,'Upstream Mach must exceed 1.');let mu=Math.asin(1/M),p=maximum(b=>turnAngle(M,b,g),mu,Math.PI/2);return {mu,beta:p.x,theta:p.y};}
export function obliqueShock(M,theta,g=1.4,branch='weak'){
 let lim=shockLimit(M,g);requireValue(finite(theta)&&theta>=0,'Compression deflection must be nonnegative.');requireValue(['weak','strong'].includes(branch),'Choose weak or strong branch.');
 requireValue(theta<=lim.theta+1e-12,`Attached-shock limit is ${deg(lim.theta).toFixed(4)}°. Detached geometry is outside this model.`,'detached');
 let root=theta===0?{value:branch==='weak'?lim.mu:Math.PI/2,residual:0,iterations:0}:bisect(b=>turnAngle(M,b,g)-theta,...(branch==='weak'?[lim.mu,lim.beta]:[lim.beta,Math.PI/2]));
 let beta=root.value,Mn=Math.max(1,M*Math.sin(beta)),n=normalShock(Mn,g);return {...n,M2:n.M2/Math.sin(beta-theta),beta,theta,thetaMax:lim.theta,branch,residual:root.residual,iterations:root.iterations};
}
export function prandtlMeyer(M,g=1.4){gas(g);requireValue(finite(M)&&M>=1,'Prandtl–Meyer flow requires M ≥ 1.');let z=Math.sqrt(M*M-1);return Math.sqrt((g+1)/(g-1))*Math.atan(Math.sqrt((g-1)/(g+1))*z)-Math.atan(z);}
export function expansion(M,theta,g=1.4){gas(g);requireValue(finite(theta)&&theta>=0,'Expansion turn must be nonnegative.');let nu1=prandtlMeyer(M,g),target=nu1+theta,max=(Math.sqrt((g+1)/(g-1))-1)*Math.PI/2;requireValue(target<max,'Turn reaches the infinite-Mach expansion limit.','expansion-limit');let hi=Math.max(2,M*2);while(prandtlMeyer(hi,g)<target&&hi<1e8)hi*=2;let root=bisect(m=>prandtlMeyer(m,g)-target,M,hi),M2=root.value,t=isentropic(M,g).T0T/isentropic(M2,g).T0T;return {M2,T:t,p:t**(g/(g-1)),rho:t**(1/(g-1)),p0:1,nu1,nu2:target,residual:root.residual,iterations:root.iterations};}
export function rayleighRatios(M,g=1.4){gas(g);positive(M,'Mach');let d=1+g*M*M,p=(g+1)/d,T=(g+1)**2*M*M/d**2,u=(g+1)*M*M/d,rho=1/u,T0=2*(g+1)*M*M/d**2*(1+(g-1)*M*M/2),p0=p*(2/(g+1)*(1+(g-1)*M*M/2))**(g/(g-1));return {p,T,u,rho,T0,p0};}
export function conservation(s1,s2,g=1.4,R=287,q=0){let cp=gas(g,R).cp;const rel=(x,y)=>Math.abs(x-y)/Math.max(1,Math.abs(x),Math.abs(y));return {mass:rel(s1.rho*s1.u,s2.rho*s2.u),momentum:rel(s1.p+s1.rho*s1.u**2,s2.p+s2.rho*s2.u**2),energy:rel(cp*s1.T0+q,cp*s2.T0),eos:rel(s2.p,s2.rho*R*s2.T)};}
export function rayleigh({M1=.5,T1=300,p1=101000,q=100000,gamma:g=1.4,R=287,branch='auto'}={}){
 positive(M1,'Inlet Mach');requireValue(finite(q),'Heat must be finite.');let cp=gas(g,R).cp,s1=state(M1,T1,p1,g,R),r1=rayleighRatios(M1,g),T0star=s1.T0/r1.T0,qmax=cp*(T0star-s1.T0),target=(s1.T0+q/cp)/T0star;
 if(q>qmax+1e-8*Math.max(1,Math.abs(qmax)))return {status:'heat-limit',qmax,s1,s2:null,message:'Requested heat exceeds choking heat for this fixed inlet. No steady outlet for these inputs.'};
 requireValue(target>0,'Cooling would produce nonpositive stagnation temperature.','cooling-limit');
 let b=branch==='auto'?(M1<1?'subsonic':M1>1?'supersonic':null):branch;
 requireValue(b===null||['subsonic','supersonic'].includes(b),'Invalid Rayleigh branch.');
 requireValue(b!==null||Math.abs(q)<1e-9,'For a sonic inlet under cooling, choose the outlet branch.','ambiguous-branch');
 let root,M2;
 if(Math.abs(q)<1e-10){M2=M1;root={residual:0,iterations:0};}
 else if(Math.abs(target-1)<2e-14){M2=1;root={residual:0,iterations:0};}
 else if(b==='subsonic'){root=bisect(m=>rayleighRatios(m,g).T0-target,1e-10,1);M2=root.value;}
 else {const lower=1-1/(g*g);requireValue(target>lower,'Supersonic cooling reaches the infinite-Mach limit; no finite outlet on this branch.','cooling-limit');let hi=Math.max(2,M1);while(rayleighRatios(hi,g).T0>target&&hi<1e8)hi*=2;root=bisect(m=>rayleighRatios(m,g).T0-target,1,hi);M2=root.value;}
 let r2=rayleighRatios(M2,g),s2=state(M2,T1*r2.T/r1.T,p1*r2.p/r1.p,g,R);
 return {status:M2===1?'sonic-limit':'ok',branch:b,qmax,T0star,s1,s2,residual:root.residual,iterations:root.iterations,checks:conservation(s1,s2,g,R,q),ds_R:g/(g-1)*Math.log(s2.T/s1.T)-Math.log(s2.p/s1.p)};
}
export function fannoRatios(M,g=1.4){gas(g);positive(M,'Mach');let T=(g+1)/(2+(g-1)*M*M),u=M*Math.sqrt(T),p=Math.sqrt(T)/M;return {T,u,p,rho:1/u,p0:p*(2/(g+1)*(1+(g-1)*M*M/2))**(g/(g-1)),F:(1-M*M)/(g*M*M)+(g+1)/(2*g)*Math.log((g+1)*M*M/(2+(g-1)*M*M))};}
export function fanno({M1=.5,T1=300,p1=101000,lambda=.2,gamma:g=1.4,R=287}={}){gas(g,R);positive(M1,'Mach');requireValue(finite(lambda)&&lambda>=0,'f_D L / D must be finite and nonnegative.');let r1=fannoRatios(M1,g),s1=state(M1,T1,p1,g,R);if(lambda>r1.F+1e-12)return {status:'length-limit',limit:r1.F,s1,s2:null,message:'Duct friction length exceeds the sonic limit for this fixed inlet.'};let target=Math.max(0,r1.F-lambda),root,M2;if(lambda===0)M2=M1;else if(target<1e-14)M2=1;else{root=bisect(m=>fannoRatios(m,g).F-target,...(M1<1?[M1,1]:[1,M1]));M2=root.value;}let r2=fannoRatios(M2,g),s2=state(M2,T1*r2.T/r1.T,p1*r2.p/r1.p,g,R);let check=conservation(s1,s2,g,R);return {status:M2===1?'sonic-limit':'ok',limit:r1.F,s1,s2,iterations:root?.iterations??0,residual:root?.residual??0,checks:{mass:check.mass,energy:check.energy,eos:check.eos},ds_R:-Math.log(s2.p0/s1.p0)};}
export function shockTube({p1=5000,p4=200000,T1=298.15,T4=293.15,gamma1:g1=1.4,gamma4:g4=1.4,R1=287,R4=287}={}){
 gas(g1,R1);gas(g4,R4);[p1,p4,T1,T4].forEach(x=>positive(x,'Pressure/temperature'));requireValue(p4>p1,'This orientation requires driver pressure p4 > p1.');let a1=Math.sqrt(g1*R1*T1),a4=Math.sqrt(g4*R4*T4),ratio=p4/p1;
 const evalP=r=>{let Ms=Math.sqrt(1+(g1+1)/(2*g1)*(r-1)),n=normalShock(Ms,g1),u2=Ms*a1*(1-1/n.rho),u3=2*a4/(g4-1)*(1-(r/ratio)**((g4-1)/(2*g4)));return {Ms,n,u2,u3};};
 let root=bisect(r=>{let x=evalP(r);return (x.u2-x.u3)/Math.max(a1,a4);},1,ratio),r=root.value,{Ms,n,u2,u3}=evalP(r),p=p1*r,T3=T4*(p/p4)**((g4-1)/g4),rho2=p/(R1*T1*n.T),rho3=p/(R4*T3);
 return {status:'ok',p2p1:r,p,Ms,shockSpeed:Ms*a1,u:u2,T2:T1*n.T,T3,rho2,rho3,a1,a4,head:-a4,tail:u3-Math.sqrt(g4*R4*T3),contact:u2,residual:u2-u3,iterations:root.iterations};
}
function cdNozzle({areaRatio:Ae=2,backRatio:pb=.8,gamma:g=1.4}={}){
 gas(g);requireValue(finite(Ae,pb)&&Ae>1&&pb>0&&pb<=1,'Require Ae/At > 1 and 0 < pb/p01 ≤ 1.');let MeSub=machFromArea(Ae,'subsonic',g),MeSup=machFromArea(Ae,'supersonic',g),onset=1/isentropic(MeSub,g).p0p,design=1/isentropic(MeSup,g).p0p,exitShock=design*normalShock(MeSup,g).p;
 let regime,As=null,Astar1=1,Astar2=1,loss=1,Me,root;
 function shockAt(S){let M1=machFromArea(S,'supersonic',g),n=normalShock(M1,g),Ast2=S/areaMach(n.M2,g),me=machFromArea(Ae/Ast2,'subsonic',g);return {M1,n,Ast2,Me:me,pb:n.p0/isentropic(me,g).p0p};}
 if(pb===1){regime='No flow';Me=0;Astar1=0;}
 else if(pb>=onset){regime=Math.abs(pb-onset)<1e-12?'Sonic throat · subsonic exit':'Unchoked · subsonic';Me=Math.sqrt(2/(g-1)*(pb**(-(g-1)/g)-1));Astar1=Ae/areaMach(Me,g);}
 else if(pb>=exitShock){regime=pb===exitShock?'Normal shock at exit':'Internal normal shock';root=bisect(S=>shockAt(S).pb-pb,1,Ae);As=root.value;let s=shockAt(As);Me=s.Me;loss=s.n.p0;Astar2=s.Ast2;}
 else {regime=Math.abs(pb-design)<1e-10?'Ideally expanded':pb>design?'Overexpanded · external adjustment':'Underexpanded · external adjustment';Me=MeSup;}
 const At=1,xt=.28,L=1,half=a=>Math.sqrt(a)*.12;let points=[];for(let x of linspace(0,L,181)){let A=x<=xt?1+1.2*((xt-x)/xt)**2:1+(Ae-1)*((x-xt)/(L-xt))**2;let m,p;
  if(pb===1){m=0;p=1;}else if(pb>=onset){m=machFromArea(Math.max(1,A/Astar1),'subsonic',g);p=1/isentropic(m,g).p0p;}else{let after=As!==null&&x>xt&&A>As;m=machFromArea(Math.max(1,A/(after?Astar2:1)),x<xt||after?'subsonic':'supersonic',g);p=(after?loss:1)/isentropic(m,g).p0p;}
  points.push({x,A,M:m,p,h:half(A)});}
 let shockX=As===null?null:xt+(L-xt)*Math.sqrt((As-At)/(Ae-At));return {status:'ok',regime,Me,AsAt:As,shockX,p02p01:loss,onset,exitShock,design,points,residual:root?.residual??0,iterations:root?.iterations??0};
}
// Areas are normalized by the minimum geometric area. Dimensional inputs use SI.
export function nozzle({nozzleType='cd',areaRatio=2,contractionRatio=2,backRatio=.8,MIn=.3,sonicBranch='supersonic',outletCondition='Matched isentropic',p0=500000,T0=400,minArea=.0006,gamma:g=1.4,R=287}={}){
 const types={'Converging–diverging':'cd','Converging':'converging','Diverging':'diverging',cd:'cd',converging:'converging',diverging:'diverging'};
 const type=types[nozzleType];requireValue(!!type,'Choose a nozzle geometry.');gas(g,R);positive(p0,'Stagnation pressure');positive(T0,'Stagnation temperature');positive(minArea,'Minimum area');
 let s,astar=1,Ae=areaRatio;const critical=1/isentropic(1,g).p0p;
 if(type==='cd'){
  s=cdNozzle({areaRatio,backRatio,gamma:g});s.nozzleType=type;s.backRatio=backRatio;
  // Add both one-sided shock states at exactly the same section, including at exit.
  if(s.AsAt!==null){
   const m1=machFromArea(s.AsAt,'supersonic',g),n=normalShock(m1,g),x=s.shockX;
   s.points=s.points.filter(z=>Math.abs(z.x-x)>1e-12);
   const before={x,A:s.AsAt,M:m1,p:1/isentropic(m1,g).p0p,h:.12*Math.sqrt(s.AsAt)};
   const after={...before,M:n.M2,p:before.p*n.p};
   s.points.push(before,after);s.points.sort((a,b)=>a.x-b.x);
  }
  s.minimumMach=backRatio>=s.onset?(backRatio===1?0:machFromArea(Math.max(1,1/(areaRatio/areaMach(s.Me,g))),'subsonic',g)):1;
  s.choked=backRatio<=s.onset;s.exitAreaRatio=areaRatio;
  s.points=s.points.filter(z=>Math.abs(z.x-.28)>1e-12);s.points.push({x:.28,A:1,M:s.minimumMach,p:1/isentropic(s.minimumMach,g).p0p,h:.12});s.points.sort((a,b)=>a.x-b.x);
 }else if(type==='converging'){
  requireValue(finite(contractionRatio)&&contractionRatio>1,'Require inlet-to-exit area ratio > 1.');requireValue(finite(backRatio)&&backRatio>0&&backRatio<=1,'Require 0 < back pressure / reservoir pressure ≤ 1.');
  const choked=backRatio<=critical,Me=choked?1:Math.sqrt(2/(g-1)*(backRatio**(-(g-1)/g)-1));astar=Me===0?0:1/areaMach(Me,g);Ae=1;
  s={status:'ok',nozzleType:type,regime:choked?(backRatio<critical?'Choked · underexpanded exit':'Choked · sonic exit'):'Unchoked · subsonic',Me,minimumMach:Me,choked,AsAt:null,shockX:null,p02p01:1,onset:critical,exitShock:null,design:null,critical,backRatio,exitAreaRatio:1,residual:0,iterations:0,points:[]};
  for(const x of linspace(0,1,181)){const A=1+(contractionRatio-1)*(1-x)**2,m=Me===0?0:machFromArea(Math.max(1,A/astar),'subsonic',g);s.points.push({x,A,M:m,p:1/isentropic(m,g).p0p,h:.12*Math.sqrt(A)});}
 }else{
  requireValue(finite(areaRatio)&&areaRatio>1,'Require exit-to-inlet area ratio > 1.');requireValue(finite(MIn)&&MIn>0&&MIn<=20,'Require 0 < inlet Mach ≤ 20.');requireValue(['subsonic','supersonic'].includes(sonicBranch),'Choose the downstream branch for a sonic inlet.');
  requireValue(['Matched isentropic','Specified back pressure'].includes(outletCondition),'Choose an outlet condition.');
  const branch=MIn===1?sonicBranch:MIn<1?'subsonic':'supersonic';astar=1/areaMach(MIn,g);
  const meIso=machFromArea(areaRatio/astar,branch,g),peIso=1/isentropic(meIso,g).p0p;
  const specified=outletCondition==='Specified back pressure';
  if(specified)requireValue(finite(backRatio)&&backRatio>0&&backRatio<=1,'Require 0 < back pressure / inlet stagnation pressure ≤ 1.');
  const pb=specified?backRatio:peIso;
  let As=null,loss=1,astar2=astar,Me=meIso,shock=null,root=null,exitShock=null,inletShock=null;
  let regime=branch==='supersonic'?'Supersonic · accelerating':'Subsonic · decelerating';
  // S = As/Ai, not As/A*: the inlet Mach sets the upstream critical area.
  const shockAt=S=>{const m1=S===1?MIn:machFromArea(S/astar,'supersonic',g),n=normalShock(m1,g),ast2=S/areaMach(n.M2,g),me=machFromArea(Math.max(1,areaRatio/ast2),'subsonic',g);return {m1,n,ast2,me,pb:n.p0/isentropic(me,g).p0p};};
  if(branch==='supersonic'){
   exitShock=shockAt(areaRatio).pb;inletShock=shockAt(1).pb;
   if(specified){
    requireValue(pb<=inletShock+1e-12,`Back pressure exceeds the shock-at-inlet limit (${inletShock.toFixed(8)} p₀). The prescribed inlet Mach cannot be maintained; upstream adjustment or unstart is outside this model.`,'unsupported-pattern');
    if(pb>=exitShock-1e-12){
     const target=Math.min(inletShock,Math.max(exitShock,pb));
     root=bisect(S=>shockAt(S).pb-target,1,areaRatio,{ftol:1e-13});As=root.value;
     const j=shockAt(As);loss=j.n.p0;astar2=j.ast2;Me=j.me;shock={upstreamMach:j.m1,downstreamMach:j.n.M2,pressureRatio:j.n.p,temperatureRatio:j.n.T};
     regime=As===areaRatio?'Normal shock at exit':As===1?(MIn===1?'Sonic inlet · subsonic exit':'Normal shock at inlet'):'Internal normal shock';
    }else regime=Math.abs(pb-peIso)<1e-10?'Ideally expanded':pb>peIso?'Overexpanded · external adjustment':'Underexpanded · external adjustment';
   }
  }else if(specified){
   requireValue(Math.abs(pb-peIso)<=1e-10,`A subsonic inlet and area ratio fix pₑ/p₀ = ${peIso.toFixed(8)}. No normal shock is possible on this branch. Change the back pressure or use Matched isentropic; an incompatible pressure requires a different inlet state.`,'unsupported-pattern');
  }
  const shockX=As===null?null:Math.sqrt((As-1)/(areaRatio-1));
  s={status:'ok',nozzleType:type,outletCondition,regime,Me,minimumMach:MIn,choked:MIn===1,AsAt:As,shockX,shock,p02p01:loss,onset:null,exitShock,inletShock,design:peIso,critical,backRatio:pb,exitAreaRatio:areaRatio,inletMach:MIn,residual:root?.residual??0,iterations:root?.iterations??0,pressureMatched:!specified||branch==='subsonic'||As!==null,points:[]};
  const point=(x,A,m,p0ratio=1)=>({x,A,M:m,p:p0ratio/isentropic(m,g).p0p,h:.12*Math.sqrt(A)});
  for(const x of linspace(0,1,181)){
   if(shockX!==null&&Math.abs(x-shockX)<1e-12)continue;
   const A=1+(areaRatio-1)*x*x,after=shockX!==null&&x>shockX,m=x===0?MIn:machFromArea(Math.max(1,A/(after?astar2:astar)),after?'subsonic':branch,g);
   s.points.push(point(x,A,m,after?loss:1));
  }
  if(As!==null){s.points.push(point(shockX,As,shock.upstreamMach),point(shockX,As,shock.downstreamMach,loss));s.points.sort((a,b)=>a.x-b.x);}

 }
 for(const z of s.points){z.T=T0/isentropic(z.M,g).T0T;z.P=p0*z.p;z.area=minArea*z.A;z.rho=z.P/(R*z.T);z.u=z.M*Math.sqrt(g*R*z.T);z.massFlow=z.rho*z.u*z.area;}
 const e=s.points.at(-1);s.exitPressure=e.P;s.exitTemperature=e.T;s.massFlow=e.massFlow;s.exitArea=minArea*s.exitAreaRatio;s.minArea=minArea;s.p0=p0;s.T0=T0;s.R=R;
 s.massResidual=Math.max(...s.points.map(z=>Math.abs(z.massFlow-s.massFlow)))/Math.max(1e-30,s.massFlow);
 s.pressureMatched??=!s.choked||s.AsAt!==null;
 s.pressureResidual=s.pressureMatched?Math.abs(e.p-s.backRatio):0;
 if(s.shock){const pair=s.points.filter(z=>z.x===s.shockX);s.shockChecks=conservation(state(pair[0].M,pair[0].T,pair[0].P,g,R),state(pair[1].M,pair[1].T,pair[1].P,g,R),g,R);}
 return s;
}

export function collision({M1=4,thetaUpper=10,thetaLower=20,gamma:g=1.4}={}){
 let t2=rad(thetaUpper),t3=rad(thetaLower),n2=obliqueShock(M1,t2,g),n3=obliqueShock(M1,t3,g);requireValue(n2.M2>1&&n3.M2>1,'Both incident post-shock streams must remain supersonic in this two-shock model.','unsupported-pattern');
 let lim2=shockLimit(n2.M2,g).theta,lim3=shockLimit(n3.M2,g).theta;
 // Signed global outgoing direction δ: turns from incoming directions +t2 and −t3.
 let lo=Math.max(-t3,t2-lim2),hi=Math.min(t2,lim3-t3);requireValue(lo<=hi,'No common interval for two attached outgoing compression shocks.','unsupported-pattern');
 const pair=d=>{let a=obliqueShock(n2.M2,t2-d,g),b=obliqueShock(n3.M2,t3+d,g);return {a,b,p4:n2.p*a.p,p5:n3.p*b.p};};
 let root=bisect(d=>{let s=pair(d);return Math.log(s.p4/s.p5);},lo,hi),s=pair(root.value);return {status:'ok',delta:root.value,slipAngle:-deg(root.value),...s,n2,n3,residual:root.residual,iterations:root.iterations};
}
export function linearAirfoil({M=3,alpha=4,thickness=.08}={}){requireValue(finite(M,alpha,thickness)&&M>1&&Math.abs(alpha)<=10&&thickness>=0&&thickness<=.2,'Require M > 1, |α| ≤ 10°, and 0 ≤ t/c ≤ 0.2.');let a=rad(alpha),b=Math.sqrt(M*M-1),s=thickness,cl=4*a/b,cd=4*(a*a+s*s)/b;return {status:'ok',CL:cl,CD:cd,CpUF:2*(s-a)/b,CpUR:2*(-s-a)/b,CpLF:2*(s+a)/b,CpLR:2*(-s+a)/b,warning:M<1.4||Math.abs(alpha)>6||thickness>.1?'Small-disturbance approximation is strained; compare with shock–expansion theory.':null};}
