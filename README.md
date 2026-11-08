# Gas Dynamics Virtual Lab

A working analytical compressible-flow laboratory for *Introduction to Compressible Flows*. Twelve experiments are organized around the ten-chapter book. This is an early implementation; not all book sections or worked examples have been accepted.

## Open the laboratory

GitHub Pages serves the repository root. Use the website link in repository Settings → Pages. No installation, server, build, CDN or account is required for visitors.

## Scientific scope

Calorically perfect ideal gas; analytical relations, bracketed scalar roots and Taylor–Maccoll ODE integration. No CFD, SU2, mesh generation or 2D Euler solver. Scene labels distinguish analytical regions, quasi-1D fields, similarity fields and illustrative geometry.

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

`#wall` opens the Wave Geometry Lab. A Geometry selector in the input column offers compression, expansion, editable multi-corner walls and the existing opposing/same-direction interaction calculators. Single walls accept up to eight absolute angles and true segment lengths; gas can lie above or below. The local solution stops at the first sampled wave crossing or later-wall encounter. It reports uniform surface states and one-sided shock values without inventing subsequent interactions. Chapter 6 no longer lists the Chapter 9 airfoil tool.

Custom wall also provides Boundary layout = Channel: independent upper/lower angle-length editors, inlet gap, crossing validation, separate wall-stream properties and charts, and clipping at the first wave interaction or opposite-wall encounter. The shared displayed domain ends at the shorter axial wall extent. Subsequent reflection trains are not solved.
