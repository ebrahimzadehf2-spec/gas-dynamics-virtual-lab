import test from 'node:test';import assert from 'node:assert/strict';
import {calculate,defaults,inputDefinitions} from './labs.js';
import * as p from './physics.js';
import {reservoirExamples} from './reservoir-examples.js';
const near=(a,b,t=3e-7)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const run=(id,x={})=>calculate(id,{...defaults(id),...x});
function states(z,a=[]){if(z&&typeof z==='object'){if(['M','T','p','rho'].every(k=>typeof z[k]==='number'))a.push(z);for(const v of Object.values(z))if(v&&typeof v==='object')states(v,a);}return a;}
function same(a,b){const x=states(a.result),y=states(b.result);assert.equal(x.length,y.length);for(let i=0;i<x.length;i++)for(const k of ['M','T','p','rho','u','p0','T0'])if(k in x[i])near(x[i][k],y[i][k]);}
for(const id of ['foundations','normal','wall','collision','airfoil','cone'])test(id+': equivalent static/total inlet data preserve physical states',()=>{
 const x={...defaults(id),...(id==='cone'?{bodyGeometry:'Wedge'}:{})},M=['foundations','airfoil','cone'].includes(id)?x.M:x.M1,iso=p.isentropic(M,x.gamma),base=run(id,x);
 for(const P of [false,true])for(const T of [false,true]){
  const d=run(id,{...x,p1:x.p1*(P?iso.p0p:1),T1:x.T1*(T?iso.T0T:1),inletPressureType:P?'Stagnation pressure':'Static pressure',temperatureInput:T?'Stagnation temperature':'Static temperature'});
  near(d.inputs.p1,base.inputs.p1);near(d.inputs.T1,base.inputs.T1);same(base,d);
 }
 const fs=inputDefinitions(id,x);for(const k of ['temperatureInput','inletPressureType'])assert.equal(fs.filter(f=>f.key===k).length,1);
});
test('True cone dimensional freestream uses converted inputs',()=>{
 const x=defaults('cone'),a=run('cone',x),i=p.isentropic(x.M,x.gamma),b=run('cone',{...x,p1:x.p1*i.p0p,T1:x.T1*i.T0T,inletPressureType:'Stagnation pressure',temperatureInput:'Stagnation temperature'});same(a,b);
});
test('Both shock tube chambers offer independent types; initial static and total values coincide',()=>{
 const a=run('tube'),b=run('tube',{inletPressureType:'Stagnation pressure',temperatureInput:'Stagnation temperature',driverPressureType:'Stagnation pressure',driverTemperatureType:'Stagnation temperature'});assert.deepEqual(a.result,b.result);
 const f=inputDefinitions('tube',defaults('tube'));for(const k of ['inletPressureType','temperatureInput','driverPressureType','driverTemperatureType'])assert.equal(f.filter(x=>x.key===k).length,1);
});
test('Nozzle static input is referenced to actual inlet, including reservoir-fed geometries',()=>{
 for(const x of [{nozzleType:'Converging–diverging',backRatio:.8},{nozzleType:'Converging',backRatio:.8},{nozzleType:'Converging',backRatio:.2},{nozzleType:'Diverging',MIn:.3},{nozzleType:'Diverging',MIn:2}]){
  const a=run('nozzle',x),M=a.result.points[0].M,i=p.isentropic(M),b=run('nozzle',{...x,p0:a.result.p0/1000/i.p0p,T0:a.result.T0/i.T0T,nozzlePressureType:'Static pressure',nozzleTemperatureType:'Static temperature'});
  near(a.result.exitPressure,b.result.exitPressure);near(a.result.exitTemperature,b.result.exitTemperature);near(a.result.massFlow,b.result.massFlow);
 }
});
for(const id of ['rayleigh','fanno'])test(id+': forward inlet pressure and temperature have independent static/total choices',()=>{
 const x=defaults(id),a=run(id,x),s=a.result.s1;
 const b=run(id,{...x,p1:s.p0/1000,inletPressureType:'Stagnation pressure',inletT0:s.T0,temperatureInput:'Stagnation temperature'});same(a,b);
});
test('Fanno inverse friction + outlet Mach supports static inlet temperature and total inlet pressure',()=>{
 const x={fannoInput:'Outlet Mach + friction length',lambda:.2,targetMach:.8,inletT0:400},a=run('fanno',x),s=a.result.s1;
 const b=run('fanno',{...x,inletT0:s.T,inverseTemperatureType:'Static temperature',p1:s.p0/1000,inletPressureType:'Stagnation pressure'});same(a,b);
});
test('Moving supply temperature can be static independently from pressure',()=>{
 for(const [,x]of reservoirExamples){const a=run('rayleigh',x),ref=a.result.stations[0].state;
 for(const P of [false,true]){const b=run('rayleigh',{...x,reservoirT0:ref.T,supplyTemperatureType:'Static temperature',reservoirP0:(P?ref.p0:ref.p)/1000,reservoirPressureType:P?'Stagnation pressure':'Static pressure'});same(a,b);}
 }
 const f=inputDefinitions('rayleigh',{...defaults('rayleigh'),ductProblem:'Reservoir-fed duct',supplyTemperatureType:'Static temperature'});assert.ok(f.some(x=>x.key==='supplyReferenceMach'));
});
test('Reservoir inverse outlet pressure accepts static and stagnation forms',()=>{
 for(const k of [3]){const x=reservoirExamples[k][1],a=run('rayleigh',x),b=run('rayleigh',{...x,backPressure:a.result.s2.p0/1000,outletPressureType:'Stagnation pressure'});same(a,b);}

});
test('Initial-reference sonic outlet temperature accepts static data at M=1',()=>{
 const x={ductProblem:'Reservoir-fed duct',ductSolve:'Upstream reference + sonic outlet',M1:.41,p1:68.95,inletT0:229.4,outletT0:1666.7},a=run('rayleigh',x),b=run('rayleigh',{...x,outletT0:a.result.s2.T,outletTemperatureType:'Static temperature'});same(a,b);
});
test('Heat-shock-nozzle converts inlet pressure, inlet temperature and sonic outlet pressure',()=>{
 const x={ductProblem:'Heat + shock + converging nozzle',systemInletType:'Static duct inlet',M1:1.6,T1:200,p1:56,backPressure:120},a=run('rayleigh',x),s=a.result.s1;
 const b=run('rayleigh',{...x,T1:s.T0,temperatureInput:'Stagnation temperature',p1:s.p0/1000,inletPressureType:'Stagnation pressure',backPressure:a.result.s2.p0/1000,outletPressureType:'Stagnation pressure'});same(a,b);
});
test('Fanno connected systems convert supply temperature/pressure and inverse outlet pressure',()=>{
 for(const x of [{ductProblem:'CD nozzle minimum supply pressure',backPressure:150},{ductProblem:'CD nozzle + prescribed shock',lambda:.15,shockCase:'Duct exit'},{ductProblem:'Reservoir + nozzle + duct',lambda:.1,backPressure:460}]){
 const a=run('fanno',x),M=0,i=p.isentropic(M),b=run('fanno',{...x,supplyReferenceMach:M,reservoirP0:500/i.p0p,reservoirT0:400/i.T0T,reservoirPressureType:'Static pressure',supplyTemperatureType:'Static temperature',...(x.ductProblem==='CD nozzle minimum supply pressure'?{backPressure:a.result.s2.p0/1000,outletPressureType:'Stagnation pressure'}:{})});same(a,b);
 }

});
test('Selector coverage: direct-conversion p/T fields have choices without duplicate controls',()=>{
 const cases=[...['foundations','normal','wall','collision','tube','nozzle','airfoil','cone'].map(id=>[id,{}]),...['rayleigh','fanno'].flatMap(id=>[[id,{}],[id,{ductProblem:id==='rayleigh'?'Reservoir-fed duct':'Reservoir + nozzle + duct'}],[id,{[id==='rayleigh'?'rayleighInput':'fannoInput']:id==='rayleigh'?'Heat transfer + Outlet Mach':'Outlet Mach + friction length'}]])];
 for(const [id,x]of cases){const fs=inputDefinitions(id,{...defaults(id),...x});assert.equal(new Set(fs.map(f=>f.key)).size,fs.length,`${id} duplicate controls`);for(const f of fs.filter(f=>['K','kPa'].includes(f.unit)&&!(id==='rayleigh'&&f.key==='inletT0'&&x.rayleighInput==='Heat transfer + Outlet Mach'))){assert.ok(fs.some(s=>s.options?.some(o=>o==='Static '+(f.unit==='K'?'temperature':'pressure'))),id+' '+f.key);}}
});

test('Inverse Rayleigh temperature and unknown-Mach outlet pressure retain their original known data',()=>{
 const x={...defaults('rayleigh'),rayleighInput:'Heat transfer + Outlet Mach'},f=inputDefinitions('rayleigh',x);
 assert.ok(f.some(z=>z.key==='inletT0'));assert.ok(!f.some(z=>z.key==='inverseTemperatureType'));
 const pfields=inputDefinitions('rayleigh',{...defaults('rayleigh'),rayleighInput:'Outlet pressure'});
 assert.ok(!pfields.some(z=>z.key==='outletPressureType'));
 const pb=inputDefinitions('rayleigh',{...defaults('rayleigh'),ductProblem:'Reservoir-fed duct',ductSolve:'Specified back pressure'});
 assert.ok(!pb.some(z=>z.key==='outletPressureType'));
});
test('Fanno shock-location supply conversions use the known duct inlet Mach',()=>{
 const x={ductProblem:'CD nozzle + prescribed shock',lambda:.2,shockCase:'Duct exit'},f=run('fanno',x),y={ductProblem:'Duct shock location',M1:f.result.s1.M,lambda:.2,backPressure:f.result.s2.p/1000},a=run('fanno',y),i=p.isentropic(y.M1),b=run('fanno',{...y,reservoirP0:500/i.p0p,reservoirT0:400/i.T0T,reservoirPressureType:'Static pressure',supplyTemperatureType:'Static temperature'});same(a,b);
});
