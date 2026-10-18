# Phase 3 — Universal Piece Assembly

## Implementation

The first-home reveal now animates the existing house as authored pieces instead of scaling and lifting the whole house. A reusable `AssemblyAnimator` accepts an asset root, stable-ID bindings and a numeric recipe; it owns no renderer, geometry, materials, timer or render loop. Cottage, Craftsman and Brick each expose seven identity-transform assembly boundaries with an explicit choreography order. Completed geometry, materials, lot dimensions and camera anchor remain unchanged.

`TownScene` drives normalized elapsed progress through its existing requestAnimationFrame loop. It keeps camera easing and cached shadow maps, limits useful redraws to about 30 per second, restores exact transforms on completion/Skip/cancel, and disposes playback before replacing or releasing house assets. Reduced-motion, empty recipes and missing required bindings settle safely. Scenario/session changes and house replacement cancel without showing a success message.

The controller now claims both the asset root and selected piece trees during playback. A competing controller cannot snapshot an in-progress pose, run alongside another playback on the same instance, or mutate an owned piece through direct evaluation. Constructor conflicts are rejected before transform baselines are captured.

Developer Preview exposes 0.5×, 1× and 2× assembly speeds and an optional force-reduced-motion toggle. A deliberate construction request passes those transient values through the same `TownScene` recipe path used by onboarding. Omitting the toggle preserves the device's reduced-motion preference. The controls are in-memory app/panel state; they do not enter `FoundationsStore`, local storage, backup exports or cross-tab messages.

## Visual evidence

The final completed homes were captured at the baseline camera `(19.0416, 29.8, 19.4416)`, zoom `1`, and afternoon light in portrait 390×844, landscape 844×390 and desktop 1440×1000. The completed scenes match the pre-animation house geometry and framing. Three portrait intermediate captures show genuine recipe poses, frozen during browser animation-frame delivery so image encoding does not turn them into settled screenshots. All captures contain the Developer Preview badge and camera controls; construction status appears only in intermediate frames.

| House             | Completed portrait                                          | Intermediate assembly                                          |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Classic Cottage   | [screenshot](evidence/phase-3/final-portrait-cottage.png)   | [screenshot](evidence/phase-3/assembly-portrait-cottage.png)   |
| Modern Craftsman  | [screenshot](evidence/phase-3/final-portrait-craftsman.png) | [screenshot](evidence/phase-3/assembly-portrait-craftsman.png) |
| Traditional Brick | [screenshot](evidence/phase-3/final-portrait-brick.png)     | [screenshot](evidence/phase-3/assembly-portrait-brick.png)     |

See [all layouts and the baseline comparison](evidence/phase-3/README.md). The capture command and per-frame measurements are in [final-metrics.json](evidence/phase-3/final-metrics.json).

## Validation

| Check                                                   | Result                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Unit tests (Angular/Vitest)                             | **PASS** — 109 tests across 16 files                                                                                        |
| Browser suite (Chromium portrait, landscape, desktop)   | **PASS (historical)** — 89 passed; 1 expected desktop touch-only pinch case skipped; suite has since been removed          |
| New assembly-preview browser check                      | **PASS (historical)** — 1 portrait run; genuine storage stayed byte-for-byte unchanged                                      |
| Production Angular build with `/foundations/` base href | **PASS** — output in `dist/foundations/browser`                                                                             |
| Final capture and assertions                            | **PASS** — 9 completed views, 3 intermediate frames, consistent camera/light, no console/page errors or horizontal overflow |
| Physical iPhone/iPad or Safari                          | **SKIPPED** — no physical device or Safari session was available                                                            |

Chromium's completed Cottage scene measured 96 WebGL draw calls and 186,792 triangles. The application's initial bundles were 303.60 kB raw (80.75 kB estimated transfer) and the lazy scene chunk was 641.02 kB raw (138.91 kB estimated transfer). These are renderer and bundle observations, not a physical-device frame-rate measurement.

## Save safety and deployment

No serialized model or save version changed in this phase. Existing user data and imported saves keep the same shape. The house selection is saved by the existing durable first-home flow before animation is requested; reload shows the saved house and never replays an old construction event. Preview options are not persistent data.

Implementation commit: `19ee8e99bec0cc763f454215d98ad4c7f2d3a5d7`. `final-metrics.json` records the same captured application source commit. The current deployment workflow gates publication on unit tests and the production build; the previously used end-to-end suite has been removed at the owner's request. Optional Playwright-based visual capture scripts remain available for manual evidence gathering.

## Limitations and recommended mitigation

- The three detailed procedural houses are intentionally reused as-is; this phase adds assembly motion, not new architectural or material art. Their completed screenshots are therefore visually unchanged from the baseline. The assemblies are seven coarse structural groups rather than individual boards, windows or shingles.
- Current capture performance comes from Chromium emulation on this development host. The polygon/draw-call count is within the project's existing mobile budget, but physical mobile GPU timing remains unmeasured. Check frame pacing on a representative phone after visual-reference review.
- The current lot and camera boundaries remain sized for the existing small town scene. This task does not change them. Continuous expansion can attach future lots to the same world, but a later city-size milestone should revisit camera/world bounds before it adds distant construction.
- A required recipe binding failure logs a warning and completes the already-visible house immediately so the UI does not hang. New assets should add stable bindings and update recipe tests before shipping their reveal.
