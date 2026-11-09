import {channelSolverName} from './channel-solver.js?v=20261109-interaction-layout';
import {trackingPreset} from './wave-tracker.js?v=20261109-interaction-layout';
import {trackingInspectionHTML,selectTrackingEvent,trackingExportRows,trackingSummaryRows} from './wave-tracker-tables.js?v=20261109-interaction-layout';
import {probeTracking} from './wave-tracker-graphics.js?v=20261109-interaction-layout';
import {chapter6Example} from './regular-channel.js?v=20261109-interaction-layout';
import {wallPresets} from './wave-wall.js?v=20261109-interaction-layout';
import {airfoilTables} from './airfoil-tables.js?v=20261109-interaction-layout';
import {airfoilGeometry,segmentSurface,surfaceSegments,presetSegments} from './airfoil.js?v=20261109-interaction-layout';
import {nearestChartPoint} from './chart-probe.js?v=20261108-chart-tooltip';
import {probeCone} from './cone-probe.js?v=20261108-cone-hover';
import {plotOptions} from './plot-options.js?v=20261109-interaction-layout';
import {selectGas,gasInfo} from './gas-properties.js?v=20261107-output-layout';
import {controlVolumePreset} from './control-volume.js?v=20261107-gases';
import {pressureSweepPlan,advancePressure} from './sweep.js?v=20261107-shock-states';
import {labs,chapters,defaults,inputDefinitions,nozzleInfo,trackingShockDetails} from './labs.js?v=20261109-interaction-layout';
import {sceneSVG,chartSVG,fmt} from './graphics.js?v=20261109-interaction-layout';
const $=id=>document.getElementById(id);let id='rayleigh',inputs={},request=0,current=null,pinned=null,timer,animation=false,frame,lastFrame=0,sceneTime=.001,fieldQuantity='pressure';
let pendingWaveShape=null,pendingBookCase=null,pendingCustomChannel=false;
let displayedChart=null,chartChoices=[],plotSelection={};
const worker=new Worker(new URL('./worker.js?v=20261109-interaction-layout',import.meta.url),{type:'module'});
function renderNav(){ $('chapters').innerHTML=chapters.map(([n,title,,ids])=>`<a href="#${ids[0]}" class="${ids.includes(id)?'active':''}" ${ids.includes(id)?'aria-current="page"':''}><span class="number">${String(n).padStart(2,'0')}</span><span><span class="nav-title">${title}</span></span></a>`).join('');}
function openLab(){stopSweep();clearTimeout(timer);sweepPositioned=false;sweepFinished=false;let next=location.hash.slice(1)||'rayleigh';if(next==='linear'){location.hash='airfoil';return;}if(!labs[next]){location.hash='rayleigh';return;}id=next;current=null;stopAnimation();inputs=defaults(id);try{let saved=JSON.parse(localStorage.getItem('gdvl-inputs-'+id+(id==='balances'?'-cv2':'')));if(saved&&typeof saved==='object'){for(let k in inputs)if(k in saved)inputs[k]=saved[k];if(id==='airfoil'&&!saved.geometryInput){const old=airfoilGeometry({...inputs,geometryInput:inputs.airfoilShape==='Custom panels'?'Coordinates':'Dimensions'});inputs.upperSegments=surfaceSegments(old.upper);inputs.lowerSegments=surfaceSegments(old.lower);inputs.geometryInput='Angles & lengths';}if(['oblique','expansion'].includes(id)&&saved.cornerColorVersion!==1)inputs.cornerView='Analytical contours';}}catch{}inputs.fluid=gasInfo(inputs).name;if(pendingWaveShape){if(id==='wall'){inputs.wallShape=pendingWaveShape;if(pendingWaveShape!=='Custom wall')inputs.boundaryMode='Single wall';inputs.wallSegments=wallPresets[pendingWaveShape].map(p=>({...p,angle:p.angle*(inputs.wallSide==='Gas below wall'?-1:1)}));}if(id==='collision'){inputs.interactionType=pendingWaveShape;inputs.geometryMode='Custom geometry';}pendingWaveShape=null;}if(pendingBookCase){inputs={...inputs,...chapter6Example(pendingBookCase)};pendingBookCase=null;}if(pendingCustomChannel&&id==='wall'){inputs.wallShape='Custom wall';inputs.boundaryMode='Channel';inputs.channelSolver='Shock–Expansion';pendingCustomChannel=false;}if(id==='collision')inputs.geometryMode='Custom geometry';if(id==='wall')inputs.channelSolver=channelSolverName(inputs.channelSolver);let l=labs[id];$('tag').textContent=l.tag;$('labTitle').textContent=l.title;$('description').textContent=l.description;$('chapterBadge').textContent=`CH. ${String(l.chapter).padStart(2,'0')}`;$('crumb').textContent=`CHAPTER ${String(l.chapter).padStart(2,'0')}`;$('model').textContent=l.model;$('limitations').textContent=l.limitations;let chapter=chapters.find(x=>x[0]===l.chapter);$('labTabs').innerHTML=chapter[3].length<2?'':chapter[3].map(k=>`<button type="button" data-lab="${k}" class="${id===k?'active':''}">${labs[k].title}</button>`).join('');$('labTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>location.hash=b.dataset.lab);renderNav();renderInputs();solve();}
const waveShapes=['Compression ramp','Expansion corner','Custom wall','Opposing shocks','Same-direction shocks'];
function waveGeometrySelector(){
 if(labs[id].chapter!==6)return '';
 const value=id==='wall'?inputs.wallShape:id==='collision'?inputs.interactionType:id==='expansion'?'Expansion corner':'Compression ramp';
 return `<div class="input-group"><div class="input-top"><label for="waveGeometrySelect">Geometry</label></div><select id="waveGeometrySelect">${waveShapes.map(v=>`<option ${v===value?'selected':''}>${v}</option>`).join('')}</select><div style="display:flex;gap:12px;margin-top:8px"><button type="button" id="book64" class="text-btn">Example 6–4</button><button type="button" id="book65" class="text-btn">Example 6–5</button></div></div>`;
}
function bindWaveGeometrySelector(){
 const select=$('waveGeometrySelect');if(!select)return;
 for(const number of [4,5])$('book6'+number).onclick=()=>{if(id!=='wall'){pendingBookCase=number;location.hash='wall';}else{inputs={...inputs,...chapter6Example(number)};renderInputs();solve();}};
 select.onchange=()=>{const shape=select.value,next=wallPresets[shape]?'wall':'collision';pendingWaveShape=shape;if(id===next)openLab();else location.hash=next;};
}
function wallSegmentEditor(f){
 const key=f.key,segments=inputs[key],side=key==='upperWallSegments'?'Upper wall':inputs.boundaryMode==='Channel'&&inputs.wallShape==='Custom wall'?'Lower wall':'Wall';
 return `<div id="editor-${key}" class="segment-editor"><table><thead><tr><th>#</th><th>Angle (°)</th><th>Length (m)</th><th></th></tr></thead><tbody>${segments.map((p,i)=>`<tr><th>${i+1}</th><td><input type="number" step="any" value="${fmt(p.angle,6)}" data-index="${i}" data-property="angle" aria-label="${side} segment ${i+1} angle"></td><td><input type="number" step="any" value="${fmt(p.length,6)}" data-index="${i}" data-property="length" aria-label="${side} segment ${i+1} length"></td><td><button type="button" data-remove="${i}" aria-label="Remove ${side.toLowerCase()} segment ${i+1}" ${segments.length===1?'disabled':''}>×</button></td></tr>`).join('')}</tbody></table><button type="button" class="segment-add" aria-label="Add ${side.toLowerCase()} segment" ${segments.length>=8?'disabled':''}>+ Add segment</button></div>`;
}
function bindWallSegments(f){
 const key=f.key,box=$('editor-'+key);
 for(const n of box.querySelectorAll('input')){const wasPreset=inputs.wallShape!=='Custom wall';n.oninput=()=>{inputs.wallShape='Custom wall';if($('waveGeometrySelect'))$('waveGeometrySelect').value='Custom wall';inputs[key]=inputs[key].map((p,i)=>i===Number(n.dataset.index)?{...p,[n.dataset.property]:n.value.trim()===''?NaN:Number(n.value)}:p);request++;schedule();if(wasPreset){renderInputs();$('editor-'+key).querySelector(`[data-index="${n.dataset.index}"][data-property="${n.dataset.property}"]`)?.focus();}};}
 for(const b of box.querySelectorAll('[data-remove]'))b.onclick=()=>{inputs[key]=inputs[key].filter((_,i)=>i!==Number(b.dataset.remove));renderInputs();request++;schedule();};
 box.querySelector('.segment-add').onclick=()=>{if(inputs[key].length>=8)return;inputs[key]=[...inputs[key],{angle:inputs[key].at(-1).angle,length:1}];inputs.wallShape='Custom wall';renderInputs();request++;schedule();};
}
function segmentEditor(f){
 const values=inputs[f.key]??[],max=inputs.airfoilShape==='Custom panels'?19:1,side=f.key==='upperSegments'?'Upper':'Lower';
 return `<div id="value-${f.key}" class="segment-editor" role="group" aria-label="${side} segment geometry"><table><thead><tr><th>#</th><th>Angle (°)</th><th>L/c</th><th></th></tr></thead><tbody>${values.map((p,i)=>`<tr><th>${i+1}</th><td><input type="number" step="any" inputmode="decimal" data-index="${i}" data-property="angle" value="${Number.isFinite(p.angle)?fmt(p.angle,6):''}" aria-label="${side} segment ${i+1} angle"></td><td><input type="number" step="any" inputmode="decimal" data-index="${i}" data-property="length" value="${Number.isFinite(p.length)?fmt(p.length,6):''}" aria-label="${side} segment ${i+1} length"></td><td><button type="button" data-remove="${i}" aria-label="Remove ${side.toLowerCase()} segment ${i+1}">×</button></td></tr>`).join('')}<tr class="segment-auto"><th>Auto</th><td data-closing-angle>—</td><td data-closing-length>—</td><td></td></tr></tbody></table><button type="button" class="segment-add" ${values.length>=max?'disabled':''}>+ Add segment</button></div>`;
}
function updateClosingSegment(key){
 const box=$('value-'+key);if(!box)return;let closing;try{closing=segmentSurface(inputs[key],key==='upperSegments'?'Upper surface':'Lower surface',inputs.airfoilShape==='Custom panels'?19:1).closing;}catch{}
 box.querySelector('[data-closing-angle]').textContent=closing?fmt(closing.angle,6):'—';box.querySelector('[data-closing-length]').textContent=closing?fmt(closing.length,6):'—';
}
function bindSegmentEditor(f){
 const box=$('value-'+f.key),changed=()=>{request++;updateClosingSegment(f.key);schedule();};updateClosingSegment(f.key);
 for(const n of box.querySelectorAll('input'))n.oninput=()=>{const index=Number(n.dataset.index),property=n.dataset.property;inputs[f.key]=inputs[f.key].map((p,i)=>i===index?{...p,[property]:n.value.trim()===''?NaN:Number(n.value)}:p);changed();};
 for(const button of box.querySelectorAll('[data-remove]'))button.onclick=()=>{inputs[f.key]=inputs[f.key].filter((_,i)=>i!==Number(button.dataset.remove));renderInputs();changed();};
 box.querySelector('.segment-add').onclick=()=>{if(inputs[f.key].length>=(inputs.airfoilShape==='Custom panels'?19:1))return;let start=0;for(const p of inputs[f.key])start+=p.length*Math.cos(p.angle*Math.PI/180);inputs[f.key]=[...inputs[f.key],{angle:0,length:Math.max(.001,(1-start)/2)}];renderInputs();changed();};
}
function changeAirfoilGeometry(key,value){
 let previous;try{previous=airfoilGeometry(inputs);}catch{}
 inputs[key]=value;
 if(key==='geometryInput'&&previous){
  if(value==='Angles & lengths'){inputs.upperSegments=surfaceSegments(previous.upper);inputs.lowerSegments=surfaceSegments(previous.lower);}
  else{const encode=points=>points.map(p=>`${Number(p.x.toPrecision(13))},${Number(p.y.toPrecision(13))}`).join('; ');inputs.upperProfile=encode(previous.upper);inputs.lowerProfile=encode(previous.lower);}
 }
 if(key==='airfoilShape'){
  inputs.geometryInput='Angles & lengths';
  if(value==='Custom panels'&&previous){inputs.upperSegments=surfaceSegments(previous.upper);inputs.lowerSegments=surfaceSegments(previous.lower);}
  else if(value!=='Flat plate'){const preset=presetSegments({...inputs,camber:value==='Asymmetric double wedge'?(inputs.camber||.01):0});inputs.upperSegments=preset.upper;inputs.lowerSegments=preset.lower;}
 }
 renderInputs();request++;schedule();
}
function renderInputs(){if(id==='collision')inputs.geometryMode='Custom geometry';if(id==='wall'){inputs.channelSolver=channelSolverName(inputs.channelSolver);if(inputs.wallShape!=='Custom wall')inputs.boundaryMode='Single wall';}$('cvPresets').hidden=id!=='balances';$('balancePanel').hidden=id!=='balances';$('isentropicPanel').hidden=true;if(id==='nozzle'){const info=nozzleInfo(inputs);$('description').textContent=info.description;$('model').textContent=info.model;$('limitations').textContent=info.limitations;}if(id==='wall')$('limitations').textContent=inputs.channelSolver==='Method of characteristics'&&inputs.boundaryMode==='Channel'?'Stage 1: isentropic expanding channels. Compression corners and shocks require shock fitting. Refine resolution to assess interpolation error.':labs.wall.limitations;const fields=inputDefinitions(id,inputs).filter(f=>!(id==='collision'&&f.key==='interactionType')&&f.key!=='plotProperty'&&(!['gamma','R'].includes(f.key)||!f.readOnly));$('inputs').innerHTML=waveGeometrySelector()+fields.map(x=>`${x.section?`<h3 class="input-section">${x.section}</h3>`:''}<div class="input-group"><div class="input-top"><label for="value-${x.key}">${x.label}</label><span class="unit">${x.unit??''}</span></div>${x.type==='wall-segments'?wallSegmentEditor(x):x.type==='segments'?segmentEditor(x):x.type==='textarea'?`<textarea id="value-${x.key}" name="${x.key}" rows="4" spellcheck="false">${String(inputs[x.key]??'').replaceAll('&','&amp;').replaceAll('<','&lt;')}</textarea>`:x.options?`<select id="value-${x.key}" name="${x.key}">${x.options.map(v=>`<option value="${v}" ${inputs[x.key]===v?'selected':''}>${v}</option>`).join('')}</select>`:`<div class="number-wrap"><input id="value-${x.key}" name="${x.key}" type="number" value="${inputs[x.key]}" min="${x.min}" max="${x.max}" step="any" inputmode="decimal" ${x.readOnly?'readonly':''} aria-label="${x.label} ${x.unit}" required></div><input id="range-${x.key}" type="range" ${x.readOnly?'disabled':''} min="${x.sliderMin??x.min}" max="${x.sliderMax??x.max}" step="${x.step}" value="${inputs[x.key]}" aria-label="${x.label} slider"><div class="range-labels"><span>${x.sliderMin??x.min}</span><span>${x.sliderMax??x.max}</span></div>`}</div>`).join('');$('inputs').onsubmit=e=>e.preventDefault();if(id==='wall'&&$('value-channelSolver')){
 $('value-channelSolver').insertAdjacentHTML('afterend','<button type="button" id="mocExample" class="text-btn" style="display:block;margin-top:8px">Load expansion example</button>');
 $('mocExample').insertAdjacentHTML('afterend','<div class="tracking-presets"><button type="button" class="text-btn" data-tracking-preset="reflection">Shock reflections</button><button type="button" class="text-btn" data-tracking-preset="shock-fan">Shock + expansion</button><button type="button" class="text-btn" data-tracking-preset="fans">Two expansion fans</button></div>');
 $('inputs').querySelectorAll('[data-tracking-preset]').forEach(b=>b.onclick=()=>{inputs={...inputs,...trackingPreset(b.dataset.trackingPreset)};renderInputs();solve();});
 $('mocExample').onclick=()=>{inputs={...inputs,wallShape:'Custom wall',boundaryMode:'Channel',channelSolver:'Method of characteristics',M1:3,channelHeight:1,wallSegments:[{angle:-8,length:6}],upperWallSegments:[{angle:8,length:6}],mocResolution:81,mocStation:1,mocLines:'Shown'};renderInputs();solve();};
 }bindWaveGeometrySelector();for(let x of fields){if(x.type==='wall-segments'){bindWallSegments(x);continue;}if(x.type==='segments'){bindSegmentEditor(x);continue;}let n=$('value-'+x.key),r=$('range-'+x.key);n.oninput=()=>{if(id==='airfoil'&&['airfoilShape','geometryInput'].includes(x.key)){changeAirfoilGeometry(x.key,n.value);return;}stopSweep();sweepFinished=false;sweepPositioned=x.key==='backRatio';request++;inputs[x.key]=x.options||x.type==='textarea'?n.value:n.value.trim()===''?NaN:Number(n.value);if(r)r.value=n.value;if(x.key==='fluid'){inputs=selectGas(inputs,n.value);renderInputs();$('value-fluid').focus();}if(id==='nozzle'&&(x.key==='nozzleType'||x.key==='nozzleView'||x.key==='outletCondition'||x.key==='MIn'&&(inputs.MIn===1||!!$('value-sonicBranch')))){renderInputs();$('value-'+x.key)?.focus();}if(id==='wall'&&x.key==='channelSolver'){renderInputs();}if(id==='wall'&&x.key==='boundaryMode'){if(inputs.boundaryMode==='Channel')inputs.wallShape='Custom wall';renderInputs();}if(id==='wall'&&x.key==='wallSide'){inputs.wallShape='Custom wall';renderInputs();}if(id==='balances'&&x.key==='balanceMode'||id==='collision'&&['interactionType','geometryMode'].includes(x.key)||id==='airfoil'&&x.key==='airfoilShape')renderInputs();schedule(x.key==='backRatio');};if(r)r.oninput=()=>{stopSweep();sweepFinished=false;sweepPositioned=x.key==='backRatio';request++;inputs[x.key]=Number(r.value);n.value=r.value;if(id==='nozzle'&&x.key==='MIn'&&(inputs.MIn===1||!!$('value-sonicBranch'))){renderInputs();}schedule(x.key==='backRatio');};}syncSweep();}
function schedule(stream=false){clearTimeout(timer);timer=setTimeout(()=>solve({stream}),id==='cone'?240:70);}
function pendingAirfoilScene(){
 if(id!=='airfoil')return '<div class="error-display" style="color:#7f927d">Solving the physical model…</div>';
 try{return sceneSVG({kind:'airfoil',geometry:airfoilGeometry(inputs),models:[],alpha:(inputs.alpha??0)*Math.PI/180},inputs).svg;}
 catch{return '<div class="error-display">Check airfoil geometry.</div>';}
}
function solve({stream=false}={}){$('fieldProbe').hidden=true;$('chartProbe').hidden=true;$('flowRelationsPanel').hidden=true;$('regionTablePanel').hidden=true;$('trackingEventPanel').hidden=true;request++;solvePending=true;if(!stream)current=null;$('status').textContent=stream?'Updating…':'Solving…';$('status').className='status';$('comparison').hidden=true;for(const key of ['exportJson','exportCsv','pin','exportSvg'])$(key).disabled=true;if(!stream||!current){$('isentropicPanel').hidden=true;$('results').innerHTML='<div class="result-row"><span class="result-label">Computing a new state…</span></div>';$('notice').hidden=true;$('scene').innerHTML=pendingAirfoilScene();$('chart').innerHTML='';$('legend').textContent='';$('chartTitle').textContent='Property map';}stopAnimation();worker.postMessage({request,id,inputs});}

worker.onmessage=({data})=>{if(data.request!==request)return;solvePending=false;if(!data.ok){current=null;stopSweep();syncSweep();$('sweepState').textContent='No accepted state for these inputs.';$('status').textContent=data.code==='detached'?'Detached':'Check inputs';$('status').className='status error';$('notice').hidden=false;$('notice').textContent=data.error;if(id==='collision'&&data.code==='geometry-limit'){const link=document.createElement('button');link.type='button';link.className='text-btn';link.textContent='Open Custom wall / Channel';link.style.display='block';link.style.marginTop='12px';link.onclick=()=>{pendingCustomChannel=true;location.hash='wall';};$('notice').appendChild(link);}$('scene').innerHTML='<div class="error-display">No field is displayed for these inputs.<br>The selected physical model has no accepted solution.</div>';$('results').innerHTML='';$('chart').innerHTML='';$('legend').textContent='';$('plotQuantity').innerHTML='';$('plotNote').textContent='';return;}current=data.data;try{localStorage.setItem('gdvl-inputs-'+id+(id==='balances'?'-cv2':''),JSON.stringify(inputs));}catch{}renderResult();syncSweep();continueSweep();};
worker.onerror=()=>{solvePending=false;stopSweep();syncSweep();$('status').textContent='Worker error';$('notice').hidden=false;$('notice').textContent='The calculation worker could not start. Serve this folder over HTTP(S) with module support.';};
function renderShockDetails(groups=[]){const box=$('shockResults');if(!groups.length){box.hidden=true;box.innerHTML='';return;}box.hidden=false;box.innerHTML=`<h3>SHOCK STATES · ONE-SIDED VALUES</h3>${groups.map(g=>`<section class="shock-state"><h4>${g.title}</h4><p>${g.location}</p><div class="shock-table-wrap"><table><thead><tr><th>Parameter</th><th>Before</th><th>After</th><th>After / before</th></tr></thead><tbody>${g.rows.map(r=>`<tr><th>${r.label}</th><td>${fmt(r.before)} ${r.unit}</td><td>${fmt(r.after)} ${r.unit}</td><td>${fmt(r.ratio)}</td></tr>`).join('')}</tbody></table></div><dl>${g.extra.map(e=>`<div><dt>${e.label}</dt><dd>${fmt(e.value)} ${e.unit}</dd></div>`).join('')}</dl></section>`).join('')}`;}
function renderIsentropicRelations(d){
 const panel=$('isentropicPanel');panel.hidden=d.id!=='foundations';if(panel.hidden)return;
 panel.innerHTML=`<div class="card-head"><h2>Isentropic Flow Calculator</h2><span class="status">γ = ${fmt(d.inputs.gamma)}</span></div><dl class="isentropic-grid">${d.rows.filter(r=>r.panel==='isentropic').map(r=>`<div><dt>${r.label}</dt><dd>${r.display??fmt(r.value,8)}${r.unit?` <small>${r.unit}</small>`:''}</dd></div>`).join('')}</dl><p class="isentropic-note">Subscript 0: stagnation state. Asterisk *: sonic reference at the same stagnation state; A* is the corresponding critical area for the same mass flow. Angles are in degrees. Mach and Prandtl–Meyer angles are defined for M ≥ 1; a dash marks an unavailable angle. At M = 0, A/A* is unbounded.</p>`;
}
function renderBalanceDetails(){
 const panel=$('balancePanel');panel.hidden=current.id!=='balances';if(panel.hidden)return;
 const r=current.result;$('status').textContent=r.entropyViolation?'Entropy decreases':r.balanced?'Balances satisfied':'Not balanced';$('status').className='status'+(r.balanced&&!r.entropyViolation?'':' error');
 panel.innerHTML=`<div class="cv-summary"><strong>${r.entropyViolation?'Balances may close, but entropy decreases':r.balanced?'All integral balances close':'Proposed steady states do not balance'}</strong><p>Signed terms below sum to the residual. A positive residual means net excess input under the displayed convention. Closure tolerance: relative residual &lt; 10⁻⁷. The interior is schematic.</p></div><div class="cv-equations">${Object.entries(r.terms).map(([k,t])=>{const scale=k==='energy'?1000:1,unit=k==='energy'?'kW':t.unit;return `<article class="cv-equation ${t.passed?'closed':'open'}"><h3>${k==='mass'?'Mass':k==='momentum'?'Axial momentum':'Energy'} <span>${t.passed?'Balanced':'Mismatch'}</span></h3><table><thead><tr><th>Signed contribution</th><th>${unit}</th></tr></thead><tbody>${t.terms.map(([name,value])=>`<tr><td>${name}</td><td>${value>0?'+':''}${fmt(value/scale,6)}</td></tr>`).join('')}<tr class="cv-residual"><th>Σ terms · residual</th><td>${t.residual>0?'+':''}${fmt(t.residual/scale,6)}</td></tr></tbody></table></article>`;}).join('')}</div><p class="cv-note">${inputs.balanceMode==='Solve outlet speed'?'Outlet speed is calculated from mass conservation; pressure, temperature, heat, work and axial force must still satisfy momentum and energy.':'Both endpoint states are prescribed; the program checks the balances without altering the outlet.'} ${r.entropyChecked?`Adiabatic entropy check: Δs = ${fmt(r.ds,6)} J/(kg·K). ${r.entropyViolation?'Entropy decrease is inadmissible.':'No entropy decrease detected.'}`:Math.abs(r.Q)<1e-10?'Entropy comparison is withheld until mass conservation closes.':'Heat-transfer entropy balance requires the heat-transfer boundary temperature and is not assessed here.'}</p>`;
}
function loadCVPreset(kind){if(id!=='balances')return;clearTimeout(timer);inputs={...defaults('balances'),...controlVolumePreset(kind,{gamma:inputs.gamma,R:inputs.R}),fluid:inputs.fluid};renderInputs();solve();}
$('cvNozzle').onclick=()=>loadCVPreset('nozzle');$('cvShock').onclick=()=>loadCVPreset('shock');$('cvPerturb').onclick=()=>{if(id!=='balances')return;inputs.p2*=1.1;renderInputs();solve();};
function csvDataRows(d){return [...d.rows,...trackingExportRows(d.result),...(d.gas?[{label:'Working gas',value:d.gas.name,unit:''},{label:'Specific gas constant',value:d.gas.R,unit:'J/(kg·K)'},{label:'Specific heat ratio',value:d.gas.gamma,unit:''},{label:'Specific heat cp',value:d.gas.cp,unit:'J/(kg·K)'}]:[]),...(d.id==='balances'?Object.entries(d.result.terms).flatMap(([k,t])=>[...t.terms.map(([label,value])=>({label:k+' · '+label,value,unit:t.unit})),{label:k+' · relative residual',value:t.relative,unit:''}]):[]),...(d.shockDetails??[]).flatMap(g=>[...g.rows.flatMap(r=>[{label:`${g.title} · ${r.label} · upstream`,value:r.before,unit:r.unit},{label:`${g.title} · ${r.label} · downstream`,value:r.after,unit:r.unit},{label:`${g.title} · ${r.label} · downstream/upstream`,value:r.ratio,unit:''}]),...g.extra.map(e=>({label:`${g.title} · ${e.label}`,value:e.value,unit:e.unit}))])]}
function renderTrackingPanel(d){
 const panel=$('trackingEventPanel');panel.hidden=!d.result.tracking;panel.innerHTML=panel.hidden?'':trackingInspectionHTML(d.result,fmt);if(panel.hidden)return;
 const select=$('trackingEventSelect');if(select)select.onchange=()=>{selectTrackingEvent(d.result,select.value);d.scene.selectedTrackingEvent=d.result.selectedTrackingEvent;d.shockDetails=trackingShockDetails(d.result);d.rows=[...d.rows.filter(r=>r.panel),...trackingSummaryRows(d.result)];renderResult();};
}
function renderRegionTable(d){
 const panel=$('regionTablePanel');panel.hidden=!['collision','wall'].includes(d.id)||!d.result.regions;
 if(panel.hidden){$('regionTable').innerHTML='';return;}
 $('regionTableTitle').textContent=d.result.tracking?(d.result.tracking.events.find(e=>e.index===d.result.selectedTrackingEvent)?.bookCase?'Book-example regions':'Selected event states'):d.result.moc?'Inlet and outlet samples':'Flow properties by region';
 const regions=Object.entries(d.result.regions);
 const properties=[['Mach number','M','',z=>z.M],['Static pressure','p','kPa',z=>z.p/1000],['Static temperature','T','K',z=>z.T],['Density','ρ','kg/m³',z=>z.rho],['Flow speed','u','m/s',z=>z.u],['Flow angle','θ','°',z=>z.theta*180/Math.PI],['Stagnation pressure','p₀','kPa',z=>z.p0/1000],['Stagnation temperature','T₀','K',z=>z.T0]];
 if(d.result.interaction||d.result.tracking)properties.push(['Entropy rise from inlet','Δs','J/(kg·K)',z=>-(d.result.R??d.inputs.R??287)*Math.log(z.p0/d.result.s1.p0)]);
 $('regionTable').innerHTML=`<div class="region-table-scroll" tabindex="0" role="region" aria-label="Flow properties for all regions; scroll horizontally on smaller screens"><table class="region-table"><caption>${d.result.tracking?'Local states at the selected event':d.result.moc?'Inlet and outlet samples':'Analytical states · '+regions.length+' regions'}</caption><thead><tr><th scope="col">Property</th>${regions.map(([n])=>`<th scope="col">${d.result.moc||d.result.tracking?n:'Region '+(d.result.regionLabels?.[n]??n)}</th>`).join('')}</tr></thead><tbody>${properties.map(([name,symbol,unit,get])=>`<tr><th scope="row">${name} <span>${symbol}${unit?` · ${unit}`:''}</span></th>${regions.map(([,z])=>`<td>${fmt(get(z),6)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderFlowRelations(d){
 const box=$('flowRelationsPanel'),t=d.result.referenceTable;box.hidden=!t;
 if(!t){box.innerHTML='';return;}
 box.innerHTML=`<h3>${t.title}</h3><div class="flow-relations-scroll"><table><thead><tr><th scope="col">Parameter</th>${t.columns.map(c=>`<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r=>`<tr><th scope="row">${r.label}</th>${r.values.map(v=>`<td>${fmt(v,8)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>${t.note}</p>`;
}
function renderAirfoilPanel(d){const box=$('airfoilPanel');box.hidden=d.id!=='airfoil';box.innerHTML=box.hidden?'':airfoilTables(d.result,fmt);}

function renderResult(){let d=current;if($('engineLabel'))$('engineLabel').textContent=d.result.tracking?'SHOCK–EXPANSION':d.result.moc?'NUMERICAL MOC':'ANALYTICAL ENGINE';if(d.result.tracking)$('limitations').textContent='Attached, downstream-supersonic waves only. Expansion fans use finite fronts; check refinement. The field stops at a physical, accuracy or event-budget limit.';else if(d.result.interaction)$('limitations').textContent='The regular shock interaction and slip direction are solved. The view ends before the next wall reflection. General shock–fan interactions and Mach reflections are outside this model.';$('model').textContent=d.model;$('gasResultSummary').textContent=d.gas?`${d.gas.name} · cₚ = ${fmt(d.gas.cp,6)}, cᵥ = ${fmt(d.gas.cv,6)} J/(kg·K)`:'';$('status').textContent=['heat-limit','length-limit'].includes(d.result.status)?'Limit exceeded':d.result.status==='sonic-limit'?'Sonic limit':d.result.status==='detached'?'Detached shock':d.result.status==='unsupported'?'Model limit':d.result.status==='partial'?'Local solution':d.result.tracking&&d.result.tracking.hasFanApproximation?'Mixed solution':'Solved';$('status').className='status'+(['heat-limit','length-limit','detached','unsupported'].includes(d.result.status)?' error':'');if(d.result.external&&!d.result.external.outlet){$('status').textContent=d.result.external.status==='no-flow'?'No flow':'Model limit';$('status').className=d.result.external.status==='no-flow'?'status':'status error';}$('notice').hidden=!d.notice;$('notice').textContent=d.notice??'';renderIsentropicRelations(d);renderTrackingPanel(d);renderRegionTable(d);renderFlowRelations(d);renderAirfoilPanel(d);$('results').innerHTML=d.rows.filter(r=>d.id!=='airfoil'&&!r.panel&&!(d.id==='collision'&&r.label.startsWith('Region '))&&!(d.id==='cone'&&['Conical shock angle β','Recovered cone angle','Surface Mach','Surface pressure','Surface temperature'].includes(r.label))).map(r=>`<div class="result-row"><span class="result-label">${r.label}</span><span class="result-value">${fmt(r.value)}<small>${r.unit}</small></span></div>`).join('');renderShockDetails(d.shockDetails);renderBalanceDetails();$('exportJson').disabled=false;$('exportCsv').disabled=false;$('pin').disabled=false;$('exportSvg').disabled=false;renderScene();updatePlotChoices();renderCompare();}
function renderScene(){if(!current)return;let view=sceneSVG(current.scene,inputs,sceneTime,fieldQuantity);$('animate').hidden=['airfoil','wall'].includes(current.id);$('scene').innerHTML=view.svg;$('scene').dataset.kind=current.scene.kind;bindFieldProbe();$('fieldLabel').textContent=view.label;$('sceneMeta').textContent=view.meta;$('sceneTitle').textContent=current.scene.kind==='nozzleJet'&&['matched','no-flow'].includes(current.scene.status)?current.result.regime:['jet','nozzleJet'].includes(current.scene.kind)?current.scene.title:current.id==='wall'&&current.result.tracking?'Wave propagation and reflections':current.id==='wall'&&current.result.interaction?'Wave interaction and slip line':current.id==='wall'&&current.result.moc?'Characteristic field':current.id==='airfoil'?'Surface pressure coefficient':current.scene.kind==='coneDetached'?'Detached shock':current.id==='balances'?'Control volume · endpoint states':current.id==='nozzle'?current.result.regime:['oblique','expansion'].includes(current.id)?(inputs.cornerView==='Analytical contours'?'Analytical contours':'Flow schematic'):'Analytical field';const tools=$('fieldControls');tools.hidden=!view.field;if(view.field){fieldQuantity=view.field.quantity;for(const o of $('fieldQuantity').options)o.hidden=!view.field.options.includes(o.value);$('fieldQuantity').value=fieldQuantity;$('fieldMin').textContent=`${fmt(view.field.min,4)} ${view.field.units}`;$('fieldMax').textContent=`${fmt(view.field.max,4)} ${view.field.units}`;$('fieldControls').querySelector('.field-ramp').style.background=view.field.palette?`linear-gradient(to right,${view.field.palette.join(',')})`:'';$('fieldScaleLabel').textContent=`${view.field.label} · ${view.field.note}`;}}
function bindFieldProbe(){
 const box=$('fieldProbe'),scene=$('scene'),svg=scene.querySelector('svg');box.hidden=true;scene.onpointermove=null;scene.onpointerdown=null;scene.onpointerleave=null;
 if(current?.scene.tracking&&svg){
  const hide=()=>box.hidden=true;
  const inspect=e=>{const matrix=svg.getScreenCTM();if(!matrix)return hide();const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(matrix.inverse()),v=probeTracking(current.scene,q.x,q.y);if(!v)return hide();box.innerHTML=`<strong>x = ${fmt(v.x,5)} m · y = ${fmt(v.y,5)} m</strong><dl>${[['Mach M',v.M],['p (kPa)',v.p/1000],['T (K)',v.T],['ρ (kg/m³)',v.rho],['θ (°)',v.theta*180/Math.PI]].map(([label,value])=>`<div><dt>${label}</dt><dd>${fmt(value,6)}</dd></div>`).join('')}</dl>`;box.hidden=false;const bounds=box.getBoundingClientRect();box.style.left=Math.max(8,Math.min(innerWidth-bounds.width-8,e.clientX+16))+'px';box.style.top=Math.max(8,Math.min(innerHeight-bounds.height-8,e.clientY+16))+'px';};scene.onpointermove=inspect;scene.onpointerdown=inspect;scene.onpointerleave=hide;return;
 }
 if(current?.scene.kind!=='cone'||!svg)return;
 const hide=()=>{box.hidden=true;$('fieldProbePoint')?.setAttribute('visibility','hidden');};
 const inspect=e=>{
  const matrix=svg.getScreenCTM();if(!matrix)return hide();const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(matrix.inverse()),v=probeCone(current.scene,current.inputs,q.x,q.y);if(!v)return hide();
  box.innerHTML=`<strong>θ = ${fmt(v.theta,5)}°</strong><dl>${[['Mach M',v.M],['p/p∞',v.p],['T/T∞',v.T],['ρ/ρ∞',v.rho],['u/u∞',v.u]].map(([label,value])=>`<div><dt>${label}</dt><dd>${fmt(value,6)}</dd></div>`).join('')}</dl>`;
  box.hidden=false;const bounds=box.getBoundingClientRect();box.style.left=Math.max(8,Math.min(innerWidth-bounds.width-8,e.clientX+16))+'px';box.style.top=Math.max(8,Math.min(innerHeight-bounds.height-8,e.clientY+16))+'px';
  const dot=$('fieldProbePoint');dot.setAttribute('cx',q.x);dot.setAttribute('cy',q.y);dot.setAttribute('visibility','visible');
 };
 scene.onpointermove=inspect;scene.onpointerdown=inspect;scene.onpointerleave=hide;
}
$('fieldQuantity').onchange=()=>{fieldQuantity=$('fieldQuantity').value;renderScene();};
function updatePlotChoices(){
 chartChoices=plotOptions(current,sceneTime);const select=$('plotQuantity');select.innerHTML=chartChoices.map(o=>`<option value="${o.key}">${o.label}</option>`).join('');if(!chartChoices.some(o=>o.key===plotSelection[id]))plotSelection[id]=chartChoices[0].key;select.value=plotSelection[id];renderSelectedPlot();
}
function renderSelectedPlot(){
 $('chartProbe').hidden=true;
 if(!current)return;if(id==='tube'&&(plotSelection[id]??'').startsWith('tube-profile-'))chartChoices=plotOptions(current,sceneTime);
 const option=chartChoices.find(o=>o.key===plotSelection[id])??chartChoices[0];if(!option){$('chart').innerHTML='';$('legend').innerHTML='';$('chartTitle').textContent=current.id==='airfoil'?'No accepted surface profile':'No attached-flow profile';$('plotNote').textContent='';return;}displayedChart=option.chart;const chart=chartSVG(displayedChart);$('chartTitle').textContent=displayedChart.title;$('chart').innerHTML=chart.svg;$('legend').innerHTML=chart.legend;$('plotNote').textContent=option.note??'Choose a property to set its own units and axis. Curves show the current model and input conditions.';bindProbe(chart.axis);
}
$('plotQuantity').onchange=()=>{plotSelection[id]=$('plotQuantity').value;renderSelectedPlot();};
function bindProbe(a){
 const hit=$('chartHit'),svg=hit?.ownerSVGElement,box=$('chartProbe');box.hidden=true;if(!hit||!a)return;
 const hide=()=>{box.hidden=true;$('cursorLine')?.setAttribute('opacity','0');$('cursorPoint')?.setAttribute('opacity','0');};
 const inspect=e=>{
  const matrix=svg.getScreenCTM();if(!matrix)return hide();const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const q=pt.matrixTransform(matrix.inverse()),v=nearestChartPoint(displayedChart,a,q.x,q.y);if(!v)return hide();
  box.textContent=(displayedChart.series.length>1?v.name+'\n':'')+`${displayedChart.xlabel}: ${fmt(v.x,6)}\n${displayedChart.ylabel}: ${fmt(v.y,6)}`;box.hidden=false;
  const bounds=box.getBoundingClientRect();box.style.left=Math.max(8,Math.min(innerWidth-bounds.width-8,e.clientX+15))+'px';box.style.top=Math.max(8,Math.min(innerHeight-bounds.height-8,e.clientY+15))+'px';
  const line=$('cursorLine');line.setAttribute('x1',v.cx);line.setAttribute('x2',v.cx);line.setAttribute('opacity','1');const dot=$('cursorPoint');dot.setAttribute('cx',v.cx);dot.setAttribute('cy',v.cy);dot.setAttribute('opacity','1');
 };
 hit.onpointermove=inspect;hit.onpointerdown=inspect;hit.onpointerleave=hide;
}
function download(name,text,type){let blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('exportJson').onclick=()=>{if(current)download(`gas-dynamics-${id}.json`,JSON.stringify({...current,exportedAt:new Date().toISOString()},null,2),'application/json');};
$('exportCsv').onclick=()=>{if(!current)return;let q=s=>'"'+String(s).replaceAll('"','""')+'"';download(`gas-dynamics-${id}.csv`,'property,value,unit\n'+csvDataRows(current).map(r=>[r.label,r.value??'',r.unit].map(q).join(',')).join('\n'),'text/csv');};
$('exportSvg').onclick=()=>{if(current)download(`gas-dynamics-${id}.svg`,$('scene').innerHTML,'image/svg+xml');};
$('reset').onclick=()=>{stopSweep();clearTimeout(timer);sweepPositioned=false;sweepFinished=false;inputs=defaults(id);renderInputs();solve();};
$('pin').onclick=()=>{if(!current)return;pinned={id,inputs:{...inputs},rows:current.rows.map(x=>({...x}))};try{localStorage.setItem('gdvl-pinned',JSON.stringify(pinned));}catch{}renderCompare();};
try{pinned=JSON.parse(localStorage.getItem('gdvl-pinned'));}catch{}
function renderCompare(){let box=$('comparison');if(!current||!pinned||pinned.id!==id){box.hidden=true;return;}box.hidden=false;box.innerHTML='<b>Pinned / current</b><table><tr><th>Property</th><th>Pinned</th><th>Current</th></tr>'+current.rows.map((r,i)=>`<tr><td>${r.label}</td><td>${fmt(pinned.rows.find(v=>v.label===r.label&&v.unit===r.unit)?.value)}</td><td>${fmt(r.value)}</td></tr>`).join('')+'</table><button class="text-btn" id="clearPin">Clear comparison</button>';$('clearPin').onclick=()=>{pinned=null;try{localStorage.removeItem('gdvl-pinned');}catch{}renderCompare();};}
function stopAnimation(){animation=false;cancelAnimationFrame(frame);$('scene').classList.remove('animating');$('animate').textContent='▶ Animate';$('animate').setAttribute('aria-pressed','false');}
$('animate').onclick=()=>{if(id==='nozzle'){toggleSweep();return;}if(!current)return;if(animation){stopAnimation();return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){$('notice').hidden=false;$('notice').textContent='Animation is paused because your system prefers reduced motion.';return;}animation=true;$('scene').classList.add('animating');$('animate').textContent='Ⅱ Pause';$('animate').setAttribute('aria-pressed','true');if(id==='tube'){const tick=t=>{if(!animation)return;if(t-lastFrame>45){lastFrame=t;sceneTime=.00012+(t%6000)/6000*.00188;renderScene();if((plotSelection[id]??'').startsWith('tube-profile-'))renderSelectedPlot();}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);}else{$('notice').hidden=false;$('notice').textContent='Moving tracers illustrate flow direction only; they are not time-resolved particle trajectories.';}};
let sweepPlaying=false,sweepTimer=null,sweepPositioned=false,sweepAtEnd=false,sweepDelay=100,sweepFinished=false,solvePending=false,sweepPlanCache=null,sweepPlanKey='';
function getSweepPlan(){
 const key=JSON.stringify([inputs.nozzleType,inputs.areaRatio,inputs.contractionRatio,inputs.MIn,inputs.sonicBranch,inputs.outletCondition,inputs.gamma]);
 if(key!==sweepPlanKey||!sweepPlanCache){sweepPlanKey=key;try{sweepPlanCache=pressureSweepPlan(inputs);}catch(e){sweepPlanCache={enabled:false,min:.001,max:1,milestones:[],message:e.message};}}
 return sweepPlanCache;
}
function syncSweep(){
 const box=$('nozzleSweep');box.hidden=id!=='nozzle';$('animate').hidden=['nozzle','balances','airfoil','wall'].includes(id);if(id!=='nozzle')return;
 const plan=getSweepPlan(),ratio=inputs.backRatio,position=Number.isFinite(ratio)?ratio:plan.min;
 $('pressureScrub').min=plan.min;$('pressureScrub').max=plan.max;$('pressureScrub').value=position;$('pressureScrub').disabled=!plan.enabled;
 $('sweepMin').textContent=fmt(plan.min,5);$('sweepMax').textContent=fmt(plan.max,6);
 $('sweepValue').textContent=`pᵦ/p₀ = ${fmt(ratio,7)}`;
 $('sweepPlay').disabled=!plan.enabled;$('sweepPlay').textContent=sweepPlaying?'Ⅱ Pause':'▶ Play sweep';$('sweepPlay').setAttribute('aria-pressed',String(sweepPlaying));$('sweepRestart').disabled=!plan.enabled;
 $('sweepEnable').hidden=!plan.canEnable;$('sweepAvailability').textContent=(sweepFinished?'Sweep complete. ':'')+plan.message;
 const signature=JSON.stringify(plan.milestones);if($('sweepJump').dataset.plan!==signature){$('sweepJump').innerHTML='<option value="">Choose a state…</option>'+plan.milestones.map(m=>`<option value="${m.pressure}">${m.label} · ${fmt(m.pressure,6)}</option>`).join('');$('sweepJump').dataset.plan=signature;}
 $('sweepJump').disabled=!plan.enabled;const mark=plan.milestones.find(m=>Math.abs(m.pressure-position)<1e-12);$('sweepJump').value=mark?String(mark.pressure):'';
 if(current&&current.id==='nozzle'){
  const r=current.result,external=r.external,title=external&&external.status!=='matched'?external.title:r.regime;
  $('sweepState').textContent=`${title}${r.shockX!==null?` · xₛ/L = ${fmt(r.shockX,5)}`:''} · pᵦ = ${fmt(position*inputs.p0,6)} kPa`;
 }else $('sweepState').textContent=plan.enabled?'Ready to vary back pressure.':plan.message;
}
function stopSweep(){sweepPlaying=false;clearTimeout(sweepTimer);sweepTimer=null;sweepAtEnd=false;if($('sweepPlay')){$('sweepPlay').textContent='▶ Play sweep';$('sweepPlay').setAttribute('aria-pressed','false');}}
function setSweepPressure(value){inputs.backRatio=value;const n=$('value-backRatio'),r=$('range-backRatio');if(n)n.value=value;if(r)r.value=value;$('pressureScrub').value=value;syncSweep();}
function requestSweepFrame(){
 if(!sweepPlaying)return;
 if(solvePending){sweepTimer=setTimeout(requestSweepFrame,50);return;}
 const plan=getSweepPlan(),direction=Number($('sweepDirection').value),speed=Number($('sweepSpeed').value);
 if(!plan.enabled){stopSweep();syncSweep();return;}
 const next=advancePressure(inputs.backRatio,plan,direction,(plan.max-plan.min)*.0035*speed);
 sweepAtEnd=next.ended;sweepDelay=next.milestone?Math.max(200,900/speed):100;
 setSweepPressure(next.pressure);solve({stream:true});
}
function continueSweep(){
 if(!sweepPlaying)return;
 if(sweepAtEnd){
  if(!$('sweepRepeat').checked){stopSweep();sweepFinished=true;syncSweep();return;}
  $('sweepDirection').value=String(-Number($('sweepDirection').value));sweepAtEnd=false;
 }
 clearTimeout(sweepTimer);sweepTimer=setTimeout(requestSweepFrame,sweepDelay);
}
function toggleSweep(){
 if(sweepPlaying){stopSweep();syncSweep();return;}
 const plan=getSweepPlan();if(!plan.enabled)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){$('sweepAvailability').textContent='Reduced motion is enabled. Use the pressure slider or jump controls to inspect each steady state.';return;}
 clearTimeout(timer);stopAnimation();const direction=Number($('sweepDirection').value),end=direction===1?plan.max:plan.min;
 if(!sweepPositioned||!Number.isFinite(inputs.backRatio)||Math.abs(inputs.backRatio-end)<1e-12)inputs.backRatio=direction===1?plan.min:plan.max;
 inputs.backRatio=Math.max(plan.min,Math.min(plan.max,inputs.backRatio));inputs.nozzleView='Nozzle + external waves';sweepPlaying=true;sweepPositioned=true;sweepFinished=false;sweepDelay=700;sweepAtEnd=false;renderInputs();setSweepPressure(inputs.backRatio);solve({stream:true});
}
$('sweepPlay').onclick=toggleSweep;
$('sweepRestart').onclick=()=>{stopSweep();clearTimeout(timer);sweepPositioned=true;sweepFinished=false;const p=getSweepPlan();if(p.enabled){setSweepPressure(Number($('sweepDirection').value)===1?p.min:p.max);solve({stream:true});}};
$('pressureScrub').oninput=()=>{stopSweep();clearTimeout(timer);sweepPositioned=true;sweepFinished=false;request++;setSweepPressure(Number($('pressureScrub').value));schedule(true);};
$('sweepJump').onchange=()=>{if($('sweepJump').value==='')return;const target=Number($('sweepJump').value);stopSweep();clearTimeout(timer);sweepPositioned=true;sweepFinished=false;setSweepPressure(target);solve({stream:true});};
$('sweepDirection').onchange=()=>{if(sweepPlaying){sweepAtEnd=false;clearTimeout(sweepTimer);if(!solvePending)sweepTimer=setTimeout(requestSweepFrame,100);}};
$('sweepSpeed').onchange=()=>{if(sweepPlaying&&!solvePending){clearTimeout(sweepTimer);sweepTimer=setTimeout(requestSweepFrame,100);}};
$('sweepEnable').onclick=()=>{stopSweep();inputs.outletCondition='Specified back pressure';sweepPositioned=false;sweepFinished=false;const p=getSweepPlan();if(p.enabled)inputs.backRatio=Math.min(p.max,Math.max(p.min,inputs.backRatio));renderInputs();solve();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&sweepPlaying){stopSweep();syncSweep();}});

$('guideButton').onclick=()=>location.href='./guide.html';window.addEventListener('hashchange',openLab);openLab();
