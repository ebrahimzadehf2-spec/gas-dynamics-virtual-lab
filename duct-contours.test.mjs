import test from 'node:test';import assert from 'node:assert/strict';
import {calculate,defaults} from './labs.js';import {sceneSVG} from './graphics.js';import {plotOptions} from './plot-options.js';import {fannoRatios,conservation} from './physics.js';import {rayleighDistributionNote} from './duct-contours.js';
const near=(a,b,t=2e-8)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const run=(id,x={})=>calculate(id,{...defaults(id),...x});
test('Rayleigh contour samples follow uniform cumulative heat, conserve mass and momentum and recover endpoints',()=>{
 for(const M of [.4,2])for(const q of [-20,30]){const d=run('rayleigh',{M1:M,q}),r=d.result,a=r.s1,cp=d.gas.cp;assert.equal(r.longitudinal[0].state,a);assert.equal(r.longitudinal.at(-1).state,r.s2);for(const z of r.longitudinal){near(cp*(z.state.T0-a.T0),q*1000*z.x);const e=conservation(a,z.state,1.4,287,q*1000*z.x);for(const v of Object.values(e))assert.ok(v<2e-8);}}
});
test('Fanno contour samples use cumulative friction length and fixed stagnation temperature',()=>{
 for(const M of [.4,2]){const d=run('fanno',{M1:M,lambda:.1}),r=d.result;for(const z of r.longitudinal){near(fannoRatios(r.s1.M).F-fannoRatios(z.state.M).F,.1*z.x);near(z.state.T0,r.s1.T0);near(z.state.rho*z.state.u,r.s1.rho*r.s1.u);}}
});
test('Each contour quantity uses actual accepted interior extrema and embeds the distribution assumption',()=>{
 for(const id of ['rayleigh','fanno']){const d=run(id);for(const q of ['pressure','mach','temperature','density','speed']){const view=sceneSVG(d.scene,d.inputs,.001,q);assert.equal(view.field.quantity,q);assert.match(view.svg,/data-duct-contour=/);assert.ok(view.field.min<=view.field.max);assert.doesNotMatch(view.svg,/NaN|Infinity|undefined/);assert.match(view.svg,id==='rayleigh'?/equal heat added\/removed per metre/:/Constant friction factor/);}}
});
test('Longitudinal charts retain inlet/outlet markers and do not replace Mach-property curves',()=>{
 const d=run('rayleigh'),options=plotOptions(d),axial=options.find(o=>o.key==='rayleigh-axial-pressure');assert.equal(axial.note,rayleighDistributionNote);assert.match(axial.chart.xlabel,/x\/L/);assert.deepEqual(axial.chart.markers.map(m=>m.x),[0,1]);near(axial.chart.series[0].points.at(-1)[1],d.result.s2.p/1000);assert.ok(options.some(o=>o.chart.xlabel==='Mach number M'));
});
test('Connected heat/shock/nozzle and Fanno shocks preserve discontinuities in the contour stops',()=>{
 for(const [id,x]of [['rayleigh',{ductProblem:'Heat + shock + converging nozzle',systemInletType:'Static duct inlet',M1:1.6,T1:200,p1:56,backPressure:120}],['fanno',{ductProblem:'CD nozzle + prescribed shock',lambda:.15,shockCase:'Duct exit'}]]){const d=run(id,x),r=d.result;assert.ok(r.longitudinal.some((z,i,a)=>i&&z.x===a[i-1].x&&z.state.p!==a[i-1].state.p));const view=sceneSVG(d.scene,d.inputs);assert.match(view.svg,/Normal shock/);assert.ok(view.svg.includes(`offset="${100*r.shockAt}%"`));assert.doesNotMatch(view.svg,/NaN|undefined/);}
});
test('Exceeded choking limit does not invent a longitudinal field',()=>{const d=run('rayleigh',{q:1000});assert.equal(d.result.s2,null);assert.equal(d.result.longitudinal,undefined);assert.doesNotMatch(sceneSVG(d.scene,d.inputs).svg,/data-duct-contour=/);});

test('System diagrams place entry nozzles before the friction duct and the Rayleigh exit nozzle after its shock',()=>{
 for(const shockCase of ['Nozzle throat (limit)','Nozzle exit','Duct exit']){
  const d=run('fanno',{ductProblem:'CD nozzle + prescribed shock',shockCase,lambda:.1}),v=sceneSVG(d.scene,d.inputs);
  assert.match(v.svg,/C–D nozzle/);assert.match(v.svg,/Reservoir/);
  assert.match(v.svg,/M120 105L185 135L270 105/);assert.match(v.svg,/M270 105H735/);
  if(shockCase==='Nozzle throat (limit)')assert.doesNotMatch(v.svg,/data-shock/);
  else assert.ok(v.svg.includes(`data-shock="true" d="M${shockCase==='Nozzle exit'?270:735} 105V215"`));
 }
 const d=run('rayleigh',{ductProblem:'Heat + shock + converging nozzle',systemInletType:'Static duct inlet',M1:1.6,T1:200,p1:56,backPressure:120}),v=sceneSVG(d.scene,d.inputs);
 assert.match(v.svg,/data-shock="true" d="M500 105V215"/);assert.match(v.svg,/M65 105H540/);assert.match(v.svg,/id="exitContour"/);
 assert.match(v.svg,/Nozzle outlet/);assert.doesNotMatch(v.svg,/NaN|undefined|Infinity/);
});
