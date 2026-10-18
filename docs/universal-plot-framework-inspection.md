# Universal plot framework · inspection and visual baseline

Captured before product-code changes to the Chapter 1 renderer or Chapter 2 assets.

## Branch and integration point

- Foundations PR #1 is an open draft: `agent/codex/phase-4-2-final-polish` (`fb9031c`) → `main`.
- Foundations PR #2 is an open draft: `agent/codex/chapter-2-neighborhood` (`1b199f2`) → PR #1's branch.
- This work is on `agent/codex/universal-plot-framework`, created from PR #2's reviewed head `1b199f2`.
- Intended stack: PR #1 → PR #2 → this framework draft. No existing branch is rebased, merged, deployed, or force-pushed.
- No Foundations `AGENTS.md` is present at the repository root or in the source tree.

## Existing module boundaries

- `town/assets.ts` owns shared Three.js materials, geometries, textures and disposal.
- `town/residential.ts` builds the original Cottage, Craftsman and Brick home variants. `residential-assembly.ts` separately maps their stable component IDs to the production `AssemblyAnimator` recipes in `town/assembly.ts`.
- `town/milestone-assets.ts` builds the Chapter 1 design zones from `FEATURE_ZONES`; each project exposes stable assembly groups and a recipe. `town/backyards.ts` and `town/landscaping.ts` provide shared pieces.
- `town/chapter-two-houses.ts` and `chapter-two-assets.ts` build Chapter 2 neighbors, their parcels and shared spaces. The first neighbor uses an 11.2 × 9.8 m lot anchored at `(5.8, -3.3)`.
- `town/world.ts` composes the continuous scene from persisted design IDs. It currently authors most objects under one world group and uses static material batching. Home/project roots are protected as batching boundaries for animation. `town/scene.ts` owns the live scene and delegates assembly playback to `AssemblyAnimator`; `town/town.component.ts` owns its Angular lifecycle.
- `components/developer-panel.ts` groups disposable controls into Chapter 1, Chapter 2 and Shared tabs. The preview changes do not require a save-schema migration.

## Coordinate and scale conventions

- Existing residential geometry uses metre-scale world units: X is left/right, Y is up, Z is front/back, and the ground plane is Y = 0. The Chapter 1 entry and porch face positive Z. One world unit is treated as one metre.
- The original starting-house root is authored at `(-5, 0.13, -4.6)`. Its actual measured bounds and style differences are retained in the existing `residential-assembly.spec.ts` fixtures; the home is not non-uniformly scaled.
- `FEATURE_ZONES.boundary` defines the original 14 × 13.5 m property envelope: X `[-12.85, 1.15]`, Z `[-12.2, 1.3]`, center `(-5.85, -5.45)`. Existing zones and driveway/frontage intentionally meet or cross this boundary.
- The Chapter 2 road, parcel anchors and camera already share this world. The first production parcel currently overlaps the Chapter 1 property's X envelope by 0.95 m; the framework proof uses its own wider, shifted parcel instead of carrying that compressed spacing into the demonstration. It is not a new scene or a relocation of the shipped property.

## Rendering and integration risks

1. Chapter 1 factories author positions in the current world frame. Static batching bakes child transforms into material batches, and the animator expects the original assembly groups and IDs. Reparenting those assets or treating design dimensions as scale would change completed visuals or animate the wrong objects.
2. Chapter 1 zones deliberately overlap: the boundary and outdoor-lighting options span the lot, while structures, planting and porch additions occupy more specific regions. Validation must distinguish ownership/bounds from exclusive ground occupancy and carry explicit overlap reasons.
3. A logical plot description must stay lightweight. It should not create a render group or draw call for each data node, and it must not own or dispose the referenced production assets.
4. The Chapter 2 developer preview has its own 4-house production layout. This pass must prove only one neighbor and must not replace the other houses, street or shared spaces.
5. `scripts/capture-phase-4.mjs` predates the chapter-grouped preview and cannot select its old `all` option. The current Chapter 2 capture helper still runs against the production bundle. The universal-framework helper below uses the current Chapter 1 controls.

## Baseline evidence

All screenshots were captured from the production Angular bundle at source branch head `1b199f2`, served locally under `/foundations/`. Browser sessions used a fresh synthetic profile and Developer Preview; no real habit data or saved progress was changed.

- [Chapter 1 completed style and milestone views](evidence/universal-plot-framework/baseline/chapter-1/index.html): Cottage, Craftsman and Brick views, representative completed milestones, mixed choices, and portrait/landscape UI captures. The viewport is 1280 × 900 for property views; all use daytime lighting and the existing Home framing.
- [Chapter 2 original-neighbor comparison](evidence/universal-plot-framework/baseline/comparison/chapter-2-original-neighbor-baseline.png): original house and first neighbor in one 1600 × 1000 view, at fixed camera position `(29.25, 21.6, 20)` and zoom `0.72`, with daylight and the 100-star neighborhood preview.
- The separate full Chapter 2 capture remains available in [the Chapter 2 evidence gallery](evidence/chapter-2/README.md); the comparison image above is the focused baseline for this single-lot proof.
- Baseline unit tests: PASS, 25 files / 202 tests. Baseline production build: PASS with `/foundations/` base href.
- The comparison view reported 408 draw calls, 496,196 triangles, 296 visible scene meshes, WebGL error `0`, and no lost context. This is a desktop render snapshot, not an FPS or mobile-device benchmark. Chromium reported GPU `ReadPixels` stalls during screenshot readback.

## Chosen foundation approach

Keep `buildWorld`, the existing asset factories, batching, persistence and `AssemblyAnimator` as the production rendering path. Add a typed ownership/placement model whose nodes carry local transforms, design dimensions, occupancy/clearance and optional asset/assembly references. Chapter 1 nodes will describe its existing house and milestone zones without rewriting the authored geometry. A synthetic transform adapter will prove the original property group can move and rotate intact.

The single Chapter 2 proof lot uses the existing Chapter 1 house builder and its recipe inside a genuinely local, centred lot blueprint with explicit road-access anchors, a driveway, walkway and restrained landscaping. It uses the Chapter 2 neighbor's design selection independently from the player's house. The preview-only parcel sits 8.5 m from the starter property's side boundary and replaces just the first neighbor while enabled. The normal saved world, all other Chapter 2 lots and all real progress remain unchanged; broad Chapter 2 spacing changes remain outside this proof pass.

## Visual-review follow-up and final verification

The first proof capture repeated the player's Cottage appearance, which made both homes look like copies. The proof now maps the first neighbor's own selection to the matching Chapter 1 builder (`cottage` → `sage`, `craftsman` → `cream`, `brick` → `blue`) and keeps that selection independent from the original home. The proof lot is 13.5 m wide and sits 8.5 m east of the Chapter 1 property's edge; a buffer tree marks the separation. The proof camera frames both detached properties in one fixed view.

- [Before/after and construction gallery](evidence/universal-plot-framework/final/comparison/README.md), including 1600 × 1000, 390 × 844 portrait, and 844 × 390 landscape captures.
- Unit tests: PASS, 28 files / 223 tests.
- Production build: PASS, Angular build with `/foundations/` base href; initial transfer estimate 87.20 kB, lazy Three.js scene chunk 153.34 kB.
- Browser render checks: PASS, no page/console errors, WebGL error `0`, context intact, no horizontal overflow at the recorded viewports. The 1600 × 1000 complete view measured 334 draw calls, 282,241 triangles and 334 scene meshes. Chromium reported `ReadPixels` GPU stalls while evidence screenshots were read back; this is not an FPS measurement.
- Chapter 1 visual regression: PASS, all baseline/final screenshot and gallery files are byte-identical (metrics excluded). No physical-device test was performed; browser viewports are simulated.
- Deployment: SKIPPED by the framework assignment's stop boundary. The draft branch is stacked on Chapter 2 PR #2; no merge or Pages deployment was attempted.

The remaining four-home Chapter 2 layout is intentionally not migrated in this pass. Its first production lot still has a 0.95 m overlap with the Chapter 1 property envelope, and the other production neighbors retain their current builder/layout. The proof demonstrates the spacing and style separation requested for review; before converting the remaining neighborhood, re-author those parcel positions with explicit detached-home side yards and validate the full road frontage as one continuous composition.
