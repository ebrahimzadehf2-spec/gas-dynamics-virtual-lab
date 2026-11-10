import {state,rayleighRatios} from './physics.js?v=20261110-rayleigh-audit';
export function rayleighHeatFromInput(x){const mode=x.rayleighInput??'Heat transfer';if(mode==='Heat transfer')return x.q*1000;const g=x.gamma??1.4,R=x.R??287,s=state(x.M1,x.T1,x.p1*1000,g,R);if(mode==='Inlet Mach + outlet stagnation temperature'){if(!(Number.isFinite(x.outletT0)&&x.outletT0>0))throw Error('Outlet stagnation temperature must be positive.');return g*R/(g-1)*(x.outletT0-s.T0);}let M;if(mode==='Sonic outlet')M=1;else if(mode==='Outlet Mach')M=x.targetMach;else {if(!(x.targetPressure>0))throw Error('Outlet pressure must be positive.');const m2=(x.p1/x.targetPressure*(1+g*x.M1*x.M1)-1)/g;if(!(m2>0))throw Error('Outlet pressure gives no positive outlet Mach.');M=Math.sqrt(m2);}if(!(Number.isFinite(M)&&M>0))throw Error('Outlet Mach must be positive.');if((x.M1-1)*(M-1)<-1e-10)throw Error('The requested outlet crosses the sonic state. Shock-free Rayleigh flow must remain on the inlet branch.');if(Math.abs(x.M1-1)<1e-10&&Math.abs(M-1)>1e-10)throw Error('For a sonic inlet, select a slightly subsonic or supersonic inlet to define the cooling branch.');return g*R/(g-1)*s.T0*(rayleighRatios(M,g).T0/rayleighRatios(x.M1,g).T0-1);}
// Physical heat bounds for the active known-data mode; do not use a stale inlet
// Mach when the outlet Mach is the specified independent input.
export function rayleighHeatBounds(x){
 const g=x.gamma??1.4,R=x.R??287,cp=g*R/(g-1);
 let min,max;
 if(x.rayleighInput==='Heat transfer + Outlet Mach'){
  const M=x.targetMach,T0=x.inletT0;
  if(!(M>0&&T0>0))return null;
  const f=rayleighRatios(M,g).T0;
  min=cp*T0*(f-1)/1000;if(M!==1)min+=Math.max(1e-9,Math.abs(min)*1e-9);
  max=M>1?cp*T0*(f/(1-1/(g*g))-1)/1000:1e7;
  if(M>1)max-=Math.max(1e-9,Math.abs(max)*1e-9);
 }else{
  let M=x.M1,T=x.T1;
  if(x.velocityInput==='Flow speed'){
   if(x.temperatureInput==='Stagnation temperature')T=x.inletT0-x.inletSpeed*x.inletSpeed/(2*cp);
   if(!(T>0))return null;
   M=x.inletSpeed/Math.sqrt(g*R*T);
  }else if(x.temperatureInput==='Stagnation temperature')T=x.inletT0/(1+(g-1)*M*M/2);
  if(!(M>0&&T>0))return null;
  const T0=T*(1+(g-1)*M*M/2),star=T0/rayleighRatios(M,g).T0;
  max=Math.max(0,cp*(star-T0)/1000);
  min=cp*((M>1?1-1/(g*g):0)*star-T0)/1000;
  min+=Math.max(1e-9,Math.abs(min)*1e-9);
  if(M===1)min=max=0;
 }
 return Number.isFinite(min)&&Number.isFinite(max)&&min<=max?{min,max}:null;
}
