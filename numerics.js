export class PhysicsError extends Error { constructor(code,message){super(message);this.code=code;} }
export function requireValue(condition,message,code='invalid-input'){if(!condition)throw new PhysicsError(code,message);}
export function finite(...x){return x.every(Number.isFinite);}
export function positive(x,label){requireValue(Number.isFinite(x)&&x>0,`${label} must be finite and positive.`);}
export function gas(g,R=287){requireValue(finite(g,R)&&g>1&&R>0,'Require γ > 1 and R > 0.');return {gamma:g,R,cp:g*R/(g-1)};}
export const rad=d=>d*Math.PI/180;
export const deg=r=>r*180/Math.PI;
export function bisect(f,a,b,{xtol=2e-13,ftol=1e-12,max=180}={}){
 let fa=f(a),fb=f(b);requireValue(finite(a,b,fa,fb)&&a<=b,'Root endpoints must be finite and ordered.','invalid-bracket');
 if(Math.abs(fa)<=ftol)return {value:a,residual:fa,iterations:0};
 if(Math.abs(fb)<=ftol)return {value:b,residual:fb,iterations:0};
 requireValue(Math.sign(fa)!==Math.sign(fb),'No sign change inside the physical interval.','unbracketed');
 for(let i=1;i<=max;i++){let x=(a+b)/2,fx=f(x);requireValue(finite(fx),'Non-finite root residual.','nonfinite');
  if(Math.abs(fx)<=ftol||b-a<=xtol*Math.max(1,Math.abs(x)))return {value:x,residual:fx,iterations:i};
  if(Math.sign(fa)!==Math.sign(fx)){b=x;fb=fx;}else{a=x;fa=fx;}}
 throw new PhysicsError('nonconverged','Root iteration limit reached.');
}
export function maximum(f,a,b){for(let i=0;i<110;i++){let c=a+(b-a)/3,d=b-(b-a)/3;if(f(c)<f(d))a=c;else b=d;}let x=(a+b)/2;return{x,y:f(x)};}
export function linspace(a,b,n=160){return Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));}
