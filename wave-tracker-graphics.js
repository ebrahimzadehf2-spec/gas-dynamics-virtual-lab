import {channelOrdinate} from './wave-channel.js';
import {trackingProfile} from './wave-tracker.js';
import {cornerContourColor,cornerPalette} from './corner-graphics.js';
export function trackingCoordinates(s){
 const g=s.geometry,end=g.end,start=-.12*end,xs=[0,end,...g.lower.points.map(p=>p.x),...g.upper.points.map(p=>p.x)].filter(x=>x<=end+1e-9),ys=xs.flatMap(x=>[channelOrdinate(g.lower,x),channelOrdinate(g.upper,x)]),lo=Math.min(...ys),hi=Math.max(...ys),scale=Math.min(560/(end-start),170/Math.max(hi-lo,.1*end));
 return {end,start,lo,hi,scale,X:x=>320+(x-(start+end)/2)*scale,Y:y=>145+((lo+hi)/2-y)*scale};
}
export function probeTracking(s,px,py){
 const c=trackingCoordinates(s),x=(px-320)/c.scale+(c.start+c.end)/2,y=(145-py)/c.scale+(c.lo+c.hi)/2;
 if(x<0||x>s.tracking.endX)return null;
 const p=trackingProfile(s,x/s.geometry.end);if(!p||y<p.ys[0]||y>p.ys.at(-1))return null;
 const i=p.ys.findIndex((v,i)=>i>0&&y<=v);return {x,y,...p.states[Math.max(0,i-1)]};
}
export function trackingDrawing(s,{txt,line,poly,fmt,range=null,quantity='mach'}){
 const {X,Y,end,start}=trackingCoordinates(s),g=s.geometry,t=s.tracking,options=['mach','pressure','temperature','density','speed'],key=options.includes(quantity)?quantity:'mach',value=z=>key==='mach'?z.M:key==='temperature'?z.T:key==='density'?z.rho:key==='speed'?z.u:z.p/1000,label={mach:'Mach number',pressure:'Static pressure',temperature:'Static temperature',density:'Density',speed:'Flow speed'}[key],units={mach:'M',pressure:'kPa',temperature:'K',density:'kg/m³',speed:'m/s'}[key];
 let min=Infinity,max=-Infinity;for(const slab of t.slabs)for(const z of slab.states){const v=value(z);min=Math.min(min,v);max=Math.max(max,v);}if(!Number.isFinite(min))min=max=value(s.s1);
 if(range){min=range.min;max=range.max;}
 const color=v=>cornerContourColor(max-min<1e-10?.5:(v-min)/(max-min)),boundary=(wall,initial)=>[{x:start,y:initial},...wall.points.filter(p=>p.x<end-1e-9),{x:end,y:channelOrdinate(wall,end)}],lower=boundary(g.lower,0),upper=boundary(g.upper,g.height),V=p=>[X(p.x),Y(p.y)],point=(x,y)=>`${Number(X(x).toFixed(3))},${Number(Y(y).toFixed(3))}`;
 let inner='<rect width="640" height="300" fill="#fcfdfc"/>'+txt(24,27,'SHOCK–EXPANSION','#263c4d',14)+txt(616,27,t.hasFanApproximation?`Fan width ≤ ${fmt(t.step,3)}°`:'Direct jump relations','#53616b',12,'end');
 inner+=poly([...lower.map(V),[X(end),246],[X(start),246]],'#edf0f2')+poly([...upper.map(V),[X(end),43],[X(start),43]],'#edf0f2');
 inner+='<defs><clipPath id="tracking-domain">'+poly([...lower.map(V),...upper.slice().reverse().map(V)],'#fff')+'</clipPath></defs><g clip-path="url(#tracking-domain)">';
 inner+=poly([[X(start),Y(0)],[X(0),Y(0)],[X(0),Y(g.height)],[X(start),Y(g.height)]],color(value(s.s1)));
 const paths=new Map();for(const slab of t.slabs)for(let i=0;i<slab.states.length;i++){
  const bucket=Math.round((max-min<1e-10?.5:(value(slab.states[i])-min)/(max-min))*255),d=`M${point(slab.left,slab.bottoms[i])}L${point(slab.right,slab.tops[i])}L${point(slab.right,slab.tops[i+1])}L${point(slab.left,slab.bottoms[i+1])}Z`;
  paths.set(bucket,(paths.get(bucket)??'')+d);
 }
 for(const [bucket,d]of paths)inner+=`<path d="${d}" fill="${cornerContourColor(bucket/255)}" shape-rendering="crispEdges"/>`;
 for(const kind of ['Expansion front','Slip line','Oblique shock']){
  const d=t.traces.filter(f=>f.kind===kind).map(f=>`M${point(f.origin.x,f.origin.y)}L${point(f.end.x,f.end.y)}`).join('');
  if(d)inner+=`<path d="${d}" fill="none" stroke="${kind==='Oblique shock'?'#000000':kind==='Slip line'?'#273746':'#35638d'}" stroke-width="${kind==='Oblique shock'?1.35:kind==='Slip line'?.8:.45}" ${kind==='Slip line'?'stroke-dasharray="4 3"':''} stroke-opacity="${kind==='Expansion front'?.48:1}"/>`;
 }
 for(const fraction of [.15,.45,.75,.97]){const p=trackingProfile(s,fraction*t.endX/end);if(!p)continue;for(const eta of [.2,.5,.8]){
  const y=p.ys[0]+eta*(p.ys.at(-1)-p.ys[0]),z=p.states[Math.max(0,p.ys.findIndex((v,i)=>i>0&&y<=v)-1)],a=z.theta,dx=Math.cos(a),dy=-Math.sin(a),cx=X(p.x),cy=Y(y),c='#172f45';
  inner+=`<g data-flow-angle="${a*180/Math.PI}">`+line(cx-9*dx,cy-9*dy,cx+9*dx,cy+9*dy,c,1)+poly([[cx+9*dx,cy+9*dy],[cx+4*dx-2*dy,cy+4*dy+2*dx],[cx+4*dx+2*dy,cy+4*dy-2*dx]],c)+'</g>';
 }}
 if(t.endX<end-1e-8)inner+=`<rect x="${X(t.endX)}" y="40" width="${Math.max(0,X(end)-X(t.endX))}" height="210" fill="#fff" opacity=".88"/>`;
 const event=t.events.find(e=>e.index===s.selectedTrackingEvent);if(event){inner+=`<circle cx="${X(event.x)}" cy="${Y(event.y)}" r="4" fill="white" stroke="#000" stroke-width="1.4"/>`+txt(X(event.x)+7,Y(event.y)-8,`E${event.index}`,'#17212b',12);}
 inner+='</g>';
 for(const wall of [lower,upper])for(let i=0;i<wall.length-1;i++)inner+=line(...V(wall[i]),...V(wall[i+1]),'#111',1.6);
 if(s.limitX!==null)inner+=line(X(t.endX),43,X(t.endX),246,'#8e6d42',1,'4 4');
 inner+=txt(24,269,`Solved x = ${fmt(t.endX,5)} / ${fmt(end,5)} m`,'#53616b',12)+txt(616,269,'Black: shocks · dashed: slip lines','#53616b',12,'end')+txt(24,292,t.hasFanApproximation?'Direct relations + approximate fan interactions':'Direct shock relations · inspect events below','#53616b',12);
 return {inner,label:'Attached shocks, expansion fronts and slip-line interactions',meta:'Event-driven wave tracking · finite expansion fronts · no detached or subsonic continuation',field:{quantity:key,options,label,min,max,units,note:t.hasFanApproximation?'Direct relations + finite-fan approximation':'Direct shock–expansion states',palette:cornerPalette}};
}
