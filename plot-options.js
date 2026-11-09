import {comparisonPlots} from './channel-comparison.js';
import {trackingPlots} from './wave-tracker.js?v=20261109-compare-channel';
import {regularChannelPlots} from './regular-channel.js?v=20261109-compare-channel';
import {mocProfilePlots} from './channel-moc.js?v=20261109-compare-channel';
import {channelPlots} from './wave-channel.js?v=20261109-compare-channel';
import {wallPlots} from './wave-wall.js?v=20261109-compare-channel';
import {airfoilPlots} from './airfoil.js?v=20261109-compare-channel';
import {sonicRelations} from './reference-relations.js?v=20261109-compare-channel';
import {linspace,deg,rad,isentropic,isentropicRelations,state,normalShock,obliqueShock,expansion,rayleighRatios,fannoRatios,linearAirfoil} from './physics.js';
// Each selectable property has its own units and axis. Unavailable states are omitted.
export function plotOptions(d,time=.001){
 const {id,inputs:x,result:r}=d,g=x.gamma??1.4,R=x.R??287,options=[];
 const add=(key,label,xlabel,ylabel,points,extra={})=>options.push({key,label,chart:{title:label,xlabel,ylabel,zeroBaseline:false,series:[{name:label,points:points.filter(p=>p.every(Number.isFinite))}],...extra}});
 const family=(prefix,xlabel,samples,properties)=>{for(const [key,label,unit,value] of properties)add(prefix+key,label,xlabel,unit,samples.map(([a,s])=>[a,value(s)]));};
 if(id==='wall'&&r.simpleCorner)return plotOptions({...d,id:r.cornerKind},time);
 if(id==='wall')return r.comparison?comparisonPlots(r,x.comparisonStation):r.tracking?trackingPlots(r,x.trackingStation):r.interaction?regularChannelPlots(r):r.moc?mocProfilePlots(r,x.mocStation):r.channel?channelPlots(r):wallPlots(r);
 if(id==='airfoil')return airfoilPlots(r);
 const original={key:'overview',label:d.chart.title,chart:d.chart};options.push(original);
 if(id==='foundations'){
  const samples=[...new Set([...linspace(.02,Math.max(5,x.M*1.15),201),x.M])].sort((a,b)=>a-b).map(m=>[m,{...state(m,x.T1,x.p1*1000,g,R),...isentropicRelations(m,g)}]);
  family('iso-','Mach number M',samples,[['pP0','Pressure ratio p/p₀','p/p₀',s=>s.pP0],['rhoRho0','Density ratio ρ/ρ₀','ρ/ρ₀',s=>s.rhoRho0],['TT0','Temperature ratio T/T₀','T/T₀',s=>s.TT0],['pPstar','Pressure ratio p/p*','p/p*',s=>s.pPstar],['rhoRhostar','Density ratio ρ/ρ*','ρ/ρ*',s=>s.rhoRhostar],['TTstar','Temperature ratio T/T*','T/T*',s=>s.TTstar],['areaRatio','Critical area ratio A/A*','A/A*',s=>s.areaRatio],['machAngle','Mach angle μ','μ (°)',s=>s.machAngle??NaN],['pmAngle','Prandtl–Meyer angle ν','ν (°)',s=>s.pmAngle??NaN],['T0','Stagnation temperature','T₀ (K)',s=>s.T0],['p0','Stagnation pressure','p₀ (kPa)',s=>s.p0/1000],['a','Speed of sound','a (m/s)',s=>s.a],['u','Flow speed','u (m/s)',s=>s.u],['rho','Density','ρ (kg/m³)',s=>s.rho],['M','Mach number M','M',s=>s.M]]);
  // Direct ratios are more useful than mixing inverse stagnation ratios by default.
  options.shift();options.forEach(o=>o.note='Static inlet temperature and pressure are held fixed. Sonic reference uses the same stagnation state. Angle curves start at M ≥ 1; M = 0 is excluded from the area-ratio curve.');
 }else if(id==='normal'){
  const a=state(x.M1,x.T1,x.p1*1000,g,R),samples=linspace(1,Math.max(5,x.M1*1.1)).map(m=>{const n=normalShock(m,g);return [m,{...n,b:state(n.M2,x.T1*n.T,x.p1*1000*n.p,g,R)}];});
  family('normal-','Upstream Mach M₁',samples,[['M','Downstream Mach','M₂',s=>s.M2],['p','Pressure ratio','p₂/p₁',s=>s.p],['rho','Density ratio','ρ₂/ρ₁',s=>s.rho],['T','Temperature ratio','T₂/T₁',s=>s.T],['p0','Stagnation-pressure recovery','p₀₂/p₀₁',s=>s.p0],['u','Speed ratio','u₂/u₁',s=>s.u],['dsR','Normalized entropy increase','Δs/R',s=>s.ds_R],['u1','Upstream speed','u₁ (m/s)',s=>s.b.u/s.u],['ds','Entropy increase','Δs (J/(kg·K))',s=>R*s.ds_R],['p2','Downstream pressure','p₂ (kPa)',s=>s.b.p/1000],['T2','Downstream temperature','T₂ (K)',s=>s.b.T],['rho2','Downstream density','ρ₂ (kg/m³)',s=>s.b.rho],['u2','Downstream speed','u₂ (m/s)',s=>s.b.u],['p02','Downstream stagnation pressure','p₀₂ (kPa)',s=>s.b.p0/1000],['T02','Stagnation temperature','T₀ (K)',s=>s.b.T0]]);
 }else if(id==='rayleigh'||id==='fanno'){
  const fn=id==='rayleigh'?rayleighRatios:fannoRatios,ms=linspace(.12,Math.max(4,x.M1*1.1,(r.s2?.M??0)*1.1)),samples=ms.map(m=>[m,{...fn(m,g),...(id==='fanno'?{T0:1}:{})}]);
  family(id+'-','Mach number M',samples,[['p','Static pressure ratio','p/p*',s=>s.p],['T','Static temperature ratio','T/T*',s=>s.T],['rho','Density ratio','ρ/ρ*',s=>s.rho],['u','Speed ratio','u/u*',s=>s.u],['T0','Stagnation-temperature ratio','T₀/T₀*',s=>s.T0],['p0','Stagnation-pressure ratio','p₀/p₀*',s=>s.p0]]);
  const ref=fn(x.M1,g),cp=g*R/(g-1),physical=s=>({p:r.s1.p*s.p/ref.p,T:r.s1.T*s.T/ref.T,rho:r.s1.rho*s.rho/ref.rho,u:r.s1.u*s.u/ref.u,T0:r.s1.T0*(s.T0??1)/(ref.T0??1),p0:r.s1.p0*s.p0/ref.p0});
  family(id+'-dim-','Mach number M',samples.map(([m,s])=>[m,physical(s)]),[['p','Static pressure','p (kPa)',s=>s.p/1000],['T','Static temperature','T (K)',s=>s.T],['rho','Density','ρ (kg/m³)',s=>s.rho],['u','Flow speed','u (m/s)',s=>s.u],['T0','Stagnation temperature','T₀ (K)',s=>s.T0],['p0','Stagnation pressure','p₀ (kPa)',s=>s.p0/1000]]);
  if(id==='rayleigh')add('rayleigh-heat','Heat relative to inlet','Mach number M','q (kJ/kg)',samples.map(([m,s])=>[m,cp*(physical(s).T0-r.s1.T0)/1000]));
  options.forEach(o=>o.note='Theoretical locus anchored to the inlet state. Not every plotted point is reachable from that inlet; branch and choking constraints still apply.');
  add('entropy-star','Entropy deficit to sonic reference','Mach number M','(s* − s)/R',ms.map(m=>[m,sonicRelations(id,m,g).entropyToStar]));
  if(id==='fanno')add('friction','Available friction length','Mach number M','fᴅL*/D',ms.map(m=>[m,fn(m,g).F]));
 }else if(id==='oblique'||id==='expansion'){
  let samples,xlabel;
  if(id==='oblique'){xlabel='Flow turn θ (°)';samples=linspace(0,deg(r.thetaMax)*(1-1e-8),121).map(t=>[t,obliqueShock(x.M1,rad(t),g,x.branch)]);}
  else{xlabel='Flow turn θ (°)';samples=linspace(0,Math.max(r.effectiveTurn??x.theta,.001),121).map(t=>[t,expansion(x.M1,rad(t),g)]);}
  family('wave-',xlabel,samples,[['M','Downstream Mach','M₂',s=>s.M2],['p','Pressure ratio','p₂/p₁',s=>s.p],['T','Temperature ratio','T₂/T₁',s=>s.T],['rho','Density ratio','ρ₂/ρ₁',s=>s.rho],['p0','Stagnation-pressure recovery','p₀₂/p₀₁',s=>s.p0]]);
  add('wave-speed','Speed ratio',xlabel,'u₂/u₁',samples.map(([t,z])=>[t,z.M2/x.M1*Math.sqrt(z.T)]));
  if(r.simpleCorner)family('wave-dimensional-',xlabel,samples.map(([angle,w])=>[angle,state(w.M2,x.T1*w.T,x.p1*1000*w.p,g,R)]),[['p','Downstream pressure','p (kPa)',z=>z.p/1000],['T','Downstream temperature','T (K)',z=>z.T],['rho','Downstream density','ρ (kg/m³)',z=>z.rho],['u','Downstream speed','u (m/s)',z=>z.u],['p0','Downstream stagnation pressure','p₀ (kPa)',z=>z.p0/1000],['T0','Downstream stagnation temperature','T₀ (K)',z=>z.T0]]);
  if(id==='oblique')add('beta','Shock angle',xlabel,'β (°)',samples.map(([t,s])=>[t,deg(s.beta)]));
 }else if(id==='cone'){
  if(!r.history)return [];
  const samples=r.history.map(s=>[deg(s.theta),s]).reverse();
  const post=r.history[0],postSpeed=Math.hypot(post.vr,post.vt);
  const properties=[['M','Mach number','M',s=>s.M],['p','Static pressure ratio','p/p₂',s=>s.p/post.p],['T','Static temperature ratio','T/T₂',s=>s.T/post.T],['rho','Density ratio','ρ/ρ₂',s=>s.rho/post.rho],['u','Flow speed ratio','u/u₂',s=>Math.hypot(s.vr,s.vt)/postSpeed],['vr','Radial velocity component ratio','Vᵣ/Vᵣ₂',s=>s.vr/post.vr],['vt','Polar velocity component ratio','Vθ/Vθ₂',s=>s.vt/post.vt],['turn','Flow direction','δ (°)',s=>deg(s.theta+Math.atan2(s.vt,s.vr))],['p0','Stagnation-pressure ratio','p₀/p₀₂',s=>s.p*isentropic(s.M,g).p0p/(post.p*isentropic(post.M,g).p0p)],['T0','Stagnation-temperature ratio','T₀/T₀₂',s=>s.T*isentropic(s.M,g).T0T/(post.T*isentropic(post.M,g).T0T)]];
  // Plot the integrated field from the cone surface to the downstream side of the shock.
  options.shift();
  for(const [key,label,unit,value] of properties){
   const points=samples.map(([theta,z])=>[theta,value(z)]);
   add('cone-'+key,label+' · cone to shock','Polar angle θ (°)',unit,points,{markers:[{name:'Cone surface',x:points[0][0],y:points[0][1]},{name:'Shock · downstream',x:points.at(-1)[0],y:points.at(-1)[1],anchor:'end'}]});
   options.at(-1).note='Cone surface → downstream side of shock · reference state 2: immediately behind shock';
  }
 }else if(id==='nozzle'){
  if(r.external){const j=r.external,exp=j.status==='expansion',samples=exp?j.samples.map(z=>[deg(z.theta),z]):j.outlet?[[0,j.inlet],[.5,j.inlet],[.5,j.outlet],[1,j.outlet]]:[[0,j.inlet],[1,j.inlet]];
   family('external-',exp?'Flow turn θ (°)':'Across local wave · schematic coordinate',samples,[['M','External Mach','M',s=>s.M],['p','External pressure','p (kPa)',s=>s.p/1000],['T','External temperature','T (K)',s=>s.T],['rho','External density','ρ (kg/m³)',s=>s.rho],['u','External speed','u (m/s)',s=>s.u],['p0','External stagnation pressure','p₀ (kPa)',s=>s.p0/1000],['T0','External stagnation temperature','T₀ (K)',s=>s.T0]]);
  }else{
   family('nozzle-','Axial position x/L',r.points.map(s=>[s.x,s]),[['M','Mach number','M',s=>s.M],['p','Static pressure','p (kPa)',s=>s.P/1000],['pratio','Static pressure ratio','p/p₀, inlet',s=>s.p],['T','Static temperature','T (K)',s=>s.T],['rho','Density','ρ (kg/m³)',s=>s.rho],['u','Flow speed','u (m/s)',s=>s.u],['a','Speed of sound','a (m/s)',s=>Math.sqrt(g*R*s.T)],['p0','Stagnation pressure','p₀ (kPa)',s=>s.P*isentropic(s.M,g).p0p/1000],['T0','Stagnation temperature','T₀ (K)',s=>s.T*isentropic(s.M,g).T0T],['area','Cross-sectional area','A (cm²)',s=>s.area*1e4],['mass','Mass flow rate','ṁ (kg/s)',s=>s.massFlow]]);
  }
 }else if(id==='balances'){
  const samples=[[1,r.a],[2,r.b]];
  family('cv-','Station: 1 inlet · 2 outlet',samples,[['p','Static pressure','p (kPa)',s=>s.p/1000],['T','Static temperature','T (K)',s=>s.T],['rho','Density','ρ (kg/m³)',s=>s.rho],['M','Mach number','M',s=>s.M],['u','Flow speed','u (m/s)',s=>s.u],['h','Enthalpy','h (kJ/kg)',s=>r.cp*s.T/1000],['ke','Kinetic energy','u²/2 (kJ/kg)',s=>s.u*s.u/2000],['h0','Total specific energy','h₀ (kJ/kg)',s=>r.cp*s.T0/1000],['T0','Stagnation temperature','T₀ (K)',s=>s.T0],['p0','Stagnation pressure','p₀ (kPa)',s=>s.p0/1000]]);
  for(const [k,t] of Object.entries(r.terms)){const scale=k==='energy'?1000:1;add('cv-terms-'+k,k+' balance · signed contributions','Contribution number',k==='energy'?'kW':t.unit,t.terms.map(([,v],i)=>[i+1,v/scale]),{scatter:true,zeroBaseline:true});options.at(-1).note=t.terms.map(([name],i)=>`${i+1}: ${name}`).join(' · ');}
  add('cv-mass','Mass flow rate','Station','ṁ (kg/s)',[[1,r.m1],[2,r.m2]]);add('cv-area','Area','Station','A (cm²)',[[1,r.A1*1e4],[2,r.A2*1e4]]);
 }else if(id==='linear'){
  for(const s of d.chart.series)add('surface-'+s.name,s.name,'Chord position x/c','Cp',s.points);
  family('airfoil-','Angle of attack α (°)',linspace(-10,10,121).map(a=>[a,linearAirfoil({...x,alpha:a})]),[['CL','Lift coefficient','CL',s=>s.CL],['CD','Wave-drag coefficient','CD,wave',s=>s.CD],['UF','Upper-front pressure coefficient','Cp',s=>s.CpUF],['UR','Upper-rear pressure coefficient','Cp',s=>s.CpUR],['LF','Lower-front pressure coefficient','Cp',s=>s.CpLF],['LR','Lower-rear pressure coefficient','Cp',s=>s.CpLR]]);
 }else if(id==='collision'){
  const samples=Object.entries(r.regions).map(([n,z])=>[Number(n),{M:z.M,p:z.p/r.regions[1].p,T:z.T/r.regions[1].T,rho:z.rho/r.regions[1].rho,p0:z.p0/r.regions[1].p0}]);
  family('regions-','Region number · comparison only',samples,[['M','Region Mach numbers','M',s=>s.M],['p','Region pressure ratios','p/p₁',s=>s.p],['T','Region temperature ratios','T/T₁',s=>s.T],['rho','Region density ratios','ρ/ρ₁',s=>s.rho],['p0','Region stagnation-pressure recovery','p₀/p₀₁',s=>s.p0]]);
  options.filter(o=>o.key.startsWith('regions-')).forEach(o=>{o.chart.scatter=true;o.note='Independent uniform regions are compared; points do not represent a spatial path.';});
 }else if(id==='tube'){
  const t=Math.max(1e-6,time),bounds=[r.head*t,r.tail*t,r.contact*t,r.shockSpeed*t],left=Math.min(-1,bounds[0]*1.1),right=Math.max(1.8,bounds.at(-1)*1.1);
  const get=z=>{const xi=z/t;let T,p,u=0;if(xi<r.head){T=x.T4;p=x.p4*1000;}else if(xi<r.tail){const a=2*r.a4/(g+1)-(g-1)*xi/(g+1);T=a*a/(g*R);p=x.p4*1000*(a/r.a4)**(2*g/(g-1));u=2*(r.a4+xi)/(g+1);}else if(xi<r.contact){T=r.T3;p=r.p;u=r.u;}else if(xi<r.shockSpeed){T=r.T2;p=r.p;u=r.u;}else{T=x.T1;p=x.p1*1000;}return {T,p,u,rho:p/(R*T),M:u/Math.sqrt(g*R*T)};};
  const positions=[...linspace(left,right,220),...bounds.flatMap(b=>[b-1e-9,b+1e-9])].sort((a,b)=>a-b),samples=positions.map(z=>[z,get(z)]);
  family('tube-profile-','Position x (m)',samples,[['p','Pressure profile','p (kPa)',s=>s.p/1000],['T','Temperature profile','T (K)',s=>s.T],['rho','Density profile','ρ (kg/m³)',s=>s.rho],['u','Velocity profile','u (m/s)',s=>s.u],['M','Laboratory-frame Mach profile','M = u/a',s=>s.M],['a','Sound-speed profile','a (m/s)',s=>Math.sqrt(g*R*s.T)],['T0','Stagnation-temperature profile','T₀ (K)',s=>s.T*isentropic(s.M,g).T0T],['p0','Stagnation-pressure profile','p₀ (kPa)',s=>s.p*isentropic(s.M,g).p0p/1000]]);
  options.filter(o=>o.key.startsWith('tube-profile-')).forEach(o=>o.note=`Analytical infinite-tube similarity solution at t = ${(t*1000).toFixed(3)} ms, before end-wall reflections.`);
 }
 // Existing multi-series charts can also be inspected one curve at a time.
 if(d.chart.series.length>1)for(const [i,s] of d.chart.series.entries())options.push({key:'curve-'+i,label:s.name,chart:{...d.chart,title:s.name,series:[s]}});
 return options.filter(o=>o.chart.series.some(s=>s.points.length));
}
