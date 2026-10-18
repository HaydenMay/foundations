# Phase 4.2 visual evidence

`index.html` is a gallery of production-bundle screenshots. `metrics.json` records viewport sizes, Three.js draw calls and triangles, active lighting, construction state, WebGL errors, context loss, and any captured console or page errors.

The gallery covers all nine house-style × porch-furniture combinations, all three stone-wall × garden choices, Pathway Lanterns in afternoon and night lighting, all 27 house × backyard × retreat combinations with string lights, start/middle/complete construction views for the stone boundary and pergola, replay/skip, and portrait/landscape control and construction-toast layouts.

These images were captured from the locally served production build in headless Chromium with fresh disposable browser profiles and simulated touch viewports. They are manual visual evidence only; they do not add an end-to-end test or deployment gate. No physical phone or Safari test was performed.

The tested scene combinations had no recorded console/page errors, WebGL error `0`, or context loss. Portrait (`390×844`) and landscape (`844×390`) had no document-width overflow; in both layouts, the construction toast and Skip control sit below the Preview/Exit badge. The fully developed preview recorded 103–267 Three.js render calls across captures. This is renderer instrumentation, not a mobile frame-rate result; no physical-device performance measurement was made.

The art remains intentionally low-poly and procedural. The reference boards have much denser, softer garden detail, richer material texture, and more realistic light falloff than the current renderer; this pass improves placement, assembly, and readability without replacing the asset pipeline. No intersections were found in the tested porch, garden/wall, lantern, and string-light combinations. A later mobile performance pass should measure frame time with a mid-range device before increasing asset detail.

The world remains a fixed residential lot. The existing terrain is 36×29 world units and camera translation is clamped to ±18, so later continuous-city chapters will need to extend the same world bounds while keeping the original home anchored. This phase did not change those limits.

Reproduce locally after `npm run build` and starting `npm run preview` in another terminal:

```powershell
$env:CAPTURE_DIR = 'docs/evidence/phase-4-2'
npm exec --yes --package=node@24.15.0 -- node scripts/capture-phase-4-2.mjs
```

The current unit suite passed: 19 files, 165 tests, including a boundary-replay isolation check. The production Angular build passed with `/foundations/` as its base path. GitHub Pages deploys only from `main`; this branch has not been deployed, and the live site remains on the last successful `main` deployment.
