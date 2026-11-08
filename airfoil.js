import {state,obliqueShock,expansion,rad,deg,isentropic,PhysicsError} from './physics.js';
import {requireValue,finite} from './numerics.js';
const point=(x,y)=>({x,y});
function coordinates(text,label){
 const rows=String(text).trim().split(/[;\n]+/).filter(s=>s.trim()).map(s=>s.trim().split(/[,\s]+/).map(Number));
 requireValue(rows.length>=2&&rows.length<=21&&rows.every(r=>r.length===2&&r.every(Number.isFinite)),`${label}: enter 2–21 x,y pairs, separated by semicolons or newlines.`);
 const points=rows.map(([x,y])=>point(x,y));requireValue(Math.abs(points[0].x)<1e-10&&Math.abs(points[0].y)<1e-10&&Math.abs(points.at(-1).x-1)<1e-10&&Math.abs(points.at(-1).y)<1e-10,`${label} must start at 0,0 and end at 1,0.`);
 requireValue(points.every((p,i)=>Math.abs(p.y)<=.3&&(!i||p.x>points[i-1].x)),`${label}: x must increase strictly and |y/c| must not exceed 0.3.`);return points;
}
export function segmentSurface(segments,label='Surface',max=19){
 requireValue(Array.isArray(segments)&&segments.length<=max,`${label}: use at most ${max} entered segments.`);
 const points=[point(0,0)];
 for(const [i,s]of segments.entries()){
  requireValue(finite(s.angle,s.length)&&Math.abs(s.angle)<85&&s.length>0&&s.length<=2,`${label} segment ${i+1}: require |angle| < 85° and 0 < L/c ≤ 2.`);
  const a=points.at(-1),b=point(a.x+s.length*Math.cos(rad(s.angle)),a.y+s.length*Math.sin(rad(s.angle)));
  requireValue(b.x<1-1e-6&&Math.abs(b.y)<=.3,`${label} segment ${i+1}: leave space before x/c = 1 for the automatic closing segment and keep |y/c| ≤ 0.3.`);points.push(b);
 }
 const last=points.at(-1),closing={angle:deg(Math.atan2(-last.y,1-last.x)),length:Math.hypot(1-last.x,last.y)};points.push(point(1,0));return {points,closing};
}
export const surfaceSegments=points=>points.slice(0,-2).map((p,i)=>{const b=points[i+1];return {angle:deg(Math.atan2(b.y-p.y,b.x-p.x)),length:Math.hypot(b.x-p.x,b.y-p.y)};});
export function presetSegments(x){
 const camber=x.airfoilShape==='Diamond'?0:x.camber??0,t=x.thickness??.08,peak=x.peak??.5;
 return {upper:[{angle:deg(Math.atan2(camber+t/2,peak)),length:Math.hypot(peak,camber+t/2)}],lower:[{angle:deg(Math.atan2(camber-t/2,peak)),length:Math.hypot(peak,camber-t/2)}]};
}
const ordinate=(points,x)=>{let i=0;while(i<points.length-2&&points[i+1].x<x)i++;const a=points[i],b=points[i+1];return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);};
export function airfoilGeometry(x){
 requireValue(['Flat plate','Diamond','Asymmetric double wedge','Custom panels'].includes(x.airfoilShape),'Choose a supported sharp airfoil geometry.');
 let upper,lower;const angleMode=x.geometryInput==='Angles & lengths';
 if(x.airfoilShape==='Flat plate'){upper=[point(0,0),point(1,0)];lower=upper.map(p=>({...p}));}
 else if(angleMode){const max=x.airfoilShape==='Custom panels'?19:1;upper=segmentSurface(x.upperSegments,'Upper surface',max).points;lower=x.airfoilShape==='Diamond'?upper.map(p=>point(p.x,-p.y)):segmentSurface(x.lowerSegments,'Lower surface',max).points;}
 else if(x.airfoilShape==='Custom panels'){upper=coordinates(x.upperProfile,'Upper surface');lower=coordinates(x.lowerProfile,'Lower surface');}
 else{
  requireValue(finite(x.thickness,x.peak,x.camber)&&x.thickness>=0&&x.thickness<=.2&&x.peak>=.15&&x.peak<=.85&&Math.abs(x.camber)<=.08,'Require 0 ≤ t/c ≤ 0.2, 0.15 ≤ peak x/c ≤ 0.85 and |camber/c| ≤ 0.08.');
  const camber=x.airfoilShape==='Diamond'?0:x.camber;
  upper=[point(0,0),point(x.peak,camber+x.thickness/2),point(1,0)];lower=[point(0,0),point(x.peak,camber-x.thickness/2),point(1,0)];
 }
 const stations=[...new Set([...upper,...lower].map(p=>p.x))];requireValue(stations.every(z=>ordinate(upper,z)>=ordinate(lower,z)-1e-10),'Upper and lower surfaces must not cross.');
 const panels=[];for(const [side,points]of [['Upper',upper],['Lower',lower]])for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y;panels.push({id:`${side[0]}${i+1}`,side,index:i,a,b,dx,dy,slope:dy/dx,theta:Math.atan2(dy,dx),length:Math.hypot(dx,dy),automatic:angleMode&&i===points.length-2});
 }
 return {upper,lower,panels};
}
export function airfoilForces(panels,cps,alpha=0,linear=false){
 let Cx=0,Cy=0,CM=0;panels.forEach((p,i)=>{const sign=p.side==='Upper'?1:-1,fx=sign*cps[i]*p.dy,fy=-sign*cps[i]*p.dx;Cx+=fx;Cy+=fy;CM+=(linear?0:(p.a.y+p.b.y)/2*fx)-((p.a.x+p.b.x)/2-.25)*fy;});
 return {Cx,Cy,CL:linear?Cy:-Cx*Math.sin(alpha)+Cy*Math.cos(alpha),CD:linear?Cx+alpha*Cy:Cx*Math.cos(alpha)+Cy*Math.sin(alpha),CM};
}
export function solveAirfoil(x){
 const {M,alpha=0,gamma:g=1.4,R=287,T1=300,p1=101}=x;
 requireValue(finite(M,alpha,T1,p1)&&M>=1.1&&M<=20&&Math.abs(alpha)<=10&&T1>0&&p1>0,'Require 1.1 ≤ M ≤ 20, |α| ≤ 10°, and positive freestream temperature and pressure.');
 const geometry=airfoilGeometry(x),a=rad(alpha),B=Math.sqrt(M*M-1),freestream={...state(M,T1,p1*1000,g,R),theta:a},q=.5*g*freestream.p*M*M;
 const linearPanels=geometry.panels.map(p=>({...p,Cp:(p.side==='Upper'?1:-1)*2*(p.slope-a)/B}));
 const linear={status:'ok',panels:linearPanels,...airfoilForces(geometry.panels,linearPanels.map(p=>p.Cp),a,true),potential:[]};
 for(const side of ['Upper','Lower']){let value=0;for(const p of linearPanels.filter(p=>p.side===side)){const derivative=-p.Cp/2,start=value;value+=derivative*p.dx;linear.potential.push({id:p.id,side,x0:p.a.x,x1:p.b.x,phi0:start,phi1:value,derivative,intercept:start-derivative*p.a.x});}}
 let nonlinear={status:'ok',panels:[],waves:[]};
 try{
  for(const side of ['Upper','Lower']){
   let before=freestream;
   for(const p of geometry.panels.filter(p=>p.side===side)){
    requireValue(before.M>1+1e-9,`${p.id}: incoming surface flow is not supersonic; sequential shock–expansion cannot continue.`,'airfoil-subsonic');
    const turn=p.theta-before.theta,compression=(side==='Upper'?1:-1)*turn>0,angle=Math.abs(turn);let wave,ratios;
    if(angle<1e-12){wave='No wave';ratios={M2:before.M,T:1,p:1,rho:1,p0:1};}
    else if(compression){wave='Oblique shock';ratios=obliqueShock(before.M,angle,g,'weak');}
    else{wave='Expansion fan';ratios=expansion(before.M,angle,g);}
    const after={...state(ratios.M2,before.T*ratios.T,before.p*ratios.p,g,R),theta:p.theta};
    // Continue only in a wholly supersonic surface solution; no invented downstream model.
    requireValue(after.M>1+1e-9,`${p.id}: post-wave flow is subsonic; this airfoil surface model is outside its domain.`,'airfoil-subsonic');
    const Cp=(after.p-freestream.p)/q;
    nonlinear.panels.push({...p,...after,a:p.a,b:p.b,soundSpeed:after.a,Cp,wave});nonlinear.waves.push({id:p.id,side,origin:p.a,kind:wave,turn:deg(turn),beta:ratios.beta??null,before,after});before=after;
   }
  }
  Object.assign(nonlinear,airfoilForces(geometry.panels,nonlinear.panels.map(p=>p.Cp),a));
 }catch(e){if(!(e instanceof PhysicsError))throw e;nonlinear={status:'unsupported',reason:e.message,panels:[],waves:[]};}
 const method=x.airfoilMethod??'Compare both',models=method==='Linearized theory'?['linear']:method==='Shock–Expansion'?['nonlinear']:['linear','nonlinear'];
 const warnings=[];if(models.includes('linear')&&(Math.max(...geometry.panels.map(p=>Math.abs(p.theta-a)))>rad(6)||M<1.4))warnings.push('Small-disturbance approximation is strained; compare the methods carefully.');if(models.includes('nonlinear')&&nonlinear.status!=='ok')warnings.push('Shock–Expansion unavailable: '+nonlinear.reason);
 return {status:models.length===1&&models[0]==='nonlinear'&&nonlinear.status!=='ok'?'unsupported':'ok',geometry,linear,nonlinear,models,freestream,q,alpha:a,warning:warnings.join(' ')||null};
}
export function airfoilPlots(r){
 const plots=[],step=(panels,value)=>panels.flatMap(p=>Array.from({length:41},(_,i)=>[p.a.x+p.dx*i/40,value(p)]));
 const add=(key,label,ylabel,series)=>{if(series.length)plots.push({key,label,chart:{title:label,xlabel:'Chord position x/c',ylabel,zeroBaseline:false,series},note:''});};
 add('airfoil-Cp','Surface pressure coefficient','Cp',r.models.flatMap(model=>r[model].status==='ok'?['Upper','Lower'].map(side=>({name:`${model==='linear'?'Linearized':'Shock–Expansion'} · ${side.toLowerCase()}`,points:step(r[model].panels.filter(p=>p.side===side),p=>p.Cp)})):[]));
 if(r.models.includes('nonlinear')&&r.nonlinear.status==='ok')for(const [key,label,unit,value]of [['M','Surface Mach number','M',p=>p.M],['p','Static pressure','p (kPa)',p=>p.p/1000],['T','Static temperature','T (K)',p=>p.T],['rho','Density','ρ (kg/m³)',p=>p.rho],['u','Flow speed','u (m/s)',p=>p.u],['p0','Stagnation pressure','p₀ (kPa)',p=>p.p0/1000]])add('airfoil-'+key,label,unit,['Upper','Lower'].map(side=>({name:side,points:step(r.nonlinear.panels.filter(p=>p.side===side),value)})));
 if(r.models.includes('linear'))add('airfoil-potential','Surface perturbation potential · linearized','φ/(U∞c)',['Upper','Lower'].map(side=>({name:side,points:r.linear.potential.filter(p=>p.side===side).flatMap(p=>Array.from({length:41},(_,i)=>{const x=p.x0+(p.x1-p.x0)*i/40;return [x,p.derivative*x+p.intercept];}))})));
 if(r.models.includes('linear'))add('airfoil-total-potential','Total surface potential · first order','Φ/(U∞c)',['Upper','Lower'].map(side=>({name:side,points:r.linear.potential.filter(p=>p.side===side).flatMap(p=>Array.from({length:41},(_,i)=>{const x=p.x0+(p.x1-p.x0)*i/40;return [x,x+p.derivative*x+p.intercept];}))})));
 for(const p of plots)if(p.key.includes('potential'))p.chart.leftMargin=86;
 return plots;
}
