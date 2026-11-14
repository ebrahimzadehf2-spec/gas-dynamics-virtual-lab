import {state,obliqueShock,expansion,rad,deg,isentropic} from './physics.js';
import {interactionPair} from './wave-interaction.js';
import {gasInfo} from './gas-properties.js';
import {requireValue} from './numerics.js';
export const shockFanMode='Shock–expansion interaction';
export const shockFanPreset={fluid:'Air',gamma:1.4,R:287,wallShape:shockFanMode,M1:1.95,p1:482.65,inletPressureType:'Stagnation pressure',T1:300,temperatureInput:'Static temperature',fanShockAngle:10,fanExpansionAngle:10,bookExample:'6–7'};
export function solveShockFan(x){
 const gas=gasInfo(x),g=gas.gamma,R=gas.R,M=x.M1,a=x.fanShockAngle??10,b=x.fanExpansionAngle??10;
 requireValue(a>0&&b>0&&a<=30&&b<=30,'Both wall angles must be greater than zero and at most 30°.');
 const s1={...state(M,x.T1,x.p1*1000,g,R),theta:0,gamma:g,R},n=obliqueShock(M,rad(a),g),f=expansion(M,rad(b),g);
 const after=(w,theta)=>({...state(w.M2,s1.T*w.T,s1.p*w.p,g,R),theta:rad(theta),gamma:g,R});
 const s2=after(n,a),s3=after(f,b);requireValue(s2.M>1&&s3.M>1,'Both post-wave streams must remain supersonic.');
 const context={lower:s2,upper:s3},value=theta=>{const q=interactionPair(context,theta);return {q,residual:Math.log(q.a.after.p/q.b.after.p)};};
 let previous,bracket;
 for(let i=0;i<=600;i++){const theta=rad(-40+i*100/600);try{const v=value(theta);if(previous&&previous.residual*v.residual<=0){bracket=[previous.theta,theta];break;}previous={theta,...v};}catch{previous=null;}}
 requireValue(bracket,'No regular pressure-matched supersonic solution exists for these wall angles.');
 let [lo,hi]=bracket;for(let i=0;i<65;i++){const mid=(lo+hi)/2;if(value(lo).residual*value(mid).residual<=0)hi=mid;else lo=mid;}
 const phi=(lo+hi)/2,{q,residual}=value(phi),regions={1:s1,2:s2,3:s3,4:q.a.after,5:q.b.after};
 const waves=[{kind:'Oblique shock',before:s1,after:s2,beta:n.beta,title:'Incident shock · 1 → 2'},{kind:'Expansion fan',before:s1,after:s3,title:'Incident expansion · 1 → 3'},{...q.a,title:'Outgoing wave · 2 → 4'},{...q.b,title:'Outgoing wave · 3 → 5'}];
 return {gas,result:{shockFan:true,status:'ok',s1,regions,waves,gamma:g,R,slipAngle:deg(phi),residual,shockAngle:deg(n.beta)},notice:'Both wall angles and φ are measured from the horizontal. Final uniform streams are matched using shock–expansion relations; the drawing is schematic and does not resolve the internal shock–fan interaction.'};
}
export function shockFanDrawing(s,quantity='pressure'){
 const r=s.regions,key=['pressure','mach','temperature','density','speed'].includes(quantity)?quantity:'pressure',get=z=>key==='mach'?z.M:key==='temperature'?z.T:key==='density'?z.rho:key==='speed'?z.u:z.p/1000;
 const values=Object.values(r).map(get),min=Math.min(...values),max=Math.max(...values),palette=['#2536c7','#0879f5','#00c8dc','#16bf59','#efe51b','#ff9718','#ee2727'];
 const color=z=>palette[Math.min(6,Math.round(6*(get(z)-min)/(max-min||1)))],poly=(points,z)=>`<polygon points="${points}" fill="${color(z)}"/>`,text=(x,y,t)=>`<text x="${x}" y="${y}" fill="white" font-size="16">${t}</text>`;
 let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300" role="img" aria-label="Shock and expansion interaction, Example 6–7"><title>Example 6–7 · schematic final-stream matching</title>';
 svg+='<path d="M35 75H210L605 25V10H35ZM35 255H300L605 220V275H35Z" fill="#b1b7bc"/>';
 svg+=poly('35,75 210,75 380,150 300,255 35,255',r[1])+poly('300,255 380,150 605,220',r[2])+poly('210,75 605,25 445,95 380,150',r[3])+poly('380,150 605,220 605,68',r[4])+poly('380,150 445,95 605,25 605,68',r[5]);
 for(let i=0;i<=10;i++)svg+=`<line x1="210" y1="75" x2="${380+6.5*i}" y2="${150-5.5*i}" stroke="#ffffff" stroke-opacity=".4" stroke-width=".7"/>`;
 svg+='<path d="M35 75H210L605 25M35 255H300L605 220M300 255L380 150M380 150L445 95" fill="none" stroke="black" stroke-width="2"/><path d="M380 150L605 68" stroke="black" stroke-dasharray="5 4" fill="none"/>';
 svg+=text(115,160,'1')+text(365,218,'2')+text(335,86,'3')+text(535,199,'4')+text(530,125,'5')+text(55,115,`M₁ = ${r[1].M.toFixed(3)}`)+text(445,60,`θᵤ = ${(deg(r[3].theta)).toFixed(1)}°`)+text(440,235,`θₗ = ${(deg(r[2].theta)).toFixed(1)}°`);
 svg+=`<text x="35" y="292" fill="#17212b" font-size="16">φ = ${s.slipAngle.toFixed(4)}° to horizontal · schematic</text></svg>`;
 return {svg,label:'Example 6–7 · final uniform-stream matching',meta:'Schematic; internal shock–fan interaction is not spatially resolved',field:{quantity:key,options:['pressure','mach','temperature','density','speed'],label:key,min,max,units:key==='pressure'?'kPa':key==='mach'?'M':key==='temperature'?'K':key==='density'?'kg/m³':'m/s',palette}};
}
