# Residential art and integration conventions

Visual Production Pass 1 uses the two approved boards supplied 2026-10-17. Follow the **cozy miniature realism** panel: restrained warm architecture, natural greenery, pale stone, dark shingles and warm evening light. The three homes are player choices. Do not copy the cars from the boards into the game. All delivered geometry and surface maps are original procedural work; no downloaded or paid art is included.

## Factory boundary and saved data

`buildStartingHouse(library, parent, homeChoice, roofChoice)` builds the starting house. Existing v1 IDs remain `sage` (Classic Cottage), `cream` (Modern Craftsman), `blue` (Traditional Brick). They intentionally acquire the new appearance without rewriting saved records. Cottage is the default preview choice; new v2 profiles begin with no home. Neighbor/house2 use the separate legacy palette factory. Existing `clay` / `slate` / `moss` exterior choices continue to override the starting roof across house changes.

`buildBackyard(library, parent, choice)` uses the existing `pool` / `fort` / `trampoline` IDs at the existing five-star unlock. State validation, scoring, first-completion home eligibility and the seven later lifetime thresholds remain in the domain layer. Assets never award or spend stars. Do not put progression logic in a model factory.

Coordinates use metres. House root: **(-5, .13, -4.6)**; front is +Z. Shared front door: world X **-5.35**, front wall Z **-2.36**; garage center X **-.98**, compatible with the existing driveway at X **-.8**. Backyard root: **(-10, .13, -8.2)**, in the left/rear part of the same lot. Retain the shared entrance, empty driveway, roof envelope and backyard clearances when swapping models. Tests enforce house scale and yard/fence bounds. Detailed front and rear windows/doors matter because the camera rotates freely.

`startingLandscape` keeps large crowns at the perimeter and planting out of the shared project area. Tree shape/placement is deterministic; reloads do not reshuffle gardens. Oak, birch, flowering deciduous and evergreen factories share clustered leaf geometry and restrained greens. Shrubs use a smaller geometry budget than trees. Keep branches, blooms, planters and trims readable at the normal portrait camera distance.

## Materials, batches and ownership

`surface` generates small 128×128 albedo/relief tiles for clapboard, timber, brick, stone, shingles, grass, paving and water. It uses no network requests or large photographic textures. Prefer a shared named material to a separate material for every window/post. Window glass is shared so time lighting updates a single emissive material; lamps use a few short-range, unshadowed point lights. There is one shadowed directional sun.

`batchStatic` bakes nested factory transforms and world-scale texture UVs (asset-oriented for roof courses) into meshes grouped by material and shadow flags. Fine flowers/trim do not all cast independent shadows. The library owns original, temporary-factory and final merged geometry, materials and textures, and disposes them when replacing a world. Tests check transformed bounds, resource disposal and the initial mesh/triangle budget. Camera motion reuses the cached static shadow map; geometry and clock light changes invalidate it.

After finalization, mesh parts are material batches: empty named groups remain for lights and organization, **not mesh picking bounds**. A future interactive object picker should keep explicit logical lot bounds or build per-object batches. A much larger city should finalize spatial batches per lot/chunk rather than merge the entire city into one always-visible mesh per material. This is a small starting-lot slice, not that expansion.

Phase2 keeps the `starting-home` group as a separate batch boundary using `userData.staticBatchBoundary`. Batch its existing geometry once inside that root, then batch the rest of the same world while skipping that subtree. Its local scale/position can animate without rebuilding the house or moving terrain; the same world library still owns disposal. Preserve that root/anchor when replacing the home factory. Empty lots omit house, garage and backyard unless explicitly selected through progression/preview.

No perpetual animation loop is enabled. First-home construction uses a temporary2800mssequence capped at30updates/second, with cached shadows during the small rise, visibility/final shadow refreshes, no unchanged settled3Dframes, and immediate Skip/reduced motion. Disposal cancels it. Lighting samples the local clock every minute and linearly blends palette/direction values between fixed hours. This avoids label-boundary light jumps while retaining zero renders during settled idle periods. Geographic solar calculations, bloom, ambient occlusion and depth-of-field passes are intentionally absent for now. Prefer a measured visual improvement over adding full-screen GPU effects.

## Replacing provisional assets

An optimized GLTF factory can replace one procedural factory while preserving its anchor and domain IDs. Register all loaded geometry, materials and textures with the same lifetime owner (or an equivalent reference-counted loader). Preserve the shared window emissive convention and the transparent net's material grouping. Do not put model URLs into saved games; use repository-relative URLs so `/foundations/` project-site hosting continues to work. Re-run geometry/compatibility tests, all three house × three backyard captures, portrait/landscape framing and a real mobile performance check after a replacement.
