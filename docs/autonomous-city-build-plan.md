# Autonomous City Build Plan

## Repository audit

Work starts from `origin/main` at `8d0670f` (merged Chapter 2 frontage fix). The repository's approved roadmap defines Chapter 1 through 100 lifetime stars and Chapter 2 from 100 to 200 stars. Chapter 2 is one curved residential street with four independently styled neighbor lots, an entrance, community park, and landmark. Earlier Chapter 2 design explicitly reserves a visible road continuation but says it is not Chapter 3 content. There is no approved specification for later districts, commercial buildings, civic buildings, or transport; the only station discussion in `docs/plot-architecture.md` is a schema example explicitly marked hypothetical.

The existing architecture provides an additive project catalog, chapter grouping metadata (currently Chapters 1–2), optional chapter notices, a version-4 browser save, isolated preview state, one Three.js world, shared architecture factories, production assembly recipes, hierarchical `PlotDefinition`s, structural plot validation, and a manual Chromium visual-capture workflow. Chapter 1 uses fixed geometry and Home framing. Chapter 2's latest road-aware lots and open pedestrian fronts must remain intact. Current fully revealed Chapter 2 evidence shows a cohesive road and separated lots, with large empty terrain gaps and sparse shared-space dressing; current headless measurements report 511 draw calls and 668,683 triangles (evidence observation, not a mobile frame-rate claim).

## Approved content and hard invariants

- Preserve Chapter 1 appearance, choices, Home framing, save data, import/export behavior, all existing project IDs and thresholds.
- Preserve Chapter 2's 100-star opening, 200-star completion, four distinct road-aware lots, independent house choices, open frontages, and shared public spaces.
- Keep all new content in the same continuous scene and use the universal plot hierarchy, shared asset library, and `AssemblyAnimator`.
- The owner's brief explicitly approves a late-game elevated monorail loop with two integrated stations and a passenger-free ambient train, plus lightweight ambient life. No cars, traffic, NPC simulation, backend, new reward economy, or deployment.

## Bounded autonomous proposal where the roadmap is silent

To make a modest, coherent town rather than a sparse Chapter 2 diorama, add two additive chapters without changing any existing threshold:

- **Chapter 3 · Town Center** begins at 210 lifetime stars and completes at 300. Four reversible, free projects form a compact connected center east of the existing neighborhood: a Main Street shop row (bakery/bookshop/market focal variants), a community library, a civic plaza (fountain/clock/pergola), and a planted greenway. These are proposals for this implementation, not previously approved roadmap content.
- **Chapter 4 · Elevated Monorail** begins at 400 lifetime stars. One free, reversible project adds a continuously connected elevated loop and two stations, with three coordinated station/train material palettes. The late-game threshold and palette choices are new additive proposals; existing IDs and progression remain unchanged.
- The Chapter 3 street grid attaches to the reserved eastern Chapter 2 continuation. Lots, public sites, sidewalks and access anchors live in one authored master site plan; no layout is embedded as scattered renderer coordinates. The monorail follows a rounded loop around the completed town, above the structure envelope, with supports at validated intervals and stations placed on the loop beside existing pedestrian paths.
- Extend the existing chapter transition and preview grouping systems additively for Chapters 3 and 4. Older v4 saves may omit the new optional notice flags; absent fields mean unseen and do not alter progress. Preview-only project choices, stars, lighting, and construction remain in-memory and are excluded from genuine persistence/exports.

## Implementation and review sequence

1. Add regression tests for additive catalog IDs/thresholds, chapter notice ordering, plot/access/footprint validation, monorail loop closure/height/support spacing, and preview isolation/scenario grouping.
2. Build a data-only continuous city site plan and validate parcels, public/private edges, pedestrian links, station access, and monorail clearance before adding city meshes. Save a labeled overhead diagnostic beside final evidence.
3. Add Chapter 3 assets as curated parent-relative plots with component assembly pieces. Refine Chapter 2's sparse shared areas and edge planting without moving the original home or closing lot fronts.
4. Add the two station plots and the elevated guideway/train as the Chapter 4 project, driven by the existing scene renderer lifecycle. Pause while hidden; honor reduced motion; dispose with the world; keep ambient motion stable and allocation-light.
5. Group Developer Preview into Chapters 1–4 plus shared camera/lighting controls and add representative scenarios for new town, completed Chapter 2, growing Town Center, and completed monorail city.
6. Run unit tests and the `/foundations/` production build. Use the existing manual production capture workflow for overhead, portrait/landscape, day/night, assembly, districts and train evidence. Inspect captures; record draw calls/triangles and browser/WebGL diagnostics where available. Do not add end-to-end tests to the deployment gate, claim physical-device/FPS results, merge, or deploy.

## Implementation review (2026-10-18)

- **PASS:** `npm test` — 33 test files, 252 tests.
- **PASS:** `npm run build` — production Angular bundle generated with `/foundations/` base path.
- **PASS:** Optional production-bundle Chromium visual capture — portrait 390×844 and landscape 844×390 emulation; all page document widths matched the viewport; canvas rendered; no page errors, WebGL errors, or context loss. No physical device, Safari, or frame-rate test was run.
- **Performance observation:** the emulated mobile portrait Town Center used 291 draw calls / 486,804 triangles; landscape city + monorail used 890 calls / 1,082,735 triangles. These are renderer counters, not a frame-rate result. Headless Chromium emitted screenshot `ReadPixels` stall warnings while saving desktop captures.
- **Visual compromises:** the structures remain handcrafted low-poly procedural geometry, not authored reference-quality models. At an all-city view the current projects occupy only part of the continuous lot; broad undeveloped lawns separate the Chapter 2 street, Town Center and civic sites. The elevated loop is sized around the existing city and future room to grow, so it dominates the current built footprint. These were retained to avoid adding unplanned neighborhoods and are visible in the [evidence gallery](evidence/autonomous-city-build/browser-captures/).
- **Not performed:** merge, deployment, physical-device/Safari checks, or E2E tests. The screenshot script remains an optional manual inspection tool, not a test or deployment gate.
