// Playback of steady solutions: demo progress is not physical time.
import {nozzle,shockLimit,normalShock} from './physics.js?v=20261107-shock-states';
export function pressureSweepPlan(x={}){
 const type=x.nozzleType??'Converging–diverging',g=x.gamma??1.4,inlet=x.MIn??.3;
 if(type==='Diverging'&&(inlet<1||inlet===1&&x.sonicBranch==='subsonic'))return {enabled:false,min:.001,max:1,milestones:[],message:'A fixed subsonic inlet admits one matched outlet pressure. Change the inlet state to study other pressures; this model cannot sweep it independently.'};
 if(type==='Diverging'&&x.outletCondition!=='Specified back pressure')return {enabled:false,canEnable:true,min:.001,max:1,milestones:[],message:'Select Specified back pressure to sweep the pressure at this fixed inlet Mach.'};
 const s=nozzle({nozzleType:type,areaRatio:x.areaRatio??2,contractionRatio:x.contractionRatio??2,MIn:x.MIn??.3,sonicBranch:x.sonicBranch??'supersonic',outletCondition:'Matched isentropic',backRatio:.001,gamma:g});
 const max=type==='Diverging'?Math.min(1,s.inletShock):1,min=Math.min(.001,max/100);let marks=[];
 const add=(pressure,label)=>{if(Number.isFinite(pressure)&&pressure>=min&&pressure<=max)marks.push({pressure,label});};
 add(min,'Low back pressure');
 if(type==='Converging'){
  add(s.onset,'Sonic exit · choking limit');add((s.onset+1)/2,'Unchoked subsonic flow');
 }else{
  add(s.design,'Pressure-matched supersonic exit');
  const me=nozzle({nozzleType:type,areaRatio:x.areaRatio??2,MIn:x.MIn??.3,sonicBranch:x.sonicBranch??'supersonic',backRatio:min,gamma:g}).Me;
  if(me>1){const weak=s.design*normalShock(me*Math.sin(shockLimit(me,g).beta),g).p;add((s.design+weak)/2,'External weak oblique shock');add(weak,'Weak attached-shock limit');}
  add(s.exitShock,'Normal shock at exit');
  add((s.exitShock+(type==='Diverging'?s.inletShock:s.onset))/2,'Internal normal shock');
  if(type==='Diverging')add(s.inletShock,'Shock at inlet · fixed-inlet limit');
  else{add(s.onset,'Sonic throat · subsonic exit');add((s.onset+1)/2,'Unchoked subsonic flow');}
 }
 add(max,type==='Diverging'?'Fixed-inlet pressure limit':'No flow · equal reservoir/back pressure');
 marks.sort((a,b)=>a.pressure-b.pressure);marks=marks.filter((m,i)=>i===0||Math.abs(m.pressure-marks[i-1].pressure)>1e-12);
 return {enabled:true,min,max,milestones:marks,message:type==='Diverging'?'Stops at the shock-at-inlet limit; the prescribed inlet Mach cannot be maintained above it.':'Geometry and inlet stagnation conditions stay fixed; only back pressure changes.'};
}
export function advancePressure(value,plan,direction,step){
 if(!plan.enabled||![1,-1].includes(direction)||!Number.isFinite(value)||!Number.isFinite(step)||step<=0)throw new Error('Invalid pressure sweep step.');
 const clamped=Math.min(plan.max,Math.max(plan.min,value)),target=Math.min(plan.max,Math.max(plan.min,clamped+direction*step));
 const crossed=plan.milestones.filter(m=>(m.pressure-clamped)*direction>1e-12&&(m.pressure-target)*direction<=1e-12).sort((a,b)=>direction*(a.pressure-b.pressure));
 const pressure=crossed[0]?.pressure??target,boundary=direction===1?plan.max:plan.min;
 return {pressure,milestone:crossed[0]??null,ended:Math.abs(pressure-boundary)<=1e-12};
}
