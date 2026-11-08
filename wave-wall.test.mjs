import test from 'node:test';import assert from 'node:assert/strict';
import {defaults,calculate,chapters} from './labs.js';
import {solveWaveWall,wallGeometry,wallPresets,wallPlots} from './wave-wall.js';
import {obliqueShock,expansion,rad} from './physics.js';
import {sceneSVG} from './graphics.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const solve=x=>solveWaveWall({...defaults('wall'),...x});
test('Single wall reproduces the independent corner relations and correct turn sign',()=>{
 const compression=solve({wallSegments:[{angle:12,length:2}]}),shock=obliqueShock(3,rad(12));assert.equal(compression.status,'ok');near(compression.regions[2].M,shock.M2);near(compression.regions[2].p/101000,shock.p);
 const expanded=solve({wallSegments:[{angle:-15,length:2}]}),fan=expansion(3,rad(15));near(expanded.regions[2].M,fan.M2);near(expanded.regions[2].p/101000,fan.p);
});
test('Mirrored gas side swaps geometry sign while preserving all flow properties',()=>{
 const a=solve({wallSegments:[{angle:12,length:1}]}),b=solve({wallSide:'Gas below wall',wallSegments:[{angle:-12,length:1}]});for(const k of ['M','p','T','rho','u','p0'])near(a.regions[2][k],b.regions[2][k]);near(a.regions[2].theta,-b.regions[2].theta);
 const c=solve({wallSide:'Gas below wall',wallSegments:[{angle:12,length:1}]});assert.equal(c.waves[0].kind,'Expansion fan');
});
test('Geometry uses true lengths and absolute angles without forcing a trailing closure',()=>{
 const g=wallGeometry({...defaults('wall'),wallSegments:[{angle:10,length:2},{angle:10,length:3}]});near(g.end,5*Math.cos(rad(10)));near(g.points.at(-1).y,5*Math.sin(rad(10)));assert.notEqual(g.points.at(-1).y,0);
 assert.throws(()=>wallGeometry({...defaults('wall'),wallSegments:[]}));assert.throws(()=>wallGeometry({...defaults('wall'),wallSegments:[{angle:75,length:1}]}));
});
test('The first unresolved interaction clips charts and excludes later nominal states',()=>{
 const x={wallSegments:[{angle:10,length:.8},{angle:20,length:.7},{angle:5,length:1},{angle:0,length:3}]},r=solve(x);assert.equal(r.status,'partial');assert.ok(r.limitX>0&&r.limitX<r.geometry.end);assert.ok(r.panels.every(p=>p.a.x<r.limitX));assert.ok(wallPlots(r).every(p=>p.chart.series[0].points.every(([x])=>x<=r.limitX+1e-9)));
 const scaled=solve({wallSegments:x.wallSegments.map(p=>({...p,length:p.length*3}))});near(scaled.limitX,3*r.limitX);near(r.regions[2].p,scaled.regions[2].p);
});
test('Each accepted shock closes mass, normal momentum and total enthalpy',()=>{
 const r=solve({wallSegments:[{angle:10,length:1},{angle:15,length:1}]});for(const w of r.waves){near(w.before.T0,w.after.T0);if(w.kind==='Oblique shock'){const a=w.before,b=w.after,d=Math.abs(b.theta-a.theta),v1=a.u*Math.sin(w.beta),v2=b.u*Math.sin(w.beta-d);near(a.rho*v1,b.rho*v2);near(a.p+a.rho*v1*v1,b.p+b.rho*v2*v2);assert.ok(b.p0<a.p0);}}
});
test('Registry separates Chapter 6 geometry from Chapter 9 airfoils and renders every template',()=>{
 assert.equal(chapters.find(c=>c[0]===6)[3][0],'wall');assert.ok(!chapters.find(c=>c[0]===6)[3].includes('airfoil'));assert.ok(chapters.find(c=>c[0]===9)[3].includes('airfoil'));
 for(const [wallShape,wallSegments]of Object.entries(wallPresets)){const x={...defaults('wall'),wallShape,wallSegments},d=calculate('wall',x),svg=sceneSVG(d.scene,x).svg;assert.ok(!/NaN|undefined/.test(svg));assert.ok(d.rows.length>0);assert.ok(d.result.regions[1]);assert.ok(wallPlots(d.result).length===6);}
});
