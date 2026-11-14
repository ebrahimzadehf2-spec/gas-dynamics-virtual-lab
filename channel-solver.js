import {customFinalMatch} from './custom-final-match.js?v=20261114-custom-final';
import {solveWaveTracker} from './wave-tracker.js';
import {regularPattern} from './regular-channel.js';
import {deg} from './physics.js';
export function channelSolverName(value){return ['Method of characteristics','Compare both'].includes(value)?value:'Shock–Expansion';}
// One public shock/expansion method: direct local jump/polar relations are
// used at each event; finite rarefaction fronts continue the downstream field.
export function solveShockExpansionChannel(x){
 const r=solveWaveTracker(x),p=regularPattern(r.geometry),e=r.tracking.events.find(e=>e.match);
 if(p&&e&&!e.approximate&&r.tracking.events.slice(0,e.index-1).every(z=>z.type==='Wall corner')&&Math.abs((x.gamma??1.4)-1.4)<1e-10){
  const first=deg(p.lower[0].theta),second=deg(p.same?p.lower[1].delta:-p.upper[0].theta);
  if(!p.same&&Math.abs(x.M1-4)<1e-9&&Math.abs(x.p1-10)<1e-9&&Math.abs(first-20)<1e-8&&Math.abs(second-10)<1e-8){
   r.bookCase=e.bookCase='6–4';e.bookRegions={'Region 1':r.s1,'Region 2':e.lower,'Region 3':e.upper,'Region 4′':e.match.a.after,'Region 4':e.match.b.after};
  }
  if(p.same&&Math.abs(x.M1-3)<1e-9&&Math.abs(x.p1-100)<1e-9&&Math.abs(first-10)<1e-8&&Math.abs(second-10)<1e-8){
   r.bookCase=e.bookCase='6–5';e.bookRegions={'Region 1':r.s1,'Region 2':r.tracking.events.find(z=>z.type==='Wall corner'&&z.side==='lower')?.after,'Region 3':e.lower,'Region 4':e.match.a.after,'Region 5':e.match.b.after};
  }
 }
 if(r.bookCase&&r.reason)r.reason=`Example ${r.bookCase} interaction solved. Downstream continuation stops: ${r.reason}`;
 r.finalStreamMatch=customFinalMatch(x,r);
 return {...r,channelMethod:'Shock–Expansion'};
}
