# Chapter 2 visual review evidence

This gallery records the Chapter 2 neighborhood from the production Angular bundle at source commit `d38a91a03df499d79ab80f4a55f6313dd89c8ceb`. The bundle was built with `npm run build` and served under `/foundations/` by the repository's static preview server. The screenshots were captured on 2026-10-18 with headless Chromium; they are captures of the running application, not mockups.

The desktop views use a 1600×1000 viewport and an elevated isometric camera. The mobile views use emulated 390×844 portrait and 844×390 landscape viewports with touch enabled. These are browser emulations, not physical-device or Safari tests. All simulated progress and design changes were made inside Developer Preview.

## Neighborhood and house sets

- [Neighborhood overview](neighborhood-overview.jpg): original Chapter 1 home, four neighbors, connected curved street, entrance, community park, and landmark.
- [Option A · Classic Cottage](style-set-option-a.jpg), [Option B · Modern Craftsman](style-set-option-b.jpg), and [Option C · Traditional Brick](style-set-option-c.jpg): each set applies one style across all four distinct neighbor lots.
- The following close views cover all 12 lot/style combinations. Lot 1 is compact, lot 2 is L-shaped, lot 3 is two-story, and lot 4 is wide-gable.

| Neighbor lot | Cottage | Craftsman | Brick |
| --- | --- | --- | --- |
| Lot 1 · compact | [View](lot-1-cottage.jpg) | [View](lot-1-craftsman.jpg) | [View](lot-1-brick.jpg) |
| Lot 2 · L-shaped | [View](lot-2-cottage.jpg) | [View](lot-2-craftsman.jpg) | [View](lot-2-brick.jpg) |
| Lot 3 · two-story | [View](lot-3-cottage.jpg) | [View](lot-3-craftsman.jpg) | [View](lot-3-brick.jpg) |
| Lot 4 · wide-gable | [View](lot-4-cottage.jpg) | [View](lot-4-craftsman.jpg) | [View](lot-4-brick.jpg) |

- [Mixed independent choices](mixed-independent-choices.jpg): cottage, craftsman, and brick houses coexist with autumn maples, ornamental grasses, a timber entrance sign, playground, and natural-stone landmark.
- Shared-space comparisons: [stone-pillar entrance](shared-entrance-primary.jpg) and [flowering entrance](shared-entrance-alternative.jpg); [flower garden park](shared-community-park-primary.jpg) and [playground park](shared-community-park-alternative.jpg); [fountain plaza](shared-landmark-primary.jpg) and [natural-stone landmark](shared-landmark-alternative.jpg).
- [Night lighting](neighborhood-night.jpg) shows the current night palette.

## Progression, mobile, and camera

- [100-star welcome transition](chapter-2-welcome-transition.jpg) shows Continue and Skip reveal. [200-star completion](chapter-2-completion-transition.jpg) shows Continue.
- [Portrait layout](mobile-portrait.jpg) and [landscape layout](mobile-landscape.jpg) show the grouped Chapter 2 preview controls with the neighborhood visible. `metrics.json` records each document width; both match their viewport widths.
- [Home camera](home-camera-original-home.jpg) records the preview camera readout after activating Home: position `19.0, 29.8, 19.4`, zoom `1.00`, rotation `45°`, which is the original Chapter 1 property framing.
- [Reload isolation](preview-reload-restores-real-state.jpg) shows that a 180-star disposable preview returns to the real, zero-star new profile after reload. The capture script also enters a 200-star preview, exits it, and asserts the zero-star real profile remains.

## Construction samples

The selected preview states were 100 lifetime stars before the first neighbor (the build control advances to 110) and 170 before the park (the build control advances to 180). Both use the first listed project choice and the slowest preview assembly speed. Each sequence has early, later, and completed frames:

- First neighbor: [early](assembly-neighbor-start.jpg), [later](assembly-neighbor-middle.jpg), [complete](assembly-neighbor-complete.jpg).
- Community park: [early](assembly-community-park-start.jpg), [later](assembly-community-park-middle.jpg), [complete](assembly-community-park-complete.jpg).

The preview lifecycle was active in both early frames and idle in the later and completed frames. The visual difference is weak: most project geometry already reads as complete while the early-frame construction message is active. The evidence therefore does **not** establish a clearly staged build. This is a real visual gap to address in a later focused assembly review; the captures preserve what the current production bundle shows.

## Review checks and limitations

- `npm test`: PASS — 25 test files, 202 tests. Relevant isolation coverage includes “keeps real history, stars, schedules, designs, backup and stored bytes unchanged under all controls,” “reloads into genuine progress and resets a preview from current real state,” and “accepts genuine updates from another tab behind the isolated view and exports only real data.” Save migration coverage includes “preserves existing house and unknown extension fields across v3 migration,” “marks historical Chapter 2 notices seen when importing older progress,” and exact-byte backup checks.
- `npm run build`: PASS — Angular production bundle built with `/foundations/` base href. The captured lazy `scene` chunk was about 679 kB raw.
- Manual production capture: 36 screenshots, zero JavaScript page/console errors, WebGL error `0`, and no lost WebGL context. Four Chromium GL performance warnings reported `GPU stall due to ReadPixels` during screenshot readback. They are capture-time GPU readback warnings; no runtime FPS measurement was taken.
- The fully revealed overview rendered 511 draw calls and 668,683 triangles in headless Chromium. This is a useful scene-size observation, not a mobile performance result. No frame-rate benchmark, physical-phone test, Safari test, or automated end-to-end suite was run.
- Against the approved reference boards, the main compromise is the generated low-poly treatment: wide unplanted grass areas separate the compact residential strip; tree canopies and flower beds are visibly faceted and sparse; the park and landmark are small, simple focal features; the three house styles share generated architectural construction despite their distinct footprints, roofs, and exterior materials. These are visible fidelity gaps, not missing milestone choices. No cars or vehicles appear.

The capture aid is [`scripts/capture-chapter-2.mjs`](../../../scripts/capture-chapter-2.mjs). Run it only after `npm run build` and `npm run preview`; it is manual evidence tooling and is not an automated test or deployment gate. [`index.html`](index.html) provides a compact image gallery, and [`metrics.json`](metrics.json) records viewport, render, WebGL, camera, and console observations for each capture.
