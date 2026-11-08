import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {obliqueShock,expansion,rad} from './physics.js';
import {solveInteraction} from './wave-interaction.js';
import {cone} from './cone.js';
import {sceneSVG,chartSVG} from './graphics.js';
import {plotOptions} from './plot-options.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('Chapter 6 fixes inlet flow horizontally and ignores legacy incidence values',()=>{
 for(const id of ['oblique','expansion','collision']){
  const base=defaults(id);assert.equal('alpha' in base,false);assert.ok(!inputDefinitions(id,base).some(f=>f.key==='alpha'));
  const reference=calculate(id,base);
  for(const alpha of [-5,5,NaN]){const d=calculate(id,{...base,alpha});assert.deepEqual(d.result,reference.result);const v=sceneSVG(d.scene,d.inputs);assert.doesNotMatch(v.svg,/data-incidence=|α =/);assert.ok(!/NaN|Infinity/.test(v.svg));}
 }
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
test('Chapter 9 angle-of-attack input and drawn inlet vector remain synchronized',()=>{
 for(const id of ['linear']){
  const x={...defaults(id),alpha:3},d=calculate(id,x),v=sceneSVG(d.scene,x);assert.ok(inputDefinitions(id,x).some(f=>f.key==='alpha'));assert.match(v.svg,/data-incidence="3(?:\.0*)?"/);assert.match(v.svg,['oblique','expansion'].includes(id)?/data-flow-angle="0"/:/data-flow-angle="3(?:\.0*)?"/);assert.ok(!/NaN|Infinity/.test(v.svg));for(const p of plotOptions(d))assert.ok(!/NaN|Infinity/.test(chartSVG(p.chart).svg));
 }
 const a=calculate('linear',{...defaults('linear'),alpha:3}),b=calculate('linear',{...defaults('linear'),alpha:-3});near(a.result.CL,-b.result.CL);near(a.result.CD,b.result.CD);near(a.result.CpUF,b.result.CpLF);
});
test('Cone interface is zero-incidence only and the engine rejects nonzero incidence',()=>{
 const x=defaults('cone');assert.equal('alpha' in x,false);assert.ok(!inputDefinitions('cone',x).some(f=>f.key==='alpha'));
 for(const alpha of [-5,5,NaN]){assert.throws(()=>calculate('cone',{...x,alpha}),/zero angle of attack/);assert.throws(()=>cone({...x,alpha}),/zero angle of attack/);}
 const d=calculate('cone',x);assert.equal(d.result.status,'ok');assert.equal(d.scene.kind,'cone');assert.ok(d.result.surface&&d.result.referenceTable);const scene=sceneSVG(d.scene,x);assert.ok(scene.field);assert.doesNotMatch(scene.svg,/data-incidence=/);
});
