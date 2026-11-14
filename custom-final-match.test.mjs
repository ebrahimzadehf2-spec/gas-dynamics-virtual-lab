import test from 'node:test';import assert from 'node:assert/strict';
import {calculate,defaults} from './labs.js';import {customFinalMatch} from './custom-final-match.js';import {selectTrackingEvent,trackingSummaryRows,trackingInspectionHTML,trackingExportRows} from './wave-tracker-tables.js';
const base={...defaults('wall'),wallShape:'Custom wall',boundaryMode:'Channel',channelSolver:'Shock–Expansion',M1:1.95,p1:482.65,inletPressureType:'Stagnation pressure',channelHeight:1,trackingStep:1,wallSegments:[{angle:0,length:.5},{angle:10,length:3}],upperWallSegments:[{angle:10,length:4}]};
test('Custom wall automatically matches complete shock/fan streams and preserves the final reference across event selection',()=>{
 const d=calculate('wall',base),r=d.result,f=r.finalStreamMatch;assert.ok(f);assert.ok(Math.abs(f.slipAngle-20.026710972)<1e-7);assert.ok(Math.abs(f.regions[4].p/f.regions[5].p-1)<1e-9);
 selectTrackingEvent(r,r.tracking.events[0].index);assert.equal(r.finalStreamMatch,f);assert.ok(trackingSummaryRows(r).some(z=>z.label.startsWith('Final-stream')&&z.unit==='°'&&z.value>20));assert.ok(trackingInspectionHTML(r,String).includes('Final-stream matching'));assert.ok(trackingExportRows(r).some(z=>z.label.startsWith('Final-stream')));
 const moved=calculate('wall',{...base,wallSegments:[{angle:0,length:1},{angle:10,length:3}]}).result.finalStreamMatch;assert.ok(moved);assert.ok(Math.abs(moved.slipAngle-f.slipAngle)<1e-10);
});
test('Final matching is withheld for incomplete fans, intervening wall reflections and other wall patterns',()=>{
 const r=calculate('wall',base).result;
 assert.equal(customFinalMatch(base,{...r,geometry:{...r.geometry,end:.7}}),null);
 assert.equal(customFinalMatch(base,{...r,tracking:{...r.tracking,events:[{type:'Wall reflection',x:.01}]}}),null);
 assert.equal(calculate('wall',{...base,upperWallSegments:[{angle:-2,length:4}]}).result.finalStreamMatch,null);
});
