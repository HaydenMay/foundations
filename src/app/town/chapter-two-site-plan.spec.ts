import { describe, expect, it } from 'vitest';
import * as T from 'three';
import {
  CHAPTER_TWO_ROAD_CONTROL_POINTS,
  chapterTwoRoadFrameAtX,
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
    resolvePlotPoint(definition, nodeId, [offsetX - width / 2, 0, offsetZ - depth / 2]),
    resolvePlotPoint(definition, nodeId, [offsetX + width / 2, 0, offsetZ + depth / 2]),
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
  it('aligns each residential lot with its local curved-street tangent', () => {
    const road = new T.CatmullRomCurve3(
      CHAPTER_TWO_ROAD_CONTROL_POINTS.map(([x, z]) => new T.Vector3(x, 0, z)),
      false,
      'centripetal',
      0.5,
    );
    const roadSamples = Array.from({ length: 801 }, (_, index) => road.getPointAt(index / 800));
    const [districtX, , districtZ] = CHAPTER_TWO_SITE_PLAN.district.position;

    for (const lot of CHAPTER_TWO_SITE_PLAN.lots) {
      const center = new T.Vector3(lot.x - districtX, 0, lot.z - districtZ);
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < roadSamples.length; index++) {
        const distance = center.distanceTo(roadSamples[index]);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
      const tangent = road.getTangentAt(closestIndex / (roadSamples.length - 1));
      const lotAxis = new T.Vector2(Math.cos(lot.rotation), -Math.sin(lot.rotation));
      const roadAxis = new T.Vector2(tangent.x, tangent.z).normalize();

      expect(
        Math.abs(lotAxis.cross(roadAxis)),
        `${lot.projectId} should follow the road tangent`,
      ).toBeLessThan(0.02);
    }
  });

  it('keeps the full lot frontage beyond the outside edge of the curved sidewalk', () => {
    const road = new T.CatmullRomCurve3(
      CHAPTER_TWO_ROAD_CONTROL_POINTS.map(([x, z]) => new T.Vector3(x, 0, z)),
      false,
      'centripetal',
      0.5,
    );
    const roadSamples = Array.from({ length: 801 }, (_, index) => road.getPointAt(index / 800));
    const [districtX, , districtZ] = CHAPTER_TWO_SITE_PLAN.district.position;
    const sidewalkOuterEdge =
      CHAPTER_TWO_SITE_PLAN.street.sidewalkOffset + CHAPTER_TWO_SITE_PLAN.street.sidewalkWidth / 2;

    for (const lot of CHAPTER_TWO_SITE_PLAN.lots) {
      let closestFrontageDistance = Number.POSITIVE_INFINITY;
      for (let sample = 0; sample <= 48; sample++) {
        const localX = (sample / 48 - 0.5) * lot.width;
        const cos = Math.cos(lot.rotation);
        const sin = Math.sin(lot.rotation);
        const frontage = new T.Vector3(
          lot.x - districtX + localX * cos + (lot.depth / 2) * sin,
          0,
          lot.z - districtZ - localX * sin + (lot.depth / 2) * cos,
        );
        const distance = roadSamples.reduce(
          (nearest, point) => Math.min(nearest, frontage.distanceTo(point)),
          Number.POSITIVE_INFINITY,
        );
        closestFrontageDistance = Math.min(closestFrontageDistance, distance);
      }

      expect(
        closestFrontageDistance,
        `${lot.projectId} frontage should clear the sidewalk plus a small planted verge`,
      ).toBeGreaterThanOrEqual(sidewalkOuterEdge + 0.25);
    }
  });

  it('keeps the existing home and all four detached neighbor parcels in one valid ownership graph', () => {
    const definition = sitePlan();

    expect(validatePlot(definition)).toEqual([]);
    expect(
      definition.nodes.find((node) => node.id === 'chapter1-property')?.localTransform.position,
    ).toEqual([-29.85, 0, -3.95]);
    expect(CHAPTER_TWO_SITE_PLAN.lots.map((lot) => lot.projectId)).toEqual([
      'ch2-neighbor-1',
      'ch2-neighbor-2',
      'ch2-neighbor-3',
      'ch2-neighbor-4',
    ]);
    expect(
      definition.nodes.filter((node) => node.role === 'lot' && node.id.startsWith('ch2-')),
    ).toHaveLength(4);
  });

  it('keeps detached-house driveways beside the house footprints instead of under them', () => {
    for (const lot of CHAPTER_TWO_SITE_PLAN.lots.filter(
      (candidate) => candidate.lot !== 'l-shaped',
    )) {
      const sidewalkLocalZ =
        lot.depth / 2 +
        CHAPTER_TWO_SITE_PLAN.street.propertyFrontageOffset -
        CHAPTER_TWO_SITE_PLAN.street.sidewalkOffset;
      const houseMinX = lot.house.offsetX - lot.house.width / 2;
      const houseMaxX = lot.house.offsetX + lot.house.width / 2;
      const drivewayMinX = lot.house.drivewayX - lot.house.drivewayWidth / 2;
      const drivewayMaxX = lot.house.drivewayX + lot.house.drivewayWidth / 2;
      const houseFrontZ = lot.house.offsetZ + lot.house.depth / 2;

      expect(
        drivewayMaxX <= houseMinX || drivewayMinX >= houseMaxX,
        `${lot.projectId} driveway should run beside its house`,
      ).toBe(true);
      expect(
        lot.house.drivewayStartZ,
        `${lot.projectId} driveway should begin beyond the house front`,
      ).toBeGreaterThanOrEqual(houseFrontZ);
      expect(sidewalkLocalZ).toBeGreaterThan(lot.house.drivewayStartZ);
    }
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
        expect(
          rectangleGap(publicPlot, privateLot),
          `${publicId} overlaps a private lot`,
        ).toBeGreaterThan(0);
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
      const road = chapterTwoRoadFrameAtX(lot.x);
      const roadRight = new T.Vector2(road.tangentZ, -road.tangentX);
      const fromRoadToLot = new T.Vector2(lot.x - road.x, lot.z - road.z);
      expect(lot.streetSide).toBe(fromRoadToLot.dot(roadRight) > 0 ? 'north' : 'south');
      expect(
        connections.some(
          (connection) =>
            connection.from.nodeId === `${lot.projectId}-walkway` &&
            connection.to.nodeId === `ch2-sidewalk-${lot.streetSide}`,
        ),
      ).toBe(true);
      expect(
        connections.some(
          (connection) =>
            connection.from.nodeId === `${lot.projectId}-driveway` &&
            connection.to.nodeId === `ch2-sidewalk-${lot.streetSide}`,
        ),
      ).toBe(true);
      const roadLink = connections.find(
        (connection) =>
          connection.from.nodeId === `ch2-sidewalk-${lot.streetSide}` &&
          connection.from.refId === `${lot.projectId}-drive-end` &&
          connection.to.nodeId === 'ch2-road',
      )!;
      const sidewalkNode = definition.nodes.find((node) => node.id === roadLink.from.nodeId)!;
      const roadNode = definition.nodes.find((node) => node.id === roadLink.to.nodeId)!;
      const sidewalkAnchor = sidewalkNode.anchors!.find(
        (anchor) => anchor.id === roadLink.from.refId,
      )!;
      const roadAnchor = roadNode.anchors!.find((anchor) => anchor.id === roadLink.to.refId)!;
      const sidewalkPoint = resolvePlotPoint(definition, sidewalkNode.id, sidewalkAnchor.position);
      const roadPoint = resolvePlotPoint(definition, roadNode.id, roadAnchor.position);
      expect(
        sidewalkPoint.distanceTo(roadPoint),
        `${lot.projectId} sidewalk-to-road crossing`,
      ).toBeLessThanOrEqual(roadLink.maxDistance!);
    }
    expect(
      connections.some(
        (connection) =>
          connection.from.nodeId === 'ch2-public-walk-to-park' &&
          connection.to.nodeId === 'ch2-community-park',
      ),
    ).toBe(true);
    expect(
      connections.some(
        (connection) =>
          connection.from.nodeId === 'ch2-public-promenade' &&
          connection.to.nodeId === 'ch2-landmark',
      ),
    ).toBe(true);
  });

  it('places the neighborhood entrance beside the public sidewalk and starts the park path at its rear edge', () => {
    const entrance = CHAPTER_TWO_SITE_PLAN.publicSites.find(
      (site) => site.projectId === 'ch2-entrance',
    )!;
    const approach = CHAPTER_TWO_SITE_PLAN.paths.parkApproach;
    const sidewalkCenter =
      chapterTwoRoadCenterZAt(entrance.x) - CHAPTER_TWO_SITE_PLAN.street.sidewalkOffset;
    const entranceSidewalkAnchorZ = entrance.z + entrance.depth / 2;
    const entrancePathAnchorZ = entrance.z - entrance.depth / 2;

    expect(entranceSidewalkAnchorZ).toBeCloseTo(sidewalkCenter, 1);
    expect(entrance.x - entrance.width / 2).toBeGreaterThan(
      CHAPTER_TWO_SITE_PLAN.lots[0].x + CHAPTER_TWO_SITE_PLAN.lots[0].width / 2 + 2,
    );
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
      {
        ...definition,
        nodes: [
          { ...district, localTransform: { position: [39, 0, -5], rotation: [0, Math.PI / 2, 0] } },
        ],
      },
      'chapter-two-district',
      [
        original.x - district.localTransform.position[0],
        0,
        original.z - district.localTransform.position[2],
      ],
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
