import {fittedInspectionHTML,selectedFittedPoint,fittedPointHTML,fittedExportRows} from './channel-moc-shocks-tables.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {solveFittedChannelMOC,fittedState,fittedJumpResidual,fittedProfilePlots} from './channel-moc-shocks.js';
import {solveChannelMOC} from './channel-moc.js';import {trackingPreset} from './wave-tracker.js';import {calculate,defaults} from './labs.js';import {sceneSVG} from './graphics.js';
import {probeFittedMOC,fittedMocGeometry} from './channel-moc-shocks-graphics.js';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const inputs=(name,N=61)=>({...defaults('wall'),...trackingPreset(name),channelSolver:'Method of characteristics',mocResolution:N});
test('Fitted MOC independently recovers the SciPy reference for four successive regular shocks',()=>{
 const x=inputs('reflection'),r=solveChannelMOC(x),ref=JSON.parse(readFileSync(new URL('./wave-tracker-reference.json',import.meta.url))).reflections;
 assert.equal(r.status,'ok');assert.ok(r.moc.fitted);assert.equal(r.tracking,undefined);assert.equal(r.moc.traces.length,4);
 for(let i=0;i<4;i++){const p=r.moc.traces[i].points[0],z=ref[i];for(const k of ['M','p','T','theta'])near(p.after[k],z[k],2e-8);near(p.x,z.x,2e-8);near(p.y,z.y,2e-8);near(p.beta,z.beta,2e-8);}
 assert.ok(r.moc.maxMassResidual<1e-8);assert.ok(r.moc.maxJumpResidual<1e-9);
});
test('Curved fitted shock converges to independently pressure-matched shock/fan limiting states',()=>{
 const ref=JSON.parse(readFileSync(new URL('./channel-moc-shocks-reference.json',import.meta.url))),errors=[];
 for(const N of [31,61,121]){const r=solveChannelMOC(inputs('shock-fan',N));assert.equal(r.status,'ok');const t=r.moc.traces[0],last=t.points.at(-1);assert.ok(Math.abs(last.beta-t.points[0].beta)>.005);
  for(const k of ['M','p','T','theta']){near(last.before[k],ref.upstream[k],1e-5);near(last.after[k],ref.downstream[k],1e-5);}near(last.beta,ref.beta,1e-5);
  assert.ok(last.after.p0<last.before.p0);errors.push(r.moc.maxMassResidual);
 }
 assert.ok(errors[1]<errors[0]&&errors[2]<errors[1]);assert.ok(errors[2]<.0006);
});
test('Every fitted point satisfies normal mass/momentum, tangent velocity, total enthalpy and entropy jumps',()=>{
 const r=solveChannelMOC(inputs('shock-fan',81));
 for(const t of r.moc.traces)for(const p of t.points){assert.ok(fittedJumpResidual(p.before,p.after,p.beta)<1e-9);assert.ok(p.after.p0<=p.before.p0*(1+1e-12));near(p.before.T0,p.after.T0,1e-10);}
 let maxP0=-Infinity,minP0=Infinity;
 for(const row of r.moc.rows)for(const part of row.parts)for(const z of part.z){const s=fittedState(r,z);near(s.T0,r.s1.T0,1e-12);near(s.p,s.rho*r.R*s.T,1e-12);assert.ok(s.M>1);assert.ok(s.p0<=r.s1.p0*(1+1e-10));maxP0=Math.max(maxP0,s.p0);minP0=Math.min(minP0,s.p0);}
 assert.ok(maxP0-minP0>1000,'The rotational solution must transport nonuniform stagnation pressure.');
});
test('One-sided profiles, dimensional contours, fitted black shocks and hover use local p0',()=>{
 const x=inputs('shock-fan',31),d=calculate('wall',x),r=d.result;
 assert.ok(d.shockDetails.length>=2);assert.ok(d.rows.some(v=>v.label==='Maximum shock-jump residual'));
 const profiles=fittedProfilePlots(r,.4);assert.ok(profiles.some(p=>p.key==='moc-p0'));
 const pp=profiles.find(p=>p.key==='moc-p').chart.series[0].points;assert.ok(pp.some((p,i)=>i&&p[0]===pp[i-1][0]&&Math.abs(p[1]-pp[i-1][1])>.1));
 for(const q of ['mach','pressure','temperature','density','speed']){const v=sceneSVG(d.scene,x,0,q);assert.equal(v.field.quantity,q);assert.ok(v.svg.includes('data-fitted-shock'));assert.ok(v.svg.includes('data-characteristic'));assert.ok(!/NaN|undefined|Infinity/.test(v.svg));}
 const v=fittedMocGeometry(r),row=r.moc.rows[Math.floor(r.moc.rows.length/3)],y=(row.parts[0].lo+row.parts[0].hi)/2,z=probeFittedMOC(r,v.X(row.x),v.Y(y));assert.ok(z&&z.p>0&&z.T>0);
});
test('Shock–Expansion is retained and remains a separate calculation for identical geometry',()=>{
 const x=inputs('shock-fan',31),m=calculate('wall',x),a=calculate('wall',{...x,channelSolver:'Shock–Expansion'});assert.ok(m.result.moc?.fitted);assert.equal(m.result.tracking,undefined);assert.ok(a.result.tracking);assert.equal(a.result.moc,undefined);
});
test('Unsupported shock/shock topology and detached/subsonic cases return explicit limits',()=>{
 const x=inputs('reflection',31),two=solveChannelMOC({...x,upperWallSegments:[{angle:-5,length:1}]});assert.equal(two.status,'unsupported');assert.equal(two.moc.rows.length,0);assert.match(two.reason,/shock\/shock\/contact/);
 assert.throws(()=>solveFittedChannelMOC({...x,mocResolution:10}),/31–201/);
 const steep=solveChannelMOC({...x,wallSegments:[{angle:35,length:1}],channelHeight:3});assert.equal(steep.status,'unsupported');assert.match(steep.reason,/attached|detached|maximum/i);
});

test('Mirroring the channel mirrors fitted shocks and changing R preserves dimensionless states',()=>{
 const x=inputs('shock-fan',31),a=solveChannelMOC(x),b=solveChannelMOC({...x,wallSegments:x.upperWallSegments.map(p=>({...p,angle:-p.angle})),upperWallSegments:x.wallSegments.map(p=>({...p,angle:-p.angle}))});assert.equal(b.status,'ok');
 for(let i=0;i<a.moc.traces.length;i++){const p=a.moc.traces[i].points.at(-1),q=b.moc.traces[i].points.at(-1);near(p.x,q.x,1e-7);near(p.y,1-q.y,1e-7);near(p.after.M,q.after.M,1e-7);near(p.after.theta,-q.after.theta,1e-7);}
 const c=solveChannelMOC({...x,R:400});near(c.moc.traces[0].points.at(-1).after.M,a.moc.traces[0].points.at(-1).after.M);assert.ok(c.moc.maxJumpResidual<1e-9);
});
test('Every fitted shock station can be inspected and all one-sided states are exported',()=>{
 const r=solveChannelMOC(inputs('reflection',31)),fmt=x=>Number(x).toPrecision(6);assert.ok(fittedInspectionHTML(r,fmt).includes('fittedShockPosition'));
 const first=selectedFittedPoint(r,2,0),last=selectedFittedPoint(r,2,1);assert.equal(first.trace.id,2);assert.ok(last.point.x>first.point.x);assert.ok(fittedPointHTML(last,fmt,r.R).includes('Stagnation pressure'));
 const rows=fittedExportRows(r),count=r.moc.traces.reduce((n,t)=>n+t.points.length,0);assert.equal(rows.length,count*19);assert.ok(rows.every(r=>Number.isFinite(r.value)));assert.equal(fittedExportRows({}).length,0);
});

test('Upstream states inside the centered fan approach its independent geometric characteristic relation',()=>{
 const errors=[];
 for(const N of [31,61,121]){const r=solveChannelMOC(inputs('shock-fan',N)),ps=r.moc.traces[0].points.filter(p=>p.before.theta>.0035&&p.before.theta<.0314);assert.ok(ps.length>3);
  errors.push(Math.max(...ps.map(p=>Math.abs(Math.atan2(p.y-1,p.x)-(p.before.theta-Math.asin(1/p.before.M))))));
 }
 assert.ok(errors[1]<errors[0]&&errors[2]<errors[1]);assert.ok(errors[2]<.01);
});
