import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestChartPoint} from './chart-probe.js';
import {chartSVG} from './graphics.js';
test('Chart pointer distinguishes both sides of a discontinuity and identifies curves',()=>{
 const chart={title:'Test',xlabel:'x',ylabel:'p',zeroBaseline:false,series:[{name:'Pressure',points:[[0,1],[.5,1],[.5,4],[1,4]]},{name:'Other',points:[[.25,2]]}]},a=chartSVG(chart).axis;
 const xy=(x,y)=>[a.L+(x-a.xmin)/(a.xmax-a.xmin)*(a.W-a.L-a.R),a.H-a.B-(y-a.ymin)/(a.ymax-a.ymin)*(a.H-a.T-a.B)];
 for(const y of [1,4]){const v=nearestChartPoint(chart,a,...xy(.5,y));assert.equal(v.x,.5);assert.equal(v.y,y);assert.equal(v.name,'Pressure');}
 assert.equal(nearestChartPoint(chart,a,...xy(.25,2)).name,'Other');
 assert.equal(nearestChartPoint({series:[{points:[]}]},a,0,0),null);
});
