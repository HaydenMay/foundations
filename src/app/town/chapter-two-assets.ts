import * as T from 'three';
import type { Project } from '../domain/models';
import { CHAPTER_TWO_PROJECTS } from '../domain/progression';
import type { AssemblyPieceRecipe, AssemblyRecipe } from './assembly';
import type { AssetLibrary } from './assets';
import { batchStatic } from './batching';
import { buildChapterTwoHouse, type NeighborLot, type NeighborStyle } from './chapter-two-houses';
import type { MilestoneAsset } from './milestone-assets';
import { flower, gardenBed, plantTree, shrub } from './landscaping';
import { surface } from './surfaces';

export interface ChapterTwoLot {
  index: number;
  projectId: string;
  lot: NeighborLot;
  x: number;
  z: number;
  rotation: number;
  width: number;
  depth: number;
}

/** Stable world-space anchors keep Chapter 2 in the same continuous neighborhood. */
export const CHAPTER_TWO_LOTS: readonly ChapterTwoLot[] = [
  // Neighbor 1 grows from the existing Chapter 1 reserved parcel; all original home coordinates stay fixed.
  {
    index: 1,
    projectId: 'ch2-neighbor-1',
    lot: 'compact',
    x: 5.8,
    z: -3.3,
    rotation: 0,
    width: 11.2,
    depth: 9.8,
  },
  {
    index: 2,
    projectId: 'ch2-neighbor-2',
    lot: 'l-shaped',
    x: 19.5,
    z: 12.5,
    rotation: Math.PI,
    width: 14,
    depth: 14,
  },
  {
    index: 3,
    projectId: 'ch2-neighbor-3',
    lot: 'two-story',
    x: 30.5,
    z: -8.5,
    rotation: 0,
    width: 13,
    depth: 14,
  },
  {
    index: 4,
    projectId: 'ch2-neighbor-4',
    lot: 'wide-gable',
    x: 41.5,
    z: 12.5,
    rotation: Math.PI,
    width: 13,
    depth: 13,
  },
];

const PARK = { x: 38.5, z: -22, width: 16, depth: 13 };
const LANDMARK = { x: 52, z: -22, width: 8.5, depth: 9 };
const ROAD_FOCUS = { x: 31, z: 10, zoom: 0.62 };
const colors = {
  asphalt: '#555c5b',
  curb: '#b8b7a9',
  sidewalk: '#d1cebd',
  grass: '#82915f',
  deepGrass: '#6f8155',
  stone: '#b9b3a1',
  timber: '#8c6b48',
  warm: '#f2cf83',
};

type PieceSet = { root: T.Group; pieces: Map<string, T.Group>; a: AssetLibrary };

function createSet(a: AssetLibrary, parent: T.Group, id: string): PieceSet {
  const root = a.group(parent);
  root.name = `project-asset:${id}`;
  root.userData['staticBatchBoundary'] = true;
  return { root, pieces: new Map(), a };
}

function part(set: PieceSet, id: string) {
  const group = set.a.group(set.root);
  group.name = id;
  group.userData['staticBatchBoundary'] = true;
  set.pieces.set(id, group);
  return group;
}

function recipeFor(pieces: Map<string, T.Group>, durationMs: number): AssemblyRecipe {
  const entries: AssemblyPieceRecipe[] = [...pieces.keys()].map((id, order) => ({
    id,
    order,
    durationMs,
    delayMs: order * 120,
    dropHeight: 0.45 + (order % 3) * 0.2,
  }));
  return {
    pieces: entries,
    config: {
      durationMs: durationMs + Math.max(0, pieces.size - 1) * 120,
      staggerMs: 120,
      concurrency: 2,
      settleMeters: 0.025,
    },
  };
}

function finish(
  set: PieceSet,
  focus: { x: number; z: number; zoom: number },
  durationMs = 1900,
): MilestoneAsset {
  for (const piece of set.pieces.values())
    batchStatic(piece, (geometry) => set.a.geometry(geometry));
  return { root: set.root, pieces: set.pieces, recipe: recipeFor(set.pieces, durationMs), focus };
}

function roadCurve(): T.CatmullRomCurve3 {
  return new T.CatmullRomCurve3(
    [
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
    ].map(([x, z]) => new T.Vector3(x, 0, z)),
    false,
    'centripetal',
    0.5,
  );
}

function roadElevationAt(x: number): number {
  const curve = roadCurve();
  let closestX = Number.POSITIVE_INFINITY,
    closestZ = 5;
  for (let sample = 0; sample <= 200; sample++) {
    const point = curve.getPointAt(sample / 200),
      distance = Math.abs(point.x - x);
    if (distance < closestX) {
      closestX = distance;
      closestZ = point.z;
    }
  }
  return closestZ;
}

function ribbonGeometry(curve: T.CatmullRomCurve3, width: number, offset: number, segments = 150) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      point = curve.getPointAt(t),
      tangent = curve.getTangentAt(t),
      normalX = tangent.z,
      normalZ = -tangent.x,
      centerX = point.x + normalX * offset,
      centerZ = point.z + normalZ * offset;
    vertices.push(centerX - (normalX * width) / 2, point.y, centerZ - (normalZ * width) / 2);
    vertices.push(centerX + (normalX * width) / 2, point.y, centerZ + (normalZ * width) / 2);
    if (i < segments) {
      const start = i * 2;
      indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ribbon(
  a: AssetLibrary,
  parent: T.Group,
  curve: T.CatmullRomCurve3,
  width: number,
  offset: number,
  y: number,
  color: string,
  name: string,
) {
  const material = a.namedMaterial(
    `chapter-two:${name}`,
    () =>
      new T.MeshStandardMaterial({
        color,
        roughness: 0.94,
        side: T.DoubleSide,
      }),
  );
  const mesh = a.mesh(
    parent,
    a.geometry(ribbonGeometry(curve, width, offset, 150)),
    material,
    0,
    y,
    0,
  );
  mesh.name = name;
  mesh.castShadow = false;
  return mesh;
}

function reservation(a: AssetLibrary, parent: T.Group, lot: ChapterTwoLot) {
  const plot = a.group(parent, lot.x, 0, lot.z, lot.rotation);
  plot.name = `reserved-lot-${lot.index}`;
  a.box(plot, surface(a, 'grass', colors.grass), 0, 0.08, 0, lot.width, 0.1, lot.depth);
  for (const side of [-1, 1]) {
    a.box(plot, colors.stone, (side * lot.width) / 2, 0.17, 0, 0.16, 0.18, lot.depth);
    a.box(plot, colors.stone, 0, 0.17, (side * lot.depth) / 2, lot.width, 0.18, 0.16);
  }
  // Four low corner stones read as a prepared home site without suggesting a built structure.
  for (const x of [-lot.width / 2 + 0.28, lot.width / 2 - 0.28])
    for (const z of [-lot.depth / 2 + 0.28, lot.depth / 2 - 0.28])
      a.box(plot, '#a9a593', x, 0.24, z, 0.34, 0.27, 0.34);
  return plot;
}

export function buildChapterTwoRoad(
  a: AssetLibrary,
  parent: T.Group,
  occupiedProjects: readonly string[] = [],
): MilestoneAsset {
  const set = createSet(a, parent, 'ch2-neighborhood'),
    roadway = part(set, 'continuous-road'),
    sidewalks = part(set, 'sidewalks-and-curbs'),
    markings = part(set, 'quiet-road-markings');
  const curve = roadCurve();
  ribbon(a, roadway, curve, 6.3, 0, 0.245, colors.asphalt, 'curved-asphalt');
  for (const side of [-1, 1]) {
    ribbon(a, sidewalks, curve, 0.22, side * 3.16, 0.275, colors.curb, `curb-${side}`);
    ribbon(a, sidewalks, curve, 1.48, side * 4.02, 0.29, colors.sidewalk, `sidewalk-${side}`);
    ribbon(a, sidewalks, curve, 0.065, side * 4.02, 0.355, '#bdb9a8', `sidewalk-joint-${side}`);
  }
  for (let t = 0.06; t < 0.97; t += 0.055) {
    const point = curve.getPointAt(t),
      tangent = curve.getTangentAt(t);
    const dash = a.box(markings, '#d6d0b5', point.x, 0.29, point.z, 1.15, 0.018, 0.075);
    dash.rotation.y = -Math.atan2(tangent.z, tangent.x);
    dash.castShadow = false;
  }
  for (const lot of CHAPTER_TWO_LOTS) {
    if (!occupiedProjects.includes(lot.projectId))
      reservation(a, part(set, `reserved-lot-${lot.index}`), lot);
  }
  // Several street trees frame the new road before its later landscaping milestone.
  const verge = part(set, 'young-street-trees');
  const placements: [number, number, number, 'oak' | 'birch' | 'evergreen'][] = [
    [18.8, -2.05, 0.72, 'oak'],
    [27.2, 8.05, 0.7, 'birch'],
    [36.3, -1.4, 0.8, 'oak'],
    [45.2, 8.2, 0.72, 'birch'],
    [53.8, -0.1, 0.75, 'evergreen'],
  ];
  for (const [i, [x, z, scale, kind]] of placements.entries()) {
    plantTree(a, verge, x, z, scale, kind, 601 + i * 7);
  }
  return finish(set, ROAD_FOCUS, 2600);
}

function buildNeighbor(
  a: AssetLibrary,
  parent: T.Group,
  project: Project,
  style: NeighborStyle,
): MilestoneAsset {
  const lot = CHAPTER_TWO_LOTS.find((candidate) => candidate.projectId === project.id)!;
  const set = createSet(a, parent, project.id),
    parcel = a.group(set.root, lot.x, 0, lot.z, lot.rotation);
  parcel.name = 'parcel-anchor';
  const lotPart = (id: string) => {
    const group = a.group(parcel);
    group.name = id;
    group.userData['staticBatchBoundary'] = true;
    set.pieces.set(id, group);
    return group;
  };
  const ground = lotPart('lot-and-edge');
  a.box(ground, surface(a, 'grass', '#82905f'), 0, 0.075, 0, lot.width, 0.09, lot.depth);
  const edge = lotPart('garden-border');
  for (const side of [-1, 1]) {
    a.box(edge, '#aaa48f', (side * lot.width) / 2, 0.18, 0, 0.13, 0.16, lot.depth);
    a.box(edge, '#aaa48f', 0, 0.18, (side * lot.depth) / 2, lot.width, 0.16, 0.13);
  }
  const house = lotPart('house');
  const houseParent = a.group(house, 0, 0, -1.1);
  buildChapterTwoHouse(a, houseParent, lot.lot, style);
  const driveway = lotPart('driveway-and-walk');
  const houseWidth =
    lot.lot === 'wide-gable'
      ? 8.15
      : lot.lot === 'two-story'
        ? 7.25
        : lot.lot === 'l-shaped'
          ? 7.45
          : 5.35;
  const driveX = lot.lot === 'l-shaped' ? 2.25 : houseWidth / 2 + 1.15;
  const paving = surface(a, 'paving', '#bbb6a5');
  const roadZ = roadElevationAt(lot.x),
    roadEdgeZ = roadZ + (lot.rotation === 0 ? -3.25 : 3.25),
    drivewayEnd = lot.rotation === 0 ? roadEdgeZ - lot.z : lot.z - roadEdgeZ,
    drivewayStart = lot.lot === 'l-shaped' ? 1.25 : 2.15,
    drivewayLength = Math.max(1, drivewayEnd - drivewayStart),
    drivewayCenter = (drivewayEnd + drivewayStart) / 2;
  driveway.userData['roadEdgeWorldZ'] = roadEdgeZ;
  driveway.userData['connectsToRoad'] = true;
  a.box(driveway, paving, driveX, 0.13, drivewayCenter, 2.2, 0.11, drivewayLength);
  a.box(driveway, '#c9c3b2', 0, 0.145, drivewayCenter, 1.08, 0.1, drivewayLength);
  for (let i = 0; i < 6; i++) {
    const z = drivewayStart + 0.3 + i * Math.max(0.48, (drivewayLength - 0.6) / 6);
    if (z < drivewayEnd) a.box(driveway, '#d1ccbb', 0, 0.2, z, 0.98, 0.035, 0.055);
  }
  const garden = lotPart('front-garden');
  const gardenZ = lot.depth / 2 - 1.45;
  gardenBed(
    a,
    garden,
    -lot.width * 0.29,
    gardenZ,
    Math.min(4.2, lot.width * 0.42),
    0.9,
    710 + lot.index,
  );
  gardenBed(a, garden, lot.width * 0.27, gardenZ - 0.45, 2.4, 0.82, 730 + lot.index);
  const property = lotPart('mailbox-and-yard-tree');
  const frontZ = lot.depth / 2 - 0.35,
    mailboxX = -lot.width * 0.34;
  a.box(property, '#6d5740', mailboxX, 0.48, frontZ, 0.12, 0.78, 0.12);
  a.box(property, '#efe8d5', mailboxX, 0.81, frontZ, 0.56, 0.31, 0.3);
  a.box(property, '#604e3c', mailboxX, 0.8, frontZ + 0.16, 0.35, 0.05, 0.025);
  plantTree(
    a,
    property,
    lot.width * 0.37,
    -lot.depth * 0.37,
    0.62,
    lot.index % 2 ? 'flowering' : 'oak',
    780 + lot.index,
  );
  return finish(set, { x: lot.x + 5, z: lot.z + 4.6, zoom: 1.05 }, 2300);
}

function streetTrees(set: PieceSet, choice: string) {
  const { a } = set,
    group = part(set, 'seasonal-street-canopy');
  const points = [
    [17.2, -2.1],
    [24.1, 9.6],
    [30, -1.2],
    [37.2, 8.6],
    [44.2, -0.55],
    [51.1, 9.2],
    [57, 1.0],
  ];
  for (const [i, [x, z]] of points.entries()) {
    const kind =
      choice === 'evergreens' ? 'evergreen' : choice === 'flowering-trees' ? 'flowering' : 'oak';
    const tree = plantTree(a, group, x, z, 0.74 + (i % 3) * 0.06, kind, 811 + i * 13);
    if (choice === 'autumn-maples')
      tree.traverse((object) => {
        if (object instanceof T.Mesh && object.material instanceof T.MeshStandardMaterial) {
          const color = ['#a87948', '#b77b45', '#936444'][i % 3];
          if (object.name !== 'tapered-branch') object.material = a.material(color);
        }
      });
  }
  for (const [i, x] of [20, 32, 45, 55].entries())
    a.lantern(group, x, 2.25, x % 2 ? -1.1 : 7.2, true, false);
}

function streetsideGardens(set: PieceSet, choice: string) {
  const { a } = set,
    flowers = part(set, 'streetside-flower-borders'),
    shrubs = part(set, 'streetside-shrubs-and-grasses');
  const clusters = [
    [22, -1.3],
    [28, 7.2],
    [35, -0.7],
    [42, 7.8],
    [49, -0.2],
    [56, 7.8],
  ];
  for (const [i, [x, z]] of clusters.entries()) {
    if (choice === 'decorative-shrubs') {
      shrub(a, shrubs, x, z, 0.5 + (i % 2) * 0.1, true, 901 + i);
      shrub(a, shrubs, x + 0.85, z + 0.28, 0.4, false, 920 + i);
    } else {
      const bed = gardenBed(a, flowers, x, z, 2.5 + (i % 2) * 0.45, 0.78, 940 + i);
      if (choice === 'ornamental-grasses') {
        for (let blade = 0; blade < 5; blade++) {
          const grass = a.mesh(
            bed,
            a.cachedGeometry(
              'chapter-two-ornamental-grass',
              () => new T.ConeGeometry(0.11, 0.82, 5),
            ),
            '#78825e',
            -0.8 + blade * 0.4,
            0.36,
            blade % 2 ? 0.19 : -0.19,
          );
          grass.castShadow = false;
        }
      }
      if (choice === 'flowering-borders') {
        for (let n = 0; n < 4; n++)
          flower(a, bed, -0.85 + n * 0.55, 0.53, 0.12, n % 2 ? '#8f9ab3' : '#d6b6af', 0.1);
      }
    }
  }
}

function entrance(set: PieceSet, choice: string) {
  const { a } = set,
    gate = part(set, 'neighborhood-welcome');
  const x = 17.2,
    z = 0.25;
  for (const dx of [-1, 1]) {
    a.box(gate, surface(a, 'stone', '#a59d8c'), x + dx * 2.5, 1.05, z, 0.42, 2.1, 0.42);
    a.box(gate, '#c2b8a2', x + dx * 2.5, 2.16, z, 0.62, 0.2, 0.62);
    a.lantern(gate, x + dx * 2.5, 2.28, z, false, false);
  }
  if (choice === 'timber-sign') {
    a.box(gate, '#786146', x, 1.68, z, 4.5, 1.12, 0.18);
    a.box(gate, '#c7ad7c', x, 1.68, z + 0.11, 4.12, 0.82, 0.035);
  } else {
    a.box(gate, choice === 'stone-pillars' ? '#a59d8c' : '#e1d9c6', x, 1.54, z, 4.4, 0.84, 0.16);
    a.box(gate, '#78684f', x, 1.54, z + 0.1, 3.98, 0.65, 0.035);
  }
  const beds = part(set, 'entry-planting');
  for (const side of [-1, 1]) {
    gardenBed(a, beds, x + side * 4.0, z + 0.85, 2.6, 1.3, 1001 + side);
    if (choice === 'flowering-entrance') {
      plantTree(a, beds, x + side * 4.2, z - 0.5, 0.48, 'flowering', 1010 + side);
    } else shrub(a, beds, x + side * 4.2, z - 0.5, 0.42, true, 1020 + side);
  }
}

function park(set: PieceSet, choice: string) {
  const { a } = set,
    base = part(set, 'park-green-and-walks'),
    feature = part(set, 'community-gathering-place'),
    planting = part(set, 'park-edge-planting');
  a.box(base, surface(a, 'grass', '#7d8d5b'), PARK.x, 0.09, PARK.z, PARK.width, 0.12, PARK.depth);
  a.box(base, surface(a, 'paving', '#bdb7a4'), PARK.x, 0.16, PARK.z, 1.4, 0.08, PARK.depth - 1.1);
  a.box(base, '#c4bdab', PARK.x, 0.17, PARK.z, PARK.width - 1, 0.07, 0.22);
  if (choice === 'flower-garden') {
    for (const dx of [-4.1, 4.1]) gardenBed(a, feature, PARK.x + dx, PARK.z, 5.4, 2.1, 1101 + dx);
    a.bench(feature, PARK.x, PARK.z + 3.1, Math.PI);
    fountain(a, feature, PARK.x, PARK.z - 2.2);
  } else if (choice === 'playground') {
    const wood = surface(a, 'wood', '#9a744a');
    for (const dx of [-1.2, 1.2])
      a.box(feature, wood, PARK.x + dx, 1.0, PARK.z - 0.4, 0.16, 2, 0.16);
    a.box(feature, wood, PARK.x, 1.75, PARK.z - 0.4, 3.2, 0.17, 2.2);
    a.roof(feature, 3.5, 2.55, 1.05, 1.84, '#5d6559');
    const slide = a.box(feature, '#a9b7a3', PARK.x + 2.1, 0.77, PARK.z + 0.3, 0.58, 0.12, 3.2);
    slide.rotation.x = -0.31;
    a.bench(feature, PARK.x - 4, PARK.z + 3.3, Math.PI / 2);
  } else {
    a.bench(feature, PARK.x - 3.2, PARK.z + 1.6, Math.PI / 2);
    a.bench(feature, PARK.x + 3.2, PARK.z + 1.6, -Math.PI / 2);
    for (const dx of [-3.2, 3.2]) {
      a.box(feature, '#897456', PARK.x + dx, 0.79, PARK.z - 1.8, 1.6, 0.12, 0.9);
      for (const x of [-0.52, 0.52])
        a.box(feature, '#79674f', PARK.x + dx + x, 0.42, PARK.z - 1.8, 0.1, 0.76, 0.78);
    }
    a.roof(feature, 4.6, 4.2, 1.28, 3.0, '#565e56');
    for (const x of [-1.8, 1.8])
      for (const z of [-1.55, 1.55])
        a.box(feature, '#8e704d', PARK.x + x, 1.5, PARK.z + z, 0.14, 3, 0.14);
  }
  for (const [i, [dx, dz]] of [
    [-7, -5],
    [7, -5],
    [-7, 5],
    [7, 5],
  ].entries())
    plantTree(
      a,
      planting,
      PARK.x + dx,
      PARK.z + dz,
      0.78 + (i % 2) * 0.12,
      i === 1 ? 'evergreen' : 'oak',
      1151 + i,
    );
  for (const [i, [dx, dz]] of [
    [-5.8, 0],
    [5.8, 0],
    [0, 5.4],
  ].entries())
    shrub(a, planting, PARK.x + dx, PARK.z + dz, 0.42, true, 1171 + i);
}

function landmark(set: PieceSet, choice: string) {
  const { a } = set,
    plaza = part(set, 'landmark-plaza'),
    focal = part(set, 'neighborhood-landmark'),
    planting = part(set, 'landmark-planting');
  a.box(
    plaza,
    surface(a, 'paving', '#bdb8a8'),
    LANDMARK.x,
    0.12,
    LANDMARK.z,
    LANDMARK.width,
    0.11,
    LANDMARK.depth,
  );
  a.box(
    plaza,
    '#aaa48f',
    LANDMARK.x,
    0.2,
    LANDMARK.z,
    LANDMARK.width - 1.2,
    0.08,
    LANDMARK.depth - 1.2,
  );
  if (choice === 'fountain-plaza') {
    fountain(a, focal, LANDMARK.x, LANDMARK.z);
    a.box(plaza, '#c9c3b2', LANDMARK.x, 0.22, LANDMARK.z, 4.8, 0.04, 4.8);
  } else if (choice === 'neighborhood-gazebo') {
    for (const dx of [-1.8, 1.8])
      for (const dz of [-1.8, 1.8]) {
        a.box(focal, '#8f704d', LANDMARK.x + dx, 1.4, LANDMARK.z + dz, 0.16, 2.8, 0.16);
        a.box(focal, '#b49a74', LANDMARK.x + dx, 2.8, LANDMARK.z + dz, 0.27, 0.13, 0.27);
      }
    a.box(focal, '#9c805b', LANDMARK.x, 2.7, LANDMARK.z, 4.25, 0.18, 4.25);
    const roof = a.mesh(
      focal,
      a.cachedGeometry('chapter-two-landmark-gazebo-roof', () => new T.ConeGeometry(3, 1.25, 4)),
      '#555c56',
      LANDMARK.x,
      3.38,
      LANDMARK.z,
    );
    roof.rotation.y = Math.PI / 4;
    a.bench(focal, LANDMARK.x, LANDMARK.z + 0.3, Math.PI);
  } else {
    for (const [i, [dx, dy, dz, size]] of [
      [-1.1, 0.85, -0.15, 1.0],
      [0.1, 1.22, 0.12, 1.24],
      [1.25, 0.75, -0.04, 0.86],
    ].entries()) {
      const stone = a.mesh(
        focal,
        a.cachedGeometry(`chapter-two-landmark-stone-${i}`, () => new T.DodecahedronGeometry(1, 0)),
        surface(a, 'stone', ['#8f9387', '#a49f8f', '#787f77'][i]),
        LANDMARK.x + dx,
        dy,
        LANDMARK.z + dz,
        size * 0.72,
        size * 1.55,
        size * 0.7,
      );
      stone.rotation.set(0.12 * i, i * 0.58, -0.13 * i);
    }
    a.bench(focal, LANDMARK.x, LANDMARK.z + 3.1, Math.PI);
  }
  for (const [i, [dx, dz]] of [
    [-3.3, -3.1],
    [3.3, -3.1],
    [-3.3, 3.1],
    [3.3, 3.1],
  ].entries()) {
    shrub(a, planting, LANDMARK.x + dx, LANDMARK.z + dz, 0.37, true, 1201 + i);
    a.lantern(planting, LANDMARK.x + dx * 0.72, 1.6, LANDMARK.z + dz * 0.72, true, false);
  }
}

function fountain(a: AssetLibrary, parent: T.Object3D, x: number, z: number) {
  a.cylinder(parent, '#98988c', x, 0.38, z, 1.18, 0.42);
  a.cylinder(parent, '#c7c3b2', x, 0.62, z, 1.02, 0.12);
  a.cylinder(parent, surface(a, 'water', '#6b9ea0'), x, 0.69, z, 0.86, 0.035);
  a.cylinder(parent, '#a9a594', x, 0.95, z, 0.19, 0.58);
  a.cylinder(parent, '#d0c9b4', x, 1.24, z, 0.62, 0.13);
  a.cylinder(parent, surface(a, 'water', '#78a9a8'), x, 1.32, z, 0.46, 0.025);
  a.sphere(parent, '#78a9a8', x, 1.48, z, 0.12, 0.24, 0.12);
}

export function buildChapterTwoProject(
  a: AssetLibrary,
  parent: T.Group,
  projectId: string,
  choiceId: string,
): MilestoneAsset {
  const definition = CHAPTER_TWO_PROJECTS.find((project) => project.id === projectId);
  if (!definition || !definition.choices.some((choice) => choice.id === choiceId))
    throw new Error(`Unknown Chapter 2 project or design: ${projectId}/${choiceId}`);
  if (definition.lot) return buildNeighbor(a, parent, definition, choiceId as NeighborStyle);
  const set = createSet(a, parent, projectId);
  switch (projectId) {
    case 'ch2-street-trees':
      streetTrees(set, choiceId);
      break;
    case 'ch2-gardens':
      streetsideGardens(set, choiceId);
      break;
    case 'ch2-entrance':
      entrance(set, choiceId);
      break;
    case 'ch2-community-park':
      park(set, choiceId);
      break;
    case 'ch2-landmark':
      landmark(set, choiceId);
      break;
    default:
      throw new Error(`No Chapter 2 composition is registered for ${projectId}.`);
  }
  const focus =
    projectId === 'ch2-community-park'
      ? { x: PARK.x + 5, z: PARK.z + 4.6, zoom: 0.88 }
      : projectId === 'ch2-landmark'
        ? { x: LANDMARK.x + 5, z: LANDMARK.z + 4.6, zoom: 1.05 }
        : projectId === 'ch2-entrance'
          ? { x: 22.2, z: 4.85, zoom: 1.18 }
          : { x: 31, z: 10, zoom: 0.78 };
  return finish(set, focus, 2100);
}
