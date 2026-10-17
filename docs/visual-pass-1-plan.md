# Visual Production Pass 1 implementation plan

Goal: a cozy miniature starting residential lot with three freely selectable houses, compatible yards, improved light/framing and measured mobile rendering cost, preserving all existing habit functionality.

Authority: owner's detailed Visual Production Pass 1 brief and two approved boards supplied 2026-10-17. Proceed inline under the owner's authorization. Baseline and architecture: [inspection](visual-pass-1-inspection.md). This is an extension of the existing factories, not an application rebuild.

## Art decisions from the boards

Use board A (cozy miniature realism), not board B's colorful polygonal look. Cream clapboard, charcoal shingles, reddish-brown brick, weathered warm timber, pale stone, natural greens and soft warm-white windows. Build pitched roofs with intentional gables, two front dormers on Cottage/Brick, porches/entry steps, detailed rear elevations and an attached garage facing the existing empty driveway. Craftsman gets layered gables, substantial beams and stone porch bases. No cars. Favor fine material grain and irregular foliage over dense standalone decorative meshes. Keep a clear front path, same lot and shared left/rear backyard anchor.

The existing saved `home` choice IDs remain **sage = Classic Cottage, cream = Modern Craftsman, blue = Traditional Brick**. This changes appearance as intended without a save migration or invalidating backups. Backyard IDs and five-star threshold remain unchanged; existing exterior roof choices still apply. All lifetime thresholds and reward rules are untouched. Morning/afternoon continue to use the saved `sunrise`/`day` values.

## Modules and tasks

- [x] 1. Test compatibility and geometry contracts first. Extend domain/browser tests for all home choices, old saves, free yard switching and unchanged lifetime stars. Add asset bounds/finite geometry, shared entrance/backyard space, disposal and batching tests. Write failing light-direction and framing tests before implementation.
- [x] 2. Add reusable `surfaces.ts`, `batching.ts`, `residential.ts`, `landscaping.ts`, `backyards.ts`. Extend AssetLibrary minimally with named materials, procedural textures, reusable geometry and world finalization. Keep later milestone factories and their state. Compose carefully shaped architecture, organic deciduous variants plus evergreen, flowering shrubs, beds, hedges, fence and yard furnishings. Batch compatible meshes with baked transforms/UVs and preserve meaningful shadow flags. Retain proper resource disposal.
- [x] 3. Integrate the starting lot in `world.ts`. Refine all three backyards within the same clearance, add restrained landscaping, retain an empty driveway and existing road connections. Keep wider progression unchanged. Add small garage wings as part of each starting-house asset.
- [x] 4. Extend palettes with continuously blended light direction; improve daylight contrast and readable blue night ambience. Cache static shadows until geometry/light changes. Improve Home projection/framing while preserving saved controls and bounds. Remove the large scene headline and retain its philosophy in a compact header treatment outside the canvas. Keep the habit UI intact. No perpetual animation loop is planned; static quality and idle battery use take precedence over optional motion.
- [x] 5. Capture all three houses front/rear, all backyard pairings, four lighting moods, portrait expanded/collapsed, compact portrait and landscape. Measure draw calls/triangles/resources and warm camera interaction CPU submission, with baseline comparisons. Run all tests and production build, independent read-only review, fix material findings, commit/push and verify Actions and live browser behavior.

## Review focus

Legacy home IDs must still import with identical history/stars; the existing roof improvement must not be erased by a new house selection. Shared factories also build later houses, so the new starting-house variation must not accidentally invalidate later choices. Batching must bake nested rotated/scaled transforms correctly, preserve emissive updates and avoid disposal leaks. Phone framing must reserve controls and show the house without an overlaid headline. Sun direction must not jump at label boundaries. Visual evidence must be real browser captures; no physical-device FPS or exact reference parity claim without evidence.

## Ledger

2026-10-17: Approved references inspected. Pre-flight clean at `2a8c9c9`; baseline 41 unit / 35 browser pass, one desktop touch skip. Ruling: keep procedural factories with shared generated surface maps and static batching rather than introduce an external model/texture pipeline. This preserves local asset loading and the existing lifecycle; the cost is less fine leaf/roof irregularity and optical detail than the offline concept renders. Report that compromise explicitly after comparing actual captures.

2026-10-17: New behavior tests first failed on missing house geometry/batching/framing/light direction, then passed. Current unit suite 49/49. Full local production-browser suite 47 passed / 1 desktop touch skip in 3.0 minutes. A test-only landscape assertion was corrected to accept the already-hidden headline. Visual iterations replaced rounded foliage clumps with leaf sprays, reduced small-shrub geometry, moved a tree that blocked rear project views, and cleared planting from the pool seating area. The final capture/review/deploy phase remains pending.

2026-10-17: Independent read-only review identified upgrade furniture/porch overlap, unsupported fort canopy and rotated shingle courses. Fixed in 0502f55, with red/green UV, ray-contact and recessed-pool geometry checks; unit suite52/52, production build passes. Desktop review also identified a repeating lawn pattern and rear dormer junctions; corrected in 932ac69. Final source has no changes to habits, history, import schema or milestone thresholds. Publication and fresh capture review follow.

2026-10-17: Complete. Final 33 captures on932ac69 and independent targeted review confirm grass/dormer fixes; no remaining material defect found. GitHub Actions 39044066377 succeeded with52 unit and47 browser passes/1 desktop-touch skip; Pages published932ac69. Actual-live12/12 browser checks and two mobile screenshots verified. Reference-fidelity gaps and real-device/Safari omissions are explicit in the results report. Stopped at the starting residential lot.
