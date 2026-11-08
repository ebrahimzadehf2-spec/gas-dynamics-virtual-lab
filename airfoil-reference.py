"""Independent SciPy reference: sequential shock/expansion states and polygon pressure forces."""
import math,json
from pathlib import Path
from scipy.optimize import brentq,minimize_scalar

def solve(M,alpha,thickness=0,peak=.5,camber=0,gamma=1.4):
 a=math.radians(alpha);g=gamma;q=.5*g*M*M
 points=[[(0.,0.),(peak,camber+thickness/2),(1.,0.)],[(0.,0.),(peak,camber-thickness/2),(1.,0.)]] if thickness else [[(0.,0.),(1.,0.)],[(0.,0.),(1.,0.)]]
 def pm(m):return math.sqrt((g+1)/(g-1))*math.atan(math.sqrt((g-1)/(g+1)*(m*m-1)))-math.atan(math.sqrt(m*m-1))
 def turn(m,b):return math.atan(2/math.tan(b)*(m*m*math.sin(b)**2-1)/(m*m*(g+math.cos(2*b))+2))
 output=[]
 for side,vertices in enumerate(points):
  m,p,t,direction=M,1.,1.,a
  for start,end in zip(vertices,vertices[1:]):
   theta=math.atan2(end[1]-start[1],end[0]-start[0]);delta=theta-direction;d=abs(delta)
   if d<1e-12:pass
   elif delta*(1 if side==0 else -1)>0:
    mu=math.asin(1/m);maximum=minimize_scalar(lambda b:-turn(m,b),bounds=(mu,math.pi/2),method='bounded')
    beta=brentq(lambda b:turn(m,b)-d,mu,maximum.x,xtol=1e-14);mn=m*math.sin(beta)
    pressure=1+2*g/(g+1)*(mn*mn-1);density=(g+1)*mn*mn/((g-1)*mn*mn+2)
    m=math.sqrt((1+(g-1)*mn*mn/2)/(g*mn*mn-(g-1)/2))/math.sin(beta-d);p*=pressure;t*=pressure/density
   else:
    target=pm(m)+d;next_m=brentq(lambda z:pm(z)-target,m,1000,xtol=1e-13);ratio=(1+(g-1)*m*m/2)/(1+(g-1)*next_m*next_m/2);p*=ratio**(g/(g-1));t*=ratio;m=next_m
   output.append({'side':side,'start':start,'end':end,'M':m,'Cp':(p-1)/q,'p':p,'T':t});direction=theta
 fx=fy=cm=0.
 for panel in output:
  start,end=panel['start'],panel['end']
  if panel['side']==1:start,end=end,start
  dfx=panel['Cp']*(end[1]-start[1]);dfy=-panel['Cp']*(end[0]-start[0]);fx+=dfx;fy+=dfy
  cm+=.5*(start[1]+end[1])*dfx-(.5*(start[0]+end[0])-.25)*dfy
 return {'M':M,'alpha':alpha,'thickness':thickness,'peak':peak,'camber':camber,'gamma':g,'CL':-fx*math.sin(a)+fy*math.cos(a),'CD':fx*math.cos(a)+fy*math.sin(a),'CM':cm,'panels':output}

if __name__=='__main__':
 data=[solve(2,5),solve(3,4,.08),solve(2.5,2,.1,.4,.015),solve(4,-3,.06,.6,0,5/3)]
 Path(__file__).with_suffix('.json').write_text(json.dumps(data,indent=2)+'\n');print([(x['CL'],x['CD'],x['CM'])for x in data])
