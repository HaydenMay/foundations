# Autonomous City Build evidence

Production Angular bundle served locally at `/foundations/` in headless Chromium. These are visual-review captures at emulated viewports, not physical-device screenshots. The camera is set to valid in-app zoom levels for the production viewport images; no FPS claim is inferred from renderer counters.

The captured build reflects the feature working tree based on the `sourceCommit` recorded in `metrics.json`; `workingTreeDirty: true` records that the implementation had not yet been committed during capture.

Open the [full gallery](browser-captures/index.html) or inspect the [capture metrics](browser-captures/metrics.json) and [labeled continuous-world site plan](site-plan.svg).

Key captures:

- [Town Center overview](browser-captures/town-center-landscape.jpg)
- [Main Street storefronts](browser-captures/town-center-main-street.jpg)
- [Street-level shopfronts](browser-captures/town-center-shopfront.jpg)
- [Mid-construction assembly](browser-captures/town-center-assembly-mid.jpg)
- [Construction after Skip](browser-captures/town-center-assembly-skipped.jpg)
- [Night lighting](browser-captures/town-center-night.jpg)
- [Chapter 3 welcome](browser-captures/town-center-chapter-transition.jpg)
- [Portrait viewport, 390×844](browser-captures/mobile-portrait.jpg)
- [Landscape viewport, 844×390](browser-captures/mobile-landscape-mobile.jpg)
- [Expanded city and monorail](browser-captures/monorail-city-overview.jpg)

All captured viewports reported no document-width overflow, no JavaScript page errors, no WebGL errors, and no context loss. Desktop screenshot readback caused Chromium GPU-stall warnings. Performance results are draw calls and triangle counts only; no real-device or frame-rate tests were performed.
