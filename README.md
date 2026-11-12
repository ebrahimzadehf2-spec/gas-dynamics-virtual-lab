# Gas Dynamics Virtual Lab

A working analytical compressible-flow laboratory for *Introduction to Compressible Flows*. Experiments are organized around the ten-chapter book. This is an early implementation; not all book sections or worked examples have been accepted.

## Open the laboratory

GitHub Pages serves the repository root. Use the website link in repository Settings → Pages. No installation, server, build, CDN or account is required for visitors.

## Scientific scope

Calorically perfect ideal gas; analytical relations, bracketed scalar roots and Taylor–Maccoll ODE integration. No external CFD package, SU2, finite-volume mesh or remote solver is required. The optional wave-front tracker approximates interacting inviscid supersonic fields using local shock/expansion Riemann relations; it is not a general grid-based Euler solver. Scene labels distinguish analytical regions, quasi-1D fields, similarity fields and illustrative geometry.

## Source layout

This publication flattens the original source folders so GitHub Pages can serve the root directly. Only relative module imports and test paths were changed; equations and numerical algorithms are unchanged.

- `physics.js`, `numerics.js`, `cone.js`, `control-volume.js`: pure scientific engine.
- `gas-properties.js`: selectable gas constants at 300 K and custom fixed properties.
- `labs.js`, `worker.js`: experiments and asynchronous calculation.
- `graphics.js`, `app.js`, `style.css`, `index.html`: interface, charts and labeled fields.
- `guide.html`: scientific scope, assumptions and reference status.
- `*.test.mjs`, `reference.json`, `independent_reference.py`: automated checks and independent references.
- Audit, validation and roadmap documents are included as Markdown files.
- `Source_Project_v0.1.zip`: archived modular project and tests, with English documentation.

## Verification

Run `npm test` using Node22 or newer. Twenty test groups cover reference values, conservation, branches, physical limits, invalid input and default experiment rendering. Four Rayleigh cases were independently inverted via a quadratic and three conical cases independently solved with SciPy DOP853+Brent.

For local use run `python -m http.server 8080` and open http://localhost:8080. Native module workers need HTTP(S); do not open index.html through file://.

Full experimental validation, all worked-book-example acceptance, all-input cross-browser coverage and mobile-device QA are not claimed. See VALIDATION.md and ROADMAP.md.

## Supersonic Airfoil Lab

The Chapter 9 experiment is available at `#airfoil`; the earlier `#linear` interface redirects there. It supports flat plates, diamonds, asymmetric double wedges and editable sharp polygonal profiles. Select shock–expansion, linearized theory or a comparison of both. The app integrates surface pressure into lift, pressure/wave drag and quarter-chord moment, compares panel Cp, reports nonlinear surface states and one-sided shock data, and provides piecewise linearized perturbation and total surface-potential profiles. Geometry entry defaults to segment angles relative to the chord and true segment lengths L/c. The final segment closes automatically at the trailing edge; diamond surfaces are mirrored and asymmetric/custom sides are independent. Custom geometry retains an advanced coordinate-entry mode. Colored surface edges represent panel Cp, not an exterior CFD field.

`airfoil-reference.py` independently checks shock–expansion panel states and pressure forces using SciPy. `airfoil.test.mjs` checks those references, symmetry, flat-plate force resolution, linear-theory recovery, shock conservation, potential continuity and unsupported domains. See the site guide for conventions and validity limits.

## Chapter 6 geometry builder

`#wall` opens the Wave Geometry Lab. A Geometry selector in the input column offers compression, expansion, editable multi-corner walls. A Wave Interaction selector below Geometry opens the opposing/same-direction interaction calculators inside the same laboratory. Single walls accept up to eight absolute angles and true segment lengths; gas can lie above or below. The local solution stops at the first sampled wave crossing or later-wall encounter. It reports uniform surface states and one-sided shock values without inventing subsequent interactions. Chapter 6 no longer lists the Chapter 9 airfoil tool.

Custom wall also provides Boundary layout = Channel: independent upper/lower angle-length editors, inlet gap, crossing validation, separate wall-stream properties and charts, and clipping at the first wave interaction or opposite-wall encounter. The shared displayed domain ends at the shorter axial wall extent. The original automatic/local mode stops there; the unified Shock–Expansion option continues regular reflections and interactions within its stated limits.

## Characteristic fields and fitted shocks

Custom channels retain `Shock–Expansion` and `Method of characteristics`. Smooth expanding channels use the original isentropic MOC. Compression cases use `channel-moc-shocks.js`: rotational pressure/direction compatibility, streamline p0 transport, separate smooth meshes at each fitted shock, weak-shock jump/compatibility fitting and regular wall-reflection events. One active fitted shock and smooth shock–fan interaction are supported. Shock/shock/contact topology, detached/Mach reflection, subsonic continuation and automatic insertion of a coalesced interior shock are explicitly outside this stage. This is independent of front tracking. Preset buttons retain the chosen method. Fitted-point inspection, every one-sided CSV/JSON shock station, local-p0 contours and cross-channel profiles are included. See [MOC_SHOCK_VALIDATION.md](MOC_SHOCK_VALIDATION.md).

## Chapter 6 worked shock interactions

The Geometry input includes Example 6–4 and Example 6–5 loaders. They select the unified Shock–Expansion method: `channel-solver.js` routes to direct local pressure/polar matching and downstream front tracking. The first interaction preserves all five book states, with 4′ (lower) and 4 (upper) in Example 6–4. Further events remain inspectable until a physical/accuracy/budget limit. The pure `regular-channel.js` direct reference solver and independent SciPy roots remain tested internally; a separate limited automatic method is no longer exposed.

## Unified Shock–Expansion channel solver

`wave-tracker.js` provides event-driven downstream front tracking on editable two-wall channels: weak attached shocks, discretized PM fans, wall turns/reflections, regular wave interactions and pressure/direction-matched slip lines. Each stream retains its own stagnation pressure after shocks. Fan propagation/interactions are approximate, with explicit angular width and optional half-width outlet-profile comparison. The method does not solve a finite-volume Euler mesh or require a remote service. Computational and physical limits stop the solution rather than filling an unsupported downstream field.

Three presets exercise repeated shock reflections, shock–expansion interaction, and two expansion fans. `wave-tracker-graphics.js` draws the solved cells and terminated wave paths, with selectable contours and pointer inspection. `wave-tracker-tables.js` synchronizes event selection, local states, slip directions and complete CSV exports; one-sided finite-shock tables follow the selected event. All accepted events/states are in JSON.

`wave-tracker-reference.py/.json` independently check a shock and three wall reflections using SciPy, plus characteristic-invariant symmetric-fan states. Nine focused tests cover these references, the original Chapter 6 matches, shock conservation, mass and front refinement, mirror symmetry, physical/budget stops and UI/export integration. The full suite has 153 passing tests at this update. Small mass discrepancy does not establish total accuracy, and arbitrary-geometry convergence is not claimed. See the guide for the finite-front approximation and limits.

`Channel solution` now exposes only Shock–Expansion and Method of characteristics. Former Automatic shock–expansion, Local shock–expansion and Attached-wave tracking saved values migrate to the unified method. `channel-solver.test.mjs` checks the two-option contract, migration, preserved book labels/angles, approximation provenance and MOC separation. Selected events are labelled as direct relations or approximate fan-front-dependent results; approximation provenance propagates to downstream states. The complete suite has 157 tests after this consolidation.

The Wave Interaction Calculator uses one editable dimensional geometry (height/clearance and axial corner separation in metres). Educational/Custom geometry are no longer separate UI modes. Invalid direct-interaction geometries explain an earlier wall encounter or missing downstream intersection and offer a shortcut to Custom wall / Channel / Shock–Expansion for the actual event sequence. The shortcut opens the channel editor; automatic geometry conversion is not claimed. Pure normalized-layout helpers remain available internally for reference tests.

## Merged simple corners and collision rendering fix

Chapter 6 exposes Wave Geometry Lab and Wave Interaction Calculator. The Compression ramp / Expansion corner presets contain the former standalone oblique-shock / PM calculators, including weak/strong branch selection for a single compression corner, sonic-inlet expansion, mirrored gas sides, all five contour variables, textbook views, region/shock tables and dimensional/ratio plots. Legacy #oblique and #expansion URLs migrate their saved parameters into Geometry Lab. Custom wall and channel solvers retain their own scopes. Internal pure calculator entry points remain for references and backward-compatible numerical tests, not duplicate navigation.

A finite callout-slot search replaces an oscillating label-placement loop that froze same-direction collision rendering for H=11.55 m and d=1.44 m. The solution itself completed; label placement blocked the main browser thread and repeated on refresh from saved inputs. A subprocess regression with a timeout protects against reintroducing the freeze. The full suite contains 161 tests after this change.

Chapter navigation omits chapter-number prefixes. Wave Geometry Lab is the single sidebar entry for Chapter 6; duplicate upper tabs are hidden. Its input column shows Geometry (Compression ramp, Expansion corner, Custom wall) followed by a separate Wave Interaction selector (Opposing shocks, Same-direction shocks). These choose alternative calculations inside the same laboratory. Redundant interaction-mode headings are omitted from the schematic; region labels and numerical annotations remain. Both numerical interaction modes remain unchanged.

All six Chapter 6 example shortcuts are grouped in one Examples card at the bottom of the right-hand results column, after shock reports, shown only when Geometry is Custom wall. Loading a channel example selects Channel and its appropriate solver automatically, including when starting from a single custom wall.

Compression ramp, Expansion corner and Custom wall share a Geometry & solution panel above the workspace; gas and inlet conditions remain on the left. Case-specific geometry and display options occupy the top panel. Custom-wall editors and solver settings are collapsible. Profile station x/L appears beside the property plot for both channel solvers. Solver and station controls include short English descriptions. Examples remain at the bottom of the right results column.

Wave Interaction uses the same top Geometry & solution panel: mode, both corner turns, channel height and axial separation are above the diagram. Only gas and inlet conditions remain in the left input column. Both opposing and same-direction modes retain the same calculations.

The Wave Interaction selector is shown only from Custom wall and while an interaction is active. Compression ramp and Expansion corner omit it.

All laboratories use one compact header: title, model badge and assumptions link share a row, followed by the short description. Redundant chapter breadcrumbs, number badges and taglines are removed from the workspace header.

Supersonic Airfoil Lab uses the same top Geometry & solution panel for shape, geometry definition, solution method and incidence. Surface segment/coordinate editors are grouped under Edit surface geometry. Gas and freestream Mach, temperature and pressure remain in the left column.


### Unified Fanno nozzle–duct system

The Fanno menu contains Single duct and Nozzle + Fanno duct. The latter combines the former minimum-supply, exit-shock/friction, prescribed-shock and shock-location interfaces. A single geometry supports four landmark states plus continuous back-pressure inversion and steady playback. The solver preserves isentropic nozzle mass flow, normal-shock jumps and Fanno friction length; it also handles unchoked/no-flow and friction-choked long-duct limits. Sonic at duct exit is an operating condition; its Solve for selector chooses back or reservoir pressure while determining the limiting friction parameter. Shock at duct exit offers back pressure or friction parameter. These contextual controls replace the separate Known data menu. Legacy saved input modes migrate into this interface. Run `node --test fanno-system.test.mjs` for cross-checks against the original solvers, conservation, pressure inversion, choking, migration and playback landmarks.
