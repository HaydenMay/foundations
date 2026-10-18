# Phase 3 execution ledger — Universal Piece Assembly

Plan: [implementation plan](superpowers/plans/2026-10-18-universal-piece-assembly.md). Approved requirements: supplied `Foundations_Phase3_Universal_Assembly_Refined.md`. Working branch: `agent/codex/universal-assembly`. Baseline/inspection checkpoint: `23cd674`. The app source is unchanged until the assembly core task below.

## Pre-flight interfaces

- Task 1 → Task 3: controller consumes stable-ID bindings and a typed recipe, exposes `durationMs`, normalized `update`, `play`, `skip`, `cancel`, `replay`, `dispose`, and lifecycle. `TownScene` can own timing/rendering without controller subscriptions. No conflict found.
- Task 2 → Task 3: house builder returns its root, assembly references and style-specific recipe; world builder carries those to `TownScene`. No conflict found.
- Task 3 → Task 4: `TownComponent` accepts transient animation overrides; preview panel passes speed/reduced-motion only for a deliberate construction request. No persisted model or real-progress interface change. No conflict found.

## Task 1 — generic controller

RED: the new contract suite failed because `./assembly` did not exist, as expected. During the first implementation pass, the frame-history and transformed-parent tests incorrectly called `update` before `play`; corrected those two test setups to use direct `evaluate` samples and then observed all9initial controller tests pass. Added ambiguity/unsafe-transform coverage and the all-optional edge. RED reproduced the empty-recipe lifecycle bug (`playing` instead of `completed`); fixed by immediately completing a zero-duration recipe.

Implemented `town/assembly.ts`: stable numeric order with ID fallback, immutable transform/visibility baselines, inverse-parent world-up vector, no ancestor/descendant or duplicate-object pieces, required/optional binding behavior, guarded baselines/config, normalized elapsed samples, concurrent waves, ease/settle, preview speed/reduced-motion overrides, cross-controller ownership, and explicit lifecycle. Controller has no RAF, renderer, timer, geometry or material code. It restores completed state on successful finish/skip and cancellation, suppresses callback on cancellation/replacement, and performs no mutation after disposal.

Focused tests: **11/11 PASS**. Full Angular unit suite: **96/96 PASS**,13 files. A first full compile caught TS2367 in `skip` because TypeScript narrowed the backing lifecycle to `playing` across `update`; checking the public lifecycle getter resolved the type error. No production behavior/test expectation was weakened.

## Task 2 — residential recipes and static batches

RED: the new residential contract test failed because no recipe module existed; after the first wiring, focused checks also exposed two fixture/API adjustments (styles deliberately have different explicit choreography; the legacy geometry test now reads `StartingHouseAsset.root`). Both were corrected without changing the expected finished geometry. The established house bounds were measured before refactoring and are now literal regression fixtures.

Wrapped existing meshes in seven identity-transform groups (`foundation`, `walls`, `openings`, `entry`, `roofline`, `garage`, `details`). Cottage, Craftsman and Brick each have an explicit recipe order; Craftsman and Brick place the entry/openings or finishing details in their own authored stages. Each assembly is batched locally and marked as a boundary before world batching, preserving the home anchor and resource ownership. No models, materials, geometry dimensions or world extents were redesigned.

Focused residential and visual-asset tests: **12/12 PASS**. Full Angular unit suite: **99/99 PASS**,14 files. Exact tested home bounds remain within0.001m of the pre-refactor captures; all three completed worlds remain below145 meshes and220,000 triangles. Actual draw calls and screenshot review are recorded after scene integration.

## Task 3 — scene-loop integration

RED: the new scene contract first failed because `TownScene.celebrate` accepted no animation override and had no cancellation API. Integrated `AssemblyAnimator` with the existing requestAnimationFrame loop, elapsed-time normalization, 30 FPS paint limit, visibility-triggered cached-shadow refreshes, camera easing and settlement. Skip invokes completion once; cancel, design replacement, session change and disposal stop without reporting success. Missing required bindings fall back to the already-complete house and finish safely; reduced motion completes synchronously. Replaced the now-unused whole-home pop helper and its obsolete tests.

Focused scene and camera tests: **7/7 PASS**. Preview-lifecycle regressions cover stale-session requests, cancelling active playback on asset replacement, and passing transient settings only for a new request.

## Task 4 — Developer Preview controls

RED: focused panel and app tests failed because the speed/reduced-motion controls and app option signal were absent. Added touch-sized speed choices (0.5×/1×/2×), a force-reduced-motion checkbox, and one-shot options passed to `TownScene`; omitting the checkbox override leaves the OS preference in control. Options live in the app/panel only, reset on preview entry/exit, and are absent from the store and JSON backup. The same production recipes animate in onboarding and Developer Preview. App cancellation handling clears only the matching construction notice.

Focused unit suite after integration: **107/107 PASS**,16 files. Production build: **PASS**. New portrait browser check for assembly options and unchanged genuine storage: **1/1 PASS**. Existing browser suite against the integrated build: **86 PASS, 1 SKIPPED**,87 total; skipped case is the desktop-only variant of a touch-pinch test. Hosted Pages verification remains after push.

## Task 5 — evidence and review

Final screenshots use the exact baseline camera position and afternoon light in portrait390×844, landscape844×390 and desktop1440×1000. All three intermediate frames are frozen from actual running recipes at 0.5× in the portrait capture; their assembly IDs, poses and visibility are recorded in `docs/evidence/phase-3/final-metrics.json`. Chromium reported no console/page errors, no horizontal overflow, and only the local application host. Captures show96 WebGL draw calls and186,792 triangles for the cottage completed scene. See `docs/phase-3-results.md` for comparisons, evidence and validation matrix.

Independent review of `e1e14b4` found no Critical or Minor issues and one Important ownership defect: a second controller could snapshot an animated pose before playback rejection, direct `evaluate()` bypassed ownership, and separate pieces on the same asset root could animate concurrently. **Ruling: accepted and fixed.** Constructors now reject an already-active asset instance or overlapping active bindings before snapshotting, active playback claims the asset root as well as selected pieces, and direct evaluation is blocked by foreign ownership. Three.js contract tests cover active construction, direct evaluation on overlapping trees, one-playback-per-root, and independent instances. The regression tests failed before the fix (11 passed, 2 failed) and now pass (13/13). No other review findings were reported. Full unit, browser and production-build evidence is recorded in the results document after this fix.

Execution note: the installed plan helper set does not include `task-start` or `task-done`, and its `task-brief` extractor expects `Task N` headings while this plan uses numbered sections. Work continued with the numbered plan and this tracked ledger as the durable task record.
