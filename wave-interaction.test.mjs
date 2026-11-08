import test from 'node:test';
import assert from 'node:assert/strict';
import {solveInteraction} from './wave-interaction.js';
import {collision,rad} from './physics.js';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {sceneSVG} from './graphics.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
test('Opposing interaction recovers existing independently validated pressure and signed direction',()=>{
 const x={M1:4,thetaUpper:10,thetaLower:20},r=solveInteraction(x),old=collision(x);
 near(r.delta,old.delta);near(r.p4,old.p4);near(r.p5,old.p5);
 const sy=solveInteraction({...x,thetaLower:10});near(sy.slipAngle,0);near(sy.regions[4].M,sy.regions[5].M);
});
test('Same-direction book geometry selects expansion and increases signed flow angle',()=>{
 const r=solveInteraction({M1:3,p1:100,thetaUpper:10,thetaLower:10,interactionType:'Same-direction shocks'});
 near(r.slipAngle,20.1426632123);assert.equal(r.a.kind,'Expansion fan');assert.equal(r.b.kind,'Oblique shock');
 assert.ok(r.slipAngle>20);assert.ok(r.regions[4].p<r.regions[3].p);assert.ok(r.regions[4].M>r.regions[3].M);
 near(r.regions[4].p,r.regions[5].p);near(r.regions[4].p0,r.regions[3].p0);
});
test('Each shock conserves normal mass and momentum, tangential speed and total enthalpy',()=>{
 for(const interactionType of ['Opposing shocks','Same-direction shocks']){
  const r=solveInteraction({M1:3,thetaUpper:10,thetaLower:10,interactionType});
  for(const w of r.waves.filter(w=>w.kind==='Oblique shock')){
   const a=w.before,b=w.after,theta=Math.abs(b.theta-a.theta),un1=a.u*Math.sin(w.beta),un2=b.u*Math.sin(w.beta-theta);
   near(a.rho*un1,b.rho*un2);near(a.p+a.rho*un1**2,b.p+b.rho*un2**2);
   near(a.u*Math.cos(w.beta),b.u*Math.cos(w.beta-theta));near(a.T0,b.T0);assert.ok(b.p0<a.p0);
  }
 }
});
test('Custom geometry intersects actual incident rays; uniform scaling leaves all flow states unchanged',()=>{
 for(const interactionType of ['Opposing shocks','Same-direction shocks']){
  const x={M1:3,thetaUpper:10,thetaLower:10,interactionType,geometryMode:'Custom geometry',channelHeight:2,cornerSpacing:interactionType==='Opposing shocks'?.2:1},a=solveInteraction(x),b=solveInteraction({...x,channelHeight:6,cornerSpacing:x.cornerSpacing*3});
  near(b.geometry.B[0],3*a.geometry.B[0]);near(b.geometry.B[1],3*a.geometry.B[1]);near(a.delta,b.delta);near(a.p4,b.p4);
  const z=a.geometry;near(z.B[1],Math.tan(a.n2.beta)*z.B[0]);near(z.B[1]-z.C[1],Math.tan(a.same?rad(10)+a.n3.beta:-a.n3.beta)*(z.B[0]-z.C[0]));
  near(z.fields.reduce((s,c)=>s+area(c.poly),0),area(z.domain));assert.ok(z.endX<z.firstWallX);
 }
});
test('Incompatible corner geometry and unsupported shock patterns fail explicitly',()=>{
 assert.throws(()=>solveInteraction({interactionType:'Same-direction shocks',geometryMode:'Custom geometry',cornerSpacing:1,channelHeight:.2}),/inside this geometry/);
 assert.throws(()=>solveInteraction({interactionType:'Same-direction shocks',geometryMode:'Custom geometry',cornerSpacing:0,channelHeight:2}),/positive separation/);
 assert.throws(()=>solveInteraction({M1:1.2,thetaUpper:20,thetaLower:20}),/Attached-shock limit/);
 assert.throws(()=>solveInteraction({thetaUpper:NaN}),/corner turns/);
});
test('Both UI geometry modes expose correct inputs and produce finite contours and complete shock reports',()=>{
 for(const interactionType of ['Opposing shocks','Same-direction shocks'])for(const geometryMode of ['Educational','Custom geometry']){
  const x={...defaults('collision'),interactionType,geometryMode},d=calculate('collision',x);
  assert.equal(inputDefinitions('collision',x).some(f=>f.key==='channelHeight'),geometryMode==='Custom geometry');
  assert.equal(d.shockDetails.length,interactionType==='Opposing shocks'?4:3);
  for(const q of ['pressure','mach','temperature','density']){
   const v=sceneSVG(d.scene,x,.001,q);assert.ok(Number.isFinite(v.field.min)&&Number.isFinite(v.field.max));assert.ok(!/NaN|Infinity/.test(v.svg));
  }
 }
});
