import {diagramFontFamily,diagramFontStyle} from './diagram-font.js';
export const diagramValueSize=16;
// Apply at the shared renderer boundary, including specialized SVG renderers and
// exported images. Region IDs and chart ticks are numbers, not property values.
export function uniformDiagramText(svg){
 if(!svg)return svg;
 svg=svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g,(_,attributes,content)=>{
  let a=attributes.replace(/\sfont-family="[^"]*"/g,'');
  const plain=content.replace(/<[^>]*>/g,'');
  if(/[0-9₀₁₂₃₄₅₆₇₈₉]/.test(plain)){
   a=a.replace(/\sfont-size="[^"]*"/g,'').replace(/\sfont-weight="[^"]*"/g,'');
   a+=` font-size="${diagramValueSize}" font-weight="400"`;
   // Complete authored property/value pairs that formerly omitted the equals.
   content=content.replace(/(^|[ ·;])((?:M|p|T|ρ|u|a|A|Cₚ|Cᴸ|Cᴰ|Cₘ|ṁ|β|θ|α|φ)(?:[₀₁₂₃₄₅₆₇₈₉∞꜀]|[a-zA-Z,_/*])*)\s+(?=[+−-]?\d)/g,'$1$2 = ');
   if(/^[-+−]?\d[\d.eE+−-]*\s+(?:kPa|Pa|MPa)$/.test(content.trim()))content='p = '+content;
   if(/^[-+−]?\d[\d.eE+−-]*\s+K$/.test(content.trim()))content='T = '+content;
  }
  return `<text${a} font-family="${diagramFontFamily}">${content}</text>`;
 });
 if(!svg.includes('@font-face'))svg=svg.replace(/(<svg\b[^>]*>)/,`$1${diagramFontStyle}`);
 return svg;
}
