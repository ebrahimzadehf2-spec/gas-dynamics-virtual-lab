import {obliqueShock,expansion,deg,rad} from './physics.js';
import {mocProfilePlots} from './channel-moc.js';
import {comparisonProfile} from './channel-comparison.js';
// Every curve has one upstream reference. Shock curves are polar loci, not
// resolved profiles inside a discontinuity. Cross-section samples stay separate.
export function pressureTurningPlot(d){
 const {result:r,inputs:x,id}=d,g=d.gas?.gamma??x.gamma??1.4,series=[];let reference=1,note='Shock curves are pressure–deflection loci from their own upstream state; expansion curves are simple-wave paths. Pressure is normalized by the common inlet pressure.';
 if(r.ramjet||r.wallReflection)return null; // Existing dedicated p–theta diagrams.
 const addWave=(w,name)=>{
  const a=w.before,b=w.after;if(!a||!b||![a.theta,b.theta,a.p,b.p].every(Number.isFinite))return;
  const delta=b.theta-a.theta,shock=/shock/i.test(w.kind??'')||b.p>a.p*(1+1e-9),points=[];
  for(let i=0;i<=48;i++){
   const f=i/48,theta=a.theta+f*delta;
   if(!i){points.push([deg(a.theta),a.p/reference*(shock&&w.branch==='strong'&&Math.abs(delta)>1e-12?obliqueShock(a.M,0,g,'strong').p:1)]);continue;}
   if(i===48){points.push([deg(b.theta),b.p/reference]);continue;}
   if(Math.abs(delta)<1e-12){points.push([deg(theta),a.p/reference]);continue;}
   const z=shock?obliqueShock(a.M,Math.abs(delta)*f,g,w.branch??'weak'):expansion(a.M,Math.abs(delta)*f,g);
   points.push([deg(theta),a.p*z.p/reference]);
  }
  series.push({name,points});
 };
 const conePath=(c,name)=>{if(!c?.history?.length)return;series.push({name,points:c.history.map(z=>[deg(z.theta+Math.atan2(z.vt,z.vr)),z.p])});note='Conical-flow curve uses the actual velocity direction θ + atan2(Vθ,Vr), not the polar position angle. Wedge paths use 2D shock/expansion relations; each is normalized by its freestream pressure.';};
 if(r.bodyLab){
  reference=1;const w=r.wedge,free={M:w.M,p:1,theta:w.alpha};
  for(const f of w.faces)if(f.surface)addWave({before:free,after:f.surface,kind:f.kind},'Wedge '+f.side);
  conePath(r.cone,'Cone · meridian flow');
 }else if(id==='cone'){
  conePath(r,'Cone · shock to surface');
 }else if(id==='airfoil'){
  reference=r.freestream.p;
  if(r.models?.includes('nonlinear')){for(const w of r.nonlinear?.waves??[])addWave(w,w.side+' · '+w.id);for(const w of r.trailingEdge?.waves??[])addWave(w,w.side+' · trailing edge');}
  if(r.models?.includes('linear'))for(const side of ['Upper','Lower']){const panels=r.linear?.panels.filter(p=>p.side===side)??[];series.push({name:side+' · linearized panel states',points:[[deg(r.freestream.theta),1],...panels.map(p=>[deg(p.theta),1+g*x.M*x.M*p.Cp/2])]});}
  note+=' Linearized curves connect panel states; they are not nonlinear shock polars.';
 }else if(r.comparison){
  reference=r.s1.p;const p=comparisonProfile(r,x.comparisonStation??1);if(p)for(const key of ['se','moc'])series.push({name:key==='se'?'Shock–Expansion cross-section states':'MOC cross-section states',points:p.samples.map(z=>[deg(z[key].theta),z[key].p/reference]),scatter:true});
  note='States at the selected common cross-section. These samples are not a streamline history or shock polar.';
 }else if(r.moc){
  reference=r.s1.p;const plots=mocProfilePlots(r,x.mocStation??1),angle=plots.find(p=>/direction/i.test(p.label)),pressure=plots.find(p=>/static pressure/i.test(p.label));
  if(angle&&pressure)for(let i=0;i<angle.chart.series.length;i++){const a=angle.chart.series[i],b=pressure.chart.series[i];if(b&&a.points.length===b.points.length)series.push({name:'Cross-section · '+a.name,scatter:true,points:a.points.map((p,j)=>[p[1],b.points[j][1]*1000/reference])});}
  note='Numerical states at the selected cross-section. These samples are not a streamline history or shock polar.';
 }else if(r.tracking){
  reference=r.s1.p;const event=r.tracking.events.find(e=>e.index===r.selectedTrackingEvent)??r.tracking.events.at(-1);
  for(const [i,w]of (event?.waves??[]).entries())addWave(w,`Event ${event.index} · wave ${i+1}`);
  note+=' Only the selected event is shown. Finite expansion fronts retain the tracker approximation.';
 }else if(r.simpleCorner){
  reference=r.regions[1].p;addWave({before:r.regions[1],after:r.regions[2],kind:r.cornerKind==='oblique'?'Oblique shock':'Expansion fan',branch:x.branch},'Selected corner');
 }else if(['oblique','expansion'].includes(id)){
  reference=1;const turn=rad(x.theta)*(id==='expansion'?-1:1);addWave({before:{M:x.M1,p:1,theta:0},after:{M:r.M2,p:r.p,theta:turn},kind:id==='oblique'?'Oblique shock':'Expansion fan',branch:x.branch},'Selected turn');
 }else if(id==='wall'||id==='collision'){
  reference=r.s1?.p??r.regions?.[1]?.p??1;for(const [i,w]of (r.waves??[]).entries())addWave(w,w.title??`Wave ${i+1}`);
 }else if(id==='nozzle'&&r.external){
  reference=r.external.inlet.p;const j=r.external;if(j.samples?.length>1)series.push({name:j.title,points:j.samples.map(z=>[deg(z.theta??0),z.p/reference])});note='Local external nozzle-lip wave. Pressure is normalized by the nozzle exit pressure; internal axial nozzle flow is not a turning-flow solution.';
 }
 const valid=series.filter(s=>s.points.length>1&&s.points.every(p=>p.every(Number.isFinite)));
 if(!valid.length)return null;
 return {key:'pressure-turning',label:'Pressure–deflection diagram',note,chart:{title:'Pressure–deflection diagram',xlabel:'Flow direction θ (°)',ylabel:'p/pref',zeroBaseline:false,scatter:valid.every(s=>s.scatter===true),series:valid}};
}
