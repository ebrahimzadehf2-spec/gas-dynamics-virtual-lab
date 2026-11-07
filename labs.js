import {gasInputFields,gasInfo} from './gas-properties.js?v=20261107-output-layout';
import {controlVolume,controlVolumePreset} from './control-volume.js?v=20261107-gases';
import {externalJet} from './jet.js?v=20261107-shock-states';
import * as p from './physics.js?v=20261107-isentropic';
import {cone} from './cone.js';
const input=(key,label,value,min,max,step=1,unit='')=>({key,label,value,min,max,step,unit});
const g=input('gamma','Specific heat ratio',1.4,1.1,1.67,.01,'γ');
const M=(key='M1',value=2)=>input(key,'Inlet Mach number',value,.1,8,.01,'M');
const T=input('T1','Inlet temperature',300,100,1500,1,'K');
const P=input('p1','Inlet pressure',101,1,1000,1,'kPa');
const row=(label,value,unit='')=>({label,value,unit});
function shockStateSection({kind,title,location,before,after,gamma,R,extra=[]}){
 const upstream=p.state(before.M,before.T,before.P??before.p,gamma,R);
 const downstream=p.state(after.M,after.T,after.P??after.p,gamma,R);
 const ratio=(a,b)=>b/a;
 const rows=[
  {label:'Mach number M',before:upstream.M,after:downstream.M,ratio:ratio(upstream.M,downstream.M),unit:''},
  {label:'Static pressure p',before:upstream.p/1000,after:downstream.p/1000,ratio:ratio(upstream.p,downstream.p),unit:'kPa'},
  {label:'Static temperature T',before:upstream.T,after:downstream.T,ratio:ratio(upstream.T,downstream.T),unit:'K'},
  {label:'Density ρ',before:upstream.rho,after:downstream.rho,ratio:ratio(upstream.rho,downstream.rho),unit:'kg/m³'},
  {label:'Flow speed u',before:upstream.u,after:downstream.u,ratio:ratio(upstream.u,downstream.u),unit:'m/s'},
  {label:'Stagnation pressure p₀',before:upstream.p0/1000,after:downstream.p0/1000,ratio:ratio(upstream.p0,downstream.p0),unit:'kPa'},
  {label:'Stagnation temperature T₀',before:upstream.T0,after:downstream.T0,ratio:ratio(upstream.T0,downstream.T0),unit:'K'}
 ];
 if(Number.isFinite(before.massFlow)&&Number.isFinite(after.massFlow))rows.push({label:'Mass flow rate ṁ',before:before.massFlow,after:after.massFlow,ratio:ratio(before.massFlow,after.massFlow),unit:'kg/s'});
 const ds=R*(gamma/(gamma-1)*Math.log(downstream.T/upstream.T)-Math.log(downstream.p/upstream.p));
 return {kind,title,location,rows,extra:[...extra,{label:'Entropy rise Δs',value:ds,unit:'J/(kg·K)'}]};
}
export const chapters=[
 [1,'Isentropic flow relations','Thermodynamics & stagnation properties',['foundations']],
 [2,'Conservation','Control-volume balances',['balances']],
 [3,'Normal shocks','Sound, compression & entropy',['normal']],
 [4,'Rayleigh flow','Heat transfer & thermal choking',['rayleigh']],
 [5,'Fanno flow','Friction & sonic length',['fanno']],
 [6,'Waves & turning','Oblique shocks, expansion & interaction',['oblique','expansion','collision']],
 [7,'Unsteady waves','Shock-tube wave system',['tube']],
 [8,'Nozzle flow','Quasi-1D regimes & shock position',['nozzle']],
 [9,'Linearized flow','Thin-airfoil pressure & forces',['linear']],
 [10,'Conical flow','Taylor–Maccoll similarity solution',['cone']]
];
export const labs={
 foundations:{chapter:1,title:'Isentropic flow relations',tag:'ISENTROPIC RELATIONS',description:'Inspect static, stagnation and sonic-reference ratios, area ratio, Mach angle and Prandtl–Meyer angle for a calorically perfect gas.',inputs:[M('M',2),T,P,g],model:'Calorically perfect ideal gas · local isentropic deceleration to rest',equation:'T₀/T = 1 + (γ − 1)M²/2',limitations:'This relation defines stagnation properties. It does not assert that an entire flow field is isentropic.'},
 balances:{chapter:2,title:'Control-volume balance lab',tag:'MASS · MOMENTUM · ENERGY',description:'Change a proposed outlet state and inspect the mass, force and energy balances. Solve outlet speed from continuity or load a consistent example.',inputs:[
 {key:'balanceMode',label:'Experiment mode',value:'Check proposed outlet',options:['Check proposed outlet','Solve outlet speed']},
 {...M('M1',.3),section:'Inlet state'},T,{...P,value:200},input('A1','Inlet area',10,.1,100, .1,'cm²'),
 {...M('M2',.7),label:'Proposed outlet Mach',section:'Outlet state'},input('T2','Outlet temperature',280,50,3000,1,'K'),input('p2','Outlet pressure',150,.1,3000,1,'kPa'),input('A2','Outlet area',5,.1,100,.1,'cm²'),
 {...input('Qdot','Heat into fluid',0,-100,100,.1,'kW'),section:'Heat, work and force'},input('Wdot','Shaft work out',0,-100,100,.1,'kW'),input('Fx','Wall / support force on fluid',0,-2000,2000,1,'N'),g,input('R','Gas constant',287,100,2200,1,'J/(kg·K)')
 ],model:'Steady one-inlet / one-outlet control volume · ideal gas · uniform sections',equation:'ṁ = ρuA · p₁A₁ − p₂A₂ + Fₓ = ṁ₂u₂ − ṁ₁u₁ · Q̇ − Ẇ + ṁ₁h₀₁ − ṁ₂h₀₂ = 0',limitations:'Both velocities point in +x. Fₓ is the net non-port axial force on the fluid, including wall / support effects; force on the hardware is its opposite. Port pressures are absolute. Heat into the fluid and shaft work out are positive. Potential energy is neglected. Endpoint colors show prescribed states, not a solved interior field. Passing balances is necessary but does not establish an internal flow solution. An entropy-decrease check applies to adiabatic, mass-balanced cases.'},
 normal:{chapter:3,title:'Normal shock wave',tag:'RANKINE–HUGONIOT',description:'Resolve the jump in pressure, temperature, density and Mach number across a compression shock.',inputs:[M(),T,P,g],model:'Stationary normal shock · calorically perfect gas',equation:'M₂² = [1 + (γ − 1)M₁²/2] / [γM₁² − (γ − 1)/2]',limitations:'Shock thickness is schematic. Molecular structure, viscosity and real-gas effects are not resolved.'},
 rayleigh:{chapter:4,title:'Rayleigh heat-transfer lab',tag:'THERMAL CHOKING',description:'Add or remove heat, follow the correct Mach branch, and locate the sonic heat limit.',inputs:[M('M1',.5),T,P,input('q','Specific heat added',100,-100,1000,1,'kJ/kg'),g],model:'Steady, constant-area, frictionless flow · fixed inlet · q positive for heating',equation:'T₀₂ = T₀₁ + q/cₚ   ·   qmax = cₚ(T₀* − T₀₁)',limitations:'The numerical reference is authoritative. Neural-network predictions are not enabled. A sonic inlet under cooling requires an explicit branch; use a slightly subsonic/supersonic inlet here.'},
 fanno:{chapter:5,title:'Fanno friction lab',tag:'FRICTIONAL CHOKING',description:'Explore how wall friction drives either Mach branch toward the sonic state.',inputs:[M('M1',.5),T,P,input('lambda','Friction length fᴅ L / D',.2,0,3,.01,''),g],model:'Steady, adiabatic, constant-area flow · Darcy friction convention',equation:'F(M₂) = F(M₁) − fᴅL/D   ·   fᴅ = 4fꜰ',limitations:'Momentum flux decreases through wall shear. Constant gas properties and an imposed total friction parameter are assumed.'},
 oblique:{chapter:6,title:'Oblique shock wave',tag:'COMPRESSION CORNER',description:'Change the wedge angle and watch the shock geometry and post-shock state respond.',inputs:[M('M1',3),input('theta','Wedge deflection',15,0,40,.1,'°'),g,{key:'branch',label:'Shock branch',value:'weak',options:['weak','strong']}],model:'Attached, two-dimensional oblique shock · uniform downstream region',equation:'tan θ = 2 cot β (M₁² sin²β − 1) / [M₁²(γ + cos 2β) + 2]',limitations:'The attached-shock limit is checked. Detached-shock geometry is not approximated by a normal line.'},
 expansion:{chapter:6,title:'Prandtl–Meyer expansion',tag:'CENTERED EXPANSION FAN',description:'Turn a supersonic flow away from a wall through an isentropic expansion fan.',inputs:[M('M1',2),input('theta','Expansion deflection',15,0,60,.1,'°'),g],model:'Steady, isentropic, centered expansion · calorically perfect gas',equation:'ν(M₂) = ν(M₁) + |θ|   ·   p₀₂ = p₀₁',limitations:'The infinite-Mach expansion limit is enforced. Displayed rays sample the continuous analytical fan.'},
 collision:{chapter:6,title:'Unequal shock interaction',tag:'SLIP-LINE COMPATIBILITY',description:'Find two outgoing attached shocks with equal pressure and a common flow direction.',inputs:[M('M1',4),input('thetaUpper','Upper incident turn',10,.1,30,.1,'°'),input('thetaLower','Lower incident turn',20,.1,30,.1,'°'),g],model:'Two incident weak shocks · two outgoing weak compression shocks',equation:'p₄ = p₅   ·   δ₄ = δ₅',limitations:'δ is positive upward; incoming directions are +upper turn and −lower turn. Only two outgoing attached compression shocks are solved.'},
 tube:{chapter:7,title:'Shock tube',tag:'MOVING-WAVE SYSTEM',description:'Rupture an ideal diaphragm and explore the incident shock, contact surface and expansion fan.',inputs:[input('p1','Driven pressure',5,.1,200,1,'kPa'),input('p4','Driver pressure',200,1,2000,1,'kPa'),input('T1','Driven temperature',298.15,100,1500,1,'K'),input('T4','Driver temperature',293.15,100,1500,1,'K'),g],model:'Selected ideal gas on both sides · initially at rest · before any end-wall reflection',equation:'p₂ = p₃   ·   u₂ = u₃',limitations:'Time animation shows the infinite-tube similarity solution. End walls and reflected waves are not included. The selected gas applies to both sides; different driver and driven gases are outside this interface.'},
 nozzle:{chapter:8,title:'Nozzle flow laboratory',tag:'QUASI-1D FLOW',description:'Choose a converging, diverging or converging–diverging passage and inspect its flow regime.',inputs:[
  {key:'nozzleView',label:'Nozzle view',value:'Internal flow',options:['Nozzle + external waves','Internal flow','External waves']},
  {key:'nozzleType',label:'Nozzle geometry',value:'Converging–diverging',options:['Converging–diverging','Converging','Diverging']},
  input('areaRatio','Exit-to-throat area',2,1.01,12,.01,'Aₑ/Aₜ'),
  input('contractionRatio','Inlet-to-exit area',2,1.01,12,.01,'Aᵢ/Aₑ'),
  {key:'outletCondition',label:'Outlet condition',value:'Matched isentropic',options:['Matched isentropic','Specified back pressure']},
  input('MIn','Inlet Mach number',.3,.01,8,.01,'Mᵢ'),
  {key:'sonicBranch',label:'Flow after sonic inlet',value:'supersonic',options:['supersonic','subsonic']},
  input('backRatio','Back-to-reservoir pressure',.8,.001,1,.001,'pᵦ/p₀'),
  input('ambientRatio','External ambient pressure',.1,.00001,1,.00001,'pₐ/p₀'),
  input('p0','Stagnation pressure',500,1,10000,1,'kPa'),input('T0','Stagnation temperature',400,100,3000,1,'K'),
  input('minAreaCm2','Minimum flow area',6,.01,10000,.01,'cm²'),g,input('R','Gas constant',287,100,2200,1,'J/(kg·K)'),
  {key:'plotProperty',label:'Chart property',value:'Pressure',options:['Pressure','Mach number','Temperature']}
 ],model:'Steady, adiabatic quasi-1D ideal-gas flow · isentropic sections',equation:'A/A* = M⁻¹ [2(1 + (γ − 1)M²/2)/(γ + 1)]^[(γ + 1)/(2(γ − 1))]',limitations:'Cross-section-averaged analytical model. Full external jets and flow separation are not resolved.'},
 linear:{chapter:9,title:'Linearized diamond airfoil',tag:'SMALL-DISTURBANCE THEORY',description:'Inspect surface pressure, lift and wave drag for a thin, symmetric double-wedge airfoil.',inputs:[input('M','Freestream Mach',3,1.1,8,.01,'M∞'),input('alpha','Angle of attack',4,-10,10,.1,'°'),input('thickness','Thickness-to-chord ratio',.08,0,.2,.005,'t/c')],model:'Linearized supersonic flow · small slopes and angle of attack',equation:'Cᴸ = 4α/√(M∞² − 1)   ·   Cᴰ = 4[α² + (t/c)²]/√(M∞² − 1)',limitations:'Angles in the equations are radians. This is an approximation, especially near Mach 1. Viscous drag and finite-span effects are absent.'},
 cone:{chapter:10,title:'Taylor–Maccoll cone',tag:'AXISYMMETRIC SIMILARITY',description:'Solve the conical-flow ODE, locate the cone surface and recover the attached weak shock.',inputs:[input('M','Freestream Mach',2,1.2,6,.01,'M∞'),input('thetaCone','Cone half-angle',10,1,35,.1,'°'),g],model:'Steady, inviscid, axisymmetric sharp cone · zero angle of attack',equation:'dVᵣ/dθ = Vθ   ·   Vθ(θc) = 0',limitations:'Adaptive RK4 step doubling and a bracketed shock-angle search. Strong branches and detached cones are outside this release. Full book-example acceptance is pending.'}
};
function experimentInputs(id,x={}){
 if(id==='balances')return labs.balances.inputs.filter(f=>f.key!=='M2'||x.balanceMode!=='Solve outlet speed').map(f=>f.key==='T2'&&x.balanceMode==='Solve outlet speed'?{...f,section:'Outlet state'}:f);
 if(id!=='nozzle')return labs[id].inputs;
 const type=x.nozzleType??'Converging–diverging';
 return labs.nozzle.inputs.filter(f=>{
  if(f.key==='ambientRatio')return ['External waves','Nozzle + external waves'].includes(x.nozzleView)&&type==='Diverging'&&x.outletCondition!=='Specified back pressure';
  if(f.key==='areaRatio')return type!=='Converging';
  if(f.key==='contractionRatio')return type==='Converging';
  if(f.key==='backRatio')return type!=='Diverging'||x.outletCondition==='Specified back pressure';
  if(f.key==='outletCondition')return type==='Diverging';
  if(f.key==='MIn')return type==='Diverging';
  if(f.key==='sonicBranch')return type==='Diverging'&&x.MIn===1;
  return true;
 }).map(f=>f.key==='backRatio'&&type==='Diverging'?{...f,label:'Back-to-inlet stagnation pressure'}:f.key==='areaRatio'&&type==='Diverging'?{...f,label:'Exit-to-inlet area',unit:'Aₑ/Aᵢ'}:f.key==='minAreaCm2'?{...f,label:type==='Converging'?'Exit area':type==='Diverging'?'Inlet area':'Throat area'}:f);
}
export function inputDefinitions(id,x={}){return [...gasInputFields(x,id),...experimentInputs(id,x).filter(f=>!['gamma','R'].includes(f.key))];}
export function nozzleInfo(x){
 const base=labs.nozzle,type=x.nozzleType??'Converging–diverging';
 if(['External waves','Nozzle + external waves'].includes(x.nozzleView))return {description:x.nozzleView==='Nozzle + external waves'?'Follow the complete schematic planar nozzle and the first pair of waves from its exit lips.':'Match the local jet pressure to the ambient through a centered expansion or a weak attached oblique shock.',model:'Local planar upper-lip model · uniform axial exit · pressure-matched free jet boundary',equation:'p₂ = pₐ   ·   expansion: Δθ = ν(M₂) − ν(Mₑ)   ·   shock: θ–β–M',limitations:'External waves shows a local upper lip. Nozzle + external waves shows the complete schematic planar nozzle and mirrored first lip waves, ending at their first centerline interaction. A sonic-exit fan is schematic in the combined view; use the local view for its simple-wave details. This is not a full interacting or axisymmetric jet solution. Opposite-lip interactions, reflections, shock cells, Mach disks, separation and mixing are not computed. Ambient is treated as a constant-pressure boundary.'};
 if(type==='Converging')return {description:'Accelerate reservoir air through a converging nozzle and find its sonic exit-pressure limit.',model:'Converging nozzle · reservoir inlet · isentropic internal flow',equation:'p*/p₀ = [2/(γ + 1)]^[γ/(γ − 1)]   ·   pₑ = max(pᵦ, p*)',limitations:'The minimum area is the exit. Once choked, reducing back pressure changes the external jet, not the internal exit Mach or pressure. Use External waves for a local planar lip expansion; the full jet is not resolved.'};
 if(type==='Diverging')return x.outletCondition==='Specified back pressure'?{description:'Prescribe the inlet Mach and back pressure to locate a normal shock or identify external pressure adjustment.',model:'Diverging passage · prescribed inlet state and back pressure · isentropic sections with up to one normal shock',equation:'pₑ(Aₛ/Aᵢ) = pᵦ   ·   T₀₂ = T₀₁   ·   p₀₂ < p₀₁ across a shock',limitations:'A normal shock requires a supersonic upstream stream. Pressure above the shock-at-inlet limit cannot preserve the prescribed inlet Mach. A subsonic inlet permits only its matched outlet pressure. Use External waves for local lip adjustment. Separation and unstart are not resolved; x/L follows the schematic area distribution.'}:{description:'Prescribe the inlet Mach number: a diverging passage decelerates subsonic flow and accelerates supersonic flow.',model:'Diverging passage · prescribed inlet Mach and stagnation state · isentropic branch',equation:'Aₑ/A* = (Aₑ/Aᵢ)(Aᵢ/A*)   ·   choose the inlet Mach branch',limitations:'The inlet Mach and area ratio fix the matched outlet pressure. Select Specified back pressure to test a normal shock on the supersonic branch. Local lip waves are available in External waves; separation is not resolved; a sonic inlet requires a downstream branch.'};
 return {description:'Vary back pressure to find subsonic flow, choking, an internal normal shock and external pressure adjustment.',model:'Converging–diverging nozzle · reservoir inlet · isentropic sections with up to one normal shock',equation:base.equation,limitations:'The divergent area increases monotonically. Shock location Aₛ/Aₜ is calculated; x/L uses the displayed schematic area distribution. Use External waves for local lip adjustment. Full jets and flow separation are not resolved.'};
}

export function defaults(id){return {...Object.fromEntries(labs[id].inputs.map(x=>[x.key,x.value])),...(id==='balances'?controlVolumePreset():{}),fluid:'Air',gamma:1.4,R:287};}
export function calculate(id,x){const workingGas=gasInfo(x);let g=workingGas.gamma,R=workingGas.R,result,rows=[],chart,scene,checks={},notice=null,shockDetails=[];
 if(id==='foundations'){result=p.state(x.M,x.T1,x.p1*1000,g,R);result.relations=p.isentropicRelations(x.M,g);rows=[row('Stagnation temperature',result.T0,'K'),row('Stagnation pressure',result.p0/1000,'kPa'),row('Speed of sound',result.a,'m/s'),row('Velocity',result.u,'m/s'),row('Density',result.rho,'kg/m³')];const r=result.relations;rows.push(...[
 row('Mach number M',r.M),row('Mach angle μ',r.machAngle,'°'),row('Prandtl–Meyer angle ν',r.pmAngle,'°'),
 row('p/p₀',r.pP0),row('ρ/ρ₀',r.rhoRho0),row('T/T₀',r.TT0),row('p/p*',r.pPstar),row('ρ/ρ*',r.rhoRhostar),row('T/T*',r.TTstar),{...row('A/A*',r.areaRatio),display:r.areaUnbounded?'∞':null}
 ].map(v=>({...v,panel:'isentropic'})));chart={title:'Static-to-stagnation ratios',xlabel:'Mach number',ylabel:'Ratio',series:[{name:'T₀/T',points:p.linspace(0,4).map(m=>[m,p.isentropic(m,g).T0T])},{name:'p₀/p',points:p.linspace(0,4).map(m=>[m,p.isentropic(m,g).p0p])}]};scene={kind:'state',s1:result};}
 else if(id==='balances'){
  result=controlVolume(x);const r=result;scene={kind:'balance',...r};
  rows=[row('Inlet mass flow',r.m1,'kg/s'),row('Outlet mass flow',r.m2,'kg/s'),row('Outlet Mach',r.b.M),row('Mass residual',r.terms.mass.residual,'kg/s'),row('Momentum residual',r.terms.momentum.residual,'N'),row('Energy residual',r.terms.energy.residual/1000,'kW'),row('Force on fluid required by momentum',r.forceRequired,'N'),row('Inlet stagnation temperature',r.a.T0,'K'),row('Outlet stagnation temperature',r.b.T0,'K')];
  checks=Object.fromEntries(Object.entries(r.terms).map(([k,v])=>[k,v.relative]));
  notice=r.entropyViolation?'The adiabatic state pair decreases entropy and cannot represent a physical steady process.':r.balanced?'All three balances close. Endpoint states are consistent with these integral equations; the internal flow is not resolved.':'This proposed state pair does not satisfy all steady balances. Inspect the signed residuals below. Solving outlet speed enforces continuity only.';
  chart={title:'Enthalpy and kinetic energy per unit mass',xlabel:'Station: 1 inlet · 2 outlet',ylabel:'Specific energy (kJ/kg)',series:[{name:'Enthalpy h',points:[[1,r.cp*r.a.T/1000],[2,r.cp*r.b.T/1000]]},{name:'Kinetic energy u²/2',points:[[1,r.a.u**2/2000],[2,r.b.u**2/2000]]},{name:'Total h₀',points:[[1,r.cp*r.a.T0/1000],[2,r.cp*r.b.T0/1000]]}]};
 }
 else if(id==='normal'){result=p.normalShock(x.M1,g);let s1=p.state(x.M1,x.T1,x.p1*1000,g,R),s2=p.state(result.M2,x.T1*result.T,x.p1*1000*result.p,g,R);checks=p.conservation(s1,s2,g,R);rows=[row('Downstream Mach',result.M2),row('Pressure ratio',result.p,'p₂/p₁'),row('Temperature ratio',result.T,'T₂/T₁'),row('Density ratio',result.rho,'ρ₂/ρ₁'),row('Total-pressure recovery',result.p0,'p₀₂/p₀₁'),row('Entropy increase',result.ds_R,'Δs/R'),row('Downstream pressure',s2.p/1000,'kPa'),row('Downstream temperature',s2.T,'K'),row('Upstream stagnation pressure',s1.p0/1000,'kPa'),row('Downstream stagnation pressure',s2.p0/1000,'kPa'),row('Specific entropy increase',R*result.ds_R/1000,'kJ/(kg·K)'),row('Upstream speed',s1.u,'m/s'),row('Downstream speed',s2.u,'m/s'),row('Downstream density',s2.rho,'kg/m³')];scene={kind:'normal',s1,s2};chart={title:'Normal-shock property map',xlabel:'Upstream Mach number',ylabel:'Property ratio',series:['p','T','rho'].map((key,i)=>({name:['p₂/p₁','T₂/T₁','ρ₂/ρ₁'][i],points:p.linspace(1,5).map(m=>[m,p.normalShock(m,g)[key]])}))};}
 else if(id==='rayleigh'||id==='fanno'){let params={...x,p1:x.p1*1000,q:(x.q??0)*1000};result=id==='rayleigh'?p.rayleigh(params):p.fanno(params);let {s1,s2}=result;notice=result.message;checks=result.checks??{};rows=[row(id==='rayleigh'?'Maximum heat to sonic state':'Available sonic friction length',id==='rayleigh'?result.qmax/1000:result.limit,id==='rayleigh'?'kJ/kg':'fᴅ L*/D')];if(s2)rows.unshift(row('Outlet Mach',s2.M),row('Outlet temperature',s2.T,'K'),row('Outlet pressure',s2.p/1000,'kPa'),row('Total-pressure ratio',s2.p0/s1.p0,'p₀₂/p₀₁'),row('Entropy change',result.ds_R,'Δs/R'));let fn=id==='rayleigh'?p.rayleighRatios:p.fannoRatios;chart={title:id==='rayleigh'?'Rayleigh temperature & stagnation temperature':'Fanno temperature & pressure',xlabel:'Mach number',ylabel:'Ratio to sonic state',series:(id==='rayleigh'?['T','T0']:['T','p']).map(k=>({name:k==='T'?'T/T*':k==='T0'?'T₀/T₀*':'p/p*',points:p.linspace(.12,Math.max(4,s1.M*1.1,(s2?.M??0)*1.1)).map(m=>[m,fn(m,g)[k]])})),markers:[{name:'Inlet',x:s1.M,y:fn(s1.M,g).T},...(s2?[{name:'Outlet',x:s2.M,y:fn(s2.M,g).T}]:[])]};scene={kind:'duct',s1,s2,process:id};}
 else if(id==='oblique'||id==='expansion'){result=id==='oblique'?p.obliqueShock(x.M1,p.rad(x.theta),g,x.branch):p.expansion(x.M1,p.rad(x.theta),g);rows=[row('Downstream Mach',result.M2),row('Pressure ratio',result.p,'p₂/p₁'),row('Temperature ratio',result.T,'T₂/T₁'),row('Total-pressure ratio',result.p0,'p₀₂/p₀₁')];if(id==='oblique')rows.unshift(row('Shock angle β',p.deg(result.beta),'°'),row('Maximum attached turn',p.deg(result.thetaMax),'°'));checks={turning:Math.abs(result.residual)};scene={kind:id,M:x.M1,theta:p.rad(x.theta),...result};chart=id==='oblique'?{title:'θ–β–M relation',xlabel:'Shock angle β (°)',ylabel:'Flow deflection θ (°)',series:[{name:`M₁ = ${x.M1}`,points:p.linspace(p.deg(Math.asin(1/x.M1)),90).map(b=>[b,p.deg(p.turnAngle(x.M1,p.rad(b),g))])}],markers:[{name:x.branch,x:p.deg(result.beta),y:x.theta}]}:{title:'Prandtl–Meyer function',xlabel:'Mach number',ylabel:'ν (°)',series:[{name:'ν(M)',points:p.linspace(1,Math.max(5,result.M2*1.1)).map(m=>[m,p.deg(p.prandtlMeyer(m,g))])}],markers:[{name:'Inlet',x:x.M1,y:p.deg(result.nu1)},{name:'Outlet',x:result.M2,y:p.deg(result.nu2)}]};}
 else if(id==='collision'){result=p.collision(x);checks={pressure:Math.abs(result.residual)};rows=[row('Common flow angle δ',p.deg(result.delta),'°'),row('Pressure · region 4',result.p4,'p₄/p₁'),row('Pressure · region 5',result.p5,'p₅/p₁'),row('Mach · region 4',result.a.M2),row('Mach · region 5',result.b.M2)];scene={kind:'collision',...result};let d0=result.delta;chart={title:'Pressure compatibility near solution',zeroBaseline:false,xlabel:'Common flow angle δ (°)',ylabel:'Pressure ratio',series:[{name:'p₄/p₁',points:[]},{name:'p₅/p₁',points:[]}]};for(let d of p.linspace(d0-p.rad(.5),d0+p.rad(.5),80)){try{let a=p.obliqueShock(result.n2.M2,p.rad(x.thetaUpper)-d,g),b=p.obliqueShock(result.n3.M2,p.rad(x.thetaLower)+d,g);chart.series[0].points.push([p.deg(d),result.n2.p*a.p]);chart.series[1].points.push([p.deg(d),result.n3.p*b.p]);}catch{}}}
 else if(id==='tube'){result=p.shockTube({...x,p1:x.p1*1000,p4:x.p4*1000,gamma1:g,gamma4:g,R1:R,R4:R});checks={contactVelocity:Math.abs(result.residual)/result.a1};rows=[row('Incident shock Mach',result.Ms),row('Incident shock speed',result.shockSpeed,'m/s'),row('Contact velocity',result.u,'m/s'),row('Contact pressure',result.p/1000,'kPa'),row('Driven post-shock T₂',result.T2,'K'),row('Expanded driver T₃',result.T3,'K')];scene={kind:'tube',...result,...x};chart={title:'Wave trajectories · before reflection',xlabel:'Position x (m)',ylabel:'Time t (ms)',series:[['Expansion head',result.head],['Expansion tail',result.tail],['Contact',result.contact],['Shock',result.shockSpeed]].map(([name,v])=>({name,points:[[0,0],[v*.002,2]]}))};}
 else if(id==='nozzle'){
  const type=x.nozzleType??'Converging–diverging';
  result=p.nozzle({...x,p0:x.p0===undefined?500000:x.p0*1000,minArea:x.minAreaCm2===undefined?.0006:x.minAreaCm2*1e-4});
  rows=[row('Exit Mach',result.Me),row('Exit static pressure',result.exitPressure/1000,'kPa'),row('Exit temperature',result.exitTemperature,'K'),row('Mass flow rate',result.massFlow,'kg/s'),row(type==='Converging'||type==='Diverging'?'Inlet Mach':'Throat Mach',type==='Converging'?result.points[0].M:result.minimumMach),row('Total-pressure recovery',result.p02p01,'p₀₂/p₀₁')];
  if(type==='Converging')rows.push(row('Critical exit pressure',result.onset*result.p0/1000,'kPa'),row('Choking pressure ratio',result.onset,'pᵦ/p₀'));
  else if(type==='Diverging'){
   rows.push(row(result.outletCondition==='Specified back pressure'?'Specified back pressure':'Matched outlet pressure',result.backRatio,result.outletCondition==='Specified back pressure'?'pᵦ/p₀':'pₑ/p₀'),row('Exit area',result.exitArea*1e4,'cm²'));
   if(result.exitShock!==null)rows.push(row('Shock-at-exit pressure',result.exitShock,'pᵦ/p₀'),row('Shock-at-inlet pressure',result.inletShock,'pᵦ/p₀'));
   if(result.shock){rows.push(row('Shock section Aₛ/Aᵢ',result.AsAt),row('Shock position xₛ/L',result.shockX),row('Mach before shock',result.shock.upstreamMach),row('Mach after shock',result.shock.downstreamMach),row('Shock pressure jump',result.shock.pressureRatio,'p₂/p₁'));}
   if(!result.pressureMatched)notice='The internal flow remains supersonic to the exit. Exit pressure differs from back pressure; external jet adjustment is not resolved.';
  }
  else rows.push(row('Shock section Aₛ/Aₜ',result.AsAt),row('Choking onset',result.onset,'pᵦ/p₀'),row('Shock-at-exit threshold',result.exitShock,'pᵦ/p₀'),row('Design pressure ratio',result.design,'pₑ/p₀'));
  if(result.shockX!==null&&result.shockX!==undefined){
   const pair=result.points.filter(z=>Math.abs(z.x-result.shockX)<1e-10).sort((a,b)=>b.M-a.M);
   if(pair.length>=2&&pair[0].M>pair[1].M+1e-9){
    const areaRatioLabel=type==='Diverging'?'Aₛ/Aᵢ':'Aₛ/Aₜ';
    shockDetails.push(shockStateSection({kind:'normal',title:'Internal normal shock · upstream and downstream states',location:`xₛ/L = ${Number(result.shockX.toPrecision(6))} · ${areaRatioLabel} = ${Number(result.AsAt.toPrecision(6))} · Aₛ = ${Number((pair[0].area*1e4).toPrecision(6))} cm²`,before:pair[0],after:pair[1],gamma:g,R:x.R??287}));
   }
  }
  scene={kind:'nozzle',...result};
  const prop=x.plotProperty??'Pressure',field=prop==='Mach number'?'M':prop==='Temperature'?'T':'p';
  chart={title:prop==='Pressure'?'Section-averaged pressure':prop==='Mach number'?'Section-averaged Mach number':'Section-averaged temperature',xlabel:'Axial position x/L',ylabel:prop==='Pressure'?'p/p₀':prop==='Mach number'?'Mach number':'Temperature (K)',series:[{name:prop,points:result.points.map(s=>[s.x,s[field]])}]};
  if(prop==='Pressure')chart.series.push({name:type==='Diverging'&&result.outletCondition!=='Specified back pressure'?'Matched outlet pressure':'Back pressure',points:[[0,result.backRatio],[1,result.backRatio]]});
  checks={massConservation:result.massResidual,...(result.pressureMatched?{pressureClosure:result.pressureResidual}:{}),...(result.shockChecks?{shockMass:result.shockChecks.mass,shockMomentum:result.shockChecks.momentum,shockEnergy:result.shockChecks.energy}:{})};
  if(['External waves','Nozzle + external waves'].includes(x.nozzleView)){
   const ambient=type==='Diverging'&&result.outletCondition!=='Specified back pressure'?(x.ambientRatio??.1)*result.p0:result.backRatio*result.p0;
   const jet=externalJet({M:result.Me,p:result.exitPressure,T:result.exitTemperature,pb:ambient,gamma:g,R:result.R});result.external=jet;
   rows=rows.slice(0,4);
   rows.push(row('Ambient pressure',ambient/1000,'kPa'),row('Ambient-to-exit pressure',jet.ratio,'pₐ/pₑ'));
   if(jet.outlet){rows.push(row('External flow turn · upper lip',p.deg(jet.theta),'°'),row('External Mach',jet.outlet.M),row('External static pressure',jet.outlet.p/1000,'kPa'),row('External temperature',jet.outlet.T,'K'),row('External density',jet.outlet.rho,'kg/m³'),row('External speed',jet.outlet.u,'m/s'),row('External total-pressure recovery',jet.p02p01,'p₀₂/p₀ₑ'),row('Overall total-pressure recovery',result.p02p01*jet.p02p01,'p₀₂/p₀, inlet'));}
   if(jet.beta!==null)rows.push(row('External shock angle β',p.deg(jet.beta),'°'));
   if(jet.status==='expansion')rows.push(row('Fan head angle · upper lip',p.deg(jet.head),'°'),row('Fan tail angle · upper lip',p.deg(jet.tail),'°'));
   if(jet.weakPressureLimit)rows.push(row('Weak attached pressure limit',jet.weakPressureLimit,'pₐ/pₑ'));
   if(jet.status==='shock'&&jet.outlet){
    const mn1=jet.inlet.M*Math.sin(jet.beta),mn2=jet.outlet.M*Math.sin(jet.beta-Math.abs(jet.theta));
    shockDetails.push(shockStateSection({kind:'oblique',title:'External oblique shock · upstream and downstream states',location:'At the upper nozzle lip · local planar model',before:jet.inlet,after:jet.outlet,gamma:g,R:result.R,extra:[{label:'Shock angle β',value:p.deg(jet.beta),unit:'°'},{label:'Flow-turn magnitude |θ|',value:p.deg(Math.abs(jet.theta)),unit:'°'},{label:'Upstream normal Mach Mₙ₁',value:mn1,unit:''},{label:'Downstream normal Mach Mₙ₂',value:mn2,unit:''}]}));
   }
   scene={kind:x.nozzleView==='Nozzle + external waves'?'nozzleJet':'jet',...jet,...(x.nozzleView==='Nozzle + external waves'?{nozzle:{points:result.points,shockX:result.shockX,AsAt:result.AsAt,choked:result.choked,nozzleType:result.nozzleType,p0:result.p0,regime:result.regime}}:{})};notice=jet.message;checks={...checks,...Object.fromEntries(Object.entries(jet.checks).map(([k,v])=>['external'+k[0].toUpperCase()+k.slice(1),v]))};
   const val=z=>prop==='Pressure'?z.p/result.p0:prop==='Temperature'?z.T:z.M;
   let pts=jet.status==='expansion'?jet.samples.map(z=>[p.deg(z.theta),val(z)]):jet.status==='shock'?[[0,val(jet.inlet)],[.5,val(jet.inlet)],[.5,val(jet.outlet)],[1,val(jet.outlet)]]:[[0,val(jet.inlet)],[1,val(jet.inlet)]];
   chart={title:jet.status==='expansion'?`Expansion fan · ${prop.toLowerCase()}`:jet.status==='shock'?`Across external shock · ${prop.toLowerCase()}`:`Exit state · ${prop.toLowerCase()}`,xlabel:jet.status==='expansion'?'Upper-lip flow turn θ (°)':jet.status==='shock'?'Across shock · schematic coordinate':'Reference coordinate',ylabel:prop==='Pressure'?'p/p₀, inlet':prop==='Mach number'?'Mach number':'Temperature (K)',series:[{name:prop,points:pts}]};
   if(prop==='Pressure')chart.series.push({name:'Ambient pressure',points:[[pts[0][0],ambient/result.p0],[pts.at(-1)[0],ambient/result.p0]]});
  }

 }
 else if(id==='linear'){result=p.linearAirfoil(x);notice=result.warning;rows=[row('Lift coefficient',result.CL,'Cᴸ'),row('Wave-drag coefficient',result.CD,'Cᴰ,wave'),row('Upper front Cp',result.CpUF),row('Upper rear Cp',result.CpUR),row('Lower front Cp',result.CpLF),row('Lower rear Cp',result.CpLR)];scene={kind:'linear',...result,...x};chart={title:'Piecewise surface pressure',xlabel:'Chord position x/c',ylabel:'Pressure coefficient Cp',series:[{name:'Upper surface',points:[[0,result.CpUF],[.5,result.CpUF],[.5,result.CpUR],[1,result.CpUR]]},{name:'Lower surface',points:[[0,result.CpLF],[.5,result.CpLF],[.5,result.CpLR],[1,result.CpLR]]}]};}
 else if(id==='cone'){result=cone(x);checks={surfaceTangency:Math.abs(result.eventResidual),coneAngle:Math.abs(result.residual)};rows=[row('Conical shock angle β',p.deg(result.beta),'°'),row('Recovered cone angle',result.thetaConeDeg,'°'),row('Surface Mach',result.surface.M),row('Surface pressure',result.surface.p,'p꜀/p∞'),row('Surface temperature',result.surface.T,'T꜀/T∞'),row('Integration steps',result.iterations)];scene={kind:'cone',...result};chart={title:'Angular similarity solution',zeroBaseline:false,xlabel:'Polar angle θ (°)',ylabel:'Mach number',series:[{name:'M(θ)',points:result.history.map(s=>[p.deg(s.theta),s.M]).reverse()}]};}
 else throw new Error('Unknown laboratory.');
 return {id,inputs:x,gas:workingGas,model:id==='nozzle'?nozzleInfo(x).model:labs[id].model,result,rows,shockDetails,chart,scene,checks,notice,version:'0.1.0'};
}
