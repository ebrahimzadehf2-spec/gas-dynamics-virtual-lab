import {fannoRatios,rayleighRatios,normalShock,turnAngle,isentropic,deg} from './physics.js';
export function sonicRelations(kind,M,g=1.4){
 const r=(kind==='fanno'?fannoRatios:rayleighRatios)(M,g);
 const entropyToStar=Math.log(r.p)-g/(g-1)*Math.log(r.T);
 return {...r,M,entropyToStar:Math.abs(entropyToStar)<1e-13?0:entropyToStar};
}
export function ductReferenceTable(kind,result,g){
 const stations=[['Inlet',result.s1],...(result.s2?[['Outlet',result.s2]]:[])];
 const values=stations.map(([,s])=>sonicRelations(kind,s.M,g));
 const props=[['Mach number M','M'],...(kind==='rayleigh'?[['T₀/T₀*','T0']]:[]),['T/T*','T'],['p/p*','p'],['p₀/p₀*','p0'],...(kind==='rayleigh'?[['ρ/ρ*','rho']]:[['u/u*','u']]),...(kind==='fanno'?[['4fꜰL*/D = fᴅL*/D','F']]:[]),['(s* − s)/R','entropyToStar']];
 return {title:kind==='fanno'?'Fanno Flow Relations':'Rayleigh Flow Relations',columns:stations.map(([name])=>name),rows:props.map(([label,key])=>({label,values:values.map(r=>r[key])})),note:kind==='fanno'?'* denotes M = 1 on the same Fanno line. fꜰ is the Fanning factor; fᴅ = 4fꜰ. L* is the remaining sonic length.':'* denotes M = 1 on the same Rayleigh line.'};
}
export function conicalRelations(result,M,g){
 const shock=normalShock(M*Math.sin(result.beta),g),surface=result.surface;
 return {surfaceMach:surface.M,coneAngle:result.thetaConeDeg,waveAngle:deg(result.beta),shockTurn:deg(turnAngle(M,result.beta,g)),postShockMach:result.Mpost,p2p1:shock.p,p02p01:shock.p0,rho2rho1:shock.rho,T2T1:shock.T,pcp1:surface.p,p0cp01:surface.p*isentropic(surface.M,g).p0p/isentropic(M,g).p0p,rhocRho1:surface.rho,TcT1:surface.T};
}
export function coneReferenceTable(r){return {title:'Conical Shock Relations',columns:['Value'],rows:[['Surface Mach M꜀',r.surfaceMach],['Cone angle θ꜀ (°)',r.coneAngle],['Wave angle β (°)',r.waveAngle],['Shock turn angle δ (°)',r.shockTurn],['Post-shock Mach M₂',r.postShockMach],['p₂/p₁',r.p2p1],['p₀₂/p₀₁',r.p02p01],['ρ₂/ρ₁',r.rho2rho1],['T₂/T₁',r.T2T1],['p꜀/p₁',r.pcp1],['p₀꜀/p₀₁',r.p0cp01],['ρ꜀/ρ₁',r.rhocRho1],['T꜀/T₁',r.TcT1]].map(([label,value])=>({label,values:[value]})),note:'1: freestream · 2: immediately behind shock · c: cone surface. All angles are in degrees.'};}
