# Static/stagnation inputs — 2026-11-12

Scope: independent pressure and temperature choices wherever conversion uses a known section Mach, or a Mach determined independently by the existing solution. No new physical solution mode, inverse equation or branch was added. The physics kernels and Rayleigh outlet-pressure inverse remain unchanged.

## Coverage

- Isentropic calculator, normal shocks, ramps/custom walls/wave interactions, airfoils, wedge and cone: convert selected inlet/freestream data at the prescribed local Mach.
- Shock tube: independent choices for each initially stationary chamber; static and total data coincide at M = 0.
- Nozzle: convert actual inlet static data using the inlet Mach from the existing nondimensional nozzle solution. Explicit back/ambient pressure ratios retain their original definitions.
- Single Rayleigh/Fanno ducts: independent pressure and temperature types; existing velocity-input conversions retained. Fanno inverse outlet-Mach/friction mode supports static temperature because inlet Mach is already determined independently.
- Connected supply models: static supply conditions use the defined upstream Mach; stationary Fanno reservoirs use M = 0, and Fanno shock-location uses its specified duct inlet Mach. Moving Rayleigh references remain distinct from duct inlet states.
- Known-Mach/sonic outlet pressure and sonic outlet temperature: direct conversions before the unchanged solver.
- Rayleigh inverse heat/outlet-Mach retains inlet stagnation temperature; unknown-Mach outlet-pressure cases retain static pressure. Replacing these would alter the inverse problem and is intentionally outside this change.

## Verification

`npm test`: 233 passed, 0 failed. Twenty new test groups cover equivalent static/total inputs, dimensional states through shocks and expansions, cone freestream conditions, five nozzle regimes/geometries, both shock-tube chambers, Fanno inverse conversion, moving Rayleigh reference states, sonic exits and coverage without duplicate controls. Existing numerical references and all previous regression tests pass.

Chrome preview: independent selectors update labels immediately. With inlet Mach 2, T0 = 540 K and p0 = 790.269356 kPa, the normal-shock table recovers inlet T = 300 K and p = 101 kPa, and outlet T = 506.25 K and p = 454.5 kPa. Nozzle static-input selectors also render and solve.
