import {linspace,prandtlMeyer,deg} from './physics.js';
export const cornerPalette=['#2536c7','#0879f5','#00c8dc','#16bf59','#efe51b','#ff9718','#ee2727'];
export function cornerContourColor(t){const v=Math.max(0,Math.min(1,t))*(cornerPalette.length-1),i=Math.min(cornerPalette.length-2,Math.floor(v)),f=v-i;const a=cornerPalette[i].match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)),b=cornerPalette[i+1].match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));return '#'+a.map((v,k)=>Math.round(v+(b[k]-v)*f).toString(16).padStart(2,'0')).join('');}
// A flow-aligned local corner: horizontal approach wall, one ramp, no vertical face.
export function cornerDrawing(s,inputs,{txt,line,poly,shade,fmt}){
 const shock=s.kind==='oblique',turn=s.theta,angle=shock?turn:-turn;
 const colored=inputs.cornerView!=='Textbook schematic',g=inputs.gamma??1.4;
 const x=245,y=shock?242:154,L=Math.min(365,(shock?140:105)/Math.max(1e-12,Math.abs(Math.tan(angle)))),right=x+L;
 const wallY=y-L*Math.tan(angle),domain=[[20,52],[right,52],[right,wallY],[x,y],[20,y]];
 const end=a=>{const dx=Math.cos(a),dy=-Math.sin(a),times=[];if(dx>1e-12)times.push((right-x)/dx);if(dy< -1e-12)times.push((52-y)/dy);if(dy>1e-12)times.push((292-y)/dy);const t=Math.min(...times.filter(t=>t>=0));return [x+t*dx,y+t*dy];};
 const region=(cx,cy,n)=>!shock?txt(cx,cy+5,n,colored?'#ffffff':'#17212b',17,'middle'):`<circle cx="${cx}" cy="${cy}" r="11" fill="${colored?'#ffffff':'#f8fbf6'}" stroke="#263c4d" stroke-width="1.1"/>`+txt(cx,cy+5,n,'#17212b',15,'middle');
 const arc=(a,b,r,label)=>{if(Math.abs(b-a)<1e-7)return '';const points=linspace(a,b,28).map(t=>[x+r*Math.cos(t),y-r*Math.sin(t)]),mid=(a+b)/2;return `<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#315c82" stroke-width="1"/>`+txt(x+(r+10)*Math.cos(mid),y-(r+10)*Math.sin(mid)+4,label,'#315c82',14,'middle');};
 let inner=`<defs><clipPath id="cornerGas"><polygon points="${domain.map(p=>p.join(',')).join(' ')}"/></clipPath></defs>`;
 inner+=`<g clip-path="url(#cornerGas)" data-corner-fluid="true">`;
 if(colored)inner+=poly(domain,shade(inputs._cornerUp));
 const streamlineColor='#376451';
 // Arrowheads follow the local tangent of each analytical streamline.
 const arrows=points=>{let out='';const lengths=points.slice(1).map((b,i)=>Math.hypot(b[0]-points[i][0],b[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);for(const fraction of [.23,.78]){let distance=total*fraction;for(let i=0;i<lengths.length;i++){const length=lengths[i];if(distance>length){distance-=length;continue;}if(length<1e-9)continue;const a=points[i],b=points[i+1],dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length,cx=a[0]+dx*distance,cy=a[1]+dy*distance;out+=`<polygon data-stream-arrow="true" points="${cx+4*dx},${cy+4*dy} ${cx-4*dx-2.8*dy},${cy-4*dy+2.8*dx} ${cx-4*dx+2.8*dy},${cy-4*dy-2.8*dx}" fill="${streamlineColor}"/>`;break;}}return out;};
 let waveMarkup='';
 if(shock){
  const e=end(s.beta),m=Math.tan(s.beta);
  if(colored)inner+=poly([[x,y],e,[right,e[1]],[right,wallY]],shade(inputs._cornerDown));
  for(const h of [24,49,74,99,124,149]){
   const yy=y-h,xs=m>1e-12?x+h/m:Infinity;
   const points=xs<right?[[20,yy],[xs,yy],[right,yy-(right-xs)*Math.tan(turn)]]:[[20,yy],[right,yy]];
   inner+=`<polyline data-streamline="shock" points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${streamlineColor}" stroke-width="1.15"/>`+arrows(points);
  }
  waveMarkup=line(x,y,...e,'#000000',2.2);
 }else{
  const samples=linspace(s.M,s.M2,49).map(M=>{const omega=prandtlMeyer(M,g)-s.nu1;return {M,omega,phi:Math.asin(1/M)-omega};});
  let previous=null;
  if(colored){for(const z of samples){const e=end(z.phi);if(previous){const tr=(1+(g-1)*s.M*s.M/2)/(1+(g-1)*z.M*z.M/2),value=inputs._cornerQuantity==='mach'?z.M:inputs._cornerQuantity==='temperature'?tr:inputs._cornerQuantity==='density'?tr**(1/(g-1)):inputs._cornerQuantity==='speed'?(z.M/s.M)*Math.sqrt(tr):tr**(g/(g-1));inner+=poly([[x,y],previous,e],shade(value));}previous=e;}const tail=end(samples.at(-1).phi);inner+=poly([[x,y],tail,[right,tail[1]],[right,wallY]],shade(inputs._cornerQuantity==='mach'?s.M2:inputs._cornerQuantity==='temperature'?s.T:inputs._cornerQuantity==='density'?s.rho:inputs._cornerQuantity==='speed'?(s.M2/s.M)*Math.sqrt(s.T):s.p));}
  for(const h of [22,45,68,91,114]){
   const radius=h/Math.sin(samples[0].phi),points=[[20,y-h]];
   for(const z of samples){const ratio=((1+(g-1)*z.M*z.M/2)/(1+(g-1)*s.M*s.M/2))**((g+1)/(2*(g-1))),r=radius*ratio;points.push([x+r*Math.cos(z.phi),y-r*Math.sin(z.phi)]);}
   const last=points.at(-1);if(last[0]<right)points.push([right,last[1]+(right-last[0])*Math.tan(turn)]);
   inner+=`<polyline data-streamline="expansion" points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${streamlineColor}" stroke-width="1.15"/>`+arrows(points);
  }
  for(const omega of linspace(0,turn,10)){
   // Interpolation here selects a drawn ray; state contours use analytical samples.
   const z=samples.reduce((a,b)=>Math.abs(a.omega-omega)<Math.abs(b.omega-omega)?a:b);waveMarkup+=line(x,y,...end(z.phi),'#2563aa',omega===0||omega===turn?1.6:.85);
  }
 }
 inner+=waveMarkup+'</g>';
 // The wall is a polyline with short solid-side hatching, never a filled block.
 inner+=`<polyline data-corner-wall="true" points="20,${y} ${x},${y} ${right},${wallY}" fill="none" stroke="#263c4d" stroke-width="2.2"/>`;
 const hatch=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;let h='';for(let d=8;d<length;d+=13){const xx=a[0]+dx*d/length,yy=a[1]+dy*d/length;h+=line(xx,yy,xx-4*dx/length+7*nx,yy-4*dy/length+7*ny,'#8895a0',.8);}return h;};
 inner+=hatch([20,y],[x,y])+hatch([x,y],[right,wallY])+line(x,y,Math.min(right,x+145),y,'#8b99a5',.8,'3 4')+txt(x,y+22,'A','#263c4d',14,'middle');
 inner+=arc(0,angle,30,'θ');
 if(shock)inner+=arc(0,s.beta,65,'β');else{inner+=arc(0,Math.asin(1/s.M),55,'μ₁')+arc(-turn,Math.asin(1/s.M2)-turn,85,'μ₂');}
 if(!shock)inner+=txt(300,28,`μ₁ = ${fmt(deg(Math.asin(1/s.M)),4)}°`,'#263c4d',15,'middle')+txt(490,28,`μ₂ = ${fmt(deg(Math.asin(1/s.M2)),4)}°`,'#263c4d',15,'middle');
 inner+=region(123,shock?155:115,'1');
 const r2x=x+.78*L,wally=y-(r2x-x)*Math.tan(angle),wavey=shock?Math.max(55,y-(r2x-x)*Math.tan(s.beta)):y-(r2x-x)*Math.tan(Math.asin(1/s.M2)-turn);
 inner+=region(r2x,(wally+Math.max(55,wavey))/2,'2');
 // Horizontal incident flow is the chapter 6 angular reference.
 const ix=40,iy=shock?77:70;
 inner+=`<g data-view-frame="flow-aligned"><g data-flow-angle="0">${line(ix,iy,ix+58,iy,'#344e61',1.8)}${poly([[ix+58,iy],[ix+50,iy-4],[ix+50,iy+4]],'#344e61')}</g>${txt(ix+67,iy+5,`M₁ = ${fmt(s.M,4)}`,'#263c4d',15)}`;
 inner+='</g>';
 return {inner,label:shock?'Oblique shock · horizontal surface and compression ramp':'Prandtl–Meyer fan · horizontal surface and opening corner',meta:'Flow-aligned view · angles to scale · analytical streamlines'};
}
