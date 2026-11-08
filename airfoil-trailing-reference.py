"""Independent SciPy trailing-edge reference, using pressure as the match variable."""
import math,json
from pathlib import Path
from scipy.optimize import brentq

def nu(m,g):return math.sqrt((g+1)/(g-1))*math.atan(math.sqrt((g-1)/(g+1)*(m*m-1)))-math.atan(math.sqrt(m*m-1))
def at_pressure(s,p,sign,g):
 m,p1,t,theta=s['M'],s['p'],s['T'],s['theta'];ratio=p/p1
 if abs(ratio-1)<1e-13:return {'M':m,'p':p,'T':t,'theta':theta}
 if ratio>1:
  mn=math.sqrt(1+(ratio-1)*(g+1)/(2*g));beta=math.asin(mn/m)
  turn=math.atan(2/math.tan(beta)*(m*m*math.sin(beta)**2-1)/(m*m*(g+math.cos(2*beta))+2))
  density=(g+1)*mn*mn/((g-1)*mn*mn+2)
  mout=math.sqrt((1+(g-1)*mn*mn/2)/(g*mn*mn-(g-1)/2))/math.sin(beta-turn)
  return {'M':mout,'p':p,'T':t*ratio/density,'theta':theta+sign*turn}
 tr=ratio**((g-1)/g);mout=math.sqrt(((1+(g-1)*m*m/2)/tr-1)*2/(g-1))
 return {'M':mout,'p':p,'T':t*tr,'theta':theta-sign*(nu(mout,g)-nu(m,g))}

if __name__=='__main__':
 cases=json.loads(Path('airfoil-trailing-reference-inputs.json').read_text());out=[]
 for c in cases:
  g=c['gamma'];u,l=c['upper'],c['lower']
  # Cases below use attached weak-wave roots around freestream pressure.
  f=lambda p:at_pressure(u,p,1,g)['theta']-at_pressure(l,p,-1,g)['theta']
  p=brentq(f,c['pRef']*.97,c['pRef']*1.03,xtol=1e-8)
  out.append({'inputs':c['inputs'],'gamma':g,'pressure':p,'upper':at_pressure(u,p,1,g),'lower':at_pressure(l,p,-1,g)})
 Path('airfoil-trailing-reference.json').write_text(json.dumps(out,indent=2)+'\n')
 print('Independent pressure-based SciPy references:',len(out))
