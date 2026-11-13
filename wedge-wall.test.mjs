import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {sceneSVG} from './graphics.js';
import {plotOptions} from './plot-options.js';
import {wedgeWallView,probeWedgeWall} from './wedge-wall.js';
import {pointInPolygon} from './region-labels.js';
import {obliqueShock,rad} from './physics.js';
const input={...defaults('cone'),bodyGeometry:'Wedge',M:2,thetaCone:10,nearbyWall:'Below wedge',wallDistance:1,wedgeAlpha:0};
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('Full wedge includes both face shocks and a regular reflected state with correct jump ratios',()=>{
 const d=calculate('cone',input),q=d.result.wallReflection,n=obliqueShock(2,rad(10)),r=obliqueShock(n.M2,rad(10));
 near(q.regions[2].M,n.M2);near(q.regions[4].M,n.M2);near(q.regions[3].M,r.M2);near(q.regions[3].p,n.p*r.p);near(q.regions[3].theta,0);
 const a=q.regions[2],b=q.regions[3],un=a.u*Math.sin(q.shock.beta),vn=b.u*Math.sin(q.shock.beta-q.t);
 near(b.rho*vn/(a.rho*un),1);near((b.p+1.4*4*b.rho*vn*vn)/(a.p+1.4*4*a.rho*un*un),1);near(b.T*(1+.2*b.M*b.M),a.T*(1+.2*a.M*a.M));
 assert.ok(q.hit<q.end&&q.end<q.next);near(q.mi*q.hit,-q.H);near(-q.H+q.mr*(q.next-q.hit),-q.mt*q.next);
 assert.equal(d.result.bodyTable.columns.length,4);assert.equal(d.shockDetails.length,3);assert.equal(plotOptions(d).length,5);
});
test('Upper/lower walls mirror all states and incidence consistently; distance only scales geometry',()=>{
 const a=calculate('cone',{...input,wedgeAlpha:2}).result.wallReflection,b=calculate('cone',{...input,nearbyWall:'Above wedge',wedgeAlpha:-2,wallDistance:3}).result.wallReflection;
 near(b.hit,3*a.hit);near(b.end,3*a.end);for(const n of [1,2,3,4]){near(a.regions[n].M,b.regions[n].M);near(a.regions[n].p,b.regions[n].p);near(a.regions[n].theta,-b.regions[n].theta);}
});
test('Contour cells partition the visible fluid and cursor returns dimensional states on both orientations',()=>{
 for(const nearbyWall of ['Below wedge','Above wedge']){const x={...input,nearbyWall},d=calculate('cone',x),q=d.result.wallReflection,{V}=wedgeWallView(q);
  for(let i=0;i<35;i++)for(let j=0;j<30;j++){const p=[q.start+(q.end-q.start)*(i+.32)/35,-q.H+(q.H+q.top)*(j+.43)/30],body=p[0]>=0&&Math.abs(p[1])<p[0]*q.mt,c=q.cells.filter(c=>pointInPolygon(p,c.poly));assert.equal(c.length,body?0:1);const z=probeWedgeWall(d.result,...V(p));if(body)assert.equal(z,null);else{assert.equal(z.region,c[0].n);near(z.p,q.regions[c[0].n].p*d.result.freestream.p);}}
  for(const key of ['pressure','mach','temperature','density']){const v=sceneSVG(d.scene,x,0,key);assert.equal(v.field.quantity,key);assert.doesNotMatch(v.svg,/NaN|undefined|Infinity/);assert.ok((v.svg.match(/<text /g)||[]).length>=6);}
 }
});
test('Wall controls appear only for Wedge; free-stream cone, comparison, and wedge retain prior behavior',()=>{
 for(const bodyGeometry of ['Wedge','Cone','Compare both']){const x={...input,bodyGeometry},f=inputDefinitions('cone',x);assert.equal(f.some(f=>f.key==='nearbyWall'),bodyGeometry==='Wedge');assert.equal(f.some(f=>f.key==='wallDistance'),bodyGeometry==='Wedge');}
 const free=calculate('cone',{...input,nearbyWall:'None'});assert.ok(!free.result.wallReflection);assert.equal(free.result.bodyTable.columns.length,2);
 assert.ok(!inputDefinitions('cone',{...input,nearbyWall:'None'}).some(f=>f.key==='wallDistance'));
 assert.throws(()=>calculate('cone',{...input,wallDistance:0}),/positive/);
 assert.throws(()=>calculate('cone',{...input,wedgeAlpha:15}),/compression|attached/);
 assert.throws(()=>calculate('cone',{...input,thetaCone:20}),/reflected|regular/);
});
test('Both walls solve two reflections, fill the common domain, and show incidence at the standard size',()=>{
 for(const alpha of [0,2,-2]){const x={...input,nearbyWall:'Both walls',wedgeAlpha:alpha},d=calculate('cone',x),q=d.result.wallReflection,{V}=wedgeWallView(q);
 assert.equal(Object.keys(q.regions).length,5);assert.equal(d.shockDetails.length,4);
 assert.ok(d.result.bodyTable.rows.every(r=>r.values.length===5));
 near(q.regions[3].theta,0);near(q.regions[5].theta,0);
 if(alpha===0){near(q.regions[2].M,q.regions[4].M);near(q.regions[3].p,q.regions[5].p);}
 assert.ok(q.end>q.hit&&q.end>q.upperReflection.hit);assert.ok(q.end<q.next&&q.end<q.upperReflection.next);
 for(let i=0;i<30;i++)for(let j=0;j<35;j++){const p=[q.start+(q.end-q.start)*(i+.29)/30,-q.H+2*q.H*(j+.39)/35],body=p[0]>=0&&Math.abs(p[1])<q.mt*p[0],cells=q.cells.filter(c=>pointInPolygon(p,c.poly));assert.equal(cells.length,body?0:1);const z=probeWedgeWall(d.result,...V(p));assert.equal(z===null,body);}
 const svg=sceneSVG(d.scene,x).svg;assert.match(svg,/viewBox="0 0 640 300"/);assert.match(svg,new RegExp('data-incidence-angle="'+alpha+'"'));assert.ok(svg.includes('α = '+alpha+'°'));
 assert.equal(plotOptions(d)[0].chart.series[1].points.length,3);
 }
});
