import {expansion,rad,deg} from './physics.js';
export const wedgeGeometry=w=>({x:165,y:150,length:Math.min(400,110/Math.tan(w.theta))});
export function wedgeDrawing(s,{txt,line,poly,fmt,quantity='pressure',color,range,arrow,incidence}){
 const w=s.wedge,options=['mach','pressure','temperature','density'],key=options.includes(quantity)?quantity:'pressure',value=z=>key==='mach'?z.M:key==='temperature'?z.T:key==='density'?z.rho:z.p,inlet={M:w.M,p:1,T:1,rho:1},values=[value(inlet),...w.faces.filter(f=>f.surface).map(f=>value(f.surface))],min=range?.min??Math.min(...values),max=range?.max??Math.max(...values),fill=z=>color((value(z)-min)/(max-min||1)),x=165,y=150,L=Math.min(400,110/Math.tan(w.theta)),at=a=>[x+L,y-L*Math.tan(a)];
 let inner='<defs><clipPath id="wedge-field"><rect x="0" y="32" width="640" height="234"/></clipPath></defs><g clip-path="url(#wedge-field)">'+poly([[0,32],[640,32],[640,266],[0,266]],fill(inlet));
 for(const f of w.faces){
  if(!f.surface){inner+=txt(360,f.sign>0?68:250,`${f.side}: ${f.kind}`,undefined,13);continue;}
  const wall=at(f.wall);let waveAngle=w.alpha+f.sign*(f.beta??Math.asin(1/w.M));
  if(f.kind==='Expansion fan'){
   const N=32;for(let j=0;j<N;j++){const t=j/N,u=(j+1)/N,z=expansion(w.M,Math.abs(f.turn)*t,w.gamma),q=expansion(w.M,Math.abs(f.turn)*u,w.gamma),a=w.alpha+f.turn*t+f.sign*Math.asin(1/z.M2),b=w.alpha+f.turn*u+f.sign*Math.asin(1/q.M2);inner+=poly([[x,y],at(a),at(b)],fill({M:z.M2,p:z.p,T:z.T,rho:z.rho}));if(j%5===0)inner+=line(x,y,...at(a),'#345c7c',.55);waveAngle=b;}
  }
  inner+=poly([[x,y],wall,at(waveAngle)],fill(f.surface));
  if(f.kind==='Oblique shock')inner+=line(x,y,...at(waveAngle),'#000',2);
  inner+=arrow(x+L*.55,y-f.sign*(L*.55*Math.tan(w.theta)+18),45,f.wall);
  inner+=txt(300,f.sign>0?52:251,`${f.side}: ${f.kind} · M = ${fmt(f.surface.M,4)}`,undefined,13);
 }
 inner+=poly([[x,y],at(w.theta),at(-w.theta)],'#d7d9d5','#283943',1.7)+txt(340,147,`θ = ${fmt(deg(w.theta))}°`,undefined,14)+incidence(32,153,rad(deg(w.alpha)),76);
 inner+='</g>';inner+=txt(18,22,'WEDGE · 2D',undefined,14);
 return {inner,label:'Wedge · upper and lower surface states',meta:'α is signed inlet-flow direction relative to the horizontal body axis · black: shocks',field:{quantity:key,options,min,max,label:{mach:'Mach number M',pressure:'Static pressure',temperature:'Static temperature',density:'Density'}[key],units:{mach:'M',pressure:'p/p∞',temperature:'T/T∞',density:'ρ/ρ∞'}[key],note:'Ratios reference the common freestream'}};
}
