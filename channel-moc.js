import {solveWaveChannel,channelOrdinate} from './wave-channel.js';
import {prandtlMeyer,state} from './physics.js';
import {requireValue,PhysicsError} from './numerics.js';
// Isentropic, irrotational 2D MOC on successive x stations. Along C+,
// theta-nu is constant; along C-, theta+nu is constant. Characteristic
// feet use predictor/corrector directions and linear interpolation. This
// is a numerical characteristic field, not an exact analytical contour.
function inverseNu(nu,g,guess=3){
 const max=prandtlMeyer(50,g);requireValue(nu>1e-8&&nu<max,'The characteristic field reaches the sonic or Mach-50 expansion limit.','moc-limit');
 let lo=1,hi=50,m=Math.max(1.00001,Math.min(49.99,guess));
 for(let i=0;i<22;i++){
  const f=prandtlMeyer(m,g)-nu;if(Math.abs(f)<1e-11)return m;if(f>0)hi=m;else lo=m;
  const slope=Math.sqrt(m*m-1)/(m*(1+(g-1)*m*m/2)),next=m-f/slope;m=next>lo&&next<hi?next:(lo+hi)/2;
 }return m;
}
function interpolate(row,y){
 const t=Math.max(0,Math.min(row.M.length-1,(y-row.lower)/(row.upper-row.lower)*(row.M.length-1))),i=Math.min(row.M.length-2,Math.floor(t)),f=t-i;
 return {theta:row.theta[i]*(1-f)+row.theta[i+1]*f,nu:row.nu[i]*(1-f)+row.nu[i+1]*f,M:row.M[i]*(1-f)+row.M[i+1]*f};
}
export function mocState(r,row,index){
 const M=row.M[index],T=r.s1.T0/(1+(r.gamma-1)*M*M/2),p=r.s1.p0/(1+(r.gamma-1)*M*M/2)**(r.gamma/(r.gamma-1));
 return {...state(M,T,p,r.gamma,r.R),theta:row.theta[index]};
}
export function solveChannelMOC(x){
 const base=solveWaveChannel(x),g=base.gamma,geometry=base.geometry,N=Math.round(x.mocResolution??81);
 requireValue(Number.isFinite(N)&&N>=31&&N<=201,'MOC resolution must be 31–201 points across the channel.');
 const result={...base,waves:[],panels:[],regions:{Inlet:base.s1},moc:{status:'unsupported',rows:[],resolution:N},status:'unsupported',limitX:0};
 try{
  for(const [wall,side]of [[geometry.lower,-1],[geometry.upper,1]]){let previous=0;for(const p of wall.panels){if(p.a.x>=geometry.end)break;requireValue(side*(p.theta-previous)>=-1e-10,'This MOC stage supports straight or outward-turning walls only. Compression corners need shock fitting; choose Local shock–expansion for their current solution.','moc-shock-required');previous=p.theta;}}
  const wallAngle=(wall,xx)=>{const p=wall.panels.find(p=>xx<p.b.x-1e-11)??wall.panels.at(-1);return p.theta;};
  const nu0=prandtlMeyer(base.s1.M,g),first={x:0,lower:0,upper:geometry.height,M:Array(N).fill(base.s1.M),theta:Array(N).fill(0),nu:Array(N).fill(nu0)};
  for(const [index,wall,side]of [[0,geometry.lower,-1],[N-1,geometry.upper,1]]){const theta=wallAngle(wall,0),nu=nu0+side*theta;first.theta[index]=theta;first.nu[index]=nu;first.M[index]=inverseNu(nu,g,base.s1.M);}
  const rows=[first],corners=[geometry.end,...geometry.lower.points.map(p=>p.x),...geometry.upper.points.map(p=>p.x)].sort((a,b)=>a-b);let reason=null;
  while(rows.at(-1).x<geometry.end-1e-10){
   const old=rows.at(-1);
   try{
    requireValue(rows.length*N<250000,'The characteristic-grid budget was reached. Reduce resolution or shorten the channel.','moc-grid-limit');
    let speed=0;
    for(let j=0;j<N;j++)for(const side of [-1,1]){const angle=old.theta[j]+side*Math.asin(1/old.M[j]);requireValue(Math.abs(angle)<Math.PI*.48,'A characteristic is no longer directed downstream; this x-marching MOC is outside its domain.','moc-limit');speed=Math.max(speed,Math.abs(Math.tan(angle)));}
    const nextCorner=corners.find(xx=>xx>old.x+1e-9)??geometry.end;
    const dx=Math.min(.65*(old.upper-old.lower)/(N-1)/Math.max(speed,.05),nextCorner-old.x,geometry.end-old.x);
    requireValue(dx>1e-12,'The characteristic step collapsed near a wall corner.','moc-limit');
    const xx=old.x+dx,lower=channelOrdinate(geometry.lower,xx),upper=channelOrdinate(geometry.upper,xx),row={x:xx,lower,upper,M:[],theta:[],nu:[]};
    const boundary=(wall,side,index,y)=>{
     const theta=wallAngle(wall,xx),family=side;let nu=old.nu[index],M=old.M[index];
     for(let k=0;k<6;k++){
      const target=theta+family*Math.asin(1/M),foot0=y-dx*Math.tan(target),prior=interpolate(old,foot0),angle=.5*(target+prior.theta+family*Math.asin(1/prior.M)),z=interpolate(old,y-dx*Math.tan(angle));
      nu=side<0?z.theta+z.nu-theta:theta-z.theta+z.nu;M=inverseNu(nu,g,M);
     }return {theta,nu,M};
    };
    // Lower wall receives C-; upper wall receives C+.
    const low=boundary(geometry.lower,-1,0,lower),high=boundary(geometry.upper,1,N-1,upper);
    const incoming=(y,theta,M,family)=>{
     const target=theta+family*Math.asin(1/M),prior=interpolate(old,y-dx*Math.tan(target)),angle=.5*(target+prior.theta+family*Math.asin(1/prior.M)),foot=y-dx*Math.tan(angle);
     if(family===1&&foot<old.lower){const t=(old.lower-foot)/((y-lower)+(old.lower-foot)),a=old.theta[0]-old.nu[0],b=low.theta-low.nu;return a+(b-a)*t;}
     if(family===-1&&foot>old.upper){const t=(foot-old.upper)/((upper-y)+(foot-old.upper)),a=old.theta[N-1]+old.nu[N-1],b=high.theta+high.nu;return a+(b-a)*t;}
     const z=interpolate(old,foot);return z.theta-family*z.nu;
    };
    for(let j=0;j<N;j++){
     let z;if(j===0)z=low;else if(j===N-1)z=high;else{
      const y=lower+(upper-lower)*j/(N-1);z=interpolate(old,y);
      for(let k=0;k<8;k++){const minus=incoming(y,z.theta,z.M,1),plus=incoming(y,z.theta,z.M,-1),theta=(plus+minus)/2,nu=(plus-minus)/2,M=inverseNu(nu,g,z.M),error=Math.abs(theta-z.theta)+Math.abs(nu-z.nu);z={theta,nu,M};if(error<1e-9)break;}
     }row.theta.push(z.theta);row.nu.push(z.nu);row.M.push(z.M);
    }rows.push(row);
   }catch(e){if(!(e instanceof PhysicsError))throw e;reason=e.message;break;}
  }
  result.status=reason?'partial':'ok';result.reason=reason;result.limitX=reason?rows.at(-1).x:null;result.moc={status:reason?'partial':'ok',rows,resolution:N};
  const last=rows.at(-1);const location=reason?'limit':'outlet';result.regions={Inlet:base.s1,['Lower '+location]:mocState(result,last,0),['Centre '+location]:mocState(result,last,Math.floor(N/2)),['Upper '+location]:mocState(result,last,N-1)};
  let flux=0;for(let j=0;j<N;j++){const z=mocState(result,last,j);flux+=(j===0||j===N-1?.5:1)*z.rho*z.u*Math.cos(z.theta)*(last.upper-last.lower)/(N-1);}
  const inlet=base.s1.rho*base.s1.u*geometry.height;result.moc.massResidual=Math.abs(flux-inlet)/inlet;
  return result;
 }catch(e){if(!(e instanceof PhysicsError))throw e;result.reason=e.message;result.moc.reason=e.message;return result;}
}
export function mocProfilePlots(r,fraction=1){
 if(!r.moc?.rows.length)return [];
 requireValue(Number.isFinite(fraction)&&fraction>=0&&fraction<=1,'Profile station x/L must be between 0 and 1.');
 const rows=r.moc.rows,target=Math.min(rows.at(-1).x,r.geometry.end*Math.max(0,Math.min(1,fraction))),row=rows.reduce((a,b)=>Math.abs(a.x-target)<Math.abs(b.x-target)?a:b);
 return [['M','Mach number','M',z=>z.M],['p','Static pressure','p (kPa)',z=>z.p/1000],['T','Static temperature','T (K)',z=>z.T],['rho','Density','ρ (kg/m³)',z=>z.rho],['u','Flow speed','u (m/s)',z=>z.u],['theta','Flow direction','θ (°)',z=>z.theta*180/Math.PI]].map(([key,label,unit,value])=>({key:'moc-'+key,label:'Cross-channel '+label.toLowerCase(),chart:{title:label+' · x = '+Number(row.x.toPrecision(5))+' m',xlabel:'Height y (m)',ylabel:unit,zeroBaseline:false,series:[{name:label,points:row.M.map((_,j)=>[row.lower+(row.upper-row.lower)*j/(row.M.length-1),value(mocState(r,row,j))])}]},note:'Numerical characteristic field; resolution controls interpolation error.'}));
}
