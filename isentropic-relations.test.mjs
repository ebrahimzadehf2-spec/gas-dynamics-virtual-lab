import test from 'node:test';
import assert from 'node:assert/strict';
import {isentropicRelations} from './physics.js';
import {calculate,defaults} from './labs.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
test('Isentropic results reproduce the M=2, gamma=1.4 reference table',()=>{
 const r=isentropicRelations(2,1.4);
 const reference={machAngle:30,pmAngle:26.37976081,pP0:.12780452,rhoRho0:.23004814,TT0:.55555555,pPstar:.24192491,rhoRhostar:.36288736,TTstar:.66666666,areaRatio:1.6875};
 for(const [k,v] of Object.entries(reference))near(r[k],v);
});
test('Sonic and zero-speed limits and subsonic angle domains are explicit',()=>{
 const a=isentropicRelations(1);for(const k of ['pPstar','rhoRhostar','TTstar','areaRatio'])near(a[k],1,1e-12);near(a.machAngle,90);near(a.pmAngle,0);
 const b=isentropicRelations(.5);assert.equal(b.machAngle,null);assert.equal(b.pmAngle,null);assert.ok(b.areaRatio>1);
 const c=isentropicRelations(0);assert.equal(c.areaRatio,null);assert.equal(c.areaUnbounded,true);for(const k of ['pP0','rhoRho0','TT0'])near(c[k],1,1e-12);
 for(const m of [-1,NaN,Infinity])assert.throws(()=>isentropicRelations(m));assert.throws(()=>isentropicRelations(2,1));
});
test('Ratios are independent of dimensional conditions and included in exports',()=>{
 const x=defaults('foundations'),a=calculate('foundations',x),b=calculate('foundations',{...x,T1:900,p1:650});assert.deepEqual(a.result.relations,b.result.relations);
 assert.equal(a.rows.filter(r=>r.panel==='isentropic').length,10);assert.ok(a.rows.some(r=>r.label==='p/p*'));assert.notDeepEqual(isentropicRelations(2,1.67),isentropicRelations(2,1.4));
});
