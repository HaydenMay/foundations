# Phase 4 — Home Milestones and Visual Sets Implementation Plan

> **For agentic workers:** Implement this plan inline, task by task, with focused tests and frequent commits.

**Goal:** Extend the existing original-home experience through the 100-star chapter milestone with curated, reversible designs, in-world previews, assembly reveals and reviewable A/B/C visual sets.

**Architecture:** Keep the current Angular store and Three.js world. Add a versioned milestone catalog and additive design keys; retain the existing v1/v2 design IDs as compatibility projects so saved constructions keep rendering. Compose the new fixed lot zones as separately owned project roots and animate them through the Phase 3 `AssemblyAnimator` inside `TownScene`.

**Tech Stack:** Angular 22, TypeScript, Three.js, Vitest, optional Playwright-based visual capture scripts, GitHub Actions Pages.

**Spec:** User-supplied `Foundations_Phase4_Home_Milestones_and_Visual_Sets.md` and its three A/B/C property references.

## Global Constraints

- Preserve habit history, lifetime stars, first-home onboarding, three house styles, existing choices and imported v1/v2 saves.
- New reward thresholds: first valid completion for home; 10, 20, 30, 40, 50, 60, 70, 80 and 90 stars for selectable projects; 100 stars for the chapter-complete empty-lot reveal.
- All choices are complete A/B/C compositions, free to preview, confirm and switch; no manual placement or random generation.
- Keep current house, road, driveway, renderer, camera bounds and asset ownership unless measured zone-clearance checks prove a small change is necessary.
- Keep real and Developer Preview state isolated; never put preview choices or camera/light evaluation state in real persistence.
- Do not add E2E tests or a browser test gate to Pages; keep deploy checks to unit tests and production build.
- Stop at the original property and the empty next-lot teaser; do not add Chapter 2 buildings or systems.

## Review Focus

- v1/v2 home and backyard selections remain valid after migration; legacy selections and high-star unlock access are preserved without replaying rewards.
- Old exterior/garden/street/neighborhood designs do not overlap new feature zones or disappear from migrated worlds.
- All new compositions clear the shared home, porch, driveway, walks, property edge and one another across all three house styles.
- Preview cancel, confirmation failure, animation skip/reduced motion and reload never change the wrong state or leave partial/duplicate assets.
- Crossing 100 stars reveals one adjacent empty lot without replacing an already-present legacy neighbor home.

---

### Task 1: Versioned milestone catalog and save migration

**Files:** `src/app/domain/models.ts`, `progression.ts`, `state.ts`, `state.service.ts`, `migration.spec.ts`, `first-home.spec.ts`, backup UI/docs.

- [x] Add the Phase 4 project catalog with stable IDs, exact thresholds, A/B/C labels and feature-zone/camera metadata; keep old project definitions in a compatibility registry.
- [x] Bump new profiles to schema v3. Migrate v1/v2 saves conservatively, preserve all existing `designs` and unknown fields, snapshot previously unlocked legacy projects, and retain original bytes in a per-version `foundations.pre-vN` backup before the durable write.
- [x] Keep the existing `backyard` IDs and home IDs unchanged. Do not guess mappings from old `exterior`, `garden`, `street`, `neighbor`, `house2` or `circle` selections; preserve them as legacy values and keep their already-built visuals available.
- [x] Add failing tests for the milestone catalog and boundaries, v1/v2 migration, a zero-star first completion, high-star unchosen unlocks, backup quota failure, and JSON export/import retaining both old and new selections.
- [x] Run the full unit suite (124/124 passed).

### Task 2: Fixed zone layout and curated visual assets

**Files:** `src/app/town/{milestone-assets,world,landscaping,backyards,residential}.ts`, focused world/compatibility tests, `docs/visual-assets.md`.

- [ ] Define metre-based zones for front planting, front centerpiece, porch, attraction, retreat, garden expansion, boundary, lighting and signature feature around the existing house/driveway anchors.
- [ ] Build each target A/B/C option as a deterministic composition using shared asset/material conventions; map the supplied three reference boards directly to the A/B/C choices in the brief.
- [ ] Return one owned root and stable assembly-piece map per selected project. Keep pre-Phase-4 project factories intact for legacy saves.
- [ ] Add geometry-bound/anchor tests for all options, no overlap with road/driveway/door/paths or adjacent milestone zones, and all three house styles. Make a controlled layout proposal before changing lot bounds if the fixed layout fails these checks.
- [ ] Verify mesh/triangle/draw-call growth remains within the existing mobile budget.

### Task 3: Project preview, persistence and assembly playback

**Files:** `src/app/app.ts`, `app.html`, `state.service.ts`, `town/{world,scene,town.component,construction}.ts`, new scene/state tests.

- [ ] Add in-memory draft design selection for normal project review. Render the selected complete option in the actual world; Cancel restores committed visuals; Confirm writes the selected design durably before requesting playback.
- [ ] Use each project’s stable assembly references and recipe with the existing Phase 3 animator. Handle additions and replacements, camera focus/return, skip, reduced motion, cancellation, rapid selection, reload and disposal without a second RAF loop or leaked assets.
- [ ] Keep preview camera/light state transient; camera focus must not persist user preferences.
- [ ] Add tests for side-effect-free preview/cancel, durable-before-animation ordering, free re-selection, replacement animation, skip/reduced motion and cleanup.

### Task 4: Developer Preview and chapter-end reveal

**Files:** `src/app/domain/preview.ts`, `state.service.ts`, `components/developer-panel.ts`, `developer-panel.spec.ts`, `app.ts`, `town/world.ts`, scene tests.

- [ ] Extend the disposable panel to cover the production A/B/C options, visibility, threshold jumps, manual/automatic lighting and the five required scenarios.
- [ ] Ensure simulated designs/stars and camera/light evaluation never reach real storage, backup exports or other tabs.
- [ ] At 100 lifetime stars, show a small adjacent empty residential lot in the same world and animate its reveal once when the user crosses the threshold. Never overwrite or hide an existing legacy neighbor construction.
- [ ] Add tests for scenario coverage, preview isolation and the 100-star reveal boundary.

### Task 5: Reference captures and final validation

**Files:** `scripts/capture-phase-4.mjs`, `docs/evidence/phase-4/`, `docs/phase-4-results.md`, `README.md`.

- [ ] Add a manual capture script using a fresh synthetic browser profile and production options. Capture A, B and C full-property sets from front three-quarter, rear three-quarter, elevated overview and night views with comparable framing (at least 12 running-app screenshots).
- [ ] Produce a labeled contact sheet/HTML gallery and option legend. Capture mixed designs and inspect all three house styles for clipping, color conflicts and clearance.
- [ ] Record verified versus assumed behavior and compare the procedural result honestly with the supplied references; report actual-device testing as skipped unless performed.
- [ ] Run `npm test`, `npm run build`, `git diff --check`, local manual visual captures, then push and verify the short Pages workflow and live `/foundations/` app.

