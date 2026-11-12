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
 const key=quantity in ductProperties?quantity:'pressure',prop=ductProperties[key],values=points.map(z=>prop.get(z.state)),min=Math.min(...values),max=Math.max(...values),X=x=>35+570*x,shock=r.shockAt,nozzle=inputs.ductProblem==='Heat + shock + converging nozzle',a=r.s1,b=r.s2;
 const stops=points.map((z,i)=>`<stop offset="${100*z.x}%" stop-color="${color(max-min<1e-12?.5:(values[i]-min)/(max-min))}"/>`).join('');
 const lower=nozzle?'M35 210H434L605 180':'M35 210H605',upper=nozzle?'M35 100H434L605 130':'M35 100H605',shape=nozzle?'M35 100H434L605 130V180L434 210H35Z':'M35 100H605V210H35Z';
 const text=(x,y,t,anchor='start',size=14)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="#17383b">${t}</text>`;
 let body=`<defs><linearGradient id="ductContour" gradientUnits="userSpaceOnUse" x1="35" x2="605">${stops}</linearGradient></defs><rect width="640" height="350" fill="#f8fbf8"/><path d="${shape}" fill="url(#ductContour)" data-duct-contour="${key}"/><path d="${upper}${lower}" fill="none" stroke="#41555b" stroke-width="3"/>`;
 const ref=r.stations?.[0];if(ref?.x<0)body+=text(35,25,`${r.initialReference?'Initial reference':'Upstream reference'} · Mref = ${fmt(ref.state.M)} · pref = ${fmt(ref.state.p/1000)} kPa`);
 if(inputs.ductProblem==='Reservoir-fed duct'&&!(ref?.x<0))body+=text(35,25,'Reservoir · M = 0')+text(35,55,`p₀ = ${fmt(a.p0/1000)} kPa · T₀ = ${fmt(a.T0)} K`);
 if(r.entryAreaRatio)body+=text(35,78,`Isentropic entry · Ain/Aref = ${fmt(r.entryAreaRatio)}`);
 if(s.process==='rayleigh'){const heat=Number.isFinite(r.heatAdded)?r.heatAdded:Number.isFinite(s.q)?s.q:(inputs.gamma??1.4)*(inputs.R??287)/((inputs.gamma??1.4)-1)*(r.stations?.find(z=>z.name==='Before shock')?.state.T0-a.T0)/1000;body+=text(605,55,`q = ${fmt(heat)} kJ/kg`,'end');}
 else body+=text(605,55,'Fanno flow · longitudinal field','end');
 if(shock!==null&&shock!==undefined)body+=`<path d="M${X(shock)} 88V222" stroke="#111" stroke-width="2.5"/>`+text(X(shock),79,'Normal shock','middle');
 for(const x of [.14,.36,.58,.83])body+=`<path d="M${X(x)-15} 155h30l-7 -4m7 4l-7 4" fill="none" stroke="#40575d" stroke-width="1.5"/>`;
 body+=text(35,241,`Inlet · M₁ = ${fmt(a.M)}`)+text(605,241,`Outlet · M₂ = ${fmt(b.M)}`,'end');
 if(key!=='mach')body+=text(35,265,`${prop.symbol}₁ = ${fmt(prop.get(a))} ${prop.units}`)+text(605,265,`${prop.symbol}₂ = ${fmt(prop.get(b))} ${prop.units}`,'end');
 body+=`<path d="M35 290H605" stroke="#91a3a1"/>`;
 for(const x of [0,.5,1])body+=`<path d="M${X(x)} 286V294" stroke="#91a3a1"/>`+text(X(x),313,`x/L = ${x}`,x===0?'start':x===1?'end':'middle');
 body+=text(320,339,s.process==='rayleigh'?'Uniform heat transfer: equal heat added/removed per metre.':'Constant friction factor and hydraulic diameter.','middle',12);
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 350" role="img" aria-label="${s.process} one-dimensional longitudinal ${prop.label.toLowerCase()} contour"><title>${s.process} longitudinal ${prop.label.toLowerCase()} contour</title>${body}</svg>`,label:'One-dimensional longitudinal '+prop.label.toLowerCase(),meta:'',field:{quantity:key,options:Object.keys(ductProperties),label:prop.label,units:prop.units,min,max,palette:ductPalette,note:s.process==='rayleigh'?'Uniform heat transfer per unit heated length · section-uniform 1D field':'Constant friction factor and hydraulic diameter · section-uniform 1D field'}};
}
export function ductLongitudinalPlots(id,r){const points=r.longitudinal;if(!points?.length)return [];
 const properties=[...Object.entries(ductProperties),['totalTemperature',{label:'Stagnation temperature',symbol:'T₀',units:'K',get:s=>s.T0}],['totalPressure',{label:'Stagnation pressure',symbol:'p₀',units:'kPa',get:s=>s.p0/1000}]];
 return properties.map(([key,p])=>({key:id+'-axial-'+key,label:p.label+' vs x/L',note:id==='rayleigh'?rayleighDistributionNote:fannoDistributionNote,chart:{title:p.label+' along the duct',xlabel:'Relative position x/L',ylabel:p.symbol+(p.units?' ('+p.units+')':''),zeroBaseline:false,markers:[{name:'Inlet',x:0,y:p.get(r.s1)},{name:'Outlet',x:1,y:p.get(r.s2),anchor:'end'}],series:[{name:p.label,points:points.map(z=>[z.x,p.get(z.state)])}]}}));
}
