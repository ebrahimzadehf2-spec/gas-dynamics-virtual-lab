// Contrast-aware plain SVG labels. Only the authored SVG paint order is inspected.
const attributes=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const luminance=hex=>{let s=hex.slice(1);if(s.length===3)s=[...s].map(c=>c+c).join('');const c=[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
export const textContrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
export const readableInk=background=>textContrast('#ffffff',background)>=textContrast('#000000',background)?'#ffffff':'#000000';
const contains=(shape,x,y)=>{
 if(shape.type==='rect')return x>=shape.x&&x<=shape.x+shape.w&&y>=shape.y&&y<=shape.y+shape.h;
 let inside=false;const p=shape.points;
 for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}
 return inside;
};
export function readableSceneLabels(svg){
 const shapes=[],clips=new Map(),groups=[[]];let defs=0,currentClip=null;
 const background=(x,y)=>{for(let i=shapes.length-1;i>=0;i--){const s=shapes[i];if(contains(s,x,y)&&s.clips.every(id=>(clips.get(id)??[]).some(c=>contains(c,x,y))))return s.fill;}return '#f8fbf6';};
 return svg.replace(/<[^>]+>/g,(tag,offset)=>{
  const match=tag.match(/^<(\/?)([\w:-]+)/);if(!match)return tag;const [,end,type]=match,a=attributes(tag);
  if(type==='defs'){defs+=end?-1:1;return tag;}
  if(type==='clipPath'){if(end)currentClip=null;else{currentClip=a.id;clips.set(a.id,[]);}return tag;}
  if(type==='g'){if(end)groups.pop();else{const id=a['clip-path']?.match(/^url\(#([^)]*)\)$/)?.[1];groups.push([...groups.at(-1),...(id?[id]:[])]);}return tag;}
  if(type==='polygon'||type==='rect'){
   const shape=type==='rect'?{type,x:+(a.x??0),y:+(a.y??0),w:+a.width,h:+a.height}:{type,points:(a.points??'').trim().split(/\s+/).map(p=>p.split(',').map(Number))};
   if(currentClip)clips.get(currentClip).push(shape);
   else if(!defs&&a.fill&&a.fill!=='none'&&a.fill!=='transparent'){
    const fill=/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(a.fill)?a.fill:a.fill.startsWith('url(')?'#f2f5f0':null;
    if(fill)shapes.push({...shape,fill,clips:[...groups.at(-1)]});
   }
  }
  if(type!=='text'||end||defs)return tag;
  const content=svg.slice(offset+tag.length).split('<',1)[0],plain=content.replace(/&[^;]+;/g,'x'),numeric=/[0-9]/.test(plain),mach=/^M[₀₁₂₃₄₅₆₇₈₉꜀]?\s/.test(plain);
  const size=Math.max(+(a['font-size']??12),mach?24:numeric?16:14),width=[...plain].length*size*.51,x=+(a.x??0),y=+(a.y??0)-size*.36;
  const center=a['text-anchor']==='middle'?x:a['text-anchor']==='end'?x-width/2:x+width/2;
  const samples=[background(center-width*.25,y),background(center,y),background(center+width*.25,y)],white=samples.reduce((sum,b)=>sum+Math.log(textContrast('#ffffff',b)),0),black=samples.reduce((sum,b)=>sum+Math.log(textContrast('#000000',b)),0),ink=white>=black?'#ffffff':'#000000';
  return tag.replace(/fill="[^"]*"/,`fill="${ink}"`).replace(/font-size="[^"]*"/,`font-size="${size}"`).replace(/>$/,` font-weight="400" font-variant-numeric="tabular-nums">`);
 });
}
