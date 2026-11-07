import test from 'node:test';
import assert from 'node:assert/strict';
import {pressureSweepPlan,advancePressure} from './sweep.js';
import {nozzle} from './physics.js';
import {calculate,defaults} from './labs.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
test('CD pressure landmarks reproduce references and keep the unsupported external range explicit',()=>{
 const x={...defaults('nozzle'),areaRatio:3,nozzleView:'Nozzle + external waves'},plan=pressureSweepPlan(x);assert.ok(plan.enabled);near(plan.max,1);
 near(plan.milestones.find(m=>m.label==='Normal shock at exit').pressure,.3759594570351737);near(plan.milestones.find(m=>m.label==='Pressure-matched supersonic exit').pressure,.04729869168295054);
 const weak=plan.milestones.find(m=>m.label==='Weak attached-shock limit').pressure;assert.ok(weak>.306&&weak<.308);
 const unresolved=calculate('nozzle',{...x,backRatio:.32});assert.equal(unresolved.result.external.status,'compression-limit');assert.equal(unresolved.result.external.outlet,null);
});
test('a converging sweep distinguishes sonic exit, unchoked flow and zero-flow endpoint',()=>{
 const x={...defaults('nozzle'),nozzleType:'Converging'},p=pressureSweepPlan(x),critical=p.milestones.find(m=>m.label.includes('choking limit')).pressure;near(critical,.5282817877171742);
 for(const backRatio of [p.min,critical,(critical+1)/2,1]){const s=nozzle({...x,backRatio});assert.equal(s.shockX,null);assert.ok(s.Me<=1);if(backRatio<critical)near(s.Me,1);if(backRatio===1)near(s.massFlow,0);}
});
test('fixed diverging inlet restrictions govern playback bounds',()=>{
 assert.equal(pressureSweepPlan({nozzleType:'Diverging',MIn:.3,outletCondition:'Specified back pressure'}).enabled,false);
 assert.equal(pressureSweepPlan({nozzleType:'Diverging',MIn:1,sonicBranch:'subsonic',outletCondition:'Specified back pressure'}).enabled,false);
 assert.equal(pressureSweepPlan({nozzleType:'Diverging',MIn:2}).canEnable,true);
 const x={nozzleType:'Diverging',MIn:2,areaRatio:2,outletCondition:'Specified back pressure'},p=pressureSweepPlan(x);near(p.max,.6909973803026318);
 const end=nozzle({...x,backRatio:p.max});near(end.shockX,0);assert.throws(()=>nozzle({...x,backRatio:p.max+.001}),/cannot be maintained/);
});
test('forward and reverse playback visit exact regime thresholds without overshooting or changing physical inputs',()=>{
 const x={...defaults('nozzle'),areaRatio:3},before=structuredClone(x),plan=pressureSweepPlan(x);
 for(const direction of [1,-1]){
  let pressure=direction===1?plan.min:plan.max,visited=new Set([pressure]),done=false;
  for(let i=0;i<500&&!done;i++){const next=advancePressure(pressure,plan,direction,.013);assert.ok(direction*(next.pressure-pressure)>=0);assert.ok(next.pressure>=plan.min&&next.pressure<=plan.max);pressure=next.pressure;done=next.ended;if(next.milestone){visited.add(pressure);const s=nozzle({...x,backRatio:pressure});assert.ok(s.massResidual<1e-8);}}
  assert.ok(done);for(const m of plan.milestones)assert.ok(visited.has(m.pressure),m.label);
 }
 assert.deepEqual(x,before);assert.throws(()=>advancePressure(.5,plan,0,.01));assert.throws(()=>advancePressure(.5,plan,1,0));
});
