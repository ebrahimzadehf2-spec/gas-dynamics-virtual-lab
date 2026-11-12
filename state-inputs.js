import {isentropic,nozzle} from './physics.js';
const total=type=>String(type).startsWith('Stagnation');
export const stateInputDefaults={nozzlePressureType:'Stagnation pressure',nozzleTemperatureType:'Stagnation temperature',driverPressureType:'Static pressure',driverTemperatureType:'Static temperature',supplyTemperatureType:'Stagnation temperature',inverseTemperatureType:'Stagnation temperature',outletTemperatureType:'Stagnation temperature',outletPressureType:'Static pressure'};
const reference=x=>x.ductSolve==='Upstream reference + sonic outlet'||x.ductProblem==='Upstream adjustment to sonic outlet';
// Each selector belongs to one section and one dimensional quantity. Ratios keep
// their explicit numerator/denominator definitions.
export function stateInputFields(id,x,fields){
 const existing=new Set(fields.map(f=>f.key)),out=[];
 for(const f of fields){let typeKey,kind,base=f.label,def;
  if(f.key==='p1'&&!reference(x)){typeKey='inletPressureType';kind='pressure';def='Static pressure';}
  if(f.key==='T1'&&!reference(x)){typeKey='temperatureInput';kind='temperature';def='Static temperature';}
  if(f.key==='p4'){typeKey='driverPressureType';kind='pressure';def='Static pressure';}
  if(f.key==='T4'){typeKey='driverTemperatureType';kind='temperature';def='Static temperature';}
  if(f.key==='p0'){typeKey='nozzlePressureType';kind='pressure';def='Stagnation pressure';base='Inlet pressure';}
  if(f.key==='T0'){typeKey='nozzleTemperatureType';kind='temperature';def='Stagnation temperature';base='Inlet temperature';}
  if(f.key==='reservoirP0'){typeKey='reservoirPressureType';kind='pressure';def='Stagnation pressure';base=x.ductProblem==='Duct shock location'?'Duct inlet pressure':'Supply reference pressure';}
  if(f.key==='reservoirT0'){typeKey='supplyTemperatureType';kind='temperature';def='Stagnation temperature';base=x.ductProblem==='Duct shock location'?'Duct inlet temperature':'Supply reference temperature';}
  if(f.key==='inletT0'&&id==='fanno'&&!reference(x)&&!existing.has('temperatureInput')){typeKey='inverseTemperatureType';kind='temperature';def='Stagnation temperature';base='Inlet temperature';}
  if(f.key==='outletT0'){typeKey='outletTemperatureType';kind='temperature';def='Stagnation temperature';base='Outlet temperature';}
  if(f.key==='backPressure'&&(x.ductProblem==='Heat + shock + converging nozzle'||x.ductSolve==='Outlet Mach + outlet pressure'||x.ductProblem==='CD nozzle minimum supply pressure')){typeKey='outletPressureType';kind='pressure';def='Static pressure';base=id==='rayleigh'&&x.ductProblem==='Heat + shock + converging nozzle'?'Sonic nozzle exit pressure':'Outlet pressure';}
  if(!typeKey){out.push(f);continue;}
  const value=x[typeKey]??def;
  if(!existing.has(typeKey)){out.push({key:typeKey,label:base.replace(/\b(static|stagnation)\s*/ig,'').trim()+' type',value:def,options:[`Static ${kind}`,`Stagnation ${kind}`]});existing.add(typeKey);}
  // Existing forward duct controls deliberately use inletT0 instead of T1.
  out.push({...f,label:base.replace(/\b(static|stagnation)\s*/ig,'').replace(new RegExp(kind,'i'),`${total(value)?'stagnation':'static'} ${kind}`)});
 }
 if(id==='rayleigh'&&x.ductProblem==='Reservoir-fed duct'&&existing.has('reservoirP0')&&(x.reservoirPressureType==='Static pressure'||x.supplyTemperatureType==='Static temperature')&&!existing.has('supplyReferenceMach')){
  const k=out.findIndex(f=>f.key==='reservoirT0');out.splice(k,0,{key:'supplyReferenceMach',label:'Supply reference Mach',value:.4,min:.000001,max:id==='rayleigh'&&x.ductProblem==='Reservoir-fed duct'?.999999:50,step:.01,unit:'Mref'});
 }
 return out;
}
export function normalizeStateInputs(id,raw){
 if(raw._stateInputsResolved)return raw;
 let x={...raw,_stateInputsResolved:true};const g=x.gamma??1.4;
 if(['rayleigh','fanno'].includes(id))return x; // Mach may still be unknown; handled with duct equations.
 if(id==='nozzle'){
  const M=x.nozzleType==='Diverging'?x.MIn:nozzle({...x,p0:100000,T0:400,minArea:.0006}).points[0].M;
  const iso=isentropic(M,g);
  if(x.nozzlePressureType==='Static pressure')x.p0*=iso.p0p;
  if(x.nozzleTemperatureType==='Static temperature')x.T0*=iso.T0T;
  x.nozzlePressureType='Stagnation pressure';x.nozzleTemperatureType='Stagnation temperature';return x;
 }
 const M=id==='tube'?0:['foundations','airfoil','cone','linear'].includes(id)?x.M:x.M1;
 if(Number.isFinite(M)){
  const iso=isentropic(M,g);
  if(total(x.inletPressureType))x.p1/=iso.p0p;
  if(total(x.temperatureInput))x.T1/=iso.T0T;
 }
 x.inletPressureType='Static pressure';x.temperatureInput='Static temperature';
 // Both shock-tube chambers are initially at rest: static and total coincide.
 return x;
}
