const airfoilPalette=['#2536c7','#0879f5','#00c8dc','#16bf59','#efe51b','#ff9718','#ee2727'];
function surfaceColor(t){
 const v=Math.max(0,Math.min(1,t))*(airfoilPalette.length-1),i=Math.min(airfoilPalette.length-2,Math.floor(v)),f=v-i;
 const rgb=c=>c.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)),a=rgb(airfoilPalette[i]),b=rgb(airfoilPalette[i+1]);
 return '#'+a.map((v,k)=>Math.round(v+(b[k]-v)*f).toString(16).padStart(2,'0')).join('');
}

// Cp is a uniform surface-panel value, not a resolved exterior field.
export function airfoilDrawing(s,{txt,line,poly,fmt,incidenceGlyph}){
 const available=s.models.includes('nonlinear')&&s.nonlinear.status==='ok';
 const model=available?'nonlinear':s.models.includes('linear')?'linear':null,z=model?s[model]:null;
 const L=430,V=p=>[108+p.x*L,150-p.y*L];
 const cps=z?.panels.map(p=>p.Cp)??[],min=cps.length?Math.min(...cps):0,max=cps.length?Math.max(...cps):0;
 const color=v=>surfaceColor(max-min<1e-12?.5:(v-min)/(max-min));
 const ray=(origin,angle,r)=>[origin[0]+r*Math.cos(angle),origin[1]-r*Math.sin(angle)];
 let inner='<rect width="640" height="300" fill="#fcfdfc"/>';
 inner+='<defs><clipPath id="airfoil-wave-window"><rect x="20" y="46" width="600" height="188"/></clipPath></defs>';
 inner+=txt(24,29,'SUPERSONIC AIRFOIL','#53616b',13)+txt(616,29,`${s.geometry.panels.length} surface regions`,'#263c4d',14,'end');
 inner+='<g clip-path="url(#airfoil-wave-window)" stroke-linecap="round" stroke-linejoin="round">';
 // Finite rays deliberately stop locally: downstream wave interactions are not solved.
 if(available)for(const w of s.nonlinear.waves){
  if(w.kind==='No wave')continue;
  const origin=V(w.origin),sign=w.side==='Upper'?1:-1;
  if(w.kind==='Oblique shock'){
   const end=ray(origin,w.before.theta+sign*w.beta,130);
   inner+=`<g data-wave="shock" data-region="${w.id}">${line(...origin,...end,'#000000',1.35)}</g>`;
  }else{
   const a=w.before.theta+sign*Math.asin(1/w.before.M),b=w.after.theta+sign*Math.asin(1/w.after.M);
   const count=Math.max(2,Math.min(9,Math.ceil(Math.abs(b-a)*180/Math.PI/2)+1)),radius=119;
   const arc=Array.from({length:25},(_,i)=>ray(origin,a+(b-a)*i/24,radius));
   inner+=`<g data-wave="expansion" data-region="${w.id}">`+poly([origin,...arc],'#edf4fa');
   for(let i=0;i<count;i++){
    const end=ray(origin,a+(b-a)*i/(count-1),radius),edge=i===0||i===count-1;
    inner+=line(...origin,...end,edge?'#477caa':'#8baec9',edge?.95:.6);
   }
   inner+='</g>';
  }
 }
 const body=[...s.geometry.upper,...s.geometry.lower.slice().reverse()].map(V);
 inner+=poly(body,'#f2f4f5');
 // Each actual surface edge is black until its accepted Cp is available.
 for(const p of s.geometry.panels){
  const value=z?.panels.find(v=>v.id===p.id)?.Cp,accepted=Number.isFinite(value);
  inner+=`<g data-surface-region="${p.id}" data-surface-state="${accepted?'solved':'pending'}"><title>${p.id}${accepted?': Cp = '+fmt(value,6):''}</title>`+line(...V(p.a),...V(p.b),accepted?color(value):'#000000',2.2)+'</g>';
 }
 for(const p of s.geometry.panels){
  const sign=p.side==='Upper'?1:-1,nx=-Math.sin(p.theta)*sign,ny=-Math.cos(p.theta)*sign;
  const [ax,ay]=V(p.a),[bx,by]=V(p.b),mx=(ax+bx)/2,my=(ay+by)/2;
  // Direction arrows sit outside the surface; short panels omit the arrow.
  if(p.length*L>48){
   const dx=Math.cos(p.theta),dy=-Math.sin(p.theta),cx=mx+nx*32,cy=my+ny*32;
   inner+=line(cx-15*dx,cy-15*dy,cx+15*dx,cy+15*dy,'#647681',.9);
   inner+=poly([[cx+15*dx,cy+15*dy],[cx+10*dx-2*dy,cy+10*dy+2*dx],[cx+10*dx+2*dy,cy+10*dy-2*dx]],'#647681');
  }
  inner+=txt(mx+nx*19,my+ny*19+4,p.id,'#253945',13,'middle');
 }
 inner+=incidenceGlyph(s.alpha,26,148,56,'#536977')+'</g>';
 inner+=line(108,249,538,249,'#a5b1b7',.8)+line(108,245,108,253,'#a5b1b7',.8)+line(538,245,538,253,'#a5b1b7',.8);
 inner+=txt(108,269,'LE · x/c = 0','#53616b',12)+txt(538,269,'TE · x/c = 1','#53616b',12,'end');
 inner+=line(200,289,222,289,'#000000',1.35)+txt(229,293,'Shock','#53616b',12)+line(317,289,339,289,'#477caa',.95)+txt(346,293,'Expansion fan','#53616b',12);
 return {inner,label:'Supersonic airfoil · analytical surface solution',meta:'Surface-edge color: panel Cp · local wave directions · body-fixed geometry',field:model?{quantity:'cp',options:['cp'],label:'Surface pressure coefficient Cp',min,max,units:'Cp',note:model==='nonlinear'?'Shock–Expansion · uniform Cp on each surface panel':'Linearized · uniform Cp on each surface panel',palette:airfoilPalette}:null};
}
