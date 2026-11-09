"""Independent SciPy checks for attached-wave tracking (SI; no JS solver imports)."""
import json
from math import sin,cos,tan,atan,sqrt,asin,pi
from pathlib import Path
from scipy.optimize import brentq, minimize_scalar
G=1.4; R=287.; RAD=pi/180

def nu(m):
    a=sqrt(m*m-1)
    return sqrt((G+1)/(G-1))*atan(sqrt((G-1)/(G+1))*a)-atan(a)

def shock(m,turn):
    mu=asin(1/m)
    def theta(beta):return atan(2/tan(beta)*(m*m*sin(beta)**2-1)/(m*m*(G+cos(2*beta))+2))
    peak=minimize_scalar(lambda b:-theta(b),bounds=(mu,pi/2),method='bounded').x
    beta=brentq(lambda b:theta(b)-turn,mu+1e-12,peak,xtol=1e-14)
    mn=m*sin(beta);p=1+2*G/(G+1)*(mn*mn-1);rho=(G+1)*mn*mn/((G-1)*mn*mn+2)
    m2=sqrt((1+(G-1)*mn*mn/2)/(G*mn*mn-(G-1)/2))/sin(beta-turn)
    return dict(M=m2,p=p,T=p/rho,beta=beta)

# Lower wall +5 degrees, upper wall horizontal: four successive shocks.
# This comparison reaches the exit after three wall reflections.
m=3.;p=100000.;T=300.;a=0.;x=0.;y=0.;side=1;refs=[]
for i,target in enumerate([5*RAD,0.,5*RAD,0.]):
    z=shock(m,abs(target-a));angle=a+side*z['beta']
    m,p,T=z['M'],p*z['p'],T*z['T']
    refs.append(dict(event=i+1,x=x,y=y,M=m,p=p,T=T,beta=z['beta'],theta=target))
    if side>0:
        x=x+(1-y)/tan(angle);y=1.
    else:
        # Lower wall y=x*tan(5 degrees).
        x=(y-tan(angle)*x)/(tan(5*RAD)-tan(angle));y=x*tan(5*RAD)
    a=target;side=-side

def expanded(total_turn):
    m=brentq(lambda m:nu(m)-nu(3.)-total_turn,3.,20.,xtol=1e-14)
    t=(1+(G-1)*9/2)/(1+(G-1)*m*m/2)
    return dict(M=m,p=100000*t**(G/(G-1)),T=300*t)

out=dict(reflections=refs,symmetricFans=dict(centre=expanded(6*RAD),wall=expanded(9*RAD)))
Path(__file__).with_suffix('.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
