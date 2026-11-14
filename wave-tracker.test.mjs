import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {solveWaveTracker,trackingPreset,trackingProfile,matchTrackingStreams} from './wave-tracker.js';
import {chapter6Example} from './regular-channel.js';import {state,deg,rad} from './physics.js';
import {calculate,defaults,trackingShockDetails,inputDefinitions} from './labs.js';
import {sceneSVG} from './graphics.js';import {trackingInspectionHTML,selectTrackingEvent,trackingExportRows} from './wave-tracker-tables.js';
import {trackingCoordinates,probeTracking} from './wave-tracker-graphics.js';
const near=(a,b,t=2e-8)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const refs=JSON.parse(readFileSync(new URL('./wave-tracker-reference.json',import.meta.url)));
test('A shock reflects three times, matching independent SciPy shock states and geometry',()=>{
 const r=solveWaveTracker(trackingPreset('reflection'));assert.equal(r.status,'ok');assert.equal(r.tracking.events.length,4);
 for(const [i,e]of r.tracking.events.entries()){const z=refs.reflections[i];for(const k of ['x','y'])near(e[k],z[k]);for(const k of ['M','p','T'])near(e.after[k],z[k]);near(e.waves[0].beta,z.beta);near(e.after.theta,z.theta);}
 assert.ok(r.tracking.maxMassResidual<1e-9);
});
test('Both book interactions retain their exact first pressure match and continue beyond its former wall limit',()=>{
 for(const [n,phi,formerLimit]of [[4,9.544888168687,1.29],[5,20.142663212302,2.816]]){const r=solveWaveTracker(chapter6Example(n)),e=r.tracking.events.find(e=>e.match);near(deg(e.theta),phi);assert.ok(r.tracking.endX>formerLimit);assert.ok(r.tracking.events.some(e=>e.type==='Wall reflection'));if(n===4){assert.equal(r.status,'partial');assert.match(r.reason,/attached|subsonic|reflection/);}else assert.equal(r.status,'ok');}
});
test('Shock–expansion and expansion–expansion interactions reach the exit of their examples',()=>{
 for(const name of ['shock-fan','fans']){const r=solveWaveTracker(trackingPreset(name));assert.equal(r.status,'ok');assert.ok(r.tracking.events.some(e=>e.match));assert.ok(r.tracking.events.some(e=>e.type==='Wall reflection'));assert.ok(r.tracking.maxMassResidual<1e-5);assert.ok(r.tracking.maxPressureResidual<1e-7);near(r.tracking.endX,r.geometry.end);if(name==='shock-fan'){assert.ok(r.tracking.events.some(e=>e.incoming.includes('Oblique shock')&&e.incoming.includes('Expansion front')));assert.ok(r.tracking.events.some(e=>e.hasSlip));}else assert.ok(r.tracking.events.some(e=>e.incoming.filter(k=>k==='Expansion front').length===2));}
});
test('Symmetric fans recover exact PM characteristic-invariant centre and wall states',()=>{
 const r=solveWaveTracker(trackingPreset('fans'));for(const [name,z]of [['Centre sample',refs.symmetricFans.centre],['Lower sample',refs.symmetricFans.wall],['Upper sample',refs.symmetricFans.wall]])for(const k of ['M','p','T'])near(r.regions[name][k],z[k]);
 for(const z of Object.values(r.tracking.allStates)){near(z.T0,r.s1.T0);near(z.p0,r.s1.p0,1e-7);}
});
test('Halving the front width reduces mass discrepancy and provides an explicit outlet sensitivity comparison',()=>{
 for(const name of ['shock-fan','fans']){const r=solveWaveTracker({...trackingPreset(name),trackingRefine:'On'}),f=r.tracking.refinement;assert.equal(f.comparable,true);near(f.fineStep,.25);assert.ok(f.massResidual<r.tracking.massResidual*.6);assert.ok(f.pressureL1<.004);assert.ok(f.machL1<.002);}
});
test('Every finite shock satisfies one-sided normal conservation and entropy increase',()=>{
 const r=solveWaveTracker(trackingPreset('shock-fan'));for(const e of r.tracking.events)for(const w of e.waves){const a=w.before,b=w.after;near(a.T0,b.T0);if(w.kind==='Oblique shock'){const d=Math.abs(b.theta-a.theta),u=a.u*Math.sin(w.beta),v=b.u*Math.sin(w.beta-d);near(a.rho*u,b.rho*v);near(a.p+a.rho*u*u,b.p+b.rho*v*v);near(a.u*Math.cos(w.beta),b.u*Math.cos(w.beta-d));assert.ok(b.p0<=a.p0*(1+1e-9));}else if(w.kind==='Expansion fan')near(a.p0,b.p0);}
});
test('Mirroring the channel mirrors wave coordinates and directions, preserving scalar states',()=>{
 const x=trackingPreset('shock-fan'),a=solveWaveTracker(x),b=solveWaveTracker({...x,wallSegments:x.upperWallSegments.map(z=>({...z,angle:-z.angle})),upperWallSegments:x.wallSegments.map(z=>({...z,angle:-z.angle}))});assert.equal(a.status,b.status);const u=a.tracking.events.find(e=>e.match),v=b.tracking.events.find(e=>e.match);near(u.x,v.x);near(u.y,x.channelHeight-v.y);near(u.theta,-v.theta);near(u.pressure,v.pressure);
});
test('Straight channels generate no waves; physical and computation limits retain only upstream fields',()=>{
 const plain=solveWaveTracker({...trackingPreset('reflection'),wallSegments:[{angle:0,length:4}]});assert.equal(plain.status,'ok');assert.equal(plain.tracking.events.length,0);near(plain.tracking.massResidual,0);
 const detached=solveWaveTracker({...trackingPreset('reflection'),M1:1.2,wallSegments:[{angle:20,length:1}],upperWallSegments:[{angle:0,length:1}]});assert.equal(detached.status,'partial');assert.equal(detached.tracking.endX,0);assert.equal(detached.tracking.slabs.length,0);assert.match(detached.reason,/Attached-shock/);
 const capped=solveWaveTracker({...trackingPreset('shock-fan'),wallSegments:[{angle:5,length:6}],upperWallSegments:[{angle:5,length:6}]});assert.equal(capped.status,'partial');assert.match(capped.reason,/budget/);assert.ok(capped.tracking.endX<capped.geometry.end);assert.ok(capped.tracking.slabs.every(s=>s.right<=capped.tracking.endX+1e-8));
 assert.throws(()=>solveWaveTracker({...trackingPreset('reflection'),channelHeight:.1}),/close|cross/);
 assert.throws(()=>solveWaveTracker({...trackingPreset('fans'),trackingStation:NaN}),/Profile station/);
 assert.throws(()=>solveWaveTracker({...trackingPreset('fans'),trackingStation:1.1}),/Profile station/);
});
test('Profile, all contour quantities, selected-event tables, shock inspection and exports stay synchronized',()=>{
 const x={...defaults('wall'),...trackingPreset('reflection')},d=calculate('wall',x),r=d.result;
 assert.equal(r.selectedTrackingEvent,r.tracking.events.at(-1).index);selectTrackingEvent(r,4);assert.equal(trackingShockDetails(r).length,1);assert.ok(trackingInspectionHTML(r,String).includes('E4'));
 for(const quantity of ['pressure','mach','temperature','density','speed']){const view=sceneSVG({...r,kind:'wall'},x,0,quantity);assert.equal(view.field.quantity,quantity);assert.ok(!/NaN|undefined/.test(view.svg));}
 const c=trackingCoordinates(r),v=probeTracking(r,c.X(.5),c.Y(.5)),p=trackingProfile(r,.5);assert.ok(v&&v.M>1&&p);assert.equal(probeTracking(r,c.X(-1),c.Y(.5)),null);
 const rows=trackingExportRows(r);assert.ok(rows.some(z=>z.label.includes('E4')&&z.label.includes('Mach')));assert.ok(rows.every(z=>Number.isFinite(z.value)));
 assert.ok(inputDefinitions('wall',x).some(z=>z.key==='trackingStep'));assert.ok(inputDefinitions('wall',{...x,channelSolver:'Automatic shock–expansion'}).some(z=>z.key==='trackingStep'));
});
