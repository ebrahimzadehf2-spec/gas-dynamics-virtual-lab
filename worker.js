import {calculate} from './labs.js?v=20261107-matched-sliders';
self.onmessage=({data})=>{try{self.postMessage({request:data.request,ok:true,data:calculate(data.id,data.inputs)});}catch(e){self.postMessage({request:data.request,ok:false,error:e.message,code:e.code??'solver-error'});}};
