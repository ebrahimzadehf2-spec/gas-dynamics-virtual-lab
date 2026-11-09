import test from 'node:test';import assert from 'node:assert/strict';
import {channelSolverName,solveShockExpansionChannel} from './channel-solver.js';
import {defaults,calculate,inputDefinitions} from './labs.js';import {chapter6Example} from './regular-channel.js';
import {trackingPreset} from './wave-tracker.js';import {selectTrackingEvent,trackingInspectionHTML} from './wave-tracker-tables.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)));
test('Channel selection exposes exactly two methods and migrates both former methods',()=>{
 const x={...defaults('wall'),...trackingPreset('reflection')},f=inputDefinitions('wall',x).find(z=>z.key==='channelSolver');assert.deepEqual(f.options,['Shock–Expansion','Method of characteristics','Compare both']);assert.equal(f.value,'Shock–Expansion');
 for(const name of ['Automatic shock–expansion','Attached-wave tracking','Local shock–expansion','Shock–Expansion']){assert.equal(channelSolverName(name),'Shock–Expansion');const d=calculate('wall',{...x,channelSolver:name});assert.equal(d.result.channelMethod,'Shock–Expansion');assert.equal(d.result.tracking.events.length,4);}
 assert.equal(channelSolverName('Method of characteristics'),'Method of characteristics');
});
test('Book presets select the unified solver and preserve the direct first match and manuscript region names',()=>{
 for(const [n,phi]of [[4,9.544888168687],[5,20.142663212302]]){const x={...defaults('wall'),...chapter6Example(n)},r=solveShockExpansionChannel(x),e=r.tracking.events.find(e=>e.bookCase);assert.equal(x.channelSolver,'Shock–Expansion');assert.equal(e.approximate,false);near(e.theta*180/Math.PI,phi);selectTrackingEvent(r,e.index);assert.equal(Object.keys(r.regions).length,5);assert.ok(r.regions[n===4?'Region 4′':'Region 5']);assert.match(trackingInspectionHTML(r,String),/Direct shock–expansion relations/);assert.ok(r.tracking.events.some(e=>e.type==='Wall reflection'));}
});
test('Fan approximation is marked at the affected event and propagates to later dependent states',()=>{
 const r=solveShockExpansionChannel(trackingPreset('shock-fan')),es=r.tracking.events;
 assert.ok(es.slice(0,2).every(e=>e.approximate===false));const e=es.find(e=>e.match);assert.equal(e.approximate,true);assert.equal(e.match.a.after.approximate,true);assert.equal(e.match.b.after.approximate,true);selectTrackingEvent(r,e.index);assert.match(trackingInspectionHTML(r,String),/Approximate fan-front/);assert.ok(es.filter(e=>e.type==='Wall reflection').every(e=>e.approximate));
 const pure=solveShockExpansionChannel(trackingPreset('reflection'));assert.equal(pure.tracking.hasFanApproximation,false);assert.ok(pure.tracking.events.every(e=>!e.approximate));
});
test('MOC keeps its own isentropic method and controls',()=>{
 const x={...defaults('wall'),...trackingPreset('fans'),channelSolver:'Method of characteristics',mocResolution:31},d=calculate('wall',x);assert.ok(d.result.moc);assert.ok(!d.result.tracking);const fields=inputDefinitions('wall',x);assert.ok(fields.some(f=>f.key==='mocResolution'));assert.ok(!fields.some(f=>f.key==='trackingStep'));
});
