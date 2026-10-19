import * as T from 'three';
import { resolvePlotPoint } from './plot-framework';
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

const CITY_ORIGIN = [61, 0, 5.2] as const;
const MONORAIL_ORIGIN = [52, 0, 0] as const;
const shopOffsets = [-10.2, 0, 10.2] as const;

/** Commercial frontage continues the established residential tangent, ending at the civic square. */
export const CITY_SITE_PLAN = Object.freeze({
  origin: CITY_ORIGIN,
  terrain: { width: 158, depth: 84, center: [50, -1] as const },
  district: { id: 'town-center-district', dimensions: { width: 136, depth: 100, height: 20 } },
  streets: {
    nodeId: 'city-road-network',
    dimensions: { width: 132, depth: 90, height: 0.6 },
    roadWidth: 6.3,
    sidewalkWidth: 1.55,
    sidewalkOffset: 4.02,
    roadSegments: [{ id: 'main-street', from: [0, 0] as const, to: [39, 0] as const }],
    crossings: [4, 38],
    lampStations: [4, 14, 25, 36],
    anchors: [
      { id: 'chapter-two-join', position: [0, 0, 0] as const },
      ...shopOffsets.map((offset, index) => ({
        id: ['shop-bakery-walk', 'shop-bookshop-walk', 'shop-market-walk'][index],
        position: [22 + offset, 0, -4.78] as const,
      })),
      { id: 'library-walk', position: [24, 0, 5] as const },
      { id: 'plaza-walk', position: [40, 0, 0] as const },
    ],
  },
  shopOffsets,
  transitionGardens: [{ position: [3, 0, -10] as const, kind: 'flowering' as const, seed: 2711 }],
  projects: [
    {
      id: 'city-main-street',
      nodeId: 'city-main-street',
      role: 'lot',
      position: [22, 0, -8.2],
      rotation: 0,
      width: 34,
      depth: 12,
      height: 9,
      pedestrianCapacity: 24,
    },
    {
      id: 'city-library',
      nodeId: 'city-library',
      role: 'lot',
      position: [24, 0, 11.2],
      rotation: Math.PI,
      width: 18,
      depth: 20,
      height: 9,
      pedestrianCapacity: 28,
    },
    {
      id: 'city-plaza',
      nodeId: 'city-plaza',
      role: 'public-space',
      position: [51, 0, 0],
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
      position: [51, 0, -19],
      rotation: 0,
      width: 20,
      depth: 18,
      height: 7,
      pedestrianCapacity: 32,
    },
  ] satisfies readonly CityProjectSite[],
  /** Named land uses bound the commons; canopy locations follow their edges, not random scattering. */
  greenSpaces: [
    {
      id: 'heritage-common',
      name: 'Heritage commons',
      center: [22, -23] as const,
      width: 32,
      depth: 13,
    },
    {
      id: 'reading-green',
      name: 'Library reading green',
      center: [25, 26] as const,
      width: 34,
      depth: 12,
    },
    {
      id: 'arrival-green',
      name: 'Neighborhood threshold',
      center: [3, -12] as const,
      width: 8,
      depth: 13,
    },
  ],
  canopy: [
    [9, -28],
    [20, -28],
    [31, -28],
    [37, -18],
    [9, -18],
    [7, 21],
    [7, 30],
    [19, 31],
    [31, 31],
    [40, 26],
    [40, 17],
    [60, -24],
    [62, 19],
  ] as const,
  pedestrianPaths: [
    ...shopOffsets.map((offset, index) => ({
      id: ['shop-bakery', 'shop-bookshop', 'shop-market'][index] + '-approach',
      from: [22 + offset, -4.02] as const,
      to: [22 + offset, -4.78] as const,
      width: 1.55,
    })),
    { id: 'library-approach', from: [24, 4.02], to: [24, 5], width: 2.1 },
    { id: 'square-arrival', from: [38, 0], to: [40, 0], width: 3.0 },
    { id: 'greenway-approach', from: [51, -9], to: [51, -10], width: 2.4 },
    { id: 'heritage-west', from: [-11, -33.2], to: [-11, -26.2], width: 1.8 },
    { id: 'heritage-promenade', from: [-11, -26.2], to: [41, -26.2], width: 1.8 },
    { id: 'heritage-east', from: [41, -26.2], to: [41, -19], width: 1.8 },
    { id: 'reading-west', from: [12, 4.02], to: [12, 26], width: 1.8 },
    { id: 'reading-promenade', from: [12, 26], to: [51, 26], width: 1.8 },
    { id: 'reading-east', from: [51, 26], to: [51, 9], width: 1.8 },
  ] satisfies readonly CityPathSegment[],
});

export interface CityMonorailStation {
  id: 'neighborhood-station' | 'town-station';
  name: string;
  position: readonly [number, number, number];
  rotation: number;
  width: number;
  depth: number;
  pedestrianCapacity: number;
  entry: readonly [number, number, number];
  trackAnchor: readonly [number, number, number];
}
const stations: readonly CityMonorailStation[] = [
  {
    id: 'neighborhood-station',
    name: 'Neighborhood Station',
    position: [-3.5, 0, -39],
    rotation: Math.PI / 2,
    width: 16.4,
    depth: 22,
    pedestrianCapacity: 16,
    entry: [-3, 0, 9.65],
    trackAnchor: [-3.5, 14, -39],
  },
  {
    id: 'town-station',
    name: 'Town Center Station',
    position: [82, 0, 5.2],
    rotation: 0,
    width: 16.4,
    depth: 22,
    pedestrianCapacity: 20,
    entry: [-3, 0, 9.65],
    trackAnchor: [82, 14, 5.2],
  },
];
/** Coordinates are local to the monorail district. Used by renderer and graph without a second offset. */
const stationApproaches: readonly CityPathSegment[] = [
  { id: 'neighborhood-station-entry', from: [6.15, -36], to: [17, -36], width: 1.8 },
  { id: 'neighborhood-station-promenade', from: [17, -36], to: [17, -21], width: 1.8 },
  { id: 'landmark-east-entry', from: [17, -28], to: [14, -28], width: 1.8 },
  { id: 'town-station-square', from: [71, 5.2], to: [75, 5.2], width: 2.1 },
  { id: 'town-station-forecourt', from: [75, 5.2], to: [75, 14.85], width: 2.1 },
  { id: 'town-station-entry', from: [75, 14.85], to: [79, 14.85], width: 2.1 },
];
const monorailPoints = [
  [-77, 5.2],
  [-72, 20],
  [-42, 27],
  [-12, 31],
  [8, 32],
  [33, 41],
  [64, 36],
  [82, 26],
  [82, 5.2],
  [82, -16],
  [61, -33],
  [28, -39],
  [-3.5, -39],
  [-32, -39],
  [-62, -30],
] as const;
const route = new T.CatmullRomCurve3(
  monorailPoints.map(([x, z]) => new T.Vector3(x, 14, z)),
  true,
  'centripetal',
  0.5,
);
const routeLength = route.getLength();
// Station crossheads replace the free piers inside their footprints.
function nearestRouteProgress(target: T.Vector3): number {
  let closest = Infinity,
    progress = 0;
  for (let sample = 0; sample < 2400; sample++) {
    const distance = route.getPointAt(sample / 2400).distanceTo(target);
    if (distance < closest) {
      closest = distance;
      progress = sample / 2400;
    }
  }
  return progress;
}
function stationTrackProgresses(offset: number): number[] {
  return stations.flatMap((station) =>
    [-offset, offset].map((z) =>
      nearestRouteProgress(
        new T.Vector3(
          station.position[0] + z * Math.sin(station.rotation),
          14,
          station.position[2] + z * Math.cos(station.rotation),
        ),
      ),
    ),
  );
}
const boundaryProgresses = stationTrackProgresses(12.5);
const candidateCount = Math.ceil(routeLength / 9);
const supportProgresses = [
  ...Array.from({ length: candidateCount }, (_, index) => index / candidateCount).filter(
    (progress) => {
      const point = route.getPointAt(progress);
      const insideStation = stations.some((station) =>
        insidePlanRect(
          point.x,
          point.z,
          station.position[0],
          station.position[2],
          station.width,
          station.depth,
          station.rotation,
          0.5,
        ),
      );
      const nearBoundary = boundaryProgresses.some(
        (other) =>
          Math.min(Math.abs(other - progress), 1 - Math.abs(other - progress)) * routeLength < 3,
      );
      return !insideStation && !nearBoundary;
    },
  ),
  ...boundaryProgresses,
].sort((a, b) => a - b);
const stationHeadProgresses = stationTrackProgresses(5.5);
const allSupportProgresses = [...supportProgresses, ...stationHeadProgresses].sort((a, b) => a - b);
const supportCount = supportProgresses.length;
/** Maximum physical span, including station crossheads and the closing loop span. */
const measuredSupportSpacing = Math.max(
  ...allSupportProgresses.map(
    (progress, index) =>
      (allSupportProgresses[(index + 1) % allSupportProgresses.length] +
        (index === allSupportProgresses.length - 1 ? 1 : 0) -
        progress) *
      routeLength,
  ),
);
const SUPPORT_OUTSET = 3.1; // Outside the 1.37 m half-width of the suspended coach.

export const CITY_MONORAIL_PLAN = Object.freeze({
  origin: MONORAIL_ORIGIN,
  terrain: { width: 176, depth: 96, center: [55, -1] as const },
  dimensions: { width: 182, depth: 100, height: 18 },
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
  stations,
  approaches: stationApproaches,
});

/** Local entry transformed exactly once, shared by the plot graph and rendered forecourt. */
export function stationEntryPoint(station: CityMonorailStation): readonly [number, number, number] {
  const [x, y, z] = station.entry;
  const c = Math.cos(station.rotation),
    s = Math.sin(station.rotation);
  return [
    station.position[0] + x * c + z * s,
    station.position[1] + y,
    station.position[2] - x * s + z * c,
  ];
}

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

export function monorailTrackSupportPoint(index: number): T.Vector3 {
  if (!Number.isInteger(index) || index < 0 || index >= supportCount)
    throw new Error('Choose a monorail support index from the authored route.');
  return route.getPointAt(supportProgresses[index]);
}
export function monorailSupportPoint(index: number): T.Vector3 {
  const track = monorailTrackSupportPoint(index),
    tangent = route.getTangentAt(supportProgresses[index]);
  return track.add(new T.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(SUPPORT_OUTSET));
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
    rotation: station.rotation,
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
  ];
  const pedestrianPaths = [
    ...CITY_MONORAIL_PLAN.approaches.map((path) => ({
      start: [MONORAIL_ORIGIN[0] + path.from[0], MONORAIL_ORIGIN[2] + path.from[1]] as const,
      end: [MONORAIL_ORIGIN[0] + path.to[0], MONORAIL_ORIGIN[2] + path.to[1]] as const,
    })),
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
        insidePlanRect(
          x,
          z,
          station.centerX,
          station.centerZ,
          station.width,
          station.depth,
          station.rotation,
          0,
        ),
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
      dimensions: { width: 132, depth: 90, height: 0.2 },
      localTransform: { position: [0, 0, 0] },
      occupancy: 'shared',
      anchors: [
        { id: 'station-promenade', type: 'access', position: [8, 0, -26.2] },
        { id: 'greenway-west', type: 'access', position: [41, 0, -19] },
      ],
    },
  ];

  for (const green of CITY_SITE_PLAN.greenSpaces)
    nodes.push({
      id: green.id,
      role: 'public-space',
      parentId: CITY_SITE_PLAN.district.id,
      dimensions: { width: green.width, depth: green.depth, height: 5 },
      localTransform: { position: [green.center[0], 0, green.center[1]] },
      occupancy: 'shared',
    });
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
        { id: 'north-entry', type: 'access', position: [0, 0, -9], requiresConnection: true },
        { id: 'east-entry', type: 'access', position: [11, 0, 0], requiresConnection: true },
      ];
    }
    if (site.id === 'city-greenway') {
      project.anchors = [
        { id: 'south-entry', type: 'access', position: [0, 0, 9], requiresConnection: true },
        { id: 'station-approach', type: 'access', position: [-10, 0, 0], requiresConnection: true },
      ];
    }
    nodes.push(project);

    if (site.id === 'city-main-street') {
      for (const [index, offset] of CITY_SITE_PLAN.shopOffsets.entries()) {
        nodes.push({
          id: `city-shop-${index + 1}`,
          role: 'structure',
          parentId: site.id,
          dimensions: { width: 10, depth: 8, height: 8 },
          localTransform: { position: [offset, 0, 0] },
          occupancy: 'exclusive',
          footprint: { width: 10, depth: 8 },
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
        dimensions: { width: 13.2, depth: 14, height: 8.5 },
        localTransform: { position: [0, 0, 0] },
        occupancy: 'exclusive',
        footprint: { width: 13.2, depth: 14 },
        pedestrianCapacity: site.pedestrianCapacity,
        anchors: [
          { id: 'front-entry', type: 'access', position: [0, 0, 6.2], requiresConnection: true },
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
    localTransform: localTransform(station.position, station.rotation),
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
  const stationOneEntry = stationEntryPoint(CITY_MONORAIL_PLAN.stations[0]);
  const stationTwoEntry = stationEntryPoint(CITY_MONORAIL_PLAN.stations[1]);

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
          position: [17, 0, -21],
          requiresConnection: true,
        },
        { id: 'town-entry', type: 'access', position: stationTwoEntry, requiresConnection: true },
        { id: 'greenway-entry', type: 'access', position: [71, 0, 5.2], requiresConnection: true },
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
    access('city-greenway', 'station-approach', 'city-public-paths', 'greenway-west', 0.1),
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
      'city-public-paths',
      'station-promenade',
      0.1,
    ),
    access('town-station', 'ground-entry', 'monorail-ground-links', 'town-entry', 0.1),
    access('monorail-ground-links', 'greenway-entry', 'city-plaza', 'east-entry', 0.1),
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
  // Shared road occupancy must still clear the actual structural envelopes.
  const definition = cityPlotDefinition();
  for (const node of definition.nodes.filter(
    (node) => node.role === 'structure' && node.id.startsWith('city-'),
  )) {
    const center = resolvePlotPoint(definition, node.id, [0, 0, 0]);
    const parent = CITY_SITE_PLAN.projects.find((site) => site.id === node.parentId)!;
    for (const road of CITY_SITE_PLAN.streets.roadSegments) {
      const length = Math.hypot(road.to[0] - road.from[0], road.to[1] - road.from[1]);
      for (let sample = 0; sample <= Math.ceil(length * 2); sample++) {
        const t = sample / Math.ceil(length * 2);
        const x = CITY_ORIGIN[0] + road.from[0] + (road.to[0] - road.from[0]) * t;
        const z = CITY_ORIGIN[2] + road.from[1] + (road.to[1] - road.from[1]) * t;
        if (
          insidePlanRect(
            x,
            z,
            center.x,
            center.z,
            node.dimensions.width,
            node.dimensions.depth,
            parent.rotation,
            CITY_SITE_PLAN.streets.roadWidth / 2,
          )
        ) {
          issues.push(road.id + ' enters ' + node.id);
          break;
        }
      }
    }
  }
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
    let closestProgress = 0;
    for (let index = 0; index <= 500; index++) {
      const distance = route.getPointAt(index / 500).distanceTo(platform);
      if (distance < closest) {
        closest = distance;
        closestProgress = index / 500;
      }
    }
    const axis = new T.Vector3(Math.sin(station.rotation), 0, Math.cos(station.rotation));
    if (Math.abs(axis.dot(route.getTangentAt(closestProgress))) < 0.99)
      issues.push(station.id + ' platform is not aligned with the track tangent.');
    if (closest > 0.8) issues.push(`${station.id} is too far from the monorail guideway.`);
  }
  return issues;
}

/** Authored walking centerlines in world coordinates, including paved square interiors. */
export function cityPedestrianSegments(): CityPathSegment[] {
  const local: CityPathSegment[] = [
    ...CITY_SITE_PLAN.pedestrianPaths,
    ...[-1, 1].map((side) => ({
      id: 'sidewalk-' + side,
      from: [0, side * 4.02] as const,
      to: [39, side * 4.02] as const,
      width: 1.55,
    })),
    ...CITY_SITE_PLAN.streets.crossings.map((x) => ({
      id: 'crossing-' + x,
      from: [x, -4.02] as const,
      to: [x, 4.02] as const,
      width: 1.8,
    })),
    { id: 'square-interior', from: [40, 0], to: [62, 0], width: 3 },
    { id: 'square-north-south', from: [51, -9], to: [51, 9], width: 3 },
    { id: 'greenway-interior', from: [51, -28], to: [51, -10], width: 2.4 },
    { id: 'greenway-crosswalk', from: [41, -19], to: [61, -19], width: 2.4 },
  ];
  const world = (
    path: CityPathSegment,
    origin: readonly [number, number, number],
  ): CityPathSegment => ({
    ...path,
    from: [path.from[0] + origin[0], path.from[1] + origin[2]],
    to: [path.to[0] + origin[0], path.to[1] + origin[2]],
  });
  return [
    ...local.map((path) => world(path, CITY_ORIGIN)),
    ...CITY_MONORAIL_PLAN.approaches.map((path) => world(path, MONORAIL_ORIGIN)),
    { id: 'existing-park-promenade', from: [37, -28], to: [54, -28], width: 1.4 },
  ];
}

/** Checks real ground-entry reachability, rather than accepting a pair of matching floating anchors. */
export function validateCityPedestrianNetwork(
  paths: readonly CityPathSegment[] = cityPedestrianSegments(),
): string[] {
  const issues: string[] = [];
  const connected = new Set<number>();
  const root = paths.findIndex((path) => path.id === 'sidewalk--1');
  if (root < 0) return ['Missing residential sidewalk connection.'];
  connected.add(root);
  const touches = (a: CityPathSegment, b: CityPathSegment) => {
    const ax = a.to[0] - a.from[0],
      az = a.to[1] - a.from[1],
      bx = b.to[0] - b.from[0],
      bz = b.to[1] - b.from[1];
    const cross = ax * bz - az * bx;
    if (Math.abs(cross) > 1e-8) {
      const dx = b.from[0] - a.from[0],
        dz = b.from[1] - a.from[1];
      const t = (dx * bz - dz * bx) / cross,
        u = (dx * az - dz * ax) / cross;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
    }
    return (
      [a.from, a.to].some(
        (p) => pointToSegmentDistance(p[0], p[1], b.from, b.to) <= (a.width + b.width) / 2 + 0.05,
      ) ||
      [b.from, b.to].some(
        (p) => pointToSegmentDistance(p[0], p[1], a.from, a.to) <= (a.width + b.width) / 2 + 0.05,
      )
    );
  };
  let changed = true;
  while (changed) {
    changed = false;
    paths.forEach((path, index) => {
      if (!connected.has(index) && [...connected].some((other) => touches(path, paths[other]))) {
        connected.add(index);
        changed = true;
      }
    });
  }
  const definition = cityPlotDefinition();
  for (const node of definition.nodes.filter(
    (node) =>
      node.id.startsWith('city-') ||
      node.id === 'town-station' ||
      node.id === 'neighborhood-station',
  )) {
    for (const anchor of node.anchors ?? []) {
      if (!anchor.requiresConnection || anchor.position[1] !== 0) continue;
      const point = resolvePlotPoint(definition, node.id, anchor.position);
      if (
        !paths.some(
          (path, index) =>
            connected.has(index) &&
            pointToSegmentDistance(point.x, point.z, path.from, path.to) <= path.width / 2 + 0.1,
        )
      )
        issues.push(node.id + '/' + anchor.id + ' has no connected paved approach.');
    }
  }
  for (const [index, path] of paths.entries())
    if (!connected.has(index))
      issues.push(path.id + ' is disconnected from the residential sidewalk.');
  return issues;
}
