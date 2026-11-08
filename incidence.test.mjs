import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {obliqueShock,expansion,rad} from './physics.js';
import {solveInteraction} from './wave-interaction.js';
import {cone} from './cone.js';
import {sceneSVG,chartSVG} from './graphics.js';
import {plotOptions} from './plot-options.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('Chapter 6 lower-face turns include signed incidence and preserve the fixed body wall angle',()=>{
 for(const alpha of [-5,0,5]){
  const x={...defaults('oblique'),alpha},d=calculate('oblique',x),ref=obliqueShock(x.M1,rad(x.theta-alpha),x.gamma,x.branch);near(d.result.M2,ref.M2);near(d.result.p,ref.p);near(d.scene.bodyAngle,rad(x.theta));near(d.scene.alpha,rad(alpha));near(d.scene.alpha+d.scene.theta,d.scene.bodyAngle);
  const y={...defaults('expansion'),alpha},e=calculate('expansion',y),ex=expansion(y.M1,rad(y.theta+alpha),y.gamma);near(e.result.M2,ex.M2);near(e.result.p,ex.p);near(e.scene.alpha-e.scene.theta,e.scene.bodyAngle);
 }
 assert.throws(()=>calculate('oblique',{...defaults('oblique'),theta:2,alpha:5}),/expansion/);
 assert.throws(()=>calculate('expansion',{...defaults('expansion'),theta:2,alpha:-5}),/compresses/);
});
test('Incident shock geometry uses global angles; slip pressure and direction still match',()=>{
 for(const interactionType of ['Opposing shocks','Same-direction shocks'])for(const alpha of [-3,3]){
  const r=solveInteraction({M1:4,thetaUpper:10,thetaLower:10,alpha,interactionType}),z=r.geometry;
  near(z.B[1],z.B[0]*Math.tan(rad(alpha)+r.n2.beta));
  near(z.B[1]-z.C[1],(z.B[0]-z.C[0])*Math.tan(r.same?rad(10)+r.n3.beta:rad(alpha)-r.n3.beta));
  near(r.regions[1].theta,rad(alpha));near(r.regions[2].theta,rad(10));near(r.regions[4].p,r.regions[5].p,1e-5);near(r.regions[4].theta,r.regions[5].theta);
 }
 const positive=solveInteraction({alpha:3,thetaUpper:10,thetaLower:10}),negative=solveInteraction({alpha:-3,thetaUpper:10,thetaLower:10});near(positive.delta,-negative.delta);
 assert.throws(()=>solveInteraction({alpha:12,thetaUpper:10}),/compression shocks/);
});
test('Angle-of-attack inputs and drawn inlet vectors are synchronized in chapters 6, 9 and 10',()=>{
 for(const id of ['oblique','expansion','collision','linear','cone']){
  const x={...defaults(id),alpha:3},d=calculate(id,x),v=sceneSVG(d.scene,x);assert.ok(inputDefinitions(id,x).some(f=>f.key==='alpha'));assert.match(v.svg,/data-incidence="3(?:\.0*)?"/);assert.match(v.svg,/data-flow-angle="3(?:\.0*)?"/);assert.ok(!/NaN|Infinity/.test(v.svg));for(const p of plotOptions(d))assert.ok(!/NaN|Infinity/.test(chartSVG(p.chart).svg));
 }
 const a=calculate('linear',{...defaults('linear'),alpha:3}),b=calculate('linear',{...defaults('linear'),alpha:-3});near(a.result.CL,-b.result.CL);near(a.result.CD,b.result.CD);near(a.result.CpUF,b.result.CpLF);
});
test('Nonzero cone incidence has geometry only and cannot reuse axisymmetric states or contours',()=>{
 const x={...defaults('cone'),alpha:5},d=calculate('cone',x),s=sceneSVG(d.scene,x);assert.equal(d.result.status,'geometry-only');assert.equal(d.scene.kind,'coneIncidence');assert.equal(s.field,null);assert.equal(d.result.surface,undefined);assert.equal(d.result.referenceTable,undefined);assert.equal(d.result.relations,undefined);assert.equal(d.shockDetails.length,0);assert.ok(plotOptions(d).every(p=>p.key==='geometry'));assert.throws(()=>cone(x),/zero angle of attack/);
 const zero=calculate('cone',{...x,alpha:0});assert.equal(zero.result.status,'ok');assert.ok(zero.result.surface&&zero.result.referenceTable);assert.ok(sceneSVG(zero.scene,{...x,alpha:0}).field);
 assert.throws(()=>calculate('cone',{...x,thetaCone:NaN}));assert.throws(()=>calculate('cone',{...x,alpha:NaN}));
});
