import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults} from './labs.js';
import {plotOptions} from './plot-options.js';
import {chartSVG} from './graphics.js';
import {ramjetPreset} from './ramjet-inlet.js';
import {chapter6Example} from './regular-channel.js';
const run=(id,x={})=>calculate(id,{...defaults(id),...x});
const chart=d=>plotOptions(d).find(p=>p.chart.regionMarkers).chart;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7);
test('Every turning chart has visible markers matching the solved states',()=>{
 for(const d of [run('oblique'),run('expansion'),run('wall'),run('collision'),run('wall',chapter6Example(4)),run('wall',ramjetPreset),run('airfoil'),run('cone'),run('cone',{bodyGeometry:'Wedge'}),run('cone',{bodyGeometry:'Wedge',nearbyWall:'Both walls'})]){
  const c=chart(d);assert.ok(c.markers.length>=2);const v=chartSVG(c);for(const m of c.markers){assert.ok(Number.isFinite(m.x)&&Number.isFinite(m.y));assert.ok(v.svg.includes('data-region-marker="'+m.name+'"'));assert.ok(v.axis.xmin<=m.x&&m.x<=v.axis.xmax);assert.ok(v.axis.ymin<=m.y&&m.y<=v.axis.ymax);}assert.doesNotMatch(v.svg,/NaN|undefined|Infinity/);
 }
});
test('Book regions retain their own labels and coincident wall reflections show both region numbers',()=>{
 const d=run('wall',ramjetPreset),c=chart(d);assert.deepEqual(c.markers.map(m=>m.name),['1','2','3']);near(c.markers[1].x,-8);near(c.markers[2].y,d.result.regions[3].p/d.result.s1.p);
 const b=chart(run('cone',{bodyGeometry:'Wedge',nearbyWall:'Both walls'}));assert.ok(b.markers.some(m=>m.name==='3 / 5'));assert.ok(!b.markers.some(m=>m.name==='5'));
 const interaction=chart(run('collision'));const all=interaction.markers.map(m=>m.name).join(' / ');for(const n of ['1','2','3','4','5'])assert.ok(all.includes(n));
});
test('Airfoil labels match panel and trailing-edge identifiers; continuous cone locations are named',()=>{
 const c=chart(run('airfoil')),all=c.markers.map(m=>m.name).join(' / ');for(const label of ['U1','U2','L1','L2','TE-U+','TE-L+'])assert.ok(all.includes(label));
 assert.deepEqual(chart(run('cone')).markers.map(m=>m.name),['Shock','Surface']);
});
