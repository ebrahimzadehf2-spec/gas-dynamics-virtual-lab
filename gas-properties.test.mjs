import test from 'node:test';
import assert from 'node:assert/strict';
import {gasPresets,selectGas,gasInfo} from './gas-properties.js';
import {calculate,defaults,inputDefinitions,labs} from './labs.js';
import {controlVolume,controlVolumePreset} from './control-volume.js';
import {sceneSVG,chartSVG} from './graphics.js';
const near=(a,b,t=2e-9)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} vs ${b}`);
test('Gas presets use SI constants and thermodynamically consistent fixed heat capacities',()=>{
 assert.equal(gasPresets['Hydrogen (H₂)'].R,4124);assert.equal(gasPresets['Helium (He)'].R,2076.9);
 for(const [name,p] of Object.entries(gasPresets)){const x=selectGas({},name),r=gasInfo(x);assert.equal(r.name,name);near(r.cp-r.cv,p.R);near(r.cp/r.cv,p.gamma);assert.equal(r.referenceTemperature,300);}
 const x=selectGas({gamma:1.22,R:500},'Custom gas');assert.equal(x.gamma,1.22);assert.equal(gasInfo(x).name,'Custom gas');assert.throws(()=>selectGas({},'unknown'));
});
test('All laboratory interfaces expose one working gas, gamma and R selector',()=>{
 for(const id of Object.keys(labs))for(const fluid of ['Air','Hydrogen (H₂)','Custom gas']){const x=selectGas(defaults(id),fluid),f=inputDefinitions(id,x);for(const key of ['fluid','gamma','R'])assert.equal(f.filter(v=>v.key===key).length,1);assert.equal(f.find(v=>v.key==='R').readOnly,fluid!=='Custom gas');assert.ok(f.find(v=>v.key==='R').max>=4124);}
});
test('Changing R at fixed gamma scales density, sound speed and shock entropy consistently',()=>{
 for(const id of ['foundations','normal']){
 const x={...defaults(id),fluid:'Custom gas'},a=calculate(id,x),b=calculate(id,{...x,R:4*x.R});
 const s1=id==='foundations'?a.result:a.scene.s1,s2=id==='foundations'?b.result:b.scene.s1;near(s2.rho,s1.rho/4);near(s2.a,2*s1.a);near(s2.u,2*s1.u);
 if(id==='normal'){const find=(d,name)=>d.rows.find(r=>r.label===name).value;near(find(b,'Specific entropy increase'),4*find(a,'Specific entropy increase'));for(const v of Object.values(b.checks))assert.ok(v<1e-9);}
 }
});
test('Both sides of shock tube use the selected R and keep pressure ratios unchanged at fixed gamma',()=>{
 const x={...defaults('tube'),fluid:'Custom gas'},a=calculate('tube',x).result,b=calculate('tube',{...x,R:4*x.R}).result;near(b.Ms,a.Ms);near(b.p,a.p);near(b.shockSpeed,2*a.shockSpeed);near(b.u,2*a.u);near(b.rho2,a.rho2/4);
});
test('Rayleigh, Fanno and nozzle dimensional properties use the selected gas',()=>{
 for(const id of ['rayleigh','fanno','nozzle']){
 const x={...defaults(id),fluid:'Custom gas'},a=calculate(id,x).result,b=calculate(id,{...x,R:4*x.R}).result;
 if(id==='rayleigh')near(b.qmax,4*a.qmax);
 if(id==='fanno'){near(b.s1.rho,a.s1.rho/4);near(b.s2.u,2*a.s2.u);}
 if(id==='nozzle'){near(b.massFlow,a.massFlow/2);near(b.Me,a.Me);}
 }
});
test('Named gases render across all experiments; control-volume examples adapt to the chosen gas',()=>{
 for(const name of Object.keys(gasPresets)){
 for(const id of Object.keys(labs)){
 let x=selectGas(defaults(id),name);if(id==='balances')x={...x,...controlVolumePreset('nozzle',x)};
 const d=calculate(id,x);assert.equal(d.gas.name,name);assert.ok(!/NaN|Infinity|undefined/.test(sceneSVG(d.scene,x).svg),name+' '+id);assert.ok(!/NaN|Infinity|undefined/.test(chartSVG(d.chart).svg));
 }
 for(const kind of ['nozzle','shock'])assert.equal(controlVolume(controlVolumePreset(kind,gasPresets[name])).status,'balanced');
 }
});
test('Explicit custom gamma and R are preserved and invalid properties are rejected',()=>{
 const x={...defaults('foundations'),gamma:1.3,R:550};const d=calculate('foundations',x);assert.equal(d.gas.name,'Custom gas');near(d.result.a,Math.sqrt(1.3*550*x.T1));
 for(const bad of [{R:0},{R:NaN},{gamma:1},{gamma:Infinity}])assert.throws(()=>calculate('foundations',{...x,...bad}));
});
