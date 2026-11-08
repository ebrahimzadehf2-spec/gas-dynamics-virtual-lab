import {cornerContourColor,cornerPalette} from './corner-graphics.js?v=20261108-flow-arrows';
export function airfoilDrawing(s,{txt,line,poly,fmt,incidenceGlyph}){
 const available=s.models.includes('nonlinear')&&s.nonlinear.status==='ok',model=available?'nonlinear':s.models.includes('linear')?'linear':null,z=model?s[model]:null;
 const L=420,V=p=>[118+p.x*L,150-p.y*L],cps=z?.panels.map(p=>p.Cp)??[],min=Math.min(...cps),max=Math.max(...cps),color=v=>cornerContourColor(max-min<1e-12?.5:(v-min)/(max-min));
 let inner=incidenceGlyph(s.alpha,24,115,65,'#263c4d');
 // Rays are local wave sketches only; the surface solution does not resolve their interactions.
 if(available)for(const w of s.nonlinear.waves){if(w.kind==='No wave')continue;const [x,y]=V(w.origin),sign=w.side==='Upper'?1:-1,angles=w.kind==='Oblique shock'?[w.before.theta+sign*w.beta]:[w.before.theta+sign*Math.asin(1/w.before.M),w.after.theta+sign*Math.asin(1/w.after.M)];for(const a of angles)inner+=line(x,y,x+90*Math.cos(a),y-90*Math.sin(a),w.kind==='Oblique shock'?'#000000':'#3976a2',w.kind==='Oblique shock'?1.8:1.2);}
 const body=[...s.geometry.upper,...s.geometry.lower.slice().reverse()].map(V);inner+=poly(body,'#d8dfe1','#263c4d',1.8);
 if(z)for(const p of z.panels){const sign=p.side==='Upper'?1:-1,nx=-Math.sin(p.theta)*sign,ny=-Math.cos(p.theta)*sign,[ax,ay]=V(p.a),[bx,by]=V(p.b),width=8;inner+=poly([[ax,ay],[bx,by],[bx+width*nx,by+width*ny],[ax+width*nx,ay+width*ny]],color(p.Cp));inner+=line(ax,ay,bx,by,'#263c4d',1.5);const mx=(ax+bx)/2,my=(ay+by)/2;inner+=txt(mx+nx*23,my+ny*23+5,p.id,'#17212b',15,'middle');const ex=mx+12*Math.cos(p.theta),ey=my-12*Math.sin(p.theta);inner+=poly([[ex+nx*12,ey+ny*12],[ex-7*Math.cos(p.theta)+nx*15,ey+7*Math.sin(p.theta)+ny*15],[ex-7*Math.cos(p.theta)+nx*9,ey+7*Math.sin(p.theta)+ny*9]],'#263c4d');}
 inner+=txt(320,31,`${s.geometry.panels.length} surface panels · α = ${fmt(s.alpha*180/Math.PI,4)}°`,'#17212b',16,'middle')+txt(118,230,'LE · x/c = 0','#263c4d',13)+txt(538,230,'TE · x/c = 1','#263c4d',13,'end')+line(118,242,538,242,'#81909a',1,'4 3');
 inner+=txt(320,277,model?`${model==='nonlinear'?'Shock–Expansion':'Linearized'} surface Cp`:'No accepted shock–expansion surface state','#263c4d',14,'middle');
 return {inner,label:'Supersonic airfoil · analytical surface solution',meta:'Colored strips: panel Cp · local wave rays · body-fixed geometry',field:model?{quantity:'cp',options:['cp'],label:'Surface pressure coefficient Cp',min,max,units:'Cp',note:model==='nonlinear'?'Shock–Expansion surface panels':'Linearized surface panels',palette:cornerPalette}:null};
}
