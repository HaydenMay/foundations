import * as T from 'three';
import type { NeighborLot } from './chapter-two-houses';
import type { PlotConnection, PlotDefinition, PlotNode, PlotTransform } from './plot-framework';

export interface ChapterTwoSiteLot {
  index: number;
  projectId: string;
  nodeId: string;
  lot: NeighborLot;
  x: number;
  z: number;
  rotation: number;
  width: number;
  depth: number;
  streetSide: 'north' | 'south';
  house: {
    width: number;
    depth: number;
    height: number;
    offsetX: number;
    offsetZ: number;
    entryX: number;
    entryZ: number;
    drivewayX: number;
    drivewayStartZ: number;
  };
}

export interface ChapterTwoPublicSite {
  projectId: 'ch2-entrance' | 'ch2-community-park' | 'ch2-landmark';
  nodeId: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

const DISTRICT_POSITION = [24, 0, -1.5] as const;
const SIDEWALK_OFFSET = 4.02;
const PROPERTY_FRONTAGE_OFFSET = 4.76;

const worldRoadPoints = [
  [-19, 5],
  [-9, 5],
  [2, 5],
  [12, 5],
  [18, 4.25],
  [24, 3.15],
  [30, 2.45],
  [36, 2.4],
  [42, 3.1],
  [48, 4.2],
  [54, 5.05],
  [61, 5.2],
] as const;

export const CHAPTER_TWO_ROAD_CONTROL_POINTS = Object.freeze(
  worldRoadPoints.map(([x, z]) => [x - DISTRICT_POSITION[0], z - DISTRICT_POSITION[2]] as const),
);

const roadCurve = new T.CatmullRomCurve3(
  CHAPTER_TWO_ROAD_CONTROL_POINTS.map(([x, z]) => new T.Vector3(x, 0, z)),
  false,
  'centripetal',
  0.5,
);

/** Resolves the same authored road spline used by the production mesh at a world-space X. */
export function chapterTwoRoadCenterZAt(x: number): number {
  const localX = x - DISTRICT_POSITION[0];
  let nearest = Number.POSITIVE_INFINITY;
  let result = 0;
  for (let sample = 0; sample <= 500; sample++) {
    const point = roadCurve.getPointAt(sample / 500);
    const distance = Math.abs(point.x - localX);
    if (distance < nearest) {
      nearest = distance;
      result = point.z + DISTRICT_POSITION[2];
    }
  }
  return result;
}

function toDistrictPosition(x: number, z: number): readonly [number, number, number] {
  return [x - DISTRICT_POSITION[0], 0, z - DISTRICT_POSITION[2]];
}

function siteLot(
  index: number,
  projectId: string,
  lot: NeighborLot,
  x: number,
  rotation: number,
  width: number,
  depth: number,
  house: ChapterTwoSiteLot['house'],
): ChapterTwoSiteLot {
  const roadZ = chapterTwoRoadCenterZAt(x);
  const streetSide = rotation === 0 ? 'north' : 'south';
  const frontageZ = roadZ + (streetSide === 'north' ? -PROPERTY_FRONTAGE_OFFSET : PROPERTY_FRONTAGE_OFFSET);
  const z = frontageZ + (rotation === 0 ? -depth / 2 : depth / 2);
  return {
    index,
    projectId,
    nodeId: `${projectId}-lot`,
    lot,
    x,
    z,
    rotation,
    width,
    depth,
    streetSide,
    house,
  };
}

const lots: readonly ChapterTwoSiteLot[] = [
  siteLot(1, 'ch2-neighbor-1', 'compact', 10, 0, 13, 12, {
    width: 7.4,
    depth: 6.4,
    height: 5.7,
    offsetX: 0,
    offsetZ: -1.3,
    entryX: 0,
    entryZ: 2.35,
    drivewayX: 3.8,
    drivewayStartZ: 2.2,
  }),
  siteLot(2, 'ch2-neighbor-2', 'l-shaped', 27, Math.PI, 14.5, 14.5, {
    width: 9.6,
    depth: 8.3,
    height: 6.9,
    offsetX: -0.25,
    offsetZ: -1.15,
    entryX: -0.25,
    entryZ: 3.45,
    drivewayX: 3.45,
    drivewayStartZ: 3.55,
  }),
  siteLot(3, 'ch2-neighbor-3', 'two-story', 45, 0, 15.5, 16, {
    width: 10.5,
    depth: 8.7,
    height: 8.8,
    offsetX: 0,
    offsetZ: -1.6,
    entryX: 0,
    entryZ: 3.25,
    drivewayX: -4.15,
    drivewayStartZ: 2.95,
  }),
  siteLot(4, 'ch2-neighbor-4', 'wide-gable', 60, Math.PI, 15, 15, {
    width: 11.2,
    depth: 8.1,
    height: 7.1,
    offsetX: 0,
    offsetZ: -1.35,
    entryX: 0,
    entryZ: 2.95,
    drivewayX: 4.3,
    drivewayStartZ: 2.75,
  }),
];

const publicSites: readonly ChapterTwoPublicSite[] = [
  {
    projectId: 'ch2-entrance',
    nodeId: 'ch2-entrance',
    x: 23.5,
    // The public entrance's north edge meets the north sidewalk centerline.
    z: chapterTwoRoadCenterZAt(23.5) - SIDEWALK_OFFSET - 1.6,
    width: 8.4,
    depth: 3.2,
    height: 3.2,
  },
  {
    projectId: 'ch2-community-park',
    nodeId: 'ch2-community-park',
    x: 27,
    z: -28,
    width: 20,
    depth: 16,
    height: 8,
  },
  {
    projectId: 'ch2-landmark',
    nodeId: 'ch2-landmark',
    x: 60,
    z: -28,
    width: 12,
    depth: 10,
    height: 8,
  },
];

export const CHAPTER_TWO_SITE_PLAN = Object.freeze({
  district: Object.freeze({
    id: 'chapter-two-district',
    dimensions: Object.freeze({ width: 132, depth: 90, height: 28 }),
    position: DISTRICT_POSITION,
  }),
  street: Object.freeze({
    roadWidth: 6.3,
    sidewalkWidth: 1.48,
    sidewalkOffset: SIDEWALK_OFFSET,
    propertyFrontageOffset: PROPERTY_FRONTAGE_OFFSET,
    controlPoints: CHAPTER_TWO_ROAD_CONTROL_POINTS,
  }),
  lots: Object.freeze(lots),
  publicSites: Object.freeze(publicSites),
  paths: Object.freeze({
    parkApproach: Object.freeze({
      x: publicSites[0].x - 0.3,
      startZ: publicSites[0].z - publicSites[0].depth / 2,
      endZ: -20,
    }),
    promenade: Object.freeze({ startX: 37, endX: 54, z: -28 }),
  }),
});

export const CHAPTER_TWO_LOTS = CHAPTER_TWO_SITE_PLAN.lots;
export const CHAPTER_TWO_PUBLIC_SITES = CHAPTER_TWO_SITE_PLAN.publicSites;

function node(id: string, role: PlotNode['role'], parentId: string, dimensions: PlotNode['dimensions'], transform: PlotTransform, overrides: Partial<PlotNode> = {}): PlotNode {
  return { id, role, parentId, dimensions, localTransform: transform, ...overrides };
}

function accessConnection(fromId: string, fromRef: string, toId: string, toRef: string, maxDistance = 0.2): PlotConnection {
  return {
    kind: 'access',
    from: { nodeId: fromId, refId: fromRef, kind: 'anchor' },
    to: { nodeId: toId, refId: toRef, kind: 'anchor' },
    maxDistance,
  };
}

function buildSiteNodes(): { nodes: PlotNode[]; connections: PlotConnection[] } {
  const nodes: PlotNode[] = [
      {
        id: CHAPTER_TWO_SITE_PLAN.district.id,
        role: 'district',
        dimensions: CHAPTER_TWO_SITE_PLAN.district.dimensions,
        localTransform: { position: CHAPTER_TWO_SITE_PLAN.district.position },
        occupancy: 'none',
      },
    ];
  const connections: PlotConnection[] = [];
  const anchorsBySide: Record<'north' | 'south', NonNullable<PlotNode['anchors']>[number][]> = {
    north: [],
    south: [],
  };
  const roadAnchors: NonNullable<PlotNode['anchors']>[number][] = [];

  nodes.push(
    node(
      'ch2-road',
      'public-space',
      CHAPTER_TWO_SITE_PLAN.district.id,
      { width: 82, depth: 6.3, height: 0.4 },
      { position: [0, 0, 0] },
      { occupancy: 'shared', anchors: roadAnchors },
    ),
    node(
      'ch2-sidewalk-north',
      'public-space',
      CHAPTER_TWO_SITE_PLAN.district.id,
      { width: 82, depth: 1.48, height: 0.25 },
      { position: [0, 0, 0] },
      { occupancy: 'shared', anchors: anchorsBySide.north },
    ),
    node(
      'ch2-sidewalk-south',
      'public-space',
      CHAPTER_TWO_SITE_PLAN.district.id,
      { width: 82, depth: 1.48, height: 0.25 },
      { position: [0, 0, 0] },
      { occupancy: 'shared', anchors: anchorsBySide.south },
    ),
    node(
      'ch2-streetscape',
      'public-space',
      CHAPTER_TWO_SITE_PLAN.district.id,
      { width: 82, depth: 20, height: 10 },
      { position: toDistrictPosition(21, 4) },
      { occupancy: 'decorative' },
    ),
  );

  for (const lot of CHAPTER_TWO_SITE_PLAN.lots) {
    const frontLocalZ = lot.depth / 2;
    const roadZ = chapterTwoRoadCenterZAt(lot.x);
    const sidewalkWorldZ = roadZ + (lot.streetSide === 'north' ? -SIDEWALK_OFFSET : SIDEWALK_OFFSET);
    const sidewalkLocalZ = frontLocalZ + (PROPERTY_FRONTAGE_OFFSET - SIDEWALK_OFFSET);
    const roadWorldZ = roadZ + (lot.streetSide === 'north' ? -3.15 : 3.15);
    const roadLocalZ = lot.rotation === 0 ? roadWorldZ - lot.z : lot.z - roadWorldZ;
    const driveWorldX = lot.x + (lot.rotation === 0 ? lot.house.drivewayX : -lot.house.drivewayX);
    const sidewalkDriveId = `${lot.projectId}-driveway`;
    const drivewayStartZ = lot.house.drivewayStartZ;
    const drivewayLength = sidewalkLocalZ - drivewayStartZ;
    const walkStartZ = lot.house.offsetZ + lot.house.entryZ;
    const walkLength = sidewalkLocalZ - walkStartZ;
    const drivewayCenterZ = (drivewayStartZ + sidewalkLocalZ) / 2;
    const walkCenterZ = (walkStartZ + sidewalkLocalZ) / 2;
    const sidewalkDriveAnchor = `${lot.projectId}-drive-end`;
    const sidewalkWalkAnchor = `${lot.projectId}-walk-end`;
    const sidewalkAnchorPosition = (x: number, z: number) => toDistrictPosition(x, z);

    nodes.push({
      id: lot.nodeId,
      role: 'lot',
      parentId: CHAPTER_TWO_SITE_PLAN.district.id,
      dimensions: { width: lot.width, depth: lot.depth, height: 12 },
      localTransform: { position: toDistrictPosition(lot.x, lot.z), rotation: [0, lot.rotation, 0] },
      occupancy: 'exclusive',
      footprint: { width: lot.width, depth: lot.depth },
      setbacks: { north: 0.65, east: 1.0, south: 1.1, west: 1.0 },
      anchors: [{ id: 'driveway-pad', type: 'access', position: [lot.house.drivewayX, 0, drivewayStartZ] }],
      renderObject: undefined,
    });
    const houseId = `${lot.projectId}-house`;
    nodes.push(
      node(
        houseId,
        'structure',
        lot.nodeId,
        { width: lot.house.width, depth: lot.house.depth, height: lot.house.height },
        { position: [lot.house.offsetX, 0.13, lot.house.offsetZ] },
        {
          occupancy: 'exclusive',
          footprint: { width: lot.house.width, depth: lot.house.depth },
          overlapExceptions: [
            {
              nodeId: `${lot.projectId}-walkway`,
              reason: 'The front walk terminates at the house porch steps.',
            },
          ],
          anchors: [
            {
              id: 'front-entry',
              type: 'access',
              position: [lot.house.entryX - lot.house.offsetX, 0, lot.house.entryZ],
              requiresConnection: true,
            },
            ...(lot.lot === 'l-shaped'
              ? [{ id: 'garage-door', type: 'access' as const, position: [3.45 - lot.house.offsetX, 0, 3.55] as const }]
              : []),
          ],
        },
      ),
      node(
        `${lot.projectId}-yard`,
        'zone',
        lot.nodeId,
        { width: lot.width - 2.2, depth: lot.depth - 2.2, height: 1.2 },
        { position: [0, 0, 0] },
        { occupancy: 'decorative', buildable: false },
      ),
      node(
        `${lot.projectId}-driveway`,
        'zone',
        lot.nodeId,
        { width: lot.lot === 'l-shaped' ? 2.8 : 2.4, depth: drivewayLength, height: 0.25 },
        { position: [lot.house.drivewayX, 0.13, drivewayCenterZ] },
        {
          boundaryPolicy: 'allow-overflow',
          boundaryReason: 'The driveway crosses the residential frontage to meet the public sidewalk.',
          occupancy: 'exclusive',
          footprint: { width: lot.lot === 'l-shaped' ? 2.8 : 2.4, depth: drivewayLength },
          anchors: [
            { id: 'apron', type: 'access', position: [0, 0, -drivewayLength / 2], requiresConnection: true },
            { id: 'street-end', type: 'access', position: [0, 0, drivewayLength / 2], requiresConnection: true },
          ],
          renderObject: undefined,
        },
      ),
      node(
        `${lot.projectId}-walkway`,
        'zone',
        lot.nodeId,
        { width: 1.1, depth: walkLength, height: 0.22 },
        { position: [lot.house.entryX, 0.13, walkCenterZ] },
        {
          boundaryPolicy: 'allow-overflow',
          boundaryReason: 'The front walk crosses the residential frontage to meet the public sidewalk.',
          occupancy: 'exclusive',
          footprint: { width: 1.1, depth: walkLength },
          anchors: [
            { id: 'entry', type: 'access', position: [0, 0, -walkLength / 2], requiresConnection: true },
            { id: 'street-end', type: 'access', position: [0, 0, walkLength / 2], requiresConnection: true },
          ],
        },
      ),
      node(
        `${lot.projectId}-mailbox`,
        'component',
        lot.nodeId,
        { width: 0.8, depth: 0.65, height: 1.4 },
        { position: [-lot.width * 0.39, 0, frontLocalZ - 0.5] },
        { occupancy: 'decorative', buildable: false },
      ),
    );

    const sidewalkWorldWalkX = lot.x + (lot.rotation === 0 ? lot.house.entryX : -lot.house.entryX);
    anchorsBySide[lot.streetSide].push(
      { id: sidewalkDriveAnchor, type: 'access', position: sidewalkAnchorPosition(driveWorldX, sidewalkWorldZ), requiresConnection: true },
      { id: sidewalkWalkAnchor, type: 'access', position: sidewalkAnchorPosition(sidewalkWorldWalkX, sidewalkWorldZ), requiresConnection: true },
    );
    roadAnchors.push({
      id: `${lot.projectId}-road-crossing`,
      type: 'access',
      position: toDistrictPosition(driveWorldX, roadZ + (lot.streetSide === 'north' ? -3.15 : 3.15)),
      requiresConnection: true,
    });

    connections.push(
      accessConnection(
        `${lot.projectId}-house`,
        'front-entry',
        `${lot.projectId}-walkway`,
        'entry',
      ),
      accessConnection(
        `${lot.projectId}-walkway`,
        'street-end',
        `ch2-sidewalk-${lot.streetSide}`,
        sidewalkWalkAnchor,
      ),
      accessConnection(
        `${lot.projectId}-driveway`,
        'street-end',
        `ch2-sidewalk-${lot.streetSide}`,
        sidewalkDriveAnchor,
      ),
      accessConnection(
        `ch2-sidewalk-${lot.streetSide}`,
        sidewalkDriveAnchor,
        'ch2-road',
        `${lot.projectId}-road-crossing`,
        1.2,
      ),
      accessConnection(
        `${lot.projectId}-lot`,
        'driveway-pad',
        `${lot.projectId}-driveway`,
        'apron',
      ),
    );
  }

  const siteById = new Map(CHAPTER_TWO_SITE_PLAN.publicSites.map((site) => [site.nodeId, site]));
  for (const site of CHAPTER_TWO_SITE_PLAN.publicSites) {
    nodes.push(
      node(
        site.nodeId,
        'public-space',
        CHAPTER_TWO_SITE_PLAN.district.id,
        { width: site.width, depth: site.depth, height: site.height },
        { position: toDistrictPosition(site.x, site.z) },
        {
          occupancy: 'exclusive',
          footprint: { width: site.width, depth: site.depth },
          buildable: false,
          anchors: [],
        },
      ),
    );
  }

  const entrance = siteById.get('ch2-entrance')!;
  const park = siteById.get('ch2-community-park')!;
  const landmark = siteById.get('ch2-landmark')!;
  const approachStart = CHAPTER_TWO_SITE_PLAN.paths.parkApproach.startZ;
  const approachEnd = CHAPTER_TWO_SITE_PLAN.paths.parkApproach.endZ;
  const approachCenter = (approachStart + approachEnd) / 2;
  const approachDepth = approachStart - approachEnd;
  const promenade = CHAPTER_TWO_SITE_PLAN.paths.promenade;
  const promenadeWidth = promenade.endX - promenade.startX;
  nodes.push(
    node(
      'ch2-public-walk-to-park',
      'public-space',
      CHAPTER_TWO_SITE_PLAN.district.id,
      { width: 1.4, depth: approachDepth, height: 0.2 },
      { position: toDistrictPosition(CHAPTER_TWO_SITE_PLAN.paths.parkApproach.x, approachCenter) },
      {
        occupancy: 'shared',
        anchors: [
          { id: 'entrance', type: 'access', position: [0, 0, approachDepth / 2], requiresConnection: true },
          { id: 'park-entry', type: 'access', position: [0, 0, -approachDepth / 2], requiresConnection: true },
        ],
      },
    ),
    node(
      'ch2-public-promenade',
      'public-space',
      CHAPTER_TWO_SITE_PLAN.district.id,
      { width: promenadeWidth, depth: 1.6, height: 0.2 },
      { position: toDistrictPosition((promenade.startX + promenade.endX) / 2, promenade.z) },
      {
        occupancy: 'shared',
        anchors: [
          { id: 'park', type: 'access', position: [-promenadeWidth / 2, 0, 0], requiresConnection: true },
          { id: 'landmark', type: 'access', position: [promenadeWidth / 2, 0, 0], requiresConnection: true },
        ],
      },
    ),
  );
  const entranceSide = chapterTwoRoadCenterZAt(entrance.x) - SIDEWALK_OFFSET;
  anchorsBySide.north.push({
    id: 'neighborhood-entry',
    type: 'access',
    position: toDistrictPosition(entrance.x, entranceSide),
    requiresConnection: true,
  });
  nodes.find((entry) => entry.id === entrance.nodeId)!.anchors = [
    {
      id: 'street-sidewalk',
      type: 'access',
      position: [0, 0, entrance.depth / 2],
      requiresConnection: true,
    },
    {
      id: 'park-path',
      type: 'access',
      position: [-0.3, 0, -entrance.depth / 2],
      requiresConnection: true,
    },
  ];
  nodes.find((entry) => entry.id === park.nodeId)!.anchors = [
    { id: 'southern-entry', type: 'access', position: [CHAPTER_TWO_SITE_PLAN.paths.parkApproach.x - park.x, 0, park.depth / 2], requiresConnection: true },
    { id: 'eastern-entry', type: 'access', position: [park.width / 2, 0, 0], requiresConnection: true },
  ];
  nodes.find((entry) => entry.id === landmark.nodeId)!.anchors = [
    { id: 'western-entry', type: 'access', position: [-landmark.width / 2, 0, 0], requiresConnection: true },
  ];
  roadAnchors.push({
    id: 'entrance-road-crossing',
    type: 'access',
    position: toDistrictPosition(entrance.x, chapterTwoRoadCenterZAt(entrance.x) - 3.15),
  });
  connections.push(
    accessConnection('ch2-sidewalk-north', 'neighborhood-entry', 'ch2-entrance', 'street-sidewalk', 1.2),
    accessConnection('ch2-entrance', 'park-path', 'ch2-public-walk-to-park', 'entrance', 0.4),
    accessConnection('ch2-public-walk-to-park', 'park-entry', 'ch2-community-park', 'southern-entry'),
    accessConnection('ch2-community-park', 'eastern-entry', 'ch2-public-promenade', 'park'),
    accessConnection('ch2-public-promenade', 'landmark', 'ch2-landmark', 'western-entry'),
    accessConnection('ch2-sidewalk-north', 'neighborhood-entry', 'ch2-road', 'entrance-road-crossing', 1.2),
  );
  return { nodes, connections };
}

/** Joins the original Chapter 1 property to the production district without moving it in world space. */
export function createChapterTwoNeighborhoodPlot(chapterOne: PlotDefinition): PlotDefinition {
  const districtId = CHAPTER_TWO_SITE_PLAN.district.id;
  const [districtX, , districtZ] = DISTRICT_POSITION;
  const chapterOneNodes = chapterOne.nodes.map((entry) => {
    if (entry.parentId) return entry;
    const [x, y, z] = entry.localTransform.position;
    return {
      ...entry,
      parentId: districtId,
      localTransform: {
        ...entry.localTransform,
        position: [x - districtX, y, z - districtZ] as const,
      },
      ...(entry.id === 'chapter1-property'
        ? {
            occupancy: 'exclusive' as const,
            footprint: { width: entry.dimensions.width, depth: entry.dimensions.depth },
          }
        : {}),
    };
  });
  const site = buildSiteNodes();
  return {
    nodes: [...site.nodes, ...chapterOneNodes],
    connections: [...(chapterOne.connections ?? []), ...site.connections],
  };
}
