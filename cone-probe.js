// Shared SVG geometry and interpolation of the Taylor–Maccoll solution.
export const coneGeometry=s=>({x:150,y:150,length:Math.min(230,110/Math.tan(s.beta))});
export function probeCone(s,inputs,x,y){
 const z=coneGeometry(s),dx=x-z.x;if(!Number.isFinite(x+y)||dx<=1e-8||dx>z.length)return null;
 const theta=Math.atan2(Math.abs(y-z.y),dx),lo=s.thetaCone,hi=s.beta;
 if(theta<lo-1e-10||theta>hi+1e-10)return null;
 const t=Math.max(lo,Math.min(hi,theta)),h=s.history;let i=0;while(i<h.length-2&&h[i+1].theta>t)i++;
 const a=h[i],b=h[i+1],f=Math.max(0,Math.min(1,(a.theta-t)/(a.theta-b.theta))),vr=a.vr+(b.vr-a.vr)*f,vt=a.vt+(b.vt-a.vt)*f,g=inputs.gamma??1.4,v2=vr*vr+vt*vt;
 const M=Math.sqrt(2*v2/((g-1)*(1-v2))),T=(1+(g-1)*inputs.M**2/2)/(1+(g-1)*M*M/2),p=h[0].p*(T/h[0].T)**(g/(g-1));
 return {theta:t*180/Math.PI,M,p,T,rho:p/T,u:M/inputs.M*Math.sqrt(T)};
}
