import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculate,defaults,labs} from './labs.js';
import {plotOptions} from './plot-options.js';
import {chartSVG} from './graphics.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)));
test('Every registered experiment offers distinct finite selectable plots with units',()=>{
 for(const id of Object.keys(labs)){
  const x=defaults(id),options=plotOptions(calculate(id,x));assert.ok(options.length>1,id);assert.equal(new Set(options.map(o=>o.key)).size,options.length);
  for(const o of options){assert.ok(o.chart.xlabel);assert.ok(o.chart.ylabel);assert.ok(o.chart.series.some(s=>s.points.length));assert.ok(!/NaN|Infinity|undefined/.test(chartSVG(o.chart).svg),id+' '+o.key);}
 }
});
test('All isentropic table ratios and angles are available and agree with the selected state',()=>{
 const x=defaults('foundations'),d=calculate('foundations',x),options=plotOptions(d);assert.ok(options.some(o=>o.key==='iso-pP0'));
 for(const key of ['pP0','rhoRho0','TT0','pPstar','rhoRhostar','TTstar','areaRatio','machAngle','pmAngle']){const o=options.find(o=>o.key==='iso-'+key);assert.ok(o,key);const p=o.chart.series[0].points.find(([m])=>m===x.M);near(p[1],d.result.relations[key]);}
 const sub=plotOptions(calculate('foundations',{...x,M:.2}));assert.ok(sub.find(o=>o.key==='iso-mu')===undefined);for(const o of sub.filter(o=>/machAngle|pmAngle/.test(o.key)))assert.ok(o.chart.series[0].points.every(([m])=>m>=1));
});
test('Nozzle property charts preserve both sides of a shock and use dimensional units',()=>{
 const x=defaults('nozzle'),d=calculate('nozzle',x),options=plotOptions(d);const m=options.find(o=>o.key==='nozzle-M').chart.series[0].points;assert.ok(m.some((p,i)=>i&&p[0]===m[i-1][0]&&p[1]!==m[i-1][1]));
 const density=options.find(o=>o.key==='nozzle-rho');assert.equal(density.chart.ylabel,'ρ (kg/m³)');near(density.chart.series[0].points.at(-1)[1],d.result.points.at(-1).rho);
 for(const view of ['External waves','Nozzle + external waves']){const data=calculate('nozzle',{...x,nozzleView:view,backRatio:.05});for(const o of plotOptions(data))assert.ok(!/NaN|Infinity|undefined/.test(chartSVG(o.chart).svg));}
});
test('Shock-tube profiles recover driver and driven states, contact pressure and laboratory velocity',()=>{
 const x=defaults('tube'),d=calculate('tube',x),plots=plotOptions(d,.001);const prop=k=>plots.find(o=>o.key==='tube-profile-'+k).chart.series[0].points;
 near(prop('p')[0][1],x.p4);near(prop('p').at(-1)[1],x.p1);near(prop('u')[0][1],0);near(prop('u').at(-1)[1],0);
 const contact=d.result.contact*.001,pair=prop('p').filter(([z])=>Math.abs(z-contact)<2e-9);assert.equal(pair.length,2);pair.forEach(([,v])=>near(v,d.result.p/1000));
 const hot=prop('T').filter(([z])=>Math.abs(z-contact)<2e-9);near(hot[0][1],d.result.T3);near(hot[1][1],d.result.T2);
});
test('Result panels are placed in the output column and plot controls remain in the chart area',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');const start=html.indexOf('<aside class="output-column"'),end=html.indexOf('</aside>',start),column=html.slice(start,end);
 for(const id of ['isentropicPanel','balancePanel','shockResults','results'])assert.ok(column.includes(`id="${id}"`),id);
 assert.ok(!column.includes('id="chart"'));assert.ok(html.includes('id="plotQuantity"'));
});

test('Cone profiles span the integrated surface-to-shock layer and preserve stagnation properties',()=>{
 const x={...defaults('cone'),M:2,thetaCone:9},d=calculate('cone',x),options=plotOptions(d),r=d.result;
 assert.equal(options[0].key,'cone-M');
 for(const key of ['M','p','T','rho','u','vr','vt','turn','p0','T0']){
  const o=options.find(z=>z.key==='cone-'+key);assert.ok(o,key);const points=o.chart.series[0].points;
  assert.ok(Math.abs(points[0][0]-x.thetaCone)<1e-6);assert.ok(Math.abs(points.at(-1)[0]-r.beta*180/Math.PI)<1e-10);
  assert.ok(points.every((p,i)=>!i||p[0]>=points[i-1][0]));assert.equal(o.chart.markers[0].name,'Cone surface');assert.equal(o.chart.markers[1].name,'Shock · downstream');
 }
 const get=k=>options.find(o=>o.key==='cone-'+k).chart.series[0].points;
 assert.ok(Math.abs(get('M')[0][1]-r.surface.M)<1e-10);assert.ok(Math.abs(get('M').at(-1)[1]-r.Mpost)<1e-10);
 for(const [,v] of get('T0'))assert.ok(Math.abs(v-1)<1e-9);
 const recovery=get('p0')[0][1];near(recovery,1);for(const [,v] of get('p0'))assert.ok(Math.abs(v-recovery)<1e-9);
 assert.ok(!options.some(o=>o.key==='cone-a'));for(const key of ['p','T','rho','u','vr','vt','p0','T0'])near(get(key).at(-1)[1],1);
});
