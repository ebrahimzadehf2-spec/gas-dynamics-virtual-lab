import test from 'node:test';
import assert from 'node:assert/strict';
import {fannoExamples,fannoExample} from './fanno-examples.js';
import {calculate,defaults} from './labs.js';
import {migrateFannoInputs,fannoConditions} from './fanno-system.js';
const solve=(n,extra={})=>calculate('fanno',migrateFannoInputs({...defaults('fanno'),...fannoExample(n).inputs,...extra}));
const near=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const value=(d,name)=>d.rows.find(r=>r.label===name).value;
test('All six book examples load valid distinct problems',()=>{
 assert.deepEqual(fannoExamples.map(x=>x.number),[1,2,3,4,5,6]);
 for(let n=1;n<=6;n++)assert.ok(solve(n).result.s2.M>0);
 near(solve(1).result.s2.M,.709257);
 near(solve(1).result.s2.p/1000,125.2332);
 near(value(solve(2),'Required duct length'),.184954,.00001);
 near(value(solve(2),'Maximum duct length'),.269985,.00001);
 near(solve(3).result.supplyPressure/1000,4871.6966,.01);
 near(solve(4).result.lambda,.172343,.00001);
});
test('Example 5 covers each requested shock station; example 6 recovers the specified duct inlet',()=>{
 const pressures=[2,3,4].map(i=>solve(5,{fannoCondition:fannoConditions[i]}).result.backPressure);
 assert.ok(pressures[0]>pressures[1]&&pressures[1]>pressures[2]);
 near(pressures[0]/1000,1004.8267,.01);
 const r=solve(6).result;
 near(r.s1.M,3);near(r.s1.T,300);near(r.s2.p/1000,50.66);
 near((r.shockX-1)/.05,28.9572,.001);
});
