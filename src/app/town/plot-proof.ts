import * as T from 'three';
import type { AssemblyRecipe } from './assembly';
import type { AssetLibrary } from './assets';
import { CHAPTER_TWO_LOTS, type ChapterTwoLot } from './chapter-two-assets';
import { batchStatic } from './batching';
import { plantTree } from './landscaping';
import type { MilestoneAsset } from './milestone-assets';
import { STARTING_HOME_ASSEMBLY_RECIPES } from './residential-assembly';
import { buildStartingHouse } from './residential';
import { surface } from './surfaces';
import { CHAPTER_ONE_ARCHITECTURE_STANDARDS, CHAPTER_ONE_PROPERTY_BOUNDS } from './plot-blueprints';
import type { PlotDefinition, PlotNode, PlotVector3 } from './plot-framework';

export type FrameworkHomeStyle = 'sage' | 'cream' | 'blue';

export interface FrameworkProofAsset {
  asset: MilestoneAsset;
  definition: PlotDefinition;
}

interface ProofRenderObjects {
  root?: T.Group;
  lot?: T.Group;
  house?: T.Group;
  driveway?: T.Group;
  walkway?: T.Group;
  landscape?: T.Group;
}

const PROOF_HOUSE_POSITION: PlotVector3 = [-0.1, 0.13, -0.8];
const PROOF_LOT_WIDTH = 13.5;
const PROOF_LOT_SIDE_GAP_METERS = 8.5;
const PROOF_LOT = Object.freeze({
  ...CHAPTER_TWO_LOTS[0],
  x: CHAPTER_ONE_PROPERTY_BOUNDS.maxX + PROOF_LOT_SIDE_GAP_METERS + PROOF_LOT_WIDTH / 2,
  // This is an isolated teaching layout, so keep its own frontage aligned to the proof sidewalk
  // instead of inheriting the production street's new, curved-road parcel position.
  z: -3.3,
  rotation: 0,
  width: PROOF_LOT_WIDTH,
  depth: 9.8,
});
const PROOF_FOCUS = {
  x: (CHAPTER_ONE_PROPERTY_BOUNDS.maxX + PROOF_LOT.x) / 2,
  z: -4,
  zoom: 0.72,
};
const PROOF_RECIPE: AssemblyRecipe = {
  ...STARTING_HOME_ASSEMBLY_RECIPES['sage'],
  config: { ...STARTING_HOME_ASSEMBLY_RECIPES['sage'].config, speed: 1 },
};

/** Keep the neighbor's independently selected Chapter 2 design rather than copying the player's home. */
export function frameworkHomeStyleForNeighbor(choice: string | undefined): FrameworkHomeStyle {
  return choice === 'craftsman' ? 'cream' : choice === 'brick' ? 'blue' : 'sage';
}

function proofHouseNode(style: FrameworkHomeStyle, renderObject?: T.Object3D): PlotNode {
  const standard = CHAPTER_ONE_ARCHITECTURE_STANDARDS.styles[style];
  return {
    id: 'chapter2-proof-house',
    role: 'structure',
    parentId: 'chapter2-proof-lot',
    dimensions: { width: standard.width, depth: standard.depth, height: standard.height },
    boundsOffset: standard.boundsOffset,
    localTransform: { position: PROOF_HOUSE_POSITION },
    occupancy: 'exclusive',
    footprint: {
      width: standard.width,
      depth: standard.depth,
      offsetX: standard.boundsOffset[0],
      offsetZ: standard.boundsOffset[2],
    },
    overlapExceptions: [
      {
        nodeId: 'chapter2-proof-driveway',
        reason: 'The driveway meets the Chapter 1 garage apron at the garage door.',
      },
      {
        nodeId: 'chapter2-proof-walkway',
        reason: 'The front walk meets the existing Chapter 1 porch steps.',
      },
    ],
    renderObject,
    renderCoordinateSystem: 'legacy-world-authored',
    assembly: {
      recipeRef: `starting-home:${style}`,
      pieces: PROOF_RECIPE.pieces.map((piece, index) => ({
        id: piece.id,
        order: piece.order ?? index,
      })),
      requiredPieceIds: PROOF_RECIPE.pieces
        .filter((piece) => !piece.optional)
        .map((piece) => piece.id),
    },
    anchors: [
      { id: 'front-entry', type: 'access', position: [-0.35, 0, 4.38], requiresConnection: true },
      { id: 'garage-door', type: 'access', position: [4.02, 0, 1.87], requiresConnection: true },
    ],
  };
}

/** Universal-contract example for a Chapter 1-quality neighbor; its placement is parent-local. */
export function createChapterTwoProofPlot(
  style: FrameworkHomeStyle,
  districtPosition: PlotVector3 = [0, 0, 0],
  districtRotation = 0,
  render: ProofRenderObjects = {},
): PlotDefinition {
  const lot: ChapterTwoLot = PROOF_LOT;
  const nodes: PlotNode[] = [
    {
      id: 'chapter2-proof-district',
      role: 'district',
      dimensions: { width: 120, depth: 100, height: 24 },
      localTransform: { position: districtPosition, rotation: [0, districtRotation, 0] },
      occupancy: 'none',
    },
    {
      id: 'chapter2-proof-lot',
      role: 'lot',
      parentId: 'chapter2-proof-district',
      dimensions: { width: lot.width, depth: lot.depth, height: 9 },
      localTransform: { position: [lot.x, 0, lot.z], rotation: [0, lot.rotation, 0] },
      occupancy: 'none',
      renderObject: render.lot,
      renderCoordinateSystem: render.lot ? 'legacy-world-authored' : undefined,
      anchors: [{ id: 'street-frontage', type: 'frontage', position: [0, 0, lot.depth / 2] }],
    },
    proofHouseNode(style, render.house),
    {
      id: 'chapter2-proof-driveway',
      role: 'zone',
      parentId: 'chapter2-proof-lot',
      dimensions: { width: 1.65, depth: 3.2, height: 0.18 },
      localTransform: { position: [4.55, 0.13, 3.3] },
      occupancy: 'exclusive',
      footprint: { width: 1.65, depth: 3.2, offsetX: 4.55, offsetZ: 3.3 },
      renderObject: render.driveway,
      renderCoordinateSystem: render.driveway ? 'legacy-world-authored' : undefined,
      anchors: [
        {
          id: 'garage-apron',
          type: 'access',
          position: [-0.63, 0, -2.23],
          requiresConnection: true,
        },
        { id: 'street-end', type: 'access', position: [0, 0, 1.6], requiresConnection: true },
      ],
    },
    {
      id: 'chapter2-proof-walkway',
      role: 'zone',
      parentId: 'chapter2-proof-lot',
      dimensions: { width: 1.05, depth: 1.3, height: 0.18 },
      localTransform: { position: [-0.45, 0.13, 4.25] },
      occupancy: 'exclusive',
      footprint: { width: 1.05, depth: 1.3, offsetX: -0.45, offsetZ: 4.25 },
      renderObject: render.walkway,
      renderCoordinateSystem: render.walkway ? 'legacy-world-authored' : undefined,
      anchors: [
        { id: 'entry', type: 'access', position: [0, 0, -0.65], requiresConnection: true },
        { id: 'street-end', type: 'access', position: [0, 0, 0.65], requiresConnection: true },
      ],
    },
    {
      id: 'chapter2-proof-landscape',
      role: 'zone',
      parentId: 'chapter2-proof-lot',
      dimensions: { width: 3.9, depth: 5.4, height: 3.2 },
      localTransform: { position: [-3.6, 0, -1.9] },
      occupancy: 'decorative',
      footprint: { width: 3.9, depth: 5.4, offsetX: -3.6, offsetZ: -1.9 },
      renderObject: render.landscape,
      renderCoordinateSystem: render.landscape ? 'legacy-world-authored' : undefined,
      buildable: false,
    },
    {
      id: 'chapter2-proof-sidewalk',
      role: 'public-space',
      parentId: 'chapter2-proof-district',
      dimensions: { width: lot.width, depth: 0.5, height: 0.2 },
      localTransform: { position: [lot.x, 0.13, 1.85] },
      occupancy: 'shared',
      anchors: [
        {
          id: 'drive-connection',
          type: 'access',
          position: [4.55, 0, 0],
          requiresConnection: true,
        },
        {
          id: 'walk-connection',
          type: 'access',
          position: [-0.45, 0, 0],
          requiresConnection: true,
        },
      ],
    },
  ];

  return {
    nodes,
    connections: [
      {
        kind: 'access',
        from: { nodeId: 'chapter2-proof-house', refId: 'garage-door', kind: 'anchor' },
        to: { nodeId: 'chapter2-proof-driveway', refId: 'garage-apron', kind: 'anchor' },
        maxDistance: 0.02,
      },
      {
        kind: 'access',
        from: { nodeId: 'chapter2-proof-driveway', refId: 'street-end', kind: 'anchor' },
        to: { nodeId: 'chapter2-proof-sidewalk', refId: 'drive-connection', kind: 'anchor' },
        maxDistance: 0.25,
      },
      {
        kind: 'access',
        from: { nodeId: 'chapter2-proof-house', refId: 'front-entry', kind: 'anchor' },
        to: { nodeId: 'chapter2-proof-walkway', refId: 'entry', kind: 'anchor' },
        maxDistance: 0.03,
      },
      {
        kind: 'access',
        from: { nodeId: 'chapter2-proof-walkway', refId: 'street-end', kind: 'anchor' },
        to: { nodeId: 'chapter2-proof-sidewalk', refId: 'walk-connection', kind: 'anchor' },
        maxDistance: 0.25,
      },
    ],
  };
}

/**
 * One isolated review proof. It reuses Chapter 1 house geometry and assembly recipes while leaving
 * the four production Chapter 2 neighbors and all player save data untouched.
 */
export function buildChapterTwoFrameworkProof(
  assets: AssetLibrary,
  parent: T.Group,
  style: FrameworkHomeStyle,
): FrameworkProofAsset {
  const root = assets.group(parent);
  root.name = 'framework-proof-neighbor';
  root.userData['staticBatchBoundary'] = true;
  const parcel = assets.group(root, PROOF_LOT.x, 0, PROOF_LOT.z, PROOF_LOT.rotation);
  parcel.name = 'framework-proof-lot';
  parcel.userData['plotNodeId'] = 'chapter2-proof-lot';

  const lot = assets.group(parcel);
  lot.name = 'proof-lot-surface';
  assets.box(
    lot,
    surface(assets, 'grass', '#859165'),
    0,
    0.07,
    0,
    PROOF_LOT.width,
    0.1,
    PROOF_LOT.depth,
  );
  const border = assets.group(parcel);
  border.name = 'proof-property-border';
  for (const side of [-1, 1]) {
    assets.box(
      border,
      '#a9a38f',
      (side * PROOF_LOT.width) / 2,
      0.16,
      0,
      0.12,
      0.16,
      PROOF_LOT.depth,
    );
    assets.box(
      border,
      '#a9a38f',
      0,
      0.16,
      (side * PROOF_LOT.depth) / 2,
      PROOF_LOT.width,
      0.16,
      0.12,
    );
  }

  const driveway = assets.group(parcel);
  driveway.name = 'proof-empty-driveway';
  assets.box(driveway, surface(assets, 'paving', '#bcb8aa'), 4.55, 0.13, 3.3, 1.65, 0.1, 3.2);
  assets.box(driveway, '#ccc8bb', 3.94, 0.19, 3.1, 0.08, 0.025, 2.3);

  const walkway = assets.group(parcel);
  walkway.name = 'proof-entry-walkway';
  assets.box(walkway, '#c5c0b0', -0.45, 0.13, 4.25, 1.05, 0.09, 1.3);
  for (const z of [3.8, 4.25, 4.7])
    assets.box(walkway, '#ddd8c8', -0.45, 0.18, z, 0.84, 0.015, 0.025);

  const landscape = assets.group(parcel);
  landscape.name = 'proof-curated-landscape';
  assets.box(landscape, '#b3aa90', -4.15, 0.13, -1.95, 0.82, 0.13, 5.25);
  for (const z of [-3.75, -2.45, -1.15, 0.15]) assets.shrub(landscape, -4.15, z, 0.34);
  plantTree(assets, landscape, -4.45, -2.2, 0.52, 'birch', 3141);
  assets.flowerBox(landscape, -3.6, 0.3, 2.5, '#c29a91');
  assets.flowerBox(landscape, 2.1, 0.3, 4.05, '#b89980');
  assets.tree(landscape, -4.65, 1.15, 0.42, '#88936d');

  const mailbox = assets.group(parcel);
  mailbox.name = 'proof-mailbox';
  assets.box(mailbox, '#715d44', -4.7, 0.49, 4.2, 0.1, 0.8, 0.1);
  assets.box(mailbox, '#e4d8c2', -4.7, 0.87, 4.2, 0.55, 0.3, 0.3);
  assets.box(mailbox, '#9d4a43', -4.7, 1.05, 4.2, 0.09, 0.12, 0.12);

  const sidewalk = assets.group(root, PROOF_LOT.x, 0, 1.85);
  sidewalk.name = 'proof-road-sidewalk';
  assets.box(sidewalk, '#c8c5b8', 0, 0.13, 0, PROOF_LOT.width, 0.09, 0.5);
  assets.box(sidewalk, '#b3b0a5', 0, 0.18, -0.24, PROOF_LOT.width, 0.12, 0.08);

  const house = buildStartingHouse(assets, parcel, style, undefined, PROOF_HOUSE_POSITION);
  house.root.name = 'starting-home';
  house.root.userData['plotNodeId'] = 'chapter2-proof-house';
  for (const piece of house.assemblies.values()) {
    batchStatic(piece, (geometry) => assets.geometry(geometry));
    piece.userData['staticBatchBoundary'] = true;
  }
  for (const piece of [lot, border, driveway, walkway, landscape, mailbox, sidewalk])
    batchStatic(piece, (geometry) => assets.geometry(geometry));

  const definition = createChapterTwoProofPlot(style, [0, 0, 0], 0, {
    root,
    lot: parcel,
    house: house.root,
    driveway,
    walkway,
    landscape,
  });
  const recipe = STARTING_HOME_ASSEMBLY_RECIPES[style];
  const asset: MilestoneAsset = {
    root,
    pieces: house.assemblies,
    recipe,
    focus: PROOF_FOCUS,
  };
  return { asset, definition };
}
