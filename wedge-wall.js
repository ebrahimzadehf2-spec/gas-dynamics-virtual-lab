import {obliqueShock,shockLimit,rad,deg} from './physics.js';
import {requireValue} from './numerics.js';
import {clipPolygon} from './wave-interaction.js';
import {cornerPalette,cornerContourColor} from './corner-graphics.js?v=20261113-rainbow-physical';
import {pointInPolygon,regionLabelPosition} from './region-labels.js';
export const nearbyWalls=['None','Below wedge','Above wedge'];
export function solveWedgeWall(x,w){
 const mirror=x.nearbyWall==='Above wedge',s=mirror?-1:1,H=x.wallDistance??1,t=w.theta,face=w.faces[mirror?0:1],other=w.faces[mirror?1:0];
 requireValue(nearbyWalls.slice(1).includes(x.nearbyWall)&&Number.isFinite(H)&&H>0,'Choose a wall above or below the wedge and a positive tip-to-wall distance.');
 requireValue(w.faces.every(f=>f.status==='ok'&&f.kind==='Oblique shock'),'The nearby-wall model requires attached compression shocks on both wedge faces. Expansion-side and detached configurations are outside this model.');
 const before=face.surface;requireValue(before.M>1&&t<=shockLimit(before.M,w.gamma).theta,'No attached regular reflected shock can turn the wall-side flow parallel to the wall. Mach reflection is outside this model.','reflection-limit');
 const shock=obliqueShock(before.M,t,w.gamma),after={M:shock.M2,p:before.p*shock.p,T:before.T*shock.T,rho:before.rho*shock.rho,p0:before.p0*shock.p0,theta:0};after.u=after.M/w.M*Math.sqrt(after.T);
 const alpha=s*w.alpha,mi=Math.tan(alpha-face.beta),mo=Math.tan(alpha+other.beta),mt=Math.tan(t),mr=Math.tan(shock.beta-t),hit=-H/mi,next=(mr*hit+H)/(mr+mt),end=hit+.58*(next-hit),start=-.25*H,top=Math.max(.8*H,mo*end+.2*H);
 requireValue(mi<0&&mr>0&&hit>0&&end>hit&&end*mt<H,'This geometry has no downstream reflection segment before a body encounter.');
 const lower=[[start,-H],[end,-H],[end,-end*mt],[0,0],[start,0]],upper=[[start,0],[0,0],[end,end*mt],[end,top],[start,top]],inc=p=>p[1]-mi*p[0],ref=p=>p[1]+H-mr*(p[0]-hit),opp=p=>p[1]-mo*p[0],inlet={M:w.M,p:1,T:1,rho:1,p0:1,u:1,theta:w.alpha};
 const regions={1:inlet,2:before,3:after,4:other.surface},cells=[{n:1,poly:clipPolygon(lower,p=>-inc(p))},{n:1,poly:clipPolygon(upper,opp)},{n:2,poly:clipPolygon(clipPolygon(lower,inc),ref)},{n:3,poly:clipPolygon(lower,p=>-ref(p))},{n:4,poly:clipPolygon(upper,p=>-opp(p))}];
 return {mirror,H,t,alpha,mi,mo,mt,mr,hit,next,end,start,top,regions,cells,shock,face,other};
}
export function wedgeWallPlots(r){const q=r.wallReflection,z=q.regions,plots=[{key:'wedge-wall-p-theta',label:'Pressure–deflection diagram',note:'Signed absolute flow directions. Region 3 is parallel to the reflecting wall.',chart:{title:'Wedge and reflected shock · pressure–deflection',xlabel:'Flow direction θ (°)',ylabel:'p/p∞',zeroBaseline:false,series:[{name:'Wall side · 1 → 2 → 3',points:[1,2,3].map(n=>[deg(z[n].theta),z[n].p])},{name:'Opposite face · 1 → 4',points:[1,4].map(n=>[deg(z[n].theta),z[n].p])}],markers:[1,2,3,4].map(n=>({name:String(n),x:deg(z[n].theta),y:z[n].p}))}}];
 for(const [key,label,unit,get]of [['M','Mach number','M',s=>s.M],['p','Pressure ratio','p/p∞',s=>s.p],['T','Temperature ratio','T/T∞',s=>s.T],['p0','Stagnation-pressure recovery','p₀/p₀∞',s=>s.p0]])plots.push({key:'wedge-wall-'+key,label,chart:{title:label+' by region',xlabel:'Region number',ylabel:unit,zeroBaseline:false,series:[{name:label,points:[1,2,3,4].map(n=>[n,get(z[n])])}]}});return plots;}
export function wedgeWallView(q){const scale=Math.min(550/(q.end-q.start),240/(q.H+q.top)),ox=40-q.start*scale,oy=55+(q.mirror?q.H:q.top)*scale;return {scale,ox,oy,width:80+(q.end-q.start)*scale,V:([x,y])=>[ox+x*scale,oy-(q.mirror?-y:y)*scale]};}
export function probeWedgeWall(r,x,y){const q=r.wallReflection,{scale,ox,oy}=wedgeWallView(q),p=[(x-ox)/scale,(oy-y)/scale*(q.mirror?-1:1)],c=q.cells.find(c=>pointInPolygon(p,c.poly));if(!c)return null;const z=q.regions[c.n],free=r.freestream;return {...z,x:p[0],y:q.mirror?-p[1]:p[1],region:c.n,p:z.p*free.p,T:z.T*free.T,rho:z.rho*free.rho,u:z.u*free.u};}
export function wedgeWallDrawing(r,x,quantity='pressure'){
 const q=r.wallReflection,{V,scale,width}=wedgeWallView(q),defs={pressure:['Static pressure','p/p∞',s=>s.p],mach:['Mach number','M',s=>s.M],temperature:['Static temperature','T/T∞',s=>s.T],density:['Density','ρ/ρ∞',s=>s.rho]},key=defs[quantity]?quantity:'pressure',[label,units,get]=defs[key],vals=Object.values(q.regions).map(get),min=Math.min(...vals),max=Math.max(...vals),poly=(p,fill)=>`<polygon points="${p.map(V).map(p=>p.join(',')).join(' ')}" fill="${fill}"/>`,line=(a,b,c='#000000',width=2)=>`<line x1="${V(a)[0]}" y1="${V(a)[1]}" x2="${V(b)[0]}" y2="${V(b)[1]}" stroke="${c}" stroke-width="${width}"/>`,text=(p,t,color='white',size=17)=>`<text x="${p[0]}" y="${p[1]}" fill="${color}" font-size="${size}" text-anchor="middle">${t}</text>`;
 let inner='';for(const c of q.cells)inner+=poly(c.poly,cornerContourColor((get(q.regions[c.n])-min)/(max-min||1)));
 inner+=poly([[0,0],[q.end,q.end*q.mt],[q.end,-q.end*q.mt]],'#d5b488')+line([0,0],[q.end,q.end*q.mt],'#4c5964')+line([0,0],[q.end,-q.end*q.mt],'#4c5964');
 inner+=poly([[q.start,-q.H],[q.end,-q.H],[q.end,-q.H-16/scale],[q.start,-q.H-16/scale]],'#a8adb3')+line([q.start,-q.H],[q.end,-q.H],'#4c5964',3);
 inner+=line([0,0],[q.hit,-q.H])+line([q.hit,-q.H],[q.end,-q.H+q.mr*(q.end-q.hit)])+line([0,0],[q.end,q.end*q.mo]);
 for(const n of [1,2,3,4]){const p=regionLabelPosition(q.cells.filter(c=>c.n===n).map(c=>c.poly.map(V)))?.point;if(p)inner+=text(p,String(n),'white',15)+(n===1?text([p[0],p[1]+22],`M∞ = ${x.M}`,'white',13):'');}
 inner+=text(V([q.end*.72,0]),`2θ = ${2*x.thetaCone}°`,'#17212b',15);
 const wall=V([(q.start+q.end)/2,-q.H]);inner+=text([wall[0],wall[1]+(q.mirror?-6:14)],`Wall · h = ${x.wallDistance} m`,'white',14);
 return {svg:`<svg xmlns="http://www.w3.org/2000/svg" data-wedge-wall="true" viewBox="0 32 ${width} 295" role="img" aria-label="Complete wedge with two incident shocks and one wall reflection">${inner}</svg>`,label:'Wedge · both faces and regular wall reflection',meta:'Regions 1–4 · horizontal reflecting wall',field:{quantity:key,label,units,min,max,options:Object.keys(defs),palette:cornerPalette,note:'Uniform analytical regions · freestream ratios'}};
}
