import {calculate} from './labs.js?v=20261114-expansion-plots';
// Coalesce queued slider changes before starting another expensive cone calculation.
let solveTimer;
self.onmessage=({data})=>{clearTimeout(solveTimer);solveTimer=setTimeout(()=>{try{self.postMessage({request:data.request,ok:true,data:calculate(data.id,data.inputs)});}catch(e){self.postMessage({request:data.request,ok:false,error:e.message,code:e.code??'solver-error'});}},15);};
