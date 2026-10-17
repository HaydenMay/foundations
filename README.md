# Foundations

Build healthy foundations for life. Every step builds something.

A private, portrait-first wellness companion. Healthy habits earn permanent stars that gradually build a peaceful miniature suburban town. No accounts, shop, spendable currency, streaks, penalties, analytics or tracking.

**Live app:** https://haydenmay.github.io/foundations/  
**Source:** https://github.com/HaydenMay/foundations

This is the initial vertical slice. The eight-project cul-de-sac and procedural art are provisional; finalized visual references will follow.

## Run locally

Use Node **24.15.0+** (or a version supported by Angular 22: `^22.22.3 || ^24.15.0 || >=26.0.0`) and npm.

```sh
npm ci
npm start
```

Open the URL printed by Angular (normally http://localhost:4200). The application has no server-side data service, API keys or environment secrets.

```sh
npm test                       # Vitest domain and persistence tests, non-watch
npm run build                  # Production build, /foundations/ base path
npm run preview                # http://127.0.0.1:4200/foundations/
npx playwright install chromium
npm run test:e2e                # Production build must already exist
```

The browser suite starts its own preview server when one is not running. It uses Chromium at 390×844 portrait, 844×390 landscape, and 1440×1000 desktop, plus a Pacific/Auckland timezone case. Touch gestures are tested in phone projects; the desktop touch-only case is explicitly skipped. Tests use synthetic data and write ignored screenshots/traces into `test-results/`.

If the host Node is older, a temporary runtime works without upgrading the machine:

```sh
npm exec --yes --package=node@24.15.0 -- npm test
npm exec --yes --package=node@24.15.0 -- npm run build
```

## How progress works

- Easy / Moderate / Hard habits earn **1 / 2 / 3 stars**. The daily maximum is **10**. A three-star goal completed at nine earns one star; later completions still enter history with zero stars.
- Three editable starter habits are eligible immediately. Custom habits start on the **following local calendar day** and first appear in Today then.
- Daily habits count once per local date. Selected weekdays use the device's weekday. Weekly habits can be completed on any day, once per **Monday–Sunday local week**. One-time goals count once ever, even if their frequency is later edited.
- No backdating or completion deletion. Completions are permanent snapshots; edits never change past names, difficulties or rewards. Changing a schedule cannot score the same goal twice on the same date. Pausing or archiving preserves all history. Archived goals can be restored.
- Missed days have no effect. Stars never expire, and there are no consecutive-day bonuses. Lifetime stars are calculated from the persisted reward history, never spent.
- The device clock defines dates. This is a trust-based personal tool, with no server clock or anti-cheat system. Changing timezones follows the new local date. A tab updates its date on focus and every 30 seconds while open.

| Lifetime stars | Project               | Design choices                          |
| -------------: | --------------------- | --------------------------------------- |
|              0 | Starting home         | Sage, linen, coastal blue               |
|              5 | Backyard retreat      | Pool, wooden fort, trampoline           |
|             12 | Exterior improvements | Terracotta, slate, moss roof            |
|             24 | Neighboring house     | Buttercream, rosewood, bluebell         |
|             40 | Pocket garden         | Meadow, orchard, roses                  |
|             60 | Street improvements   | Lantern walk, leafy avenue, flower lane |
|             85 | Additional house      | Linen, garden, harbor                   |
|            115 | Cul-de-sac            | Oak, fountain, gazebo                   |

All available projects remain in **Your town** until you choose a design. Nothing is automatically skipped. Construction and every later design change are free. Each choice changes the actual 3D environment.

## Camera and atmosphere

Drag with a mouse or one finger to pan. Pinch with two fingers or use the mouse wheel to zoom. Home, rotate, zoom-in and zoom-out controls are available on screen. Focus the canvas for arrow-key pan, `+` / `-` zoom, `R` rotation and `Home`. Movement and zoom are bounded; camera preferences and the habit panel state survive reloads.

Lighting follows the **device's local time**, blending sunrise, daylight, sunset and night. Settings has manual overrides for each. Sunrise/sunset use approximate fixed local hours (around 6 am / 6 pm); no location is requested. Windows and street lamps become warm at night. Rendering is event-driven rather than an endless animation loop, and the pixel ratio is capped at two.

## Privacy and backups

Habits, schedules, completion snapshots, stars, designs, camera and interface preferences live in browser **localStorage**, under `foundations.v1`. The versioned state is validated on load and import. Multiple same-origin tabs synchronize; browsers with Web Locks serialize updates to prevent duplicate rewards.

**Clearing browser/site storage, private browsing cleanup, changing browser profiles or moving devices can lose progress.** Settings → Export backup downloads a JSON file. Import validates the file and shows a confirmation before replacing current progress. Export your current town first if you want to keep both. Backups contain habit names and history: keep them private and never commit them to this public repository.

Malformed saved data is preserved for recovery and never silently reset. Settings can export the original storage. Blocked/full storage triggers a visible warning and permits tracking in the open tab; export before closing. There is no cloud sync, automatic backup or cross-device recovery. Browser storage is not encrypted, and other people using the same browser profile can access it. GitHub hosts application files and receives ordinary hosting requests; the application does not transmit wellness records.

## Architecture

- `src/app/domain/`: pure TypeScript habit validation, local calendar scheduling, immutable rewards/history, data-driven milestone choices and versioned backup validation.
- `src/app/state.service.ts`: Angular signals, local persistence, multi-tab synchronization, storage failures and backups.
- `src/app/components/`: reusable habit editor and local SVG icons.
- `src/app/app.*` and `src/ui.css`: responsive shell, habit sheet, project inspector, history and settings; native dialogs provide focus trapping and Escape dismissal.
- `src/app/town/assets.ts`: replaceable procedural house, landscaping, furniture and materials. Models use metre-scale coordinates. The gabled cottage includes weatherboard siding, dormer, porch, doors, windows and chimney.
- `src/app/town/world.ts`: project-ID → asset-factory registry and composed terrain. Add or replace a factory without changing habits or persistence. A future GLTF asset loader can implement the same factory boundary.
- `src/app/town/camera.ts`, `lighting.ts`, `scene.ts`: bounded map controls, clock palettes, renderer lifecycle and shadows. Three.js loads as a separate chunk. Habits remain usable if WebGL initialization fails.

No city simulation, traffic, citizens, physics, multiplayer, downloaded art or external fonts are included.

## GitHub Pages deployment

`.github/workflows/pages.yml` runs on pushes to `main` and manual dispatch. It installs pinned dependencies with `npm ci`, executes unit tests, builds production assets, runs browser tests, uploads `dist/foundations/browser` with `actions/upload-pages-artifact`, and deploys using `actions/deploy-pages`. Deployment uses the `github-pages` environment with Pages-write and OIDC permissions restricted to the deploy job.

Repository Settings → Pages → Source must be **GitHub Actions**. CLI equivalent after the repository has a default branch:

```sh
gh api --method POST repos/HaydenMay/foundations/pages -f build_type=workflow
```

Use `PUT` instead of `POST` when updating an existing Pages site. Verify the Actions run finishes successfully and open the live app; a configured workflow alone does not prove publication. No separate hosting credentials are required. The production build sets `<base href="/foundations/">`; icons and chunks are relative. If the repository name changes, update the build base, preview server prefix, browser-test base URL and links above together. There are no application routes requiring an SPA fallback.

See [validation notes](docs/validation.md) for executed results and deployment evidence.

## Known limits and next review

- Art is provisional procedural geometry. Palette, architecture, lighting and proportions should be reviewed against the owners' forthcoming references before expanding the town.
- WebGL and hardware acceleration are required for the town. Habits/settings/backups continue without it. Actual Safari, Android hardware, low-memory devices and screen-reader sessions have not been certified; Chromium viewport and touch emulation are initial evidence only.
- Very long history lists are not virtualized. Local storage has browser-dependent limits; backup import is capped at 5 MB. No browser-only system can guarantee retention after storage cleanup.
- Web Locks are used when available. Older browsers without them retain single-tab duplicate protection but cannot guarantee simultaneous multi-tab writes; use one tab there.
- Fixed-hour solar lighting is atmospheric rather than geographically accurate. Motion is deliberately minimal, and future art assets can replace the procedural factories.

Recommended next work: review art references, try the live build on real iOS/Android devices, tune milestone pacing through normal play, and evaluate IndexedDB/history virtualization if long-term usage demands it. Keep this release within the initial cul-de-sac boundary.
