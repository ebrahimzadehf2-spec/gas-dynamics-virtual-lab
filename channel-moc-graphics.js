import {channelOrdinate} from './wave-channel.js';
const palette=['#2536c7','#0879f5','#00c8dc','#16bf59','#efe51b','#ff9718','#ee2727'];
const shade=t=>{const v=Math.max(0,Math.min(1,t))*6,i=Math.min(5,Math.floor(v)),f=v-i,rgb=c=>c.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)),a=rgb(palette[i]),b=rgb(palette[i+1]);return '#'+a.map((v,k)=>Math.round(v+(b[k]-v)*f).toString(16).padStart(2,'0')).join('');};
export function mocDrawing(s,{txt,line,poly,fmt,quantity='mach',showCharacteristics=true}){
 const rows=s.moc.rows,g=s.geometry,last=rows.at(-1),end=g.end,start=-.15*end;
 const samples=[0,end,...g.lower.points.map(p=>p.x),...g.upper.points.map(p=>p.x)].filter(x=>x<=end+1e-9),ys=samples.flatMap(x=>[channelOrdinate(g.lower,x),channelOrdinate(g.upper,x)]),lo=Math.min(...ys),hi=Math.max(...ys),scale=Math.min(560/(end-start),164/Math.max(hi-lo,.1*end)),X=x=>320+(x-(start+end)/2)*scale,Y=y=>145+((lo+hi)/2-y)*scale;
 const options=['mach','pressure','temperature','density','speed'],key=options.includes(quantity)?quantity:'mach',label={mach:'Mach number',pressure:'Static pressure',temperature:'Static temperature',density:'Density',speed:'Flow speed'}[key],unit={mach:'M',pressure:'kPa',temperature:'K',density:'kg/m³',speed:'m/s'}[key];
 const value=M=>{const factor=1+(s.gamma-1)*M*M/2,T=s.s1.T0/factor,p=s.s1.p0/factor**(s.gamma/(s.gamma-1));return key==='mach'?M:key==='pressure'?p/1000:key==='temperature'?T:key==='density'?p/(s.R*T):M*Math.sqrt(s.gamma*s.R*T);};
 let min=Infinity,max=-Infinity;for(const row of rows)for(const M of row.M){const v=value(M);min=Math.min(min,v);max=Math.max(max,v);}
 const color=v=>shade(max-min<1e-10?.5:(v-min)/(max-min)),boundary=wall=>[{x:start,y:channelOrdinate(wall,0)},...wall.points.filter(p=>p.x<end-1e-9),{x:end,y:channelOrdinate(wall,end)}],lower=boundary(g.lower),upper=boundary(g.upper),points=ps=>ps.map(p=>[X(p.x),Y(p.y)]);
 let inner='<rect width="640" height="300" fill="#fcfdfc"/>'+txt(24,27,'CHARACTERISTIC FIELD','#263c4d',14)+txt(616,27,'Isentropic · numerical MOC','#53616b',13,'end');
 inner+='<defs><clipPath id="moc-domain">'+poly([...points(lower),...points(upper.slice().reverse())],'#fff')+'</clipPath></defs>';
 inner+=poly([...points(lower),[X(end),246],[X(start),246]],'#edf0f2')+poly([...points(upper),[X(end),43],[X(start),43]],'#edf0f2');
 inner+='<g clip-path="url(#moc-domain)"><g shape-rendering="crispEdges">';
 const strideX=Math.max(1,Math.ceil((rows.length-1)/150)),strideY=Math.max(1,Math.ceil((rows[0].M.length-1)/60)),N=rows[0].M.length;
 for(let i=0;i<rows.length-1;i+=strideX){const a=rows[i],b=rows[Math.min(rows.length-1,i+strideX)];for(let j=0;j<N-1;j+=strideY){const k=Math.min(N-1,j+strideY),y=(r,n)=>r.lower+(r.upper-r.lower)*n/(N-1),v=value((a.M[j]+a.M[k]+b.M[j]+b.M[k])/4),c=color(v);inner+=poly([[X(a.x),Y(y(a,j))],[X(b.x),Y(y(b,j))],[X(b.x),Y(y(b,k))],[X(a.x),Y(y(a,k))]],c,c,.2);}}
 inner+='</g>';
 const at=(row,y)=>{const v=Math.max(0,Math.min(N-1,(y-row.lower)/(row.upper-row.lower)*(N-1))),j=Math.min(N-2,Math.floor(v)),f=v-j;return {theta:row.theta[j]*(1-f)+row.theta[j+1]*f,M:row.M[j]*(1-f)+row.M[j+1]*f};};
 if(showCharacteristics)for(const family of [1,-1]){
  const seeds=Array.from({length:7},(_,j)=>[0,rows[0].lower+(rows[0].upper-rows[0].lower)*(j+1)/8]);
  for(const fraction of [0,.25,.5,.75]){const i=rows.findIndex(r=>r.x>=last.x*fraction);if(i>=0)seeds.push([i,family===1?rows[i].lower:rows[i].upper]);}
  for(const [begin,y0]of seeds){let y=y0,path=[[X(rows[begin].x),Y(y)]];for(let i=begin;i<rows.length-1;i++){const a=rows[i],b=rows[i+1],dx=b.x-a.x,z=at(a,y),m=Math.tan(z.theta+family*Math.asin(1/z.M)),guess=y+dx*m,next=at(b,guess),out=y+dx*.5*(m+Math.tan(next.theta+family*Math.asin(1/next.M)));if(out<b.lower-1e-9||out>b.upper+1e-9)break;y=out;path.push([X(b.x),Y(y)]);}
   if(path.length>1)inner+=`<polyline data-characteristic="${family===1?'C+':'C−'}" points="${path.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${family===1?'#172f4b':'#ffffff'}" stroke-opacity=".55" stroke-width=".75"/>`;
  }
 }
 for(const f of [.2,.5,.8]){const row=rows.reduce((a,b)=>Math.abs(a.x-last.x*f)<Math.abs(b.x-last.x*f)?a:b);for(const eta of [.2,.5,.8]){const y=row.lower+(row.upper-row.lower)*eta,z=at(row,y),cx=X(row.x),cy=Y(y),dx=Math.cos(z.theta),dy=-Math.sin(z.theta),t=(value(z.M)-min)/(max-min||1),c=t<.18||t>.85?'#fff':'#263c4d';inner+=line(cx-9*dx,cy-9*dy,cx+9*dx,cy+9*dy,c,1)+poly([[cx+9*dx,cy+9*dy],[cx+4*dx-2*dy,cy+4*dy+2*dx],[cx+4*dx+2*dy,cy+4*dy-2*dx]],c);}}
 inner+='</g>';
 for(const wall of [lower,upper])for(let i=0;i<wall.length-1;i++)inner+=line(X(wall[i].x),Y(wall[i].y),X(wall[i+1].x),Y(wall[i+1].y),'#000',1.4);
 if(last.x<end-1e-8)inner+=line(X(last.x),43,X(last.x),246,'#8e6d42',1,'4 4');
 inner+=txt(24,269,'Numerical field · refine resolution to assess accuracy','#53616b',12)+txt(616,292,showCharacteristics?'Dark: C+ · light: C− · arrows: flow':'Arrows: local flow direction','#53616b',12,'end');
 return {inner,label:'Isentropic characteristic field inside the channel',meta:'MOC with interpolation · no shock fitting or viscous effects',field:{quantity:key,options,label,min,max,units:unit,note:'Computed 2D field · numerical MOC',palette}};
}
