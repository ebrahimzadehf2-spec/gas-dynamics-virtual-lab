"""Independent SciPy/ideal-gas limiting shock-fan match, no JS solver imports."""
import math, json
from scipy.optimize import brentq, minimize_scalar
G=1.4

def nu(m):
    return math.sqrt((G+1)/(G-1))*math.atan(math.sqrt((G-1)/(G+1)*(m*m-1)))-math.atan(math.sqrt(m*m-1))
def turn(m,b):
    return math.atan(2/math.tan(b)*(m*m*math.sin(b)**2-1)/(m*m*(G+math.cos(2*b))+2))
def jump(m,d):
    mu=math.asin(1/m)
    bm=minimize_scalar(lambda b:-turn(m,b),bounds=(mu,math.pi/2),method='bounded').x
    b=brentq(lambda b:turn(m,b)-d,mu+1e-13,bm,xtol=1e-14)
    mn=m*math.sin(b); pp=1+2*G/(G+1)*(mn*mn-1); rr=(G+1)*mn*mn/((G-1)*mn*mn+2)
    m2=math.sqrt((1+(G-1)*mn*mn/2)/(G*mn*mn-(G-1)/2))/math.sin(b-d)
    return m2,pp,pp/rr,b

def fan(m,d):
    m2=brentq(lambda a:nu(a)-nu(m)-d,m,50)
    tt=(1+(G-1)*m*m/2)/(1+(G-1)*m2*m2/2)
    return m2,tt**(G/(G-1)),tt
D=math.radians(2)
l=jump(3,D);u=fan(3,D)
phi=brentq(lambda phi:math.log(l[1]*fan(l[0],phi-D)[1]/(u[1]*jump(u[0],phi-D)[1])),D+1e-9,math.radians(8),xtol=1e-14)
out=jump(u[0],phi-D)
result={'description':'Uniform limiting states after complete incident fan/shock interaction, before wall reflection. Direct pressure/direction matching, independently computed with SciPy.','upstream':{'M':u[0],'p':100000*u[1],'T':300*u[2],'theta':D},'downstream':{'M':out[0],'p':100000*u[1]*out[1],'T':300*u[2]*out[2],'theta':phi},'beta':out[3]}
with open('channel-moc-shocks-reference.json','w') as f:json.dump(result,f,indent=2)
print(json.dumps(result,indent=2))
