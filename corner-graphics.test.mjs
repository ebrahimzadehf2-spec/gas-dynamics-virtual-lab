import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {sceneSVG} from './graphics.js';
test('Textbook corner drawings have one horizontal approach wall and one ramp without a vertical face',()=>{
 for(const id of ['oblique','expansion'])for(const alpha of [-5,0,5]){
  const x={...defaults(id),alpha,cornerView:'Textbook schematic'},d=calculate(id,x),v=sceneSVG(d.scene,x);assert.equal(x.cornerView,'Textbook schematic');assert.equal(v.field,null);assert.ok(inputDefinitions(id,x).some(f=>f.key==='cornerView'));
  const wall=v.svg.match(/data-corner-wall="true" points="([^"]+)"/)[1].split(' ').map(s=>s.split(',').map(Number));assert.equal(wall.length,3);assert.equal(wall[0][1],wall[1][1]);assert.ok(wall[2][0]>wall[1][0]);assert.ok(id==='oblique'?wall[2][1]<wall[1][1]:wall[2][1]>wall[1][1]);assert.match(v.svg,/data-streamline=/);assert.match(v.svg,/clip-path="url\(#cornerGas\)"/);assert.ok(!/NaN|Infinity/.test(v.svg));
 }
});
test('Analytical contours remain available and do not change scientific wave results',()=>{
 for(const id of ['oblique','expansion']){
  const x=defaults(id),a=calculate(id,x),b=calculate(id,{...x,cornerView:'Analytical contours'});assert.deepEqual(a.result,b.result);
  for(const q of ['pressure','mach','temperature','density','speed']){
   const v=sceneSVG(b.scene,b.inputs,.001,q);assert.equal(v.field.quantity,q);assert.ok(Number.isFinite(v.field.min)&&Number.isFinite(v.field.max));assert.ok(!/NaN|Infinity/.test(v.svg));
  }
 }
});

test('Colored contours are the default, share their muted legend palette and recover speed ratios',()=>{
 for(const id of ['oblique','expansion']){
  const x=defaults(id);assert.equal(x.cornerView,'Analytical contours');const d=calculate(id,x),v=sceneSVG(d.scene,x,.001,'speed');assert.equal(v.field.units,'u/u₁');assert.equal(v.field.palette.length,7);const lo=Math.min(1,d.result.M2/x.M1*Math.sqrt(d.result.T)),hi=Math.max(1,d.result.M2/x.M1*Math.sqrt(d.result.T));assert.ok(Math.abs(v.field.min-lo)<1e-10&&Math.abs(v.field.max-hi)<1e-10);assert.ok(v.svg.includes(v.field.palette[0])&&v.svg.includes(v.field.palette.at(-1)));
 }
});
