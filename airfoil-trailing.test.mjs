import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {solveAirfoil} from './airfoil.js';
import {solveTrailingEdge} from './airfoil-trailing.js';
import {defaults,calculate} from './labs.js';
import {sceneSVG} from './graphics.js';
import {airfoilTables} from './airfoil-tables.js';
const near=(a,b,t=2e-8)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const solve=x=>solveAirfoil({...defaults('airfoil'),...x});
test('Symmetric trailing edge gives two shocks, zero wake angle and identical downstream streams',()=>{
 const t=solve({alpha:0}).trailingEdge;assert.equal(t.status,'ok');near(t.phi,0);assert.equal(t.interfaceKind,'Common streamline');
 for(const w of t.waves)assert.equal(w.kind,'Oblique shock');near(t.upper.after.M,t.lower.after.M);near(t.pressure,100970.48149048);
});
test('Incidence determines the wake direction; mirror reflection swaps the two sides',()=>{
 const p=solve({alpha:4}).trailingEdge,n=solve({alpha:-4}).trailingEdge;assert.equal(p.status,'ok');assert.equal(p.interfaceKind,'Slip line');assert.ok(p.slipAngle>4);near(p.slipAngle,-n.slipAngle);near(p.pressure,n.pressure);near(p.upper.after.M,n.lower.after.M);
 const flat=solve({airfoilShape:'Flat plate',alpha:4}).trailingEdge;assert.equal(flat.upper.kind,'Oblique shock');assert.equal(flat.lower.kind,'Expansion fan');
 const zero=solve({airfoilShape:'Flat plate',alpha:0}).trailingEdge;assert.ok(zero.waves.every(w=>w.kind==='No wave'));near(zero.pressure,101000);
});
test('Matched pressure/direction, shock conservation and expansion entropy hold',()=>{
 for(const inputs of [{alpha:0},{alpha:4},{airfoilShape:'Flat plate',alpha:4},{gamma:5/3,M:4,alpha:2}]){
  const t=solve(inputs).trailingEdge;near(t.upper.after.p,t.lower.after.p,1e-10);near(t.upper.after.theta,t.lower.after.theta,1e-12);
  for(const w of t.waves){const a=w.before,b=w.after;near(a.T0,b.T0,1e-10);near(b.p,b.rho*b.R*b.T);
   if(w.kind==='Oblique shock'){
    const turn=Math.abs(b.theta-a.theta),vn1=a.u*Math.sin(w.beta),vn2=b.u*Math.sin(w.beta-turn);
    near(a.rho*vn1,b.rho*vn2);near(a.p+a.rho*vn1*vn1,b.p+b.rho*vn2*vn2);assert.ok(b.p0<a.p0);
   }else near(a.p0,b.p0,1e-10);
  }
 }
});
test('Trailing edge matches independent pressure-based SciPy roots',()=>{
 const refs=JSON.parse(readFileSync(new URL('./airfoil-trailing-reference.json',import.meta.url)));
 for(const r of refs){const t=solve(r.inputs).trailingEdge;near(t.pressure,r.pressure);for(const side of ['upper','lower'])for(const key of ['M','p','T','theta'])near(t[side].after[key],r[side][key]);}
});
test('Unsupported matching retains surface results; no fabricated wake is drawn',()=>{
 const p={M:3,p:101000,T:300};const t=solveTrailingEdge({...p,theta:-1.4},{...p,theta:1.4});assert.equal(t.status,'unsupported');assert.equal(t.waves,undefined);
 const r=solve({alpha:4});r.trailingEdge=t;assert.ok(Number.isFinite(r.nonlinear.CL));const svg=sceneSVG({kind:'airfoil',...r},defaults('airfoil')).svg;assert.ok(!svg.includes('data-trailing-interface'));
 assert.ok(airfoilTables(r,v=>String(v)).includes('Not resolved:'));
});
test('Trailing states are shown in the table, exported and included in every shock report',()=>{
 const x={...defaults('airfoil'),alpha:4},d=calculate('airfoil',x),t=d.result.trailingEdge;
 const html=airfoilTables(d.result,v=>String(v));assert.ok(html.includes('TE-U+'));assert.ok(html.includes('TE-L−'));assert.ok(!/NaN|undefined/.test(html));
 assert.equal(d.shockDetails.filter(s=>s.title.includes('trailing-edge shock')).length,t.waves.filter(w=>w.kind==='Oblique shock').length);
 assert.ok(d.rows.some(r=>r.label.includes('TE-U · after · Mach')));assert.ok(d.checks.trailingPressure<1e-9);
 const svg=sceneSVG(d.scene,x).svg;assert.ok(svg.includes('data-trailing-interface="Slip line"'));assert.ok(svg.includes('data-region="TE-U"'));
});
