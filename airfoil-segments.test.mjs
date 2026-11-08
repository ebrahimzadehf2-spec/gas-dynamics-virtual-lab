import test from 'node:test';
import assert from 'node:assert/strict';
import {airfoilGeometry,segmentSurface,surfaceSegments,presetSegments,solveAirfoil} from './airfoil.js';
import {defaults,inputDefinitions} from './labs.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('Entered lengths use true segment length and the final segment closes exactly at TE',()=>{
 const segments=[{angle:10,length:.3},{angle:0,length:.2}],z=segmentSurface(segments),end=z.points.at(-2);near(z.points[1].x,.3*Math.cos(Math.PI/18));near(z.points[1].y,.3*Math.sin(Math.PI/18));near(z.closing.length,Math.hypot(1-end.x,end.y));near(z.closing.angle,Math.atan2(-end.y,1-end.x)*180/Math.PI);assert.deepEqual(z.points.at(-1),{x:1,y:0});
 const roundtrip=segmentSurface(surfaceSegments(z.points)).points;z.points.forEach((p,i)=>{near(p.x,roundtrip[i].x);near(p.y,roundtrip[i].y);});
});
test('Diamond mirrors the upper segments and independent asymmetric sides both close',()=>{
 const x=defaults('airfoil'),d=airfoilGeometry(x);d.upper.forEach((p,i)=>{near(d.lower[i].x,p.x);near(d.lower[i].y,-p.y);});assert.ok(d.panels.filter(p=>p.automatic).length===2);
 const preset=presetSegments({...x,airfoilShape:'Asymmetric double wedge',camber:.01}),r=solveAirfoil({...x,airfoilShape:'Asymmetric double wedge',upperSegments:preset.upper,lowerSegments:preset.lower});assert.notEqual(r.geometry.upper[1].y,-r.geometry.lower[1].y);assert.deepEqual(r.geometry.upper.at(-1),r.geometry.lower.at(-1));
});
test('Angle/length and coordinate entry produce identical states, forces and potentials',()=>{
 const x={...defaults('airfoil'),airfoilShape:'Custom panels',upperSegments:[{angle:8,length:.25},{angle:0,length:.3}],lowerSegments:[{angle:-6,length:.35}]},a=solveAirfoil(x),encode=z=>z.map(p=>`${p.x},${p.y}`).join(';'),b=solveAirfoil({...x,geometryInput:'Coordinates',upperProfile:encode(a.geometry.upper),lowerProfile:encode(a.geometry.lower)});
 for(const model of ['linear','nonlinear']){assert.equal(a[model].status,b[model].status);for(const k of ['CL','CD','CM'])near(a[model][k],b[model][k]);a[model].panels.forEach((p,i)=>near(p.Cp,b[model].panels[i].Cp));}
 a.linear.potential.forEach((p,i)=>near(p.phi1,b.linear.potential[i].phi1));
});
test('Invalid segment lengths, overrun, crossings and preset segment count are rejected',()=>{
 for(const segments of [[{angle:0,length:0}],[{angle:90,length:.2}],[{angle:0,length:1}],[{angle:0,length:NaN}]])assert.throws(()=>segmentSurface(segments));
 const x=defaults('airfoil');assert.throws(()=>airfoilGeometry({...x,upperSegments:[{angle:-10,length:.4}]}),/cross/);assert.throws(()=>airfoilGeometry({...x,upperSegments:[{angle:1,length:.2},{angle:1,length:.2}]}),/at most/);
 assert.equal(segmentSurface([]).closing.length,1);assert.ok(!inputDefinitions('airfoil',x).some(f=>f.key==='camber'||f.key==='thickness'));assert.ok(inputDefinitions('airfoil',x).some(f=>f.key==='upperSegments'));
});
