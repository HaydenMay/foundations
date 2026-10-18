# Phase 3 visual evidence

All images are generated from synthetic preview progress in Chromium. No personal habits or health records are used.

`baseline-*.png` captures were made from the existing production build at `c4b6f27` before any Phase 3 renderer changes. Each style uses identical camera state and afternoon light. `baseline-metrics.json` records the selected style, viewport/canvas dimensions, camera, lighting and overflow check. `scripts/capture-phase-3.mjs` reproduces those captures.

`final-*.png` captures are the matching completed homes after implementation. The composition, local time preset, camera, and layouts are identical to the baseline. The homes deliberately retain their existing geometry and materials; the final static appearance should match. The assembly change appears only while a saved first-home construction request is running.

`assembly-portrait-*.png` shows a genuine in-progress pose from each style-specific recipe. The capture harness freezes its browser animation-frame timestamps after the 0.5× preview starts so screenshot encoding cannot accidentally capture the settled house. `final-metrics.json` records the active pieces, their visibility and vertical offsets, renderer calls/triangles, and capture dimensions.

| Style             | Before                                      | Completed                                | In progress                                 |
| ----------------- | ------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Classic Cottage   | [portrait](baseline-portrait-cottage.png)   | [portrait](final-portrait-cottage.png)   | [assembly](assembly-portrait-cottage.png)   |
| Modern Craftsman  | [portrait](baseline-portrait-craftsman.png) | [portrait](final-portrait-craftsman.png) | [assembly](assembly-portrait-craftsman.png) |
| Traditional Brick | [portrait](baseline-portrait-brick.png)     | [portrait](final-portrait-brick.png)     | [assembly](assembly-portrait-brick.png)     |

Completed final views are also available for [landscape Cottage](final-landscape-cottage.png), [landscape Craftsman](final-landscape-craftsman.png), [landscape Brick](final-landscape-brick.png), [desktop Cottage](final-desktop-cottage.png), [desktop Craftsman](final-desktop-craftsman.png), and [desktop Brick](final-desktop-brick.png).

Recreate final evidence from a built worktree with `CAPTURE_MODE=final node scripts/capture-phase-3.mjs`. Omit the flag to capture static baseline-style views. `BASE_URL`, `CAPTURE_DIR`, and `CAPTURE_LAYOUTS` can select the app endpoint, output directory, and layouts. Browser automation is Chromium-based and does not represent physical-device testing.
