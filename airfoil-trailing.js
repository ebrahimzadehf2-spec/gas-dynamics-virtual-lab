import {state,shockLimit,prandtlMeyer,deg} from './physics.js';
import {requireValue,bisect,PhysicsError} from './numerics.js';
import {interactionPair} from './wave-interaction.js';

// Local two-stream Riemann matching at a sharp trailing edge. Surface-wave
// intersections upstream of the edge and later downstream interactions are excluded.
export function solveTrailingEdge(upperPanel,lowerPanel,gamma=1.4,R=287){
 try{
  const stream=p=>({...state(p.M,p.T,p.p,gamma,R),theta:p.theta,gamma,R});
  const upper=stream(upperPanel),lower=stream(lowerPanel);
  requireValue(upper.M>1&&lower.M>1,'Both trailing-edge inlet streams must be supersonic.','trailing-limit');
  const nuMax=(Math.sqrt((gamma+1)/(gamma-1))-1)*Math.PI/2;
  const lo=Math.max(lower.theta-shockLimit(lower.M,gamma).theta,upper.theta-(nuMax-prandtlMeyer(upper.M,gamma))+1e-8);
  const hi=Math.min(upper.theta+shockLimit(upper.M,gamma).theta,lower.theta+(nuMax-prandtlMeyer(lower.M,gamma))-1e-8);
  requireValue(lo<hi,'No shared interval for weak attached trailing-edge waves.','trailing-limit');
  const context={lower,upper},pair=phi=>interactionPair(context,phi);
  const f=phi=>{const {a,b}=pair(phi);return Math.log(a.after.p/b.after.p);};
  requireValue(f(lo)*f(hi)<=0,'No pressure-matched weak attached trailing-edge solution.','trailing-limit');
  const root=bisect(f,lo,hi),phi=root.value,{a,b}=pair(phi);
  requireValue(Math.cos(phi)>0&&[a,b].every(w=>w.after.M>1&&w.rays.every(r=>Math.cos(r.angle)>0&&w.side*(r.angle-phi)>0)),'The matched state requires a subsonic or non-downstream wave pattern outside this local model.','trailing-limit');
  const wave=(w,side,id)=>({...w,side,id,origin:{x:1,y:0},turn:deg(phi-w.before.theta)});
  const waves=[wave(b,'Upper','TE-U'),wave(a,'Lower','TE-L')];
  const jump=Math.max(Math.abs(a.after.rho-b.after.rho)/Math.max(a.after.rho,b.after.rho),Math.abs(a.after.u-b.after.u)/Math.max(a.after.u,b.after.u));
  return {status:'ok',phi,slipAngle:deg(phi),pressure:(a.after.p+b.after.p)/2,pressureResidual:Math.abs(a.after.p-b.after.p)/Math.max(a.after.p,b.after.p),directionResidual:Math.abs(a.after.theta-b.after.theta),interfaceKind:jump>1e-7?'Slip line':'Common streamline',upper:b,lower:a,waves,interval:[lo,hi]};
 }catch(e){if(!(e instanceof PhysicsError))throw e;return {status:'unsupported',reason:e.message};}
}
