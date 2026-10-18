# Phase 3 inspection — Universal Piece Assembly

Inspected at application source `c4b6f27` before changing renderer code. The repository has no `AGENTS.md`; this document and the supplied Phase 3 brief define the scope. Baseline unit suite: **85/85 PASS**.

## Existing boundaries

- `FoundationsStore` already separates real state from a disposable in-memory preview. `DeveloperPanel` edits the preview copy and the app reuses the same `TownComponent` and Three.js scene for either state. This is the isolation boundary to retain; assembly preview controls will be transient component state and never enter the save model.
- `TownComponent` lazy-loads `TownScene` after render. `TownScene` owns its renderer, camera, current `TownWorld`, asset disposal, event-driven paints, and one temporary `requestAnimationFrame` sequence during first-home construction. The existing sequence manually hides and scales the whole home, moves it upward, and eases the camera home.
- `buildStartingHouse` creates one named `starting-home` root and detailed geometry for all three choices. `buildWorld` selects it from the saved house ID and returns it as `TownWorld.home`. The assets are procedural and share one `AssetLibrary` for geometry, materials, textures and lights.
- `batchStatic` bakes mesh transforms into material batches. It already respects `staticBatchBoundary` at the home root so the rest of the town cannot merge the home. Batching the whole home currently removes internal grouping; animated subassemblies therefore need their own stable boundary and local batch, while the parent home boundary continues to protect the whole subtree.
- Save/progression code needs no Phase 3 changes. First-home design is committed before `TownComponent` receives its construction request. A reload reads the completed house and does not replay that historical request.

## Integration risks and decisions

1. **Preserve the finished models.** Add identity-transform group wrappers around a small number of existing geometry sections. Do not regenerate, clone, or reparent meshes between parts. At completion, compare house bounds and screenshot captures against the baseline.
2. **Keep the animator generic.** A separate residential recipe file maps explicit stable assembly IDs to order/timing. The controller receives only `Object3D` pieces, baselines and numeric configuration; it never branches on style, names or mesh types.
3. **Preserve batching and ownership.** Batch each piece once, then prevent its parent home/world batches from crossing that boundary. Keep geometry disposal with the same `AssetLibrary`. Avoid cloning geometry/materials in playback.
4. **Reuse the scene loop.** The controller has no render subscription or timer. `TownScene` supplies absolute elapsed progress from its existing rAF callback, calls one render per useful animation update, and restores the camera/controls through existing finish/skip/disposal paths.
5. **Preview the production path.** The Developer Preview will choose an existing house style and invoke the same scene method and recipe used by onboarding. Speed and forced reduced-motion options remain local to the panel; saved progress and backup behavior do not change.

## Comparable pre-change captures

The screenshots were captured from the existing production build at source `c4b6f27` in fresh synthetic preview sessions. Each style uses `day` lighting, zoom `1`, and camera position `(19.0416, 29.8, 19.4416)`; no vehicles are present. No canvas or model was edited for these captures.

| Layout | Cottage | Craftsman | Brick |
|---|---|---|---|
| Portrait 390×844 | [baseline](evidence/phase-3/baseline-portrait-cottage.png) | [baseline](evidence/phase-3/baseline-portrait-craftsman.png) | [baseline](evidence/phase-3/baseline-portrait-brick.png) |
| Landscape 844×390 | [baseline](evidence/phase-3/baseline-landscape-cottage.png) | [baseline](evidence/phase-3/baseline-landscape-craftsman.png) | [baseline](evidence/phase-3/baseline-landscape-brick.png) |
| Desktop 1440×1000 | [baseline](evidence/phase-3/baseline-desktop-cottage.png) | [baseline](evidence/phase-3/baseline-desktop-craftsman.png) | [baseline](evidence/phase-3/baseline-desktop-brick.png) |

Capture dimensions are device-pixel scaled for mobile. Camera, lighting, visibility and overflow assertions are recorded in [baseline metrics](evidence/phase-3/baseline-metrics.json). The baseline capture script is [capture-phase-3.mjs](../scripts/capture-phase-3.mjs).

Pre-refactor world-space home bounds (metres) are also pinned in the assembly tests: Cottage and Brick `min(-8.25, .155, -7.915)`, `max(.451954, 5.86, -.665)`; Craftsman `min(-8.225, .155, -7.915)`, `max(.451954, 6.71, -.665)`. These bounds detect changes to the original lot envelope after the new identity wrappers are introduced.
