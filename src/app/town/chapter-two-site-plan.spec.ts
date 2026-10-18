import { describe, expect, it } from 'vitest';
import {
  chapterTwoRoadCenterZAt,
  createChapterTwoNeighborhoodPlot,
  CHAPTER_TWO_SITE_PLAN,
  type ChapterTwoSiteLot,
} from './chapter-two-site-plan';
import { resolvePlotPoint, validatePlot, type PlotDefinition } from './plot-framework';
import { buildWorld } from './world';

const chapterOnePlot: PlotDefinition = {
  nodes: [
    {
      id: 'chapter1-property',
      role: 'lot',
      dimensions: { width: 14, depth: 13.5, height: 10 },
      localTransform: { position: [-5.85, 0, -5.45] },
      occupancy: 'none',
    },
    {
      id: 'chapter1-home',
      role: 'structure',
      parentId: 'chapter1-property',
      dimensions: { width: 8.85, depth: 7.865, height: 6.58 },
      localTransform: { position: [0.85, 0.13, 0.85] },
      occupancy: 'exclusive',
      footprint: { width: 8.85, depth: 7.865 },
    },
  ],
};

function sitePlan(): PlotDefinition {
  return createChapterTwoNeighborhoodPlot(chapterOnePlot);
}

function corners(definition: PlotDefinition, nodeId: string) {
  const node = definition.nodes.find((candidate) => candidate.id === nodeId)!;
  const footprint = node.footprint;
  const width = footprint?.width ?? node.dimensions.width;
  const depth = footprint?.depth ?? node.dimensions.depth;
  const offsetX = footprint?.offsetX ?? 0;
  const offsetZ = footprint?.offsetZ ?? 0;
  return [
    resolvePlotPoint(definition, nodeId, [
      offsetX - width / 2,
      0,
      offsetZ - depth / 2,
    ]),
    resolvePlotPoint(definition, nodeId, [
      offsetX + width / 2,
      0,
      offsetZ + depth / 2,
    ]),
  ];
}

function bounds(definition: PlotDefinition, lot: ChapterTwoSiteLot) {
  const [first, last] = corners(definition, lot.nodeId);
  return {
    minX: Math.min(first.x, last.x),
    maxX: Math.max(first.x, last.x),
    minZ: Math.min(first.z, last.z),
    maxZ: Math.max(first.z, last.z),
  };
}

function rectangleGap(a: ReturnType<typeof bounds>, b: ReturnType<typeof bounds>) {
  const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
  const dz = Math.max(a.minZ - b.maxZ, b.minZ - a.maxZ, 0);
  return Math.hypot(dx, dz);
}

describe('production Chapter 2 neighborhood site plan', () => {
  it('keeps the existing home and all four detached neighbor parcels in one valid ownership graph', () => {
    const definition = sitePlan();

    expect(validatePlot(definition)).toEqual([]);
    expect(definition.nodes.find((node) => node.id === 'chapter1-property')?.localTransform.position)
      .toEqual([-29.85, 0, -3.95]);
    expect(CHAPTER_TWO_SITE_PLAN.lots.map((lot) => lot.projectId)).toEqual([
      'ch2-neighbor-1',
      'ch2-neighbor-2',
      'ch2-neighbor-3',
      'ch2-neighbor-4',
    ]);
    expect(definition.nodes.filter((node) => node.role === 'lot' && node.id.startsWith('ch2-')))
      .toHaveLength(4);
  });

  it('leaves measurable property gaps and keeps every public feature out of private lots', () => {
    const definition = sitePlan();
    const privateLots = [
      {
        minX: -12.85,
        maxX: 1.15,
        minZ: -12.2,
        maxZ: 1.3,
      },
      ...CHAPTER_TWO_SITE_PLAN.lots.map((lot) => bounds(definition, lot)),
    ];

    expect(rectangleGap(privateLots[0], privateLots[1])).toBeGreaterThanOrEqual(2.25);
    for (let index = 0; index < privateLots.length; index++) {
      for (let other = index + 1; other < privateLots.length; other++) {
        expect(rectangleGap(privateLots[index], privateLots[other])).toBeGreaterThan(0);
      }
    }

    for (const publicId of ['ch2-community-park', 'ch2-landmark', 'ch2-entrance']) {
      const publicPlot = bounds(definition, { nodeId: publicId } as ChapterTwoSiteLot);
      for (const privateLot of privateLots)
        expect(rectangleGap(publicPlot, privateLot), `${publicId} overlaps a private lot`).toBeGreaterThan(0);
    }
  });

  it('assigns every house, yard, driveway, walkway, and mailbox to its parent lot', () => {
    const definition = sitePlan();
    for (const lot of CHAPTER_TWO_SITE_PLAN.lots) {
      const children = definition.nodes.filter((node) => node.parentId === lot.nodeId);
      expect(children.map((node) => node.id)).toEqual(
        expect.arrayContaining([
          `${lot.projectId}-house`,
          `${lot.projectId}-yard`,
          `${lot.projectId}-driveway`,
          `${lot.projectId}-walkway`,
          `${lot.projectId}-mailbox`,
        ]),
      );
      expect(children.find((node) => node.id.endsWith('-driveway'))?.boundaryReason).toContain(
        'sidewalk',
      );
      expect(children.find((node) => node.id.endsWith('-walkway'))?.boundaryReason).toContain(
        'sidewalk',
      );
    }
  });

  it('faces all four houses toward the road and connects their driveways and walks to public sidewalks', () => {
    const definition = sitePlan();
    const connections = definition.connections ?? [];
    for (const lot of CHAPTER_TWO_SITE_PLAN.lots) {
      expect(lot.streetSide).toBe(lot.rotation === 0 ? 'north' : 'south');
      expect(connections.some((connection) =>
        connection.from.nodeId === `${lot.projectId}-walkway` &&
        connection.to.nodeId === `ch2-sidewalk-${lot.streetSide}`,
      )).toBe(true);
      expect(connections.some((connection) =>
        connection.from.nodeId === `${lot.projectId}-driveway` &&
        connection.to.nodeId === `ch2-sidewalk-${lot.streetSide}`,
      )).toBe(true);
    }
    expect(connections.some((connection) =>
      connection.from.nodeId === 'ch2-public-walk-to-park' &&
      connection.to.nodeId === 'ch2-community-park',
    )).toBe(true);
    expect(connections.some((connection) =>
      connection.from.nodeId === 'ch2-public-promenade' &&
      connection.to.nodeId === 'ch2-landmark',
    )).toBe(true);
  });

  it('places the neighborhood entrance beside the public sidewalk and starts the park path at its rear edge', () => {
    const entrance = CHAPTER_TWO_SITE_PLAN.publicSites.find((site) => site.projectId === 'ch2-entrance')!;
    const approach = CHAPTER_TWO_SITE_PLAN.paths.parkApproach;
    const sidewalkCenter =
      chapterTwoRoadCenterZAt(entrance.x) - CHAPTER_TWO_SITE_PLAN.street.sidewalkOffset;
    const entranceSidewalkAnchorZ = entrance.z + entrance.depth / 2;
    const entrancePathAnchorZ = entrance.z - entrance.depth / 2;

    expect(entranceSidewalkAnchorZ).toBeCloseTo(sidewalkCenter, 1);
    expect(entrance.x - entrance.width / 2).toBeGreaterThan(CHAPTER_TWO_SITE_PLAN.lots[0].x + CHAPTER_TWO_SITE_PLAN.lots[0].width / 2 + 2);
    expect(approach.x).toBeCloseTo(entrance.x - 0.3);
    expect(approach.startZ).toBeCloseTo(entrancePathAnchorZ);
  });

  it('moves the complete neighborhood layout with its translated and rotated district parent', () => {
    const definition = sitePlan();
    const lotId = 'ch2-neighbor-2-lot';
    const original = resolvePlotPoint(definition, lotId, [0, 0, 0]);
    const nodes = definition.nodes.map((node) =>
      node.id === 'chapter-two-district'
        ? {
            ...node,
            localTransform: {
              position: [39, 0, -5] as const,
              rotation: [0, Math.PI / 2, 0] as const,
            },
          }
        : node,
    );
    const moved = { ...definition, nodes };
    const actual = resolvePlotPoint(moved, lotId, [0, 0, 0]);
    const district = definition.nodes.find((node) => node.id === 'chapter-two-district')!;
    const expected = resolvePlotPoint(
      { ...definition, nodes: [
        { ...district, localTransform: { position: [39, 0, -5], rotation: [0, Math.PI / 2, 0] } },
      ] },
      'chapter-two-district',
      [original.x - district.localTransform.position[0], 0, original.z - district.localTransform.position[2]],
    );

    expect(actual.x).toBeCloseTo(expected.x);
    expect(actual.z).toBeCloseTo(expected.z);
    expect(validatePlot(moved)).toEqual([]);
  });

  it('uses the site-plan parcel transforms for all four production neighbor assemblies', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'ch2-neighbor-1': 'cottage',
      'ch2-neighbor-2': 'craftsman',
      'ch2-neighbor-3': 'brick',
      'ch2-neighbor-4': 'cottage',
    });
    try {
      const definition = world.plotDefinitions.find((candidate) =>
        candidate.nodes.some((node) => node.id === 'chapter-two-district'),
      )!;
      for (const lot of CHAPTER_TWO_SITE_PLAN.lots) {
        const asset = world.projectAssets.get(lot.projectId)!;
        const node = definition.nodes.find((candidate) => candidate.id === lot.nodeId)!;
        const resolved = resolvePlotPoint(definition, lot.nodeId, [0, 0, 0]);
        expect(node.renderObject).toBe(asset.root);
        expect(asset.root.position.x).toBeCloseTo(resolved.x);
        expect(asset.root.position.z).toBeCloseTo(resolved.z);
        expect(asset.root.rotation.y).toBeCloseTo(lot.rotation);
      }
      expect(validatePlot(definition)).toEqual([]);
    } finally {
      world.assets.dispose();
    }
  });
});
