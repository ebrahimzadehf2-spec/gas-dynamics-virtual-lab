"""Independent reference from dimensional mass, momentum and energy balances.
Run python book_ch3_reference.py; no JS or normal-shock jump formula imported.
The unused upstream root is discarded; the smaller positive velocity is the shock.
"""
import json, math
from pathlib import Path

def reference(M1, T1=300.0, p1=101000.0):
    g, R = 1.4, 287.0
    cp = g*R/(g-1)
    u1 = M1*math.sqrt(g*R*T1)
    rho1 = p1/(R*T1)
    mass = rho1*u1
    momentum = p1+mass*u1
    energy = cp*T1+u1*u1/2
    a, b = .5-cp/R, cp/R*momentum/mass
    u2 = min((-b+s*math.sqrt(b*b+4*a*energy))/(2*a) for s in [-1,1])
    T2 = (energy-u2*u2/2)/cp
    p2 = momentum-mass*u2
    rho2 = mass/u2
    M2 = u2/math.sqrt(g*R*T2)
    ds_R = cp/R*math.log(T2/T1)-math.log(p2/p1)
    p01 = p1*(1+(g-1)*M1*M1/2)**(g/(g-1))
    p02 = p2*(1+(g-1)*M2*M2/2)**(g/(g-1))
    return dict(M2=M2,p=p2/p1,T=T2/T1,rho=rho2/rho1,u=u2/u1,p0=p02/p01,ds_R=ds_R,
                T2_K=T2,p2_kPa=p2/1000,p01_kPa=p01/1000,p02_kPa=p02/1000,ds_kJkgK=R*ds_R/1000)

cases = [dict(id='3-1',input=dict(M1=2,T1=277.78,p1=137.9,gamma=1.4),reference=reference(2,277.78,137900)),
         dict(id='3-2',input=dict(M1=1.8,T1=300,p1=101,gamma=1.4),
              note='T1 and p1 are arbitrary test scales; the book specifies only Mach. Accept ratios and entropy only.',reference=reference(1.8))]
out = dict(method='Dimensional conservation quadratic, compression root; Python standard library',
           gamma=1.4,R_JkgK=287,cp_JkgK=1004.5,cases=cases)
Path(__file__).with_name('book-ch3-reference.json').write_text(json.dumps(out,indent=2)+'\n')
