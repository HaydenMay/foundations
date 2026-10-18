# Universal Piece Assembly — implementation plan

**Goal:** Replace the first-home whole-object pop with one reusable, asset-agnostic Three.js assembly animator. Use explicit recipes for Cottage, Craftsman and Brick; call the same controller from onboarding and the isolated Developer Preview.

**Baseline:** `docs/phase-3-inspection.md`, screenshots captured before renderer edits, 85/85 unit tests passing. Source changes remain in `src/app/town/` and the existing preview controls in `src/app/`.

## Files and boundaries

- `town/assembly.ts`: typed recipe entries, shared defaults, stable ID ordering, binding validation, immutable baselines, normalized evaluation and lifecycle. It contains no house/style/mesh-name logic and owns no render loop.
- `town/assembly.spec.ts`: real Three.js synthetic-object contract tests for deterministic transforms, hierarchy conversion, lifecycle, ownership and safe invalid inputs.
- `town/residential.ts`, `town/world.ts`: wrap the existing house sections in identity-transform assemblies and return references as part of the built house/world without changing their completed geometry or lot anchor.
- `town/residential-assembly.ts`: explicit ordered recipe data for each existing house style, with stable part IDs and only numeric timing overrides.
- `town/batching.ts` and `town/visual-assets.spec.ts`: batch each piece locally and keep those boundaries intact in parent batches; verify completed bounds/geometry and mobile draw budget.
- `town/scene.ts`, `town/town.component.ts`, `app.ts`: replace the whole-home pose code with `AssemblyAnimator` calls inside the existing elapsed-time rAF path. Keep save-before-animation, Skip, camera easing, reduced-motion, completion callback and cleanup semantics.
- `components/developer-panel.ts`, its CSS, `app.html`: add temporary speed and reduced-motion preview controls. Existing style selection, visibility, preview scenario, same-scene construction and real-state isolation remain the integration path.
- `e2e/onboarding.spec.ts`, `e2e/preview.spec.ts`: assert construction persists before movement, reload shows completed home without replay, preview settings animate the same recipe, and portrait/landscape controls are usable.
- `docs/phase-3-results.md`, `docs/validation.md`, `scripts/capture-phase-3.mjs`, `docs/evidence/phase-3/`: record comparable completed-state and intermediate-frame evidence, tests, performance and unresolved limits.

## Steps

### 1. Build the animator contract test-first

**Status: complete.** The isolated controller contract has 11 focused tests; the full unit suite now passes 96/96.

Write failing tests for: no-semantic synthetic groups; stable-ID fallback ordering; equal normalized progress independent of update history; exact baseline restoration; 20 replays without drift; rotated and non-uniformly scaled parent world-up drops; ancestor/descendant and duplicate-object rejection; required/optional missing bindings; invalid transform rejection; skip/cancel/dispose and at-most-once completion; and independent controllers for separate roots. Then implement the controller with centralized defaults (about 3.6s motion plus at most one 220ms stagger wave, drop height 3.5m, concurrency 4, subtle settle), optional entry overrides and a speed/reduced-motion override. No allocation, geometry creation, clone or callback subscription occurs per animation frame.

### 2. Add recipe-ready house assemblies

**Status: complete.** All three variants expose seven identity-transform batch boundaries; the completed-house bounds match the pre-change fixtures and the 99-test suite passes.

Create identity-local wrappers for the foundation, main structure, entry/porch, roofline and architectural details while retaining the original mesh builders and child relationships. Define explicit stable IDs and intentional numeric order for each of the three styles. Add tests that all recipes resolve to existing siblings, final local/world bounds remain within baseline tolerances, no piece overlaps another by ancestry, and all three completed worlds stay in a measured draw-call/triangle budget. First assert failure from the current flattened batch; then preserve a local batch boundary for each assembly.

### 3. Integrate with the one scene animation loop

**Status: complete.** The current home's explicit recipe now runs from `TownScene`'s existing elapsed-time animation loop. Skip completes once, cancellation and replacement restore without success, reduced motion and missing bindings complete safely, and the existing Home-camera easing is preserved.

Bind an animator to the current home's object instance and recipe. Feed normalized elapsed time from the existing scene rAF callback; keep the established Home-camera interpolation and cached-shadow policy. Skip completes/restores baselines once. Cancel restores without reporting success. Replacing designs cancels old playback before disposing assets; scene disposal cancels and disposes without later mutation. Missing optional entries warn and continue; required/unsafe bindings render the already complete house and end the request safely. Test scene callback count, skip, reduced motion, replacement, disposal, save-before-animation and no historical replay.

### 4. Extend the isolated Developer Preview

**Status: complete.** Preview construction uses the same house recipe and animator; transient 0.5×/1×/2× speed and force-reduced-motion controls never enter persistent state or JSON backups.

Add speed choices and a force-reduced-motion checkbox as ephemeral panel state. The existing house selector supplies the recipe, `Show first house` selects empty/completed presentation, and its existing preview construction action enters the same `TownScene` animator path. Keep the accessible global Skip action. Verify no settings reach store preferences, localStorage, real JSON exports or cross-tab state.

### 5. Compare, validate and publish

**Status: in progress.** Matched final captures and three frozen intermediate recipe frames are recorded; validation and review evidence are complete. Commit, push and Pages verification remain.

Capture baseline and final completed homes at the same camera and lighting; capture genuine intermediate assembly frames for all three recipes. Check final frame transform restoration and style appearance in portrait, landscape and desktop. Run unit tests, full browser suite, production build and hosted browser verification after publishing through the existing Pages workflow. Report physical-device/Safari testing as skipped if unavailable. Commit the inspected plan/baseline checkpoint, implementation increments, then final evidence; merge/push to the configured deployment branch only after tests and screenshot review.

## Review focus

1. Piece roots remain siblings or otherwise non-overlapping; no ancestor and descendant receive two independent offsets.
2. Drop direction is world-up beneath rotated and non-uniformly scaled parents, with no use of geometry/material clones.
3. Every frame starts from saved completed transforms; completing, skipping and replaying 20 times leave exact baseline position/quaternion/scale/visibility.
4. Required missing/unsafe bindings never leave the UI waiting or the house displaced; optional omissions warn and continue.
5. Preview actions use the same recipes/controller and cannot change real storage/exports; first-home state is durable before the first animated frame.
6. Batching boundaries preserve final geometry, asset disposal and a practical mobile draw submission count.

## Execution note

The owner supplied the complete implementation brief and asked that work proceed autonomously. This plan maps that approved scope to the existing code and will be executed in the isolated `agent/codex/universal-assembly` worktree.
