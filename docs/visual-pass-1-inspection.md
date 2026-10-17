# Visual Production Pass 1 — inspection and baseline

Date: 2026-10-17. Inspected clean repository at `ee420da` (deployed application source `77447c9`).

Status: **Phase 1 complete; visual implementation awaits the two reference boards.** The user identifies the visual-style and house-customization boards as primary art direction. Neither image is attached in the conversation yet. The written brief defines scope and functionality, but reference comparison and detailed art decisions cannot be completed without the boards.

Only capture tooling and this evidence record have been added. Application code, saved-state format, scoring, milestone thresholds and deployed visuals remain unchanged.

## Existing systems to preserve

| System                     | Implementation                                | Reuse / integration constraints                                                                                                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Habit and reward rules     | `src/app/domain/habits.ts`, `dates.ts`        | Pure immutable TypeScript rules. Keep 1/2/3 difficulty rewards, ten per local day, permanent ledger and next-day activation unchanged.                                                                                                                                                             |
| Progression and choices    | `src/app/domain/progression.ts`               | Eight projects at 0/5/12/24/40/60/85/115 lifetime stars. Home is available immediately; backyard unlocks at five. All choices remain free and reversible. No new milestones are needed.                                                                                                            |
| Saved data                 | `src/app/domain/state.ts`, `state.service.ts` | Version-one browser-local data with validated JSON import/export and protected concurrent-tab writes. Design IDs are validated against current definitions, so removing legacy home IDs would reject existing saves.                                                                               |
| Architecture and furniture | `src/app/town/assets.ts`                      | `AssetLibrary` caches primitive geometry/materials and owns disposal. Current home variants only change colors on one shared house model. The same house factory is also used by later neighboring houses.                                                                                         |
| Terrain, roads, yards      | `src/app/town/world.ts`                       | Composed rounded terrain slice, road, kerbs, sidewalks, driveway, fences and plantings. A project-ID-to-factory registry adds completed choices. Preserve this boundary rather than redesigning the app.                                                                                           |
| Backyard                   | `world.ts`                                    | Existing `pool`, `fort`, `trampoline` IDs and a shared anchor at world (-10, 0, -8.2). Keep the unlock requirement and align every new house with the same backyard zone.                                                                                                                          |
| Lighting                   | `lighting.ts`, `scene.ts`                     | Local-clock color/intensity interpolation and saved `auto`/`sunrise`/`day`/`sunset`/`night` preferences already work. Labels can describe morning/afternoon without invalidating these IDs. Sun position currently jumps with the lighting label rather than smoothly following a direction curve. |
| Camera                     | `camera.ts`                                   | Orthographic `MapControls`, touch pan/pinch, wheel/drag, explicit rotate/zoom/Home, keyboard support, bounded target and zoom. Preserve the stored relative target/angle/zoom semantics.                                                                                                           |
| Angular bridge             | `town.component.ts`                           | Lazy renderer import, resize observation, separate incoming/pending camera state and 200 ms persistence debounce. Preserve the previous camera-race fix.                                                                                                                                           |
| Portrait shell             | `app.html`, `app.css`                         | The habit sheet resizes available canvas space. The large intro headline is absolutely positioned over the canvas in portrait. The fix should remove that persistent obstruction without redesigning habit management.                                                                             |
| Delivery                   | `package.json`, `.github/workflows/pages.yml` | Angular 22, Three.js 0.186.1, strict checks, separate renderer chunk, production `/foundations/` base path and Pages Actions. No backend, external art, tracking or vehicles are present.                                                                                                          |

## Spatial baseline

The initial house body is 5.8 m wide × 4.3 m deep × 3 m tall, on a 6.2 × 4.7 m foundation. Its roof extends to 6.5 × 4.95 m; a front porch extends the building depth. Its world origin is (-5, 0.13, -4.6), facing the positive-Z road. The entrance aligns with the existing front path at X = -5.35. The driveway is centered at X = -0.8; it is empty and will remain empty.

All three architectural choices should keep the lot, entrance/path, driveway, backyard clearance and approximate envelope compatible. Front and rear elevations need intentional detail. The existing exterior-improvement project changes roof colors; the pass must preserve that selection rather than silently discarding it when a house style changes.

## Visual findings

- The current three home choices are a palette swap, not Cottage/Craftsman/Brick architecture.
- Tree crowns use repeated scaled icosahedra and one trunk pattern. There is no evergreen variant. Garden beds and material relief are sparse.
- The expanded 390×844 portrait canvas is approximately 390×448 px. A 153×120 px intro text block sits inside that canvas, overlapping the tree/yard region in the captured Home view. The house is a relatively small part of the screen; collapsed mode exposes considerable empty space and road.
- The lighting moods are functional, but day surfaces are flat/pale, shadows are comparatively hard, and nighttime loses detail. Smooth sun direction, better material contrast, selective shadows and carefully placed emissive surfaces are appropriate improvements to evaluate against the boards.
- Static quality should come first. The current event-driven renderer is beneficial for a wellness companion and should be retained. Optional ambient motion needs a measured budget and reduced-motion support rather than a permanent expensive render loop.

## Captures and measured baseline

Fresh synthetic browser profiles were used; no personal records were read. [Capture script](../scripts/capture-visual-baseline.mjs), [full metrics](evidence/visual-pass-1/baseline/metrics.json).

| View                               | Draw calls reported by Three.js | Rendered triangles | Meshes / shadow casters |
| ---------------------------------- | ------------------------------: | -----------------: | ----------------------: |
| Portrait 390×844, expanded         |                             645 |             18,438 |               338 / 337 |
| Compact portrait 390×664, expanded |                             662 |             19,466 |               338 / 337 |
| Landscape 844×390, expanded        |                             675 |             20,442 |               338 / 337 |
| Desktop 1440×1000, expanded        |                             664 |             19,594 |               338 / 337 |

The mobile samples use renderer pixel ratio two. All captures reported **zero console/page errors and WebGL error zero**. Each layout submitted **zero extra frames over a 700 ms idle observation** after settling. Render CPU submission samples are stored, but include warmup and are not GPU timings or a physical-device FPS measurement. No physical-device performance claim is made.

Draw submissions and almost universal shadow casting are the immediate performance concerns. Reuse/merge compatible static surfaces, share window/material instances, and restrict shadow casting to meaningful forms before increasing detail. Current asset disposal should be retained and tested across repeated style/backyard changes.

Baseline images:

- [Portrait — expanded](evidence/visual-pass-1/baseline/portrait-day-expanded.png), [collapsed](evidence/visual-pass-1/baseline/portrait-day-collapsed.png).
- [Compact portrait — expanded](evidence/visual-pass-1/baseline/compact-portrait-day-expanded.png), [collapsed](evidence/visual-pass-1/baseline/compact-portrait-day-collapsed.png).
- [Landscape — expanded](evidence/visual-pass-1/baseline/landscape-day-expanded.png), [collapsed](evidence/visual-pass-1/baseline/landscape-day-collapsed.png).
- [Desktop — expanded](evidence/visual-pass-1/baseline/desktop-day-expanded.png), [collapsed](evidence/visual-pass-1/baseline/desktop-day-collapsed.png).
- [Morning](evidence/visual-pass-1/baseline/portrait-sunrise-collapsed.png), [afternoon](evidence/visual-pass-1/baseline/portrait-day-collapsed.png), [sunset](evidence/visual-pass-1/baseline/portrait-sunset-collapsed.png), [night](evidence/visual-pass-1/baseline/portrait-night-collapsed.png).

## Executed baseline checks

| Check                                                          | Result                                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `npm test` through Node 24.15 runtime                          | **PASS — 41/41**, three test files                                            |
| `npm run build` through Node 24.15 runtime                     | **PASS**, no warnings; correct `/foundations/` base                           |
| `npx playwright test`                                          | **PASS — 35**, **SKIPPED — 1** desktop-only touch test; zero failures; 51.0 s |
| Eleven baseline screenshots and renderer observations          | **PASS**, four viewport sizes, four lighting moods                            |
| Physical phones / actual Safari / reference-quality comparison | **NOT PERFORMED**; devices and reference boards unavailable                   |

The build is approximately 267 kB raw / 73 kB estimated transfer for the initial shell, plus a 610 kB raw / 130 kB renderer chunk. Existing browser tests cover actual touch emulation, mouse camera controls, local reload persistence, customization, unlocks, permanent rewards, backups, concurrent tabs and local midnight rollover.

## Resume plan after the boards arrive

1. Inspect both boards and record the specific proportions, material cues, canopy silhouettes and four lighting moods. Use them for fair before/after comparisons; do not substitute generated images for the missing direction.
2. Extend the existing asset factories and shared material conventions. Retain legacy home choice IDs, or add explicit tested aliases before changing any IDs; keep the star ledger and all milestone thresholds untouched. Isolate starting-house variants from unrelated later-house behavior.
3. Build three distinct compatible house forms and improve their shared lot/backyard assets. Keep no-car scope. Batch repeated details and assign selective shadow flags. Avoid full-city work.
4. Improve lighting direction/contrast and Home framing, and replace the obstructive intro treatment with a compact non-obscuring one. Preserve camera controls and preferences.
5. Add tests for the three styles, older saves, all house/backyard pairings, unchanged rewards/unlocks, manual/automatic lighting and framing. Capture each house and four moods in portrait/landscape; compare measured rendering cost and check disposal.
6. Execute existing suites and production build, review source and captures, commit/push, verify Pages deployment and run live checks. Report remaining visual gaps against the actual boards and any real-device limits.

The missing reference boards are the only current input blocker. This record is an inspection milestone, not a claim that the visual production assignment or a new deployment is complete.
