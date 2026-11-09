import {probeCone} from './cone-probe.js';
import {wedgeGeometry} from './wedge-graphics.js?v=20261109-wedge-contour';
import {expansion,deg} from './physics.js';
export function probeWedge(w,x,y){
 const g=wedgeGeometry(w),dx=x-g.x;if(dx<=1e-8||dx>g.length)return null;const a=Math.atan2(g.y-y,dx);if(Math.abs(a)<w.theta-1e-10)return null;
 const f=w.faces[a>=0?0:1];if(!f.surface)return null;
 const head=w.alpha+f.sign*(f.beta??Math.asin(1/w.M));if(f.sign*(a-head)>1e-10)return null;
 if(f.kind==='Expansion fan'){
  const tail=f.wall+f.sign*Math.asin(1/f.surface.M);
  if(f.sign*(a-tail)>0){let lo=0,hi=1;for(let i=0;i<45;i++){const t=(lo+hi)/2,z=expansion(w.M,Math.abs(f.turn)*t,w.gamma),ray=w.alpha+f.turn*t+f.sign*Math.asin(1/z.M2);if(f.sign*(ray-a)>0)lo=t;else hi=t;}const t=(lo+hi)/2,z=expansion(w.M,Math.abs(f.turn)*t,w.gamma);return {theta:deg(a),M:z.M2,p:z.p,T:z.T,rho:z.rho,u:z.M2/w.M*Math.sqrt(z.T)};}
 }
 return {...f.surface,theta:deg(a)};
}
export function probeBody(s,inputs,x,y){if(s.kind==='bodyCompare')return x<640?probeWedge(s.wedge,x,y-30):s.cone?.status==='ok'?probeCone(s.cone,inputs,x-640,y-30):null;return s.kind==='wedge'?probeWedge(s.wedge,x,y):probeCone(s,inputs,x,y);}
