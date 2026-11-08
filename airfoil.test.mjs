import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,inputDefinitions,chapters} from './labs.js';
import {solveAirfoil,airfoilGeometry,airfoilPlots} from './airfoil.js';
import {linearAirfoil,rad} from './physics.js';
import {sceneSVG,chartSVG} from './graphics.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
test('Symmetric diamond linear coefficients recover the existing thin-airfoil model',()=>{
 for(const alpha of [-4,0,4]){const x={...defaults('airfoil'),alpha},r=solveAirfoil(x),a=linearAirfoil(x);near(r.linear.CL,a.CL);near(r.linear.CD,a.CD);near(r.linear.CM,-.25*a.CL);assert.equal(r.nonlinear.status,'ok');}
});
test('Shock–expansion reflection symmetry and wave conservation hold',()=>{
 const x=defaults('airfoil'),positive=solveAirfoil(x),negative=solveAirfoil({...x,alpha:-x.alpha}),zero=solveAirfoil({...x,alpha:0});near(positive.nonlinear.CL,-negative.nonlinear.CL);near(positive.nonlinear.CD,negative.nonlinear.CD);near(positive.nonlinear.CM,-negative.nonlinear.CM);near(zero.nonlinear.CL,0);near(zero.nonlinear.CM,0);assert.ok(zero.nonlinear.CD>0);
 for(const w of positive.nonlinear.waves){near(w.before.T0,w.after.T0);if(w.kind==='Oblique shock'){assert.ok(w.after.p>w.before.p);assert.ok(w.after.p0<w.before.p0);const normal=(z,angle)=>z.rho*z.u*Math.sin(angle);near(normal(w.before,w.beta),normal(w.after,w.beta-Math.abs(rad(w.turn))),1e-8);}else if(w.kind==='Expansion fan'){assert.ok(w.after.p<w.before.p);near(w.after.p0,w.before.p0);}}
});
test('Flat plate forces and small-disturbance limits are consistent',()=>{
 const x={...defaults('airfoil'),airfoilShape:'Flat plate'},r=solveAirfoil(x),pU=r.nonlinear.panels[0].p,pL=r.nonlinear.panels[1].p,normal=(pL-pU)/r.q;near(r.nonlinear.CL,normal*Math.cos(rad(x.alpha)));near(r.nonlinear.CD,normal*Math.sin(rad(x.alpha)));near(r.nonlinear.CM,-normal*.25);
 const tiny=solveAirfoil({...x,alpha:.001});near(tiny.nonlinear.CL,tiny.linear.CL,1e-7);near(tiny.nonlinear.CD,tiny.linear.CD,1e-9);
});
test('Piecewise surface potentials integrate Cp with corner continuity and leading-edge constants',()=>{
 const r=solveAirfoil(defaults('airfoil'));for(const side of ['Upper','Lower']){const potential=r.linear.potential.filter(p=>p.side===side);near(potential[0].phi0,0);for(let i=0;i<potential.length;i++){const p=potential[i],panel=r.linear.panels.find(z=>z.id===p.id);near((p.phi1-p.phi0)/(p.x1-p.x0),-panel.Cp/2);near(p.derivative*p.x0+p.intercept,p.phi0);if(i)near(p.phi0,potential[i-1].phi1);}}
 assert.notEqual(r.linear.potential[1].phi1,r.linear.potential[3].phi1);
});
test('Custom geometries, method selection and unsupported surface states are explicit',()=>{
 const x=defaults('airfoil'),custom={...x,airfoilShape:'Custom panels'};assert.equal(airfoilGeometry(custom).panels.length,6);assert.equal(solveAirfoil(custom).nonlinear.status,'ok');
 assert.throws(()=>solveAirfoil({...custom,upperProfile:'0,0; .5,-.2; 1,0'}),/cross/);assert.throws(()=>solveAirfoil({...custom,lowerProfile:'0,0; .5,-.02; .4,-.03; 1,0'}),/increase/);
 const out=solveAirfoil({...x,M:1.1,alpha:10,thickness:.2});assert.equal(out.nonlinear.status,'unsupported');assert.equal(out.nonlinear.panels.length,0);assert.ok(out.warning);assert.ok(airfoilPlots(out).every(o=>!o.key.includes('airfoil-M')));
 const only=solveAirfoil({...x,M:1.1,alpha:10,thickness:.2,airfoilMethod:'Shock–Expansion'});assert.equal(only.status,'unsupported');assert.equal(airfoilPlots(only).length,0);
 assert.ok(inputDefinitions('airfoil',custom).some(f=>f.key==='upperProfile'));assert.ok(!inputDefinitions('airfoil',x).some(f=>f.key==='upperProfile'));
 assert.ok(chapters.find(c=>c[0]===6)[3].includes('airfoil')&&chapters.find(c=>c[0]===9)[3].includes('airfoil'));
});
test('Airfoil scenes, charts and shock reports are finite for every geometry',()=>{
 for(const airfoilShape of ['Flat plate','Diamond','Asymmetric double wedge','Custom panels']){
  const x={...defaults('airfoil'),airfoilShape,camber:.01},d=calculate('airfoil',x),view=sceneSVG(d.scene,x);assert.ok(!/NaN|Infinity|undefined/.test(view.svg));assert.equal(view.field.quantity,'cp');assert.ok(d.rows.every(r=>Number.isFinite(r.value)));for(const o of airfoilPlots(d.result))assert.ok(!/NaN|Infinity|undefined/.test(chartSVG(o.chart).svg));assert.ok(d.shockDetails.length);
 }
});

test('Nonlinear surface states and integrated forces match independent SciPy references',async()=>{
 const {readFileSync}=await import('node:fs'),refs=JSON.parse(readFileSync(new URL('./airfoil-reference.json',import.meta.url)));
 for(const ref of refs){const x={...defaults('airfoil'),...ref,airfoilShape:ref.thickness?'Asymmetric double wedge':'Flat plate'},r=solveAirfoil(x);assert.equal(r.nonlinear.status,'ok');for(const key of ['CL','CD','CM'])near(r.nonlinear[key],ref[key],2e-9);r.nonlinear.panels.forEach((p,i)=>{near(p.Cp,ref.panels[i].Cp,2e-9);near(p.M,ref.panels[i].M,2e-9);near(p.p/r.freestream.p,ref.panels[i].p,2e-9);near(p.T/r.freestream.T,ref.panels[i].T,2e-9);});}
});
