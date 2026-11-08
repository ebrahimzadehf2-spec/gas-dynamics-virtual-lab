import {coneFromShock} from './cone.js?v=20261108-detachment';
import {rad,deg,bisect,requireValue,finite,gas} from './numerics.js';
const limitsCache=new Map(),machCache=new Map();
const remember=(cache,key,value)=>{if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,value);return value;};
// The attached branches merge where cone half-angle is maximal as beta varies.
export function coneAttachmentLimit(M,g=1.4){
 gas(g);requireValue(finite(M)&&M>1,'Cone attachment limit requires M > 1.');const key=`${M}:${g}`;if(limitsCache.has(key))return limitsCache.get(key);
 const mu=Math.asin(1/M),left=mu+Math.min(1e-6,(Math.PI/2-mu)*1e-4),right=Math.PI/2-1e-7;
 const evaluate=b=>{try{return coneFromShock(M,b,g,{step:.004,tolerance:2e-9}).thetaCone;}catch{return -Infinity;}};
 const nodes=Array.from({length:25},(_,i)=>left+(right-left)*i/24),values=nodes.map(evaluate);let best=0;for(let i=1;i<values.length;i++)if(values[i]>values[best])best=i;
 requireValue(Number.isFinite(values[best])&&best>0&&best<nodes.length-1,'Could not bracket the conical-shock attachment maximum.','cone-limit-unresolved');
 let a=nodes[best-1],b=nodes[best+1];const ratio=(Math.sqrt(5)-1)/2;let c=b-ratio*(b-a),d=a+ratio*(b-a),fc=evaluate(c),fd=evaluate(d);
 for(let i=0;i<36;i++){if(fc>fd){b=d;d=c;fd=fc;c=b-ratio*(b-a);fc=evaluate(c);}else{a=c;c=d;fc=fd;d=a+ratio*(b-a);fd=evaluate(d);}}
 const beta=(a+b)/2,solution=coneFromShock(M,beta,g,{step:.001,tolerance:1e-11});
 return remember(limitsCache,key,{M,gamma:g,thetaMax:solution.thetaCone,thetaMaxDeg:deg(solution.thetaCone),betaAtLimit:beta,betaAtLimitDeg:deg(beta)});
}
export function coneCriticalMach(thetaCone,g=1.4){
 gas(g);requireValue(finite(thetaCone)&&thetaCone>0&&thetaCone<70,'A positive cone half-angle below 70° is required.');const key=`${thetaCone}:${g}`;if(machCache.has(key))return machCache.get(key);
 const target=rad(thetaCone),lo=1.000001;let hi=2;
 while(hi<128&&coneAttachmentLimit(hi,g).thetaMax<target)hi*=2;
 if(coneAttachmentLimit(hi,g).thetaMax<target)return remember(machCache,key,{status:'unresolved',M:null,searchMax:hi});
 const root=bisect(m=>coneAttachmentLimit(m,g).thetaMax-target,lo,hi,{xtol:2e-8,ftol:2e-9,max:40});
 return remember(machCache,key,{status:'ok',M:root.value,residual:root.residual,...{thetaCone,gamma:g}});
}
export const coneLimits=(M,thetaCone,g=1.4)=>({...coneAttachmentLimit(M,g),critical:coneCriticalMach(thetaCone,g)});
