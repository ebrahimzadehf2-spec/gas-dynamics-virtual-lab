# Verification ledger


## What was actually run


- Extracted original Rayleigh physics functions and tested zero heat, sub/supersonic heating and cooling, sonic input, and heat above the limit. Original neural networks were not retrained.
- Node scientific and integration tests: 23 named groups, with parameterized loops within several groups. This is not a claim of 20 independent physical benchmark problems.
- Independent Python references: quadratic inverse Rayleigh relation (four cases); SciPy DOP853 IVP + Brent cone shooting (three cases). The independent code does not import JS or reuse its RK stepping code.
- Browser QA is tracked in BROWSER_QA.md.


## Acceptance targets used in tests


- Normal shock M1=2,gamma=1.4: M2=1/sqrt(3),p2/p1=4.5,rho2/rho1=8/3,p02/p01=.7208738614847455.
- Weak oblique shock M1=2,theta=10°: beta≈39.3139318448°,M2≈1.640522229. Attached maximum theta≈22.9735317609°;25° must be rejected.
- Rayleigh T1=300K,q=100kJ/kg: M1=.5→M2=.7019026875401955;M1=2→M2=1.3779040614618436.
- Rayleigh cooling q=−10kJ/kg: .5→.4853272894667567;2→2.0750023233532144.
- Shock tube default: p2/p1≈4.738621385708;Ms≈2.050495700147;u≈450.7616504267m/s.
- CD nozzle Ae/At=2,pb/p01=.8: As/At≈1.297184696078,Me≈.357162369823.
- Corrected oblique-shock collision M1=4,turns10°/20°: slip magnitude9.5448881687°,p4/p1≈10.1092647896.
- Conical M∞=2,theta_c=10°: beta≈31.20609096745°,M_surface≈1.83402806174,p_surface/p∞≈1.29251839957.
- Additional cone values and provenance are in tests/reference.json.


Conservation residuals are normalized by max(1,|upstream|,|downstream|). For Fanno flow, momentum flux is not tested as constant because wall shear transfers momentum. Entropy need not increase in the gas during Rayleigh cooling; the second law concerns the gas plus heat reservoir.


## External source discrepancy retained as unresolved


NASA's cone10 page: https://www.grc.nasa.gov/www/wind/valid/cone10/cone10.html gives M∞=2.35,theta_c=10°,quoted theoretical beta27.1843°,surface M2.1469,p/p∞1.4234,T/T∞1.1063. Those surface values imply T0_surface/T0∞≈1.01027659 for gamma1.4, inconsistent with the stated adiabatic perfect-gas model. The page's CFD comparison itself has p≈1.374 and T≈1.0951, differing from its theory column. No CFD was run for this project.


Independent JS and SciPy calculations agree on beta≈26.73671771893°,surface M≈2.14683086316,p/p∞≈1.37393636704,T/T∞≈1.09508048628. This supports code-to-code verification but is not proof that every reference discrepancy has been resolved. The NASA theory column is intentionally NOT used as a passing golden fixture. Investigate published NACA1135 tables/charts and book Example10-1 before formal release acceptance.


## References and what they support


- NACA Report1135: https://www.nasa.gov/wp-content/uploads/2023/03/equations-tables-charts-compressibleflow-report-1135.pdf — canonical perfect-gas flow relations and charts; full digitized table acceptance remains planned.
- NASA normal shock: https://www.grc.nasa.gov/WWW/BGH/normal.html — shock relations.
- NASA oblique shock: https://www.grc.nasa.gov/WWW/BGH/oblique.html — component transformation and attached-flow scope.
- Taylor–Maccoll formulation: https://uahypersonics.github.io/gasdyn/theory/taylor_maccoll/ — ODE and velocity normalization.


## Additional normal-shock verification

Independent dimensional conservation references and three additional automated tests cover pressure, temperature, stagnation properties and entropy with displayed units. All 23 test groups passed.

## Not yet accepted


Worked examples outside Chapter 3, final equation-number mapping, all parameter boundaries, strong conical branch, general multi-wave patterns, complete reflection models, real gases, learned surrogate accuracy, and experimental validation. The latest ten supplied chapter files are the current baseline; internal chapter titles determine topic mapping.

