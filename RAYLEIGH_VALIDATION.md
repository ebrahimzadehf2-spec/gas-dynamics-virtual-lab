# Rayleigh validation — 2026-11-10

Validated the existing three problem types without adding a new mode.

## Numerical checks

`npm test`: 213 passed, 0 failed. The new audit includes 90 forward heating/cooling cases across gamma = 1.289, 1.4, 1.667 and inlet Mach 0.1, 0.5, 0.95, 1.05, 2, 8, with direct mass, momentum, energy and equation-of-state residuals checked. Tests also exercise inverse Mach/pressure/heat inputs, both inlet pressure conventions, branch rejection, finite cooling limits, all four moving-reference examples, zero-heat and back-pressure supply cases, and six manufactured heat–shock–nozzle solutions (heating and cooling). The four worked numerical book checks are retained, including the legacy hidden two-stage calculation.

## Corrections

- Zero-heat sonic supply mode now returns the M = 1 limiting state. Negative heat with a required sonic outlet is rejected clearly on the subsonic-entry model.
- Heat marginally above the choking limit reports the physical limit rather than failing a numerical root bracket. Only roundoff-sized endpoint errors are tolerated.
- Heat-slider bounds use the actual active inputs, including inverse outlet Mach, stagnation temperature and inlet speed, rather than stale inlet Mach/static temperature fields.
- Pressure-type changes refresh dependent fields immediately. Unsupported supersonic reference entry and subsonic shock/nozzle inlet are rejected explicitly.
- Moving upstream reference and duct inlet retain identical total conditions. The implied area ratio Ain/Aref = (rho u)ref/(rho u)in is reported to satisfy continuity for their different Mach numbers.
- Initial upstream reference in the adjustment-to-sonic mode is labeled as an initial operating state, whose mass flux may differ from the adjusted state. It is distinct from the simultaneous streamtube interpretation used by examples R1–R4.
- Stationary supply illustration uses M = 0 and supply pressure, not a duplicate of duct inlet Mach.
- Connected Rayleigh graphs label distance as a schematic coordinate. Shock axial position remains unresolved, with its existing notice and expanded model guide.
- An existing isentropic plot test asserted an obsolete default option order. It now checks that the requested ratio is available, consistent with the test's purpose; no isentropic UI behavior changed.

## Browser checks

Local Chrome preview: moving reference R2 gives Mach 0.6 / 0.4 / 0.479544 and Ain/Aref = 1.3383; initial-reference example gives 0.41 / 0.176145 / 1 with the operating-state note; changing static/stagnation supply pressure refreshes the reference Mach control; zero heat gives inlet/outlet M = 1. Station tables, diagram and chart render.

## Scope

Ideal gas with constant gamma and R; steady 1D, constant-area, frictionless Rayleigh segments. Supply inverse modes use a subsonic duct inlet. This validation does not add arbitrary shock placement, arbitrary heat profiles, entry losses, reacting flow, variable heat capacities, detached shocks or CFD. The heat–shock–converging-nozzle coordinate and geometry remain schematic; solved station states do not identify a unique physical shock location.

References: Georgia Tech AE3450 Rayleigh notes, https://seitzman.gatech.edu/classes/ae3450/rayleighflow_two.pdf ; NASA Glenn continuity, https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/mass-flow-rate-equations/ .
