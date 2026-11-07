import {finite,requireValue} from './numerics.js';
// Computational interface ranges, not physical validity limits of a real gas.
const limits={foundations:{min:0,max:50,sliderMin:0,sliderMax:10},normal:{min:1,max:50,sliderMin:1,sliderMax:10},balances:{min:.1,max:50,sliderMin:.1,sliderMax:10},rayleigh:{min:.1,max:50,sliderMin:.1,sliderMax:10},fanno:{min:.1,max:50,sliderMin:.1,sliderMax:10},oblique:{min:1.000001,max:20,sliderMin:1.01,sliderMax:10},expansion:{min:1,max:20,sliderMin:1,sliderMax:10},collision:{min:1.000001,max:20,sliderMin:1.01,sliderMax:10},linear:{min:1.1,max:20,sliderMin:1.1,sliderMax:10},cone:{min:1.2,max:10,sliderMin:1.2,sliderMax:6},nozzle:{min:.01,max:20,sliderMin:.01,sliderMax:10}};
export function machFields(id,x={}){
 if(id==='tube')return [];
 if(id==='balances')return x.balanceMode==='Solve outlet speed'?['M1']:['M1','M2'];
 if(id==='nozzle')return ['Diverging','diverging'].includes(x.nozzleType)?['MIn']:[];
 return [['foundations','linear','cone'].includes(id)?'M':'M1'];
}
export function expandedInput(id,field){
 if(!['M','M1','M2','MIn'].includes(field.key)||!limits[id])return field;
 const range=limits[id];return {...field,...range,help:`Slider: ${range.sliderMin}–${range.sliderMax}. Type a Mach number up to ${range.max}. Fixed heat capacities are assumed, including at high Mach.`};
}
export function validateMachInputs(id,x){
 for(const key of machFields(id,x)){
  const {min,max}=limits[id];requireValue(finite(x[key])&&x[key]>=min&&x[key]<=max,`${key} must be between ${min} and ${max} for this laboratory. The slider covers only the usual working range.`);
 }
}
