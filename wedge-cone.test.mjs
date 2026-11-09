import test from 'node:test';import assert from 'node:assert/strict';
import {solveWedge,solveBodyLab} from './wedge-cone.js';import {rad,deg} from './physics.js';
import {calculate,defaults,inputDefinitions} from './labs.js';import {sceneSVG} from './graphics.js';import {plotOptions} from './plot-options.js';import {probeWedge,probeBody} from './body-probe.js';import {coneGeometry} from './cone-probe.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('Independent NASA NPARC 15-degree wedge at Mach 2.5, zero and nonzero incidence',()=>{
 // https://www.grc.nasa.gov/www/wind/valid/wedge/wedge.html, Table 2 (rounded).
 for(const x of [{thetaCone:15,wedgeAlpha:0},{thetaCone:20,wedgeAlpha:5}]){const f=solveWedge({M:2.5,...x}).faces[0];near(deg(f.beta),36.94490,2e-5);near(f.surface.M,1.873526,2e-6);near(f.surface.p,2.467500,2e-6);near(f.surface.T,1.321958,2e-6);near(f.surface.rho,1.866549,2e-6);}
});
test('Incidence mirrors upper/lower states and preserves total temperature and EOS',()=>{
 const a=solveWedge({M:3,thetaCone:10,wedgeAlpha:4}),b=solveWedge({M:3,thetaCone:10,wedgeAlpha:-4});
 for(let i=0;i<2;i++){const f=a.faces[i],g=b.faces[1-i];for(const k of ['M','p','T','rho','p0','u'])near(f.surface[k],g.surface[k]);near(f.turn,-g.turn);near(f.surface.T*(1+.2*f.surface.M**2),1+.2*9);near(f.surface.p,f.surface.T*f.surface.rho);}
 near(a.faces[0].turn,rad(6));near(a.faces[1].turn,rad(-14));
});
test('At incidence exceeding half-angle, a face expands; at equality it has no wave',()=>{
 const a=solveWedge({M:3,thetaCone:5,wedgeAlpha:8});assert.equal(a.faces[0].kind,'Expansion fan');assert.ok(a.faces[0].surface.p<1);assert.ok(a.faces[0].surface.M>3);near(a.faces[0].surface.p0,1);assert.equal(a.faces[1].kind,'Oblique shock');assert.equal(solveWedge({M:3,thetaCone:5,wedgeAlpha:5}).faces[0].kind,'No wave');
});
test('Detached face is omitted while the other face remains valid',()=>{const a=solveWedge({M:2,thetaCone:20,wedgeAlpha:10});assert.equal(a.status,'partial');assert.equal(a.faces[1].status,'detached');assert.equal(a.faces[1].surface,undefined);assert.ok(a.faces[0].surface);});
test('Comparison retains axial cone and incidence wedge as distinct physical models',()=>{
 const x={...defaults('cone'),M:2.5,thetaCone:10,bodyGeometry:'Compare both',wedgeAlpha:5},r=solveBodyLab(x),d=calculate('cone',x);assert.equal(r.cone.status,'ok');assert.ok(r.reason.includes('different incidence'));assert.ok(r.cone.beta<r.wedge.faces[1].beta);assert.equal(d.result.bodyTable.columns.length,3);assert.equal(plotOptions(d).length,6);assert.ok(!d.result.referenceTable);const v=sceneSVG(d.scene,x);assert.match(v.svg,/Wedge · α = 5°/);assert.match(v.svg,/Cone · α = 0°/);assert.doesNotMatch(v.svg,/NaN|Infinity/);
 const c=coneGeometry(r.cone),z=r.cone.history[10],q=probeBody(d.scene,x,640+c.x+c.length*.5,30+c.y-c.length*.5*Math.tan(z.theta));near(q.M,z.M);
});
test('Default cone retains original reference plots and hides wedge incidence',()=>{let x=defaults('cone');assert.equal(x.bodyGeometry,'Cone');assert.ok(!inputDefinitions('cone',x).some(f=>f.key==='wedgeAlpha'));const d=calculate('cone',x);assert.ok(d.result.history&&d.result.referenceTable);assert.equal(plotOptions(d).length,10);x.bodyGeometry='Wedge';assert.ok(inputDefinitions('cone',x).some(f=>f.key==='wedgeAlpha'));});
test('Wedge contour probe respects each face and expansion fan and excludes solid',()=>{
 for(const alpha of [0,12,-12]){const w=solveWedge({M:3,thetaCone:10,wedgeAlpha:alpha}),dx=80;assert.equal(probeWedge(w,165+dx,150),null);for(const f of w.faces){const angle=f.wall+f.sign*.01,z=probeWedge(w,165+dx,150-dx*Math.tan(angle));assert.ok(z);near(z.M,f.surface.M);if(f.kind==='Expansion fan'){const head=w.alpha+f.sign*Math.asin(1/w.M),tail=f.wall+f.sign*Math.asin(1/f.surface.M),a=(head+tail)/2,p=probeWedge(w,165+dx,150-dx*Math.tan(a));assert.ok(p.M>w.M&&p.M<f.surface.M);}}}
});

test('Wedge body and accepted gas layers reach the view edge without a false freestream strip',()=>{
 const w=solveWedge({M:2.6443,thetaCone:10.1,wedgeAlpha:-20});
 for(const f of w.faces){const angle=f.wall+f.sign*.02;for(const dx of [380,460]){const z=probeWedge(w,165+dx,150-dx*Math.tan(angle));assert.ok(z);near(z.M,f.surface.M);near(z.p,f.surface.p);}}
 const x={...defaults('cone'),bodyGeometry:'Wedge',M:2.6443,thetaCone:10.1,wedgeAlpha:-20},d=calculate('cone',x),v=sceneSVG(d.scene,x);assert.ok(v.svg.includes('640,'));assert.doesNotMatch(v.svg,/NaN|Infinity/);
});
