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
