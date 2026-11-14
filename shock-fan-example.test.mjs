import test from 'node:test';import assert from 'node:assert/strict';
import {calculate,defaults,inputDefinitions} from './labs.js';import {shockFanPreset} from './shock-fan-example.js';import {plotOptions} from './plot-options.js';import {sceneSVG} from './graphics.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('Example 6-7 recovers absolute slip direction and pressure-matched final streams',()=>{
 const x={...defaults('wall'),...shockFanPreset},d=calculate('wall',x),r=d.result;
 near(r.slipAngle,20.026710972);near(r.regions[1].p0/1000,482.65);near(r.regions[2].M,1.593769276);near(r.regions[3].M,2.328428091);near(r.regions[4].p/1000,66.745945993);near(r.regions[4].p,r.regions[5].p);near(r.regions[4].theta,r.regions[5].theta);
 for(const z of Object.values(r.regions))near(z.T0,r.s1.T0);
 near(r.regions[3].p0,r.s1.p0);assert.ok(r.regions[2].p0<r.s1.p0);assert.ok(r.regions[5].p0<r.regions[3].p0);
 assert.ok(inputDefinitions('wall',x).some(f=>f.key==='fanShockAngle'));assert.equal(plotOptions(d).length,1);
 for(const q of ['pressure','mach','temperature','density','speed'])assert.ok(!/NaN|undefined|Infinity/.test(sceneSVG(d.scene,x,0,q).svg));
});
