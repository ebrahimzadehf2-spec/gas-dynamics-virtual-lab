"""Independent SciPy pressure-root reference for manuscript examples 6-4 and 6-5."""
import math,json
from pathlib import Path
from scipy.optimize import brentq,minimize_scalar
g=1.4

def nu(m):return math.sqrt((g+1)/(g-1))*math.atan(math.sqrt((g-1)/(g+1)*(m*m-1)))-math.atan(math.sqrt(m*m-1))
def turn(m,b):return math.atan(2/math.tan(b)*(m*m*math.sin(b)**2-1)/(m*m*(g+math.cos(2*b))+2))
def shock(s,angle,theta):
 m=s['M'];mu=math.asin(1/m);limit=minimize_scalar(lambda b:-turn(m,b),bounds=(mu,math.pi/2),method='bounded').x;b=brentq(lambda b:turn(m,b)-angle,mu,limit,xtol=1e-14);mn=m*math.sin(b);p=1+2*g/(g+1)*(mn*mn-1);rho=(g+1)*mn*mn/((g-1)*mn*mn+2)
 return {'M':math.sqrt((1+(g-1)*mn*mn/2)/(g*mn*mn-(g-1)/2))/math.sin(b-angle),'p':s['p']*p,'T':s['T']*p/rho,'theta':theta,'beta':b}
def at_pressure(s,p,side):
 m=s['M'];ratio=p/s['p']
 if ratio>=1:
  mn=math.sqrt(1+(ratio-1)*(g+1)/(2*g));b=math.asin(mn/m);d=turn(m,b);rho=(g+1)*mn*mn/((g-1)*mn*mn+2)
  return {'M':math.sqrt((1+(g-1)*mn*mn/2)/(g*mn*mn-(g-1)/2))/math.sin(b-d),'p':p,'T':s['T']*ratio/rho,'theta':s['theta']+side*d}
 tr=ratio**((g-1)/g);out=math.sqrt(((1+(g-1)*m*m/2)/tr-1)*2/(g-1));return {'M':out,'p':p,'T':s['T']*tr,'theta':s['theta']-side*(nu(out)-nu(m))}
refs=[]
for number in [4,5]:
 s1={'M':4 if number==4 else 3,'p':10000 if number==4 else 100000,'T':300,'theta':0}
 s2=shock(s1,math.radians(20 if number==4 else 10),math.radians(20 if number==4 else 10))
 s3=shock(s1 if number==4 else s2,math.radians(10),math.radians(-10 if number==4 else 20))
 lower=s2 if number==4 else s3;upper=s3 if number==4 else s1
 mismatch=lambda p:at_pressure(lower,p,-1)['theta']-at_pressure(upper,p,1)['theta']
 p=brentq(mismatch,90000 if number==4 else 370000,110000 if number==4 else 390000,xtol=1e-8)
 low,up=at_pressure(lower,p,-1),at_pressure(upper,p,1)
 refs.append({'example':number,'slipAngle':math.degrees(low['theta']),'pressure':p,'canonicalRegions':{'1':s1,'2':s2,'3':s3,'4':low,'5':up}})
Path('book6-interaction-reference.json').write_text(json.dumps(refs,indent=2)+'\n');print([(r['example'],r['slipAngle'],r['pressure']/1000)for r in refs])
