import * as T from 'three';
import type { Project } from '../domain/models';
import { CHAPTER_TWO_PROJECTS } from '../domain/progression';
import type { AssemblyPieceRecipe, AssemblyRecipe } from './assembly';
import type { AssetLibrary } from './assets';
import { batchStatic } from './batching';
import { CHAPTER_TWO_HOUSE_BLUEPRINTS } from './chapter-two-blueprints';
import { buildChapterTwoHouse, type NeighborLot, type NeighborStyle } from './chapter-two-houses';
import type { MilestoneAsset } from './milestone-assets';
import { flower, gardenBed, plantTree, shrub } from './landscaping';
import { surface } from './surfaces';
import {
  chapterTwoRoadFrameAtX,
  CHAPTER_TWO_LOTS,
  CHAPTER_TWO_PUBLIC_SITES,
  CHAPTER_TWO_ROAD_CONTROL_POINTS,
  CHAPTER_TWO_SITE_PLAN,
  type ChapterTwoSiteLot,
} from './chapter-two-site-plan';

export type ChapterTwoLot = ChapterTwoSiteLot;
export { CHAPTER_TWO_LOTS } from './chapter-two-site-plan';

const PARK = CHAPTER_TWO_PUBLIC_SITES.find((site) => site.projectId === 'ch2-community-park')!;
const LANDMARK = CHAPTER_TWO_PUBLIC_SITES.find((site) => site.projectId === 'ch2-landmark')!;
const ENTRANCE = CHAPTER_TWO_PUBLIC_SITES.find((site) => site.projectId === 'ch2-entrance')!;
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

type PieceSet = {
  root: T.Group;
  pieces: Map<string, T.Group>;
  renderObjects: Map<string, T.Group>;
  a: AssetLibrary;
};

function createSet(
  a: AssetLibrary,
  parent: T.Group,
  id: string,
  position: readonly [number, number, number] = [0, 0, 0],
  rotation = 0,
): PieceSet {
  const root = a.group(parent, position[0], position[1], position[2], rotation);
  root.name = `project-asset:${id}`;
  root.userData['staticBatchBoundary'] = true;
  return { root, pieces: new Map(), renderObjects: new Map(), a };
}

function part(set: PieceSet, id: string) {
  const group = set.a.group(set.root);
  group.name = id;
  group.userData['staticBatchBoundary'] = true;
  set.pieces.set(id, group);
  set.renderObjects.set(id, group);
  return group;
}

function renderPart(set: PieceSet, id: string) {
  const group = set.a.group(set.root);
  group.name = id;
  group.userData['staticBatchBoundary'] = true;
  set.renderObjects.set(id, group);
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
  recipe?: AssemblyRecipe,
): MilestoneAsset {
  for (const piece of set.pieces.values())
    batchStatic(piece, (geometry) => set.a.geometry(geometry));
  return {
    root: set.root,
    pieces: set.pieces,
    renderObjects: set.renderObjects,
    recipe: recipe ?? recipeFor(set.pieces, durationMs),
    focus,
  };
}

function neighborRecipe(pieces: Map<string, T.Group>, lot: NeighborLot): AssemblyRecipe {
  const blueprint = CHAPTER_TWO_HOUSE_BLUEPRINTS[lot as keyof typeof CHAPTER_TWO_HOUSE_BLUEPRINTS];
  const pieceDuration = 500;
  const dependencyGap = 90;
  const starts = new Map<string, number>();
  const ends = new Map<string, number>();
  for (const step of [...blueprint.assembly].sort((first, second) => first.order - second.order)) {
    const dependencies = (step.dependsOn ?? []).map((id) => ends.get(id) ?? 0);
    const start = dependencies.length ? Math.max(...dependencies) + dependencyGap : 0;
    starts.set(step.id, start);
    ends.set(step.id, start + pieceDuration);
  }
  const houseCompletion = Math.max(0, ...ends.values());
  let finalTime = houseCompletion + 120 + pieceDuration;
  const piecesInOrder = [...pieces.keys()];
  const entries = piecesInOrder.map((id, order) => {
    let delayMs: number;
    if (id.startsWith('house-')) delayMs = starts.get(id.slice('house-'.length)) ?? houseCompletion;
    else if (id === 'lot-and-edge') delayMs = 0;
    else if (id === 'garden-border') delayMs = dependencyGap;
    else if (id === 'driveway-and-walk') delayMs = houseCompletion + 120;
    else if (id === 'front-garden') delayMs = houseCompletion + 240;
    else if (id === 'mailbox-and-yard-tree') delayMs = houseCompletion + 180;
    else delayMs = houseCompletion + 120;
    finalTime = Math.max(finalTime, delayMs + pieceDuration);
    return {
      id,
      order,
      delayMs,
      durationMs: pieceDuration,
      dropHeight: id === 'lot-and-edge' ? 0.25 : 0.62,
    };
  });
  return {
    pieces: entries,
    config: {
      durationMs: finalTime,
      staggerMs: dependencyGap,
      concurrency: 3,
      dropHeight: 0.62,
      settleMeters: 0.02,
    },
  };
}

function districtPoint(x: number, z: number): readonly [number, number] {
  return [
    x - CHAPTER_TWO_SITE_PLAN.district.position[0],
    z - CHAPTER_TWO_SITE_PLAN.district.position[2],
  ];
}

function roadCurve(): T.CatmullRomCurve3 {
  return new T.CatmullRomCurve3(
    CHAPTER_TWO_ROAD_CONTROL_POINTS.map(([x, z]) => new T.Vector3(x, 0, z)),
    false,
    'centripetal',
    0.5,
  );
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
  const [x, z] = districtPoint(lot.x, lot.z);
  const plot = a.group(parent, x, 0, z, lot.rotation);
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
  const set = createSet(a, parent, 'ch2-neighborhood', CHAPTER_TWO_SITE_PLAN.district.position),
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
    const [localX, localZ] = districtPoint(x, z);
    plantTree(a, verge, localX, localZ, scale, kind, 601 + i * 7);
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
  const set = createSet(a, parent, project.id, [lot.x, 0, lot.z], lot.rotation),
    parcel = a.group(set.root);
  parcel.name = 'parcel-anchor';
  const ground = part(set, 'lot-and-edge');
  parcel.add(ground);
  a.box(ground, surface(a, 'grass', '#82905f'), 0, 0.075, 0, lot.width, 0.09, lot.depth);
  const edge = part(set, 'garden-border');
  parcel.add(edge);
  for (const side of [-1, 1]) {
    a.box(edge, '#aaa48f', (side * lot.width) / 2, 0.18, 0, 0.13, 0.16, lot.depth);
  }
  // Local +Z faces the street; leave that boundary open for each lot's driveway and front walk.
  a.box(edge, '#aaa48f', 0, 0.18, -lot.depth / 2, lot.width, 0.16, 0.13);
  const house = renderPart(set, 'house');
  parcel.add(house);
  const houseParent = a.group(house, lot.house.offsetX, 0, lot.house.offsetZ);
  const residential = buildChapterTwoHouse(a, houseParent, lot.lot, style);
  for (const [id, piece] of residential.pieces) set.pieces.set(`house-${id}`, piece);
  const routes = part(set, 'driveway-and-walk');
  parcel.add(routes);
  const paving = surface(a, 'paving', '#bbb6a5');
  const road = chapterTwoRoadFrameAtX(lot.x);
  const lotFrontX = Math.sin(lot.rotation);
  const lotFrontZ = Math.cos(lot.rotation);
  const roadEdgeX = road.x - lotFrontX * 3.15;
  const roadEdgeZ = road.z - lotFrontZ * 3.15;
  const sidewalkLocalZ =
    lot.depth / 2 +
    (CHAPTER_TWO_SITE_PLAN.street.propertyFrontageOffset -
      CHAPTER_TWO_SITE_PLAN.street.sidewalkOffset);
  const drivewayLength = sidewalkLocalZ - lot.house.drivewayStartZ;
  const drivewayCenter = (sidewalkLocalZ + lot.house.drivewayStartZ) / 2;
  routes.userData['roadEdgeWorldX'] = roadEdgeX;
  routes.userData['roadEdgeWorldZ'] = roadEdgeZ;
  routes.userData['connectsToRoad'] = true;
  routes.userData['connectsToSidewalk'] = true;
  const driveway = a.group(routes, lot.house.drivewayX, 0.12, drivewayCenter);
  driveway.name = 'plot-driveway';
  driveway.userData['staticBatchBoundary'] = true;
  set.renderObjects.set('driveway', driveway);
  a.box(driveway, paving, 0, 0, 0, lot.house.drivewayWidth, 0.11, drivewayLength);
  a.box(driveway, '#c9c3b2', 0, 0.015, 0, 0.16, 0.12, drivewayLength);
  for (let i = 0; i < 7; i++) {
    const z = -drivewayLength / 2 + 0.4 + i * ((drivewayLength - 0.8) / 6);
    a.box(
      driveway,
      '#d1ccbb',
      0,
      0.07,
      z,
      Math.min(lot.house.drivewayWidth - 0.25, 2.3),
      0.025,
      0.055,
    );
  }
  const walkStart = lot.house.offsetZ + lot.house.entryZ;
  const walkLength = sidewalkLocalZ - walkStart;
  const walkway = a.group(routes, lot.house.entryX, 0.14, (walkStart + sidewalkLocalZ) / 2);
  walkway.name = 'plot-front-walkway';
  walkway.userData['staticBatchBoundary'] = true;
  set.renderObjects.set('walkway', walkway);
  walkway.userData['connectsToSidewalk'] = true;
  a.box(walkway, '#bcb7a8', 0, 0, 0, 1.1, 0.1, walkLength);
  const stepCount = Math.max(3, Math.floor(walkLength / 0.72));
  for (let index = 0; index < stepCount; index++) {
    const z = -walkLength / 2 + ((index + 0.5) * walkLength) / stepCount;
    a.box(walkway, '#d0cbbb', 0, 0.06, z, 0.94, 0.025, walkLength / stepCount - 0.08);
  }
  const garden = part(set, 'front-garden');
  parcel.add(garden);
  const gardenZ = lot.depth / 2 - 1.45;
  const driveSide = Math.sign(lot.house.drivewayX) || 1;
  gardenBed(
    a,
    garden,
    -driveSide * Math.min(2.9, lot.width * 0.23),
    gardenZ,
    2.5,
    0.9,
    710 + lot.index,
  );
  gardenBed(
    a,
    garden,
    -driveSide * Math.min(5.3, lot.width * 0.39),
    gardenZ - 0.35,
    2.25,
    0.82,
    730 + lot.index,
  );
  const property = part(set, 'mailbox-and-yard-tree');
  parcel.add(property);
  const frontZ = lot.depth / 2 - 0.5,
    mailboxX = -lot.width * 0.39;
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
  const focusX =
    lot.x + lot.house.offsetX * Math.cos(lot.rotation) + lot.house.offsetZ * Math.sin(lot.rotation);
  const focusZ =
    lot.z - lot.house.offsetX * Math.sin(lot.rotation) + lot.house.offsetZ * Math.cos(lot.rotation);
  const focusFrontX = Math.sin(lot.rotation);
  const focusFrontZ = Math.cos(lot.rotation);
  return finish(
    set,
    { x: focusX + focusFrontX * 4.4, z: focusZ + focusFrontZ * 4.4, zoom: 1.05 },
    4100,
    neighborRecipe(set.pieces, lot.lot),
  );
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
    const [localX, localZ] = districtPoint(x, z);
    const tree = plantTree(a, group, localX, localZ, 0.74 + (i % 3) * 0.06, kind, 811 + i * 13);
    if (choice === 'autumn-maples')
      tree.traverse((object) => {
        if (object instanceof T.Mesh && object.material instanceof T.MeshStandardMaterial) {
          const color = ['#a87948', '#b77b45', '#936444'][i % 3];
          if (object.name !== 'tapered-branch') object.material = a.material(color);
        }
      });
  }
  for (const [i, x] of [20, 32, 45, 55].entries()) {
    const [localX, localZ] = districtPoint(x, x % 2 ? -1.1 : 7.2);
    a.lantern(group, localX, 2.25, localZ, true, false);
  }
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
    const [localX, localZ] = districtPoint(x, z);
    if (choice === 'decorative-shrubs') {
      shrub(a, shrubs, localX, localZ, 0.5 + (i % 2) * 0.1, true, 901 + i);
      shrub(a, shrubs, localX + 0.85, localZ + 0.28, 0.4, false, 920 + i);
    } else {
      const bed = gardenBed(a, flowers, localX, localZ, 2.5 + (i % 2) * 0.45, 0.78, 940 + i);
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
  const x = 0,
    z = 0;
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
  a.box(base, surface(a, 'grass', '#7d8d5b'), 0, 0.09, 0, PARK.width, 0.12, PARK.depth);
  a.box(base, surface(a, 'paving', '#bdb7a4'), -5.5, 0.16, 0, 1.4, 0.08, PARK.depth - 1.1);
  a.box(base, '#c4bdab', 0, 0.17, 0, PARK.width - 1, 0.07, 0.22);
  if (choice === 'flower-garden') {
    for (const dx of [-4.1, 4.1]) gardenBed(a, feature, dx, 0, 5.4, 2.1, 1101 + dx);
    a.bench(feature, 0, 3.1, Math.PI);
    fountain(a, feature, 0, -2.2);
  } else if (choice === 'playground') {
    const wood = surface(a, 'wood', '#9a744a');
    for (const dx of [-1.2, 1.2]) a.box(feature, wood, dx, 1.0, -0.4, 0.16, 2, 0.16);
    a.box(feature, wood, 0, 1.75, -0.4, 3.2, 0.17, 2.2);
    a.roof(feature, 3.5, 2.55, 1.05, 1.84, '#5d6559');
    const slide = a.box(feature, '#a9b7a3', 2.1, 0.77, 0.3, 0.58, 0.12, 3.2);
    slide.rotation.x = -0.31;
    a.bench(feature, -4, 3.3, Math.PI / 2);
  } else {
    a.bench(feature, -3.2, 1.6, Math.PI / 2);
    a.bench(feature, 3.2, 1.6, -Math.PI / 2);
    for (const dx of [-3.2, 3.2]) {
      a.box(feature, '#897456', dx, 0.79, -1.8, 1.6, 0.12, 0.9);
      for (const x of [-0.52, 0.52]) a.box(feature, '#79674f', dx + x, 0.42, -1.8, 0.1, 0.76, 0.78);
    }
    a.roof(feature, 4.6, 4.2, 1.28, 3.0, '#565e56');
    for (const x of [-1.8, 1.8])
      for (const z of [-1.55, 1.55]) a.box(feature, '#8e704d', x, 1.5, z, 0.14, 3, 0.14);
  }
  for (const [i, [dx, dz]] of [
    [-7, -5],
    [7, -5],
    [-7, 5],
    [7, 5],
  ].entries())
    plantTree(a, planting, dx, dz, 0.78 + (i % 2) * 0.12, i === 1 ? 'evergreen' : 'oak', 1151 + i);
  for (const [i, [dx, dz]] of [
    [-5.8, 0],
    [5.8, 0],
    [0, 5.4],
  ].entries())
    shrub(a, planting, dx, dz, 0.42, true, 1171 + i);

  const paths = part(set, 'public-neighborhood-paths');
  const approach = CHAPTER_TWO_SITE_PLAN.paths.parkApproach;
  const approachDepth = approach.startZ - approach.endZ;
  a.box(
    paths,
    surface(a, 'paving', '#bdb7a4'),
    approach.x - PARK.x,
    0.14,
    (approach.startZ + approach.endZ) / 2 - PARK.z,
    1.4,
    0.08,
    approachDepth,
  );
  const promenade = CHAPTER_TWO_SITE_PLAN.paths.promenade;
  a.box(
    paths,
    surface(a, 'paving', '#bdb7a4'),
    (promenade.startX + promenade.endX) / 2 - PARK.x,
    0.14,
    promenade.z - PARK.z,
    promenade.endX - promenade.startX,
    0.08,
    1.6,
  );
}

function landmark(set: PieceSet, choice: string) {
  const { a } = set,
    plaza = part(set, 'landmark-plaza'),
    focal = part(set, 'neighborhood-landmark'),
    planting = part(set, 'landmark-planting');
  a.box(plaza, surface(a, 'paving', '#bdb8a8'), 0, 0.12, 0, LANDMARK.width, 0.11, LANDMARK.depth);
  a.box(plaza, '#aaa48f', 0, 0.2, 0, LANDMARK.width - 1.2, 0.08, LANDMARK.depth - 1.2);
  if (choice === 'fountain-plaza') {
    fountain(a, focal, 0, 0);
    a.box(plaza, '#c9c3b2', 0, 0.22, 0, 4.8, 0.04, 4.8);
  } else if (choice === 'neighborhood-gazebo') {
    for (const dx of [-1.8, 1.8])
      for (const dz of [-1.8, 1.8]) {
        a.box(focal, '#8f704d', dx, 1.4, dz, 0.16, 2.8, 0.16);
        a.box(focal, '#b49a74', dx, 2.8, dz, 0.27, 0.13, 0.27);
      }
    a.box(focal, '#9c805b', 0, 2.7, 0, 4.25, 0.18, 4.25);
    const roof = a.mesh(
      focal,
      a.cachedGeometry('chapter-two-landmark-gazebo-roof', () => new T.ConeGeometry(3, 1.25, 4)),
      '#555c56',
      0,
      3.38,
      0,
    );
    roof.rotation.y = Math.PI / 4;
    a.bench(focal, 0, 0.3, Math.PI);
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
        dx,
        dy,
        dz,
        size * 0.72,
        size * 1.55,
        size * 0.7,
      );
      stone.rotation.set(0.12 * i, i * 0.58, -0.13 * i);
    }
    a.bench(focal, 0, 3.1, Math.PI);
  }
  for (const [i, [dx, dz]] of [
    [-3.3, -3.1],
    [3.3, -3.1],
    [-3.3, 3.1],
    [3.3, 3.1],
  ].entries()) {
    shrub(a, planting, dx, dz, 0.37, true, 1201 + i);
    a.lantern(planting, dx * 0.72, 1.6, dz * 0.72, true, false);
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
  const site = CHAPTER_TWO_PUBLIC_SITES.find((candidate) => candidate.projectId === projectId);
  const position = site ? ([site.x, 0, site.z] as const) : CHAPTER_TWO_SITE_PLAN.district.position;
  const set = createSet(a, parent, projectId, position);
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
          ? { x: ENTRANCE.x, z: ENTRANCE.z + 4.5, zoom: 1.18 }
          : { x: 31, z: 10, zoom: 0.78 };
  return finish(set, focus, 2100);
}
