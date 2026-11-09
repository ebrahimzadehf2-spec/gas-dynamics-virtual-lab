import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {solveRegularChannel,chapter6Example,regularChannelPlots} from './regular-channel.js';
import {defaults,calculate} from './labs.js';import {sceneSVG} from './graphics.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const solve=n=>solveRegularChannel({...defaults('wall'),...chapter6Example(n)});
test('Book examples 6-4 and 6-5 match independent SciPy pressure-root solutions',()=>{
 const refs=JSON.parse(readFileSync(new URL('./book6-interaction-reference.json',import.meta.url)));
 for(const ref of refs){const r=solve(ref.example);assert.equal(r.status,'ok');assert.ok(r.interaction);near(r.slipAngle,ref.slipAngle);near(r.regions[4].p,ref.pressure);for(const [n,z]of Object.entries(ref.canonicalRegions))for(const key of ['M','p','T','theta'])near(r.regions[n][key],z[key]);}
});
test('Example 6-4 retains book labels 4 and 4-prime and four finite shocks',()=>{
 const r=solve(4);assert.equal(r.regionLabels[4],'4′');assert.equal(r.regionLabels[5],'4');assert.equal(r.waves.filter(w=>w.kind==='Oblique shock').length,4);near(r.regions[4].p,r.regions[5].p);near(r.regions[4].theta,r.regions[5].theta);assert.notEqual(r.regions[4].p0,r.regions[5].p0);near(r.slipAngle,9.54488816868);
});
test('Example 6-5 selects the reflected expansion and increases the final angle above 20 degrees',()=>{
 const r=solve(5);assert.equal(r.a.kind,'Expansion fan');assert.equal(r.b.kind,'Oblique shock');assert.ok(r.slipAngle>20);near(r.slipAngle,20.14266321232);near(r.regions[4].p0,r.regions[3].p0);assert.ok(r.regions[4].p<r.regions[3].p);assert.ok(r.regions[4].M>r.regions[3].M);
});
test('Geometry scales independently of the matched flow and clips before the next wall reflection',()=>{
 for(const number of [4,5]){const x={...defaults('wall'),...chapter6Example(number)},a=solveRegularChannel(x),b=solveRegularChannel({...x,channelHeight:x.channelHeight*3,wallSegments:x.wallSegments.map(p=>({...p,length:p.length*3})),upperWallSegments:x.upperWallSegments.map(p=>({...p,length:p.length*3}))});near(b.geometry.B[0],3*a.geometry.B[0]);near(b.geometry.B[1],3*a.geometry.B[1]);near(b.slipAngle,a.slipAngle);assert.ok(a.geometry.endX>a.geometry.B[0]&&a.geometry.endX<a.geometry.firstWallX);assert.ok(a.geometry.endX<=a.channelGeometry.end);}
});
test('All shocks close normal mass, momentum and stagnation-temperature balances',()=>{
 for(const number of [4,5])for(const w of solve(number).waves){const a=w.before,b=w.after;near(a.T0,b.T0);if(w.kind==='Oblique shock'){const d=Math.abs(b.theta-a.theta),v1=a.u*Math.sin(w.beta),v2=b.u*Math.sin(w.beta-d);near(a.rho*v1,b.rho*v2);near(a.p+a.rho*v1*v1,b.p+b.rho*v2*v2);assert.ok(b.p0<a.p0);}}
});
test('Unified channel calculation keeps book regions, exact first matching and selected shock reports',()=>{
 for(const number of [4,5]){const x={...defaults('wall'),...chapter6Example(number)},d=calculate('wall',x),view=sceneSVG(d.scene,x);assert.equal(d.scene.kind,'wall');assert.ok(d.result.tracking);assert.equal(d.result.bookCase,`6–${number}`);assert.ok(d.rows.some(r=>r.label==='Selected slip-line angle φ'));assert.equal(d.shockDetails.length,number===4?2:1);assert.ok(!d.shockDetails.some(w=>/NaN|undefined/.test(w.title)));assert.ok(d.checks.trackingPressure<1e-7);assert.ok(!/NaN|undefined/.test(view.svg));assert.equal(view.field.units,'kPa');assert.equal(Object.keys(d.result.regions).length,5);assert.ok(d.result.regions[number===4?'Region 4′':'Region 5']);assert.ok(d.result.tracking.events.find(e=>e.bookCase).approximate===false);}
});
test('Non-book topologies fall back to a local solution rather than inventing an interaction',()=>{
 const x={...defaults('wall'),wallShape:'Custom wall',boundaryMode:'Channel',channelHeight:2,wallSegments:[{angle:8,length:1},{angle:12,length:.6},{angle:0,length:.4}],upperWallSegments:[{angle:-8,length:1},{angle:-2,length:2}]},r=solveRegularChannel(x);assert.ok(!r.interaction);assert.equal(r.slipAngle,undefined);
});
