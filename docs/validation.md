# Validation record

Initial implementation date: 2026-10-17. Local platform: Windows, Node 24.15.0 via npm's temporary runtime, Angular 22.2.3, Three.js 0.186.1. No Ember Bastion files were modified.

## Executed so far

- Domain red/green: the initial suite failed on 25 missing behaviors, then passed 30/30 after implementation.
- Lighting/camera red/green: four new tests failed before implementation, then passed; combined suite 34/34.
- Storage resilience red/green: blocked storage reads prevented tracking; reproduced with a failing test, separated inaccessible storage from malformed saved data, then passed 37/37.
- Strict TypeScript and Angular template checking are enabled. Production build passed with the `/foundations/` base path. Initial shell ~265 kB raw / ~72 kB estimated transfer; lazy renderer ~610 kB raw / ~130 kB transfer.
- Browser tests exposed a missing accessible name on the mobile town button; fixed. Night capture exposed an excessively dark background; fixed using an unlit palette-matched backdrop and brighter moon/ambient lighting.
- An Auckland timezone browser regression reproduced an incorrect calendar heading east of UTC. Calendar-only display now explicitly uses noon UTC while business scheduling continues to use local dates.
- Portrait, landscape and desktop screenshots inspected locally. Habit content scrolls inside its sheet on compact viewports; collapsing it increases town space.

Final browser suite, independent review and live deployment verification will be recorded below once executed. No deployment is claimed by this preliminary record.

## Latest local verification

2026-10-17: `npm test` passed **37/37**; `npm run build` passed with no warnings. The expanded browser suite passed **32**, skipped **1** desktop touch-only case, with no failures in 49.4 seconds. It exercised portrait, landscape and desktop, real mouse drag/wheel, emulated touch pan/pinch, backup preview/restore, two tabs racing one completion, Auckland calendar labels/midnight rollover, and all built projects in four lighting modes. Actual phone hardware and Safari are not covered by this evidence.

Final screenshot inspection found dark text over the night scene; the shell now changes the scene heading colors with the renderer palette. Mobile camera targets were enlarged and habit text increased. These final presentation adjustments are included in the next browser run.

## Independent review and fixes

A separate read-only reviewer inspected commit `ea4aad7`. Three material issues were reproduced with failing regression tests and fixed:

1. Storage recovery after a failed write could overwrite a newer tab's history. The store now tracks the exact persisted baseline. Divergent versions remain preserved; the unsaved session warns and blocks automatic replacement until an explicit backup import. There is no automatic conflict merge.
2. Unreadable data discovered during an existing session could bypass constructor protection. Read failures and invalid saved data are now separate paths; direct discoveries and storage events protect the original from writes.
3. A habit action during the 200 ms camera-save debounce could restore an old view. Incoming persisted camera state is tracked separately from pending renderer state. A real-browser regression now rotates and completes a habit in the same turn, then checks the saved angle. Backup restore also exercises an actual external camera change.

Two small findings were addressed in this delivery pass: import now rejects any completion dated after a one-time completion for the same goal, while retaining earlier recurring history; design-choice buttons expose `aria-pressed` for the current selection. Their regression checks failed before the changes.

After the fixes, `npm test` passed **41/41** and the production build passed without warnings. The preceding browser run passed **35**, skipped **1** desktop touch-only case (54.7 seconds); a final run including all fixes follows. No second independent review was dispatched; the original author's fix verification consists of the regression tests and full suites.

## Final local result before publication

All final changes verified: **41 unit tests passed; 35 browser tests passed; 1 desktop touch-only test explicitly skipped; 0 failures**. Browser run: 53.9 seconds. Production build passed without warnings. `git diff --check` passed. Production dependency audit reported **0 vulnerabilities**. A repository token/private-key pattern scan found no matches (exit 1 means no matches). Committed screenshots use synthetic test progress, not personal wellness records.

## Verified deployment

Application commit: `77447c99f975959319561201eca56e53c01f13e7`.

- Public repository verified through GitHub API: https://github.com/HaydenMay/foundations (`isPrivate: false`, default branch `main`).
- Pages configured as `build_type: workflow`, HTTPS enforced, at https://haydenmay.github.io/foundations/.
- [GitHub Actions run 39015467506](https://github.com/HaydenMay/foundations/actions/runs/39015467506): **success**, both build and deploy jobs successful. Ubuntu runner: npm install audit **0 vulnerabilities**, unit tests **41 passed**, production build succeeded, browser tests **35 passed / 1 skipped** (1.9 minutes).
- Live HTTPS response: **200**, title `Foundations`, `<base href="/foundations/">`.
- Executed `BASE_URL=https://haydenmay.github.io/foundations/ npx playwright test --grep 'renders the town|supports lighting'` (PowerShell equivalent used locally). **6/6 passed** in 15.5 seconds across portrait, landscape and desktop: WebGL canvas rendered, completion persisted after reload, panel preference persisted, lighting override and camera buttons worked, no horizontal overflow, no page errors in load/persistence checks.
- Additional live load at **390×844**: rendered canvas, **no page errors**, all observed request hosts limited to `haydenmay.github.io`. This is a runtime network observation in addition to source inspection; no wellness data transmission was implemented.
- Browser suite phone profile viewport is **390×664** with a 390×844 emulated screen; the separate manual visual and live checks used a 390×844 viewport. Landscape is 844×390; desktop is 1440×1000.

GitHub emitted upstream notices about older action runtime declarations being forced onto Node 24 and an upcoming ubuntu-latest image transition. Both jobs succeeded. These are CI maintenance notices, not application build warnings; revisit official action versions on the next CI maintenance pass.

Final evidence is committed separately from application code with `[skip ci]`: only documentation changed after the verified application deployment. No application code is left uncommitted.

## Remaining limits and mitigations

No known unresolved functional defect from the review. Physical iOS/Android hardware, actual Safari, low-memory devices and screen-reader sessions remain unverified: perform those checks before treating the slice as a general release. Art remains provisional pending owner references. Local-only data needs user-kept JSON backups; storage conflicts preserve both versions but require an explicit restore choice. Fixed-hour solar lighting can be manually overridden. Long history virtualization and a larger storage backend remain future work rather than part of this slice.

## Visual Production Pass 1 (2026-10-17)

The starting lot is refined in application commits `4fa192c`, `0502f55`, `932ac69`. See [full visual report, screenshot gallery, performance metrics and reference compromises](visual-pass-1-results.md). Local final unit suite **52/52 PASS**; local full browser suite **47 PASS / 1 desktop touch SKIPPED / 0 FAIL**, with geometry-only review fixes afterward; final production build **PASS, no warnings**. The final 33-capture script runs on `932ac69` and found **0 console/page/WebGL errors,0 context losses**, all nine house/yard pairings, roof improvements, stable stars and reload. Independent read-only source/visual review is complete, including targeted final grass/dormer checks.

[GitHub Actions 39044066377](https://github.com/HaydenMay/foundations/actions/runs/39044066377) **succeeded**, both jobs successful, deploying `932ac69571e95aca59d5f23b3f123b1fae184876`. Ubuntu unit 52/52 PASS, full browser 47 PASS / 1 SKIPPED / 0 FAIL(4.4 minutes), buildPASS, npm audit: 0 vulnerabilities. Live HTTPS 200, base/final JS correct; live browser subset12/12 PASS(1.4 minutes) across portrait/landscape/desktop. Actual-live portrait and landscape captures: no page/console errors, no horizontal overflow, observed request hosts only haydenmay.github.io. Full evidence/limits are in the linked visual report. Final documentation/evidence commit uses[skip ci] and changes no application code.
