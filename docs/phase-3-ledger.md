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
