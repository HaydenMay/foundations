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
