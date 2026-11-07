import test from 'node:test';
import assert from 'node:assert/strict';
import {nozzle,isentropic,normalShock,machFromArea} from './physics.js';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {sceneSVG,chartSVG} from './graphics.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
function balances(s){assert.ok(s.massResidual<2e-9);for(const z of s.points){near(z.P*z.area*z.u/(s.R*z.T),s.massFlow,Math.max(1e-9,s.massFlow*2e-9));near(z.T*isentropic(z.M).T0T,s.T0,1e-8);}}
test('converging nozzle reproduces book 8-1 and keeps exit pressure distinct from ambient after choking',()=>{
 const a=nozzle({nozzleType:'converging',backRatio:.7}),b=nozzle({nozzleType:'converging',backRatio:.4});
 near(a.Me,.7323954884516265);near(a.exitPressure,350000,1e-6);assert.equal(a.choked,false);
 near(b.Me,1);near(b.exitPressure,264140.8938585871,1e-7);assert.equal(b.choked,true);assert.ok(b.exitPressure>200000);balances(a);balances(b);
});
test('converging sonic mass-flow ceiling, no-flow limit and physical scaling',()=>{
 const a=nozzle({nozzleType:'converging',backRatio:.4}),b=nozzle({nozzleType:'converging',backRatio:.1}),c=nozzle({nozzleType:'converging',backRatio:.1,minArea:.0012,p0:1e6});
 near(a.massFlow,b.massFlow,1e-12);near(c.massFlow,4*b.massFlow,1e-10);
 const zero=nozzle({nozzleType:'converging',backRatio:1});near(zero.massFlow,0);assert.ok(zero.points.every(z=>z.M===0));
 for(const gamma of [1.2,1.4,5/3]){let crit=(2/(gamma+1))**(gamma/(gamma-1)),s=nozzle({nozzleType:'converging',gamma,backRatio:crit});near(s.Me,1);near(s.exitPressure,5e5*crit,1e-7);}
});
test('diverging passage follows the prescribed inlet branch and conserves mass and stagnation state',()=>{
 for(const MIn of [.3,2]){const s=nozzle({nozzleType:'diverging',MIn,areaRatio:2});assert.ok(MIn<1?s.Me<MIn:s.Me>MIn);balances(s);
  const i=s.points[0],e=s.points.at(-1);near(i.M,MIn);near(i.P/i.rho,i.T*287);near(e.P/i.P,(i.T/e.T)**(-3.5),1e-10);
  near(s.backRatio,s.exitPressure/s.p0);assert.equal(s.AsAt,null);
 }
 // Scalar pressure-Mach/area references independently computed in Python.
 near(nozzle({nozzleType:'diverging',MIn:1,areaRatio:3}).Me,2.637415849310822);
});
test('a sonic diverging inlet requires an explicit physical branch and permits both outgoing branches',()=>{
 for(const sonicBranch of ['subsonic','supersonic']){let s=nozzle({nozzleType:'diverging',MIn:1,sonicBranch});near(s.points[0].M,1);assert.equal(s.choked,true);assert.ok(sonicBranch==='subsonic'?s.Me<1:s.Me>1);balances(s);}
 assert.throws(()=>nozzle({nozzleType:'diverging',MIn:1,sonicBranch:'automatic'}));
});
test('CD nozzle retains book 8-3 thresholds and book 8-4 shock section, with both one-sided shock states',()=>{
 const a=nozzle({areaRatio:6.789620535714289,backRatio:.013110919994476009});near(a.Me,3.5);near(a.exitShock,.1851917449219737);near(a.onset,.994886651188321);near(a.design,.013110919994476009);balances(a);
 const b=nozzle({areaRatio:3,backRatio:.5,p0:101320});near(b.AsAt,2.339726206649883);near(b.Me,.3803397668237326);near(b.exitPressure,50660,1e-5);balances(b);
 const ends=nozzle({areaRatio:3,backRatio:b.exitShock}),last=ends.points.slice(-2);near(last[0].x,1);near(last[1].x,1);assert.ok(last[0].M>1&&last[1].M<1);near(last[1].M,ends.Me);near(last[1].p,ends.backRatio,1e-10);balances(ends);
 const onset=nozzle({areaRatio:3,backRatio:b.onset});assert.ok(onset.points.some(p=>p.x===.28));near(onset.minimumMach,1,1e-7);
});
test('UI shows only relevant inputs and renders finite geometry and all three scientific charts',()=>{
 for(const nozzleType of ['Converging','Diverging','Converging–diverging'])for(const plotProperty of ['Pressure','Mach number','Temperature']){
  const x={...defaults('nozzle'),nozzleType,plotProperty};let d=calculate('nozzle',x),fields=inputDefinitions('nozzle',x).map(z=>z.key);
  assert.equal(fields.includes('backRatio'),nozzleType!=='Diverging');assert.equal(fields.includes('MIn'),nozzleType==='Diverging');assert.equal(fields.includes('contractionRatio'),nozzleType==='Converging');
  for(const svg of [sceneSVG(d.scene,x).svg,chartSVG(d.chart).svg])assert.ok(!/NaN|Infinity|undefined/.test(svg));
  assert.ok(d.rows.some(r=>r.label==='Mass flow rate'));assert.equal(d.chart.series.length,plotProperty==='Pressure'?2:1);
 }
 const x={...defaults('nozzle'),nozzleType:'Diverging',MIn:1};assert.ok(inputDefinitions('nozzle',x).some(z=>z.key==='sonicBranch'));
});
test('nozzle rejects invalid gas, geometry and boundary inputs',()=>{
 for(const args of [{nozzleType:'unknown'},{nozzleType:'converging',backRatio:0},{nozzleType:'converging',contractionRatio:1},{nozzleType:'diverging',MIn:0},{nozzleType:'diverging',areaRatio:1},{minArea:0},{p0:NaN},{T0:-1},{gamma:1}])assert.throws(()=>nozzle(args));
});
