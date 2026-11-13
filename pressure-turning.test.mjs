import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults} from './labs.js';
import {plotOptions} from './plot-options.js';
import {pressureTurningPlot} from './pressure-turning.js';
import {chapter6Example} from './regular-channel.js';
import {trackingPreset} from './wave-tracker.js';
import {ramjetPreset} from './ramjet-inlet.js';
import {deg,rad} from './physics.js';
import {wedgeWallView,wedgeWallCells,probeWedgeWall} from './wedge-wall.js';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const run=(id,x={})=>calculate(id,{...defaults(id),...x});
test('Pressure–deflection charts cover planar turns, interactions, airfoil, wedge, cone and selected channel events',()=>{
 const cases=[['oblique',{}],['oblique',{branch:'strong'}],['expansion',{}],['collision',{}],['wall',{}],['wall',{wallShape:'Expansion corner',wallSide:'Gas below wall'}],['wall',chapter6Example(4)],['wall',chapter6Example(5)],['wall',trackingPreset('reflection')],['airfoil',{}],['airfoil',{airfoilMethod:'Linearized theory'}],['cone',{}],['cone',{bodyGeometry:'Wedge'}],['cone',{bodyGeometry:'Compare both'}]];
 for(const [id,x]of cases){const d=run(id,x),p=pressureTurningPlot(d);assert.ok(p,id+JSON.stringify(x));assert.equal(plotOptions(d).filter(p=>p.key==='pressure-turning').length,1);assert.ok(p.chart.series.every(s=>s.points.every(p=>p.every(Number.isFinite))));}
});
test('Signed turn and endpoint pressure are correct for compression, expansion and mirrored corners',()=>{
 for(const id of ['oblique','expansion']){const d=run(id),s=pressureTurningPlot(d).chart.series[0];near(s.points.at(-1)[0],d.inputs.theta*(id==='expansion'?-1:1));near(s.points.at(-1)[1],d.result.p);}
 const d=run('wall',{wallShape:'Compression ramp',wallSide:'Gas below wall'}),s=pressureTurningPlot(d).chart.series[0];near(s.points.at(-1)[0],-d.inputs.theta);near(s.points.at(-1)[1],d.result.regions[2].p/d.result.regions[1].p);
});
test('Cone chart uses the velocity direction, and airfoil trailing edge paths match solved states',()=>{
 const d=run('cone'),s=pressureTurningPlot(d).chart.series[0],h=d.result.history;near(s.points.at(-1)[0],d.inputs.thetaCone,1e-5);near(s.points[0][0],deg(h[0].theta+Math.atan2(h[0].vt,h[0].vr)));assert.ok(Math.abs(s.points[0][0]-deg(h[0].theta))>1);
 const a=run('airfoil'),p=pressureTurningPlot(a),w=a.result.trailingEdge.waves[0],curve=p.chart.series.find(s=>s.name===w.side+' · trailing edge');near(curve.points.at(-1)[0],deg(w.after.theta));near(curve.points.at(-1)[1],w.after.p/a.result.freestream.p);
});
test('Numerical channel cross-section curves are scatter samples; nozzle waves use exit pressure',()=>{
 for(const channelSolver of ['Method of characteristics','Compare both']){const d=run('wall',{...trackingPreset('reflection'),channelSolver,mocResolution:41}),p=pressureTurningPlot(d);assert.ok(p);assert.equal(p.chart.scatter,true);assert.match(p.note,/cross-section/);}
 const d=run('nozzle',{nozzleView:'External waves'});if(d.result.external.samples.length>1){const p=pressureTurningPlot(d);assert.ok(p);near(p.chart.series[0].points[0][1],1);near(p.chart.series[0].points.at(-1)[1],d.result.external.outlet.p/d.result.external.inlet.p);}
});
test('One-dimensional modules have no invented turning chart; existing inlet/wall diagrams are not duplicated',()=>{
 for(const id of ['normal','fanno','rayleigh','tube','foundations'])assert.equal(pressureTurningPlot(run(id)),null);
 for(const d of [run('wall',ramjetPreset),run('cone',{bodyGeometry:'Wedge',nearbyWall:'Both walls'})]){assert.equal(pressureTurningPlot(d),null);assert.ok(plotOptions(d).some(p=>/p-theta/.test(p.key)));}
});
test('Expanded inlet view fills most of the viewport and cursor reads extended upstream flow',()=>{
 const d=run('cone',{bodyGeometry:'Wedge',nearbyWall:'Both walls',M:2.6443,thetaCone:10.1,wedgeAlpha:8.8,wallDistance:.001}),q=d.result.wallReflection,v=wedgeWallView(q),cells=wedgeWallCells(q);
 near(v.V([v.start,0])[0],35);near(v.V([q.end,0])[0],605);assert.ok(v.start<q.start);assert.ok(cells.length>q.cells.length);
 const p=[(v.start+q.start)/2,0],s=probeWedgeWall(d.result,...v.V(p));assert.equal(s.region,1);near(s.M,d.inputs.M);near(s.theta,rad(8.8));
});
