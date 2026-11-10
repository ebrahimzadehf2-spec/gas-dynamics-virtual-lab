import test from 'node:test';
import assert from 'node:assert/strict';
import {reservoirExamples} from './reservoir-examples.js';
import {calculate,defaults} from './labs.js';
const expected = [
  [0.58367414962,1,244.304597384,100],
  [0.4,0.47954444361,414.627498957,100],
  [0.35,0.40558573136,349.944761469,80],
  [0.45,0.54213006031,474.820102747,100]
];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6*Math.max(1,Math.abs(b)),`${a} != ${b}`);
reservoirExamples.forEach(([label,inputs],i)=>test(label+' recovers consistent inlet, outlet and heat',()=>{
  const d=calculate('rayleigh',{...defaults('rayleigh'),...inputs});
  const [Mi,Me,pe,q]=expected[i];
  close(d.result.s1.M,Mi);close(d.result.s2.M,Me);close(d.result.s2.p/1000,pe);
  close(d.rows.find(r=>r.label==='Heat transfer').value,q);
  const ref=d.result.stations[0].state;
  close(ref.M,inputs.supplyReferenceMach);close(ref.p/1000,inputs.reservoirP0);
  close(ref.p0,d.result.s1.p0);close(ref.T0,d.result.s1.T0);
  assert.notEqual(ref.M,d.result.s1.M);
  assert.equal(d.result.referenceTable.columns.length,3);
  close(d.result.s1.T0,inputs.reservoirT0);
  close((d.result.s2.T0-d.result.s1.T0)*1004.5/1000,q);
}));
