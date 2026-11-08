// Place labels inside the union of a region's painted cells, ignoring internal cuts.
export function pointInPolygon([x,y],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [a,b]=poly[i],[c,d]=poly[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
export function regionLabelPosition(polygons,minimumClearance=12){
 if(!polygons.length)return null;
 const inside=p=>polygons.some(poly=>pointInPolygon(p,poly)),edges=[];
 for(const poly of polygons)for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<1e-7)continue;
  const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],nx=-dy/length*1e-4,ny=dx/length*1e-4;
  if(inside([m[0]+nx,m[1]+ny])!==inside([m[0]-nx,m[1]-ny]))edges.push([a,b]);
 }
 if(!edges.length)return null;
 const points=polygons.flat(),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
 let best=null;
 const consider=p=>{if(!inside(p))return;const clearance=Math.min(...edges.map(([a,b])=>segmentDistance(p,a,b)));if(!best||clearance>best.clearance)best={point:p,clearance};};
 for(const poly of polygons)consider(poly.reduce((s,p)=>[s[0]+p[0]/poly.length,s[1]+p[1]/poly.length],[0,0]));
 for(let i=0;i<=32;i++)for(let j=0;j<=32;j++)consider([xmin+(xmax-xmin)*i/32,ymin+(ymax-ymin)*j/32]);
 if(!best)return null;
 let step=Math.max(xmax-xmin,ymax-ymin)/32;
 for(let pass=0;pass<12;pass++){const c=best.point;for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)consider([c[0]+i*step,c[1]+j*step]);step/=2;}
 return {...best,callout:best.clearance<minimumClearance};
}
