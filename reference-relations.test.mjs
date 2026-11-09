import test from 'node:test';
import assert from 'node:assert/strict';
import {sonicRelations,conicalRelations} from './reference-relations.js';
import {calculate,defaults} from './labs.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('Sonic reference ratios are unity; entropy deficit and Fanno sonic length vanish',()=>{
 for(const kind of ['fanno','rayleigh'])for(const g of [1.2,1.4,5/3]){
  const r=sonicRelations(kind,1,g);for(const k of ['T','p','p0','u','rho'])near(r[k],1);near(r.entropyToStar,0);if(kind==='fanno')near(r.F,0);else near(r.T0,1);
 }
});
test('Reference tables recover independent M=2 Fanno and Rayleigh ratios and entropy signs',()=>{
 const f=sonicRelations('fanno',2);near(f.T,2/3);near(f.p,1/Math.sqrt(6));near(f.u,Math.sqrt(8/3));near(f.p0,1.6875);near(f.F,.3049965025814798);near(f.entropyToStar,Math.log(1.6875));
 const r=sonicRelations('rayleigh',2);near(r.p,4/11);near(r.T,64/121);near(r.T0,96/121);near(r.u,16/11);near(r.entropyToStar,Math.log(4/11)-3.5*Math.log(64/121));
});
test('Inlet and outlet use their own local Mach and retain only inlet for rejected outlet states',()=>{
 for(const kind of ['fanno','rayleigh']){
  const x=defaults(kind),d=calculate(kind,x),t=d.result.referenceTable;assert.deepEqual(t.columns,['Inlet','Outlet']);assert.equal(t.rows[0].values[0],d.result.s1.M);assert.equal(t.rows[0].values[1],d.result.s2.M);
  const get=label=>t.rows.find(r=>r.label===label).values,ent=get('(s* − s)/R');near(ent[0]-ent[1],d.result.ds_R);assert.ok(d.rows.some(r=>r.panel==='reference'));
  const rejected=calculate(kind,{...x,...(kind==='fanno'?{lambda:1000}:{q:1e8})});assert.deepEqual(rejected.result.referenceTable.columns,['Inlet']);
 }
});
test('M5, 20-degree cone agrees with independent DOP853 reference and preserves post-shock isentropy',()=>{
 const x={...defaults('cone'),M:5,thetaCone:20},d=calculate('cone',x),r=d.result.relations;
 near(r.waveAngle,24.942724376,2e-6);near(r.surfaceMach,3.37519771,2e-7);near(r.pcp1,5.55824565,2e-7);near(r.p02p01,r.p0cp01,1e-10);near(r.rho2rho1*r.T2T1,r.p2p1);near(r.rhocRho1*r.TcT1,r.pcp1);assert.ok(r.shockTurn<r.coneAngle&&r.coneAngle<r.waveAngle);assert.ok(r.pcp1>r.p2p1);assert.equal(d.result.referenceTable.rows.length,15);
});
