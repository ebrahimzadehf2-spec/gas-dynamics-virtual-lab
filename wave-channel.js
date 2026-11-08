import {solveWaveWall} from './wave-wall.js';
import {requireValue,finite} from './numerics.js';
export function channelOrdinate(g,x){
 const p=g.panels.find(p=>x>=p.a.x-1e-10&&x<=p.b.x+1e-10)??g.panels.at(-1);
 return p.a.y+(x-p.a.x)*Math.tan(p.theta);
}
export function solveWaveChannel(x){
 requireValue(finite(x.channelHeight)&&x.channelHeight>=.01&&x.channelHeight<=100,'Channel inlet height must be between 0.01 and 100 m.');
 const lower=solveWaveWall({...x,wallSide:'Gas above wall'}),upper=solveWaveWall({...x,wallSide:'Gas below wall',wallSegments:x.upperWallSegments});
 // Translate the upper wall; its intrinsic segment angles remain unchanged.
 const shift=p=>({...p,y:p.y+x.channelHeight});
 upper.geometry={...upper.geometry,points:upper.geometry.points.map(shift),panels:upper.geometry.panels.map(p=>({...p,a:shift(p.a),b:shift(p.b)}))};
 upper.panels=upper.panels.map(p=>({...p,a:shift(p.a),b:shift(p.b)}));upper.waves=upper.waves.map(w=>({...w,origin:shift(w.origin)}));
 const end=Math.min(lower.geometry.end,upper.geometry.end),bottom=xx=>channelOrdinate(lower.geometry,xx),top=xx=>channelOrdinate(upper.geometry,xx);
 const stations=[0,end,...lower.geometry.points.map(p=>p.x),...upper.geometry.points.map(p=>p.x)].filter(xx=>xx<=end+1e-10);
 requireValue(stations.every(xx=>top(xx)-bottom(xx)>1e-8),'The upper and lower walls cross or close inside the shared channel length.');
 let limitX=end,reason=null;
 for(const wall of [lower,upper])if(wall.limitX!==null&&wall.limitX<limitX){limitX=wall.limitX;reason=wall.reason;}
 const validRays=(wall,prefix)=>wall.waves.flatMap(w=>w.rays.map(a=>({origin:w.origin,m:Math.tan(a),id:prefix+w.id})));
 const lr=validRays(lower,'L'),ur=validRays(upper,'U');
 const hit=(xx,why)=>{if(xx>1e-8&&xx<limitX){limitX=xx;reason=why;}};
 for(const [rays,opposite]of [[lr,upper],[ur,lower]])for(const r of rays)for(const p of opposite.geometry.panels){
  const m=Math.tan(p.theta),den=r.m-m;if(Math.abs(den)<1e-12)continue;
  const xx=(p.a.y-r.origin.y+r.m*r.origin.x-m*p.a.x)/den;
  if(xx>r.origin.x+1e-8&&xx>=p.a.x-1e-10&&xx<=p.b.x+1e-10&&xx<end)hit(xx,'An emitted wave reaches the opposite channel wall; the reflected pattern is not solved.');
 }
 for(const a of lr)for(const b of ur){
  if(Math.abs(a.m-b.m)<1e-12)continue;
  const xx=(b.origin.y-a.origin.y+a.m*a.origin.x-b.m*b.origin.x)/(a.m-b.m),yy=a.origin.y+a.m*(xx-a.origin.x);
  if(xx>Math.max(a.origin.x,b.origin.x)+1e-8&&xx<end&&yy>bottom(xx)+1e-9&&yy<top(xx)-1e-9)hit(xx,'Waves from the two channel walls intersect; their subsequent interaction is not solved.');
 }
 const regions={1:lower.s1},panels=[],waves=[];
 for(const [wall,prefix]of [[lower,'L'],[upper,'U']]){
  for(const p of wall.panels)if(p.a.x<limitX-1e-9&&p.a.x<end-1e-9){const id=prefix+p.id;panels.push({...p,id,wall:prefix});regions[id]=p.state;}
  for(const w of wall.waves)if(w.origin.x<limitX-1e-9&&w.origin.x<end-1e-9)waves.push({...w,id:prefix+w.id,parentId:Number(w.id)===2?'1':prefix+(Number(w.id)-1),wall:prefix});
 }
 return {channel:true,status:reason?'partial':'ok',reason,limitX:reason?limitX:null,geometry:{lower:lower.geometry,upper:upper.geometry,end,height:x.channelHeight},s1:lower.s1,regions,panels,waves,gamma:lower.gamma,R:lower.R};
}
export function channelPlots(r){
 const properties=[['M','Mach number','M',z=>z.M],['p','Static pressure','p (kPa)',z=>z.p/1000],['T','Static temperature','T (K)',z=>z.T],['rho','Density','ρ (kg/m³)',z=>z.rho],['u','Flow speed','u (m/s)',z=>z.u],['p0','Stagnation pressure','p₀ (kPa)',z=>z.p0/1000]];
 return properties.map(([key,label,unit,value])=>({key:'channel-'+key,label,chart:{title:label,xlabel:'Channel station x (m)',ylabel:unit,zeroBaseline:false,series:['L','U'].map(side=>({name:side==='L'?'Lower-wall stream':'Upper-wall stream',points:[[0,value(r.s1)],...r.panels.filter(p=>p.wall===side).flatMap(p=>[[p.a.x,value(p.state)],[Math.min(p.b.x,r.geometry.end,r.limitX??Infinity),value(p.state)]])]}))},note:'Separate local wall-stream states; both stop at the first unresolved interaction or wall encounter.'}));
}
