import test from 'node:test';
import assert from 'node:assert/strict';
import * as p from './physics.js';
import {calculate,defaults} from './labs.js';
import {sceneSVG} from './graphics.js';
import {reservoirExamples} from './reservoir-examples.js';
const close=(a,b,t=2e-8)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const run=x=>calculate('rayleigh',{...defaults('rayleigh'),...x});
function balances(a,b,q,g=1.4,R=287){
 const cp=g*R/(g-1);
 close(a.rho*a.u,b.rho*b.u);close(a.p+a.rho*a.u*a.u,b.p+b.rho*b.u*b.u);
 close(cp*a.T+a.u*a.u/2+q,cp*b.T+b.u*b.u/2);
 close(b.p,b.rho*R*b.T);
}
test('Heating/cooling grid conserves mass, momentum and energy on each Mach branch',()=>{
 for(const g of [1.289,1.4,1.667])for(const M of [.1,.5,.95,1.05,2,8]){
  const base={M1:M,T1:320,p1:135000,gamma:g,R:287};
  const zero=p.rayleigh({...base,q:0});
  const cp=g*287/(g-1),qmin=cp*((M>1?1-1/g**2:0)*zero.T0star-zero.s1.T0);
  for(const q of [0,.3*zero.qmax,.99*zero.qmax,zero.qmax,.5*qmin]){
   const r=p.rayleigh({...base,q});assert.ok(r.s2);balances(r.s1,r.s2,q,g);
   assert.ok((M-1)*(r.s2.M-1)>=-1e-8);
   if(q>0)assert.ok(Math.abs(r.s2.M-1)<=Math.abs(M-1)+1e-8);
  }
  assert.equal(p.rayleigh({...base,q:zero.qmax+Math.max(1,zero.qmax*.001)}).status,'heat-limit');
  assert.throws(()=>p.rayleigh({...base,q:qmin-1}),/Cooling|cooling/);
 }
});
test('Single duct inverse inputs recover forward states with static and total pressure',()=>{
 for(const M of [.4,2.5])for(const fraction of [-.2,.5]){
  const z=p.rayleigh({M1:M,T1:300,p1:160000,q:0});const q=fraction*z.qmax;
  const f=p.rayleigh({M1:M,T1:300,p1:160000,q});
  for(const x of [
   {rayleighInput:'Outlet Mach',targetMach:f.s2.M},
   {rayleighInput:'Outlet pressure',targetPressure:f.s2.p/1000},
   {rayleighInput:'Heat transfer + Outlet Mach',targetMach:f.s2.M,inletT0:f.s1.T0,q:q/1000}
  ])for(const type of ['Static pressure','Stagnation pressure']){
   const d=run({M1:M,T1:300,p1:(type==='Static pressure'?f.s1.p:f.s1.p0)/1000,inletPressureType:type,...x});
   close(d.result.s1.M,M);close(d.result.s2.M,f.s2.M);close(d.result.s2.T,f.s2.T);close(d.result.s2.p,f.s2.p);
  }
 }
});
test('Invalid crossing, sonic cooling ambiguity, and nonphysical inverse temperatures are rejected',()=>{
 assert.throws(()=>run({M1:.5,rayleighInput:'Outlet Mach',targetMach:2}),/sonic|branch/);
 assert.throws(()=>run({M1:1,q:-1}),/sonic inlet|branch/);
 assert.throws(()=>run({rayleighInput:'Heat transfer + Outlet Mach',q:-1000,inletT0:300,targetMach:.5}),/positive|temperature/);
});
test('Moving reference cases preserve total conditions and continuity through implied entry area',()=>{
 for(const [,x]of reservoirExamples){const d=run(x),ref=d.result.stations[0].state,i=d.result.s1;
  close(ref.T0,i.T0);close(ref.p0,i.p0);
  close(ref.rho*ref.u,i.rho*i.u*d.result.entryAreaRatio);
  assert.match(sceneSVG(d.scene,x).svg,/Ain\/Aref/);
 }
});
test('Initial upstream adjustment ignores stale supply selector and identifies reference as initial state',()=>{
 const x={ductProblem:'Reservoir-fed duct',ductSolve:'Upstream reference + sonic outlet',M1:.41,p1:68.95,inletT0:229.4,outletT0:1666.7};
 const a=run(x),b=run({...x,reservoirPressureType:'Static pressure',supplyReferenceMach:.8});
 close(a.result.s1.M,b.result.s1.M);close(a.result.s2.p,b.result.s2.p);
 assert.equal(b.result.stations.length,3);assert.match(b.result.referenceTable.note,/initial|operating/i);
});
test('Reservoir sonic mode allows zero heat and rejects cooling with a clear message',()=>{
 const x={ductProblem:'Reservoir-fed duct',ductSolve:'Sonic outlet'};
 const d=run({...x,q:0});close(d.result.s1.M,1);close(d.result.s2.M,1);
 assert.throws(()=>run({...x,q:-10}),/sonic.*heat|cooling.*sonic/i);
});
test('Reservoir cooling and zero-heat back-pressure modes recover manufactured subsonic inlet',()=>{
 for(const q of [-50000,0,100000]){
  const Mi=.45,T0=400,P0=500000,iso=p.isentropic(Mi),f=p.rayleigh({M1:Mi,T1:T0/iso.T0T,p1:P0/iso.p0p,q});
  const d=run({ductProblem:'Reservoir-fed duct',ductSolve:'Specified back pressure',reservoirT0:T0,reservoirP0:P0/1000,q:q/1000,backPressure:f.s2.p/1000});
  close(d.result.s1.M,Mi);close(d.result.s2.M,f.s2.M);
 }
 assert.throws(()=>run({ductProblem:'Reservoir-fed duct',ductSolve:'Specified back pressure',q:100,backPressure:600}),/pressure|compatible/i);
});
test('Heat-shock-nozzle preserves balances in each component for heating and cooling',()=>{
 for(const M of [1.3,2,4])for(const sign of [-1,1]){
  const a=p.state(M,300,100000),lim=p.rayleigh({M1:M,T1:a.T,p1:a.p,q:0}),q=sign*.2*lim.qmax;
  const b=p.rayleigh({M1:M,T1:a.T,p1:a.p,q}).s2,n=p.normalShock(b.M),c=p.state(n.M2,b.T*n.T,b.p*n.p),pe=c.p0/p.isentropic(1).p0p;
  const d=run({ductProblem:'Heat + shock + converging nozzle',systemInletType:'Static duct inlet',M1:M,T1:300,p1:100,backPressure:pe/1000});
  const [i,pre,post,e]=d.result.stations.map(z=>z.state);
  close(pre.M,b.M);balances(i,pre,q);balances(pre,post,0);
  assert.ok(post.p0<pre.p0);close(post.T0,e.T0);close(post.p0,e.p0);
  const area=d.rows.find(r=>r.label==='Nozzle exit / duct area').value;
  close(post.rho*post.u,e.rho*e.u*area);close(e.p,pe);
  assert.match(d.notice,/schematic|axial position/);
 }
 assert.throws(()=>run({ductProblem:'Heat + shock + converging nozzle',systemInletType:'Static duct inlet',M1:.5,T1:300,p1:100,backPressure:100}),/supersonic inlet/i);
});
test('Heat bounds follow inverse outlet data and total-temperature or speed inlet data',async()=>{
 const {rayleighHeatBounds}=await import('./rayleigh-input.js');
 const inv={...defaults('rayleigh'),rayleighInput:'Heat transfer + Outlet Mach',inletT0:400,targetMach:.6};
 assert.deepEqual(rayleighHeatBounds({...inv,M1:.2}),rayleighHeatBounds({...inv,M1:8}));
 const total={...defaults('rayleigh'),M1:2,temperatureInput:'Stagnation temperature',inletT0:600};
 const b=rayleighHeatBounds(total),f=p.rayleigh({M1:2,T1:600/1.8,q:0});close(b.max,f.qmax/1000);
 const speed={...total,velocityInput:'Flow speed',inletSpeed:400};
 const T=600-400**2/(2*1004.5),M=400/Math.sqrt(1.4*287*T);
 close(rayleighHeatBounds(speed).max,p.rayleigh({M1:M,T1:T,q:0}).qmax/1000);
});
test('Heat just above choking returns the physical limit rather than a root-bracket failure',()=>{
 for(const M of [.5,2]){const z=p.rayleigh({M1:M,q:0});assert.equal(p.rayleigh({M1:M,q:z.qmax*(1+1e-9)}).status,'heat-limit');}
});
