import {solveShockExpansionChannel} from './channel-solver.js';
import {solveChannelMOC,mocState} from './channel-moc.js';
import {fittedState} from './channel-moc-shocks.js';
import {trackingProfile} from './wave-tracker.js';
import {channelOrdinate} from './wave-channel.js';
export const comparisonProperties=[['mach','Mach number','',s=>s.M],['pressure','Static pressure','kPa',s=>s.p/1000],['temperature','Static temperature','K',s=>s.T],['density','Density','kg/m³',s=>s.rho],['speed','Flow speed','m/s',s=>s.u],['angle','Flow angle','°',s=>s.theta*180/Math.PI],['stagnation','Stagnation pressure','kPa',s=>s.p0/1000]];
const mix=(a,b,f)=>a+(b-a)*f;
function transverse(a,t){const q=Math.max(0,Math.min(a.length-1,t*(a.length-1))),i=Math.min(a.length-2,Math.floor(q)),f=q-i;return {a:a[i],b:a[i+1],f};}
export function sampleMOC(r,x,y){
 const rows=r.moc?.rows;if(!rows?.length||x<0||x>rows.at(-1).x+1e-9)return null;
 let i=0;while(i+1<rows.length&&rows[i+1].x<=x+1e-12)i++;
 const a=rows[i],b=rows[Math.min(i+1,rows.length-1)],f=b.x>a.x?(x-a.x)/(b.x-a.x):0;
 if(r.moc.fitted){
  // Interpolate within matching shock-bounded strips, never across the jump.
  const j=a.parts.findIndex((p,j)=>{const q=b.parts[j]??p;return y>=mix(p.lo,q.lo,f)-1e-9&&y<=mix(p.hi,q.hi,f)+1e-9;});if(j<0)return null;
  const p=a.parts[j],q=b.parts[j];if(!q)return null;
  const lo=mix(p.lo,q.lo,f),hi=mix(p.hi,q.hi,f),t=(y-lo)/(hi-lo),A=transverse(p.z,t),B=transverse(q.z,t),z={};
  for(const k of ['l','k','theta'])z[k]=mix(mix(A.a[k],A.b[k],A.f),mix(B.a[k],B.b[k],B.f),f);
  return fittedState(r,z);
 }
 const t=(y-mix(a.lower,b.lower,f))/(mix(a.upper,b.upper,f)-mix(a.lower,b.lower,f)),A=transverse(a.M,t),B=transverse(b.M,t),M=mix(mix(A.a,A.b,A.f),mix(B.a,B.b,B.f),f),C=transverse(a.theta,t),D=transverse(b.theta,t),theta=mix(mix(C.a,C.b,C.f),mix(D.a,D.b,D.f),f);
 return mocState(r,{M:[M],theta:[theta]},0);
}
export function comparisonProfile(r,fraction=1){
 const c=r.comparison;if(!(c.end>0))return null;
 const requested=r.geometry.end*Math.max(0,Math.min(1,fraction??1)),x=Math.min(requested,c.end),lo=channelOrdinate(r.geometry.lower,x),hi=channelOrdinate(r.geometry.upper,x),p=trackingProfile(c.se,x/r.geometry.end),samples=[];
 for(let i=0;i<101;i++){const y=lo+(hi-lo)*(i+.5)/101,j=p.ys.findIndex((v,j)=>j>0&&y<=v),se=p.states[Math.max(0,j-1)],moc=sampleMOC(c.moc,x,y);if(se&&moc)samples.push({y,se,moc});}
 return {x,requested,clipped:requested>x+1e-9,samples};
}
export function solveChannelComparison(x){
 const run=fn=>{try{return {result:fn(x)};}catch(e){return {error:e.message};}},a=run(solveShockExpansionChannel),b=run(solveChannelMOC),base=a.result??b.result;if(!base)throw new Error(a.error??b.error);
 const end=Math.min(a.result?.tracking?.endX??0,b.result?.moc?.rows?.at(-1)?.x??0),comparison={se:a.result,moc:b.result,seError:a.error,mocError:b.error,end};
 const r={geometry:base.geometry,s1:base.s1,gamma:base.gamma,R:base.R,channel:true,channelMethod:'Compare both',regions:{},waves:[],panels:[],limitX:null,comparison,status:end>0?(end<base.geometry.end-1e-8?'partial':'ok'):'unsupported'};
 r.reason=end>0?'Differences compare the same physical points within the common accepted domain. They are method differences, not an absolute error estimate. Refine both methods to check sensitivity.':'No common accepted downstream field. Quantitative comparison is unavailable.';
 return r;
}
export function comparisonPlots(r,fraction){const p=comparisonProfile(r,fraction);if(!p?.samples.length)return [];return comparisonProperties.map(([key,label,unit,get])=>({key:'compare-'+key,label,chart:{title:label+' · both methods',xlabel:'Height y (m)',ylabel:unit||'M',zeroBaseline:false,series:['se','moc'].map((name,i)=>({name:i?'Method of characteristics':'Shock–Expansion',dash:i?'6 3':'',points:p.samples.map(z=>[z.y,get(z[name])])}))}}));}
export function comparisonHTML(r,fraction,fmt){const c=r.comparison,p=comparisonProfile(r,fraction),status=(z,e)=>e??(z?`${z.status}: ${z.reason??'Accepted field'}`:'Unavailable');let html=`<p><strong>Shock–Expansion:</strong> ${status(c.se,c.seError)}</p><p><strong>Method of characteristics:</strong> ${status(c.moc,c.mocError)}</p>`;if(!p?.samples.length)return html;
 html+=`<p>Common domain: 0 ≤ x ≤ ${fmt(c.end)} m. Compared section: x = ${fmt(p.x)} m${p.clipped?` (requested ${fmt(p.requested)} m; limited to common domain)`:''}. Δ = MOC − Shock–Expansion.</p><div class="region-table-scroll"><table class="region-table"><thead><tr><th>Property</th><th>Mean |Δ|</th><th>Maximum |Δ|</th></tr></thead><tbody>`;
 for(const [,label,unit,get]of comparisonProperties){const ds=p.samples.map(z=>Math.abs(get(z.moc)-get(z.se)));html+=`<tr><th>${label} ${unit}</th><td>${fmt(ds.reduce((a,b)=>a+b,0)/ds.length)}</td><td>${fmt(Math.max(...ds))}</td></tr>`;}
 html+='</tbody></table></div><details><summary>Properties at common sample points</summary><div class="region-table-scroll"><table class="region-table"><thead><tr><th>y (m)</th><th>Property</th><th>Shock–Expansion</th><th>MOC</th><th>Δ</th></tr></thead><tbody>';
 for(const z of p.samples.filter((_,i)=>i%12===2))for(const [,label,unit,get]of comparisonProperties)html+=`<tr><td>${fmt(z.y)}</td><th>${label} ${unit}</th><td>${fmt(get(z.se))}</td><td>${fmt(get(z.moc))}</td><td>${fmt(get(z.moc)-get(z.se))}</td></tr>`;
 html+='</tbody></table></div></details><details><summary>Wall reflections · accepted locations</summary><div class="region-table-scroll"><table class="region-table"><thead><tr><th>Method</th><th>Wall</th><th>x (m)</th><th>y (m)</th></tr></thead><tbody>';
 for(const [name,events]of [['Shock–Expansion',c.se?.tracking?.events??[]],['MOC',c.moc?.moc?.events??[]]])for(const e of events.filter(e=>e.type==='Wall reflection'))html+=`<tr><th>${name}</th><td>${e.side??'—'}</td><td>${fmt(e.x)}</td><td>${fmt(e.y)}</td></tr>`;
 return html+'</tbody></table></div></details>';
}

export function comparisonExportRows(r,fraction){const p=comparisonProfile(r,fraction);if(!p)return [];return [{label:'Compared section x',value:p.x,unit:'m',panel:'comparison'},...p.samples.flatMap(z=>comparisonProperties.flatMap(([,label,unit,get])=>[{label:`y=${z.y} · Shock–Expansion · ${label}`,value:get(z.se),unit,panel:'comparison'},{label:`y=${z.y} · MOC · ${label}`,value:get(z.moc),unit,panel:'comparison'},{label:`y=${z.y} · MOC − SE · ${label}`,value:get(z.moc)-get(z.se),unit,panel:'comparison'}]))];}
