"""Independent attachment-boundary check using SciPy DOP853 and bounded optimization."""
import json,math
from pathlib import Path
from functools import lru_cache
from scipy.integrate import solve_ivp
from scipy.optimize import minimize_scalar,brentq

def surface_angle(M,beta,g):
    v=M/math.sqrt(M*M+2/(g-1))
    density=(g+1)*M*M*math.sin(beta)**2/((g-1)*M*M*math.sin(beta)**2+2)
    def ode(t,y):
        f,w=y;a=(g-1)*(1-f*f-w*w)/2
        return [w,-f+a*(f+w/math.tan(t))/(w*w-a)]
    def surface(t,y):return y[1]
    surface.terminal=True;surface.direction=1
    sol=solve_ivp(ode,[beta,1e-6],[v*math.cos(beta),-v*math.sin(beta)/density],method='DOP853',events=surface,rtol=1e-11,atol=1e-12,max_step=.01)
    if not len(sol.t_events[0]):raise ValueError('No surface event')
    return sol.t_events[0][0]

@lru_cache(None)
def maximum(M,g):
    mu=math.asin(1/M)
    # The interior maximum is bracketed away from both endpoint degeneracies.
    result=minimize_scalar(lambda b:-surface_angle(M,b,g),bounds=(mu+.001*(math.pi/2-mu),math.pi/2-.001*(math.pi/2-mu)),method='bounded',options={'xatol':1e-11})
    return {'M':M,'gamma':g,'thetaMaxDeg':math.degrees(-result.fun),'betaDeg':math.degrees(result.x)}

def critical(theta,g):
    M=brentq(lambda m:math.radians(maximum(m,g)['thetaMaxDeg']-theta),1.001,4,xtol=1e-10)
    return {'thetaCone':theta,'gamma':g,'Mcrit':M}

if __name__=='__main__':
    result={'maximum':[maximum(2,1.4),maximum(3,1.4),maximum(2,5/3)],'critical':[critical(10,1.4),critical(20,1.4)]}
    Path(__file__).with_suffix('.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
