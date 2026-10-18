import * as T from 'three';
import type { AssemblyRecipe } from './assembly';
import { FEATURE_ZONES, type FeatureZone, type MilestoneAsset } from './milestone-assets';
import { STARTING_HOME_ASSEMBLY_RECIPES } from './residential-assembly';
import type { PlotConnection, PlotDefinition, PlotNode, PlotVector3 } from './plot-framework';

/** Architectural dimensions measured from the completed Chapter 1 residential models. */
export const CHAPTER_ONE_ARCHITECTURE_STANDARDS = Object.freeze({
  units: 'metres',
  groundPlane: 'Y=0',
  axes: 'X left/right, Y vertical, Z front/back; the porch faces +Z.',
  styles: Object.freeze({
    sage: Object.freeze({
      width: 8.851957,
      depth: 7.865,
      height: 5.73,
      boundsOffset: [1.1759785, 0, 0.6175] as PlotVector3,
    }),
    cream: Object.freeze({
      width: 8.826957,
      depth: 7.865,
      height: 6.58,
      boundsOffset: [1.1884785, 0, 0.6175] as PlotVector3,
    }),
    blue: Object.freeze({
      width: 8.851957,
      depth: 7.865,
      height: 5.73,
      boundsOffset: [1.1759785, 0, 0.6175] as PlotVector3,
    }),
  }),
  components: Object.freeze({
    mainWallFootprint: [5.8, 4.4] as const,
    wallHeight: 2.65,
    frontDoor: [0.85, 2.0] as const,
    mainWindow: [0.85, 1.15] as const,
    porchDeck: [5.4, 1.8] as const,
    garageWingFootprint: [2.4, 3.8] as const,
  }),
  source: 'Chapter 1 completed geometry bounds and residential.ts model dimensions.',
});

export interface ChapterOnePlotSources {
  home?: T.Group;
  homeAssemblies?: ReadonlyMap<string, T.Group>;
  homeRecipe?: AssemblyRecipe;
  projectAssets: ReadonlyMap<string, MilestoneAsset>;
  legacyAssets: ReadonlyMap<string, T.Group>;
}

const PROPERTY_ORIGIN: PlotVector3 = [-5.85, 0, -5.45];
const PROPERTY_SIZE = { width: 14, depth: 13.5, height: 10 };
export const CHAPTER_ONE_PROPERTY_BOUNDS = Object.freeze({
  minX: PROPERTY_ORIGIN[0] - PROPERTY_SIZE.width / 2,
  maxX: PROPERTY_ORIGIN[0] + PROPERTY_SIZE.width / 2,
  minZ: PROPERTY_ORIGIN[2] - PROPERTY_SIZE.depth / 2,
  maxZ: PROPERTY_ORIGIN[2] + PROPERTY_SIZE.depth / 2,
});
const HOME_POSITION: PlotVector3 = [0.85, 0.13, 0.85];

function zoneNode(parentId: string, bounds: FeatureZone, render?: T.Object3D): PlotNode {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const key = bounds.id;
  return {
    id: `chapter1-zone-${key}`,
    role: key === 'boundary' ? 'lot' : 'zone',
    parentId,
    dimensions: { width, depth, height: 0.2 },
    localTransform: { position: [centerX - PROPERTY_ORIGIN[0], 0, centerZ - PROPERTY_ORIGIN[2]] },
    occupancy: 'none',
    buildable: key !== 'boundary',
    renderObject: render,
    renderCoordinateSystem: render ? 'legacy-world-authored' : undefined,
  };
}

function assemblyMetadata(recipe: AssemblyRecipe | undefined, style: string) {
  const current =
    recipe ?? STARTING_HOME_ASSEMBLY_RECIPES[style] ?? STARTING_HOME_ASSEMBLY_RECIPES['sage'];
  return {
    recipeRef: `starting-home:${style}`,
    pieces: current.pieces.map((piece, index) => ({
      id: piece.id,
      order: piece.order ?? index,
    })),
    requiredPieceIds: current.pieces.filter((piece) => !piece.optional).map((piece) => piece.id),
  };
}

/**
 * Ownership/measurement adapter over the current Chapter 1 render groups. It does not reparent,
 * transform, clone, or replace production geometry; existing world-authored groups remain intact.
 */
export function createChapterOnePropertyPlot(
  source: ChapterOnePlotSources,
  style: 'sage' | 'cream' | 'blue',
): PlotDefinition {
  const nodes: PlotNode[] = [
    {
      id: 'chapter1-property',
      role: 'lot',
      dimensions: PROPERTY_SIZE,
      localTransform: { position: PROPERTY_ORIGIN },
      occupancy: 'none',
      buildable: false,
      anchors: [{ id: 'frontage', type: 'frontage', position: [0, 0, PROPERTY_SIZE.depth / 2] }],
    },
  ];

  if (source.home) {
    const measured = CHAPTER_ONE_ARCHITECTURE_STANDARDS.styles[style];
    nodes.push({
      id: 'chapter1-home',
      role: 'structure',
      parentId: 'chapter1-property',
      dimensions: { width: measured.width, depth: measured.depth, height: measured.height },
      boundsOffset: measured.boundsOffset,
      localTransform: { position: HOME_POSITION },
      occupancy: 'exclusive',
      footprint: {
        width: measured.width,
        depth: measured.depth,
        offsetX: measured.boundsOffset[0],
        offsetZ: measured.boundsOffset[2],
      },
      renderObject: source.home,
      renderCoordinateSystem: 'legacy-world-authored',
      assembly: assemblyMetadata(source.homeRecipe, style),
      anchors: [
        { id: 'front-entry', type: 'access', position: [-0.35, 0, 4.38], requiresConnection: true },
      ],
    });
  }

  for (const [id, zone] of Object.entries(FEATURE_ZONES)) {
    const asset = source.projectAssets.get(id)?.root ?? source.legacyAssets.get(id);
    nodes.push(zoneNode('chapter1-property', zone, asset));
  }

  const connections: PlotConnection[] = [];
  // The existing driveway and garden path are world-authored under the town root. These nodes
  // record their lot-relative ownership without introducing another rendered hierarchy.
  if (source.home) {
    nodes.push(
      {
        id: 'chapter1-driveway',
        role: 'zone',
        parentId: 'chapter1-property',
        dimensions: { width: 2.6, depth: 7.8, height: 0.2 },
        localTransform: { position: [5.05, 0.2, 3.85] },
        boundaryPolicy: 'allow-overflow',
        boundaryReason:
          'The existing driveway reaches from the garage apron to the street sidewalk.',
        occupancy: 'none',
        buildable: false,
      },
      {
        id: 'chapter1-front-walkway',
        role: 'zone',
        parentId: 'chapter1-property',
        dimensions: { width: 1, depth: 1.3, height: 0.2 },
        localTransform: { position: [0.5, 0.13, 6.71] },
        boundaryPolicy: 'allow-overflow',
        boundaryReason:
          'The existing front path crosses the property edge to meet the public sidewalk.',
        occupancy: 'none',
        buildable: false,
        anchors: [
          { id: 'entry-end', type: 'access', position: [0, 0, -1.46], requiresConnection: true },
          { id: 'sidewalk-end', type: 'access', position: [0, 0, 1.46], requiresConnection: true },
        ],
      },
      {
        id: 'chapter1-public-sidewalk',
        role: 'public-space',
        parentId: 'chapter1-property',
        dimensions: { width: 14, depth: 1.2, height: 0.2 },
        localTransform: { position: [0.5, 0.13, 8.15] },
        boundaryPolicy: 'allow-overflow',
        boundaryReason:
          'The sidewalk belongs to the public street edge, outside the residential lot.',
        occupancy: 'shared',
        buildable: false,
        anchors: [
          { id: 'approach', type: 'access', position: [0, 0, 0], requiresConnection: true },
        ],
      },
    );
    connections.push(
      {
        kind: 'access',
        from: { nodeId: 'chapter1-home', refId: 'front-entry', kind: 'anchor' },
        to: { nodeId: 'chapter1-front-walkway', refId: 'entry-end', kind: 'anchor' },
        maxDistance: 0.2,
      },
      {
        kind: 'access',
        from: { nodeId: 'chapter1-front-walkway', refId: 'sidewalk-end', kind: 'anchor' },
        to: { nodeId: 'chapter1-public-sidewalk', refId: 'approach', kind: 'anchor' },
        maxDistance: 0.2,
      },
    );
  }

  return { nodes, connections };
}
