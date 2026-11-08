import {channelDrawing} from './wave-channel-graphics.js?v=20261108-moc-stage1';
import {cornerContourColor,cornerPalette} from './corner-graphics.js';
export function wallDrawing(s,{txt,line,poly,fmt,quantity,showCharacteristics}){
 if(s.channel)return channelDrawing(s,{txt,line,poly,fmt,quantity,showCharacteristics});
 const g=s.geometry,L=g.end,sign=g.side==='Gas above wall'?1:-1,start=-.2*L,end=L*1.04;
 const ys=g.points.map(p=>p.y),ymin=Math.min(...ys)-L*.12,ymax=Math.max(...ys)+L*.12,scale=Math.min(570/(end-start),177/(ymax-ymin));
 const X=x=>35+(x-start)*scale,Y=y=>145-((ymin+ymax)/2-y)*-scale,V=p=>[X(p.x),Y(p.y)];
 const vals=Object.values(s.regions).map(z=>z.p/1000),min=Math.min(...vals),max=Math.max(...vals),color=p=>cornerContourColor(max-min<1e-10?.5:(p/1000-min)/(max-min));
 let inner='<rect width="640" height="300" fill="#fcfdfc"/><defs><clipPath id="wall-view"><rect x="24" y="44" width="592" height="200"/></clipPath></defs>';
 inner+=txt(24,27,'WAVE GEOMETRY LAB','#263c4d',14)+txt(616,27,g.side,'#53616b',13,'end');
 inner+='<g clip-path="url(#wall-view)" stroke-linecap="round" stroke-linejoin="round">';
 const wall=[{x:start,y:0},...g.points,{x:end,y:g.points.at(-1).y+(end-L)*Math.tan(g.panels.at(-1).theta)}],solid=[...wall.map(V),[X(end),sign>0?260:38],[X(start),sign>0?260:38]];
 inner+=poly(solid,'#edf0f2');
 for(const w of s.waves){const origin=V(w.origin),radius=L*.32;for(const [i,a]of w.rays.entries()){
  let dx=radius*Math.cos(a);if(s.limitX!==null)dx=Math.min(dx,Math.max(0,s.limitX-w.origin.x));const q={x:w.origin.x+dx,y:w.origin.y+dx*Math.tan(a)};
  inner+=line(...origin,...V(q),w.kind==='Oblique shock'?'#000000':i===0||i===w.rays.length-1?'#477caa':'#91b2cd',w.kind==='Oblique shock'?1.35:.7);
 }}
 for(let i=0;i<wall.length-1;i++)inner+=line(...V(wall[i]),...V(wall[i+1]),'#17212b',1.8);
 for(const p of s.panels){const stop=Math.min(p.b.x,s.limitX??Infinity),q={x:stop,y:p.a.y+(stop-p.a.x)*Math.tan(p.theta)};inner+=line(...V(p.a),...V(q),color(p.state.p),2.3);const m={x:(p.a.x+q.x)/2,y:(p.a.y+q.y)/2},[mx,my]=V(m),nx=-Math.sin(p.theta)*sign,ny=-Math.cos(p.theta)*sign;
  inner+=txt(mx+nx*24,my+ny*24+4,p.id,'#263c4d',14,'middle');
  const cx=mx+nx*40,cy=my+ny*40,dx=Math.cos(p.theta),dy=-Math.sin(p.theta);inner+=line(cx-12*dx,cy-12*dy,cx+12*dx,cy+12*dy,'#536977',1)+poly([[cx+12*dx,cy+12*dy],[cx+7*dx-2*dy,cy+7*dy+2*dx],[cx+7*dx+2*dy,cy+7*dy-2*dx]],'#536977');
 }
 const [ix,iy]=V({x:start+.04*L,y:0});inner+=line(ix,iy-sign*35,ix+35,iy-sign*35,'#536977',1.3)+poly([[ix+35,iy-sign*35],[ix+29,iy-sign*38],[ix+29,iy-sign*32]],'#536977')+txt(ix+18,iy-sign*50,'1','#263c4d',14,'middle');
 if(s.limitX!==null){const xx=X(s.limitX);inner+=`<rect x="${xx}" y="44" width="${Math.max(0,616-xx)}" height="200" fill="#ffffff" opacity=".65"/>`+line(xx,44,xx,244,'#8e6d42',1,'4 4');}
 inner+='</g>';
 inner+=txt(24,272,s.limitX!==null?`Local solution ends at x = ${fmt(s.limitX,5)} m`:'Horizontal inlet · segment angles measured from horizontal','#53616b',13)+txt(616,293,'Solid black: shocks · blue: expansions','#53616b',12,'end');
 return {inner,label:'Piecewise wall · local shock–expansion solution',meta:'Colored wall: pressure · local wave rays · no resolved interaction field',field:{quantity:'pressure',options:['pressure'],min,max,units:'kPa',label:'Surface pressure',note:'Uniform local surface state on each segment',palette:cornerPalette}};
}
