const degrees=a=>a*180/Math.PI;
export function defaultTrackingEvent(r){
 const es=r.tracking.events;return (es.find(e=>e.match&&e.incoming.includes('Oblique shock'))??es.find(e=>e.match)??es.find(e=>e.type==='Wall reflection')??es[0])?.index??null;
}
export function selectTrackingEvent(r,index){
 const e=r.tracking.events.find(e=>e.index===Number(index))??r.tracking.events[0];
 r.selectedTrackingEvent=e?.index??null;
 r.regions=e?.bookRegions??(e?.match?{'Lower before':e.lower,'Upper before':e.upper,'Lower after':e.match.a.after,'Upper after':e.match.b.after}:e?{'Before':e.before,'After':e.after}:{'Inlet':r.s1});
 return e;
}
function incomingText(e){
 const counts=new Map();for(const kind of e.incoming)counts.set(kind,(counts.get(kind)??0)+1);
 return [...counts].map(([kind,n])=>(n>1?n+' × ':'')+kind).join(' + ')||'Wall turn';
}
export function trackingInspectionHTML(r,fmt){
 const t=r.tracking,e=t.events.find(e=>e.index===r.selectedTrackingEvent),ref=t.refinement;
 let html='<div class="card-head"><h2>Wave events and slip directions</h2></div>';
 if(r.finalStreamMatch){const f=r.finalStreamMatch;html+=`<section class="final-stream-reference"><h3>Final-stream matching</h3><p><strong>Slip angle φ = ${fmt(f.slipAngle,6)}° to horizontal</strong><br>Common pressure p₄ = p₅ = ${fmt(f.regions[4].p/1000,6)} kPa</p><p class="tracking-caption">${f.note}</p><div class="region-table-scroll"><table class="region-table"><thead><tr><th>Region</th><th>M</th><th>p (kPa)</th><th>θ (°)</th></tr></thead><tbody>${Object.entries(f.regions).map(([n,z])=>`<tr><th>${n}</th><td>${fmt(z.M,6)}</td><td>${fmt(z.p/1000,6)}</td><td>${fmt(degrees(z.theta),6)}</td></tr>`).join('')}</tbody></table></div></section>`;}

 if(!e)return html+'<p>No accepted wave event. Change the wall angles or inlet Mach number.</p>';
 html+=`<label for="trackingEventSelect">Inspect event</label><select id="trackingEventSelect" aria-label="Inspect wave event">${t.events.map(z=>`<option value="${z.index}" ${z.index===e.index?'selected':''}>E${z.index} · ${z.type}${z.side?' · '+z.side+' wall':''} · x = ${fmt(z.x,5)} m</option>`).join('')}</select>`;
 html+=`<p><strong>E${e.index} · ${incomingText(e)}</strong><br>x = ${fmt(e.x,6)} m · y = ${fmt(e.y,6)} m</p>`;
 html+=`<p class="tracking-caption"><strong>${e.bookCase?'Example '+e.bookCase+' · ':''}${e.approximate?'Approximate fan-front interaction or dependent state':'Direct shock–expansion relations'}</strong></p>`;
 html+=`<div class="tracking-event-summary"><span>${e.hasSlip?'Local slip angle φ · to horizontal':e.match?'Local flow direction θ · to horizontal':'Wall flow direction θ · to horizontal'}<strong>${fmt(degrees(e.theta),6)}°</strong></span><span>${e.match?'Common downstream pressure':'Downstream pressure'}<strong>${fmt(e.pressure/1000,6)} kPa</strong></span></div>`;
 if(e.match)html+=`<p class="tracking-caption">${e.waves.map((w,i)=>(i?'Upper':'Lower')+' outgoing: '+w.kind).join(' · ')}${e.hasSlip?' · Slip line':' · No entropy/velocity contact'}</p>`;
 html+='<p class="tracking-caption">The table below and shock reports correspond to the selected event. All accepted events and states are included in JSON and CSV exports.</p>';
 if(ref)html+=ref.comparable?`<p class="tracking-refinement">Refinement ${fmt(t.step,3)}° → ${fmt(ref.fineStep,3)}°: mean |Δp|/p₁ = ${fmt(ref.pressureL1*100,4)}%; mean |ΔM|/M₁ = ${fmt(ref.machL1*100,4)}%. This measures sensitivity, not total error.</p>`:'<p class="tracking-refinement">The finer calculation did not reach the same outlet. Refinement comparison is unavailable; shorten the geometry or increase front width.</p>';
 return html;
}
export function trackingSummaryRows(r){
 const t=r.tracking,e=t.events.find(e=>e.index===r.selectedTrackingEvent),row=(label,value,unit='')=>({label,value,unit});
 return [...(r.finalStreamMatch?[row('Final-stream matched slip angle · to horizontal',r.finalStreamMatch.slipAngle,'°'),row('Final-stream matched pressure',r.finalStreamMatch.regions[4].p/1000,'kPa')]:[]),...(e?[row('Selected wave event',e.index,'E'),row(e.hasSlip?'Selected local slip angle · to horizontal':e.match?'Selected common flow direction':'Selected wall flow direction',degrees(e.theta),'°'),row(e.match?'Selected common pressure':'Selected downstream pressure',e.pressure/1000,'kPa')]:[]),row('Accepted wave events',t.events.length),row('Solved channel length',t.endX,'m'),row('Mass-flow discrepancy',t.maxMassResidual*100,'%'),row('Expansion-front width',t.step,'°')];
}
export function trackingExportRows(r){
 if(!r.tracking)return [];
 const rows=r.finalStreamMatch?[{label:'Final-stream matched slip angle · to horizontal',value:r.finalStreamMatch.slipAngle,unit:'°'},{label:'Final-stream matched pressure',value:r.finalStreamMatch.regions[4].p/1000,unit:'kPa'}]:[];
 for(const e of r.tracking.events){const prefix=`E${e.index} · ${e.type}`;
  rows.push({label:prefix+' · x',value:e.x,unit:'m'},{label:prefix+' · y',value:e.y,unit:'m'},{label:prefix+(e.hasSlip?' · slip angle':' · flow direction'),value:degrees(e.theta),unit:'°'},{label:prefix+' · downstream pressure',value:e.pressure/1000,unit:'kPa'});
  e.waves.forEach((w,i)=>{for(const [side,z]of [['before',w.before],['after',w.after]])for(const [key,unit,value]of [['Mach','',z.M],['Pressure','kPa',z.p/1000],['Temperature','K',z.T],['Density','kg/m³',z.rho],['Speed','m/s',z.u],['Flow direction','°',degrees(z.theta)],['Stagnation pressure','kPa',z.p0/1000],['Stagnation temperature','K',z.T0]])rows.push({label:`${prefix} · wave ${i+1} · ${w.kind} · ${side} · ${key}`,value,unit});if(w.beta!==null&&w.beta!==undefined)rows.push({label:prefix+' · wave '+(i+1)+' · shock angle',value:degrees(w.beta),unit:'°'});});
 }
 return rows;
}
