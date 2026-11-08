import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults} from './labs.js';
import {coneGeometry,probeCone} from './cone-probe.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
test('Cone probe recovers surface, post-shock and integrated interior states on either side',()=>{
 const x=defaults('cone'),r=calculate('cone',x).result,z=coneGeometry(r),dx=.7*z.length;
 for(const state of [r.history[0],r.history.at(-1),r.history[Math.floor(r.history.length/2)]])for(const sign of [-1,1]){
  const v=probeCone(r,x,z.x+dx,z.y+sign*dx*Math.tan(state.theta));assert.ok(v);for(const key of ['M','p','T','rho'])near(v[key],state[key]);near(v.u,v.M/x.M*Math.sqrt(v.T));
 }
 const t=(r.history[10].theta+r.history[11].theta)/2,v=probeCone(r,x,z.x+dx,z.y-dx*Math.tan(t));assert.ok(v&&Object.values(v).every(Number.isFinite));near(v.T*(1+(x.gamma-1)*v.M*v.M/2),1+(x.gamma-1)*x.M*x.M/2);
});
test('Cone probe never assigns gas states to the solid, apex or exterior',()=>{
 const x=defaults('cone'),r=calculate('cone',x).result,z=coneGeometry(r);
 for(const [a,b] of [[z.x,z.y],[z.x-1,z.y],[z.x+20,z.y],[z.x+z.length+1,z.y-100],[z.x+20,z.y-20*Math.tan(r.beta+.1)],[NaN,0]])assert.equal(probeCone(r,x,a,b),null);
});
