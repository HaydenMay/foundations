# Foundations vertical slice

Purpose: a private wellness companion where healthy habits gradually create a peaceful suburban town. Progress is permanent. The city never deteriorates. The owner's autonomous implementation brief authorizes implementation and publication without intermediate design approval.

## Experience

Angular standalone components, TypeScript, and a replaceable Three.js procedural asset library. A portrait-first full-screen orthographic diorama sits behind a collapsible habit sheet. Desktop uses a compact side sheet. Cream surfaces, pine typography, muted sage and clay accents complement believable suburban proportions, gabled roofs, porches, landscaping, shadows and warm windows. No downloaded assets, remote fonts, tracking, accounts or backend.

Eight projects at 0, 5, 12, 24, 40, 60, 85 and 115 lifetime stars: home, backyard, exterior, neighbor, garden, street, additional house and cul-de-sac. Unlocking preserves every pending choice; selecting a design builds it. Three free reversible choices per project. The slice ends at a small cul-de-sac.

## Rules and dates

Local calendar dates, not UTC dates. Easy/moderate/hard award 1/2/3; award min(difficulty, 10 minus today's awards). Cap-zero completions remain in history. Daily and selected-weekday occurrences count once per date; weekly occurrences count once per Monday–Sunday week, any day in that week. One-time occurrences count once for the lifetime of the goal, even after edits. Duplicate same-day completions are blocked across schedule edits. Starter habits are eligible immediately. Custom habits first appear for completion the following local day. No backdating, streaks or penalties. Completed records are immutable snapshots; edits and archives never alter history or earned stars. Lifetime stars derive from the persisted completion ledger.

## State and safety

Versioned browser localStorage stores habits, schedules, immutable completion history, project selections, camera target/zoom/rotation, panel and lighting preference. A write failure is prominently reported; the in-memory session can still be exported. Backups are local JSON downloads and validated imports; importing previews totals and requires confirmation before replacing existing data. Unsupported or malformed data never overwrites saved progress. Same-browser tabs synchronize and serially apply habit actions using Web Locks when available. No personal data leaves the browser; backup files can contain sensitive habit names and should be kept private.

## Camera and light

Ground-plane pan with mouse or one finger, two-finger pinch, wheel zoom, explicit rotate/zoom/home buttons and keyboard controls. Clamp target and zoom. Save camera after interaction. Scene-only pointer events prevent overlap with controls. Light follows the device's local clock with blended dawn/day/dusk/night palettes; a manual override allows all four. No geolocation: sunrise/sunset are approximate fixed local hours.

## Modules and verification

Pure domain modules: dates, habit validation/scheduling, completion scoring, milestone definitions/selections, state validation/export/import. Angular state service owns persistence and UI updates. Scene renderer owns disposable geometry and materials, asset factories own architecture, camera controller owns navigation, lighting module owns time palettes. Responsive UI remains independent of renderer.

Automated domain tests precede implementation. Browser tests cover real local persistence, habit workflows, queued construction/customization, portrait/landscape geometry, camera input and renderer health. Production build uses `/foundations/`; GitHub Actions runs tests and build, uploads Pages artifact and deploys with minimal permissions. Verify workflow success, HTTP response and live browser render. Record actual checks and limitations in README and validation notes.
