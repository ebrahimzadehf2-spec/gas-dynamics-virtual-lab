// Local planar upper-lip simple-wave model; no jet reflections or CFD.
// Relations: NACA Report 1135; NASA Glenn oblique-shock and expansion pages.
import {state,isentropic,prandtlMeyer,normalShock,shockLimit,turnAngle,linspace,conservation} from './physics.js?v=20261107-shock-states';
import {gas,positive,requireValue,finite} from './numerics.js';
export function externalJet({M=2,p=100000,T=300,pb=50000,gamma:g=1.4,R=287}={}){
 gas(g,R);positive(p,'Exit pressure');positive(T,'Exit temperature');positive(pb,'Ambient pressure');requireValue(finite(M)&&M>=0,'Exit Mach must be finite and nonnegative.');
 const inlet=state(M,T,p,g,R),ratio=pb/p;
 let s={status:'matched',title:'Pressure-matched exit',inlet,outlet:null,ratio,theta:0,beta:null,head:null,tail:null,p02p01:1,samples:[],checks:{},message:null};
 const sample=(m,theta)=>{const t=inlet.T0/isentropic(m,g).T0T;return {...state(m,t,inlet.p0/isentropic(m,g).p0p,g,R),theta};};
 if(M===0)return {...s,status:'no-flow',title:'No jet flow',message:'There is no jet velocity at this exit state.'};
 if(Math.abs(ratio-1)<=1e-9){s.outlet={...inlet};s.samples=[{...inlet,theta:0}];return s;}
 if(M<1)return {...s,status:'subsonic-limit',title:'Subsonic external flow · not resolved',message:'The exit is subsonic. A Prandtl–Meyer fan or supersonic oblique-shock adjustment cannot be applied. The ambient pressure would affect the upstream flow.'};
 if(ratio<1){
  const m2=Math.sqrt(2/(g-1)*(isentropic(M,g).T0T*ratio**(-(g-1)/g)-1)),nu=prandtlMeyer(M,g),theta=prandtlMeyer(m2,g)-nu;
  if(theta>=Math.PI/2-1e-8)return {...s,status:'turn-limit',title:'Expansion turn exceeds local downstream model',message:'Matching this ambient pressure requires a turn of 90° or more. No downstream jet geometry is displayed for this state.'};
  s={...s,status:'expansion',title:'Underexpanded · Prandtl–Meyer fan',theta,head:-Math.asin(1/M),tail:theta-Math.asin(1/m2)};
  s.samples=linspace(M,m2,65).map(m=>sample(m,prandtlMeyer(m,g)-nu));s.outlet=s.samples.at(-1);
  if(M===1)s.message='Sonic-lip limiting simple wave. This is a local upper-lip solution; interaction of the two sides of a finite jet is not computed.';
 }else{
  if(M===1)return {...s,status:'compression-limit',title:'Sonic exit cannot support an oblique compression shock',message:'A sonic exit cannot supply a finite oblique compression shock. Upstream adjustment and the global jet pattern are outside this local model.'};
  const limit=shockLimit(M,g),maxRatio=normalShock(M*Math.sin(limit.beta),g).p;
  s.weakPressureLimit=maxRatio;
  if(ratio>maxRatio*(1+1e-10))return {...s,status:'compression-limit',title:'Beyond the weak attached-shock limit',message:`Required pₐ/pₑ = ${ratio.toPrecision(5)} exceeds the weak attached range (${maxRatio.toPrecision(5)}). Pressure alone does not select a strong shock, detached pattern or separated jet; those patterns are not resolved.`};
  const beta=Math.asin(Math.min(1,Math.sqrt(1+(Math.min(ratio,maxRatio)-1)*(g+1)/(2*g))/M)),theta=turnAngle(M,beta,g),n=normalShock(M*Math.sin(beta),g),m2=n.M2/Math.sin(beta-theta);
  const outlet=state(m2,T*n.T,p*n.p,g,R);
  s={...s,status:'shock',title:'Overexpanded · weak oblique shock',theta:-theta,beta,head:-beta,tail:-beta,p02p01:n.p0,outlet,samples:[{...inlet,theta:0},{...outlet,theta:-theta}]};
  s.checks=Object.fromEntries(Object.entries(conservation(state(M*Math.sin(beta),T,p,g,R),state(n.M2,outlet.T,outlet.p,g,R),g,R)).map(([k,v])=>['normal'+k[0].toUpperCase()+k.slice(1),v]));
  if(m2<1)s.message='The local weak-shock solution has a subsonic downstream state. It does not determine the subsequent global jet flow.';
 }
 s.checks={...s.checks,pressureMatch:Math.abs(s.outlet.p-pb)/pb,totalTemperature:Math.abs(s.outlet.T0-inlet.T0)/inlet.T0};
 return s;
}
