# Phase 4 — Home Milestones and Visual Sets

Phase 4 continues the original residential lot through its first 100 lifetime stars. The existing house, driveway, roads, renderer and camera remain in place. Each 10–90 star project is a deterministic, free and reversible A/B/C composition. The 100-star milestone reveals a small empty parcel beside the home in the same world; it does not add a building or neighborhood scene.

## Reference scene gallery

[Open the 14-image running-app gallery](evidence/phase-4/index.html). It contains four comparable views for each uniform set—front three-quarter, rear three-quarter, elevated overview and night—plus two mixed-combination views. The legend in the gallery maps every A/B/C choice. The images were captured from the production bundle in headless Chromium using a fresh synthetic browser profile and the disposable Developer Preview. The preview badge and control overlays were hidden for the screenshots; all town geometry and lighting came from the app's Three.js renderer. No cars appear.

Four additional full-page screenshots document the expanded and collapsed Developer Preview controls at 390×844 portrait and 844×390 landscape. `metrics.json` records the canvas rectangles and document bounds; all four fit the emulated viewport without horizontal or vertical document overflow. These captures are also from a fresh synthetic profile.

The manual capture can be reproduced with Node 24.15.0+:

```sh
npm run build
npm run preview
# In another terminal, from the repository root:
node scripts/capture-phase-4.mjs
```

The capture script is optional visual evidence tooling. It is not part of `npm test`, GitHub Actions, or the Pages deployment gate.

## Implementation and compatibility

- The catalog adds front planting at 10, a centerpiece at 20, the existing backyard choices at 30, porch seating at 40, a backyard retreat at 50, garden expansion at 60, a boundary at 70, exterior lighting at 80 and a signature feature at 90. The Classic Cottage, Craftsman and Brick styles remain immediately selectable when the first home is earned.
- Each composition has a fixed metre-scale zone, an owned root, named assembly groups, an assembly recipe and a focus target. “View in town” temporarily moves the camera to that target; Cancel restores both the original camera and committed design without persisting the inspection view. The existing Phase 3 animator handles additions, replacements, cancellation, skip and reduced motion. A confirmed selection is durably saved before assembly starts. Draft previews stay in memory.
- At 100 lifetime stars, a derived chapter teaser reveals the next empty parcel. The scene transition runs once when the current real profile crosses the threshold, does not replay on reload, and is suppressed during simulated preview scenarios. An existing legacy neighbor building takes precedence and is never replaced.
- Developer Preview remains a separate working copy. Its scenarios, milestone compositions, project visibility, simulated stars, camera changes and lighting changes do not reach real storage, other tabs or JSON exports. Reload discards the working copy.
- Save schema v3 retains old design IDs and unknown fields. Valid v1 homes are grandfathered as existing homeowners; v2 profiles with completions or a house retain the first-home state. Previously available legacy projects are snapshotted into `legacyUnlocks`. The exact old stored JSON is retained under `foundations.pre-v2` or `foundations.pre-v3` before its schema upgrade; migration leaves the original untouched if the required backup cannot be saved. No mapping is guessed for legacy design identifiers.

## Verification

- Unit suite: **PASS — 146 tests across 19 files** (`npm test`).
- Production build: **PASS** (`npm run build`, base href `/foundations/`). Initial chunks total about 317 kB raw; the lazy Three.js scene chunk is about 656 kB raw (about 144 kB estimated transfer).
- Production-bundle visual capture: **PASS — 14 property views plus four responsive UI screenshots**. Browser page/console errors: **0**. Observed external hosts: **none** (only the local preview server). WebGL errors: **0**. Context losses: **0**. Horizontal overflow: **none** at the captured 1280×900, 390×844 and 844×390 emulated viewports.
- Renderer observations across the 12 uniform reference captures: **207–215 draw calls** and **220,742–280,923 triangles**. These are Chromium renderer submissions at an emulated desktop viewport, not GPU frame-time or physical-device performance measurements.
- Physical iPhone, Android and Safari testing: **SKIPPED**. No physical device was used. Responsive visual inspection used Chromium viewport/touch emulation only.
- GitHub Pages verification: pending publication of the Phase 4 commits. Do not treat a local build or a configured workflow as a successful deployment.

## Visual comparison and limitations

The three complete sets read as distinct cottages with a consistent road-facing entrance, roof scale, material family, landscaping zones and backyard placement. The pool/retreat, porch, borders and focal gardens remain visible together, and the mixed set shows the pieces compose in one shared lot. The light override creates a readable blue night mood with warm house windows and exterior accents.

The result is still a procedural low-poly miniature, not the polished, near-photographic reference art. Tree crowns and shrubs are faceted clusters, plant beds repeat small generated forms, stone/brick/shingle detail is simplified, and shadows are crisp. The renderer does not use the references' soft global illumination, reflections, depth of field or dense authored foliage. The camera is an orthographic isometric view at a fixed pitch; the “elevated overview” is a wider framing, not a true near-top-down aerial view. There is also intentionally unused surrounding terrain around the one property so the existing continuous-world scene remains visible. These compromises are appropriate for this replaceable procedural pass, but the art is not final.

Recommended visual follow-up: replace individual factories with optimized, authored house/landscape assets or licensed original models and richer atlases, while preserving the current fixed zone IDs, anchors, assembly-piece IDs and 36×29 metre terrain contract. A later camera pass can add a bounded pitch preset for aerial inspection; do not widen the current milestone scope to build more neighborhoods.

## Spatial boundary

The current 36×29 metre terrain, camera bounds and world-wide static batches are sufficient for this home chapter and the empty next-lot teaser. Future continuous expansion will need adjacent lot coordinates, terrain/camera-bound growth and spatial batching or chunks; this phase intentionally does not perform that world-system rewrite.
