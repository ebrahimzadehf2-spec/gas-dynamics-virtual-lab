import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {solveChannelMOC,mocState,mocProfilePlots} from './channel-moc.js';
import {defaults,calculate,inputDefinitions} from './labs.js';import {sceneSVG} from './graphics.js';import {expansion,rad} from './physics.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const base=()=>({...defaults('wall'),wallShape:'Custom wall',boundaryMode:'Channel',channelSolver:'Method of characteristics',channelHeight:1,wallSegments:[{angle:0,length:3}],upperWallSegments:[{angle:0,length:3}],mocResolution:81});
const sample=(r,y)=>{const row=r.moc.rows.at(-1),N=row.M.length,v=Math.max(0,Math.min(N-1,(y-row.lower)/(row.upper-row.lower)*(N-1))),i=Math.min(N-2,Math.floor(v)),f=v-i;return row.M[i]*(1-f)+row.M[i+1]*f;};
test('Straight-channel MOC preserves uniform flow and stagnation properties',()=>{
 const r=solveChannelMOC(base());assert.equal(r.status,'ok');assert.ok(r.moc.rows.length>1);near(r.moc.massResidual,0);for(const row of r.moc.rows)for(let i=0;i<row.M.length;i++){near(row.M[i],3);near(row.theta[i],0);const z=mocState(r,row,i);near(z.p0,r.s1.p0);near(z.T0,r.s1.T0);near(z.p,z.rho*r.R*z.T);}
});
test('MOC converges toward an independently calculated exact centered expansion',()=>{
 const ref=JSON.parse(readFileSync(new URL('./channel-moc-reference.json',import.meta.url))),errors=[],mass=[];
 for(const mocResolution of [31,61,121,201]){const r=solveChannelMOC({...base(),wallSegments:[{angle:-8,length:1}],upperWallSegments:[{angle:0,length:1}],mocResolution});assert.equal(r.status,'ok');near(r.moc.rows.at(-1).x,ref.x);errors.push(ref.probes.reduce((sum,p)=>sum+Math.abs(sample(r,p.y)-p.M),0)/ref.probes.length);mass.push(r.moc.massResidual);}
 for(let i=1;i<errors.length;i++){assert.ok(errors[i]<errors[i-1]);assert.ok(mass[i]<mass[i-1]);}assert.ok(errors.at(-1)<.015);assert.ok(mass.at(-1)<.002);
});
test('Opposing expansion fans continue beyond their first interaction and preserve symmetry',()=>{
 const r=solveChannelMOC({...base(),wallSegments:[{angle:-8,length:6}],upperWallSegments:[{angle:8,length:6}],mocResolution:151});assert.equal(r.status,'ok');assert.equal(r.limitX,null);assert.ok(r.moc.rows.at(-1).x>5.9);near(r.regions['Lower outlet'].M,r.regions['Upper outlet'].M);near(r.regions['Centre outlet'].theta,0);assert.ok(Math.abs(r.regions['Centre outlet'].M-expansion(3,rad(16)).M2)<.015);assert.ok(r.moc.massResidual<.007);
});
test('An expansion reflected from the opposite flat wall reaches the analytical wall state',()=>{
 const r=solveChannelMOC({...base(),wallSegments:[{angle:-8,length:8}],upperWallSegments:[{angle:0,length:8}],mocResolution:151});assert.equal(r.status,'ok');assert.ok(Math.abs(r.regions['Upper outlet'].M-expansion(3,rad(16)).M2)<.001);near(r.regions['Upper outlet'].theta,0);
});
test('Compression corners are explicitly rejected rather than plotted as isentropic MOC',()=>{
 const x={...base(),wallSegments:[{angle:8,length:3}],upperWallSegments:[{angle:-8,length:3}]},r=solveChannelMOC(x);assert.equal(r.status,'unsupported');assert.equal(r.moc.rows.length,0);assert.match(r.reason,/shock fitting/);const svg=sceneSVG({kind:'wall',...r},x);assert.equal(svg.field,null);assert.ok(!svg.svg.includes('data-characteristic'));
});
test('MOC UI, sample table, numerical plots and all contour properties use the computed field',()=>{
 const x={...base(),wallSegments:[{angle:-8,length:3}],upperWallSegments:[{angle:8,length:3}],mocResolution:61},d=calculate('wall',x);assert.ok(inputDefinitions('wall',x).some(f=>f.key==='mocResolution'));assert.ok(d.result.regions['Centre outlet']);assert.equal(d.shockDetails.length,0);assert.ok(d.rows.some(r=>r.label==='Mass-flow residual'));assert.ok(mocProfilePlots(d.result).length===6);
 for(const key of ['mach','pressure','temperature','density','speed']){const v=sceneSVG(d.scene,x,.001,key);assert.equal(v.field.quantity,key);assert.ok(v.field.max>v.field.min);assert.ok(!/NaN|undefined|Infinity/.test(v.svg));assert.ok(v.svg.includes('data-characteristic'));}
});
test('Outward multi-corner walls land on corner stations and retain the correct wall tangency',()=>{
 const x={...base(),wallSegments:[{angle:-5,length:2},{angle:-10,length:2}],upperWallSegments:[{angle:0,length:4}],mocResolution:81},r=solveChannelMOC(x);assert.equal(r.status,'ok');assert.ok(r.moc.rows.some(row=>Math.abs(row.x-2*Math.cos(rad(5)))<1e-9));near(r.regions['Lower outlet'].theta,rad(-10));near(r.regions['Upper outlet'].theta,0);assert.ok(r.moc.massResidual<.02);
 const bad=solveChannelMOC({...x,wallSegments:[{angle:-5,length:2},{angle:-2,length:2}]});assert.equal(bad.status,'unsupported');assert.match(bad.reason,/shock fitting/);
});
