// Moving upstream reference with ideal isentropic entry: air, gamma = 1.4, R = 287 J/(kg K).
export const reservoirExamples = [
  ['R1 · Sonic outlet', {ductProblem:'Reservoir-fed duct', ductSolve:'Sonic outlet', fluid:'Air', reservoirPressureType:'Static pressure', supplyReferenceMach:0.7, reservoirP0:360.46393049596, reservoirT0:400, q:100}],
  ['R2 · Specified back pressure', {ductProblem:'Reservoir-fed duct', ductSolve:'Specified back pressure', fluid:'Air', reservoirPressureType:'Static pressure', supplyReferenceMach:0.6, reservoirP0:392.00197543472, reservoirT0:400, q:100, backPressure:414.62749896}],
  ['R3 · Heat + outlet Mach', {ductProblem:'Reservoir-fed duct', ductSolve:'Heat + outlet Mach', fluid:'Air', reservoirPressureType:'Static pressure', supplyReferenceMach:0.65, reservoirP0:301.13174728595, reservoirT0:350, q:80, targetMach:0.40558573136}],
  ['R4 · Outlet Mach + outlet pressure', {ductProblem:'Reservoir-fed duct', ductSolve:'Outlet Mach + outlet pressure', fluid:'Air', reservoirPressureType:'Static pressure', supplyReferenceMach:0.75, reservoirP0:413.14374469402, reservoirT0:450, targetMach:0.54213006031, backPressure:474.82010275}]
];
