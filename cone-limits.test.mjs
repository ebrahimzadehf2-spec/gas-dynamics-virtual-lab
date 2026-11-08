import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {coneAttachmentLimit,coneCriticalMach} from './cone-limits.js';
import {calculate,defaults} from './labs.js';
import {sceneSVG} from './graphics.js';
import {plotOptions} from './plot-options.js';
const ref=JSON.parse(readFileSync(new URL('./cone-limits-reference.json',import.meta.url)));
test('Cone attachment maxima and inverse critical Mach agree with independent DOP853 solutions',()=>{
 for(const r of ref.maximum){const z=coneAttachmentLimit(r.M,r.gamma);assert.ok(Math.abs(z.thetaMaxDeg-r.thetaMaxDeg)<2e-5);assert.ok(Math.abs(z.betaAtLimitDeg-r.betaDeg)<.002);}
 for(const r of ref.critical){const z=coneCriticalMach(r.thetaCone,r.gamma);assert.equal(z.status,'ok');assert.ok(Math.abs(z.M-r.Mcrit)<2e-6);assert.ok(Math.abs(coneAttachmentLimit(z.M,r.gamma).thetaMaxDeg-r.thetaCone)<2e-5);}
 assert.ok(coneAttachmentLimit(3).thetaMax>coneAttachmentLimit(2).thetaMax);
 assert.ok(coneCriticalMach(20).M>coneCriticalMach(10).M);
});
test('Detached cone inputs preserve attachment thresholds and omit an unsupported field',()=>{
 const x={...defaults('cone'),M:1.2,thetaCone:30},d=calculate('cone',x);assert.equal(d.result.status,'detached');assert.equal(d.rows.length,2);assert.ok(d.rows[0].value<30&&d.rows[1].value>1.2);assert.equal(d.scene.kind,'coneDetached');assert.equal(d.result.referenceTable,undefined);assert.deepEqual(plotOptions(d),[]);
 const view=sceneSVG(d.scene,x);assert.equal(view.field,null);assert.ok(!/NaN|Infinity/.test(view.svg));
});
test('Weak-branch shooting remains valid immediately below the attachment maximum',()=>{
 const limit=coneAttachmentLimit(1.2),x={...defaults('cone'),M:1.2,thetaCone:limit.thetaMaxDeg-.0001},d=calculate('cone',x);assert.equal(d.result.status,'ok');assert.ok(d.result.beta<limit.betaAtLimit);assert.ok(Math.abs(d.result.thetaConeDeg-x.thetaCone)<2e-6);assert.ok(d.rows.some(r=>r.label==='Minimum Mach for attached shock'));
});

test('Near-sonic inputs can cross the critical Mach for a slender cone',()=>{
 const base={...defaults('cone'),thetaCone:10};
 assert.equal(calculate('cone',{...base,M:1.05}).result.status,'detached');
 assert.equal(calculate('cone',{...base,M:1.06}).result.status,'ok');
 assert.equal(calculate('cone',{...base,M:1.0001}).result.status,'detached');
});
