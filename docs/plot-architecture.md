# Universal plot and assembly rules

Foundations uses one data contract for lots, homes, public spaces, roads and future building types. The contract describes spatial ownership; it is not a procedural zoning tool or a second renderer. See [`src/app/town/plot-framework.ts`](../src/app/town/plot-framework.ts) for the typed API and [`src/app/town/plot-blueprints.ts`](../src/app/town/plot-blueprints.ts) for the Chapter 1 adapter and measured home standards.

## Permanent authoring rules

- Put new world content in a parent-relative `PlotDefinition`. A property owns its home and yard regions; a neighborhood owns properties, public spaces and street connections; a structure owns meaningful components.
- Use metres consistently: X is left/right, Y is vertical, Z is front/back, ground is Y=0, and the original Chapter 1 porch faces +Z. Rotated lots author their content in their own local frame.
- Keep stable plot IDs and existing progression, design, project, assembly and save IDs. A plot ID is not a new reward or persistence key.
- Use measured Chapter 1 homes as the minimum architecture and scale reference. Their dimensions are approximately 8.83–8.85 m wide, 7.865 m deep, and 5.73–6.58 m tall, depending on style. Keep style variants explicit; never stretch a production home to force a fit.
- Keep detached residential properties visually separate, with visible side yards and planted buffers. The framework proof uses an 8.5 m side gap from the Chapter 1 property; adjacent building masses should not read as attached townhouses unless that form is explicitly intended.
- Author curated blueprints and explicit recipe ordering. Spatial nesting does not choose animation order. Reuse `AssemblyAnimator`, keep its final transforms exact, and do not make a one-off animation engine.
- Add baseline screenshots before changing completed geometry, then compare fixed camera, light and viewport captures. Keep production assets within their existing batch/disposal boundaries and avoid one Three.js group per data-only node.
- Keep preview-only proof assets disposable. Do not write test progress, developer overrides or visual proof toggles to real saves, JSON backups or other tabs.
- Validation reports structural and authored footprint problems. It does not claim arbitrary triangle-mesh collision detection. Any intentional exclusive-footprint overlap must name both the related node and a concrete reason; decorative greenery is not exclusive occupancy.

## Transform and dimension semantics

`localTransform.position` is the node origin in parent coordinates. The node's volume is centred in X/Z and extends from local Y=0 to `dimensions.height`; `boundsOffset` moves that volume without moving the node origin. Rotation is Euler XYZ in radians and is applied around an optional local `pivot`. `resolvePlotPoint` composes every ancestor transform, including pivot rotation.

Footprints are horizontal authored occupancy rectangles with optional local X/Z offsets. SAT checks rotated rectangles. `clearances` expand a node's exclusive occupancy rectangle by directional metres; parent `setbacks` constrain an exclusive child's footprint. `boundaryPolicy: 'allow-overflow'` requires a documented reason; use it for a driveway or public sidewalk crossing a lot boundary. `unbounded` is reserved for deliberate world-space infrastructure. Node dimensions and footprints are design facts, not runtime scale factors.

Access anchors are pedestrian or vehicle paths. Attachment ports join compatible structure pieces; keep those concepts distinct. Add a `maxDistance` when the authored connection must meet physically. Assembly metadata lists the production recipe reference, stable piece IDs and order/dependencies; the existing `AssemblyRecipe` remains the only runtime choreography source.

## Blueprint examples

### House

This minimal example adds a house under a residential lot. In real content, include a measured footprint, entry anchor and the existing renderer/recipe bindings.

```ts
const house: PlotNode = {
  id: 'home-main-house',
  role: 'structure',
  parentId: 'home-lot',
  dimensions: { width: 8.85, depth: 7.865, height: 5.73 },
  localTransform: { position: [0, 0.13, -0.8] },
  occupancy: 'exclusive',
  footprint: { width: 8.85, depth: 7.865 },
  anchors: [{ id: 'front-door', type: 'access', position: [0, 0, 4.3] }],
  assembly: {
    recipeRef: 'starting-home:sage',
    pieces: [{ id: 'foundation', order: 0 }, { id: 'walls', order: 1 }, { id: 'roofline', order: 2 }],
    requiredPieceIds: ['foundation', 'walls', 'roofline'],
  },
};
```

The production Chapter 1 adapter is in `plot-blueprints.ts` and preserves the actual builder roots and all three house bounds. The Chapter 2 proof builder demonstrates the complete road-facing lot with driveway, walk, landscape, access links and the real Chapter 1 assembly recipe.

### Community plot

```ts
const park: PlotDefinition = {
  nodes: [
    {
      id: 'neighborhood-green', role: 'district',
      dimensions: { width: 32, depth: 24, height: 12 },
      localTransform: { position: [0, 0, 0] }, occupancy: 'none',
    },
    {
      id: 'community-park', role: 'public-space', parentId: 'neighborhood-green',
      dimensions: { width: 16, depth: 13, height: 4 },
      localTransform: { position: [5, 0, -3], rotation: [0, 0.18, 0] },
      occupancy: 'shared', anchors: [{ id: 'path-entry', type: 'access', position: [0, 0, 6.5] }],
    },
  ],
};
```

Add authored park components beneath `community-park` when they need their own ownership, access, assembly or collision metadata. Shrubs and flower beds can remain detail inside the shared renderer group.

### Hypothetical station (schema example only)

This illustrates that a non-residential project uses the same model. It is not a station asset or a planned feature in the current pass.

```ts
const station: PlotDefinition = {
  nodes: [
    {
      id: 'future-station-site', role: 'lot',
      dimensions: { width: 58, depth: 32, height: 16 },
      localTransform: { position: [0, 0, 0], rotation: [0, Math.PI / 2, 0] },
      occupancy: 'none',
    },
    {
      id: 'future-station-building', role: 'structure', parentId: 'future-station-site',
      dimensions: { width: 22, depth: 12, height: 9 },
      localTransform: { position: [0, 0, 2] }, occupancy: 'exclusive',
      footprint: { width: 22, depth: 12 },
      anchors: [{ id: 'public-entry', type: 'access', position: [0, 0, 6] }],
    },
    {
      id: 'future-platforms', role: 'zone', parentId: 'future-station-site',
      dimensions: { width: 42, depth: 8, height: 1 },
      localTransform: { position: [0, 0, -10] }, occupancy: 'exclusive',
      footprint: { width: 42, depth: 8 }, clearances: { east: 1.5, west: 1.5 },
      attachmentPorts: [{ id: 'track-a', type: 'rail', position: [0, 0, -4] }],
    },
  ],
};
```

## Renderer compatibility and preview

`PlotNode.renderObject` is an optional reference. A data-only node creates no render object. Existing Chapter 1 factories currently author many groups in the town world frame, so their plot nodes are marked `legacy-world-authored`; they are not reparented in the shipped scene. `createPlotSceneHierarchy` is a small synthetic/test adapter: it creates groups only for content-bound nodes and their ancestors, clones the supplied adapters, and normalizes world-authored transforms so the parent transform is applied once. Production rendering, batching, asset disposal and animation continue through `world.ts` and `TownScene`.

The Chapter 2 framework neighbor is available only through Developer Preview. Turning it on builds a fresh world from preview signals, replaces the first neighbor only, and uses that neighbor's own selected design (Cottage, Craftsman or Brick) with the production Chapter 1 recipe. The proof parcel has generous clearance from the starter property so both houses remain visually distinct. It is not stored in the real save, and exit/reload returns to genuine state. The remaining Chapter 2 homes and public projects stay on their existing builders and layout until this framework proof is reviewed.
