import test from 'node:test';import assert from 'node:assert/strict';
import {defaults,calculate,inputDefinitions} from './labs.js';
import {solveWaveChannel,channelPlots} from './wave-channel.js';
import {obliqueShock,rad} from './physics.js';import {sceneSVG} from './graphics.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const base=()=>({...defaults('wall'),wallShape:'Custom wall',boundaryMode:'Channel',channelHeight:1,wallSegments:[{angle:0,length:3}],upperWallSegments:[{angle:0,length:3}]});
test('A straight channel preserves the uniform inlet on both boundaries',()=>{
 const r=solveWaveChannel(base());assert.equal(r.status,'ok');assert.equal(r.limitX,null);for(const z of Object.values(r.regions))for(const k of ['M','p','T','rho','u','p0'])near(z[k],r.s1[k]);assert.ok(r.waves.every(w=>w.kind==='No wave'));
});
test('An emitted shock stops at its exact first encounter with the opposite wall',()=>{
 const x={...base(),wallSegments:[{angle:12,length:3}]},r=solveWaveChannel(x),beta=obliqueShock(3,rad(12)).beta;
 assert.equal(r.status,'partial');near(r.limitX,x.channelHeight/Math.tan(beta));assert.match(r.reason,/opposite channel wall/);assert.ok(channelPlots(r).every(p=>p.chart.series.every(s=>s.points.every(([x])=>x<=r.limitX+1e-9))));
});
test('Opposing incident shocks stop at their geometrical intersection',()=>{
 const x={...base(),wallSegments:[{angle:8,length:3}],upperWallSegments:[{angle:-8,length:3}]},r=solveWaveChannel(x),b=obliqueShock(3,rad(8)).beta;
 assert.equal(r.status,'partial');near(r.limitX,1/(2*Math.tan(b)));near(r.regions.L2.p,r.regions.U2.p);near(r.regions.L2.theta,-r.regions.U2.theta);assert.match(r.reason,/two channel walls intersect/);
 const scaled=solveWaveChannel({...x,channelHeight:3,wallSegments:[{angle:8,length:9}],upperWallSegments:[{angle:-8,length:9}]});near(scaled.limitX,3*r.limitX);near(scaled.regions.L2.M,r.regions.L2.M);
});
test('Crossing boundaries are rejected and unequal wall lengths use the shared domain',()=>{
 assert.throws(()=>solveWaveChannel({...base(),channelHeight:NaN}),/height/);
 assert.throws(()=>solveWaveChannel({...base(),channelHeight:.1,wallSegments:[{angle:20,length:3}]}),/cross or close/);
 const r=solveWaveChannel({...base(),upperWallSegments:[{angle:0,length:2}]});near(r.geometry.end,2);assert.equal(r.status,'ok');
});
test('Custom channel fields, exports, region names, plots and drawing stay consistent',()=>{
 const x={...base(),wallSegments:[{angle:8,length:3}]},d=calculate('wall',x),fields=inputDefinitions('wall',x).map(f=>f.key);
 assert.ok(fields.includes('upperWallSegments')&&fields.includes('channelHeight')&&!fields.includes('wallSide'));assert.ok(d.result.regions.L2&&d.result.regions.U2);assert.ok(d.rows.some(r=>r.label==='Region U2 · Mach'));assert.ok(d.shockDetails.some(r=>r.title.includes('1 → L2')));
 assert.ok(!/NaN|undefined/.test(sceneSVG(d.scene,x).svg));assert.ok(channelPlots(d.result).every(p=>p.chart.series.length===2));
 const single=inputDefinitions('wall',{...x,boundaryMode:'Single wall'}).map(f=>f.key);assert.ok(!single.includes('upperWallSegments')&&single.includes('wallSide'));
});
