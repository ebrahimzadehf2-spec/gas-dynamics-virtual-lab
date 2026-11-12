import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const solve=source.slice(source.indexOf('function solve({stream=false}={})'),source.indexOf('\n\nworker.onmessage'));
function setup(current={id:'fanno'}){
 const elements=new Map(),posted=[];
 const $=key=>{if(!elements.has(key))elements.set(key,{hidden:false,disabled:false,innerHTML:'accepted '+key,textContent:'accepted '+key,className:'status'});return elements.get(key);};
 for(const k of ['scene','chart','legend','chartTitle','regionTablePanel','flowRelationsPanel','trackingEventPanel','ductImageNote','ductChartNote','comparison','results','status','isentropicPanel','exportSvg'])$(k);
 const context=vm.createContext({$,current,fannoSystemMode:'Nozzle + Fanno duct',fannoConditions:['Vary back pressure'],getSweepPlan(){return {enabled:true,min:.4,max:.9};},id:'fanno',request:4,solvePending:false,inputs:{backRatio:.6},stopAnimation(){},pendingAirfoilScene(){return 'pending illustration';},worker:{postMessage(message){posted.push(message);}}});
 vm.runInContext(solve,context);return {elements,$,context,posted,solve:options=>context.solve(options)};
}
test('A live pressure step preserves accepted scene, panels and status until the worker replies',()=>{
 const x=setup(),before=structuredClone([...x.elements]);
 x.solve({stream:true});
 assert.deepEqual([...x.elements].filter(([k])=>!['fieldProbe','chartProbe'].includes(k)),before);
 assert.equal(x.context.solvePending,true);assert.equal(x.posted.length,1);assert.equal(x.posted[0].request,5);assert.equal(x.posted[0].inputs.backRatio,.6);
});
test('Cold and unrelated-lab requests clear stale content and expose pending state',()=>{
 for(const [state,stream]of [[null,true],[{id:'rayleigh'},true],[{id:'fanno'},false]]){
  const x=setup(state);x.solve({stream});assert.equal(x.context.current,null);assert.equal(x.$('regionTablePanel').hidden,true);assert.equal(x.$('scene').innerHTML,'pending illustration');assert.equal(x.$('chart').innerHTML,'');assert.equal(x.$('status').textContent,'Solving…');assert.equal(x.$('exportSvg').disabled,true);assert.equal(x.posted.length,1);
 }
});

test('Variable Fanno pressure is bounded before a worker frame is requested',()=>{
 for(const [input,expected]of [[.01,.4],[.6,.6],[1,.9]]){
  const x=setup();Object.assign(x.context.inputs,{ductProblem:'Nozzle + Fanno duct',fannoCondition:'Vary back pressure',backRatio:input});x.solve({stream:true});assert.equal(x.posted[0].inputs.backRatio,expected);assert.equal(x.context.inputs.backRatio,expected);
 }
});
