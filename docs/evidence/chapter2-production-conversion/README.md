# Chapter 2 production evidence

This folder contains two complementary views of the converted neighborhood:

- `site-plan.md`, `site-plan.svg`, `site-plan.png`, and `site-plan.json` are generated from `CHAPTER_TWO_SITE_PLAN` and the same curved-road spline used by the production assets. The lot frontage follows the spline tangent, and tests sample the full frontage against the sidewalk edge.
- `browser-captures/index.html` is a production-bundle gallery captured in fresh, isolated Chromium profiles. It includes all four house footprints in all three styles, the mixed-style neighborhood, shared-site choices, both Chapter 2 transitions, staged construction, a night view, and emulated portrait and landscape layouts.

The browser run recorded no page or console errors, no WebGL errors, and no lost rendering contexts. Both mobile viewport captures fit their document width. The overview reports approximately 511 draw calls and 669,000 triangles. Chromium also emitted four `ReadPixels` GPU-stall warnings while taking screenshots; these were capture-time readback warnings, not WebGL errors. The viewport checks use desktop Chromium emulation and do not represent a physical phone or Safari test.

Regenerate the measured overhead diagram with:

```sh
node scripts/render-chapter-two-site-plan.cjs
```

Regenerate the browser gallery with the application built and served under `/foundations/`:

```sh
CAPTURE_DIR=docs/evidence/chapter2-production-conversion/browser-captures node scripts/capture-chapter-2.mjs
```

The browser capture is visual evidence, not a test runner or a deployment gate. It uses Developer Preview's disposable state and does not write to player progress.
