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
 const trailing=available&&s.trailingEdge?.status==='ok'?s.trailingEdge:null;
 const L=350,leadingX=84,trailingX=leadingX+L,V=p=>[leadingX+p.x*L,150-p.y*L];
 const cps=z?.panels.map(p=>p.Cp)??[],min=cps.length?Math.min(...cps):0,max=cps.length?Math.max(...cps):0;
 const color=v=>surfaceColor(max-min<1e-12?.5:(v-min)/(max-min));
 const ray=(origin,angle,r)=>[origin[0]+r*Math.cos(angle),origin[1]-r*Math.sin(angle)];
 let inner='<rect width="640" height="300" fill="#fcfdfc"/>';
 inner+='<defs><clipPath id="airfoil-wave-window"><rect x="20" y="46" width="600" height="188"/></clipPath></defs>';
 inner+=txt(24,29,'SUPERSONIC AIRFOIL','#53616b',13)+txt(616,29,trailing?`φ = ${fmt(trailing.slipAngle,5)}°`:`${s.geometry.panels.length} surface regions`,'#263c4d',14,'end');
 inner+='<g clip-path="url(#airfoil-wave-window)" stroke-linecap="round" stroke-linejoin="round">';
 // Finite rays deliberately stop locally: downstream wave interactions are not solved.
 if(available)for(const w of [...s.nonlinear.waves,...(trailing?.waves??[])]){
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
 if(trailing){
  const origin=V({x:1,y:0}),end=ray(origin,trailing.phi,173);
  inner+=`<g data-trailing-interface="${trailing.interfaceKind}">`+line(...origin,...end,'#344652',1,'5 4')+`<circle cx="${origin[0]}" cy="${origin[1]}" r="2.3" fill="#17212b"/>`+'</g>';
  // The arrow lies on the matched downstream streamline. Its horizontal
  // reference and angular arc use the same signed phi as both output states.
  const start=ray(origin,trailing.phi,38),tip=ray(start,trailing.phi,119),dx=Math.cos(trailing.phi),dy=-Math.sin(trailing.phi);
  const arc=Array.from({length:25},(_,i)=>ray(start,trailing.phi*i/24,37));
  inner+=`<g data-outlet-flow-angle="${trailing.slipAngle}">`+line(...start,start[0]+119,start[1],'#6c7e88',.85,'4 3')+line(...start,...tip,'#263c4d',1.8);
  inner+=poly([tip,[tip[0]-7*dx-3*dy,tip[1]-7*dy+3*dx],[tip[0]-7*dx+3*dy,tip[1]-7*dy-3*dx]],'#263c4d');
  inner+=`<polyline points="${arc.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#263c4d" stroke-width="1.1"/>`+txt(start[0]+46,start[1]+(trailing.phi>=0?16:-9),'φ','#17212b',14,'middle')+'</g>';
  for(const [w,label]of [[trailing.upper,'TE-U+'],[trailing.lower,'TE-L+']]){
   const edge=w.rays.at(-1).angle,angle=(edge+trailing.phi)/2,pos=ray(origin,angle,125);
   inner+=txt(pos[0],pos[1]+4,label,'#253945',12,'middle');
  }
 }
 inner+=incidenceGlyph(s.alpha,24,148,42,'#536977')+'</g>';
 inner+=line(leadingX,249,trailingX,249,'#a5b1b7',.8)+line(leadingX,245,leadingX,253,'#a5b1b7',.8)+line(trailingX,245,trailingX,253,'#a5b1b7',.8);
 inner+=txt(leadingX,269,'LE · x/c = 0','#53616b',12)+txt(trailingX,269,'TE · x/c = 1','#53616b',12,'end');
 inner+=line(100,289,122,289,'#000000',1.35)+txt(129,293,'Shock','#53616b',12)+line(217,289,239,289,'#477caa',.95)+txt(246,293,'Expansion fan','#53616b',12);
 if(trailing)inner+=line(415,289,437,289,'#344652',1,'5 4')+txt(444,293,trailing.interfaceKind,'#53616b',12);
 return {inner,label:'Supersonic airfoil · analytical surface solution',meta:'Surface-edge color: panel Cp · local waves · trailing-edge pressure matching',field:model?{quantity:'cp',options:['cp'],label:'Surface pressure coefficient Cp',min,max,units:'Cp',note:model==='nonlinear'?'Shock–Expansion · uniform Cp on each surface panel':'Linearized · uniform Cp on each surface panel',palette:airfoilPalette}:null};
}
