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
