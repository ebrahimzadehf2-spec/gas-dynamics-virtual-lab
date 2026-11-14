import {shockFanDrawing} from './shock-fan-example.js?v=20261114-example67';
import {wedgeWallDrawing} from './wedge-wall.js?v=20261114-region-markers';
import {ramjetInletDrawing} from './ramjet-inlet-graphics.js?v=20261114-region-markers';
import {fannoSystemDrawing} from './fanno-system-graphics.js?v=20261114-region-markers';
import {ductContourDrawing} from './duct-contours.js?v=20261113-rainbow-physical';
import {uniformDiagramText} from './diagram-typography.js?v=20261112-diagram-labels';
import {ductSystemSVG,rayleighBoundarySVG} from './duct-system-graphics.js?v=20261114-region-markers';
import {coneAnnotations} from './cone-annotations.js?v=20261110-cone-conditions';
import {wedgeDrawing} from './wedge-graphics.js?v=20261114-region-markers';
import {trackingDrawing} from './wave-tracker-graphics.js?v=20261114-custom-final';
import {wallDrawing} from './wave-wall-graphics.js?v=20261114-region-markers';
import {airfoilDrawing} from './airfoil-graphics.js?v=20261114-region-markers';
import {coneGeometry} from './cone-probe.js?v=20261110-cone-conditions';
import {diagramFontFamily,diagramFontStyle} from './diagram-font.js?v=20261109-wedge-cone';
import {cornerDrawing,cornerPalette,cornerContourColor} from './corner-graphics.js?v=20261114-expansion-labels';
import {regionLabelPosition,calloutSlot} from './region-labels.js?v=20261109-wedge-cone';
import {readableSceneLabels} from './scene-labels.js?v=20261112-diagram-labels';
import {rad,deg,linspace,prandtlMeyer} from './physics.js?v=20261110-rayleigh-audit';
export const colors=['#167c70','#dc9b52','#779bb7','#9c84b4'];
export const fmt=(x,d=5)=>x===null||x===undefined?'—':!Number.isFinite(x)?'—':Math.abs(x)>1e5||Math.abs(x)>0&&Math.abs(x)<1e-4?x.toExponential(3):Number(x.toPrecision(d)).toString();
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const txt=(x,y,s,fill='#24313c',size=11,anchor='start')=>`<text x="${x}" y="${y}" fill="${fill}" font-size="${Math.max(12,size)}" text-anchor="${anchor}" font-family="${diagramFontFamily}">${esc(s)}</text>`;
const line=(x1,y1,x2,y2,color='#739889',width=1,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const poly=(pts,fill,stroke='none',width=1)=>`<polygon points="${pts.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const arrow=(x,y,l=50)=>line(x,y,x+l,y,'#6f9a88',1.4)+poly([[x+l,y],[x+l-6,y-3],[x+l-6,y+3]],'#6f9a88');
const directedArrow=(x,y,length,angle,color='#344e61')=>{
 const dx=Math.cos(angle),dy=-Math.sin(angle),ex=x+length*dx,ey=y+length*dy;
 return `<g data-flow-angle="${deg(angle)}">${line(x,y,ex,ey,color,1.8)}${poly([[ex,ey],[ex-7*dx-3*dy,ey-7*dy+3*dx],[ex-7*dx+3*dy,ey-7*dy-3*dx]],color)}</g>`;
};
const incidenceGlyph=(alpha,x=32,y=115,length=68,color='#344e61')=>{
 const arc=linspace(0,alpha,20).map(a=>[x+25*Math.cos(a),y-25*Math.sin(a)]);
 return `<g data-incidence="${deg(alpha)}">${line(x,y,x+length,y,color,1,'4 3')}${directedArrow(x,y,length,alpha,color)}<polyline points="${arc.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="1.2"/>${txt(x,y-28,`α = ${fmt(deg(alpha),4)}°`,'#17212b',14)}</g>`;
};
const rayEnd=(x,y,a)=>{const dx=Math.cos(a),dy=-Math.sin(a),hits=[];if(dx>1e-12)hits.push((635-x)/dx);if(dx< -1e-12)hits.push((5-x)/dx);if(dy>1e-12)hits.push((295-y)/dy);if(dy< -1e-12)hits.push((45-y)/dy);const t=Math.min(...hits.filter(t=>t>0));return [x+t*dx,y+t*dy];};
const dot=(x,y,i=0)=>`<circle class="flow-particle" cx="${x}" cy="${y}" r="2" fill="#427b63" style="animation-delay:${i*.25}s"/>`;
const ramp=['#1834b8','#007fff','#00c9e8','#20c75a','#e6e529','#ff961f','#db2525'];
const clamp=x=>Math.min(1,Math.max(0,x));
const fieldColor=t=>contourColor(t);
const contourColor=t=>{let v=clamp(t)*(ramp.length-1),i=Math.min(ramp.length-2,Math.floor(v)),f=v-i,a=ramp[i].match(/[\da-f]{2}/gi).map(x=>parseInt(x,16)),b=ramp[i+1].match(/[\da-f]{2}/gi).map(x=>parseInt(x,16));return '#'+a.map((x,j)=>Math.round(x+(b[j]-x)*f).toString(16).padStart(2,'0')).join('');};
const fieldValues=(s,kind,key)=>{
 if(kind==='nozzle')return s.points.map(z=>key==='mach'?z.M:key==='temperature'?z.T/s.T0:key==='density'?z.rho/(s.p0/(s.R*s.T0)):z.p);
 return s.history.map(z=>key==='mach'?z.M:key==='temperature'?z.T:key==='density'?z.rho:key==='speed'?z.u:z.p);
};
const quantityLabel=(key,kind)=>({pressure:kind==='nozzle'?'Static pressure p/p₀':'Static pressure p/p∞',mach:'Mach number M',temperature:kind==='nozzle'?'Temperature T/T₀':'Temperature T/T∞',density:kind==='nozzle'?'Density ρ/ρ₀':'Density ρ/ρ∞'}[key]??'Static pressure');
const allQuantities=['pressure','mach','temperature','density'];
function regionalField(s,inputs,quantity){
 const full=['balance','state','normal','duct','oblique','expansion','nozzle','cone','collision'].includes(s.kind);
 const options=s.kind==='wall'&&(s.moc?.rows.length||s.tracking)?[...allQuantities,'speed']:s.kind==='linear'?['cp']:full?(['oblique','expansion','collision'].includes(s.kind)?[...allQuantities,'speed']:allQuantities):['pressure'];
 const key=options.includes(quantity)?quantity:options[0],g=inputs.gamma??1.4;
 let values=[],units='',note='Analytical uniform regions';
 const read=z=>key==='mach'?z.M:key==='temperature'?z.T:key==='density'?z.rho:key==='speed'?z.u:s.kind==='collision'&&s.interaction?z.p/1000:z.p;
 if(['balance','state','normal','duct'].includes(s.kind)){
  const a=s.kind==='balance'?s.a:s.s1,b=s.kind==='balance'?s.b:s.kind==='state'?{M:0,p:a.p0,T:a.T0,rho:a.rho*(a.p0/a.p)*(a.T/a.T0)}:s.s2;
  values=[read(a),...(b?[read(b)]:[])];units=key==='mach'?'M':key==='temperature'?'K':key==='density'?'kg/m³':'Pa';
  if(s.kind==='balance')note='Endpoint states only · interior schematic';
  if(s.kind==='duct')note='Inlet / outlet states only · interior distribution not resolved';
 }else if(s.kind==='oblique'){
  values=key==='mach'?[s.M,s.M2]:key==='speed'?[1,(s.M2/s.M)*Math.sqrt(s.T)]:[1,key==='temperature'?s.T:key==='density'?s.rho:s.p];units=key==='mach'?'M':key==='temperature'?'T/T₁':key==='density'?'ρ/ρ₁':key==='speed'?'u/u₁':'p/p₁';
 }else if(s.kind==='expansion'){
  const at=m=>{const t=(1+(g-1)*s.M*s.M/2)/(1+(g-1)*m*m/2);return key==='mach'?m:key==='temperature'?t:key==='density'?t**(1/(g-1)):key==='speed'?(m/s.M)*Math.sqrt(t):t**(g/(g-1));};
  values=linspace(s.M,s.M2,45).map(at);units=key==='mach'?'M':key==='temperature'?'T/T₁':key==='density'?'ρ/ρ₁':key==='speed'?'u/u₁':'p/p₁';return {key,options,values,units,note:'Analytical centered expansion',at,read};
 }else if(s.kind==='linear'){values=[s.CpUF,s.CpUR,s.CpLF,s.CpLR];units='Cp';note='Surface pressure only · linearized theory';
 }else if(s.kind==='collision'){values=s.geometry.fields.map(c=>read(c.state));units=key==='mach'?'M':key==='temperature'?'K':key==='density'?'kg/m³':key==='speed'?'m/s':s.interaction?'kPa':'Pa';note='Analytical states · sampled centered fans · equal geometric scale';
 }else if(s.kind==='tube'){values=[inputs.p1*1000,inputs.p4*1000,s.p];units='Pa';note='Analytical pressure · before wall reflection';
 }else if(['jet','nozzleJet'].includes(s.kind)){values=[s.inlet.p,s.outlet?.p??s.inlet.p,...(s.samples??[]).map(z=>z.p),...(s.nozzle?.points??[]).map(z=>z.P)];units='Pa';note='Local analytical pressure · unresolved regions hatched';}
 return {key,options,values,units,note,read};
}
function renderSceneSVG(s,inputs,time=.001,quantity='pressure'){if((s.kind==='ductSystem'&&s.process==='rayleigh'||s.kind==='duct'&&s.process==='rayleigh'&&inputs.bookExample==='4–5')&&s.system?.stations[0]?.x!==-.2){const view=rayleighBoundarySVG(s,inputs);if(view)return view;}if(s.kind==='ductSystem')return ductSystemSVG(s);if(s.kind==='bodyCompare'){
 const states=[{kind:'wedge',wedge:s.wedge},s.cone?.status==='ok'?{kind:'cone',...s.cone}:null],views=states.map(z=>z?sceneSVG(z,inputs,time,quantity):null),fields=views.map(v=>v?.field).filter(Boolean),range={min:Math.min(...fields.map(f=>f.min)),max:Math.max(...fields.map(f=>f.max))};
 const cards=states.map((z,i)=>{const view=z?sceneSVG(z,{...inputs,bodyRange:range},time,quantity):null;let svg=view?.svg??`<svg viewBox="0 0 640 300">${txt(28,145,'Cone: no accepted attached field')}</svg>`;svg=svg.replace('<svg ','<svg width="640" height="300" ').replaceAll(/id="([^"]+)"/g,(_,id)=>`id="body${i}-${id}"`).replaceAll(/url\(#([^)]*)\)/g,(_,id)=>`url(#body${i}-${id})`);return `<g transform="translate(${i*640},30)">${txt(320,-9,i?'Cone · α = 0°':`Wedge · α = ${fmt(deg(s.wedge.alpha))}°`,undefined,16,'middle')}${svg}</g>`;}).join('');
 return {label:'Wedge and cone · matched Mach, gas and half-angle',meta:'Shared freestream ratios and color range · cone incidence is always zero',field:{...fields[0],...range,note:'Common range · each ratio references the same freestream'},svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 330" role="img" aria-label="Wedge and cone comparison">${diagramFontStyle}${cards}</svg>`};
 }
 if(s.kind==='wedge'){
 const view=wedgeDrawing(s,{txt,line,poly,fmt,quantity,color:cornerContourColor,range:inputs.bodyRange,arrow:directedArrow,inputs,incidence:(x,y,a,l)=>incidenceGlyph(a,x,y,l)});
 return {...view,field:{...view.field,palette:cornerPalette},svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300" role="img" aria-label="Wedge at selected incidence">${diagramFontStyle}${readableSceneLabels(view.inner)}</svg>`};
 }
if(s.comparison){
 const c=s.comparison,valid=z=>z?.tracking?.slabs?.length||z?.moc?.rows?.length;
 let views=[c.se,c.moc].map(z=>valid(z)?sceneSVG({kind:'wall',...z},inputs,time,quantity):null);
 const fields=views.map(v=>v?.field).filter(Boolean),range=fields.length?{min:Math.min(...fields.map(f=>f.min)),max:Math.max(...fields.map(f=>f.max))}:null;
 views=[c.se,c.moc].map(z=>valid(z)?sceneSVG({kind:'wall',...z},{...inputs,comparisonRange:range},time,quantity):null);
 const cards=views.map((v,i)=>{const label=i?'Method of characteristics':'Shock–Expansion';let svg=v?.svg??`<svg viewBox="0 0 640 300">${txt(25,130,'No accepted downstream field')}</svg>`;svg=svg.replace('<svg ','<svg width="640" height="300" ').replaceAll(/id="([^"]+)"/g,(_,id)=>`id="compare${i}-${id}"`).replaceAll(/url\(#([^)]*)\)/g,(_,id)=>`url(#compare${i}-${id})`);return `<g transform="translate(${i*640},30)">${txt(320,-8,label,undefined,17,'middle')}${svg}</g>`;}).join('');
 return {label:'Shock–Expansion vs method of characteristics',meta:'Same geometry and color scale · quantitative comparison uses only the common accepted domain',field:fields.length?{...fields[0],...range,note:'Shared range across both accepted fields'}:null,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 330" role="img" aria-label="Two methods on the same geometry">${diagramFontStyle}${cards}</svg>`};
 }let inner='',label='Schematic geometry · analytical states',meta='Ideal gas · no CFD',field=null;
 const f=regionalField(s,inputs,quantity);quantity=f.key;const vals=f.values.filter(Number.isFinite),lo=Math.min(...vals),hi=Math.max(...vals),shade=v=>(['oblique','expansion','collision'].includes(s.kind)?cornerContourColor:contourColor)(hi-lo<1e-14?.5:(v-lo)/(hi-lo));if(vals.length)field={quantity,options:f.options,label:quantity==='cp'?'Surface pressure coefficient':quantity,units:f.units,min:lo,max:hi,note:f.note};
 const W=640,H=300;let flow=(angle=0)=>{let r='';for(let y of [85,125,165,205])r+=directedArrow(27,y,56,angle,'#ffffff');return r;};
 if(s.kind==='balance'){
  const H=55,ratio=Math.sqrt(s.A2/s.A1),h1=H/Math.max(1,ratio),h2=h1*ratio;
  inner+=`<defs><pattern id="cvInterior" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 9 L9 0" stroke="#ccd3da" stroke-width=".8"/></pattern></defs>`;
  inner+=poly([[160,150-h1],[480,150-h2],[480,150+h2],[160,150+h1]],'url(#cvInterior)','#52616c',2);
  inner+=poly([[160,150-h1],[187,150-h1],[187,150+h1],[160,150+h1]],shade(f.values[0]))+poly([[453,150-h2],[480,150-h2],[480,150+h2],[453,150+h2]],shade(f.values[1]));
  inner+=`<rect x="140" y="72" width="360" height="157" rx="10" fill="none" stroke="#516376" stroke-width="1.3" stroke-dasharray="6 4"/>`;
  inner+=arrow(35,150,110)+arrow(495,150,110)+txt(37,125,`ṁ₁ ${fmt(s.m1,4)} kg/s`)+txt(488,125,`ṁ₂ ${fmt(s.m2,4)} kg/s`);
  inner+=txt(35,35,'INLET · 1','#24313c',13)+txt(440,35,'OUTLET · 2','#24313c',13)+txt(35,57,`M ${fmt(s.a.M,4)} · A ${fmt(s.A1*1e4,4)} cm²`)+txt(440,57,`M ${fmt(s.b.M,4)} · A ${fmt(s.A2*1e4,4)} cm²`);
  inner+=txt(320,144,'INTERIOR NOT RESOLVED','#40505d',12,'middle')+txt(320,169,s.entropyViolation?'ENTROPY DECREASE':s.balanced?'BALANCES CLOSE':'PROPOSED STATES · MISMATCH',s.balanced?'#216446':'#9c3d26',12,'middle');
  inner+=txt(320,92,`Q̇in = ${fmt(s.Q/1000,4)} kW · Ẇout = ${fmt(s.W/1000,4)} kW`,'#24313c',12,'middle');
  const fx=s.Fx>=0?1:-1;inner+=line(320-35*fx,245,320+35*fx,245,'#263e55',2)+poly([[320+35*fx,245],[320+28*fx,241],[320+28*fx,249]],'#263e55')+txt(320,270,`Fₓ = ${fmt(s.Fx,5)} N`,'#24313c',12,'middle');
  inner+=txt(35,198,`p ${fmt(s.a.p/1000,4)} kPa`)+txt(35,220,`T ${fmt(s.a.T,4)} K`)+txt(490,198,`p ${fmt(s.b.p/1000,4)} kPa`)+txt(490,220,`T ${fmt(s.b.T,4)} K`);
  label='Prescribed endpoint states · steady integral balances';meta='No spatial flow solution · positive flow to the right';
 }
 else if(s.kind==='state'){inner+=poly([[95,80],[360,80],[360,220],[95,220]],'#d8e8e6')+poly([[360,80],[590,80],[590,220],[360,220]],'#eddfca');inner+=directedArrow(40,125,40,0)+directedArrow(40,175,40,0);inner+=txt(120,112,'STATIC STATE','#17383b',9)+txt(120,151,`M = ${fmt(s.s1.M)}`,'#17383b',21)+txt(120,183,`T = ${fmt(s.s1.T)} K  ·  p = ${fmt(s.s1.p/1000)} kPa`,'#17383b');inner+=line(360,105,360,205,'#a4bbab',1,'4 4')+txt(390,131,'AT REST','#17383b',9)+txt(390,163,`T₀ = ${fmt(s.s1.T0)} K`,'#17383b',17)+txt(390,193,`p₀ = ${fmt(s.s1.p0/1000)} kPa`,'#17383b');}
 else if(s.kind==='normal'){inner+=poly([[20,70],[315,70],[315,230],[20,230]],'#d8e8e6')+poly([[315,70],[620,70],[620,230],[315,230]],'#eddfca');inner+=flow()+line(315,53,315,245,'#000000',3)+txt(315,45,'NORMAL SHOCK','#17383b',11,'middle');inner+=txt(110,118,'UPSTREAM','#17383b',9)+txt(110,151,`M₁ = ${fmt(s.s1.M)}`,'#17383b',22)+txt(110,184,`p₁ = ${fmt(s.s1.p/1000)} kPa`,'#17383b',12)+txt(375,118,'DOWNSTREAM','#17383b',9)+txt(375,151,`M₂ = ${fmt(s.s2.M)}`,'#17383b',22)+txt(375,184,`p₂ = ${fmt(s.s2.p/1000)} kPa`,'#17383b',12);label='Uniform analytical regions · pressure jump';}
 else if(s.kind==='duct'){inner+=poly([[40,85],[600,85],[600,215],[40,215]],'#e5efe2');if(s.s2){inner+=poly([[40,86],[320,86],[320,214],[40,214]],['rayleigh','fanno'].includes(s.process)?'#d8e8e6':shade(f.values[0]))+poly([[320,86],[600,86],[600,214],[320,214]],['rayleigh','fanno'].includes(s.process)?'#eddfca':shade(f.values[1]));inner+=txt(68,130,'INLET',undefined,9)+txt(68,158,`M₁ = ${fmt(s.s1.M)}`,undefined,19)+txt(398,130,'OUTLET',undefined,9)+txt(398,158,`M₂ = ${fmt(s.s2.M)}`,undefined,19);for(let x=90;x<590;x+=80)inner+=arrow(x,187,35)+dot(x+10,187,x);if(s.process==='rayleigh'){for(let x=220;x<420;x+=42)inner+=line(x,44,x,77,'#cb9b60',1.4)+((s.q??inputs.q)>=0?poly([[x,79],[x-3,73],[x+3,73]],'#cb9b60'):poly([[x,42],[x-3,48],[x+3,48]],'#cb9b60'));inner+=txt(320,33,`${(s.q??inputs.q)>=0?'HEATING':'COOLING'}  q = ${fmt(s.q??inputs.q)} kJ/kg`,'#a77944',10,'middle');}else inner+=txt(320,50,`WALL FRICTION · fᴅL/D = ${fmt(inputs.lambda)}`,'#8a7862',10,'middle');label='Illustration of endpoint states · shading is schematic';}else inner+=txt(320,152,'NO STEADY OUTLET FOR THIS INLET','#a3784c',14,'middle');inner+=line(40,85,600,85,'#819a85',3)+line(40,215,600,215,'#819a85',3);}
 else if(s.kind==='oblique'||s.kind==='expansion'){
  const view=cornerDrawing(s,{...inputs,_cornerQuantity:quantity,_cornerUp:f.values[0],_cornerDown:f.values.at(-1)},{txt,line,poly,shade,fmt});inner+=s.mirrorCorner?`<g transform="translate(0 300) scale(1 -1)">${view.inner.replace(/<text ([^>]*?)x="([^"]+)" y="([^"]+)"([^>]*)>/g,(_,pre,x,y,post)=>`<text ${pre}x="${x}" y="${y}"${post} transform="translate(${x} ${y}) scale(1 -1) translate(${-Number(x)} ${-Number(y)})">`)}</g>`:view.inner;label=view.label;meta=view.meta;
  if(inputs.cornerView==='Textbook schematic')field=null;
 }
 else if(s.kind==='nozzle'){
  const a=s.points,scale=104/Math.max(...a.map(z=>z.h)),top=a.map(z=>[35+570*z.x,150-scale*z.h]),bottom=a.map(z=>[35+570*z.x,150+scale*z.h]);
  const vals=fieldValues(s,'nozzle',quantity),lo=inputs.bodyRange?.min??Math.min(...vals),hi=inputs.bodyRange?.max??Math.max(...vals),norm=v=>hi-lo<1e-14?.5:(v-lo)/(hi-lo);
  field={quantity,label:quantityLabel(quantity,'nozzle'),min:lo,max:hi,units:quantity==='mach'?'M':quantity==='pressure'?'p/p₀':quantity==='temperature'?'T/T₀':'ρ/ρ₀'};
  for(let i=0;i<a.length-1;i++){let z=a[i],q=a[i+1],v=vals[i];inner+=poly([[35+570*z.x,150-scale*z.h],[35+570*q.x,150-scale*q.h],[35+570*q.x,150+scale*q.h],[35+570*z.x,150+scale*z.h]],contourColor(norm(v)),contourColor(norm(v)),.6);}
  inner+=`<polyline points="${top.map(z=>z.join(',')).join(' ')}" fill="none" stroke="#657d68" stroke-width="3"/><polyline points="${bottom.map(z=>z.join(',')).join(' ')}" fill="none" stroke="#657d68" stroke-width="3"/>`;
  if(s.shockX!==null){const x=35+570*s.shockX,h=.12*Math.sqrt(s.AsAt)*scale;inner+=line(x,150-h,x,150+h,'#000000',3)+txt(x,258,s.shock?.upstreamMach===1?'SONIC LIMIT':'NORMAL SHOCK','#b47d39',9,x>520?'end':'middle');}
  if(s.choked){const x=s.nozzleType==='converging'?605:s.nozzleType==='diverging'?35:35+570*.28,h=.12*scale;inner+=`<line x1="${x}" x2="${x}" y1="${150-h}" y2="${150+h}" stroke="#137d73" stroke-width="1.5" stroke-dasharray="4 3"/>`+txt(x,s.nozzleType==='cd'||s.shockX===0?244:258,s.nozzleType==='converging'?'SONIC EXIT':s.nozzleType==='diverging'?'SONIC INLET':'SONIC THROAT','#137d73',9,s.nozzleType==='converging'?'end':s.nozzleType==='diverging'?'start':'middle');}
  if(s.massFlow>0)for(let x=55;x<610;x+=75)inner+=arrow(x,150,25)+dot(x+9,150,x);
  inner+=txt(320,280,s.regime,undefined,11,'middle');
  inner+=txt(40,18,s.nozzleType==='diverging'?`INLET M = ${fmt(s.inletMach)}`:'RESERVOIR',undefined,9)+txt(40,35,`p₀ = ${fmt(s.p0/1000)} kPa`,undefined,10)+txt(600,18,s.nozzleType==='diverging'&&s.outletCondition!=='Specified back pressure'?'MATCHED OUTLET':'BACK PRESSURE',undefined,9,'end')+txt(600,35,`p/p₀ = ${fmt(s.backRatio)}`,undefined,10,'end');
  label=`Quasi-1D analytical field · ${field.label}`;meta='Cross-section averaged · auto-scaled range · no CFD';
 }
 else if(s.kind==='nozzleJet'){
  const n=s.nozzle,a=n.points,x0=30,xe=275,cy=150,scale=56/Math.max(...a.map(z=>z.A)),he=a.at(-1).A*scale;
  const wave=s.status==='expansion'||s.status==='shock',sonic=wave&&s.inlet.M===1;
  const distance=wave?he/Math.tan(Math.abs(s.head)):Infinity,interaction=xe+distance,end=Math.min(610,interaction),resolved=!!s.outlet;
  const maxp=Math.max(n.p0,s.outlet?.p??0),color=p=>shade(p),top=a.map(z=>[x0+(xe-x0)*z.x,cy-scale*z.A]),bottom=a.map(z=>[x0+(xe-x0)*z.x,cy+scale*z.A]);
  inner+=`<defs><pattern id="unsolvedHatch" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 9 L9 0" stroke="#cbd5ca" stroke-width=".6"/></pattern><clipPath id="fullWindow"><rect x="20" y="58" width="600" height="184"/></clipPath></defs><g clip-path="url(#fullWindow)">`;
  for(let i=0;i<a.length-1;i++){const z=a[i],q=a[i+1],c=color(z.P);inner+=poly([[top[i][0],top[i][1]],[top[i+1][0],top[i+1][1]],[bottom[i+1][0],bottom[i+1][1]],[bottom[i][0],bottom[i][1]]],c,c,.5);}
  // Constant-span planar schematic: the half-height follows A, not sqrt(A).
  inner+=poly([...top,...top.map(([x,y])=>[x,y-6]).reverse()],'#ced7cc','#72836e',.5)+poly([...bottom,...bottom.map(([x,y])=>[x,y+6]).reverse()],'#ced7cc','#72836e',.5);
  inner+=`<polyline points="${top.map(z=>z.join(',')).join(' ')}" fill="none" stroke="#4f6d59" stroke-width="2"/><polyline points="${bottom.map(z=>z.join(',')).join(' ')}" fill="none" stroke="#4f6d59" stroke-width="2"/>`;
  if(n.shockX!==null){let x=x0+(xe-x0)*n.shockX,h=scale*n.AsAt;inner+=line(x,cy-h,x,cy+h,'#000000',2.5);}
  if(n.choked){let x=n.nozzleType==='cd'?x0+(xe-x0)*.28:n.nozzleType==='converging'?xe:x0;const section=a.find(z=>Math.abs(x0+(xe-x0)*z.x-x)<1e-8),h=section?scale*section.A:scale;inner+=line(x,cy-h,x,cy+h,'#438a80',1,'3 3');}
  inner+=line(x0-5,cy,610,cy,'#9cafa0',.7,'6 4')+line(xe,68,xe,232,'#97aba0',.8,'3 3');
  if(resolved&&!sonic){
   const L=end-xe,bend=L*Math.tan(s.theta),gasShape=[[xe,cy-he],[end,cy-he-bend],[end,cy+he+bend],[xe,cy+he]];
   inner+=`<defs><clipPath id="fullJetGas"><polygon points="${gasShape.map(z=>z.join(',')).join(' ')}"/></clipPath></defs><g clip-path="url(#fullJetGas)">`+poly(gasShape,color(s.inlet.p));
   for(const sign of [-1,1]){
    const o=[xe,cy+sign*he],ray=phi=>[xe+2000*Math.cos(phi),o[1]+sign*2000*Math.sin(phi)];
    if(wave){inner+=poly([o,ray(s.theta),ray(s.tail)],color(s.outlet.p));}
    if(s.status==='expansion'){
     for(let i=0;i<s.samples.length-1;i++){const u=s.samples[i],v=s.samples[i+1],phi=z=>z.theta-Math.asin(1/z.M),c=color((u.p+v.p)/2);inner+=poly([o,ray(phi(u)),ray(phi(v))],c,c,.3);}
     for(let i=0;i<s.samples.length;i+=8){const z=s.samples[i];inner+=line(...o,...ray(z.theta-Math.asin(1/z.M)),'#4a8d7d',.7);}
    }else if(s.status==='shock')inner+=line(...o,...ray(-s.beta),'#000000',2);
   }
   inner+='</g>';
   for(const sign of [-1,1])inner+=line(xe,cy+sign*he,end,cy+sign*(he+bend),'#57858a',1.4,'4 3');
  }
  if(wave&&interaction<610&&!sonic){inner+=`<rect x="${end}" y="58" width="${610-end}" height="184" fill="#f2f5f0"/><rect x="${end}" y="58" width="${610-end}" height="184" fill="url(#unsolvedHatch)"/>`+line(end,58,end,242,'#a2977d',1,'4 3');if(610-end>90)inner+=txt((end+610)/2,135,'WAVE INTERACTION','#8b8d7a',9,'middle')+txt((end+610)/2,154,'NOT SOLVED','#8b8d7a',10,'middle');inner+=`<circle cx="${end}" cy="${cy}" r="3" fill="#a2977d"/>`;}
  if(sonic){
   // Only a schematic of the local lip fans; no finite-jet field is claimed.
   inner+=`<rect x="${xe}" y="58" width="${610-xe}" height="184" fill="url(#unsolvedHatch)"/>`;
   for(const sign of [-1,1]){const o=[xe,cy+sign*he];for(let i=0;i<s.samples.length;i+=8){let z=s.samples[i],phi=z.theta-Math.asin(1/z.M);inner+=line(...o,xe+42*Math.cos(phi),o[1]+sign*42*Math.sin(phi),'#438a80',.8);}inner+=line(...o,xe+55*Math.cos(s.theta),o[1]+sign*55*Math.sin(s.theta),'#57858a',1.3,'4 3');}
   inner+=txt(475,132,'SONIC-LIP FANS · SCHEMATIC','#7c8c79',9,'middle')+txt(475,153,'INTERACTING JET NOT SOLVED','#7c8c79',9,'middle');
  }else if(!resolved)inner+=txt(445,148,s.status==='no-flow'?'NO FLOW · pᵦ = p₀':'EXTERNAL MODEL LIMIT','#a77944',11,'middle');
  if(s.inlet.M>0)for(const x of [48,130,212])inner+=arrow(x,cy,27);
  inner+='</g>';
  inner+=txt(30,22,'COMPLETE NOZZLE · PLANAR SCHEMATIC',undefined,10)+txt(30,43,`p₀ = ${fmt(n.p0/1000)} kPa`,undefined,10)+txt(610,43,`pₐ = ${fmt(s.inlet.p*s.ratio/1000)} kPa`,undefined,10,'end');
  inner+=txt(30,257,'INLET',undefined,9)+txt(xe,257,'EXIT',undefined,9,'middle');
  if(n.nozzleType==='cd')inner+=txt(x0+(xe-x0)*.28,257,'THROAT',undefined,9,'middle');
  inner+=txt(30,284,`Mₑ = ${fmt(s.inlet.M)}${resolved?`  →  M₂ = ${fmt(s.outlet.M)}`:''}`,undefined,11)+txt(610,284,resolved?`θ = ${fmt(deg(s.theta),4)}°`:'NO RESOLVED EXTERNAL STATE',undefined,10,'end');
  label=sonic?'Complete nozzle + schematic sonic-lip fans':wave?'Complete nozzle + first external waves':'Complete nozzle + exit state';
  meta=sonic?'Local view gives fan details · interacting jet unresolved':'Geometry schematic · wave angles to scale · stop at first interaction';
 }
 else if(s.kind==='jet'){
  const o=[100,135],extent=4000,ray=phi=>[o[0]+extent*Math.cos(phi),o[1]-extent*Math.sin(phi)],resolved=!!s.outlet;
  const boundary=ray(s.theta),gasBoundary=[[25,135],o,boundary,[4100,4100],[25,4100]],maxp=Math.max(s.inlet.p,s.outlet?.p??s.inlet.p),color=p=>shade(p);
  inner+=`<defs><clipPath id="jetWindow"><rect x="25" y="80" width="590" height="162"/></clipPath><clipPath id="jetGas"><polygon points="${gasBoundary.map(p=>p.join(',')).join(' ')}"/></clipPath></defs>`;
  inner+=`<g clip-path="url(#jetWindow)"><g clip-path="url(#jetGas)"><rect x="25" y="80" width="590" height="162" fill="${color(s.inlet.p)}"/>`;
  if(s.status==='expansion'){
   inner+=poly([o,boundary,ray(s.tail)],color(s.outlet.p));
   for(let i=0;i<s.samples.length-1;i++){const a=s.samples[i],b=s.samples[i+1],phi=z=>z.theta-Math.asin(1/z.M);inner+=poly([o,ray(phi(a)),ray(phi(b))],color((a.p+b.p)/2),color((a.p+b.p)/2),.3);}
   for(let i=0;i<s.samples.length;i+=8){const z=s.samples[i],e=ray(z.theta-Math.asin(1/z.M));inner+=line(...o,...e,'#729e8c',.8);}
  }else if(s.status==='shock'){inner+=poly([o,boundary,ray(-s.beta)],color(s.outlet.p));}
  inner+='</g>';
  inner+=line(25,135,100,135,'#52745f',3);
  if(resolved)inner+=line(...o,...boundary,'#5b8082',1.7,'5 4');
  if(s.status==='shock')inner+=line(...o,...ray(-s.beta),'#000000',2.5);
  if(s.status==='expansion'){inner+=line(...o,...ray(s.head),'#387f71',1.2)+line(...o,...ray(s.tail),'#387f71',1.2);}
  if(s.inlet.M>0)inner+=arrow(34,195,43);
  inner+='</g>';
  inner+=txt(28,22,'LOCAL UPPER LIP · PLANAR JET',undefined,10)+txt(28,45,`EXIT  M = ${fmt(s.inlet.M)} · p = ${fmt(s.inlet.p/1000)} kPa`,undefined,10)+txt(610,67,`pₐ = ${fmt(s.inlet.p*s.ratio/1000)} kPa`,'#4b5563',9,'end');
  inner+=txt(100,122,'LIP',undefined,9,'middle');
  if(resolved)inner+=txt(28,263,`AFTER WAVE  M = ${fmt(s.outlet.M)} · p = ${fmt(s.outlet.p/1000)} kPa`,undefined,10)+txt(610,283,`θ = ${fmt(deg(s.theta),4)}°`,undefined,9,'end');
  else inner+=txt(320,266,'EXIT STATE ONLY · NO RESOLVED EXTERNAL WAVE','#a77944',10,'middle');
  label=s.status==='expansion'?'Analytical Prandtl–Meyer fan · local pressure shading':s.status==='shock'?'Analytical oblique shock · uniform states':resolved?'Pressure-matched exit · no adjustment wave':'External model limit · exit state only';
  meta='Angles to scale · local construction · reflections and mixing absent';
 }
 else if(s.kind==='coneDetached'){inner+=txt(320,135,'Detached shock · no attached solution','#17212b',18,'middle')+txt(320,175,`θc,max = ${fmt(s.limits.thetaMaxDeg,6)}°`,'#17212b',16,'middle');label='Attached-shock limit exceeded';meta='Detached flow field is not computed';}
 else if(s.kind==='cone'){let {x,y,length:L}=coneGeometry(s),b=s.beta,c=s.thetaCone;let h=s.history,vals=fieldValues(s,'cone',quantity),lo=inputs.bodyRange?.min??Math.min(...vals),hi=inputs.bodyRange?.max??Math.max(...vals),norm=v=>hi-lo<1e-14?.5:(v-lo)/(hi-lo);field={quantity,label:quantityLabel(quantity,'cone'),min:lo,max:hi,units:quantity==='mach'?'M':quantity==='pressure'?'p/p∞':quantity==='temperature'?'T/T∞':'ρ/ρ∞'};for(let i=0;i<h.length-1;i++){let a=h[i],d=h[i+1],v=vals[i];for(let sign of [-1,1])inner+=poly([[x,y],[x+L,y+sign*L*Math.tan(a.theta)],[x+L,y+sign*L*Math.tan(d.theta)]],(inputs.bodyRange?cornerContourColor:contourColor)(norm(v)));}inner+=poly([[x,y],[x+L,y-L*Math.tan(c)],[x+L,y+L*Math.tan(c)]],'#d7d9d5','#56636b',1.5);for(let sign of [-1,1])inner+=line(x,y,x+L,y+sign*L*Math.tan(b),'#000000',2);inner+=directedArrow(24,145,70,0)+directedArrow(24,184,70,0)+coneAnnotations(s,inputs,{txt,line,fmt});label=`Taylor–Maccoll analytical field · ${field.label}`;meta='Conical similarity · meridional plane · no CFD';}
 else if(s.kind==='tube'){const xmin=-1,xmax=1.8,X=x=>35+(x-xmin)/(xmax-xmin)*570;let head=s.head*time,tail=s.tail*time,contact=s.contact*time,shock=s.shockSpeed*time;
  inner+=poly([[35,92],[X(head),92],[X(head),213],[35,213]],shade(inputs.p4*1000));for(let i=0;i<50;i++){let a=head+(tail-head)*i/50,b=head+(tail-head)*(i+1)/50,xi=(a+b)/(2*time),sound=2*s.a4/(inputs.gamma+1)-(inputs.gamma-1)*xi/(inputs.gamma+1),pressure=inputs.p4*1000*(sound/s.a4)**(2*inputs.gamma/(inputs.gamma-1));inner+=poly([[X(a),92],[X(b),92],[X(b),213],[X(a),213]],shade(pressure));}inner+=poly([[X(tail),92],[X(shock),92],[X(shock),213],[X(tail),213]],shade(s.p))+poly([[X(shock),92],[605,92],[605,213],[X(shock),213]],shade(inputs.p1*1000));for(let [x,name,col,dash] of [[head,'head','#7a9a80',''],[tail,'tail','#7a9a80',''],[contact,'contact','#62858e','5 4'],[shock,'shock','#000000','']]){inner+=line(X(x),83,X(x),223,col,1.5,dash)+txt(X(x),name==='contact'?250:69,name,col,9,'middle');}inner+=line(35,92,605,92,'#819783',2)+line(35,213,605,213,'#819783',2)+txt(320,34,`t = ${fmt(time*1000,3)} ms · before wall reflection`,undefined,11,'middle')+txt(320,162,`u₂ = u₃ = ${fmt(s.u)} m/s`,'#ffffff',14,'middle')+txt(35,281,'x = −1 m',undefined,9)+txt(605,281,'x = 1.8 m',undefined,9,'end');label='Analytical similarity field · pressure shading';meta='Expansion fan + uniform regions';}
 else if(s.kind==='wall'){const view=(s.tracking?trackingDrawing:wallDrawing)(s,{txt,line,poly,fmt,quantity,range:inputs.comparisonRange,showCharacteristics:inputs.mocLines!=='Hidden'});inner+=view.inner;label=view.label;meta=view.meta;field=view.field;}
 else if(s.kind==='airfoil'){const view=airfoilDrawing(s,{txt,line,poly,fmt,incidenceGlyph});inner+=view.inner;label=view.label;meta=view.meta;field=view.field;}
 else if(s.kind==='linear'){let t=inputs.thickness*440/2,x=90,y=150;inner+=poly([[x,y],[x+220,y-t],[x+440,y],[x+220,y+t]],'#b4c7ad','#66806a',2);for(const [a,b,v] of [[[x,y],[x+220,y-t],s.CpUF],[[x+220,y-t],[x+440,y],s.CpUR],[[x,y],[x+220,y+t],s.CpLF],[[x+220,y+t],[x+440,y],s.CpLR]])inner+=line(...a,...b,shade(v),9);inner+=incidenceGlyph(rad(inputs.alpha??0),20,150,60)+txt(320,65,`UPPER  Cₚ,f ${fmt(s.CpUF)}   Cₚ,r ${fmt(s.CpUR)}`,undefined,11,'middle')+txt(320,234,`LOWER  Cₚ,f ${fmt(s.CpLF)}   Cₚ,r ${fmt(s.CpLR)}`,undefined,11,'middle')+txt(320,267,`α = ${inputs.alpha}° · t/c = ${inputs.thickness}`,undefined,10,'middle');label='Linearized surface Cp · specified angle of attack';meta='Body-fixed chord · incident arrows at α · linearized theory';}
 else if(s.kind==='collision'){
  const z=s.geometry,points=z.domain,x0=z.startX,x1=z.endX,y0=Math.min(...points.map(p=>p[1])),y1=Math.max(...points.map(p=>p[1])),scale=Math.min(500/(x1-x0),190/(y1-y0));
  const ox=285-(x0+x1)*scale/2,oy=153+(y0+y1)*scale/2,V=([x,y])=>[ox+x*scale,oy-y*scale];
  for(const c of z.fields){const color=shade(f.read(c.state));inner+=poly(c.poly.map(V),color,color,.35);}
  for(const wall of Object.values(z.walls))for(let i=1;i<wall.length;i++)inner+=line(...V(wall[i-1]),...V(wall[i]),'#52616c',3);
  for(const w of z.incident)inner+=line(...V(w.origin),...V(w.end),'#000000',2.2);
  for(const w of z.outgoing)if(w.kind!=='No wave')inner+=line(...V(w.origin),...V(w.end),w.kind==='Oblique shock'?'#000000':'#52616c',w.kind==='Oblique shock'?2.2:.65);
  inner+=line(...V(z.slip.origin),...V(z.slip.end),'#000000',1.8,'6 4');
  const callouts=[];
  for(const [n,state] of Object.entries(s.regions)){
   const polygons=z.fields.filter(c=>c.state===state).map(c=>c.poly.map(V));
   const position=regionLabelPosition(polygons);if(!position)continue;
   const [xx,yy]=position.point,regionName=s.regionLabels?.[n]??n;
   if(position.callout||n==='4'||n==='5'){callouts.push({n,point:position.point});continue;}
   inner+=`<g data-region-label="${n}" data-clearance="${position.clearance}">${txt(xx,yy+6,regionName,undefined,18,'middle')}</g>`;
  }
  const used=[];
  for(const {n,point:[xx,yy]} of callouts){
   const downstream=n==='4'||n==='5';
   let lx=downstream?602:Math.max(48,Math.min(530,xx));
   if(!downstream){lx=calloutSlot(lx,used);used.push(lx);}
   const ly=downstream?(n==='5'?110:200):45;
   inner+=line(lx-(downstream?12:0),ly+(downstream?-6:4),xx,yy,'#263c4d',1.3)+`<circle cx="${xx}" cy="${yy}" r="2.4" fill="#263c4d"/>`+`<g data-region-callout="${n}" data-target-x="${xx}" data-target-y="${yy}">${txt(lx,ly,s.regionLabels?.[n]??n,'#17212b',20,'middle')}</g>`;
  }
  const [gx,gy]=V([z.startX+.04*z.H,z.H*.6]);inner+=directedArrow(gx,gy,55,0,'#263c4d');
  const [bx,by]=V(z.B);if(s.interaction){inner+=incidenceGlyph(s.delta,520,156,62,'#263c4d').replaceAll('α =','φ =');}inner+=`<circle cx="${bx}" cy="${by}" r="3" fill="#000000"/>`;
  if(!s.interaction)inner+=txt(616,24,`φ = ${fmt(s.slipAngle,6)}°`,undefined,17,'end');
  inner+=txt(24,273,`B: x = ${fmt(z.B[0],5)}, y = ${fmt(z.B[1],5)} ${s.geometryMode==='Custom geometry'?'m':'(normalized)'}`,undefined,14)+txt(616,273,s.a.kind,undefined,14,'end');
  label='Analytical wave interaction · signed slip angle · equal geometric scale';meta='Dashed: slip line · solid black: shocks · view ends before wall reflections';
 }

 if(s.kind!=='expansion'||inputs.cornerView==='Textbook schematic')inner=readableSceneLabels(inner);
 if(s.kind==='cone')inner+='<circle id="fieldProbePoint" r="3.5" fill="#17212b" stroke="white" stroke-width="1.5" visibility="hidden" pointer-events="none"/>';
 if(field){if(['oblique','expansion','collision'].includes(s.kind))field.palette=cornerPalette;field.options??=f.options;field.note??='Range scaled to this solution';}
 return {label,meta,field,svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.kind==='state'?'0 65 640 170':`0 0 ${W} ${H}`}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${diagramFontStyle}<defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e4ece1" stroke-width=".5"/></pattern></defs><rect width="640" height="300" fill="#f8fbf6"/><rect width="640" height="300" fill="url(#grid)"/>${inner}</svg>`};
}
function renderChartSVG(c){const W=640,H=266,L=c.leftMargin??100,R=23,T=15,B=49;let all=[...c.series.flatMap(s=>s.points),...(c.regionMarkers?(c.markers??[]).map(m=>[m.x,m.y]):[])].filter(s=>s.every(Number.isFinite));if(!all.length)return{svg:'',legend:''};let xmin=Math.min(...all.map(p=>p[0])),xmax=Math.max(...all.map(p=>p[0])),ymin=c.zeroBaseline===false?Math.min(...all.map(p=>p[1])):Math.min(0,...all.map(p=>p[1])),ymax=Math.max(...all.map(p=>p[1]));if(xmax===xmin)xmax=xmin+1;if(ymax===ymin)ymax=ymin+1;let pad=(ymax-ymin)*.08;ymax+=pad;if(ymin<0||c.zeroBaseline===false)ymin-=pad*.3;if(all.every(p=>p[1]>=0))ymin=Math.max(0,ymin);const X=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R),Y=y=>H-B-(y-ymin)/(ymax-ymin)*(H-B-T);let inner='';for(let i=0;i<=4;i++){let y=ymin+(ymax-ymin)*i/4;inner+=line(L,Y(y),W-R,Y(y),'#e8eee5')+txt(L-10,Y(y)+3,fmt(y,3),'#4b5563',9,'end');}for(let i=0;i<=5;i++){let x=xmin+(xmax-xmin)*i/5;inner+=txt(X(x),H-B+18,fmt(x,3),'#4b5563',9,'middle');}inner+=line(L,T,L,H-B,'#c8d4c5')+line(L,H-B,W-R,H-B,'#c8d4c5');c.series.forEach((s,i)=>{if(c.scatter){for(const [x,y] of s.points.filter(p=>p.every(Number.isFinite)))inner+=`<circle cx="${X(x)}" cy="${Y(y)}" r="4" fill="${colors[i%colors.length]}"/>`;return;}inner+=`<polyline points="${s.points.filter(p=>p.every(Number.isFinite)).map(([x,y])=>[X(x),Y(y)].join(',')).join(' ')}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="2.2" ${s.dash?`stroke-dasharray="${s.dash}"`:""} stroke-linejoin="round"/>`;});if(c.regionMarkers){
 const occupied=[];
 for(const m of c.markers??[]){const px=X(m.x),py=Y(m.y),width=Math.min(260,String(m.name).length*8+8),candidates=[...[-13,22,-35,44,-57,66,-79,88,-101,110].flatMap(dy=>[[9,dy],[-9,dy]]),...[-13,22,-35,44,-57,66].flatMap(dy=>[[-120,dy],[-230,dy]])].map(([dx,dy])=>{const anchor=dx<0?'end':'start',xx=px+dx,left=Math.max(L+3,Math.min(W-R-width-3,anchor==='end'?xx-width:xx)),yy=Math.max(T+15,Math.min(H-B-5,py+dy));return {x:anchor==='end'?left+width:left,y:yy,anchor,left,top:yy-16,right:left+width,bottom:yy+5};});
 const overlaps=q=>occupied.filter(z=>q.left<z.right+4&&q.right>z.left-4&&q.top<z.bottom+4&&q.bottom>z.top-4).length;
 candidates.sort((a,b)=>overlaps(a)-overlaps(b));const q=candidates[0];occupied.push(q);
 inner+=line(px,py,q.anchor==='end'?q.x+3:q.x-3,q.y-5,'#64748b',.8)+`<g data-region-marker="${esc(m.name)}"><circle cx="${px}" cy="${py}" r="4.5" fill="white" stroke="#17212b" stroke-width="1.8"/>`+txt(q.x,q.y,m.name,'#17212b',14,q.anchor)+'</g>';
 }
 }else for(let [i,m]of(c.markers??[]).entries())inner+=`<circle cx="${X(m.x)}" cy="${Y(m.y)}" r="4.5" fill="${i?'#fff':'#167c70'}" stroke="${i?'#dc9b52':'#167c70'}" stroke-width="2"/>`+txt(X(m.x)+(m.anchor==='end'?-7:7),Y(m.y)-9,m.name,i?'#ae7b3d':'#397661',9,m.anchor??'start');inner+=txt((L+W-R)/2,H-9,c.xlabel,'#4b5563',10,'middle')+`<text transform="translate(14 ${(T+H-B)/2}) rotate(-90)" fill="#4b5563" font-size="12" font-family="${diagramFontFamily}" text-anchor="middle">${esc(c.ylabel)}</text>`;
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}"><title>${esc(c.title)}</title>${diagramFontStyle}${inner}<line id="cursorLine" x1="0" y1="${T}" x2="0" y2="${H-B}" stroke="#8caa8d" stroke-dasharray="3 3" opacity="0"/><circle id="cursorPoint" r="4" fill="#17212b" stroke="#fff" stroke-width="1.5" opacity="0" pointer-events="none"/><rect id="chartHit" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent"/></svg>`,legend:c.series.map((s,i)=>`<span><i style="background:${colors[i%colors.length]}"></i>${esc(s.name)}</span>`).join(''),axis:{xmin,xmax,ymin,ymax,L,R,W,H,T,B}};
}

export function sceneSVG(...args){const view=args[0].kind==='shockFanReference'?shockFanDrawing(args[0],args[3]):args[0].wallReflection?wedgeWallDrawing(args[0],args[1],args[3]):args[0].kind==='ramjetInlet'?ramjetInletDrawing(args[0],args[1],args[3]):args[0].kind==='fannoSystem'?fannoSystemDrawing(args[0],args[1],args[3]):ductContourDrawing(args[0],args[1],args[3])??renderSceneSVG(...args);return {...view,svg:uniformDiagramText(view.svg)};}
export function chartSVG(...args){const view=renderChartSVG(...args);return {...view,svg:uniformDiagramText(view.svg)};}
