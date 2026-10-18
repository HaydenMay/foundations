# Phase 4.1 — Visual Fixes, Animation and Preview

Phase 4.1 improves the current residential chapter's porch, garden compositions, exterior lighting and animation. It also adds a disposable per-project replay control to Developer Preview so the existing construction choreography can be inspected without changing player progress.

## Visual evidence

[Open the 25-image gallery](evidence/phase-4-1/index.html). It includes the empty lot; all three houses with each of the three porch designs; initial, in-progress and completed assembly captures for flower beds, the backyard fort and string lights; garden, hedge and umbrella details; night lighting; and portrait and landscape control layouts. Each image is linked below by topic:

- Empty residential lot: [empty-lot.png](evidence/phase-4-1/empty-lot.png)
- Cottage, Craftsman and Brick porch combinations: [all house/porch captures](evidence/phase-4-1/index.html)
- Three animation sequences: [flower beds](evidence/phase-4-1/animation-wildflower-beds-middle.png), [backyard fort](evidence/phase-4-1/animation-backyard-fort-middle.png), [string lights](evidence/phase-4-1/animation-string-lights-middle.png)
- [Wildflower beds](evidence/phase-4-1/garden-expansion-flower-beds.png), [evergreen expansion](evidence/phase-4-1/garden-expansion-evergreens.png), [trimmed hedge](evidence/phase-4-1/continuous-trimmed-hedge.png), and [patio umbrella](evidence/phase-4-1/stone-patio-umbrella.png)
- [Night wall sconces](evidence/phase-4-1/wall-sconces-night.png) and [garden torches](evidence/phase-4-1/garden-torches-night.png)
- Responsive controls: [portrait](evidence/phase-4-1/controls-portrait.png) and [landscape](evidence/phase-4-1/controls-landscape.png)

Captures were made from the production build in headless Chromium with a fresh synthetic profile and the isolated Developer Preview. They are manual visual evidence, not a Playwright end-to-end test suite or a deployment gate. Capture details and renderer counters are in [metrics.json](evidence/phase-4-1/metrics.json). The capture utility is optional: `node scripts/capture-phase-4-1.mjs` after building and running the local preview server.

## Changes

- Construction rows in Developer Preview can replay their production project recipe, including projects that remain locked in the genuine save. Preview first switches to a disposable working copy; replays, temporary stars, camera movement and selections never enter real persistence or backups. Chapter preview is available alongside the current construction projects.
- Porch compositions have wider decks, usable steps and adjusted front-rail openings. All three house styles use the same placement contract. Rockers, swing, bench, planters and rug sit on the deck and stay clear of door access.
- Flower beds, tall wildflowers, evergreen groupings and trimmed hedges have distinct silhouettes and richer, contrasting foliage. The hedge composition fills its run while retaining the planned gaps at paths and the driveway.
- Patio seating now reads as a set with its umbrella; string-light cables sag between supports. Exterior sconces have style-relative placements on the front, rear and sides without increasing the fixed point-light budget. Garden torches include visible flame meshes and a subtle night-only emissive flicker.
- The existing ordered assembly animator remains the only construction animation system. Developer Preview adds a 0.25× inspection speed; reduced motion and skip behavior continue to use the existing animator.

## Verification

- Unit tests: **PASS — 162 tests across 19 files** (`npm test`, Node 24.15.0).
- Production build: **PASS** (`npm run build`, base href `/foundations/`). Main bundles total about 319 kB raw; the lazy Three.js scene chunk is about 661 kB raw.
- Production-bundle visual capture: **PASS — 25 scene captures plus 2 responsive controls**. Page and console errors: **0**; WebGL errors: **0**; context loss: **0**. Emulated portrait at 390×844 and landscape at 844×390 have matching document dimensions, with no overflow.
- Renderer observations at 1280×900: up to **102 draw calls** and **171,330 triangles** in the captured scenes. These are Chromium renderer counters, not frame-time or physical-device performance measurements.
- Physical iPhone/Android, Safari, and real mobile GPU testing: **SKIPPED**. Browser screenshots used headless desktop Chromium with emulated viewports.
- GitHub Pages deployment: **PENDING** at the time this report was drafted; this section will be updated after the push and hosted verification.

## Known visual compromises

The porch seating and props are present, grounded and cleared from the front rails, but the current fixed elevated camera lets the porch roof obscure much of the seats in the normal home framing. The screenshot set therefore does not demonstrate the same seating readability as the architectural reference board. A lower street-facing or roof-aware porch inspection camera is the practical follow-up.

The procedural low-poly plants and hedge read as a continuous green boundary but remain scalloped and faceted compared with the reference's soft, densely authored foliage. The umbrella, sconces and flame details use simple geometry and emissive materials; there are no expensive reflections, post-processing, or volumetric effects. This preserves the existing mobile renderer and keeps the assets replaceable, while falling short of the reference's high-detail garden rendering.

No new neighborhoods, vehicles or simulation systems were added. The world remains one continuous scene; future spatial growth will still need bounded terrain/camera expansion and spatial batching as noted in the Phase 4 report.
