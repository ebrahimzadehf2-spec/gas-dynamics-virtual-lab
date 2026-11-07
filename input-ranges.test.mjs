import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {gasPresets,selectGas} from './gas-properties.js';
import {machFields} from './input-ranges.js';
import {sceneSVG,chartSVG} from './graphics.js';
import {plotOptions} from './plot-options.js';
import {coneFromShock} from './cone.js';
const caps={foundations:50,normal:50,balances:50,rayleigh:50,fanno:50,oblique:20,expansion:20,collision:20,linear:20,cone:10,nozzle:20};
function upper(id,name){let x=selectGas(defaults(id),name);if(id==='nozzle')x.nozzleType='Diverging';const key=machFields(id,x)[0];x[key]=caps[id];if(id==='expansion')x.theta=2;return {x,key};}
test('Upper Mach bounds produce finite results, scenes and selectable plots for every named gas',()=>{
 for(const [id,cap] of Object.entries(caps))for(const name of Object.keys(gasPresets)){
  const {x,key}=upper(id,name),d=calculate(id,x);assert.equal(x[key],cap);assert.ok(d.rows.every(r=>r.value===null||Number.isFinite(r.value)),id+' '+name);
  assert.ok(!/NaN|Infinity|undefined/.test(sceneSVG(d.scene,x).svg),id+' '+name);
  for(const o of plotOptions(d))assert.ok(!/NaN|Infinity|undefined/.test(chartSVG(o.chart).svg),id+' '+name+' '+o.key);
 }
});
test('Slider upper bounds match numerical input bounds and values are preserved',()=>{
 for(const [id,cap] of Object.entries(caps)){
  const {x,key}=upper(id,'Air'),field=inputDefinitions(id,x).find(f=>f.key===key);assert.equal(field.max,cap);assert.equal(field.sliderMax,field.max);assert.equal(calculate(id,x).inputs[key],cap);assert.throws(()=>calculate(id,{...x,[key]:cap+1}));
 }
});
test('High-Mach normal shock still closes conservation; critical and invalid wave domains are preserved',()=>{
 const d=calculate('normal',{...defaults('normal'),M1:50});for(const residual of Object.values(d.checks))assert.ok(residual<1e-8);
 assert.equal(calculate('foundations',{...defaults('foundations'),M:0}).result.relations.areaUnbounded,true);
 assert.throws(()=>calculate('normal',{...defaults('normal'),M1:.9}));
 assert.throws(()=>calculate('expansion',{...defaults('expansion'),M1:20,theta:60}));
 assert.throws(()=>calculate('oblique',{...defaults('oblique'),M1:20,theta:60}));
});
test('Cone at the expanded upper bound agrees with a tighter independent integration step',()=>{
 const x={...defaults('cone'),M:10},a=calculate('cone',x).result,b=coneFromShock(x.M,a.beta,x.gamma,{step:.0003,tolerance:1e-12});assert.ok(Math.abs(a.thetaCone-b.thetaCone)<1e-7);assert.ok(Math.abs(a.surface.M-b.surface.M)<1e-7);
});
