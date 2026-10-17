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
