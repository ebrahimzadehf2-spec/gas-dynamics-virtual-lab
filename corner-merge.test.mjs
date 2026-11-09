import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {calculate,defaults,inputDefinitions,chapters} from './labs.js';import {obliqueShock,expansion,rad} from './physics.js';import {sceneSVG} from './graphics.js';import {plotOptions} from './plot-options.js';import {calloutSlot} from './region-labels.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)));
test('Chapter 6 exposes only geometry and interaction, with both corner calculators inside geometry',()=>{
 assert.deepEqual(chapters.find(c=>c[0]===6)[3],['wall','collision']);
 for(const wallShape of ['Compression ramp','Expansion corner']){const x={...defaults('wall'),wallShape},fields=inputDefinitions('wall',x).map(f=>f.key);assert.ok(fields.includes('theta')&&fields.includes('cornerView'));assert.equal(fields.includes('branch'),wallShape==='Compression ramp');assert.ok(!fields.includes('wallSegments')&&!fields.includes('boundaryMode'));}
});
test('Merged corners preserve weak/strong shock, PM relations and dimensional region states',()=>{
 for(const branch of ['weak','strong']){const x={...defaults('wall'),theta:15,branch},d=calculate('wall',x),ref=obliqueShock(x.M1,rad(15),x.gamma,branch);near(d.result.M2,ref.M2);near(d.result.regions[2].p/d.result.s1.p,ref.p);assert.equal(d.shockDetails.length,1);near(d.result.regions[2].T0,d.result.s1.T0);}
 const x={...defaults('wall'),wallShape:'Expansion corner',M1:1,theta:15},d=calculate('wall',x);near(d.result.M2,expansion(1,rad(15)).M2);near(d.result.regions[2].p0,d.result.s1.p0);
});
test('All five contours, schematic view, flow arrows and dimensional/ratio plots survive the merge',()=>{
 for(const wallShape of ['Compression ramp','Expansion corner'])for(const wallSide of ['Gas above wall','Gas below wall']){const x={...defaults('wall'),wallShape,wallSide,theta:10},d=calculate('wall',x);assert.ok(d.result.regions[2].theta*(wallShape==='Compression ramp'?1:-1)*(wallSide==='Gas above wall'?1:-1)>0);
 for(const q of ['pressure','mach','temperature','density','speed']){const v=sceneSVG(d.scene,x,0,q);assert.equal(v.field.quantity,q);assert.ok(!/NaN|undefined|Infinity/.test(v.svg));assert.ok(v.svg.includes('data-stream-arrow'));}
 assert.equal(sceneSVG(d.scene,{...x,cornerView:'Textbook schematic'}).field,null);const ps=plotOptions(d);assert.ok(ps.some(z=>z.key==='wave-dimensional-p'));assert.ok(ps.some(z=>z.key==='wave-p'));}
});
test('Callout placement terminates for crowded label positions and the reported tall-channel freeze',()=>{
 const used=[280,312],x=calloutSlot(300,used);assert.ok(Number.isFinite(x)&&x>=48&&x<=530);assert.ok(used.every(v=>Math.abs(v-x)>=32));
 const script="import {calculate,defaults} from './labs.js';import {sceneSVG} from './graphics.js';const x={...defaults('collision'),interactionType:'Same-direction shocks',channelHeight:11.55,cornerSpacing:1.44};const d=calculate('collision',x);console.log(sceneSVG(d.scene,x).svg.length);";
 const child=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:new URL('.',import.meta.url),timeout:2000,encoding:'utf8'});assert.equal(child.error,undefined,child.error?.message);assert.equal(child.status,0,child.stderr);assert.ok(Number(child.stdout.trim())>0);
});
