"""Independent SciPy centered-fan reference for the first MOC validation case."""
import math,json
from pathlib import Path
from scipy.optimize import brentq
g=1.4;M1=3;theta2=math.radians(-8);x=math.cos(theta2)
def nu(m):
 return math.sqrt((g+1)/(g-1))*math.atan(math.sqrt((g-1)/(g+1)*(m*m-1)))-math.atan(math.sqrt(m*m-1))
nu1=nu(M1);m2=brentq(lambda m:nu(m)-nu1+theta2,3,10)
probes=[]
for angle in [-8,-5,0,5,9,12,16,19,25,35]:
 a=math.radians(angle);y=x*math.tan(a)
 m=M1 if a>=math.asin(1/M1) else m2 if a<=theta2+math.asin(1/m2) else brentq(lambda m:nu1-nu(m)+math.asin(1/m)-a,M1,m2)
 t=(1+(g-1)*M1*M1/2)/(1+(g-1)*m*m/2)
 probes.append({'y':y,'M':m,'theta':nu1-nu(m),'T':300*t,'p':101000*t**(g/(g-1))})
Path('channel-moc-reference.json').write_text(json.dumps({'gamma':g,'M1':M1,'theta2':theta2,'x':x,'probes':probes},indent=2)+'\n')
