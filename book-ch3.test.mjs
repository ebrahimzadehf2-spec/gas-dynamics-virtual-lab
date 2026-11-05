import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalShock,state,conservation} from './physics.js';
import {calculate} from './labs.js';
const fixtures=JSON.parse(readFileSync(new URL('./book-ch3-reference.json',import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-11*Math.max(1,Math.abs(b)),`${a} vs ${b}`);
for(const c of fixtures.cases)test(`Book example ${c.id}: independent conservation reference and displayed units`,()=>{
 const n=normalShock(c.input.M1,c.input.gamma),r=c.reference;
 for(const key of ['M2','p','T','rho','u','p0','ds_R'])near(n[key],r[key]);
 const d=calculate('normal',c.input),rows=Object.fromEntries(d.rows.map(x=>[x.label,x]));
 for(const [name,key,unit] of [['Downstream pressure','p2_kPa','kPa'],['Downstream temperature','T2_K','K'],['Upstream stagnation pressure','p01_kPa','kPa'],['Downstream stagnation pressure','p02_kPa','kPa'],['Specific entropy increase','ds_kJkgK','kJ/(kg·K)']]){
  assert.equal(rows[name].unit,unit);near(rows[name].value,r[key]);
 }
 const s1=state(c.input.M1,c.input.T1,c.input.p1*1000),s2=d.scene.s2;
 for(const v of Object.values(conservation(s1,s2)))assert.ok(v<1e-12);
 near(s1.T0,s2.T0);assert.ok(s2.p0<s1.p0&&s2.M<1&&n.ds_R>0);
});
test('Book 3-2: ratios independent of arbitrary upstream pressure and temperature',()=>{
 const ref=fixtures.cases[1].reference;
 for(const [T1,p1] of [[220,20],[600,900]]){
  const d=calculate('normal',{M1:1.8,T1,p1,gamma:1.4});
  near(d.scene.s2.T/T1,ref.T);near(d.scene.s2.p/(p1*1000),ref.p);near(d.result.ds_R,ref.ds_R);
 }
});
