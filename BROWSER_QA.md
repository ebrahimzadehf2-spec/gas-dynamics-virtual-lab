# Browser QA — 2026-11-05

Tested in the provided desktop Chrome browser against the local HTTP preview.

- All ten chapter navigation entries opened and produced solved states with two accessible SVG figures. Chapter6 expansion and unequal-shock sub-experiments were also opened and computed.
- Rayleigh default: M2=.7019 displayed. Set q=1000kJ/kg: “Limit exceeded”, qmax≈141.26kJ/kg, no invented outlet or outlet plot marker. Reset and set q=−10kJ/kg: M2=.48533 displayed.
- Pinned Rayleigh state displayed a comparison table. Export buttons become disabled while a result is pending or invalid.
- Nozzle default Ae/At=2,pb/p01=.8: “Internal normal shock”, As/At≈1.2972, exit Mach≈.35716, pressure chart rendered.
- Oblique M1=2,theta=25°: “Detached”, theta_max≈22.9735°, and no SVG field displayed.
- Expansion default: M2≈2.5984,p2/p1≈.39307. Unequal shock interaction default: common-pressure ratio≈10.109, slip-angle magnitude≈9.5449°.
- Cone default M∞=2,theta_c=10°: beta≈31.206°,M_surface≈1.834,p_surface/p∞≈1.2925, tangency and angle residuals displayed.
- Desktop screenshots of Rayleigh, linearized airfoil and cone inspected internally for layout and plot rendering. Screenshots are not source artifacts.

Responsive CSS uses 1250px and800px breakpoints; keyboard focus, labels, live statuses, a skip link and reduced-motion handling are implemented. A real narrow/mobile viewport and physical mobile devices were not tested in this environment. No claim of exhaustive cross-browser, all-input or complete accessibility certification is made.
