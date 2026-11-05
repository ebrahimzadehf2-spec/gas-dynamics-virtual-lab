# Execution roadmap and current scope

## Book mapping

The following content was identified from manuscript chapter openings and section headings; this is not a claim that all equations in all files have been audited.

| Chapter | Actual content | v0.1 implemented | Remaining |
|---|---|---|---|
|1|Introduction, thermodynamics, entropy, isentropic/stagnation properties|Stagnation/property explorer|Thermodynamic process explorer, entropy exercises|
|2|Integral/differential conservation, material derivative, vector form|Normal-shock control-volume balance|Arbitrary prescribed field/material derivative and general CV tools|
|3|Acoustic sources, Mach cone, normal shock, Rankine–Hugoniot|Normal-shock calculator and balances|Moving source/Mach-cone animation, full Hugoniot explorer|
|4|Rayleigh flow, branch-aware inverse and optional surrogate models|Analytical forward/inverse heating/cooling, sonic heat limit|T–s interaction, frozen-model comparison and error maps|
|5|Fanno, nozzle/duct combinations, optional surrogate|Friction length, both Mach branches, sonic limit|Coupled nozzle–duct regimes and surrogate demonstration|
|6|Oblique shocks/expansion, reflection, interaction, polar, diamond airfoil|Oblique weak/strong, PM fan, two-shock collision|True shock polar, pressure-deflection plots, shock–expansion airfoil, reflection families|
|7|Unsteady waves, piston, linear/finite Riemann, shock tube, reflections/interactions|Initial shock-tube wave system|Piston, exact general1D Riemann, reflected waves, overtaking pressure solver|
|8|Quasi1D nozzle, back-pressure regimes, shock location, wind tunnel, optional DL|Nozzle regime and pressure/shock-area solver|Wind tunnels, detection illustrations, surrogate comparison|
|9|Potential/linearized flow, subsonic corrections, supersonic Cp/forces, critical Mach, swept wing|Linearized symmetric diamond pressure/lift/wave drag|Subsonic corrections, center of pressure, critical Mach and sweep tools|
|10|Conical flow, Taylor–Maccoll, cone/wedge comparison|Weak attached cone with adaptive ODE and angular property field|Independent published reference acceptance, strong branch and explicit cone/wedge comparison|

Historical naming issue: files named Chapter8 contain unsteady-wave material. The nozzle file `Chapter 7 8-14-2026 by Ehsan.docx` actually begins “Chapter8 Quasi-One-Dimensional Flow in Converging–Diverging Nozzles”. Chapter9 is broader than supersonic wings. The fixed10-chapter navigation respects topic content.

## Milestones and gates

1. **Scientific foundation (started):** correct notebook defects, decouple physics from UI, define finite input/branch checks and units. Gate: typed failures and independent reference cases.
2. **Reviewable first release (v0.1):** working controls, plotted results, model labels, export, comparison,10-chapter registry and static deployment. Gate: engine, integration, browser and responsive checks; no artificial outlet after a physical limit.
3. **Book acceptance:** create a machine-readable fixture per book example with exact source version, chapter/example, input units, expected precision, independent recalculation and acceptance status. Corrections must be logged rather than forcing code to reproduce a misprint. Gate: all implemented examples accepted or explicitly flagged.
4. **Complete analytical modules:** finish the remaining column above, prioritizing shock polars, shock–expansion airfoil, piston/Riemann, reflected waves and coupled duct/nozzle problems. Gate: physical branch/topology logic and conservation.
5. **Teaching quality:** full Persian/English localization, equation explanations, exercises, parameter sweeps, time controls and accessible plot tables. Gate: keyboard/mobile/RTL review and instructor feedback.
6. **Optional learned surrogates:** exported frozen weights/scalers, held-out and edge-case evaluation, property/conservation errors, training-domain display and reference fallback. Gate: documented maximum errors; never replace the exact reference.

No CFD, meshing, SU2 integration or2D Euler solver is part of these milestones. Conceptual subjects lacking a valid lightweight solver should use explicitly labeled instructional geometry rather than invented numerical fields.
