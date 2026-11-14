import {isentropic,areaMach,machFromArea,fannoRatios,normalShock,state} from './physics.js';
import {bisect,requireValue} from './numerics.js';
import {gasInfo} from './gas-properties.js';
export const fannoSystemMode='Nozzle + Fanno duct';
export const fannoConditions=['Vary back pressure','No shock (matched supersonic exit)','Shock at nozzle throat (limit)','Shock at nozzle exit','Shock at duct exit','Sonic at duct exit'];
export const fannoSolves=['Back pressure / shock state','Minimum supply pressure (sonic duct exit)','Friction length (shock at duct exit)'];
export const fannoUnknowns=['Back pressure','Reservoir pressure','Friction parameter','Shock location / flow regime'];
export function fannoSolveOptions(condition){return condition===fannoConditions[0]?[fannoUnknowns[3]]:condition===fannoConditions[5]?fannoUnknowns.slice(0,2):fannoUnknowns.slice(0,3);}
export const fannoSystemDefaults={fannoInterfaceVersion:1,fannoUnknown:'Back pressure',fannoCondition:'Shock at duct exit',fannoSystemSolve:fannoSolves[0],backRatio:.5,nozzleLength:1,nozzleContraction:3};
const root=(f,a,b)=>bisect(f,a,b,{ftol:1e-11,xtol:1e-12}).value;
const F=(M,g)=>Math.max(0,fannoRatios(M,g).F);
function machF(target,branch,g){
 if(target<1e-12)return 1;
 if(branch==='subsonic')return root(M=>F(M,g)-target,1e-8,1);
 let hi=2;while(F(hi,g)<target&&hi<1e5)hi*=2;
 return root(M=>F(M,g)-target,1,hi);
}
export function fannoCrossSection(x){
 const rectangular=x.ductSection==='Rectangular',w=x.ductWidth??.05,h=x.ductHeight??.05,d=x.hydraulicDiameter??.05;
 if(rectangular){requireValue(Number.isFinite(w)&&w>0&&Number.isFinite(h)&&h>0,'Duct width and height must be finite and positive.');return {area:w*h,diameter:2*w*h/(w+h)};}
 requireValue(Number.isFinite(d)&&d>0,'Duct diameter must be finite and positive.');return {area:Math.PI*d*d/4,diameter:d};
}
export function fannoGeometry(x){
 const {gamma:g,R}=gasInfo(x),A=x.systemAreaRatio??2,C=x.nozzleContraction??3,N=x.nozzleLength??1,D=x.ductLength??1,section=fannoCrossSection(x),area=section.area;
 requireValue(Number.isFinite(A)&&A>1&&A<=1000,'Nozzle exit / throat area must be greater than 1 and at most 1000.');
 requireValue(Number.isFinite(C)&&C>1&&C<=1000,'Nozzle inlet / throat area must be greater than 1 and at most 1000.');
 for(const [n,v]of [['Nozzle length',N],['Duct length',D],['Duct area',area],['Supply temperature',x.reservoirT0??400]])requireValue(Number.isFinite(v)&&v>0,n+' must be finite and positive.');
 let L=x.lambda??.2;
 if(x.frictionInput==='Length and friction factor'){
  const d=section.diameter,f=x.frictionFactor;requireValue(Number.isFinite(d)&&d>0&&Number.isFinite(f)&&f>=0,'Hydraulic diameter must be positive and friction factor nonnegative.');L=f*(x.frictionConvention==='Darcy'?1:4)*D/d;
 }
 requireValue(Number.isFinite(L)&&L>=0,'Friction length must be finite and nonnegative.');
 return {g,R,A,C,N,D,area,L,T0:x.reservoirT0??400};
}
function model(x,override={}){
 const z={...fannoGeometry(x),...override}, {g,R,A,T0,L}=z;
 const fromTotal=(M,P=1)=>{const i=isentropic(M,g);return state(M,T0/i.T0T,P/i.p0p,g,R);};
 const advance=(s,l)=>{
  if(l<=1e-13)return s;
  const available=F(s.M,g);requireValue(l<=available+2e-10,'Frictional choking occurs before the selected station.');
  const M=machF(Math.max(0,available-l),s.M<1?'subsonic':'supersonic',g),T=T0/isentropic(M,g).T0T;
  return state(M,T,s.p*s.M/M*Math.sqrt(T/s.T),g,R);
 };
 const jump=s=>{const n=normalShock(s.M,g);return state(n.M2,s.T*n.T,s.p*n.p,g,R);};
 const sup=fromTotal(machFromArea(A,'supersonic',g)),sub=fromTotal(machFromArea(A,'subsonic',g));
 const at=y=>{
  if(y<=1){
   const As=1+(A-1)*y*y,pre=fromTotal(machFromArea(As,'supersonic',g)),post=jump(pre),astar=As/areaMach(post.M,g);
   const inlet=fromTotal(machFromArea(Math.max(1,A/astar),'subsonic',g),post.p0),margin=F(inlet.M,g)-L;
   if(margin< -2e-10)return {valid:false,margin};
   return {valid:true,margin,y,pre,post,inlet,outlet:advance(inlet,L),astar,shockPart:y===0?'throat-limit':'nozzle'};
  }
  const t=y-1,available=F(sup.M,g)-L*t;
  if(available< -2e-10)return {valid:false,margin:available};
  const pre=advance(sup,L*t),post=jump(pre),margin=F(post.M,g)-L*(1-t);
  if(margin< -2e-10)return {valid:false,margin};
  return {valid:true,margin,y,pre,post,inlet:sup,outlet:advance(post,L*(1-t)),astar:1,shockPart:'duct'};
 };
 const subAt=alpha=>{
  if(alpha===0){const s=fromTotal(0);return {inlet:s,outlet:s,alpha};}
  const inlet=fromTotal(machFromArea(Math.max(1,A/alpha),'subsonic',g));return {inlet,outlet:advance(inlet,L),alpha};
 };
 return {...z,fromTotal,advance,jump,sup,sub,at,subAt};
}
function bounds(m){
 const long=m.L>F(m.sub.M,m.g)+1e-10;
 if(long){const Mi=machF(m.L,'subsonic',m.g),alpha=m.A/areaMach(Mi,m.g),z=m.subAt(alpha);return {long,alpha,onset:z.outlet.p,low:z.outlet.p,ymax:null,critical:z,noShock:null,nozzleExit:null,ductExit:null};}
 let ymax=2;
 if(!m.at(2).valid){let lo=0,hi=2;for(let i=0;i<65;i++){const mid=(lo+hi)/2;if(m.at(mid).valid)lo=mid;else hi=mid;}ymax=lo;}
 const critical=m.at(ymax),throat=m.at(0),nozzleExit=m.at(1),ductExit=ymax===2?m.at(2):null;
 const noShock=m.L<=F(m.sup.M,m.g)+1e-10?{inlet:m.sup,outlet:m.advance(m.sup,m.L)}:null;
 return {long:false,alpha:1,onset:throat.outlet.p,low:critical.outlet.p,ymax,critical,throat,noShock,nozzleExit:nozzleExit.valid?nozzleExit:null,ductExit};
}
export function fannoPressurePlan(x){
 if((x.fannoSystemSolve??fannoSolves[0])!==fannoSolves[0])return {enabled:false,min:.001,max:1,milestones:[],message:'Select Back pressure under Solve for to vary pressure at fixed geometry and friction.'};
 const m=model(x),b=bounds(m),marks=[];
 // The demo follows only changes resolved inside the nozzle/duct. For the usual
 // shock branch, stop at the duct-exit/choking bound and the sonic-throat limit.
 const min=b.low,max=b.long?1:b.onset,enabled=max-min>1e-10;
 const add=(pressure,label)=>{if(Number.isFinite(pressure)&&pressure>=min-1e-10&&pressure<=max+1e-10)marks.push({pressure:Math.max(min,Math.min(max,pressure)),label});};
 if(b.ductExit)add(b.ductExit.outlet.p,'Shock at duct exit');
 if(b.nozzleExit)add(b.nozzleExit.outlet.p,'Shock at nozzle exit');
 if(!b.long)add(b.onset,'Sonic throat · zero shock strength');
 else {add(b.onset,'Friction-choked duct · subsonic nozzle');add(1,'No flow');}
 if(b.ymax!==null&&b.ymax<2)add(b.low,'Friction-choked duct exit');
 marks.sort((a,b)=>a.pressure-b.pressure);
 return {enabled,min,max,milestones:marks,message:!enabled?'No finite internal-shock pressure interval for this friction length. Reduce duct friction to move the shock.':b.long?'Subsonic internal-flow branch, from sonic duct exit to no flow. External pressure adjustment is excluded.':'Internal-shock range only: duct exit / choking limit to sonic throat. External pressure adjustment and the fully subsonic branch are excluded.',limits:{throat:b.long?null:b.onset,nozzleExit:b.nozzleExit?.outlet.p??null,ductExit:b.ductExit?.outlet.p??null,noShock:b.noShock?.outlet.p??null,sonicExit:b.low}};
}
export function migrateFannoInputs(raw){
 const x={...raw},old=x.ductProblem;
 if(!old||old==='Single duct')return x;
 if(old!==fannoSystemMode){
  Object.assign(x,{ductProblem:fannoSystemMode,fannoSystemSolve:fannoSolves[0],fannoCondition:fannoConditions[0],fannoInterfaceVersion:1});
  if(old==='CD nozzle minimum supply pressure')x.fannoSystemSolve=fannoSolves[1];
  else if(old==='CD nozzle + exit shock: friction')x.fannoSystemSolve=fannoSolves[2];
  else if(old==='CD nozzle + prescribed shock')x.fannoCondition={'Nozzle throat (limit)':fannoConditions[2],'Nozzle exit':fannoConditions[3],'Duct exit':fannoConditions[4]}[x.shockCase]??fannoConditions[4];
  else if(old==='Duct shock location')x.systemAreaRatio=areaMach(x.M1??2,x.gamma??1.4);
  if(x.fannoCondition===fannoConditions[0])x.backRatio=(x.backPressure??100)/(x.reservoirP0??500);
 }
 // Migrate the former Known data choices once; subsequent condition edits are authoritative.
 if(x.fannoInterfaceVersion!==2){
  if(x.fannoSystemSolve===fannoSolves[1])Object.assign(x,{fannoCondition:fannoConditions[5],fannoUnknown:fannoUnknowns[1]});
  else if(x.fannoSystemSolve===fannoSolves[2])Object.assign(x,{fannoCondition:fannoConditions[4],fannoUnknown:fannoUnknowns[2]});
  else x.fannoUnknown=fannoUnknowns[0];
  x.fannoInterfaceVersion=2;
 }
 const options=fannoSolveOptions(x.fannoCondition);
 if(!options.includes(x.fannoUnknown))x.fannoUnknown=options[0];
 x.fannoSystemSolve=x.fannoUnknown===fannoUnknowns[1]?fannoSolves[1]:x.fannoUnknown===fannoUnknowns[2]?fannoSolves[2]:fannoSolves[0];
 return x;
}
export function fannoSystemFields(raw){
 const x=migrateFannoInputs(raw);
 const solve=x.fannoSystemSolve??fannoSolves[0],condition=x.fannoCondition??fannoConditions[4];
 const ranges={reservoirP0:[1,1500],reservoirT0:[100,2000],systemAreaRatio:[1.01,10],nozzleContraction:[1.01,10],nozzleLength:[.1,10],ductLength:[.01,10],ductWidth:[.001,.5],ductHeight:[.001,.5],lambda:[0,1.5],hydraulicDiameter:[.001,.5],frictionFactor:[0,.05],backPressure:[1,1500]};
 const n=(key,label,value,min,max,unit='',step=.01)=>({key,label,value,min,max,unit,step,...(ranges[key]?{sliderMin:ranges[key][0],sliderMax:ranges[key][1]}:{})}),select=(key,label,value,options)=>({key,label,value,options});
 const fields=[select('ductProblem','Problem type',fannoSystemMode,['Single duct',fannoSystemMode]),select('fannoCondition','Operating condition',fannoConditions[4],fannoConditions)];
 fields.push(select('fannoUnknown','Solve for',fannoUnknowns[0],fannoSolveOptions(condition)));
 if(solve!==fannoSolves[1])fields.push(n('reservoirP0','Reservoir pressure',500,.00001,1e9,'kPa'));
 fields.push(n('reservoirT0','Reservoir temperature',400,1,1e5,'K'),n('systemAreaRatio','Nozzle exit / throat area',2,1.000001,1000,'Aₑ/Aₜ'),n('nozzleContraction','Nozzle inlet / throat area',3,1.000001,1000,'Aᵢ/Aₜ'),n('nozzleLength','Nozzle length',1,.000001,1e6,'m'));
 if(x.fannoUnknown!==fannoUnknowns[2]&&condition!==fannoConditions[5]){
  fields.push(select('frictionInput','Friction input','Dimensionless',['Dimensionless','Length and friction factor']));
  if(x.frictionInput==='Length and friction factor')fields.push(select('ductSection','Cross section','Circular',['Circular','Rectangular']),...(x.ductSection==='Rectangular'?[n('ductWidth','Width',.05,.000001,1000,'m'),n('ductHeight','Height',.05,.000001,1000,'m')]:[n('hydraulicDiameter','Diameter',.05,.000001,1000,'m')]),n('ductLength','Duct length',1,.000001,1e6,'m'),n('frictionFactor','Friction factor',.005,0,1),select('frictionConvention','Friction convention','Fanning',['Fanning','Darcy']));
  else fields.push(n('lambda','Friction length fᴅL/D',.2,0,10));
 }
 if(condition===fannoConditions[0])fields.push(n('backRatio','Back / reservoir pressure',.5,.000001,1,'pᵦ/p₀',.001));
 else if(x.fannoUnknown!==fannoUnknowns[0])fields.push(n('backPressure',condition===fannoConditions[5]?'Sonic duct exit pressure':'Duct exit / back pressure',100,.00001,1e9,'kPa'));
 return fields.map(f=>['nozzleLength','nozzleContraction'].includes(f.key)?{...f,geometrySetting:true}:f);
}
function fixedCondition(m,condition){
 if(condition===fannoConditions[1])return {valid:m.L<=F(m.sup.M,m.g)+1e-10,outlet:m.L<=F(m.sup.M,m.g)+1e-10?m.advance(m.sup,m.L):null};
 if(condition===fannoConditions[2])return m.at(0);
 if(condition===fannoConditions[3])return m.at(1);
 if(condition===fannoConditions[4])return m.at(2);
 throw Error('Choose a fixed operating condition for this inverse calculation.');
}
function solveFannoInverse(x){
 requireValue(Number.isFinite(x.backPressure)&&x.backPressure>0,'Duct exit / back pressure must be finite and positive.');
 const targetPressure=x.backPressure;
 const forward={...x,fannoUnknown:fannoUnknowns[0],fannoSystemSolve:fannoSolves[0]};
 let d;
 if(x.fannoUnknown===fannoUnknowns[1]){
  const reference=solveFannoSystem({...forward,reservoirP0:1});
  const P=targetPressure/reference.result.backRatio;
  d=solveFannoSystem({...forward,reservoirP0:P});
 }else{
  requireValue(Number.isFinite(x.reservoirP0)&&x.reservoirP0>0,'Reservoir pressure must be finite and positive.');
  const clean={...forward,lambda:0,frictionInput:'Dimensionless'},m0=model(clean),condition=x.fannoCondition;
  const entry=condition===fannoConditions[2]?m0.sub:condition===fannoConditions[3]?m0.jump(m0.sup):m0.sup;
  const limit=F(entry.M,m0.g),target=targetPressure/x.reservoirP0;
  const pressure=L=>{const z=fixedCondition(model(clean,{L}),condition);requireValue(z.valid,'The selected shock topology cannot reach this friction parameter.');return z.outlet.p;};
  const low=pressure(0),high=pressure(limit),min=Math.min(low,high),max=Math.max(low,high);
  requireValue(target>=min-1e-10&&target<=max+1e-10,`For this operating condition, back pressure must lie between ${(min*x.reservoirP0).toPrecision(6)} and ${(max*x.reservoirP0).toPrecision(6)} kPa. The friction parameter must lie between 0 and ${limit.toPrecision(6)}.`);
  const L=root(l=>pressure(l)-Math.max(min,Math.min(max,target)),0,limit);
  d=solveFannoSystem({...clean,lambda:L});
 }
 d.inputs={...x,reservoirP0:d.result.supplyPressure/1000,lambda:d.result.lambda};
 d.result.solvedFor=x.fannoUnknown;
 return d;
}
export function solveFannoSystem(raw){
 const merged={...fannoSystemDefaults,...raw},x=merged.fannoInterfaceVersion===2?migrateFannoInputs(merged):merged,solve=x.fannoSystemSolve,condition=x.fannoCondition;
 if(x.fannoInterfaceVersion===2&&[fannoUnknowns[1],fannoUnknowns[2]].includes(x.fannoUnknown))return solveFannoInverse(x);
 let m=model(x),P=x.reservoirP0??500,chosen,regime,notice='',ratio,calculated={};
 requireValue(fannoSolves.includes(solve),'Select the known data for the nozzle–duct system.');
 if(solve===fannoSolves[1]||condition===fannoConditions[5]){
  const L=F(m.sup.M,m.g);m=model(x,{L});const z=m.advance(m.sup,L);
  if(solve===fannoSolves[1]){requireValue(Number.isFinite(x.backPressure)&&x.backPressure>0,'Duct exit pressure must be positive.');P=x.backPressure/z.p;calculated={minimumSupplyPressure:P,lambda:L};}
  else {requireValue(Number.isFinite(P)&&P>0,'Reservoir pressure must be finite and positive.');calculated={lambda:L};}
  ratio=z.p;chosen={inlet:m.sup,outlet:z,noShock:true};regime=x.fannoInterfaceVersion===2?'Sonic at duct exit · no shock':'Minimum supply · sonic duct exit';
 }else{
  requireValue(Number.isFinite(P)&&P>0,'Reservoir pressure must be finite and positive.');
  if(solve===fannoSolves[2]){
   requireValue(Number.isFinite(x.backPressure)&&x.backPressure>0,'Back pressure must be positive.');
   ratio=x.backPressure/P;const max=F(m.sup.M,m.g),fn=L=>model(x,{L}).at(2).outlet.p;
   const a=fn(0),b=fn(max);requireValue(ratio>=Math.min(a,b)-1e-10&&ratio<=Math.max(a,b)+1e-10,`Exit-shock pressure must lie between ${(Math.min(a,b)*P).toPrecision(6)} and ${(Math.max(a,b)*P).toPrecision(6)} kPa for this nozzle and supply.`);
   const L=root(l=>fn(l)-ratio,0,max);m=model(x,{L});chosen=m.at(2);regime='Normal shock at duct exit';calculated={lambda:L};
  }else{
   requireValue(fannoConditions.includes(condition),'Select a valid operating condition.');
   const b=bounds(m);
   if(condition===fannoConditions[1]){requireValue(!!b.noShock,'This duct is too long for shock-free supersonic flow. Reduce friction length.');chosen={...b.noShock,noShock:true};ratio=chosen.outlet.p;regime='No shock · matched supersonic exit';}
   else if(condition!==fannoConditions[0]){
    const z=condition===fannoConditions[2]?b.throat:condition===fannoConditions[3]?b.nozzleExit:b.ductExit;
    requireValue(!!z,'This shock station is not reachable for the specified nozzle and friction length. Use Vary back pressure to see the admissible regimes.');chosen=z;ratio=z.outlet.p;regime=condition===fannoConditions[2]?'Sonic throat limit · zero shock strength':condition===fannoConditions[3]?'Normal shock at nozzle exit':'Normal shock at duct exit';
   }else{
    ratio=x.backRatio;requireValue(Number.isFinite(ratio)&&ratio>0&&ratio<=1,'Require 0 < back / reservoir pressure ≤ 1.');
    if(ratio>=1-1e-13){chosen=m.subAt(0);ratio=1;regime='No flow';}
    else if(ratio>b.onset+1e-10){const alpha=root(alpha=>m.subAt(alpha).outlet.p-ratio,1e-6,b.alpha);chosen=m.subAt(alpha);regime='Unchoked · subsonic nozzle and duct';}
    else if(b.long){chosen=b.critical;regime='Friction-choked duct · subsonic nozzle';notice='Duct exit is sonic. Further reduction of back pressure changes only the external adjustment, which is not resolved.';}
    else if(ratio<b.low-1e-10){
     if(b.noShock){chosen={...b.noShock,noShock:true};regime='No internal shock · supersonic duct';notice=Math.abs(ratio-chosen.outlet.p)<1e-9?'':'Exit pressure differs from back pressure; external pressure adjustment is not resolved.';}
     else{chosen=b.critical;regime='Internal shock · friction-choked duct exit';notice='Duct exit is sonic. Shock position is fixed at the choking limit; external adjustment is not resolved.';}
    }else{
     const target=Math.max(b.low,Math.min(b.onset,ratio)),y=root(y=>m.at(y).outlet.p-target,0,b.ymax);chosen=m.at(y);
     regime=y<1e-7?'Sonic throat limit · zero shock strength':Math.abs(y-1)<1e-7?'Normal shock at nozzle exit':Math.abs(y-2)<1e-7?'Normal shock at duct exit':y<1?'Normal shock inside nozzle':'Normal shock inside duct';
    }
   }
  }
 }
 const b=bounds(m),{g,R,A,C,N,D,area,T0,L}=m,total=N+D,xt=.35*N;
 const scale=z=>state(z.M,z.T,z.p*P*1000,g,R),inlet=scale(chosen.inlet),outlet=scale(chosen.outlet),reservoir=state(0,T0,P*1000,g,R),shockY=chosen.y;
 const finiteShock=shockY!==undefined&&shockY>1e-8&&chosen.pre.M>1+1e-7;
 const shockX=finiteShock?(shockY<=1?xt+(N-xt)*shockY:N+D*(shockY-1)):null;
 const alpha=chosen.alpha??1,postAstar=chosen.astar??1;
 const nozzleArea=t=>t<=xt?1+(C-1)*((xt-t)/xt)**2:1+(A-1)*((t-xt)/(N-xt))**2;
 const nozzleState=t=>{
  const ar=nozzleArea(t);if(alpha===0)return reservoir;
  const after=finiteShock&&shockY<=1&&t>shockX;
  const M=machFromArea(Math.max(1,ar/(after?postAstar:alpha)),t<xt||after||chosen.alpha!==undefined||shockY===0?'subsonic':'supersonic',g);
  return scale(m.fromTotal(M,after?chosen.post.p0:1));
 };
 const nozzlePoints=[];
 for(let i=0;i<=100;i++){const t=N*i/100;if(shockX!==null&&shockX<N&&Math.abs(t-shockX)<1e-9)continue;nozzlePoints.push({x:t/total,position:t,area:nozzleArea(t)/A*area,state:nozzleState(t),part:'nozzle'});}
 // Preserve the exact throat and both one-sided shock states in charts/contours.
 const addNozzle=(t,s)=>nozzlePoints.push({x:t/total,position:t,area:nozzleArea(t)/A*area,state:s,part:'nozzle'});
 nozzlePoints.splice(0,nozzlePoints.length,...nozzlePoints.filter(z=>Math.abs(z.position-xt)>1e-9));addNozzle(xt,nozzleState(xt));
 if(finiteShock&&shockY<=1){addNozzle(shockX,scale(chosen.pre));addNozzle(shockX,scale(chosen.post));}
 nozzlePoints.sort((a,b)=>a.position-b.position);
 const ductPoints=[];
 const atDuct=t=>{
  if(chosen.alpha===0)return reservoir;
  if(finiteShock&&shockY>1&&t>shockY-1)return scale(m.advance(chosen.post,L*(t-(shockY-1))));
  return scale(m.advance(chosen.inlet,L*t));
 };
 for(let i=0;i<=100;i++){const t=i/100;if(finiteShock&&shockY>1&&Math.abs(t-(shockY-1))<1e-9)continue;ductPoints.push({x:t,position:N+D*t,area,state:atDuct(t),part:'duct'});}
 if(finiteShock&&shockY>1){const t=shockY-1;for(const s of [chosen.pre,chosen.post])ductPoints.push({x:t,position:shockX,area,state:scale(s),part:'duct'});}
 ductPoints.sort((a,b)=>a.x-b.x);
 // At an exit shock, the nozzle endpoint must contain only the two exact jump states.
 if(finiteShock&&Math.abs(shockY-1)<1e-8){for(let i=nozzlePoints.length-1;i>=0;i--)if(Math.abs(nozzlePoints[i].position-N)<1e-9)nozzlePoints.splice(i,1);addNozzle(N,scale(chosen.pre));addNozzle(N,scale(chosen.post));}
 const fullProfile=[...nozzlePoints,...ductPoints.filter(z=>z.x>1e-10).map(z=>({...z,x:z.position/total}))];
 const stations=[{name:'Reservoir',state:reservoir,x:-.2},{name:'Nozzle inlet',state:nozzlePoints[0].state,x:0},{name:'Throat',state:nozzleState(xt),x:xt/total}];
 if(finiteShock){stations.push({name:'Before shock',state:scale(chosen.pre),x:shockX/total},{name:'After shock',state:scale(chosen.post),x:shockX/total});}
 stations.push({name:'Duct inlet',state:inlet,x:N/total},{name:'Duct outlet',state:outlet,x:1});stations.sort((a,b)=>a.x-b.x);
 const properties=[['Mach number','',s=>s.M],['Static pressure','kPa',s=>s.p/1000],['Static temperature','K',s=>s.T],['Density','kg/m³',s=>s.rho],['Flow speed','m/s',s=>s.u],['Stagnation pressure','kPa',s=>s.p0/1000],['Stagnation temperature','K',s=>s.T0]];
 const plots=properties.map(([label,unit,get])=>({key:'fanno-full-'+label,label:label+' along nozzle + duct',note:'Isentropic nozzle; adiabatic constant-area Fanno duct. Normal-shock jumps are retained.',chart:{title:label+' along nozzle and duct',xlabel:'Position x (m)',ylabel:label+(unit?' ('+unit+')':''),zeroBaseline:false,markers:[{name:'Throat',x:xt,y:get(nozzleState(xt))},{name:'Duct inlet',x:N,y:get(inlet)},{name:'Duct outlet',x:total,y:get(outlet),anchor:'end'}],series:[{name:label,points:fullProfile.map(z=>[z.position,get(z.state)])}]}}));
 const thresholds={throat:b.long?null:b.onset,nozzleExit:b.nozzleExit?.outlet.p??null,ductExit:b.ductExit?.outlet.p??null,noShock:b.noShock?.outlet.p??null,sonicExit:b.low};
 const rows=[],row=(label,value,unit='')=>rows.push({label,value,unit});
 row('Back pressure',ratio*P,'kPa');row('Back / reservoir pressure',ratio,'pᵦ/p₀');row('Reservoir pressure',P,'kPa');row(condition===fannoConditions[5]?'Limiting friction parameter':'Friction length',L,'fᴅL/D');row('Mass flow rate',inlet.rho*inlet.u*area,'kg/s');row('Duct exit pressure',outlet.p/1000,'kPa');row('System total-pressure recovery',outlet.p0/reservoir.p0,'p₀,out/p₀,res');
 if(shockX!==null){row('Shock position from nozzle inlet',shockX,'m');row('Upstream shock Mach',chosen.pre.M);row('Downstream shock Mach',chosen.post.M);row('Shock total-pressure recovery',chosen.post.p0/chosen.pre.p0,'p₀,after/p₀,before');if(shockY>1)row('Shock position in duct',shockY-1,'xₛ/Lduct');else row('Shock area / throat area',nozzleArea(shockX),'Aₛ/Aₜ');}
 if(calculated.minimumSupplyPressure)row(x.fannoInterfaceVersion===2?'Required reservoir pressure':'Minimum reservoir pressure',P,'kPa');
 for(const [key,label]of [['throat','Throat limit back pressure'],['nozzleExit','Nozzle-exit shock back pressure'],['ductExit','Duct-exit shock back pressure'],['noShock','Matched no-shock back pressure']])if(thresholds[key]!==null)row(label,thresholds[key]*P,'kPa');
 const massFlow=inlet.rho*inlet.u*area,massResidual=Math.max(...fullProfile.map(z=>Math.abs(z.state.rho*z.state.u*z.area-massFlow)/Math.max(1e-12,massFlow))),energyResidual=Math.max(...fullProfile.map(z=>Math.abs(z.state.T0-T0)/T0));
 const result={fullSystem:true,ductSystem:true,regime,status:Math.abs(outlet.M-1)<1e-7?'sonic-limit':'ok',s1:inlet,s2:outlet,reservoir,stations,points:fullProfile,fullProfile,longitudinal:ductPoints,nozzlePoints,plots,shockAt:finiteShock&&shockY>1?shockY-1:null,shockX,shockY:finiteShock?shockY:null,shockPart:finiteShock?chosen.shockPart:null,throatLimit:shockY===0||shockY!==undefined&&shockY<1e-7,backRatio:ratio,backPressure:ratio*P*1000,supplyPressure:P*1000,lambda:L,thresholds,geometry:{nozzleLength:N,ductLength:D,throat:xt,ductStart:N,totalLength:total,area,areaRatio:A,contraction:C},massFlow,referenceTable:{title:'System station properties',columns:stations.map(z=>z.name),rows:properties.map(([label,unit,get])=>({label:label+(unit?' ('+unit+')':''),values:stations.map(z=>get(z.state))})),note:'The reservoir is at rest. The nozzle is isentropic except at a normal shock; friction acts only in the duct.'}};
 return {id:'fanno',inputs:x,gas:gasInfo(x),model:'Reservoir + isentropic C–D nozzle + Fanno duct',result,rows,scene:{kind:'fannoSystem',process:'fanno',system:result},chart:plots[1].chart,checks:{mass:massResidual,energy:energyResidual},notice,version:'0.3.0'};
}
