import {gas,positive,requireValue,finite,rad,deg,bisect,linspace} from './numerics.js';
import {normalShock,turnAngle,isentropic} from './physics.js';
export function coneFromShock(M,beta,g=1.4,{step=.002,tolerance=1e-10}={}){
 gas(g);requireValue(finite(M,beta,step,tolerance)&&M>1&&beta>Math.asin(1/M)&&beta<Math.PI/2&&step>0&&tolerance>0,'Require M > 1, Mach angle < β < 90°, and positive integration settings.');
 let n=normalShock(M*Math.sin(beta),g),V=Math.sqrt(M*M/(M*M+2/(g-1))),y=[V*Math.cos(beta),-V*Math.sin(beta)/n.rho],theta=beta,h=step,iterations=0;
 const rhs=(t,[v,w])=>{let a=(g-1)/2*(1-v*v-w*w),d=a-w*w;requireValue(finite(t,v,w,a,d)&&t>0&&a>0&&Math.abs(d)>1e-12,'Taylor–Maccoll trajectory reached a singular or nonphysical state.','cone-singularity');return [w,(v*w*w-a*(2*v+w/Math.tan(t)))/d];};
 const add=(a,b,s)=>a.map((x,i)=>x+s*b[i]);
 function rk(t,z,d){let k1=rhs(t,z),k2=rhs(t+d/2,add(z,k1,d/2)),k3=rhs(t+d/2,add(z,k2,d/2)),k4=rhs(t+d,add(z,k3,d));return z.map((x,i)=>x+d/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]));}
 const history=[{theta,vr:y[0],vt:y[1]}];
 while(theta>1e-5&&iterations<30000){iterations++;let dt=-Math.min(h,theta/3),full=rk(theta,y,dt),mid=rk(theta,y,dt/2),fine=rk(theta+dt/2,mid,dt/2),err=Math.max(...fine.map((x,i)=>Math.abs(x-full[i])/15));
  if(err>tolerance){h*=.5;requireValue(h>1e-9,'Cone integration could not achieve tolerance.','nonconverged');continue;}
  if(fine[1]>=0){const event=d=>{let z=rk(theta,y,d/2);return rk(theta+d/2,z,d/2);};let root=bisect(d=>event(d)[1],dt,0,{ftol:1e-13,xtol:1e-13});y=event(root.value);theta+=root.value;history.push({theta,vr:y[0],vt:y[1]});
   let delta=turnAngle(M,beta,g),Mpost=n.M2/Math.sin(beta-delta),Tpost=n.T;
   const props=(v,w)=>{let v2=v*v+w*w,m=Math.sqrt(2*v2/((g-1)*(1-v2))),T=Tpost*isentropic(Mpost,g).T0T/isentropic(m,g).T0T,p=n.p*(T/Tpost)**(g/(g-1));return {M:m,T,p,rho:p/T};};
   let surface=props(...y);return {status:'ok',beta,thetaCone:theta,thetaConeDeg:deg(theta),Mpost,surface,eventResidual:y[1],iterations,history:history.map(s=>({...s,...props(s.vr,s.vt)}))};
  }
  y=fine;theta+=dt;history.push({theta,vr:y[0],vt:y[1]});if(err<tolerance/32)h=Math.min(step,h*1.5);
 }
 throw new Error('No cone-surface event was found within the physical integration interval.');
}
export function cone({M=2,thetaCone=10,gamma:g=1.4}={}){
 gas(g);requireValue(finite(M,thetaCone)&&M>1&&thetaCone>0&&thetaCone<70,'Require M > 1 and a positive cone half-angle below 70°.');let target=rad(thetaCone),mu=Math.asin(1/M),last=null,bracket=null;
 // First physical crossing selects the weak conical-shock branch.
 for(let b of linspace(mu+1e-5,Math.PI/2-1e-4,120)){let s;try{s=coneFromShock(M,b,g,{step:.004,tolerance:3e-9});}catch{last=null;continue;}let f=s.thetaCone-target;if(last&&last.f*f<=0){bracket=[last.b,b];break;}last={b,f};}
 requireValue(bracket,'No attached weak conical-shock root was bracketed. Detached or unresolved states are outside this release.','cone-unresolved');
 let root=bisect(b=>coneFromShock(M,b,g).thetaCone-target,...bracket,{ftol:2e-10,xtol:2e-11,max:80}),s=coneFromShock(M,root.value,g,{step:.001,tolerance:1e-11});return {...s,residual:s.thetaCone-target,rootIterations:root.iterations};
}
