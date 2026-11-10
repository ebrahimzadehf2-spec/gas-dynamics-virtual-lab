// Rayleigh reservoir cases: air, gamma = 1.4, R = 287 J/(kg K).
export const reservoirExamples = [
  ['R1 · Sonic outlet', {ductProblem:'Reservoir-fed duct', ductSolve:'Sonic outlet', fluid:'Air', reservoirPressureType:'Stagnation pressure', reservoirP0:500, reservoirT0:400, q:100}],
  ['R2 · Specified back pressure', {ductProblem:'Reservoir-fed duct', ductSolve:'Specified back pressure', fluid:'Air', reservoirPressureType:'Stagnation pressure', reservoirP0:500, reservoirT0:400, q:100, backPressure:414.62749896}],
  ['R3 · Heat + outlet Mach', {ductProblem:'Reservoir-fed duct', ductSolve:'Heat + outlet Mach', fluid:'Air', reservoirPressureType:'Stagnation pressure', reservoirP0:400, reservoirT0:350, q:80, targetMach:0.40558573136}],
  ['R4 · Outlet Mach + outlet pressure', {ductProblem:'Reservoir-fed duct', ductSolve:'Outlet Mach + outlet pressure', fluid:'Air', reservoirPressureType:'Stagnation pressure', reservoirP0:600, reservoirT0:450, targetMach:0.54213006031, backPressure:474.82010275}]
];
