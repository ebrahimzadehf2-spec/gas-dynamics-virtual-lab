import {obliqueShock,expansion,shockLimit,prandtlMeyer,state,rad,deg,linspace} from './physics.js';
import {requireValue,finite,bisect} from './numerics.js';
const identity=M=>({M2:M,p:1,T:1,rho:1,p0:1,beta:0});
const apply=(s,w,theta)=>({...state(w.M2,s.T*w.T,s.p*w.p,s.gamma,s.R),theta,gamma:s.gamma,R:s.R});
function outgoing(s,phi,side){
 const turn=side*(phi-s.theta),angle=Math.abs(phi-s.theta);
 const w=angle<1e-12?identity(s.M):turn>0?obliqueShock(s.M,angle,s.gamma):expansion(s.M,angle,s.gamma);
 const kind=angle<1e-12?'No wave':turn>0?'Oblique shock':'Expansion fan';
 const after=apply(s,w,phi),rays=[];
 if(kind==='Expansion fan')for(const t of linspace(0,angle,33)){
  const z=t===0?identity(s.M):expansion(s.M,t,s.gamma),theta=s.theta-side*t;
  rays.push({angle:theta+side*Math.asin(1/z.M2),state:apply(s,z,theta)});
 }else rays.push({angle:s.theta+side*(kind==='No wave'?Math.asin(1/s.M):w.beta),state:after});
 return {...w,kind,before:s,after,side,rays};
}
export function interactionPair(r,phi){return {a:outgoing(r.lower,phi,-1),b:outgoing(r.upper,phi,1)};}
export function solveInteraction(x={}){
 const {M1=4,T1=300,p1=101,gamma=1.4,R=287,thetaUpper=10,thetaLower=20,interactionType='Opposing shocks',geometryMode='Educational'}=x;
 requireValue(['Opposing shocks','Same-direction shocks'].includes(interactionType),'Choose an interaction type.');
 requireValue(['Educational','Custom geometry'].includes(geometryMode),'Choose a geometry mode.');
 requireValue(finite(thetaUpper,thetaLower)&&thetaUpper>0&&thetaLower>0&&thetaUpper<=30&&thetaLower<=30,'Both corner turns must be greater than 0° and at most 30°.');
 const same=interactionType==='Same-direction shocks',t1=rad(thetaUpper),t2=rad(thetaLower),s1={...state(M1,T1,p1*1000,gamma,R),theta:0,gamma,R};
 const n2=obliqueShock(M1,t1,gamma),s2=apply(s1,n2,t1),n3=obliqueShock(same?s2.M:M1,t2,gamma),s3=apply(same?s2:s1,n3,same?t1+t2:-t2);
 const lower=same?s3:s2,upper=same?s1:s3;
 requireValue(lower.M>1&&upper.M>1,'The streams entering the interaction must remain supersonic. This regular attached-wave model does not resolve a Mach reflection.','unsupported-pattern');
 const maxNu=(Math.sqrt((gamma+1)/(gamma-1))-1)*Math.PI/2;
 const lo=Math.max(lower.theta-shockLimit(lower.M,gamma).theta,upper.theta-(maxNu-prandtlMeyer(upper.M,gamma))+1e-8);
 const hi=Math.min(upper.theta+shockLimit(upper.M,gamma).theta,lower.theta+(maxNu-prandtlMeyer(lower.M,gamma))-1e-8);
 requireValue(lo<hi,'There is no shared angular interval for a regular attached-wave interaction.','unsupported-pattern');
 const context={lower,upper};const f=phi=>{const {a,b}=interactionPair(context,phi);return Math.log(a.after.p/b.after.p);};
 requireValue(f(lo)*f(hi)<=0,'No pressure-matched regular weak-wave solution exists. Detached shocks and Mach reflections are outside this model.','unsupported-pattern');
 const root=bisect(f,lo,hi),phi=root.value,{a,b}=interactionPair(context,phi),s4=a.after,s5=b.after;
 const waves=[{...n2,kind:'Oblique shock',before:s1,after:s2,title:'Incident shock · 1 → 2'}, { ...n3,kind:'Oblique shock',before:same?s2:s1,after:s3,title:same?'Second incident shock · 2 → 3':'Incident shock · 1 → 3'}, {...a,title:same?'Reflected wave · 3 → 4':'Outgoing wave · 2 → 4'}, {...b,title:same?'Resultant shock · 1 → 5':'Outgoing wave · 3 → 5'}];
 const regions={1:s1,2:s2,3:s3,4:s4,5:s5};
 const r={status:'ok',same,interactionType,geometryMode,lower,upper,n2,n3,a,b,delta:phi,slipAngle:deg(phi),p4:s4.p/s1.p,p5:s5.p/s1.p,regions,waves,residual:root.residual,iterations:root.iterations,interval:[lo,hi]};
 r.geometry=interactionGeometry(r,x);return r;
}
function intersection(a,ma,b,mb){const dx=(b[1]-a[1]+ma*a[0]-mb*b[0])/(ma-mb);return [dx,a[1]+ma*(dx-a[0])];}
export function clipPolygon(poly,fn){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],fa=fn(a),fb=fn(b);if(fa>=-1e-10)out.push(a);if((fa>0&&fb<0)||(fa<0&&fb>0)){const t=fa/(fa-fb);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;}
export function interactionGeometry(r,x){
 const t1=rad(x.thetaUpper??10),t2=rad(x.thetaLower??20),custom=r.geometryMode==='Custom geometry';
 let H=custom?x.channelHeight:1,d=custom?x.cornerSpacing:r.same?1:0;
 requireValue(finite(H,d)&&H>0&&d>=0,'Geometry requires a positive height and a nonnegative corner spacing.');
 requireValue(!r.same||d>0,'Same-direction corners require a positive separation.');
 const A=[0,0],C=r.same?[d,d*Math.tan(t1)]:[d,H],ma=Math.tan(r.n2.beta),mc=Math.tan(r.same?t1+r.n3.beta:-r.n3.beta);
 const B=intersection(A,ma,C,mc);
 if(r.same&&!custom)H=Math.max(1,B[1]*1.6);
 const lowerSegments=r.same?[[0,0], [Math.tan(t1),0],[Math.tan(t1+t2),C[1]-Math.tan(t1+t2)*d]]:[[0,0],[Math.tan(t1),0]];
 const upperSegments=r.same?[[0,H]]:[[0,H],[-Math.tan(t2),H+Math.tan(t2)*d]];
 const bottom=z=>Math.max(...lowerSegments.map(([m,c])=>m*z+c)),top=z=>Math.min(...upperSegments.map(([m,c])=>m*z+c));
 requireValue(finite(...B)&&B[0]>Math.max(0,d)+1e-9&&B[1]>bottom(B[0])+1e-9&&B[1]<top(B[0])-1e-9,'The incident waves do not meet inside this geometry before a wall encounter. Change the height, corner spacing or turns.','geometry-limit');
 const hits=[];
 for(const w of [r.a,r.b])for(const ray of w.rays){const m=Math.tan(ray.angle);requireValue(Math.cos(ray.angle)>0,'An outgoing wave is not downstream-directed in this regular model.','unsupported-pattern');for(const [mw,c] of [...lowerSegments,...upperSegments]){const xx=(c-B[1]+m*B[0])/(m-mw);if(xx>B[0]+1e-8)hits.push(xx);}}
 const ms=Math.tan(r.delta);for(const [mw,c] of [...lowerSegments,...upperSegments]){const xx=(c-B[1]+ms*B[0])/(ms-mw);if(xx>B[0]+1e-8)hits.push(xx);}
 const firstWallX=Math.min(...hits),endX=Math.min(B[0]+3*H,Number.isFinite(firstWallX)?B[0]+.97*(firstWallX-B[0]):Infinity),startX=-.12*H;
 let domain=[[startX,-H],[endX,-H],[endX,H*2],[startX,H*2]];
 for(const [m,c] of lowerSegments)domain=clipPolygon(domain,([xx,yy])=>yy-m*xx-c);
 for(const [m,c] of upperSegments)domain=clipPolygon(domain,([xx,yy])=>m*xx+c-yy);
 const lines=[{origin:A,angle:r.n2.beta},{origin:C,angle:r.same?t1+r.n3.beta:-r.n3.beta},...[r.a,r.b].flatMap(w=>w.rays.map(ray=>({origin:B,angle:ray.angle}))),{origin:B,angle:r.delta}];
 let cells=[domain];for(const l of lines){const m=Math.tan(l.angle),fn=([xx,yy])=>yy-l.origin[1]-m*(xx-l.origin[0]);cells=cells.flatMap(poly=>[clipPolygon(poly,fn),clipPolygon(poly,p=>-fn(p))]).filter(p=>p.length>=3&&Math.abs(p.reduce((v,a,i)=>{const b=p[(i+1)%p.length];return v+a[0]*b[1]-a[1]*b[0];},0))>1e-12*H*H);}
 const classify=([xx,yy])=>{
  if(xx<B[0]){if(yy>ma*xx)return r.same?r.regions[1]:yy>C[1]+mc*(xx-d)?r.regions[3]:r.regions[1];return r.same?(yy>C[1]+mc*(xx-d)?r.regions[2]:r.regions[3]):r.regions[2];}
  const alpha=Math.atan2(yy-B[1],xx-B[0]);const w=alpha<r.delta?r.a:r.b;
  const head=w.rays[0].angle,tail=w.rays.at(-1).angle;
  if(w.side*(alpha-head)>0)return w.before;
  if(w.side*(alpha-tail)<=0)return w.after;
  const nearest=w.rays.reduce((a,b)=>Math.abs(a.angle-alpha)<Math.abs(b.angle-alpha)?a:b);return nearest.state;
 };
 const fields=cells.map(poly=>({poly,state:classify(poly.reduce((s,p)=>[s[0]+p[0]/poly.length,s[1]+p[1]/poly.length],[0,0]))}));
 const segment=(origin,angle)=>({origin,end:[endX,origin[1]+Math.tan(angle)*(endX-origin[0])]});
 return {A,C,B,H,d,startX,endX,firstWallX,domain,fields,incident:[{origin:A,end:B},{origin:C,end:B}],outgoing:[r.a,r.b].flatMap(w=>w.rays.map(z=>({...segment(B,z.angle),kind:w.kind}))),slip:segment(B,r.delta),walls:{lower:[[startX,bottom(startX)],A,...(r.same?[C]:[]),[endX,bottom(endX)]],upper:[[startX,top(startX)],...(r.same?[]:[C]),[endX,top(endX)]]}};
}
