import test from 'node:test';
import assert from 'node:assert/strict';
import {externalJet} from './jet.js';
import {defaults,calculate,inputDefinitions} from './labs.js';
import {sceneSVG,chartSVG} from './graphics.js';
import {shockLimit,normalShock} from './physics.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
test('external expansion matches independent PM derivative quadrature and isentropic pressure reference',()=>{
 const s=externalJet({M:2,p:100000,T:300,pb:21301.032655337905});assert.equal(s.status,'expansion');near(s.outlet.M,3);near(s.outlet.T,192.85714285714286);near(s.theta,.40801584566260085);near(s.head,-.5235987755982989);near(s.tail,.06817893620847892);near(s.outlet.p,21301.032655337905,1e-7);near(s.p02p01,1);
 for(let i=0;i<s.samples.length;i++){let z=s.samples[i];near(z.T0,s.inlet.T0,1e-8);near(z.p0,s.inlet.p0,1e-6);if(i)assert.ok(z.M>s.samples[i-1].M&&z.p<s.samples[i-1].p);}
});
test('external oblique shock matches an independent dimensional normal-velocity quadratic and vector rotation',()=>{
 const s=externalJet({M:3,p:100000,T:300,pb:417168.0400581947});assert.equal(s.status,'shock');near(s.beta,.6981317007977318);near(s.theta,-.3812864012778642);near(s.outlet.M,1.894242434234539);near(s.outlet.T,489.0457023186288);near(s.p02p01,.7542448560717583);assert.ok(Object.values(s.checks).every(z=>z<1e-10));assert.ok(s.outlet.p>s.inlet.p&&s.outlet.p0<s.inlet.p0);near(s.outlet.T0,s.inlet.T0);
});
test('matched, sonic, no-flow, subsonic and unresolved compression states are distinguished',()=>{
 for(const M of [.2,1,2]){let s=externalJet({M,pb:100000});assert.equal(s.status,'matched');near(s.theta,0);near(s.outlet.M,M);}
 assert.equal(externalJet({M:0}).status,'no-flow');assert.equal(externalJet({M:.5}).status,'subsonic-limit');
 const sonic=externalJet({M:1,pb:50000});assert.equal(sonic.status,'expansion');near(sonic.head,-Math.PI/2);assert.ok(sonic.outlet.M>1&&sonic.theta>0);
 assert.equal(externalJet({M:1,pb:120000}).status,'compression-limit');
 const lim=shockLimit(2),max=normalShock(2*Math.sin(lim.beta)).p;
 assert.equal(externalJet({M:2,pb:100000*max}).status,'shock');const no=externalJet({M:2,pb:100000*max*1.001});assert.equal(no.outlet,null);assert.equal(no.status,'compression-limit');assert.ok(no.message.includes('does not select'));
 assert.equal(externalJet({M:1,pb:1e-20}).status,'turn-limit');
});
test('external model rejects nonphysical gas, Mach and pressure inputs',()=>{
 for(const x of [{M:NaN},{M:-1},{p:0},{pb:0},{T:-1},{gamma:1},{R:0},{pb:Infinity}])assert.throws(()=>externalJet(x));
});
test('external nozzle view uses actual exit states, correct ambient boundary and finite scientific graphics',()=>{
 const base={...defaults('nozzle'),nozzleView:'External waves',areaRatio:3};
 for(const backRatio of [.02,.05,.2,.5])for(const plotProperty of ['Pressure','Mach number','Temperature']){
  const x={...base,backRatio,plotProperty},d=calculate('nozzle',x);assert.equal(d.scene.kind,'jet');near(d.result.external.inlet.M,d.result.Me);near(d.result.external.ratio,backRatio*d.result.p0/d.result.exitPressure);
  for(const svg of [sceneSVG(d.scene,x).svg,chartSVG(d.chart).svg])assert.ok(!/NaN|Infinity|undefined/.test(svg));
 }
 const div={...base,nozzleType:'Diverging',MIn:2,outletCondition:'Matched isentropic',ambientRatio:.01};assert.ok(inputDefinitions('nozzle',div).some(z=>z.key==='ambientRatio'));const d=calculate('nozzle',div);near(d.result.external.outlet.p,d.result.p0*.01,1e-6);assert.equal(d.result.external.status,'expansion');
 const c=calculate('nozzle',{...base,nozzleType:'Converging',backRatio:.2});assert.equal(c.result.external.status,'expansion');near(c.result.external.inlet.M,1);
});
test('angle directions and jump geometry remain valid across gases and moderate Mach numbers',()=>{
 for(const gamma of [1.2,1.4,5/3])for(const M of [1.05,2,4]){
  const e=externalJet({M,gamma,pb:70000});assert.ok(e.theta>0&&e.tail>e.head);assert.ok(Object.values(e.checks).every(z=>z<1e-9));
  const l=shockLimit(M,gamma),ratio=normalShock(M*Math.sin(l.beta),gamma).p,pb=100000*(1+(ratio-1)*.5),s=externalJet({M,gamma,pb});assert.equal(s.status,'shock');assert.ok(s.theta<0&&-s.theta<s.beta);assert.ok(Object.values(s.checks).every(z=>z<1e-9));
 }
});
test('complete-nozzle view preserves local wave states and distinguishes first interaction from sonic schematic',()=>{
 const base={...defaults('nozzle'),nozzleType:'Converging–diverging',areaRatio:3};
 for(const backRatio of [.02,.1,.32,.5,.04729869168295054]){
  const local=calculate('nozzle',{...base,backRatio,nozzleView:'External waves'}),full=calculate('nozzle',{...base,backRatio,nozzleView:'Nozzle + external waves'});
  assert.equal(full.scene.kind,'nozzleJet');assert.equal(full.result.external.status,local.result.external.status);near(full.result.external.theta,local.result.external.theta);near(full.result.Me,local.result.Me);
  const drawing=sceneSVG(full.scene,full.inputs);assert.ok(!/NaN|Infinity|undefined/.test(drawing.svg));assert.ok(drawing.svg.includes('COMPLETE NOZZLE'));if(['expansion','shock'].includes(full.result.external.status))assert.ok(drawing.svg.includes('WAVE INTERACTION'));
 }
 const sonic=calculate('nozzle',{...base,nozzleType:'Converging',backRatio:.2,nozzleView:'Nozzle + external waves'}),svg=sceneSVG(sonic.scene,sonic.inputs);assert.ok(svg.label.includes('schematic sonic-lip'));assert.ok(svg.svg.includes('INTERACTING JET NOT SOLVED'));
 const div={...base,nozzleType:'Diverging',MIn:2,nozzleView:'Nozzle + external waves'};assert.ok(inputDefinitions('nozzle',div).some(z=>z.key==='ambientRatio'));
});
