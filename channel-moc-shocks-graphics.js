import {channelOrdinate} from './wave-channel.js';
import {fittedState} from './channel-moc-shocks.js';
import {cornerPalette,cornerContourColor} from './corner-graphics.js?v=20261113-rainbow-physical';
export function fittedMocGeometry(s){
 const g=s.geometry,end=g.end,start=-.12*end,xs=[0,end,...g.lower.points.map(p=>p.x),...g.upper.points.map(p=>p.x)].filter(x=>x<=end),ys=xs.flatMap(x=>[channelOrdinate(g.lower,x),channelOrdinate(g.upper,x)]),lo=Math.min(...ys),hi=Math.max(...ys),scale=Math.min(560/(end-start),170/Math.max(hi-lo,.1*end)),X=x=>320+(x-(start+end)/2)*scale,Y=y=>145+((lo+hi)/2-y)*scale;
 return {end,start,lo,hi,scale,X,Y};
}
function at(s,row,y){const p=row.parts.find(p=>y>=p.lo-1e-9&&y<=p.hi+1e-9);if(!p)return null;const n=p.z.length,t=Math.max(0,Math.min(n-1,(y-p.lo)/(p.hi-p.lo||1)*(n-1))),j=Math.min(n-2,Math.floor(t)),a=p.z[j],b=p.z[j+1],f=t-j;return fittedState(s,{theta:a.theta+(b.theta-a.theta)*f,l:a.l+(b.l-a.l)*f,k:a.k+(b.k-a.k)*f});}
export function probeFittedMOC(s,sx,sy){const v=fittedMocGeometry(s),x=(sx-320)/v.scale+(v.start+v.end)/2,y=(145-sy)/v.scale+(v.lo+v.hi)/2,rows=s.moc.rows;if(!rows.length||x<0||x>rows.at(-1).x||y<channelOrdinate(s.geometry.lower,x)||y>channelOrdinate(s.geometry.upper,x))return null;const row=rows.reduce((a,b)=>Math.abs(a.x-x)<Math.abs(b.x-x)?a:b),z=at(s,row,y);return z?{x,y,...z}:null;}
export function fittedMocDrawing(s,{txt,line,poly,fmt,range=null,quantity='mach',showCharacteristics=true}){
 const rows=s.moc.rows,g=s.geometry,v=fittedMocGeometry(s),{X,Y,start,end}=v,last=rows.at(-1),options=['mach','pressure','temperature','density','speed'],key=options.includes(quantity)?quantity:'mach',get=z=>key==='mach'?z.M:key==='pressure'?z.p/1000:key==='temperature'?z.T:key==='density'?z.rho:z.u,labels={mach:'Mach number',pressure:'Static pressure',temperature:'Static temperature',density:'Density',speed:'Flow speed'},units={mach:'M',pressure:'kPa',temperature:'K',density:'kg/m³',speed:'m/s'};
 let min=Infinity,max=-Infinity;for(const row of rows)for(const p of row.parts)for(const z of p.z){const a=get(fittedState(s,z));min=Math.min(min,a);max=Math.max(max,a);}
 if(range){min=range.min;max=range.max;}
 const color=z=>cornerContourColor((get(z)-min)/(max-min||1)),boundary=wall=>[{x:start,y:channelOrdinate(wall,0)},...wall.points.filter(p=>p.x<end-1e-9),{x:end,y:channelOrdinate(wall,end)}],lower=boundary(g.lower),upper=boundary(g.upper),points=p=>p.map(q=>[X(q.x),Y(q.y)]);
 let inner='<rect width="640" height="300" fill="#fcfdfc"/>';
 inner+='<defs><clipPath id="fitted-domain">'+poly([...points(lower),...points(upper.slice().reverse())],'#fff')+'</clipPath></defs>';
 inner+=poly([...points(lower),[X(end),245],[X(start),245]],'#edf0f2')+poly([...points(upper),[X(end),44],[X(start),44]],'#edf0f2');
 inner+='<g clip-path="url(#fitted-domain)"><g shape-rendering="crispEdges">';
 // Meshes do not interpolate across shocks. Every smooth strip ends at its
 // own one-sided fitted boundary, retaining the physical contour jump.
 const strideY=Math.max(1,Math.ceil(s.moc.resolution/40));
 const strideX=Math.max(1,Math.ceil(rows.length/160));
 for(let i=0;i<rows.length-1;i+=strideX){
  const a=rows[i],b=rows[Math.min(rows.length-1,i+strideX)];if(b.x-a.x<1e-12||a.parts.length!==b.parts.length||a.shock?.id!==b.shock?.id)continue;
  for(let q=0;q<a.parts.length;q++){const p=a.parts[q],r=b.parts[q],N=p.z.length,y=(p,j)=>p.lo+(p.hi-p.lo)*j/(N-1);
   for(let j=0;j<N-1;j+=strideY){const k=Math.min(N-1,j+strideY),z=fittedState(s,p.z[Math.floor((j+k)/2)]),c=color(z);inner+=poly([[X(a.x),Y(y(p,j))],[X(b.x),Y(y(r,j))],[X(b.x),Y(y(r,k))],[X(a.x),Y(y(p,k))]],c,c,.1);}
  }
 }
 inner+='</g>';
 if(showCharacteristics)for(const family of [-1,1])for(const fraction of [.1,.35,.6])for(const eta of [.2,.5,.8]){
  const begin=rows.findIndex(r=>r.x>=last.x*fraction);if(begin<0)continue;let y=rows[begin].lower+(rows[begin].upper-rows[begin].lower)*eta,path=[[X(rows[begin].x),Y(y)]];
  for(let i=begin;i<rows.length-1;i++){const a=rows[i],b=rows[i+1],z=at(s,a,y);if(!z)break;const yy=y+(b.x-a.x)*Math.tan(z.theta+family*Math.asin(1/z.M));if(yy<b.lower||yy>b.upper||(a.shock&&b.shock&&(y-a.shock.y)*(yy-b.shock.y)<0))break;y=yy;path.push([X(b.x),Y(y)]);}
  if(path.length>1)inner+=`<polyline data-characteristic="${family}" points="${path.map(p=>p.join(',')).join(' ')}" stroke="${family===1?'#fff':'#20374b'}" stroke-width=".65" stroke-opacity=".55" fill="none"/>`;
 }
 for(const f of [.2,.5,.8]){const row=rows.reduce((a,b)=>Math.abs(a.x-last.x*f)<Math.abs(b.x-last.x*f)?a:b);for(const eta of [.2,.5,.8]){const y=row.lower+(row.upper-row.lower)*eta,z=at(s,row,y);if(!z)continue;const cx=X(row.x),cy=Y(y),dx=Math.cos(z.theta),dy=-Math.sin(z.theta),c='#243c50';inner+=line(cx-9*dx,cy-9*dy,cx+9*dx,cy+9*dy,c,1)+poly([[cx+9*dx,cy+9*dy],[cx+4*dx-2*dy,cy+4*dy+2*dx],[cx+4*dx+2*dy,cy+4*dy-2*dx]],c);}}
 inner+='</g>';
 for(const t of s.moc.traces){const p=t.points;inner+=`<polyline data-fitted-shock="${t.id}" points="${p.map(p=>[X(p.x),Y(p.y)].join(',')).join(' ')}" fill="none" stroke="#000" stroke-width="2"/>`;const m=p[Math.floor(p.length/2)];inner+=txt(X(m.x)+5,Y(m.y)-7,'S'+t.id,'#17212b',12);}
 for(const wall of [lower,upper])for(let i=0;i<wall.length-1;i++)inner+=line(X(wall[i].x),Y(wall[i].y),X(wall[i+1].x),Y(wall[i+1].y),'#000',1.5);
 if(last.x<end-1e-8){inner+=line(X(last.x),43,X(last.x),245,'#8e6d42',1.2,'4 4')+txt(616,270,'Partial field · downstream not solved','#8e6d42',12,'end');}
 return {inner,label:'Rotational characteristic field · fitted shocks',meta:'Black: fitted shocks · arrows: flow · refine characteristic resolution',field:{quantity:key,options,label:labels[key],min,max,units:units[key],palette:cornerPalette,note:'Numerical MOC · separate one-sided shock states'}};
}
