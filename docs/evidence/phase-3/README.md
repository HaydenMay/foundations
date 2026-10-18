# Phase 3 visual evidence

All images are generated from synthetic preview progress in Chromium. No personal habits or health records are used.

`baseline-*.png` captures were made from the existing production build at `c4b6f27` before any Phase 3 renderer changes. Each style uses identical camera state and afternoon light. `baseline-metrics.json` records the selected style, viewport/canvas dimensions, camera, lighting and overflow check. `scripts/capture-phase-3.mjs` reproduces those captures.

After implementation, this directory will also contain the matched final-house captures and intermediate assembly frames used for visual review.
