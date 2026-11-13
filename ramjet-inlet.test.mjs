import test from 'node:test';
import assert from 'node:assert/strict';
import {ramjetMode,ramjetPreset,solveRamjetInlet,ramjetPlots} from './ramjet-inlet.js';
import {ramjetInletDrawing,inletViewGeometry,probeInlet} from './ramjet-inlet-graphics.js';
import {defaults,calculate,inputDefinitions} from './labs.js';
import {plotOptions} from './plot-options.js';
import {pointInPolygon} from './region-labels.js';
import {deg,rad} from './physics.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('Example 6–9 solves both weak shocks and conserves normal fluxes',()=>{
 const r=solveRamjetInlet(ramjetPreset),s=r.regions;
 near(deg(r.a.beta),37.21013606);near(deg(r.b.beta),44.10309099);
 near(s[2].M,1.713743932);near(s[3].M,1.437035654);
 const thetaBeta=(M,b)=>Math.atan(2/Math.tan(b)*(M*M*Math.sin(b)**2-1)/(M*M*(1.4+Math.cos(2*b))+2));
 for(const [a,b,n] of [[s[1],s[2],r.a],[s[2],s[3],r.b]]){
  near(thetaBeta(a.M,n.beta),rad(8));
  near(b.p/a.p,1+2*1.4/2.4*((a.M*Math.sin(n.beta))**2-1));
  near(b.T0,a.T0);assert.ok(b.p0<a.p0);
 }
 assert.ok(Object.values(r.checks).every(v=>v<1e-9));near(s[3].theta,0);
});
test('Height and reference pressure/temperature scale the figure and dimensional states only',()=>{
 const a=solveRamjetInlet(ramjetPreset),b=solveRamjetInlet({...ramjetPreset,channelHeight:3,p1:200,T1:500});
 near(b.geometry.hit/a.geometry.hit,3);near(b.a.beta,a.a.beta);near(b.b.beta,a.b.beta);
 near(b.regions[3].M,a.regions[3].M);near(b.regions[3].p/b.s1.p,a.regions[3].p/a.s1.p);
 assert.ok(a.geometry.hit<a.geometry.end&&a.geometry.end<a.geometry.next);
});
test('The rendered field partitions the gas domain and returns correct cursor states',()=>{
 const r=solveRamjetInlet(ramjetPreset),g=r.geometry,{V}=inletViewGeometry(r);
 for(let i=0;i<40;i++)for(let j=0;j<30;j++){
  const x=g.start+(g.end-g.start)*(i+.37)/40,y=(g.H-Math.max(0,x)*g.mt)*(j+.41)/30,p=[x,y];
  const cells=g.cells.filter(c=>pointInPolygon(p,c.poly));assert.equal(cells.length,1);
  const v=probeInlet(r,...V(p));assert.equal(v.region,cells[0].region);near(v.M,cells[0].state.M);
 }
 assert.equal(probeInlet(r,...V([0,-.1])),null);
 for(const q of ['pressure','mach','temperature','density','speed']){const v=ramjetInletDrawing(r,ramjetPreset,q);assert.equal(v.field.quantity,q);assert.doesNotMatch(v.svg,/NaN|undefined|Infinity/);assert.match(v.svg,/β₁/);assert.match(v.svg,/β₂/);}
});
test('Integration exposes only relevant controls, regional results and pressure–deflection curves',()=>{
 const x={...defaults('wall'),...ramjetPreset},d=calculate('wall',x),fields=inputDefinitions('wall',x);
 assert.equal(x.wallShape,ramjetMode);assert.ok(d.result.ramjet);assert.equal(d.shockDetails.length,2);
 assert.deepEqual(Object.keys(d.result.regions),['1','2','3']);
 assert.ok(!fields.some(f=>['wallSide','wallSegments','channelSolver','branch'].includes(f.key)));
 const c=plotOptions(d)[0].chart;assert.match(c.xlabel,/θ/);assert.equal(c.series.length,3);
 near(c.markers[2].x,0);near(c.markers[2].y,d.result.regions[3].p/d.result.s1.p);
 assert.ok(ramjetPlots(d.result).every(p=>p.chart.series.every(s=>s.points.every(p=>p.every(Number.isFinite)))));
});
test('Unsupported reflected shocks and invalid inputs are rejected without a fabricated field',()=>{
 assert.throws(()=>solveRamjetInlet({...ramjetPreset,theta:20}),/regular-reflection/);
 assert.throws(()=>solveRamjetInlet({...ramjetPreset,M1:1}),/supersonic/);
 assert.throws(()=>solveRamjetInlet({...ramjetPreset,channelHeight:0}),/positive/);
});
