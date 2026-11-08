// Select the closest plotted sample in screen-scaled chart coordinates.
export function nearestChartPoint(chart,a,x,y){
 let best=null;
 for(const series of chart.series)for(const p of series.points){
  if(!p.every(Number.isFinite))continue;
  const cx=a.L+(p[0]-a.xmin)/(a.xmax-a.xmin)*(a.W-a.L-a.R),cy=a.H-a.B-(p[1]-a.ymin)/(a.ymax-a.ymin)*(a.H-a.T-a.B),distance=(cx-x)**2+(cy-y)**2;
  if(!best||distance<best.distance)best={x:p[0],y:p[1],cx,cy,name:series.name,distance};
 }
 return best;
}
