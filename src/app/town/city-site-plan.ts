import * as T from 'three';
import type { PlotConnection, PlotDefinition, PlotNode, PlotTransform } from './plot-framework';
import { CHAPTER_TWO_SITE_PLAN } from './chapter-two-site-plan';

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

const CITY_ORIGIN = [90, 0, -3] as const;
const MONORAIL_ORIGIN = [56, 0, 0] as const;

/** Chapter 3 is a compact continuation east of the existing residential street. */
export const CITY_SITE_PLAN = Object.freeze({
  origin: CITY_ORIGIN,
  district: Object.freeze({
    id: 'town-center-district',
    dimensions: Object.freeze({ width: 130, depth: 130, height: 20 }),
  }),
  streets: Object.freeze({
    nodeId: 'city-road-network',
    dimensions: Object.freeze({ width: 100, depth: 92, height: 0.6 }),
    roadWidth: 6.3,
    sidewalkWidth: 1.55,
    sidewalkOffset: 4.02,
    connectorPoints: Object.freeze([
      [-29, 8],
      [-20, 8],
      [-11, 7.2],
      [-5, 3.8],
      [0, -3],
    ] as const),
    /** Authored access anchors in the town-center district's local frame. */
    anchors: Object.freeze([
      { id: 'chapter-two-join', position: [-29, 0, 8] as const },
      { id: 'shop-bakery-walk', position: [5.4, 0, -8] as const },
      { id: 'shop-bookshop-walk', position: [5.4, 0, 6] as const },
      { id: 'shop-market-walk', position: [5.4, 0, 20] as const },
      { id: 'library-walk', position: [-4.8, 0, 22] as const },
      { id: 'plaza-walk', position: [5.2, 0, -7] as const },
      { id: 'greenway-walk', position: [5.2, 0, -24] as const },
    ]),
  }),
  projects: Object.freeze([
    {
      id: 'city-main-street',
      nodeId: 'city-main-street',
      role: 'lot',
      position: [12, 0, 6],
      rotation: -Math.PI / 2,
      width: 44,
      depth: 14,
      height: 9,
      pedestrianCapacity: 24,
    },
    {
      id: 'city-library',
      nodeId: 'city-library',
      role: 'lot',
      position: [-20, 0, 22],
      rotation: Math.PI / 2,
      width: 18,
      depth: 18,
      height: 9,
      pedestrianCapacity: 28,
    },
    {
      id: 'city-plaza',
      nodeId: 'city-plaza',
      role: 'public-space',
      position: [39, 0, -7],
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
      position: [27, 0, -24],
      rotation: 0,
      width: 20,
      depth: 18,
      height: 7,
      pedestrianCapacity: 32,
    },
  ] satisfies readonly CityProjectSite[]),
  pedestrianPaths: Object.freeze([
    { id: 'shop-bakery-approach', from: [5.4, -8], to: [6.2, -8], width: 1.25 },
    { id: 'shop-bookshop-approach', from: [5.4, 6], to: [6.2, 6], width: 1.25 },
    { id: 'shop-market-approach', from: [5.4, 20], to: [6.2, 20], width: 1.25 },
    { id: 'library-approach', from: [-4.8, 22], to: [-15.2, 22], width: 1.55 },
    { id: 'plaza-approach', from: [5.2, -7], to: [28, -7], width: 1.8 },
    { id: 'greenway-approach', from: [5.2, -24], to: [17, -24], width: 1.55 },
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
  [-98, 10],
  [-94, 36],
  [-74, 55],
  [-31, 61],
  [22, 60],
  [65, 54],
  [93, 35],
  [102, 0],
  [98, -35],
  [79, -56],
  [40, -61],
  [-11, -58],
  [-56, -44],
  [-87, -21],
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

/** The signature Chapter 4 loop is one elevated single-beam route around the complete town. */
export const CITY_MONORAIL_PLAN = Object.freeze({
  origin: MONORAIL_ORIGIN,
  dimensions: Object.freeze({ width: 220, depth: 150, height: 18 }),
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
      position: [-96, 0, 12],
      width: 20,
      depth: 18,
      pedestrianCapacity: 16,
      entry: [10, 0, -2],
      trackAnchor: [-96, 14, 12],
    },
    {
      id: 'town-station',
      name: 'Town Center Station',
      position: [82, 0, -49],
      width: 22,
      depth: 20,
      pedestrianCapacity: 20,
      entry: [-9, 0, 8],
      trackAnchor: [82, 14, -49],
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

function access(nodeA: string, anchorA: string, nodeB: string, anchorB: string, maxDistance = 0.25): PlotConnection {
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
        anchors: [{ id: 'monorail-neighborhood-access', type: 'access', position: [-43, 0, 10.52] }],
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
      dimensions: { width: 110, depth: 115, height: 0.2 },
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
      project.anchors = [{ id: 'west-entry', type: 'access', position: [-11, 0, 0], requiresConnection: true }];
    }
    if (site.id === 'city-greenway') {
      project.anchors = [
        { id: 'west-entry', type: 'access', position: [-10, 0, 0], requiresConnection: true },
        { id: 'station-approach', type: 'access', position: [10, 0, -9], requiresConnection: true },
      ];
    }
    nodes.push(project);

    if (site.id === 'city-main-street') {
      for (const [index, offset] of [-14, 0, 14].entries()) {
        nodes.push({
          id: `city-shop-${index + 1}`,
          role: 'structure',
          parentId: site.id,
          dimensions: { width: 10, depth: 12, height: 8 },
          localTransform: { position: [offset, 0, 0] },
          occupancy: 'exclusive',
          footprint: { width: 10, depth: 12 },
          pedestrianCapacity: 8,
          anchors: [{ id: 'front-entry', type: 'access', position: [0, 0, 5.8], requiresConnection: true }],
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
        anchors: [{ id: 'front-entry', type: 'access', position: [0, 0, 4.8], requiresConnection: true }],
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
      { id: 'ground-entry', type: 'access' as const, position: station.entry, requiresConnection: true },
      { id: 'platform-track', type: 'access' as const, position: [0, 13.5, 0] as const, requiresConnection: true },
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
        { id: 'neighborhood-entry', type: 'access', position: stationOneEntry, requiresConnection: true },
        { id: 'neighborhood-sidewalk', type: 'access', position: [-75, 0, 9.02], requiresConnection: true },
        { id: 'town-entry', type: 'access', position: stationTwoEntry, requiresConnection: true },
        { id: 'greenway-entry', type: 'access', position: [71, 0, -36], requiresConnection: true },
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
    access('city-shop-1', 'front-entry', CITY_SITE_PLAN.streets.nodeId, 'shop-bakery-walk', 0.85),
    access('city-shop-2', 'front-entry', CITY_SITE_PLAN.streets.nodeId, 'shop-bookshop-walk', 0.85),
    access('city-shop-3', 'front-entry', CITY_SITE_PLAN.streets.nodeId, 'shop-market-walk', 0.85),
    access('city-library-building', 'front-entry', CITY_SITE_PLAN.streets.nodeId, 'library-walk', 10.5),
    access('city-plaza', 'west-entry', CITY_SITE_PLAN.streets.nodeId, 'plaza-walk', 23),
    access('city-greenway', 'west-entry', CITY_SITE_PLAN.streets.nodeId, 'greenway-walk', 12),
    access('neighborhood-station', 'ground-entry', 'monorail-ground-links', 'neighborhood-entry', 0.1),
    access('monorail-ground-links', 'neighborhood-sidewalk', 'ch2-sidewalk-north', 'monorail-neighborhood-access', 0.1),
    access('town-station', 'ground-entry', 'monorail-ground-links', 'town-entry', 0.1),
    access('monorail-ground-links', 'greenway-entry', 'city-greenway', 'station-approach', 6),
    access('neighborhood-station', 'platform-track', 'monorail-guideway', 'neighborhood-station-track', 0.6),
    access('town-station', 'platform-track', 'monorail-guideway', 'town-station-track', 0.6),
  ];
  const allNodes = [...nodes, ...townNodes, ...railNodes];
  return { nodes: allNodes, connections: [...(source.connections ?? []), ...projectConnections] };
}

/** Structural clearance checks for authored rail height, station alignment and support intervals. */
export function validateCityClearances(): string[] {
  const issues: string[] = [];
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
