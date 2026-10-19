import * as T from 'three';
import type { PlotConnection, PlotDefinition, PlotNode, PlotTransform } from './plot-framework';
import { chapterTwoRoadFrameAtX, CHAPTER_TWO_SITE_PLAN } from './chapter-two-site-plan';
import { CHAPTER_ONE_PROPERTY_BOUNDS } from './plot-blueprints';

export type CityProjectId = 'city-main-street' | 'city-library' | 'city-plaza' | 'city-greenway';

export interface CityProjectSite {
  id: CityProjectId;
  nodeId: CityProjectId;
  role: 'lot' | 'public-space';
  position: readonly [number, number, number];
  rotation: number;
  width: number;
  depth: number;
  height: number;
  pedestrianCapacity: number;
}

export interface CityPathSegment {
  id: string;
  from: readonly [number, number];
  to: readonly [number, number];
  width: number;
}

const CITY_ORIGIN = [76, 0, -3] as const;
const MONORAIL_ORIGIN = [45, 0, -1] as const;

/** One compact street spine ties the existing homes to Main Street and the civic green. */
export const CITY_SITE_PLAN = Object.freeze({
  origin: CITY_ORIGIN,
  district: Object.freeze({
    id: 'town-center-district',
    dimensions: Object.freeze({ width: 100, depth: 100, height: 20 }),
  }),
  streets: Object.freeze({
    nodeId: 'city-road-network',
    dimensions: Object.freeze({ width: 80, depth: 82, height: 0.6 }),
    roadWidth: 6.3,
    sidewalkWidth: 1.55,
    sidewalkOffset: 4.02,
    connectorPoints: Object.freeze([
      [-15, 8],
      [-11, 8],
      [-7, 6.7],
      [-3, 2.5],
      [0, -3],
    ] as const),
    roadSegments: Object.freeze([
      { id: 'main-street', from: [0, -38] as const, to: [0, 35] as const },
      { id: 'civic-lane', from: [0, 12] as const, to: [20, 12] as const },
    ]),
    /** Authored access anchors in the town-center district's local frame. */
    anchors: Object.freeze([
      { id: 'chapter-two-join', position: [-15, 0, 8] as const },
      { id: 'shop-bakery-walk', position: [8.58, 0, -5] as const },
      { id: 'shop-bookshop-walk', position: [8.58, 0, 6] as const },
      { id: 'shop-market-walk', position: [8.58, 0, 17] as const },
      { id: 'library-walk', position: [-5.4, 0, -5] as const },
      { id: 'plaza-walk', position: [20, 0, 12] as const },
    ]),
  }),
  shopOffsets: Object.freeze([-11, 0, 11] as const),
  transitionGardens: Object.freeze([
    { position: [-8, 0, 11] as const, kind: 'flowering' as const, seed: 2711 },
    { position: [-8, 0, -5] as const, kind: 'evergreen' as const, seed: 2719 },
  ]),
  projects: Object.freeze([
    {
      id: 'city-main-street',
      nodeId: 'city-main-street',
      role: 'lot',
      position: [12, 0, 6],
      rotation: -Math.PI / 2,
      width: 38,
      depth: 14,
      height: 9,
      pedestrianCapacity: 24,
    },
    {
      id: 'city-library',
      nodeId: 'city-library',
      role: 'lot',
      position: [-10.2, 0, -5],
      rotation: Math.PI / 2,
      width: 16,
      depth: 18,
      height: 9,
      pedestrianCapacity: 28,
    },
    {
      id: 'city-plaza',
      nodeId: 'city-plaza',
      role: 'public-space',
      position: [31, 0, 12],
      rotation: 0,
      width: 22,
      depth: 18,
      height: 8,
      pedestrianCapacity: 45,
    },
    {
      id: 'city-greenway',
      nodeId: 'city-greenway',
      role: 'public-space',
      position: [31, 0, 31],
      rotation: 0,
      width: 20,
      depth: 18,
      height: 7,
      pedestrianCapacity: 32,
    },
  ] satisfies readonly CityProjectSite[]),
  pedestrianPaths: Object.freeze([
    { id: 'shop-bakery-approach', from: [4.8, -5], to: [8.58, -5], width: 1.5 },
    { id: 'shop-bookshop-approach', from: [4.8, 6], to: [8.58, 6], width: 1.5 },
    { id: 'shop-market-approach', from: [4.8, 17], to: [8.58, 17], width: 1.5 },
    { id: 'library-approach', from: [-4.02, -5], to: [-5.4, -5], width: 1.55 },
    { id: 'greenway-approach', from: [31, 21], to: [31, 22], width: 1.8 },
  ] satisfies readonly CityPathSegment[]),
});

export interface CityMonorailStation {
  id: 'neighborhood-station' | 'town-station';
  name: string;
  position: readonly [number, number, number];
  width: number;
  depth: number;
  pedestrianCapacity: number;
  entry: readonly [number, number, number];
  trackAnchor: readonly [number, number, number];
}

const monorailPoints = [
  [-76, 8],
  [-72, 28],
  [-56, 41],
  [-30, 46],
  [0, 46],
  [30, 46],
  [58, 46],
  [84, 43],
  [84, 20],
  [84, -8],
  [78, -28],
  [55, -40],
  [28, -45],
  [-8, -45],
  [-42, -38],
  [-68, -18],
] as const;

const route = new T.CatmullRomCurve3(
  monorailPoints.map(([x, z]) => new T.Vector3(x, 14, z)),
  true,
  'centripetal',
  0.5,
);
const routeLength = route.getLength();
const supportCount = Math.ceil(routeLength / 10);
const measuredSupportSpacing = routeLength / supportCount;

/** The loop frames the existing homes and civic core, with room for later outward growth. */
export const CITY_MONORAIL_PLAN = Object.freeze({
  origin: MONORAIL_ORIGIN,
  dimensions: Object.freeze({ width: 200, depth: 120, height: 18 }),
  points: monorailPoints,
  closed: true,
  trackY: 14,
  trackRadius: 0.45,
  minimumTrackY: 13.5,
  maximumStructureY: 9.2,
  minimumStructureClearance: 4,
  maximumSupportSpacing: 12,
  supportCount,
  measuredSupportSpacing,
  trainLapSeconds: 240,
  stations: Object.freeze([
    {
      id: 'neighborhood-station',
      name: 'Neighborhood Station',
      position: [-76, 0, 8],
      width: 20,
      depth: 18,
      pedestrianCapacity: 16,
      entry: [10, 0, -2],
      trackAnchor: [-76, 14, 8],
    },
    {
      id: 'town-station',
      name: 'Town Center Station',
      position: [84, 0, 43],
      width: 22,
      depth: 20,
      pedestrianCapacity: 20,
      entry: [-9, 0, -8],
      trackAnchor: [84, 14, 43],
    },
  ] satisfies readonly CityMonorailStation[]),
});

export interface MonorailPose {
  position: T.Vector3;
  tangent: T.Vector3;
}

export function monorailPointAt(progress: number): T.Vector3 {
  const normalized = ((progress % 1) + 1) % 1;
  return route.getPointAt(normalized);
}

export function monorailPoseAt(progress: number): MonorailPose {
  const normalized = ((progress % 1) + 1) % 1;
  return {
    position: route.getPointAt(normalized),
    tangent: route.getTangentAt(normalized).normalize(),
  };
}

export function monorailSupportPoint(index: number): T.Vector3 {
  if (!Number.isInteger(index) || index < 0 || index >= supportCount)
    throw new Error('Choose a monorail support index from the authored route.');
  return route.getPointAt(index / supportCount);
}

function localTransform(position: readonly [number, number, number], rotation = 0): PlotTransform {
  return { position, rotation: [0, rotation, 0] };
}

const SUPPORT_PLOT_CLEARANCE = 0.8;
const SUPPORT_ROAD_CLEARANCE = 4.2;
const SUPPORT_PATH_CLEARANCE = 1.5;

function insidePlanRect(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  rotation: number,
  clearance: number,
): boolean {
  const dx = x - centerX;
  const dz = z - centerZ;
  const localX = dx * Math.cos(rotation) - dz * Math.sin(rotation);
  const localZ = dx * Math.sin(rotation) + dz * Math.cos(rotation);
  return Math.abs(localX) <= width / 2 + clearance && Math.abs(localZ) <= depth / 2 + clearance;
}

function pointToSegmentDistance(
  x: number,
  z: number,
  start: readonly [number, number],
  end: readonly [number, number],
): number {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const lengthSquared = dx * dx + dz * dz;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - start[0]) * dx + (z - start[1]) * dz) / lengthSquared));
  return Math.hypot(x - start[0] - t * dx, z - start[1] - t * dz);
}

function supportPlacementIssues(): string[] {
  const issues: string[] = [];
  const stationBounds = CITY_MONORAIL_PLAN.stations.map((station) => ({
    centerX: CITY_MONORAIL_PLAN.origin[0] + station.position[0],
    centerZ: CITY_MONORAIL_PLAN.origin[2] + station.position[2],
    width: station.width,
    depth: station.depth,
  }));
  const citySites = CITY_SITE_PLAN.projects.map((site) => ({
    centerX: CITY_SITE_PLAN.origin[0] + site.position[0],
    centerZ: CITY_SITE_PLAN.origin[2] + site.position[2],
    width: site.width,
    depth: site.depth,
    rotation: site.rotation,
  }));
  const cityRoadSegments = [
    ...CITY_SITE_PLAN.streets.roadSegments.map((segment) => ({
      start: [
        CITY_SITE_PLAN.origin[0] + segment.from[0],
        CITY_SITE_PLAN.origin[2] + segment.from[1],
      ] as const,
      end: [
        CITY_SITE_PLAN.origin[0] + segment.to[0],
        CITY_SITE_PLAN.origin[2] + segment.to[1],
      ] as const,
    })),
    ...CITY_SITE_PLAN.streets.connectorPoints.slice(0, -1).map((point, index) => ({
      start: [CITY_SITE_PLAN.origin[0] + point[0], CITY_SITE_PLAN.origin[2] + point[1]] as const,
      end: [
        CITY_SITE_PLAN.origin[0] + CITY_SITE_PLAN.streets.connectorPoints[index + 1][0],
        CITY_SITE_PLAN.origin[2] + CITY_SITE_PLAN.streets.connectorPoints[index + 1][1],
      ] as const,
    })),
  ];
  const pedestrianPaths = [
    ...CITY_SITE_PLAN.pedestrianPaths.map((path) => ({
      start: [
        CITY_SITE_PLAN.origin[0] + path.from[0],
        CITY_SITE_PLAN.origin[2] + path.from[1],
      ] as const,
      end: [CITY_SITE_PLAN.origin[0] + path.to[0], CITY_SITE_PLAN.origin[2] + path.to[1]] as const,
    })),
    {
      start: [
        CHAPTER_TWO_SITE_PLAN.paths.parkApproach.x,
        CHAPTER_TWO_SITE_PLAN.paths.parkApproach.startZ,
      ] as const,
      end: [
        CHAPTER_TWO_SITE_PLAN.paths.parkApproach.x,
        CHAPTER_TWO_SITE_PLAN.paths.parkApproach.endZ,
      ] as const,
    },
    {
      start: [
        CHAPTER_TWO_SITE_PLAN.paths.promenade.startX,
        CHAPTER_TWO_SITE_PLAN.paths.promenade.z,
      ] as const,
      end: [
        CHAPTER_TWO_SITE_PLAN.paths.promenade.endX,
        CHAPTER_TWO_SITE_PLAN.paths.promenade.z,
      ] as const,
    },
  ];

  for (let index = 0; index < CITY_MONORAIL_PLAN.supportCount; index++) {
    const support = monorailSupportPoint(index);
    const x = CITY_MONORAIL_PLAN.origin[0] + support.x;
    const z = CITY_MONORAIL_PLAN.origin[2] + support.z;
    if (
      stationBounds.some((station) =>
        insidePlanRect(x, z, station.centerX, station.centerZ, station.width, station.depth, 0, 0),
      )
    )
      continue;

    const intersectsChapterTwoRoad =
      x >= -20 && x <= 62 && Math.abs(z - chapterTwoRoadFrameAtX(x).z) < SUPPORT_ROAD_CLEARANCE;
    const intersectsChapterTwoLot = CHAPTER_TWO_SITE_PLAN.lots.some((lot) =>
      insidePlanRect(
        x,
        z,
        lot.x,
        lot.z,
        lot.width,
        lot.depth,
        lot.rotation,
        SUPPORT_PLOT_CLEARANCE,
      ),
    );
    const intersectsChapterTwoPublicSpace = CHAPTER_TWO_SITE_PLAN.publicSites.some((site) =>
      insidePlanRect(x, z, site.x, site.z, site.width, site.depth, 0, SUPPORT_PLOT_CLEARANCE),
    );
    const intersectsHome =
      x >= CHAPTER_ONE_PROPERTY_BOUNDS.minX - SUPPORT_PLOT_CLEARANCE &&
      x <= CHAPTER_ONE_PROPERTY_BOUNDS.maxX + SUPPORT_PLOT_CLEARANCE &&
      z >= CHAPTER_ONE_PROPERTY_BOUNDS.minZ - SUPPORT_PLOT_CLEARANCE &&
      z <= CHAPTER_ONE_PROPERTY_BOUNDS.maxZ + SUPPORT_PLOT_CLEARANCE;
    const intersectsCityRoad = cityRoadSegments.some(
      ({ start, end }) => pointToSegmentDistance(x, z, start, end) < SUPPORT_ROAD_CLEARANCE,
    );
    const intersectsCitySite = citySites.some((site) =>
      insidePlanRect(
        x,
        z,
        site.centerX,
        site.centerZ,
        site.width,
        site.depth,
        site.rotation,
        SUPPORT_PLOT_CLEARANCE,
      ),
    );
    const intersectsPedestrianPath = pedestrianPaths.some(
      ({ start, end }) => pointToSegmentDistance(x, z, start, end) < SUPPORT_PATH_CLEARANCE,
    );
    const reasons = [
      intersectsChapterTwoRoad && 'Chapter 2 road',
      intersectsChapterTwoLot && 'Chapter 2 lot',
      intersectsChapterTwoPublicSpace && 'Chapter 2 public space',
      intersectsHome && 'original home lot',
      intersectsCityRoad && 'Town Center road',
      intersectsCitySite && 'Town Center plot',
      intersectsPedestrianPath && 'pedestrian path',
    ].filter(Boolean);
    if (reasons.length)
      issues.push(
        `Monorail support ${index} at (${x.toFixed(1)}, ${z.toFixed(1)}) enters ${reasons.join(', ')}.`,
      );
  }
  return issues;
}

function access(
  nodeA: string,
  anchorA: string,
  nodeB: string,
  anchorB: string,
  maxDistance = 0.25,
): PlotConnection {
  return {
    kind: 'access',
    from: { nodeId: nodeA, refId: anchorA, kind: 'anchor' },
    to: { nodeId: nodeB, refId: anchorB, kind: 'anchor' },
    maxDistance,
  };
}

function chapterTwoBase(): PlotDefinition {
  return {
    nodes: [
      {
        id: CHAPTER_TWO_SITE_PLAN.district.id,
        role: 'district',
        dimensions: CHAPTER_TWO_SITE_PLAN.district.dimensions,
        localTransform: { position: CHAPTER_TWO_SITE_PLAN.district.position },
        occupancy: 'none',
      },
      {
        id: 'ch2-road',
        role: 'public-space',
        parentId: CHAPTER_TWO_SITE_PLAN.district.id,
        dimensions: { width: 82, depth: 6.3, height: 0.4 },
        localTransform: { position: [0, 0, 0] },
        occupancy: 'shared',
        anchors: [{ id: 'city-connector', type: 'access', position: [37, 0, 6.5] }],
      },
      {
        id: 'ch2-sidewalk-north',
        role: 'public-space',
        parentId: CHAPTER_TWO_SITE_PLAN.district.id,
        dimensions: { width: 82, depth: 1.48, height: 0.25 },
        localTransform: { position: [0, 0, 0] },
        occupancy: 'shared',
        anchors: [
          { id: 'monorail-neighborhood-access', type: 'access', position: [-43, 0, 10.52] },
        ],
      },
    ],
    connections: [],
  };
}

function cityProjectNodes(): PlotNode[] {
  const nodes: PlotNode[] = [
    {
      id: CITY_SITE_PLAN.district.id,
      role: 'district',
      dimensions: CITY_SITE_PLAN.district.dimensions,
      localTransform: { position: CITY_SITE_PLAN.origin },
      occupancy: 'none',
    },
    {
      id: CITY_SITE_PLAN.streets.nodeId,
      role: 'public-space',
      parentId: CITY_SITE_PLAN.district.id,
      dimensions: CITY_SITE_PLAN.streets.dimensions,
      localTransform: { position: [0, 0, 0] },
      occupancy: 'shared',
      anchors: CITY_SITE_PLAN.streets.anchors.map((anchor) => ({
        ...anchor,
        type: 'access' as const,
      })),
    },
    {
      id: 'city-public-paths',
      role: 'public-space',
      parentId: CITY_SITE_PLAN.district.id,
      dimensions: { width: 88, depth: 90, height: 0.2 },
      localTransform: { position: [0, 0, 0] },
      occupancy: 'shared',
      anchors: [],
    },
  ];

  for (const site of CITY_SITE_PLAN.projects) {
    const project: PlotNode = {
      id: site.nodeId,
      role: site.role,
      parentId: CITY_SITE_PLAN.district.id,
      dimensions: { width: site.width, depth: site.depth, height: site.height },
      localTransform: localTransform(site.position, site.rotation),
      occupancy: site.role === 'lot' ? 'exclusive' : 'shared',
      footprint: site.role === 'lot' ? { width: site.width, depth: site.depth } : undefined,
      pedestrianCapacity: site.pedestrianCapacity,
      assembly: {
        recipeRef: `${site.id}:production`,
        pieces: cityAssemblyPieces(site.id),
        requiredPieceIds: cityAssemblyPieces(site.id).map((piece) => piece.id),
      },
    };
    if (site.id === 'city-plaza') {
      project.anchors = [
        { id: 'west-entry', type: 'access', position: [-11, 0, 0], requiresConnection: true },
        { id: 'north-entry', type: 'access', position: [0, 0, 9], requiresConnection: true },
      ];
    }
    if (site.id === 'city-greenway') {
      project.anchors = [
        { id: 'south-entry', type: 'access', position: [0, 0, -9], requiresConnection: true },
        { id: 'station-approach', type: 'access', position: [10, 0, 8], requiresConnection: true },
      ];
    }
    nodes.push(project);

    if (site.id === 'city-main-street') {
      for (const [index, offset] of CITY_SITE_PLAN.shopOffsets.entries()) {
        nodes.push({
          id: `city-shop-${index + 1}`,
          role: 'structure',
          parentId: site.id,
          dimensions: { width: 10, depth: 12, height: 8 },
          localTransform: { position: [offset, 0, 0] },
          occupancy: 'exclusive',
          footprint: { width: 10, depth: 12 },
          pedestrianCapacity: 8,
          anchors: [
            { id: 'front-entry', type: 'access', position: [0, 0, 3.42], requiresConnection: true },
          ],
        });
      }
    } else if (site.id === 'city-library') {
      nodes.push({
        id: 'city-library-building',
        role: 'structure',
        parentId: site.id,
        dimensions: { width: 10, depth: 10, height: 8.5 },
        localTransform: { position: [0, 0, 0] },
        occupancy: 'exclusive',
        footprint: { width: 10, depth: 10 },
        pedestrianCapacity: site.pedestrianCapacity,
        anchors: [
          { id: 'front-entry', type: 'access', position: [0, 0, 4.8], requiresConnection: true },
        ],
      });
    }
  }
  return nodes;
}

function cityAssemblyPieces(projectId: CityProjectId): { id: string; order: number }[] {
  const pieces: Record<CityProjectId, string[]> = {
    'city-main-street': ['shop-bakery', 'shop-bookshop', 'shop-market', 'frontage-gardens'],
    'city-library': ['library-foundation', 'library-walls', 'library-roof', 'library-garden'],
    'city-plaza': ['square-paving', 'square-feature', 'square-planting', 'square-seating'],
    'city-greenway': ['greenway-path', 'greenway-groves', 'greenway-garden-beds'],
  };
  return pieces[projectId].map((id, order) => ({ id, order }));
}

function monorailNodes(): PlotNode[] {
  const routeNode: PlotNode = {
    id: 'monorail-guideway',
    role: 'component',
    parentId: 'monorail',
    dimensions: { ...CITY_MONORAIL_PLAN.dimensions, height: 15 },
    localTransform: { position: [0, 0, 0] },
    occupancy: 'shared',
    anchors: CITY_MONORAIL_PLAN.stations.map((station, index) => ({
      id: `${station.id}-track`,
      type: 'access',
      position: station.trackAnchor,
    })),
  };
  const stations = CITY_MONORAIL_PLAN.stations.map((station) => ({
    id: station.id,
    role: 'lot' as const,
    parentId: 'monorail',
    dimensions: { width: station.width, depth: station.depth, height: 16 },
    localTransform: { position: station.position },
    occupancy: 'exclusive' as const,
    footprint: { width: station.width, depth: station.depth },
    pedestrianCapacity: station.pedestrianCapacity,
    anchors: [
      {
        id: 'ground-entry',
        type: 'access' as const,
        position: station.entry,
        requiresConnection: true,
      },
      {
        id: 'platform-track',
        type: 'access' as const,
        position: [0, 13.5, 0] as const,
        requiresConnection: true,
      },
    ],
  }));
  const approach = (station: CityMonorailStation) => {
    const [sx, sy, sz] = station.position;
    const [ex, ey, ez] = station.entry;
    return [sx + ex, sy + ey, sz + ez] as const;
  };
  const stationOneEntry = approach(CITY_MONORAIL_PLAN.stations[0]);
  const stationTwoEntry = approach(CITY_MONORAIL_PLAN.stations[1]);
  return [
    {
      id: 'monorail-district',
      role: 'district',
      dimensions: CITY_MONORAIL_PLAN.dimensions,
      localTransform: { position: CITY_MONORAIL_PLAN.origin },
      occupancy: 'none',
    },
    {
      id: 'monorail',
      role: 'zone',
      parentId: 'monorail-district',
      dimensions: CITY_MONORAIL_PLAN.dimensions,
      localTransform: { position: [0, 0, 0] },
      occupancy: 'none',
      assembly: {
        recipeRef: 'monorail:production',
        pieces: ['supports', 'guideway', 'stations', 'train'].map((id, order) => ({ id, order })),
        requiredPieceIds: ['supports', 'guideway', 'stations', 'train'],
      },
    },
    routeNode,
    ...stations,
    {
      id: 'monorail-ground-links',
      role: 'public-space',
      parentId: 'monorail',
      dimensions: { ...CITY_MONORAIL_PLAN.dimensions, height: 0.2 },
      localTransform: { position: [0, 0, 0] },
      occupancy: 'shared',
      anchors: [
        {
          id: 'neighborhood-entry',
          type: 'access',
          position: stationOneEntry,
          requiresConnection: true,
        },
        {
          id: 'neighborhood-sidewalk',
          type: 'access',
          position: [-64, 0, 10.02],
          requiresConnection: true,
        },
        { id: 'town-entry', type: 'access', position: stationTwoEntry, requiresConnection: true },
        { id: 'greenway-entry', type: 'access', position: [72, 0, 37], requiresConnection: true },
      ],
    },
  ];
}

/** Adds the authored Town Center and monorail plots to the existing Chapter 2 definition. */
export function cityPlotDefinition(base?: PlotDefinition): PlotDefinition {
  const source = base ?? chapterTwoBase();
  const nodes = source.nodes.map((node) => {
    if (node.id === 'ch2-road') {
      const anchors = [...(node.anchors ?? [])];
      if (!anchors.some((anchor) => anchor.id === 'city-connector')) {
        anchors.push({ id: 'city-connector', type: 'access', position: [37, 0, 6.5] });
      }
      return { ...node, anchors };
    }
    if (node.id === 'ch2-sidewalk-north') {
      const anchors = [...(node.anchors ?? [])];
      if (!anchors.some((anchor) => anchor.id === 'monorail-neighborhood-access')) {
        anchors.push({
          id: 'monorail-neighborhood-access',
          type: 'access',
          position: [-43, 0, 10.52],
        });
      }
      return { ...node, anchors };
    }
    return node;
  });
  const townNodes = cityProjectNodes();
  const railNodes = monorailNodes();
  const projectConnections: PlotConnection[] = [
    access('ch2-road', 'city-connector', CITY_SITE_PLAN.streets.nodeId, 'chapter-two-join', 0.25),
    access('city-shop-1', 'front-entry', CITY_SITE_PLAN.streets.nodeId, 'shop-bakery-walk', 0.25),
    access('city-shop-2', 'front-entry', CITY_SITE_PLAN.streets.nodeId, 'shop-bookshop-walk', 0.25),
    access('city-shop-3', 'front-entry', CITY_SITE_PLAN.streets.nodeId, 'shop-market-walk', 0.25),
    access(
      'city-library-building',
      'front-entry',
      CITY_SITE_PLAN.streets.nodeId,
      'library-walk',
      0.85,
    ),
    access('city-plaza', 'west-entry', CITY_SITE_PLAN.streets.nodeId, 'plaza-walk', 0.25),
    access('city-plaza', 'north-entry', 'city-greenway', 'south-entry', 1.1),
    access(
      'neighborhood-station',
      'ground-entry',
      'monorail-ground-links',
      'neighborhood-entry',
      0.1,
    ),
    access(
      'monorail-ground-links',
      'neighborhood-sidewalk',
      'ch2-sidewalk-north',
      'monorail-neighborhood-access',
      0.1,
    ),
    access('town-station', 'ground-entry', 'monorail-ground-links', 'town-entry', 0.1),
    access('monorail-ground-links', 'greenway-entry', 'city-greenway', 'station-approach', 6),
    access(
      'neighborhood-station',
      'platform-track',
      'monorail-guideway',
      'neighborhood-station-track',
      0.6,
    ),
    access('town-station', 'platform-track', 'monorail-guideway', 'town-station-track', 0.6),
  ];
  const allNodes = [...nodes, ...townNodes, ...railNodes];
  return { nodes: allNodes, connections: [...(source.connections ?? []), ...projectConnections] };
}

/** Structural clearance checks for authored rail height, station alignment and support intervals. */
export function validateCityClearances(): string[] {
  const issues = supportPlacementIssues();
  if (
    CITY_MONORAIL_PLAN.minimumTrackY - CITY_MONORAIL_PLAN.maximumStructureY <
    CITY_MONORAIL_PLAN.minimumStructureClearance
  )
    issues.push('The guideway does not maintain the authored clearance above structures.');
  if (CITY_MONORAIL_PLAN.measuredSupportSpacing > CITY_MONORAIL_PLAN.maximumSupportSpacing)
    issues.push('A monorail guideway span exceeds the maximum support spacing.');
  if (Math.abs(route.getPointAt(0).distanceTo(route.getPointAt(1))) > 0.01)
    issues.push('The elevated monorail route is not closed.');
  for (const station of CITY_MONORAIL_PLAN.stations) {
    const platform = new T.Vector3(...station.trackAnchor);
    let closest = Number.POSITIVE_INFINITY;
    for (let index = 0; index <= 500; index++) {
      closest = Math.min(closest, route.getPointAt(index / 500).distanceTo(platform));
    }
    if (closest > 9) issues.push(`${station.id} is too far from the monorail guideway.`);
  }
  return issues;
}
