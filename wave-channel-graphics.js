import {mocDrawing} from './channel-moc-graphics.js?v=20261109-wedge-cone';
import {channelOrdinate} from './wave-channel.js';
import {cornerContourColor,cornerPalette} from './corner-graphics.js';
export function channelDrawing(s,{txt,line,poly,fmt,quantity,range,showCharacteristics}){
 if(s.moc?.rows.length)return mocDrawing(s,{txt,line,poly,fmt,quantity,range,showCharacteristics});
 const g=s.geometry,L=g.end,start=-.18*L,heights=[0,L,...g.lower.points.map(p=>p.x),...g.upper.points.map(p=>p.x)].filter(x=>x<=L+1e-10).flatMap(x=>[channelOrdinate(g.lower,x),channelOrdinate(g.upper,x)]),lo=Math.min(...heights),hi=Math.max(...heights),scale=Math.min(560/(L-start),160/Math.max(hi-lo,.12*L));
 const X=x=>320+(x-(L+start)/2)*scale,Y=y=>145+((lo+hi)/2-y)*scale,V=p=>[X(p.x),Y(p.y)];
 const vals=Object.values(s.regions).map(z=>z.p/1000),min=Math.min(...vals),max=Math.max(...vals),color=p=>cornerContourColor(max-min<1e-10?.5:(p/1000-min)/(max-min));
 let inner='<rect width="640" height="300" fill="#fcfdfc"/><defs><clipPath id="channel-view"><rect x="24" y="43" width="592" height="203"/></clipPath></defs>';
 inner+=txt(24,27,'CUSTOM CHANNEL','#263c4d',14)+txt(616,27,`Inlet height = ${fmt(g.height,4)} m`,'#53616b',13,'end');
 const boundary=(wall,side)=>[{x:start,y:side==='L'?0:g.height},...wall.points.filter(p=>p.x<L-1e-9),{x:L,y:channelOrdinate(wall,L)}];
 const lower=boundary(g.lower,'L'),upper=boundary(g.upper,'U');
 inner+='<g clip-path="url(#channel-view)" stroke-linecap="round" stroke-linejoin="round">';
 inner+=poly([...lower.map(V),[X(L),246],[X(start),246]],'#edf0f2')+poly([...upper.map(V),[X(L),43],[X(start),43]],'#edf0f2');
 // Wave rays terminate at the first unresolved event and stay inside the channel.
 inner+='<defs><clipPath id="channel-fluid">'+poly([...lower.map(V),...upper.slice().reverse().map(V)],'#fff')+'</clipPath></defs><g clip-path="url(#channel-fluid)">';
 for(const w of s.waves)for(const [i,a]of w.rays.entries()){
  const stop=Math.min(g.end,s.limitX??Infinity,w.origin.x+.45*L*Math.cos(a)),p={x:stop,y:w.origin.y+(stop-w.origin.x)*Math.tan(a)};
  inner+=line(...V(w.origin),...V(p),w.kind==='Oblique shock'?'#000000':i===0||i===w.rays.length-1?'#477caa':'#91b2cd',w.kind==='Oblique shock'?1.35:.7);
 }
 inner+='</g>';
 for(const boundaryPoints of [lower,upper])for(let i=0;i<boundaryPoints.length-1;i++)inner+=line(...V(boundaryPoints[i]),...V(boundaryPoints[i+1]),'#17212b',1.8);
 for(const p of s.panels){const stop=Math.min(p.b.x,L,s.limitX??Infinity),q={x:stop,y:p.a.y+(stop-p.a.x)*Math.tan(p.theta)};inner+=line(...V(p.a),...V(q),color(p.state.p),2.3);const mx=(p.a.x+q.x)/2,my=(p.a.y+q.y)/2,side=p.wall==='L'?1:-1,px=X(mx)-Math.sin(p.theta)*side*20,py=Y(my)-Math.cos(p.theta)*side*20;
  inner+=txt(px,py+4,p.id,'#263c4d',13,'middle');
  const cx=X(mx)-Math.sin(p.theta)*side*35,cy=Y(my)-Math.cos(p.theta)*side*35,dx=Math.cos(p.theta),dy=-Math.sin(p.theta);
  inner+=line(cx-10*dx,cy-10*dy,cx+10*dx,cy+10*dy,'#536977',1)+poly([[cx+10*dx,cy+10*dy],[cx+5*dx-2*dy,cy+5*dy+2*dx],[cx+5*dx+2*dy,cy+5*dy-2*dx]],'#536977');
 }
 const y=Y(g.height/2),xx=X(start+.02*L);inner+=line(xx,y,xx+32,y,'#536977',1.4)+poly([[xx+32,y],[xx+26,y-3],[xx+26,y+3]],'#536977')+txt(xx+16,y-12,'1','#263c4d',14,'middle');
 if(s.limitX!==null){const xx=X(s.limitX);inner+=`<rect x="${xx}" y="43" width="${Math.max(0,X(L)-xx)}" height="203" fill="#ffffff" opacity=".7"/>`+line(xx,43,xx,246,'#8e6d42',1,'4 4');}
 inner+='</g>';
 inner+=txt(24,270,s.limitX!==null?`Local solution ends at x = ${fmt(s.limitX,5)} m`:`Shared channel length = ${fmt(L,5)} m`,'#53616b',13)+txt(616,292,'L: lower wall · U: upper wall','#53616b',12,'end');
 return {inner,label:'Custom channel · two independent piecewise walls',meta:'Local wall states · pressure-colored boundaries · unresolved reflections omitted',field:s.moc?null:{quantity:'pressure',options:['pressure'],min,max,units:'kPa',label:'Surface pressure',note:'Local lower- and upper-wall states',palette:cornerPalette}};
}
