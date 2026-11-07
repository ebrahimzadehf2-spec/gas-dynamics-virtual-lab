import test from 'node:test';
import assert from 'node:assert/strict';
import {nozzle,isentropic,normalShock,machFromArea} from './physics.js';
import {calculate,defaults,inputDefinitions} from './labs.js';
import {sceneSVG,chartSVG} from './graphics.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
function balances(s){assert.ok(s.massResidual<2e-9);for(const z of s.points){near(z.P*z.area*z.u/(s.R*z.T),s.massFlow,Math.max(1e-9,s.massFlow*2e-9));near(z.T*isentropic(z.M).T0T,s.T0,1e-8);}}
test('converging nozzle reproduces book 8-1 and keeps exit pressure distinct from ambient after choking',()=>{
 const a=nozzle({nozzleType:'converging',backRatio:.7}),b=nozzle({nozzleType:'converging',backRatio:.4});
 near(a.Me,.7323954884516265);near(a.exitPressure,350000,1e-6);assert.equal(a.choked,false);
 near(b.Me,1);near(b.exitPressure,264140.8938585871,1e-7);assert.equal(b.choked,true);assert.ok(b.exitPressure>200000);balances(a);balances(b);
});
test('converging sonic mass-flow ceiling, no-flow limit and physical scaling',()=>{
 const a=nozzle({nozzleType:'converging',backRatio:.4}),b=nozzle({nozzleType:'converging',backRatio:.1}),c=nozzle({nozzleType:'converging',backRatio:.1,minArea:.0012,p0:1e6});
 near(a.massFlow,b.massFlow,1e-12);near(c.massFlow,4*b.massFlow,1e-10);
 const zero=nozzle({nozzleType:'converging',backRatio:1});near(zero.massFlow,0);assert.ok(zero.points.every(z=>z.M===0));
 for(const gamma of [1.2,1.4,5/3]){let crit=(2/(gamma+1))**(gamma/(gamma-1)),s=nozzle({nozzleType:'converging',gamma,backRatio:crit});near(s.Me,1);near(s.exitPressure,5e5*crit,1e-7);}
});
test('diverging passage follows the prescribed inlet branch and conserves mass and stagnation state',()=>{
 for(const MIn of [.3,2]){const s=nozzle({nozzleType:'diverging',MIn,areaRatio:2});assert.ok(MIn<1?s.Me<MIn:s.Me>MIn);balances(s);
  const i=s.points[0],e=s.points.at(-1);near(i.M,MIn);near(i.P/i.rho,i.T*287);near(e.P/i.P,(i.T/e.T)**(-3.5),1e-10);
  near(s.backRatio,s.exitPressure/s.p0);assert.equal(s.AsAt,null);
 }
 // Scalar pressure-Mach/area references independently computed in Python.
 near(nozzle({nozzleType:'diverging',MIn:1,areaRatio:3}).Me,2.637415849310822);
});
test('a sonic diverging inlet requires an explicit physical branch and permits both outgoing branches',()=>{
 for(const sonicBranch of ['subsonic','supersonic']){let s=nozzle({nozzleType:'diverging',MIn:1,sonicBranch});near(s.points[0].M,1);assert.equal(s.choked,true);assert.ok(sonicBranch==='subsonic'?s.Me<1:s.Me>1);balances(s);}
 assert.throws(()=>nozzle({nozzleType:'diverging',MIn:1,sonicBranch:'automatic'}));
});
test('CD nozzle retains book 8-3 thresholds and book 8-4 shock section, with both one-sided shock states',()=>{
 const a=nozzle({areaRatio:6.789620535714289,backRatio:.013110919994476009});near(a.Me,3.5);near(a.exitShock,.1851917449219737);near(a.onset,.994886651188321);near(a.design,.013110919994476009);balances(a);
 const b=nozzle({areaRatio:3,backRatio:.5,p0:101320});near(b.AsAt,2.339726206649883);near(b.Me,.3803397668237326);near(b.exitPressure,50660,1e-5);balances(b);
 const ends=nozzle({areaRatio:3,backRatio:b.exitShock}),last=ends.points.slice(-2);near(last[0].x,1);near(last[1].x,1);assert.ok(last[0].M>1&&last[1].M<1);near(last[1].M,ends.Me);near(last[1].p,ends.backRatio,1e-10);balances(ends);
 const onset=nozzle({areaRatio:3,backRatio:b.onset});assert.ok(onset.points.some(p=>p.x===.28));near(onset.minimumMach,1,1e-7);
});
test('UI shows only relevant inputs and renders finite geometry and all three scientific charts',()=>{
 for(const nozzleType of ['Converging','Diverging','Converging–diverging'])for(const plotProperty of ['Pressure','Mach number','Temperature']){
  const x={...defaults('nozzle'),nozzleType,plotProperty};let d=calculate('nozzle',x),fields=inputDefinitions('nozzle',x).map(z=>z.key);
  assert.equal(fields.includes('backRatio'),nozzleType!=='Diverging');assert.equal(fields.includes('MIn'),nozzleType==='Diverging');assert.equal(fields.includes('contractionRatio'),nozzleType==='Converging');
  for(const svg of [sceneSVG(d.scene,x).svg,chartSVG(d.chart).svg])assert.ok(!/NaN|Infinity|undefined/.test(svg));
  assert.ok(d.rows.some(r=>r.label==='Mass flow rate'));assert.equal(d.chart.series.length,plotProperty==='Pressure'?2:1);
 }
 const x={...defaults('nozzle'),nozzleType:'Diverging',MIn:1};assert.ok(inputDefinitions('nozzle',x).some(z=>z.key==='sonicBranch'));
});
test('nozzle rejects invalid gas, geometry and boundary inputs',()=>{
 for(const args of [{nozzleType:'unknown'},{nozzleType:'converging',backRatio:0},{nozzleType:'converging',contractionRatio:1},{nozzleType:'diverging',MIn:0},{nozzleType:'diverging',areaRatio:1},{minArea:0},{p0:NaN},{T0:-1},{gamma:1}])assert.throws(()=>nozzle(args));
});
test('nozzle result sections report one-sided thermodynamic states for internal and external shocks',()=>{
 const cd=calculate('nozzle',{...defaults('nozzle'),areaRatio:3,backRatio:.6745706});
 assert.equal(cd.shockDetails.length,1);const normal=cd.shockDetails[0];assert.equal(normal.kind,'normal');
 const pair=cd.result.points.filter(z=>Math.abs(z.x-cd.result.shockX)<1e-10).sort((a,b)=>b.M-a.M);
 for(const [label,before,after] of [['Mach number M',pair[0].M,pair[1].M],['Static pressure p',pair[0].P/1000,pair[1].P/1000],['Static temperature T',pair[0].T,pair[1].T],['Density ρ',pair[0].rho,pair[1].rho],['Flow speed u',pair[0].u,pair[1].u]]){
  const r=normal.rows.find(z=>z.label===label);near(r.before,before);near(r.after,after);
 }
 assert.ok(normal.extra.find(z=>z.label==='Entropy rise Δs').value>0);
 const div=calculate('nozzle',{...defaults('nozzle'),nozzleType:'Diverging',areaRatio:2,MIn:2,outletCondition:'Specified back pressure',backRatio:.5});
 assert.equal(div.shockDetails.length,1);assert.match(div.shockDetails[0].location,/Aₛ\/Aᵢ/);
 const ext=calculate('nozzle',{...defaults('nozzle'),areaRatio:3,backRatio:.05,nozzleView:'External waves'});
 assert.equal(ext.result.external.status,'shock');assert.equal(ext.shockDetails.length,1);const oblique=ext.shockDetails[0];assert.equal(oblique.kind,'oblique');
 assert.ok(oblique.extra.some(z=>z.label==='Shock angle β'&&z.value>0));
 assert.ok(oblique.extra.some(z=>z.label==='Upstream normal Mach Mₙ₁'&&z.value>1));
 assert.ok(oblique.rows.find(z=>z.label==='Stagnation pressure p₀').after<oblique.rows.find(z=>z.label==='Stagnation pressure p₀').before);
 const noShock=calculate('nozzle',{...defaults('nozzle'),areaRatio:3,backRatio:.02});assert.equal(noShock.shockDetails.length,0);
});
// References from an independent dimensional mass/momentum/energy jump solve
// (downstream velocity quadratic + SciPy Brent inversion), not this engine.
const shockReferences=[
 {MIn:2,areaRatio:2,backRatio:.5,AsAt:1.4201407191593298,shockX:.6481826279370112,Me:.3390597957264831,loss:.5414062869332802,M1:2.39700961069961,M2:.523437638763345},
 {MIn:1.5,areaRatio:3,backRatio:.75,AsAt:1.3045885054896862,shockX:.3902489625160368,Me:.217649219693001,loss:.7751657966572388,M1:1.8830156534333575,M2:.5989657825556574},
 {MIn:3,areaRatio:2,backRatio:.2,AsAt:1.5755560433154565,shockX:.7586540999134299,Me:.33782095636479526,loss:.2164382788711487,M1:3.48122288673589,M2:.4518894134457347}
];
const shockCase=x=>nozzle({nozzleType:'diverging',outletCondition:'Specified back pressure',MIn:2,areaRatio:2,backRatio:.5,...x});
test('diverging internal shock agrees with three independent dimensional jump references',()=>{
 for(const r of shockReferences){const s=shockCase(r);for(const k of ['AsAt','shockX','Me'])near(s[k],r[k],2e-9);near(s.p02p01,r.loss,2e-9);near(s.shock.upstreamMach,r.M1,2e-9);near(s.shock.downstreamMach,r.M2,2e-9);near(s.exitPressure/s.p0,r.backRatio,1e-10);balances(s);assert.ok(Object.values(s.shockChecks).every(v=>v<1e-10));}
});
test('shock traverses the diverging passage as back pressure rises, including inlet and exit boundaries',()=>{
 const base=shockCase({});let prev=2;
 for(const f of [0,.2,.5,.8,1]){const s=shockCase({backRatio:base.exitShock+f*(base.inletShock-base.exitShock)});assert.ok(s.shockX<prev);prev=s.shockX;balances(s);near(s.points.at(-1).p,s.backRatio,1e-10);}
 const atExit=shockCase({backRatio:base.exitShock}),atInlet=shockCase({backRatio:base.inletShock});near(atExit.shockX,1);near(atInlet.shockX,0);
 for(const s of [atExit,atInlet]){const pair=s.points.filter(z=>z.x===s.shockX);assert.equal(pair.length,2);assert.ok(pair[0].M>1&&pair[1].M<1);assert.ok(pair[1].P>pair[0].P);}
 assert.throws(()=>shockCase({backRatio:base.inletShock+.001}),/prescribed inlet Mach cannot be maintained/);
});
test('external supersonic adjustment is distinct from internal pressure matching',()=>{
 const base=shockCase({});for(const pb of [base.design*.5,base.design,(base.design+base.exitShock)/2]){let s=shockCase({backRatio:pb});assert.equal(s.AsAt,null);assert.equal(s.pressureMatched,false);near(s.p02p01,1);near(s.points.at(-1).p,base.design,1e-10);balances(s);}
});
test('subsonic inlet compatibility and sonic branch boundaries are enforced',()=>{
 const sub=nozzle({nozzleType:'diverging',MIn:.3});const matched=shockCase({MIn:.3,backRatio:sub.backRatio});assert.equal(matched.shock,null);assert.ok(matched.Me<.3);assert.throws(()=>shockCase({MIn:.3}),/No normal shock/);
 for(const gamma of [1.2,1.4,5/3]){const iso=nozzle({nozzleType:'diverging',MIn:1,gamma});const b=(iso.exitShock+iso.inletShock)/2,s=shockCase({MIn:1,gamma,backRatio:b});assert.ok(s.shock.upstreamMach>1&&s.shock.downstreamMach<1);assert.ok(s.massResidual<1e-9);const limit=shockCase({MIn:1,gamma,backRatio:iso.inletShock});near(limit.shockX,0);near(limit.shock.upstreamMach,1);near(limit.p02p01,1);}
 assert.throws(()=>shockCase({outletCondition:'guess'}));assert.throws(()=>shockCase({backRatio:NaN}));
});
test('back-pressure mode updates visible inputs, plots, shock outputs and physical checks',()=>{
 const x={...defaults('nozzle'),nozzleType:'Diverging',outletCondition:'Specified back pressure',MIn:2,backRatio:.5};assert.ok(inputDefinitions('nozzle',x).some(f=>f.key==='backRatio'));
 for(const plotProperty of ['Pressure','Mach number','Temperature']){const d=calculate('nozzle',{...x,plotProperty});assert.ok(d.rows.some(r=>r.label==='Shock section Aₛ/Aᵢ'));assert.ok(d.checks.shockMomentum<1e-10);for(const svg of [sceneSVG(d.scene,x).svg,chartSVG(d.chart).svg])assert.ok(!/NaN|Infinity|undefined/.test(svg));}
 const external=calculate('nozzle',{...x,backRatio:.1});assert.ok(external.notice.includes('external jet'));assert.ok(!('pressureClosure' in external.checks));
});
