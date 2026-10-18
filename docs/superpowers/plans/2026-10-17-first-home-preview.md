# First Home and Developer Preview Implementation Plan

> **For agentic workers:** use superpowers:executing-plans inline, task by task, with test-first changes and one fresh final review.

**Goal:** empty-lot first-home onboarding and disposable Developer Preview without changing genuine progress.

**Architecture:** v2 explicit unlock state and conservative v1 migration; separate real/preview state signals; same renderer with an isolated home animation subtree. Preserve eight project IDs/thresholds after the first home and all existing art/controls.

**Tech stack:** existing Angular22, TypeScript6, Three.js, Vitest, Playwright, localStorage and GitHub Pages.

**Spec:** [design and inspected risks](../../phase-2-design.md), derived from owner's complete Phase2 brief. Authorization includes autonomous implementation, commits, push and deployment. No additional approval gate.

## Global constraints

No backend, accounts, analytics, cars, new milestones, expanded neighborhoods or new habit systems. Stars/history are permanent. Every valid completion qualifies regardless of earned stars. Save selection before animation. Preview is memory-only and never exported or synchronized. Keep original records protected on migration/storage failure. All geometry and asset URLs remain project-site compatible.

## Review focus

1. A zero-star v1 profile must retain its visible home and unknown fields; test migration and import explicitly.
2. Preview camera callbacks queued before exit must not write into real preferences; test session epochs and real browser exit/reload.
3. Real-tab updates while preview is open must remain authoritative on exit and export; test actual storage events/two tabs.
4. A failed home write must not trigger construction or lose the pending choice; test quota failure and reload-safe state.
5. A hidden tab, skipped animation or renderer disposal must not leave a hidden saved home or rAF loop; test reduced motion/Skip/reload and inspect disposal.

## Task1 — persisted first-home eligibility and migration

Files: domain/models.ts,state.ts,habits.ts,progression.ts; new domain/first-home.spec.ts; state.service.ts migration backup; existing unit fixtures.

Interfaces: AppState.version2, onboarding.firstHomeUnlocked:boolean; initialState(date) empty; importState accepts v1/v2 and returns v2; isProjectUnlocked(state,project,stars?) reused by UI; selectDesign retains free reversible choices.

- [x] RED: new/legacy zero-star states, all difficulties, invalid/repeated/zero-star completion, pending/built reload, unknown fields/import, safe migration backup failure.
- [x] GREEN: explicit unlock on completion, home condition, non-destructive migration/backup and durable-home commit support.
- [x] Run full unit suite; adjust old tests only where they intentionally represented an existing house profile. Commit with evidence.

## Task2 — isolated preview boundary and controls model

Files: state.service.ts; new domain/preview.ts and preview.spec.ts; store isolation tests.

Interfaces: store.state() effective view; store.realState() durable source; preview() optional session with state/simulatedStars; sessionKey(); enterPreview(),exitPreview(),resetPreview(),previewScenario(),previewStars(),previewJump(),previewDesign(),previewVisible(); backupJSON() always real. Preview scenarios new/ready/home/several/all use existing project factories only.

- [x] RED: byte-identical real storage/backup/history/schedules/stars/designs under every preview control, exit/reload, storage events and concurrent/stale queued changes.
- [x] GREEN: separate signals and commit paths, simulated metadata and pure scenarios, real-only export/import guard, epoch invalidation.
- [x] Full unit suite and commit. No preview storage flags or rollback writes.

## Task3 — same-lot empty state and short construction

Files: town/world.ts,batching.ts,scene.ts,camera.ts,town.component.ts; new construction helper/tests; asset tests.

Interfaces: TownWorld.home optional Group, static batch subtree boundary; TownScene.celebrate(done),finishConstruction(); TownComponent construction request/session input, matching camera event token and finished output. Construction2800ms, reduced motion/Skip immediate, no timer persistence.

- [x] RED: no house/project in empty world, house subtree bounds/ownership/batching, camera interpolation/end values, bounded construction phase/reduced motion.
- [x] GREEN: modest empty lot, separately batch existing house, short rAF sequence and cleanup, scoped camera events/debounce reset. Keep art and all camera gestures.
- [x] Full unit suite/production build; commit.

## Task4 — first-home selector and phone-friendly preview panel

Files: app.ts,app.html,app.css; new components/home-selection and developer-panel TS/CSS; e2e/onboarding.spec.ts,preview.spec.ts and existing browser fixtures.

Interfaces: nonpersistent draft design drives existing renderer; confirmed home commits before celebration; preview panel events call only preview APIs; Settings deliberate entry; active badge/Exit remain visible with collapsed panel. Camera events validate sessionKey before store changes.

- [x] RED browser: empty-first flow and reloads, three style previews/confirmation/reversal, skip/reduced motion, isolation exports/exit/reload/two tabs, five scenarios and overflow across three viewports.
- [x] GREEN: responsive sheets, pending-home reminder, real legacy bypass, compact grouped preview controls/camera readout, real-only backup UI.
- [x] Run full unit/browser suite, production build; inspect actual screenshots and console/WebGL errors. Commit.

## Task5 — independent review, evidence and deployment

- [x] Capture new empty lot, selection styles, completion/celebration and preview states in portrait/landscape using synthetic data. Measure renderer/idle; document limits.
- [x] Fresh read-only review covering migration, isolation, storage/camera races and animation lifecycle. Resolve material findings with red/green regression tests and full verification.
- [x] Push verified source; await successful GitHub Actions/Pages; run hosted browser checks. Record actual hashes/results and no physical-device claim. Commit/push evidence and README with no further app changes.

## Ledger

See [phase2ledger](../../phase-2-ledger.md). Pre-flight interfaces: Task1 supplies v2/onboarding to Task2 scenarios and Task4 selector; Task2 session epoch is consumed by Task3 camera events and Task4 UI; Task3 house boundary consumes unchanged design IDs and supplies saved-home animation to Task4. No conflicting interfaces identified.
