# City Composition Pass Evidence

The [gallery](browser-captures/index.html) and [metrics](browser-captures/metrics.json) were captured from the production Angular bundle at commit `278f8018f3ab5898ac646550054ac1b1d4d29d19` on 2026-10-19. The original PR #6 evidence is preserved in the [before gallery](../autonomous-city-build/browser-captures/index.html).

The evidence set includes the complete overhead and normal-angle town, the unchanged Chapter 2 street, Main Street, library, civic plaza, greenway, day/night, construction mid/skip/complete, chapter transition, and emulated portrait and landscape views.

Key captures:

- [Whole city — normal angle](browser-captures/whole-city-normal-angle.jpg)
- [Whole city — overhead](browser-captures/whole-city-overhead.jpg)
- [Chapter 2 residential street](browser-captures/chapter-two-residential-street.jpg)
- [Main Street storefronts](browser-captures/town-center-main-street.jpg)
- [Library gable and roof](browser-captures/town-center-library.jpg)
- [Civic square](browser-captures/town-center-civic-plaza.jpg)
- [Night lighting](browser-captures/town-center-night.jpg)
- [Monorail loop](browser-captures/monorail-full-loop-overhead.jpg)
- [Portrait, 390×844](browser-captures/mobile-portrait.jpg)
- [Landscape, 844×390](browser-captures/mobile-landscape-mobile.jpg)
- [All captures and WebGL counters](browser-captures/metrics.json)

All 15 captures rendered a canvas. None reported JavaScript page errors, document overflow, WebGL errors, or context loss. Chromium emitted four GPU `ReadPixels` stall warnings during desktop screenshot capture.

The renderer identified itself as ANGLE/SwiftShader. Portrait reported 306 draw calls and 526,898 triangles; the full-loop landscape view reported 935 draw calls and 1,038,214 triangles. The capture script measured approximately 5 FPS in portrait and 2 FPS in landscape on that software renderer. Those figures are not mobile-device performance claims. No physical phone or Safari test was performed, and this capture pass programmatically sets camera views rather than exercising touch gestures.

`metrics.json` records `workingTreeDirty: true` because the evidence directory was untracked while the capture ran. `sourceCommit` identifies the exact committed app bundle; there were no tracked source edits during the capture. The screenshot script is optional manual visual evidence, not a test, CI, or deployment gate.
