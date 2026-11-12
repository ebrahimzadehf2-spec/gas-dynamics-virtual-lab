import {rayleigh,fanno} from './physics.js';
export const rayleighDistributionNote='Assumes uniform heat transfer along the heated duct: equal heat added or removed per metre. Temperature need not be uniform.';
export const fannoDistributionNote='Assumes constant friction factor and hydraulic diameter along the duct. Values are uniform across each section (1D model).';
export function ductProfile(id,result,inputs){
 if(!result.s2)return null;
 if(result.ductSystem)return result.points;
 const a=result.s1,q=(result.heatAdded??0)*1000,n=120;
 return Array.from({length:n+1},(_,i)=>{const x=i/n;if(i===0)return {x,state:a};if(i===n)return {x,state:result.s2};
 const params={M1:a.M,T1:a.T,p1:a.p,gamma:inputs.gamma,R:inputs.R};
 const d=id==='rayleigh'?rayleigh({...params,q:q*x}):fanno({...params,lambda:inputs.lambda*x});
 if(!d.s2)throw Error('No accepted interior duct state before the outlet.');return {x,state:d.s2};});
}
export const ductProperties={pressure:{label:'Static pressure',symbol:'p',units:'kPa',get:s=>s.p/1000},mach:{label:'Mach number',symbol:'M',units:'',get:s=>s.M},temperature:{label:'Static temperature',symbol:'T',units:'K',get:s=>s.T},density:{label:'Density',symbol:'ρ',units:'kg/m³',get:s=>s.rho},speed:{label:'Flow speed',symbol:'u',units:'m/s',get:s=>s.u}};
const fmt=v=>Number(v.toPrecision(5)).toString();
export const ductPalette=['#9ebed2','#c1dce0','#dbe8cf','#e9ddbc','#d6aa8f'];
function color(t){const a=Math.max(0,Math.min(1,t))*(ductPalette.length-1),i=Math.min(ductPalette.length-2,Math.floor(a)),f=a-i;const rgb=h=>h.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)),p=rgb(ductPalette[i]),q=rgb(ductPalette[i+1]);return '#'+p.map((v,k)=>Math.round(v+(q[k]-v)*f).toString(16).padStart(2,'0')).join('');}
export function ductContourDrawing(s,inputs,quantity='pressure'){
 if(!['rayleigh','fanno'].includes(s.process))return null;
 const r=s.system??s,points=r.longitudinal??s.longitudinal;if(!points?.length||!r.s2)return null;
 const key=quantity in ductProperties?quantity:'pressure',prop=ductProperties[key],values=points.map(z=>prop.get(z.state)),min=Math.min(...values),max=Math.max(...values);
 const mode=inputs.ductProblem??'Single duct',rayNozzle=s.process==='rayleigh'&&mode==='Heat + shock + converging nozzle';
 const cd=s.process==='fanno'&&mode.startsWith('CD nozzle'),entryNozzle=cd||mode==='Reservoir + nozzle + duct';
 const ref=r.stations?.[0]?.x<0?r.stations[0]:null,initial=!!r.initialReference;
 const reservoir=entryNozzle||(mode==='Reservoir-fed duct'&&!ref),hasEntry=entryNozzle||reservoir||!!ref;
 const left=hasEntry?270:65,right=735,shock=r.shockAt,a=r.s1,b=r.s2;
 // The Rayleigh solver's last segment is an isentropic exit nozzle, not heated duct.
 // Leave a straight, constant-state section after the schematic shock.
 const shockX=rayNozzle?500:null,nozzleStart=rayNozzle?540:null;
 const X=x=>rayNozzle?(x<=shock?left+(shockX-left)*x/shock:nozzleStart+(right-nozzleStart)*(x-shock)/(1-shock)):left+(right-left)*x;
 const tint=v=>color(max-min<1e-12?.5:(prop.get(v)-min)/(max-min));
 const stops=points.map((z,i)=>`<stop offset="${100*z.x}%" stop-color="${tint(z.state)}"/>`).join('');
 const text=(x,y,t,anchor='start',size=14)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="#17383b">${t}</text>`;
 const arrow=(x,y=160)=>`<path d="M${x-14} ${y}h28l-7 -4m7 4l-7 4" fill="none" stroke="#40575d" stroke-width="1.5"/>`;
 const wall=d=>`<path d="${d}" fill="none" stroke="#41555b" stroke-width="3"/>`;
 let body=`<defs><linearGradient id="ductContour" gradientUnits="userSpaceOnUse" x1="${left}" x2="${rayNozzle?left+(shockX-left)/shock:right}">${rayNozzle?points.filter(z=>z.x<=shock).map(z=>`<stop offset="${100*z.x}%" stop-color="${tint(z.state)}"/>`).join(''):stops}</linearGradient></defs><rect width="800" height="390" fill="#f8fbf8"/>`;
 const ductEnd=rayNozzle?nozzleStart:right;
 body+=`<path d="M${left} 105H${ductEnd}V215H${left}Z" fill="url(#ductContour)" data-duct-contour="${key}"/>`+wall(`M${left} 105H${ductEnd}M${left} 215H${ductEnd}`);
 if(rayNozzle){
  const post=r.stations.find(z=>z.name==='After shock').state;
  body+=`<rect x="${shockX}" y="105" width="${nozzleStart-shockX}" height="110" fill="${tint(post)}"/>`;
  // Area varies continuously from the duct area to the sonic throat area.
  const g=inputs.gamma??1.4,areaMach=M=>1/M*(2/(g+1)*(1+(g-1)*M*M/2))**((g+1)/(2*(g-1)));
  const nozzlePoints=[{x:nozzleStart,h:55,state:post},...points.filter(z=>z.x>shock).map(z=>({x:X(z.x),h:55*areaMach(z.state.M)/areaMach(post.M),state:z.state}))];
  const exitStops=[{x:shock,state:post},...points.filter(z=>z.x>shock)].map(z=>`<stop offset="${100*(z.x-shock)/(1-shock)}%" stop-color="${tint(z.state)}"/>`).join('');
  body+=`<defs><linearGradient id="exitContour" gradientUnits="userSpaceOnUse" x1="${nozzleStart}" x2="${right}">${exitStops}</linearGradient></defs><path d="M${nozzlePoints.map(z=>`${z.x} ${160-z.h}`).join('L')}L${[...nozzlePoints].reverse().map(z=>`${z.x} ${160+z.h}`).join('L')}Z" fill="url(#exitContour)"/>`;
  body+=wall('M'+nozzlePoints.map(z=>`${z.x} ${160-z.h}`).join('L')+'M'+nozzlePoints.map(z=>`${z.x} ${160+z.h}`).join('L'));
  body+=text((nozzleStart+right)/2,85,'Converging nozzle','middle')+text((left+shockX)/2,85,'Heated / cooled duct','middle');
 }else body+=text((left+right)/2,85,s.process==='fanno'?'Constant-area friction duct':'Heated / cooled duct','middle');
 if(hasEntry){
  if(initial){
   // A reference operating state is not a simultaneous upstream station.
   body+=`<rect x="20" y="110" width="215" height="100" rx="5" fill="#edf1ed" stroke="#81999b"/>`+text(127,136,'Initial reference','middle')+text(127,164,`Mref = ${fmt(ref.state.M)}`,'middle')+text(127,190,`pref = ${fmt(ref.state.p/1000)} kPa`,'middle');
  }else if(reservoir){
   body+=`<path d="M25 90H120V230H25Z" fill="#e5edeb"/>`+wall('M120 105V90H25V230H120V215');
   const path='M120 105L185 135L270 105M120 215L185 185L270 215';
   // A reservoir-fed subsonic duct has a converging inlet, with the same duct exit height.
   const entry=cd?path:'M120 90L270 105M120 230L270 215';
   body+=`<path d="${cd?'M120 105L185 135L270 105V215L185 185L120 215Z':'M120 90L270 105V215L120 230Z'}" fill="#e5edeb"/>`+wall(entry)+text(68,58,'Reservoir','middle')+text(68,270,'M = 0','middle')+text(68,297,`p₀ = ${fmt(a.p0/1000)} kPa`,'middle');
   body+=text(195,58,cd?'C–D nozzle':'Entry nozzle','middle')+arrow(205);
  }else if(ref){
   const h=Math.max(25,Math.min(85,55/(r.entryAreaRatio??1)));
   body+=wall(`M25 ${160-h}L270 105M25 ${160+h}L270 215`)+text(100,58,'Upstream','middle')+arrow(100)+text(100,270,`Mref = ${fmt(ref.state.M)}`,'middle')+text(100,297,`pref = ${fmt(ref.state.p/1000)} kPa`,'middle');
  }
 }else body+=arrow(30);
 if(r.entryAreaRatio)body+=text(400,34,`Isentropic entry · Ain/Aref = ${fmt(r.entryAreaRatio)}`,'middle');
 body+=`<path d="M${left} 97V223" stroke="#81999b" stroke-dasharray="4 4"/>`;
 if(shock!==null&&shock!==undefined)body+=`<path data-shock="true" d="M${X(shock)} 105V215" stroke="#111" stroke-width="2.5"/>`+text(Math.max(210,Math.min(600,X(shock))),34,shock===0?'Normal shock · nozzle exit / duct inlet':shock===1?'Normal shock · duct exit':'Normal shock · in duct','middle');
 for(const x of [.12,.38,.62,.88])body+=arrow(X(x));
 body+=text(left,270,`Duct inlet · M₁ = ${fmt(a.M)}`)+text(right,270,`${rayNozzle?'Nozzle outlet':'Duct outlet'} · M₂ = ${fmt(b.M)}`,'end');
 if(key!=='mach')body+=text(left,297,`${prop.symbol}₁ = ${fmt(prop.get(a))} ${prop.units}`)+text(right,297,`${prop.symbol}₂ = ${fmt(prop.get(b))} ${prop.units}`,'end');
 if(rayNozzle)body+=text(400,339,'Schematic positions · heat transfer in the straight duct; isentropic exit nozzle.','middle',12);
 else {
  body+=`<path d="M${left} 322H${right}" stroke="#91a3a1"/>`;
  for(const x of [0,.5,1])body+=`<path d="M${X(x)} 318V326" stroke="#91a3a1"/>`+text(X(x),348,`x/L = ${x}`,x===0?'start':x===1?'end':'middle');
 }
 body+=text(400,377,initial?'Initial reference and adjusted inlet are different operating states.':s.process==='rayleigh'?'Uniform heat transfer: equal heat added/removed per metre of heated duct.':'Constant friction factor and hydraulic diameter.','middle',12);
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 390" role="img" aria-label="${s.process} system: ${hasEntry?(initial?'initial reference, ':ref?'upstream, ':'reservoir and inlet nozzle, '):'upstream flow, '}constant-area duct${rayNozzle?', shock in duct and converging exit nozzle':''}"><title>${s.process} longitudinal ${prop.label.toLowerCase()} contour</title>${body}</svg>`,label:'One-dimensional longitudinal '+prop.label.toLowerCase(),meta:'',field:{quantity:key,options:Object.keys(ductProperties),label:prop.label,units:prop.units,min,max,palette:ductPalette,note:s.process==='rayleigh'?'Uniform heat transfer per unit heated length · section-uniform 1D field':'Constant friction factor and hydraulic diameter · section-uniform 1D field'}};
}
export function ductLongitudinalPlots(id,r){const points=r.longitudinal;if(!points?.length)return [];
 const properties=[...Object.entries(ductProperties),['totalTemperature',{label:'Stagnation temperature',symbol:'T₀',units:'K',get:s=>s.T0}],['totalPressure',{label:'Stagnation pressure',symbol:'p₀',units:'kPa',get:s=>s.p0/1000}]];
 return properties.map(([key,p])=>({key:id+'-axial-'+key,label:p.label+' vs x/L',note:id==='rayleigh'?rayleighDistributionNote:fannoDistributionNote,chart:{title:p.label+' along the duct',xlabel:'Relative position x/L',ylabel:p.symbol+(p.units?' ('+p.units+')':''),zeroBaseline:false,markers:[{name:'Inlet',x:0,y:p.get(r.s1)},{name:'Outlet',x:1,y:p.get(r.s2),anchor:'end'}],series:[{name:p.label,points:points.map(z=>[z.x,p.get(z.state)])}]}}));
}
