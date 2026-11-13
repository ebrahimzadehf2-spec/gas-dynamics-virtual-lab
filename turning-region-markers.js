import {deg} from './physics.js';
export function annotateTurningRegions(d,plot){
 if(plot.key!=='pressure-turning'&&!/p-theta/.test(plot.key))return plot;
 const r=d.result,x=d.inputs,markers=[],g=d.gas?.gamma??x.gamma??1.4;
 const add=(name,theta,p)=>{if(Number.isFinite(theta)&&Number.isFinite(p))markers.push({name:String(name),x:deg(theta),y:p});};
 const state=(name,z,reference=1)=>{if(z)add(name,z.theta,z.p/reference);};
 const cone=(c,prefix='')=>{if(!c?.history?.length)return;for(const [name,z]of [['Shock',c.history[0]],['Surface',c.history.at(-1)]])add(prefix+name,z.theta+Math.atan2(z.vt,z.vr),z.p);};
 if(r.ramjet)for(const [n,z]of Object.entries(r.regions))state(n,z,r.s1.p);
 else if(r.wallReflection)for(const [n,z]of Object.entries(r.wallReflection.regions))state(n,z);
 else if(r.bodyLab){state('1',{theta:r.wedge.alpha,p:1});for(const f of r.wedge.faces)state(f.side==='Upper'?'2':'3',f.surface);cone(r.cone,'Cone · ');}
 else if(d.id==='cone')cone(r);
 else if(d.id==='airfoil'){
  state('∞',r.freestream,r.freestream.p);
  if(r.models.includes('nonlinear')){for(const p of r.nonlinear.panels)state(p.id,p,r.freestream.p);for(const w of r.trailingEdge?.waves??[])state(w.id+'+',w.after,r.freestream.p);}
  if(r.models.includes('linear'))for(const p of r.linear.panels)add(p.id+' (linear)',p.theta,1+g*x.M*x.M*p.Cp/2);
 }else if(r.moc||r.comparison){
  for(const s of plot.chart.series){const ps=s.points;if(!ps.length)continue;for(const [name,i]of [['Lower',0],['Centre',Math.floor((ps.length-1)/2)],['Upper',ps.length-1]])markers.push({name:(r.comparison?(s.name.startsWith('MOC')?'MOC · ':'SE · '):'')+name,x:ps[i][0],y:ps[i][1]});}
 }else if(r.regions){const ref=r.s1?.p??r.regions[1]?.p??1;for(const [n,z]of Object.entries(r.regions))state(r.regionLabels?.[n]??n.replace(/^Region\s+/,''),z,ref);}
 else if(['oblique','expansion'].includes(d.id)){add('1',0,1);add('2',(d.id==='expansion'?-1:1)*x.theta*Math.PI/180,r.p);}
 else if(d.id==='nozzle'&&r.external){const j=r.external;state('Exit',{...j.inlet,theta:0},j.inlet.p);state('After wave',{...j.outlet,theta:j.theta},j.inlet.p);}
 if(!markers.length)markers.push(...(plot.chart.markers??[]));
 // Coincident matched states stay one point with all their original labels.
 const combined=[];for(const m of markers){const same=combined.find(z=>Math.abs(z.x-m.x)<1e-7&&Math.abs(z.y-m.y)<1e-7*Math.max(1,Math.abs(m.y)));if(same){if(!same.names.includes(m.name))same.names.push(m.name);}else combined.push({...m,names:[m.name]});}
 return {...plot,chart:{...plot.chart,regionMarkers:true,markers:combined.map(({names,...m})=>({...m,name:names.join(' / ')}))}};
}
