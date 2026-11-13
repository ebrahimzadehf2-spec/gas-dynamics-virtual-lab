import {state,obliqueShock,shockLimit,rad,deg} from './physics.js';
import {requireValue} from './numerics.js';
import {clipPolygon} from './wave-interaction.js';
export const ramjetMode='Ramjet inlet — Regular shock reflection';
export const ramjetOrientations=['Upper ramp · lower reflecting wall','Lower ramp · upper reflecting wall'];
export const ramjetPreset={wallShape:ramjetMode,ramjetOrientation:ramjetOrientations[0],M1:2,theta:8,gamma:1.4,R:287,fluid:'Air',p1:101.325,T1:300,channelHeight:1,inletPressureType:'Static pressure',temperatureInput:'Static temperature',cornerView:'Analytical contours',bookExample:'6–9'};
export const ramjetDescription='Inspect a compression ramp and regular shock reflection from the opposite horizontal wall. Choose an upper or lower ramp.';
export const ramjetLimit='Weak attached two-shock regular-reflection model. Mach reflection, boundary layers, and subsequent wall encounters are excluded. The view ends before the next shock–ramp encounter.';
export function solveRamjetInlet(x){
 const g=x.gamma??1.4,R=x.R??287,t=rad(x.theta),H=x.channelHeight,orientation=x.ramjetOrientation??ramjetOrientations[0],mirror=orientation===ramjetOrientations[1],sign=mirror?1:-1;
 requireValue(ramjetOrientations.includes(orientation),'Choose an upper or lower ramp orientation.');
 requireValue(x.M1>1&&x.M1<=20&&t>0&&t<Math.PI/3&&H>0&&Number.isFinite(H)&&x.p1>0&&x.T1>0,'Require supersonic inlet flow, positive pressure, temperature and height, and 0 < ramp angle < 60°.');
 const s1={...state(x.M1,x.T1,x.p1*1000,g,R),theta:0},a=obliqueShock(s1.M,t,g,'weak');
 const s2={...state(a.M2,s1.T*a.T,s1.p*a.p,g,R),theta:sign*t};
 requireValue(s2.M>1&&t<=shockLimit(s2.M,g).theta,'No attached weak regular-reflection solution can return this flow to the horizontal wall. Mach reflection is outside this model.','reflection-limit');
 const b=obliqueShock(s2.M,t,g,'weak'),s3={...state(b.M2,s2.T*b.T,s2.p*b.p,g,R),theta:0};
 const mi=Math.tan(a.beta),mr=Math.tan(b.beta-t),mt=Math.tan(t),hit=H/mi,next=(H+mr*hit)/(mr+mt),end=hit+.58*(next-hit),start=-.22*H;
 requireValue(mr>0&&end>hit&&H-mt*end>0,'The reflected shock does not have a valid downstream segment in this geometry.');
 const domain=[[start,0],[end,0],[end,H-mt*end],[0,H],[start,H]],inc=p=>p[1]-H+mi*p[0],ref=p=>p[1]-mr*(p[0]-hit);
 const cells=[{region:1,poly:clipPolygon(domain,p=>-inc(p)),state:s1},{region:2,poly:clipPolygon(clipPolygon(domain,inc),ref),state:s2},{region:3,poly:clipPolygon(domain,p=>-ref(p)),state:s3}];
 const residual=(before,after,beta)=>{const un=before.u*Math.sin(beta),vn=after.u*Math.sin(beta-t),ut=before.u*Math.cos(beta),vt=after.u*Math.cos(beta-t);return Math.max(Math.abs(after.rho*vn/(before.rho*un)-1),Math.abs((after.p+after.rho*vn*vn)/(before.p+before.rho*un*un)-1),Math.abs(vt/ut-1),Math.abs(after.T0/before.T0-1));};
 return {ramjet:true,orientation,mirror,gamma:g,R,s1,regions:{1:s1,2:s2,3:s3},a,b,theta:t,geometry:{H,start,end,hit,next,mi,mr,mt,domain,cells},checks:{incidentJump:residual(s1,s2,a.beta),reflectedJump:residual(s2,s3,b.beta),outletDirection:Math.abs(s3.theta)}};
}
export function ramjetPlots(r){
 const {s1,regions:{2:s2,3:s3},gamma:g}=r,turn=s2.theta,sign=Math.sign(turn),curve=(s,sign,offset)=>Array.from({length:101},(_,i)=>{const d=shockLimit(s.M,g).theta*i/100,z=obliqueShock(s.M,d,g,'weak');return [deg(offset+sign*d),s.p*z.p/s1.p];});
 const plots=[{key:'inlet-p-theta',label:'Pressure–deflection diagram',note:'Weak shock-polar branches; θ is the signed flow direction. The selected path is 1 → 2 → 3, with θ₃ = 0.',chart:{title:'Regular reflection · pressure–deflection diagram',xlabel:'Flow direction θ (°)',ylabel:'p/p₁',zeroBaseline:false,series:[{name:'Incident shock · from region 1',points:curve(s1,sign,0)},{name:'Reflected shock · from region 2',points:curve(s2,-sign,turn)},{name:'Selected flow 1 → 2 → 3',points:[[0,1],[deg(turn),s2.p/s1.p],[0,s3.p/s1.p]]}],markers:[{name:'1',x:0,y:1},{name:'2',x:deg(turn),y:s2.p/s1.p},{name:'3',x:0,y:s3.p/s1.p}]}}];
 for(const [key,label,unit,read] of [['M','Mach number','M',z=>z.M],['p','Static pressure','kPa',z=>z.p/1000],['T','Static temperature','K',z=>z.T],['p0','Stagnation pressure','kPa',z=>z.p0/1000]])plots.push({key:'inlet-'+key,label:label+' by region',chart:{title:label+' by region',xlabel:'Region number',ylabel:unit,zeroBaseline:false,series:[{name:label,points:Object.entries(r.regions).map(([n,z])=>[Number(n),read(z)])}]}});
 return plots;
}
