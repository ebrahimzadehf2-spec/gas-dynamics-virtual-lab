import test from 'node:test';
import assert from 'node:assert/strict';
import {solveFannoSystem,fannoConditions,fannoSolves,fannoPressurePlan,migrateFannoInputs,fannoSystemMode} from './fanno-system.js';
import {solveDuctSystem,systemDefaults} from './duct-systems.js';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {sceneSVG} from './graphics.js';
import {fannoRatios,normalShock,areaMach} from './physics.js';
import {advancePressure} from './sweep.js';
const base={...defaults('fanno'),ductProblem:fannoSystemMode,lambda:.2,systemAreaRatio:2,reservoirP0:500,reservoirT0:400};
const run=x=>solveFannoSystem({...base,...x});
const near=(a,b,t=2e-7)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
test('Four landmarks agree with independently implemented existing nozzle/Fanno solvers',()=>{
 for(const gamma of [1.2,1.4,1.667])for(const A of [1.5,2,4]){
  const params={...base,gamma,systemAreaRatio:A,lambda:.02};
  for(const [label,shockCase]of [[fannoConditions[2],'Nozzle throat (limit)'],[fannoConditions[3],'Nozzle exit'],[fannoConditions[4],'Duct exit']]){
   const a=solveFannoSystem({...params,fannoCondition:label}),b=solveDuctSystem('fanno',{...params,ductProblem:'CD nozzle + prescribed shock',shockCase});
   near(a.result.s1.M,b.result.s1.M);near(a.result.s2.M,b.result.s2.M);near(a.result.backPressure,b.result.s2.p);
   if(shockCase==='Nozzle throat (limit)'){assert.equal(a.result.shockX,null);assert.ok(a.result.throatLimit);}
  }
  const free=solveFannoSystem({...params,fannoCondition:fannoConditions[1]});near(fannoRatios(free.result.s1.M,gamma).F-fannoRatios(free.result.s2.M,gamma).F,.02);near(free.result.backPressure,free.result.s2.p);assert.equal(free.result.shockX,null);
 }
});
test('Pressure inversion moves shock continuously from duct exit through nozzle exit to throat',()=>{
 const plan=fannoPressurePlan(base),p=plan.limits;assert.ok(p.noShock<p.ductExit&&p.ductExit<p.nozzleExit&&p.nozzleExit<p.throat);
 let previous=Infinity;
 for(let i=0;i<70;i++){
  const pb=p.ductExit+(p.throat-p.ductExit)*i/70,d=run({fannoCondition:fannoConditions[0],backRatio:pb}),r=d.result;
  assert.ok(r.shockX<=previous+1e-7);previous=r.shockX;near(r.s2.p,r.backPressure);
  assert.ok(d.checks.mass<1e-7);assert.ok(d.checks.energy<1e-10);
  const [pre,post]=['Before shock','After shock'].map(name=>r.stations.find(z=>z.name===name)?.state);
  if(pre){const n=normalShock(pre.M,base.gamma);near(post.M,n.M2);near(post.p/pre.p,n.p);near(post.p0/pre.p0,n.p0);}
 }
 const a=run({fannoCondition:fannoConditions[0],backRatio:p.nozzleExit});near(a.result.shockX,base.nozzleLength);
 const throat=run({fannoCondition:fannoConditions[0],backRatio:p.throat});assert.equal(throat.result.shockX,null);
});
test('Full-system profile conserves mass and energy and preserves exact shock jumps on both sides of the interface',()=>{
 const plan=fannoPressurePlan(base),p=plan.limits;
 for(const backRatio of [(p.ductExit+p.nozzleExit)/2,p.nozzleExit,(p.nozzleExit+p.throat)/2,.99,1,.001]){
  const d=run({fannoCondition:fannoConditions[0],backRatio}),r=d.result;
  assert.ok(d.checks.mass<1e-7);assert.ok(d.checks.energy<1e-10);
  const jumped=r.fullProfile.some((z,i,a)=>i&&Math.abs(z.position-a[i-1].position)<1e-9&&z.state.p>a[i-1].state.p*1.0001);
  assert.equal(jumped,r.shockX!==null);
  const v=sceneSVG(d.scene,d.inputs,.001,'mach');assert.match(v.svg,/data-fanno-system/);assert.doesNotMatch(v.svg,/NaN|undefined|Infinity/);
  assert.ok(r.plots.every(p=>p.chart.xlabel==='Position x (m)'));
 }
});
test('Inverse minimum supply and exit-shock friction preserve the former example capabilities',()=>{
 const old=solveDuctSystem('fanno',{...base,ductProblem:'CD nozzle minimum supply pressure',backPressure:150});
 const min=run({fannoSystemSolve:fannoSolves[1],backPressure:150});near(min.result.supplyPressure,min.rows.find(z=>z.label==='Minimum reservoir pressure').value*1000);near(min.result.s1.p0,old.result.s1.p0);near(min.result.s2.M,1);near(min.result.s2.p,150000);
 const fwd=run({lambda:.15,fannoCondition:fannoConditions[4]}),inverse=run({fannoSystemSolve:fannoSolves[2],backPressure:fwd.result.backPressure/1000});near(inverse.result.lambda,.15);near(inverse.result.s2.p,fwd.result.s2.p);
 assert.throws(()=>run({fannoSystemSolve:fannoSolves[2],backPressure:1}),/must lie between/);
});
test('Long ducts show reachable choking regimes and reject unreachable shock presets',()=>{
 for(const lambda of [.5,1,5]){
  const x={...base,lambda},plan=fannoPressurePlan(x);
  for(const backRatio of [.001,.3,.7,.99,1,...plan.milestones.map(z=>z.pressure)]){
   const d=solveFannoSystem({...x,fannoCondition:fannoConditions[0],backRatio});assert.ok(d.checks.mass<1e-6);assert.ok(d.result.s2.M<=1+1e-7);
  }
  assert.throws(()=>solveFannoSystem({...x,fannoCondition:fannoConditions[1]}),/too long/);
  assert.throws(()=>solveFannoSystem({...x,fannoCondition:fannoConditions[4]}),/not reachable/);
 }
});
test('The Fanno menu has one system option and migrates old examples without altering Rayleigh controls',()=>{
 const options=inputDefinitions('fanno',defaults('fanno')).find(z=>z.key==='ductProblem').options;assert.deepEqual(options,['Single duct',fannoSystemMode]);
 for(const old of ['Reservoir + nozzle + duct','CD nozzle minimum supply pressure','CD nozzle + exit shock: friction','CD nozzle + prescribed shock','Duct shock location']){
  const x=migrateFannoInputs({...base,ductProblem:old,backPressure:200,M1:2}),fields=inputDefinitions('fanno',x);assert.equal(x.ductProblem,fannoSystemMode);assert.equal(new Set(fields.map(f=>f.key)).size,fields.length);
  assert.ok(calculate('fanno',x).result.fullSystem);
 }
 const ray=inputDefinitions('rayleigh',defaults('rayleigh')).find(z=>z.key==='ductProblem').options;assert.ok(ray.includes('Heat + shock + converging nozzle'));
});
test('Fanning and Darcy controls yield the same physical system',()=>{
 const x={frictionInput:'Length and friction factor',hydraulicDiameter:.05,frictionFactor:.0025,frictionConvention:'Fanning',fannoCondition:fannoConditions[4]},a=run(x),b=run({...x,frictionFactor:.01,frictionConvention:'Darcy'});near(a.result.lambda,.2);near(a.result.backPressure,b.result.backPressure);near(a.result.massFlow,b.result.massFlow);
});
test('Playback crosses each system landmark exactly in both directions at fixed geometry',()=>{
 const plan=fannoPressurePlan(base);
 for(const direction of [1,-1]){
  let value=direction===1?plan.min:plan.max,visited=new Set([value]),done=false;
  for(let i=0;i<200&&!done;i++){const next=advancePressure(value,plan,direction,.017);value=next.pressure;done=next.ended;visited.add(value);const d=run({fannoCondition:fannoConditions[0],backRatio:value});assert.ok(d.checks.mass<1e-6);}
  assert.ok(done);for(const m of plan.milestones)assert.ok(visited.has(m.pressure));
 }
});
