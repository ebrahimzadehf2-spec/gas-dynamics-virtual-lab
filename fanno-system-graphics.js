import {ductProperties,ductPalette} from './duct-contours.js';
const fmt=v=>Number(v.toPrecision(5)).toString();
function tint(t){const a=Math.max(0,Math.min(1,t))*(ductPalette.length-1),i=Math.min(ductPalette.length-2,Math.floor(a)),f=a-i,rgb=h=>h.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)),p=rgb(ductPalette[i]),q=rgb(ductPalette[i+1]);return '#'+p.map((v,k)=>Math.round(v+(q[k]-v)*f).toString(16).padStart(2,'0')).join('');}
export function fannoSystemDrawing(s,inputs,quantity='pressure'){
 const r=s.system,g=r.geometry,key=quantity in ductProperties?quantity:'pressure',prop=ductProperties[key],samples=r.fullProfile,values=samples.map(z=>prop.get(z.state)),min=Math.min(...values),max=Math.max(...values),X=x=>135+610*x/g.totalLength,cy=190,areaMax=Math.max(g.area,g.area*g.contraction/g.areaRatio),H=a=>70*Math.sqrt(a/areaMax),half=H(g.area),join=X(g.ductStart),throat=X(g.throat),end=X(g.totalLength);
 const text=(x,y,t,anchor='start',size=16)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="#17383b">${t}</text>`;
 const stops=samples.map((z,i)=>`<stop offset="${100*z.x}%" stop-color="${tint(max-min<1e-12?.5:(values[i]-min)/(max-min))}"/>`).join('');
 const wall=samples.filter((z,i,a)=>!i||z.position!==a[i-1].position).map(z=>[X(z.position),H(z.area)]),top=wall.map(([x,h])=>`${x} ${cy-h}`).join('L'),bottom=[...wall].reverse().map(([x,h])=>`${x} ${cy+h}`).join('L');
 let body=`<defs><linearGradient id="fannoSystemContour" gradientUnits="userSpaceOnUse" x1="135" x2="745">${stops}</linearGradient></defs><rect width="800" height="435" fill="#f8fbf8"/><path d="M20 105H90L135 ${cy-H(samples[0].area)}V${cy+H(samples[0].area)}L90 275H20Z" fill="#e4edeb"/><path d="M135 ${cy-H(samples[0].area)}L90 105H20V275H90L135 ${cy+H(samples[0].area)}" fill="none" stroke="#41555b" stroke-width="3"/><path data-fanno-system="true" d="M${top}L${bottom}Z" fill="url(#fannoSystemContour)"/><path d="M${top}M${wall.map(([x,h])=>`${x} ${cy+h}`).join('L')}" fill="none" stroke="#41555b" stroke-width="3"/>`;
 body+=text(65,82,'Reservoir','middle',14)+text(65,314,'M = 0','middle')+text(65,340,`p₀ = ${fmt(r.reservoir.p/1000)} kPa`,'middle',14);
 body+=text((135+join)/2,103,'C–D nozzle','middle',14)+text((join+end)/2,103,'Fanno duct','middle',14);
 body+=`<path d="M${join} ${cy-half-8}V${cy+half+8}" stroke="#83999a" stroke-dasharray="4 4"/>`;
 if(r.shockX!==null){const xx=X(r.shockX),at=samples.find(z=>Math.abs(z.position-r.shockX)<1e-8),h=H(at.area);body+=`<path data-system-shock="${r.shockPart}" d="M${xx} ${cy-h}V${cy+h}" stroke="#111" stroke-width="3"/>`+text(Math.max(260,Math.min(590,xx)),55,r.regime,'middle',14);}
 else body+=text(435,55,r.regime,'middle',14);
 body+=`<path d="M${throat} ${cy-15}V${cy+15}" stroke="#4d827a" stroke-width="1" stroke-dasharray="3 3"/>`;
 if(r.massFlow>1e-12)for(const t of [.08,.3,.6,.87]){const xx=X(t*g.totalLength);body+=`<path d="M${xx-12} ${cy}h24l-6 -4m6 4l-6 4" fill="none" stroke="#40575d" stroke-width="1.5"/>`;}
 body+=text(throat,290,'Throat','middle',14)+text(join,314,`Duct inlet · M = ${fmt(r.s1.M)}`,'middle')+text(end,314,`Duct exit · M = ${fmt(r.s2.M)}`,'end');
 body+=text(join,340,`p = ${fmt(r.s1.p/1000)} kPa`,'middle')+text(end,340,`pᵦ = ${fmt(r.backPressure/1000)} kPa`,'end');
 body+=`<path d="M135 370H745" stroke="#91a3a1"/>`;
 for(const [pos,label,anchor]of [[0,'Nozzle inlet','start'],[g.ductStart,'Duct inlet','middle'],[g.totalLength,'Duct exit','end']]){const xx=X(pos);body+=`<path d="M${xx} 365V375" stroke="#91a3a1"/>`+text(xx,395,`${label} · x = ${fmt(pos)} m`,anchor,13);}
 body+=text(400,424,'Isentropic nozzle · constant friction in duct · steady one-dimensional flow','middle',13);
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 435" role="img" aria-label="Reservoir, converging-diverging nozzle and Fanno duct: ${r.regime}"><title>${r.regime}</title>${body}</svg>`,label:prop.label+' along nozzle and Fanno duct',meta:r.regime,field:{quantity:key,options:Object.keys(ductProperties),label:prop.label,units:prop.units,min,max,palette:ductPalette,note:'Isentropic nozzle · Fanno duct · normal-shock jumps'}};
}
