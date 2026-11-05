# Notebook audit — 2026-11-05

Scope: code review of nine distinct notebook topics. Eight topics were read in the prior turn from Library; the reattached Rayleigh notebook was read from its supplied local path in this turn. Duplicate copies were not all byte-compared. Original notebooks have not been modified. This audit does not claim that original Python cells were all rerun. In particular, the Rayleigh neural networks were not retrained.

## Rayleigh.ipynb — full reattached source review

Source SHA-256: `2323ae1ff1379294159548412cfef97d5b0f384a1126b2777cb3ff97a4bdfc9b`. One code cell combines physics, training, inference, plotting and controls.

**Physical model.** Steady, frictionless, constant-area Rayleigh flow of an ideal calorically perfect gas, gamma=1.4 and R=287 J/(kg K). `cp=1004.5`. Inputs: M1 (slider .1–4), T1 (200–800 K), p1 (50–500 kPa), and q (0–2000 kJ/kg). Outputs: M2, static T/p/rho/u and stagnation pressure, sonic reference values, maximum heat, Mach surrogate error, and five ratio-versus-Mach plots. These are property diagrams, not spatial flow fields or CFD.

**Relations.** With g=gamma and d=1+g M²:

- p/p*=(g+1)/d
- T/T*=(g+1)² M²/d²
- rho/rho*=d/[(g+1)M²]
- u/u*=(g+1)M²/d
- T0/T0*=2(g+1)M²[1+(g−1)M²/2]/d²
- p0/p0*=(p/p*){[2/(g+1)][1+(g−1)M²/2]}^[g/(g−1)]

These equations and the dimensional sonic-reference reconstruction are correct for the stated model. The heat limit from total temperature is correct. Static T reaches its maximum at M=1/sqrt(g), whereas T0 and entropy reach their Rayleigh-line maximum at M=1. These conditions should not be conflated in future teaching annotations.

**Algorithms.** The reference uses 100 bisection iterations on the interval between M1 and 1. Two separate inverse neural networks predict M from T0/T0*, with 15,000 synthetic samples each and two 128-unit ReLU hidden layers. The subsonic training domain is .01–.9999; the supersonic domain is 1.0001–8. A third network predicts five logarithmic property ratios from M, with 8,000 samples and two 128-unit tanh layers. All three use StandardScaler. Training occurs on every full notebook execution. np.random.seed(42) provides a process-level seed, although explicit model random_state values and exported trained artifacts would improve reproducibility.

**Dependencies.** NumPy; Matplotlib; ipywidgets; scikit-learn; IPython.display. Math, bisection, and property evaluation transfer directly to JavaScript. Notebook widgets and plotting need new web controls and plots. Scikit-learn training should not be translated as a mandatory startup operation. A future optional surrogate demo can load frozen exported weights and scalers, with a declared training range, model version, and independently measured errors.

**Issues and priority.**

1. The reference bisection interval supports heating only. Calling it with cooling silently returns the inlet-side endpoint. Reproduced without running the training code: M1=.5, T1=300 K, q=−10 kJ/kg returns .5 instead of .4853272894667567; M1=2 returns 2 instead of 2.0750023233532144. The current slider does not expose negative q, so this is a reusable-function limitation rather than an error for normal slider operation.
2. When requested heat exceeds the sonic heat limit, the app sets AI M2=1 and still evaluates and displays AI outlet properties. These describe a surrogate approximation near the limiting state, not a steady solution accommodating the full requested heat. The web engine instead reports no outlet for a fixed inlet beyond the heat limit.
3. At M1=1, the inverse branch is implicitly selected as supersonic. Heating cannot proceed with the prescribed inlet; cooling has two candidate branches and requires a branch choice.
4. The 1.000001 choking allowance can send slightly supercritical T0 ratios to a model trained at or below the limit. No explicit endpoint strategy is used at M=1.
5. No input finiteness/positive-temperature checks, physical branch checks on NN predictions, held-out evaluation set, maximum-error report, or conservation/EOS assessment of the five independently predicted properties is present. Logarithmic outputs guarantee positive property ratios, not mutual thermodynamic consistency.
6. Only Mach error is displayed. The notebook can show a small Mach error while the property network has separate errors. Near M=1 the inverse ratio relation is ill-conditioned.
7. The labels “Physics-Informed” and “High Precision” are stronger than the demonstrated method. This is supervised learning on physics-generated data, not a PINN using differential-equation residual losses. High precision needs an independent error study.
8. Training and inference are tightly coupled to UI rendering; helper functions repeatedly enforce gamma=1.4. Generalizing gamma requires new surrogate inputs/training or restricting the surrogate explicitly.

**Executed checks.** Extracted and executed only four physics helper functions using Python AST, avoiding training. Heating reference results: M2=.7019026875401955 for M1=.5 and M2=1.3779040614618445 for M1=2, each at T1=300 K and q=100 kJ/kg. Sonic reference ratios equal 1. Independent quadratic inversion and JS heating/cooling conservation tests are included in this repository.

## conicalflow(1).ipynb

Input M_infinity, shock angle beta, gamma, RK step h, tangential velocity tolerance. Output estimated cone angle, immediate post-shock Mach, and three purported cone property ratios. Standard-library math/dataclass/typing only. The Taylor–Maccoll RHS and decreasing angular integration direction are recognizable; RK4 is used. Critical typo: normalized V uses exponent −0.05 instead of −0.5. Reported pc/Tc/Roc depend on immediate post-shock Mach rather than the integrated surface state; they are not cone-surface static ratios. No strict upper beta bound, denominator/singularity guard, surface event bracketing, convergence flag, or proper error on iteration/axis termination. Transfer the corrected ODE, not this implementation as-is.

## conicalflow2(1).ipynb

Three computational variants: (1) NumPy arrays and a mixed Taylor/Euler march with 2000 points plus heuristic beta correction; (2) SciPy solve_ivp and 3000-beta sweeps for each of 40 freestream Mach values; (3) a coarser 200-beta sweep. Input cone angle and freestream Mach; output shock angle file or surface-Mach and pressure-ratio curves. Dependencies NumPy/SciPy/Matplotlib. The first variant's overall integration accuracy is limited by its first-order tangential update; it is not RK4. Heuristic beta iteration has no robust bracketing or maximum iteration protection. Sweep variants choose best available cone angle with no final acceptable-angle-error gate, do not explicitly select weak/strong branch, hide exceptions, and can be expensive. Artificial denominator modification in one version obscures singular behavior; sign(0)*epsilon still leaves zero. Save paths are environment-specific. Replace sweeps with bounded weak-branch shooting, event detection and convergence checks; run asynchronously.

## Emanuel's_explicit_analytical_method(1).ipynb

NumPy implementation of explicit cubic shock-angle branches, input M1, turn angle and gamma; output weak/strong beta. At theta=0 the formula divides by tan(theta). Lambda-squared is not a sufficient attached-shock admissibility test; unconditional clipping of chi can conceal truly detached states. Example M1=2, theta=25°, gamma=1.4 has positive lambda² but chi≈−4.06; theta_max≈22.97353°. Check finite inputs, gamma, M1, theta_max, degeneracy and residuals. The new core uses physically bracketed theta–beta–M inversion instead; an explicit formula may later be retained for comparison.

## Shock_polar_diagram(1).ipynb

NumPy/Matplotlib polar graph R(phi) for dimensional velocities based on T=300 K, R=8314/28.96 and gamma=1.4. Formula is constant(M)*cos(phi), which traces circles in polar coordinates (negative radii also require careful plotting treatment). It does not by itself construct the finite-Mach downstream velocity locus across all attached shock angles. A proper shock polar should parametrize beta and compute downstream u,v, with explicit origin, normalization and branch labels. np.arange(1.2,10.1,1) ends at 9.2. Only image-file output, no interactive solve. Full corrected shock-polar experiment remains planned.

## head_on_collision_of_oblique_shocks_slip_line_(1).ipynb

Standard-library math; two incident weak shocks and two outgoing shocks satisfying equal pressure. Contains an 80-iteration bracket/secant hybrid and an older up-to-200000 fixed-angle-step loop. Source has gamma+2 where gamma+1 is required in an equivalent normal downstream-Mach expression, affecting secondary shock states. Older saved outputs oscillate between two states; fast solver can return after iteration exhaustion and print “Converged” without acceptance. Bracket expansion/fallback can leave the admissible attached/compression domain; zero turn is singular in explicit formula. Corrected core restricts common global direction to the overlap of outgoing compression intervals and solves log(p4/p5)=0. Default M1=4, incident turns10°/20° gives slip-angle magnitude9.5448881687° and p4/p1=p5/p1≈10.1092647896. Mixed shock/expansion outcomes are explicitly unsupported.

## shock_wave_pressure_ratio_solver(1).ipynb

NumPy/SciPy Brent solve in z=p4/p3 for overtaking shocks with a reflected expansion, related to book section7-19-5-1. Fixed inputs gamma=1.4, p2/p1=p3/p2=3. Output z≈.94154478993 and p5/p1≈8.47390310939 from prior independent recalculation. Positive roots alone do not establish the assumed wave pattern: impose 0<z<=1 and transmitted compression, verify the equation's physical interval and branch assumptions, and report residual. Fixed bracket[1e−8,10] is not universally valid. This experiment has not yet been exposed in v0.1.

## Shock_Tube_Pressure_Solver(1).ipynb

NumPy/SciPy Brent solve for p2/p1, then normal-shock and expansion formulas. Default p4/p1=40, T1=298.15 K, T4=293.15 K, both gamma1=gamma4=1.4, shared R=287. Output shock Mach/speed, gas velocity and temperature/density/pressure ratios. Relations are usable for this same-gas setup. Fixed root interval[1.01,10] may not bracket other pressure ratios; returning1e6 for invalid trial states is a discontinuous artificial residual. Printed m/s unit for p3/p4 is wrong. New core solves contact-velocity compatibility over 1<=p2/p1<=p4/p1, and supports separate gamma/R values. Current UI limits to same gas. No reflected-wave solution in this notebook.

## normal_shock_location(1).ipynb

Standard-library math; explicit exit-Mach formula, bisection inverse normal-shock total-pressure ratio on[1.0000001,50], area-Mach shock location. Input p01, pb, Ae/At, gamma. Main flow-classification uses (2/(gamma+1))^[gamma/(gamma−1)] as if it were the universal CD-nozzle back-pressure choking threshold. This is incorrect: threshold depends on exit/throat area ratio. It also omits validation that the shock area lies between throat and exit, and does not classify all external/unchoked regimes. The explicit exit formula can lose significance at very small X. New engine uses forward shock-at-area matching over As/At in[1,Ae/At] and computes regime boundaries from both area-Mach branches. Counterexample Ae/At=2,pb/p01=.8 gives internal shock As/At≈1.2971846961, despite the original main branch rejecting it.

## Migration decision

All nine mathematical topics are feasible in browser JavaScript. Replace NumPy scalar/array operations with Math and typed/ordinary arrays; SciPy roots with bounded scalar solves; solve_ivp with tested ODE integration and event location; Matplotlib with SVG; ipywidgets with native controls; file writes with explicit browser downloads. Keep any future ML surrogate optional and separate from analytical acceptance. Domain failure must not be silently replaced with clamped output, artificial stiffness, invented geometry, or successful status.
