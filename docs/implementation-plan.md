# Foundations Implementation Plan

Goal: deliver the owner's autonomous vertical slice, public repository and verified Pages deployment.

Architecture: immutable pure TypeScript domain functions, versioned local store behind an Angular signal service, standalone responsive components and replaceable procedural Three.js assets. Tech: Angular 22, Three.js, Vitest, Playwright, GitHub Actions.

Spec: [design.md](design.md). Execute inline; the user's autonomous brief supersedes intermediate approval gates.

## Constraints and review focus

No backend/accounts/tracking; stars never spent/decreased; 10/day; local dates; next-day custom eligibility; initial slice only. Test DST/week/year boundaries, malformed imports, edits after completion, exhausted storage and queued unlocks. Keep all application work outside the Ember Bastion repository.

## Tasks

- [ ] 1. Domain and persistence: `src/app/domain/{models,dates,habits,progression,state}.ts`, `domain.spec.ts`. Write failing tests for scoring 1/2/3, cap/partial awards, activation, daily/weekdays/weekly/once, archives, selection and import validation. Implement and run the full domain suite. Commit.
- [ ] 2. Angular experience: `state.service.ts`, `app.ts/html/css`, `components/`. Wire create/edit/pause/archive/review, daily/lifetime/next progress, construction choices, history, backup import/export, storage errors and lighting preferences. Browser tests drive completion, create/edit and backup workflows. Build and commit.
- [ ] 3. Town renderer: `town/{assets,camera,lighting,scene}.ts` and `town.component.ts`. Build detailed cottage/yard/road/sidewalk scene, eight project visuals, replaceable materials/factories, local-time lighting, bounded camera and teardown. Test light transitions and camera bounds; visually inspect real screenshots. Commit.
- [ ] 4. Delivery: `.github/workflows/pages.yml`, README and `docs/validation.md`. Execute domain tests, mobile/desktop browser tests and production build. Inspect portrait/landscape captures. Review whole implementation, fix material findings, create public repo, push, enable Pages Actions and verify workflow/HTTP/live app. Commit evidence and final report.

## Progress ledger

2026-10-17: GitHub CLI authenticated as HaydenMay; target repository does not yet exist. Angular CLI 22 requires Node >=24.15; scaffold uses a task-local npm Node runtime rather than modifying the host installation. No changes made to Ember Bastion.

2026-10-17: Tasks 1–3 complete. Domain/persistence/lighting/camera: 37 tests pass. Production build passes with strict checks. Browser integration: 32 pass / 1 explicitly skipped. Native dialogs, backups, eight reversible construction projects and the procedural town implemented. Final delivery and independent read-only review in progress. Ruling: use GitHub Pages as requested; the Sites hosting workflow is superseded by the explicit Angular/GitHub deployment requirements.
