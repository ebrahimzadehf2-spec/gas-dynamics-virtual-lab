import {gas} from './numerics.js';
// Rounded low-density ideal-gas properties at 300 K, held constant in each calculation.
// Source: https://sites.ohio.edu/urieli/thermo/property_tables/gas/idealGas.html
export const gasPresets={
 'Air':{R:287,gamma:1.4},
 'Nitrogen (N₂)':{R:296.8,gamma:1.4},
 'Oxygen (O₂)':{R:259.8,gamma:1.395},
 'Hydrogen (H₂)':{R:4124,gamma:1.405},
 'Helium (He)':{R:2076.9,gamma:1.667},
 'Argon (Ar)':{R:208.1,gamma:1.667},
 'Carbon dioxide (CO₂)':{R:188.9,gamma:1.289}
};
export const gasNames=[...Object.keys(gasPresets),'Custom gas'];
export function selectGas(x,name){if(name==='Custom gas')return {...x,fluid:name};const p=gasPresets[name];if(!p)throw new Error('Unknown working gas.');return {...x,fluid:name,...p};}
export function gasInfo(x){
 const gamma=x.gamma??1.4,R=x.R??287,{cp}=gas(gamma,R),p=gasPresets[x.fluid];
 const matches=p&&Math.abs(p.R-R)<1e-10&&Math.abs(p.gamma-gamma)<1e-10;
 return {name:matches?x.fluid:'Custom gas',gamma,R,cp,cv:cp-R,referenceTemperature:matches?300:null,model:'Calorically perfect ideal gas · fixed heat capacities'};
}
export function gasInputFields(x,id){
 const info=gasInfo(x),locked=info.name!=='Custom gas';
 return [{key:'fluid',label:'Working gas',value:'Air',options:gasNames,section:'Gas properties',help:`${locked?'Reference properties at 300 K, held constant.':'Custom properties, held constant.'} Choose Custom gas to edit γ and R.${id==='linear'?' This linearized coefficient model is independent of γ and R.':id==='cone'?' The dimensionless cone solution depends on γ, not R.':id==='tube'?' The same gas is used on both sides.':''}`},
 {key:'gamma',label:'Specific heat ratio',unit:'γ',min:1.01,max:2,step:.001,readOnly:locked},
 {key:'R',label:'Specific gas constant',unit:'J/(kg·K)',min:1,max:10000,step:1,readOnly:locked}];
}
