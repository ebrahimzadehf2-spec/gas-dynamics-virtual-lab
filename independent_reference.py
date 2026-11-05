"""Independent SciPy reference: no JavaScript engine or notebook training imported.
Run: python tests/independent_reference.py
Regenerates tests/reference.json; then npm test checks JS against these values.
"""
import json, math
from pathlib import Path
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

g=1.4
def rayleigh(M,T,q):
    cp=g*287/(g-1)
    # Independent quadratic in z=M² derived from T0/T0*.
    t01=T*(1+(g-1)*M*M/2)
    ratio=lambda m: 2*(g+1)*m*m*(1+(g-1)*m*m/2)/(1+g*m*m)**2
    target=(t01+q/cp)/(t01/ratio(M))
    A=target*g*g-(g*g-1)
    B=2*target*g-2*(g+1)
    C=target
    disc=B*B-4*A*C
    roots=[(-B+math.sqrt(disc))/(2*A),(-B-math.sqrt(disc))/(2*A)]
    return math.sqrt(next(z for z in roots if z>0 and (z<1)==(M<1)))

def cone_beta(M,theta_deg):
    target=math.radians(theta_deg)
    def trajectory(beta):
        # Normal-shock mass/momentum; radial velocity unchanged.
        w1=M/math.sqrt(M*M+2/(g-1))
        dens=(g+1)*M*M*math.sin(beta)**2/((g-1)*M*M*math.sin(beta)**2+2)
        y0=[w1*math.cos(beta),-w1*math.sin(beta)/dens]
        def rhs(t,y):
            F,G=y; a=.5*(g-1)*(1-F*F-G*G)
            # Algebraically different form from the JS implementation.
            return [G,-F+a*(F+G/math.tan(t))/(G*G-a)]
        def event(t,y): return y[1]
        event.terminal=True
        event.direction=1
        sol=solve_ivp(rhs,[beta,1e-5],y0,events=event,rtol=2e-12,atol=2e-13,max_step=.0008,method='DOP853')
        if not len(sol.t_events[0]): raise ValueError('missing surface')
        t=sol.t_events[0][0]; F,G=sol.y_events[0][0]
        mc=math.sqrt((F*F+G*G)/(.5*(g-1)*(1-F*F-G*G)))
        return t,mc
    mu=math.asin(1/M)
    last=None
    for k in range(1,200):
        b=mu+(.8-mu)*k/200
        try: t,mc=trajectory(b)
        except (ValueError,ZeroDivisionError): continue
        f=t-target
        if last and last[1]*f<0:
            beta=brentq(lambda a:trajectory(a)[0]-target,last[0],b,xtol=2e-13)
            tc,mc=trajectory(beta)
            # Energy gives surface T/Tinf; stagnation pressure includes shock loss.
            mn=M*math.sin(beta)
            pr=1+2*g/(g+1)*(mn*mn-1)
            rho=(g+1)*mn*mn/((g-1)*mn*mn+2)
            delta=math.atan(2/math.tan(beta)*(mn*mn-1)/(M*M*(g+math.cos(2*beta))+2))
            mn2=math.sqrt((1+.5*(g-1)*mn*mn)/(g*mn*mn-.5*(g-1)))
            m2=mn2/math.sin(beta-delta)
            tr=(1+.5*(g-1)*M*M)/(1+.5*(g-1)*mc*mc)
            pc=pr*((1+.5*(g-1)*m2*m2)/(1+.5*(g-1)*mc*mc))**(g/(g-1))
            return {'M':M,'thetaCone':theta_deg,'betaDeg':math.degrees(beta),'surfaceM':mc,'surfaceT':tr,'surfaceP':pc}
        last=(b,f)
    raise ValueError('root not bracketed')

out={'method':'Independent quadratic Rayleigh inverse; SciPy DOP853 + Brent cone solve',
     'rayleigh':[{'M1':m,'q':q,'M2':rayleigh(m,300,q)} for m,q in [(.5,100000),(.5,-10000),(2,100000),(2,-10000)]],
     'cone':[cone_beta(2,10),cone_beta(2.35,10),cone_beta(3,15)]}
Path(__file__).with_name('reference.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
