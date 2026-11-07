import test from 'node:test';
import assert from 'node:assert/strict';
import {controlVolume,controlVolumePreset} from './control-volume.js';
import {calculate,defaults} from './labs.js';
import {sceneSVG} from './graphics.js';
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≠ ${b}`);
test('Nozzle and shock examples close all balances and satisfy adiabatic entropy restriction',()=>{
 for(const kind of ['nozzle','shock']){const r=controlVolume(controlVolumePreset(kind));assert.equal(r.status,'balanced');for(const t of Object.values(r.terms))assert.ok(t.relative<1e-10);assert.ok(r.ds>=-1e-8);}
 const s=controlVolume(controlVolumePreset('shock'));close(s.b.M,1/Math.sqrt(3));close(s.b.p/s.a.p,4.5);close(s.Fx,0);close(s.a.T0,s.b.T0);
});
test('Outlet pressure perturbation changes actual mass flux and is not accepted as steady',()=>{
 const x=controlVolumePreset(),base=controlVolume(x),r=controlVolume({...x,p2:x.p2*1.1});close(r.m2,1.1*base.m2);close(r.terms.mass.residual,-.1*base.m1);assert.equal(r.status,'unbalanced');
 const solved=controlVolume({...x,p2:x.p2*1.1,balanceMode:'Solve outlet speed'});close(solved.m1,solved.m2);assert.ok(solved.terms.mass.passed);assert.equal(solved.balanced,false);
});
test('Independent dimensional example checks area conversion, force, heat and work signs',()=>{
 const R=287,gamma=1.4,T=300,p=100000,u1=100,u2=50,A1=.01,A2=.02,m=p/(R*T)*u1*A1;
 const force=m*(u2-u1)-p*(A1-A2),heat=m*(u2*u2-u1*u1)/2;
 const x={balanceMode:'Solve outlet speed',M1:u1/Math.sqrt(gamma*R*T),T1:T,p1:p/1000,A1:A1*1e4,T2:T,p2:p/1000,A2:A2*1e4,Qdot:heat/1000,Wdot:0,Fx:force,gamma,R};
 const r=controlVolume(x);close(r.b.u,u2);close(r.m1,m);close(r.forceRequired,force);assert.equal(r.status,'balanced');
 close(controlVolume({...x,Qdot:x.Qdot+1}).terms.energy.residual,1000);close(controlVolume({...x,Wdot:1}).terms.energy.residual,-1000);close(controlVolume({...x,Fx:force+10}).terms.momentum.residual,10);
});
test('Conservation alone cannot accept the entropy-decreasing reverse shock',()=>{
 const a=controlVolumePreset('shock'),r=controlVolume({...a,M1:a.M2,T1:a.T2,p1:a.p2,M2:a.M1,T2:a.T1,p2:a.p1,Fx:0});assert.ok(r.balanced);assert.equal(r.status,'entropy-violation');
});
test('Control volume rejects invalid inputs and renders a labeled endpoint scene',()=>{
 const x=defaults('balances');for(const bad of [{A1:0},{R:0},{gamma:1},{M2:NaN},{p2:-1},{Qdot:Infinity}])assert.throws(()=>controlVolume({...x,...bad}));
 const data=calculate('balances',x);assert.equal(data.scene.kind,'balance');
 for(const q of ['pressure','mach','temperature','density']){const v=sceneSVG(data.scene,x,.001,q);assert.ok(v.field);assert.ok(!/NaN|undefined/.test(v.svg));assert.match(v.svg,/INTERIOR NOT RESOLVED/);}
});
