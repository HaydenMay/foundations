# Foundations Chapter 2: Welcome to the Neighborhood

**Status:** Approved for implementation by the product owner on 2026-10-18
**Scope:** Extend the existing Chapter 1 world through 200 lifetime stars, following the approved implementation plan.

## Goal

Continue Foundations from the player's original home into a cohesive, cozy miniature neighborhood in the same continuous world. Chapter 2 introduces four individually selectable neighboring homes, shared streetscape projects, a community park, and a separate neighborhood landmark. All construction is free and reversible. Lifetime stars never decrease, and missed habits have no penalty.

The approved image boards are high-level art direction: Option A / Photo 4 (Cottage), Option B / Photo 3 (Craftsman), and Option C / Photo 2 (Brick). Use their warm materials, lush but legible planting, soft evening lighting, and consistent neighborhood composition. They are not exact geometry references. No cars or traffic from the boards enter the game.

## Existing product and technical boundaries

- Chapter 1 is catalogued at 0–90 stars in `PROJECTS`. The 100-star state currently reveals an empty parcel beside the original home. Retain Chapter 1 IDs and designs.
- The original home camera anchor is around `(-5, -4.6)`. The road runs east–west at `z=5`. The current 100-star parcel is centered near `(5.8, -3.3)`.
- `buildWorld` composes one Three.js scene with owned assets and static batching. The current terrain is approximately 36×29 metres. `TownCamera` clamps saved motion to ±18, and save validation enforces those bounds.
- `AssemblyAnimator` and `TownScene` already support ordered, skippable construction with reduced-motion handling. Chapter 2 must extend that path rather than add another animation engine.
- `FoundationsStore` keeps real state separate from a disposable preview copy. Preview controls and lighting/camera changes in preview do not reach storage or JSON exports.
- The saved-state schema is version 3. Legacy project IDs include `neighbor`, `garden`, `street`, `house2`, and `circle`; Chapter 2 must not repurpose them.
- The current Developer Preview presents Chapter 1 projects in a single long set of controls. Chapter 2 controls will be grouped by chapter.

## World layout

Keep the original home, its complete lot, and its current Home framing intact. Use the currently reserved parcel for Neighbor 1 if the detailed lot fit check confirms the existing access geometry. Extend the terrain eastward and as far north/south as needed for homes on both sides of a gently curved street. Preserve a clear eastbound road connection for a future continuous expansion.

```text
                               NORTH (−Z)
 WEST / existing Chapter 1                                  EAST / future growth

 ┌─────────────────────────┐      N1: compact          N3: two-storey
 │ Original home and yard  │      single-story         large porch
 │ Existing driveway      │      lot + driveway        lot + driveway
 └────────────┬────────────┘            ╲                    ╱
              └ existing avenue ── entrance zone ── curved residential street ──┬─→
                                                   ╲                    ╱      │
                                                    N2: L-shaped     N4: wide   │
                                                    garage + drive   gables     │
                                                                     [Community Park]
                                                                     [Landmark Square]
                               SOUTH (+Z)                              separate from entry
```

Neighbor 1 and Neighbor 3 sit on one side of the street; Neighbor 2 and Neighbor 4 sit opposite. Every driveway reaches the road, while pedestrian paths remain continuous along both sidewalks and connect to the park and landmark. The entrance treatment is at the western neighborhood entry. The landmark occupies its own small shared square near the far end and does not duplicate the entrance. The park is nearby but spatially distinct. A visible road continuation remains beyond these features; it is a reserved connection, not Chapter 3 content.

At the 100-star milestone, reveal the extended road, sidewalks, reserved lots, and the Chapter 2 welcome transition. Do not place a neighbor house before its own milestone. When a neighbor is selected, its complete house, reachable driveway, walkway, mailbox, and modest base landscaping arrive together. Chapter 2 houses and public-space options appear only when their respective projects are unlocked and selected.

## Chapter 2 progression

All thresholds use permanent lifetime stars. A choice is immediately available at unlock, free, persistent, and reversible. A milestone's basic access pieces are part of its project and do not require separate rewards.

| Stars | Project               | Choices / automatic result                                                             |
| ----: | --------------------- | -------------------------------------------------------------------------------------- |
|   100 | Neighborhood Begins   | Automatically reveal road and sidewalk extension, reserved lots, and Chapter 2 welcome |
|   110 | First Neighbor        | Cottage / Craftsman / Brick for Neighbor 1                                             |
|   120 | Street Trees          | Flowering Trees / Autumn Maples / Evergreens                                           |
|   130 | Second Neighbor       | Cottage / Craftsman / Brick for Neighbor 2                                             |
|   140 | Streetside Gardens    | Flowering Borders / Decorative Shrubs / Ornamental Grasses                             |
|   150 | Third Neighbor        | Cottage / Craftsman / Brick for Neighbor 3                                             |
|   160 | Neighborhood Entrance | Stone Pillars / Flowering Entrance / Timber Welcome Sign                               |
|   170 | Fourth Neighbor       | Cottage / Craftsman / Brick for Neighbor 4                                             |
|   180 | Community Park        | Flower Garden / Playground / Picnic Grove                                              |
|   190 | Neighborhood Landmark | Fountain Plaza / Neighborhood Gazebo / Natural Stone Monument                          |
|   200 | Chapter Complete      | One-time celebration and a future-expansion teaser; no additional city content         |

If several milestones unlock before the player returns to construction, every unlocked project remains available in the Chapter 2 project list. Do not assign a default design or skip a choice automatically.

The four lot identities remain recognizable regardless of style: (1) compact single-story starter, (2) medium L-shaped family house with attached garage, (3) large two-story porch house, and (4) medium-large wide-gable house. Each lot offers all three styles independently, using stable `cottage`, `craftsman`, and `brick` choice IDs. Style determines architectural language and materials; lot identity determines footprint, roof massing, entrance, windows, garage arrangement, and scale. The original home retains the player's chosen style and remains unchanged.

Public-space options are independently selectable. The three boards show coordinated examples, not a lock between a house style and a particular tree, park, entrance, or landmark choice. Mixed combinations must remain visually coherent.

The natural stone monument is a composed small residential feature: a few substantial boulders, accent rocks, restrained grasses, and optional low ground lighting. It must read as a landscaped landmark, not a tower, mountain, or random rock pile.

## Chapter transitions and everyday UI

At a live crossing of 100 stars, show a short, skippable “Welcome to the Neighborhood” reveal that widens from the original home toward the new connected streets and reserved lots. At 200 stars, show a short, skippable chapter-complete moment with a quiet expansion teaser. Transitions never replay on every app launch. They respect reduced motion, keep habit tracking available, and do not delay persistence. Skip immediately settles the camera and scene.

Persist `chapterNotices: { neighborhoodSeen: boolean, completeSeen: boolean }`. A notice is pending when its star threshold has been reached and its `Seen` flag is false, so the earned stars and pending notice are durable in the same save transaction. If the app closes while a transition is pending, it resumes safely on the next load. Dismissing or skipping marks that notice seen. New profiles default both flags to false. During migration, profiles already at or above a threshold are marked seen so an existing player is not surprised by a historical transition. Importing an older save follows the same rule.

Daily habit controls remain primary. The town surface may show the current chapter and the next project threshold using the existing progress area; do not add a blocking chapter dashboard or redesign unrelated tracker screens.

## Developer Preview

Retain the real/preview state boundary. Organize the panel into collapsible **Chapter 1**, **Chapter 2**, and shared scene-control sections. Only one chapter group needs to be expanded at a time; lighting and camera remain shared. Keep controls touch-friendly, scrollable, and dismissible on portrait and landscape screens.

Chapter 1 retains its existing scenarios and milestone controls. Chapter 2 adds scenarios for just unlocked (100), mid-chapter (150), and complete (200), plus its progression jumps, four neighbor styles, public-space choices, visibility toggles, and production animation replay. Add replay controls for the Chapter 2 welcome and completion transitions. Reset-to-real and exit remain obvious. Preview scenarios, stars, selections, event state, construction, camera, and lighting stay in the disposable working copy; none may change real storage, other tabs, or JSON backups. Reload exits to genuine state.

## Persistence and migration

Add a Chapter 2 project catalog with chapter metadata and new namespaced IDs such as `ch2-neighbor-1`; keep retired IDs valid for grandfathered saves. Extend catalog validation with the new choices without changing old IDs or thresholds.

The chapter acknowledgment fields require a versioned save migration (proposed schema v4). Preserve all existing habits, completions, lifetime stars, designs, preferences, extension fields, and legacy unlocks. Before a v3 record is upgraded, save its exact bytes under a new `foundations.pre-v4` key; if that backup cannot be written, leave the v3 record untouched. Keep the existing version-specific backup behavior for v1/v2 data and then add Chapter 2 defaults. Existing or imported profiles whose earned stars already exceed a Chapter 2 threshold retain access and get no replayed transition. New profiles default to both chapter acknowledgments unseen.

Extending the legal camera range should keep old camera values valid as-is. Home still resets to the original house. Add bounded neighbor, park, landmark, and full-neighborhood framing while preserving touch and mouse camera controls.

## Rendering and performance

Extend the existing world and project-factory boundaries; do not add a separate scene or map. Keep layout coordinates, lot identities, project definitions, style variants, and assembly recipes separate from habit scoring. Reuse existing residential materials and low-level geometry where useful, but author the twelve lot/style combinations so all four silhouettes remain distinct in each style. Do not achieve variation with material-only swaps or randomness.

Use named assembly pieces for foundations, wall/roof sections, openings, driveways, landscape groups, park structures, and landmark pieces as appropriate. Reuse the current assembly engine and disposal ownership. Batch repeated static geometry and share materials/geometries; avoid adding per-object shadow lights. Keep spatial chapter boundaries so future expansion does not require a full scene rewrite. No NPCs, cars, traffic, economy, extra habits, animation system, or Chapter 3 structures are in scope.

The Chapter 1 desktop-emulated baseline is about 207–215 draw calls and 221k–281k triangles. Four active neighbor homes and public spaces will increase scene cost. Use these numbers as comparison points, not mobile performance claims. Inspect browser renderer counters and capture portrait/landscape scenes; physical-device performance remains unverified unless an actual device is available.

## Validation and evidence

- Progression tests cover each new threshold, free reversible choices, permanent stars, and no regression to Chapter 1 or legacy unlocks.
- Migration tests cover v1/v2/v3 inputs, preservation of unknown fields and existing designs, v3 backup safety, and existing profiles at or above 100/200.
- Transition tests cover live threshold crossings, pending reload recovery, skip/dismiss persistence, reduced motion, and no replay for migrated/imported existing progress.
- Preview tests verify chapter grouping actions mutate preview only, including stars, events, designs, camera, lighting, construction, and backup export.
- Asset/scene tests verify all 12 lot/style variants have distinct massing and valid assembly pieces, roads/sidewalks reach their anchors, the four driveways connect, the park and landmark are separate, and the original home anchor remains fixed.
- Run the current unit suite and production build. Do not introduce an end-to-end test suite or make deployment depend on browser capture. Capture manual visual evidence for all 12 combinations plus representative shared-space, transition, portrait, landscape, and night views. Clearly mark physical-device checks as skipped if unavailable.

## Scope boundary

Complete Chapter 2 through the 200-star celebration, then stop. Do not build Chapter 3, NPCs, traffic, new health rules, city simulation, a map selector, monetization, or unrelated tracker redesign.
