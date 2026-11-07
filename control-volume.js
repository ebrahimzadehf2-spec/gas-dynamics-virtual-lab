import {gas,finite,positive,requireValue} from './numerics.js';
import {state,isentropic,areaMach,machFromArea,normalShock} from './physics.js';

export function controlVolume(x){
 const g=x.gamma??1.4,R=x.R??287,{cp}=gas(g,R);
 requireValue(['Check proposed outlet','Solve outlet speed'].includes(x.balanceMode),'Choose a control-volume mode.');
 requireValue(finite(x.M1,x.T1,x.p1,x.A1,x.T2,x.p2,x.A2,x.Qdot,x.Wdot,x.Fx)&&x.M1>0,'All inputs must be finite; inlet Mach must be positive.');
 for(const k of ['T1','p1','A1','T2','p2','A2'])positive(x[k],k);
 const A1=x.A1*1e-4,A2=x.A2*1e-4,a=state(x.M1,x.T1,x.p1*1000,g,R),m1=a.rho*a.u*A1;
 const M2=x.balanceMode==='Solve outlet speed'?m1/(x.p2*1000/(R*x.T2)*A2*Math.sqrt(g*R*x.T2)):x.M2;
 requireValue(finite(M2)&&M2>0,'Outlet Mach must be finite and positive.');
 const b=state(M2,x.T2,x.p2*1000,g,R),m2=b.rho*b.u*A2,Q=x.Qdot*1000,W=x.Wdot*1000;
 const terms={mass:{left:m1,right:m2,unit:'kg/s',terms:[['Inlet mass flow',m1],['Outlet mass flow',-m2]]},
 momentum:{left:a.p*A1-b.p*A2+x.Fx,right:m2*b.u-m1*a.u,unit:'N',terms:[['Inlet pressure force',a.p*A1],['Outlet pressure force',-b.p*A2],['Wall / support force on fluid',x.Fx],['Inlet momentum flux',m1*a.u],['Outlet momentum flux',-m2*b.u]]},
 energy:{left:Q-W+m1*cp*a.T0,right:m2*cp*b.T0,unit:'W',terms:[['Heat into fluid',Q],['Shaft work out',-W],['Inlet enthalpy rate',m1*cp*a.T],['Inlet kinetic-energy rate',m1*a.u*a.u/2],['Outlet enthalpy rate',-m2*cp*b.T],['Outlet kinetic-energy rate',-m2*b.u*b.u/2]]}};
 for(const t of Object.values(terms)){t.residual=t.left-t.right;t.relative=Math.abs(t.residual)/Math.max(1e-12,t.terms.reduce((n,[,v])=>n+Math.abs(v),0));t.passed=t.relative<1e-7;}
 const ds=cp*Math.log(b.T/a.T)-R*Math.log(b.p/a.p),entropyChecked=Math.abs(Q)<1e-10&&terms.mass.passed,entropyViolation=entropyChecked&&ds< -1e-7;
 const balanced=Object.values(terms).every(t=>t.passed);
 return {status:entropyViolation?'entropy-violation':balanced?'balanced':'unbalanced',a,b,A1,A2,m1,m2,cp,gamma:g,R,terms,balanced,entropyChecked,entropyViolation,ds,Q,W,Fx:x.Fx,
  forceRequired:m2*b.u-m1*a.u-(a.p*A1-b.p*A2),heatRequired:W+m2*cp*b.T0-m1*cp*a.T0};
}
export function controlVolumePreset(kind='nozzle'){
 const gamma=1.4,R=287,base={balanceMode:'Check proposed outlet',gamma,R,M1:.3,T1:300,p1:200,A1:10,A2:5,Qdot:0,Wdot:0,Fx:0};
 let M2,T2,p2;
 if(kind==='shock'){base.M1=2;base.A2=base.A1;const n=normalShock(base.M1,gamma);M2=n.M2;T2=base.T1*n.T;p2=base.p1*n.p;}
 else{M2=machFromArea(areaMach(base.M1,gamma)*base.A2/base.A1,'subsonic',gamma);const tr=isentropic(base.M1,gamma).T0T/isentropic(M2,gamma).T0T;T2=base.T1*tr;p2=base.p1*tr**(gamma/(gamma-1));}
 const x={...base,M2,T2,p2},r=controlVolume(x);return {...x,Fx:r.forceRequired};
}
