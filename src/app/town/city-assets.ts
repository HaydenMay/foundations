import * as T from 'three';
import type { Project } from '../domain/models';
import { CHAPTER_FOUR_PROJECTS, CHAPTER_THREE_PROJECTS } from '../domain/progression';
import { batchStatic } from './batching';
import type { AssemblyPieceRecipe, AssemblyRecipe } from './assembly';
import type { AssetLibrary } from './assets';
import type { MilestoneAsset } from './milestone-assets';
import { gardenBed, plantTree, shrub } from './landscaping';
import {
  CITY_MONORAIL_PLAN,
  CITY_SITE_PLAN,
  monorailPoseAt,
  monorailSupportPoint,
  type CityPathSegment,
  type CityProjectId,
} from './city-site-plan';
import { surface } from './surfaces';

interface PieceSet {
  root: T.Group;
  pieces: Map<string, T.Group>;
  a: AssetLibrary;
}

function part(set: PieceSet, id: string): T.Group {
  const group = set.a.group(set.root);
  group.name = id;
  set.pieces.set(id, group);
  return group;
}

function makeSet(
  a: AssetLibrary,
  parent: T.Group,
  id: string,
  position: readonly [number, number, number],
  rotation = 0,
): PieceSet {
  const root = a.group(parent, position[0], position[1], position[2], rotation);
  root.name = `project-asset:${id}`;
  root.userData['staticBatchBoundary'] = true;
  return { root, pieces: new Map(), a };
}

function recipe(pieces: ReadonlyMap<string, T.Group>, durationMs = 2800): AssemblyRecipe {
  const entries: AssemblyPieceRecipe[] = [...pieces.keys()].map((id, order) => ({
    id,
    order,
    durationMs: Math.max(1250, durationMs - order * 180),
    delayMs: order * 140,
    dropHeight: 0.8 + (order % 3) * 0.22,
  }));
  return {
    pieces: entries,
    config: { durationMs, staggerMs: 140, concurrency: 2, settleMeters: 0.025 },
  };
}

function finish(
  set: PieceSet,
  focus: { x: number; z: number; zoom: number },
  durationMs = 2800,
  dynamicPieces: readonly string[] = [],
): MilestoneAsset {
  for (const [id, piece] of set.pieces) {
    if (dynamicPieces.includes(id)) continue;
    batchStatic(piece, (geometry) => set.a.geometry(geometry));
    piece.userData['staticBatchBoundary'] = true;
  }
  return { root: set.root, pieces: set.pieces, recipe: recipe(set.pieces, durationMs), focus };
}

function signAccent(choice: string): string {
  return choice === 'bakery-row' ? '#b77b58' : choice === 'bookshop-row' ? '#75856b' : '#8c9676';
}

type StorefrontId = 'bakery' | 'bookshop' | 'market';
type StorefrontRoof = 'front-gable' | 'dormer-gable' | 'parapet';

interface StorefrontProfile {
  roofProfile: StorefrontRoof;
  facadeFinish: 'painted-siding' | 'timber-siding' | 'brick';
  facadeSurface: 'siding' | 'wood' | 'brick';
  facadeColor: string;
  roofColor: string;
  trimColor: string;
  foundationColor: string;
  awningColor: string;
  accentColor: string;
}

/** Separate architectural identities keep Main Street from reading as three recolored houses. */
const STOREFRONT_PROFILES: Record<StorefrontId, StorefrontProfile> = {
  bakery: {
    roofProfile: 'front-gable',
    facadeFinish: 'painted-siding',
    facadeSurface: 'siding',
    facadeColor: '#d7c7ac',
    roofColor: '#505953',
    trimColor: '#eee5d4',
    foundationColor: '#a79b87',
    awningColor: '#a86f55',
    accentColor: '#b77b58',
  },
  bookshop: {
    roofProfile: 'dormer-gable',
    facadeFinish: 'timber-siding',
    facadeSurface: 'wood',
    facadeColor: '#a58661',
    roofColor: '#5c625d',
    trimColor: '#e6ddca',
    foundationColor: '#918778',
    awningColor: '#71816d',
    accentColor: '#75856b',
  },
  market: {
    roofProfile: 'parapet',
    facadeFinish: 'brick',
    facadeSurface: 'brick',
    facadeColor: '#a76550',
    roofColor: '#5e625c',
    trimColor: '#e8ddc7',
    foundationColor: '#948b7b',
    awningColor: '#b18a62',
    accentColor: '#8c9676',
  },
};

function namedWindow(
  a: AssetLibrary,
  parent: T.Object3D,
  name: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  rotation = 0,
) {
  const window = a.window(parent, x, y, z, width, height, rotation);
  window.name = name;
  return window;
}

function gablePanel(
  a: AssetLibrary,
  parent: T.Object3D,
  width: number,
  height: number,
  y: number,
  z: number,
  wall: T.Material,
  rear = false,
) {
  const shape = new T.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const panel = a.mesh(parent, a.geometry(new T.ShapeGeometry(shape)), wall, 0, y, z);
  panel.name = rear ? 'gable-panel-rear' : 'gable-panel-front';
  if (rear) panel.rotation.y = Math.PI;
  panel.castShadow = false;
  return panel;
}

function storefront(a: AssetLibrary, parent: T.Group, x: number, id: StorefrontId, lead: boolean) {
  const g = a.group(parent, x, 0, 0);
  g.name = `storefront-${id}`;
  const profile = STOREFRONT_PROFILES[id];
  g.userData['roofProfile'] = profile.roofProfile;
  g.userData['facadeFinish'] = profile.facadeFinish;
  const wall = surface(a, profile.facadeSurface, profile.facadeColor);
  const trim = profile.trimColor;
  a.box(g, surface(a, 'stone', profile.foundationColor), 0, 0.25, 0, 9.35, 0.5, 6.9);
  a.box(g, wall, 0, 2.25, 0, 8.9, 3.7, 6.35);
  a.box(g, trim, 0, 0.56, 3.18, 9.0, 0.16, 0.16);
  for (const side of [-1, 1]) {
    a.box(g, trim, side * 4.37, 2.22, 0, 0.15, 3.45, 6.42);
    a.box(g, trim, side * 4.37, 0.72, 0, 0.18, 0.18, 6.5);
  }
  const roof = a.group(g);
  roof.name = 'roof-shell';
  const roofMaterial = surface(a, 'shingles', profile.roofColor);
  if (profile.roofProfile === 'parapet') {
    a.box(roof, roofMaterial, 0, 4.22, 0, 9.85, 0.32, 7.2);
    a.box(roof, wall, 0, 4.58, 3.4, 9.85, 0.55, 0.2);
    a.box(roof, wall, 0, 4.58, -3.4, 9.85, 0.55, 0.2);
    for (const side of [-1, 1]) a.box(roof, wall, side * 4.82, 4.58, 0, 0.2, 0.55, 6.9);
    for (const side of [-1, 1]) a.box(roof, trim, side * 2.4, 4.42, 0, 0.52, 0.12, 0.38);
  } else {
    const roofHeight = profile.roofProfile === 'dormer-gable' ? 1.9 : 1.68;
    const roofY = profile.roofProfile === 'dormer-gable' ? 4.25 : 4.08;
    a.roof(roof, 9.65, 7.0, roofHeight, roofY, roofMaterial);
    gablePanel(a, roof, 8.9, roofHeight, roofY, 3.515, wall);
    gablePanel(a, roof, 8.9, roofHeight, roofY, -3.515, wall, true);
    if (profile.roofProfile === 'dormer-gable') {
      a.box(roof, wall, 0, 4.62, 2.83, 2.65, 1.15, 0.8);
      a.roof(roof, 3.0, 1.2, 0.72, 5.12, roofMaterial);
      namedWindow(a, roof, 'dormer-window', 0, 4.72, 3.255, 1.15, 0.82);
      for (const side of [-1, 1]) {
        const brace = a.box(roof, trim, side * 3.1, 3.83, 3.18, 0.12, 0.72, 0.13);
        brace.rotation.z = side * -0.68;
        a.box(roof, trim, side * 3.72, 3.88, 3.18, 0.68, 0.12, 0.13);
      }
    }
  }
  // Shopfront windows, recessed door and continuous weather canopy keep the scale human.
  namedWindow(a, g, 'front-window-left', -2.15, 2.15, 3.22, 2.2, 1.8);
  namedWindow(a, g, 'front-window-right', 2.15, 2.15, 3.22, 2.2, 1.8);
  if (id === 'bookshop') namedWindow(a, g, 'front-gable-window', 0, 5.0, 3.53, 1.05, 0.82);
  a.box(g, '#5e594c', 0, 1.48, 3.25, 1.08, 2.65, 0.22);
  a.box(g, a.glass(), 0, 1.72, 3.38, 0.65, 1.75, 0.04);
  a.sphere(g, '#c3a16a', 0.37, 1.52, 3.42, 0.055);
  const valance = a.box(g, surface(a, 'wood', profile.awningColor), 0, 3.25, 3.62, 6.2, 0.16, 1.02);
  valance.rotation.x = 0.05;
  for (const awningX of [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5])
    a.box(
      g,
      awningX % 2 ? profile.trimColor : profile.awningColor,
      awningX,
      3.05,
      3.98,
      0.92,
      0.35,
      0.12,
    );
  const sign = a.box(g, profile.trimColor, 0, 4.02, 3.3, 3.35, 0.72, 0.18);
  sign.name = 'street-sign';
  a.box(
    g,
    lead
      ? signAccent(
          id === 'bakery' ? 'bakery-row' : id === 'bookshop' ? 'bookshop-row' : 'market-row',
        )
      : profile.accentColor,
    0,
    4.02,
    3.42,
    2.45,
    0.12,
    0.035,
  );
  // A small emblem makes each shop legible without bitmap fonts or remote assets.
  if (id === 'bakery') {
    a.sphere(g, '#bd875e', -1.85, 4.04, 3.34, 0.16, 0.11, 0.04);
    a.sphere(g, '#ead2aa', -1.85, 4.05, 3.39, 0.06, 0.025, 0.015);
  } else if (id === 'bookshop') {
    for (const [index, color] of ['#75856b', '#c7ae7f', '#a46d57'].entries())
      a.box(g, color, -1.94 + index * 0.18, 4.04, 3.37, 0.13, 0.28 + index * 0.03, 0.045);
  } else {
    a.sphere(g, '#809267', -1.88, 4.04, 3.36, 0.09, 0.19, 0.04);
    a.sphere(g, '#bd875e', -1.68, 4.04, 3.36, 0.1, 0.13, 0.04);
  }
  for (const side of [-1, 1]) {
    const post = a.box(g, profile.trimColor, side * 3.15, 2.55, 3.75, 0.15, 1.35, 0.15);
    post.castShadow = false;
    a.box(g, profile.trimColor, side * 3.15, 3.18, 3.35, 0.68, 0.12, 0.12);
  }
  namedWindow(a, g, 'side-window-left', -4.51, 2.18, -1.55, 1.2, 1.28, -Math.PI / 2);
  namedWindow(a, g, 'side-window-left-rear', -4.51, 2.18, 1.48, 1.2, 1.28, -Math.PI / 2);
  namedWindow(a, g, 'side-window-right', 4.51, 2.18, -1.55, 1.2, 1.28, Math.PI / 2);
  namedWindow(a, g, 'side-window-right-rear', 4.51, 2.18, 1.48, 1.2, 1.28, Math.PI / 2);
  namedWindow(a, g, 'rear-window-left', -2.1, 2.15, -3.22, 1.65, 1.35, Math.PI);
  namedWindow(a, g, 'rear-window-right', 2.1, 2.15, -3.22, 1.65, 1.35, Math.PI);
  a.box(g, profile.trimColor, 0, 0.55, -3.24, 9.05, 0.16, 0.16);
  if (id === 'market') {
    for (const [i, color] of ['#a98262', '#9b7756', '#bca476'].entries())
      a.box(g, color, -3.3 + i * 0.78, 0.64, 3.73, 0.65, 0.45, 0.44);
  }
  for (const dx of [-3.5, 3.5]) {
    a.cylinder(g, '#8c7458', dx, 0.52, 3.65, 0.2, 0.65);
    shrub(a, g, dx, 3.65, 0.35, true, Math.round(dx + x + 340));
  }
  return g;
}

function buildMainStreet(set: PieceSet, choice: string) {
  const row = part(set, 'shop-bakery');
  part(set, 'shop-bookshop');
  part(set, 'shop-market');
  const beds = part(set, 'frontage-gardens');
  const [bakeryOffset, bookshopOffset, marketOffset] = CITY_SITE_PLAN.shopOffsets;
  storefront(set.a, row, bakeryOffset, 'bakery', choice === 'bakery-row');
  storefront(
    set.a,
    set.pieces.get('shop-bookshop')!,
    bookshopOffset,
    'bookshop',
    choice === 'bookshop-row',
  );
  storefront(
    set.a,
    set.pieces.get('shop-market')!,
    marketOffset,
    'market',
    choice === 'market-row',
  );
  // Shared beds and lamps sit between doorways instead of breaking the walks to the street.
  for (const [index, x] of [-5.5, 5.5].entries()) {
    gardenBed(set.a, beds, x, 4.8, 2.8, 0.82, 2001 + index);
    set.a.lantern(beds, x, 2.6, 6.7, true, false);
  }
}

function buildLibrary(set: PieceSet, choice: string) {
  const foundation = part(set, 'library-foundation');
  const walls = part(set, 'library-walls');
  const roof = part(set, 'library-roof');
  const garden = part(set, 'library-garden');
  const a = set.a;
  const wallColor =
    choice === 'brick-library' ? '#9f6954' : choice === 'timber-library' ? '#a58661' : '#c8c5ad';
  const trim = choice === 'garden-library' ? '#e6dfce' : '#e2d7c1';
  a.box(foundation, surface(a, 'stone', '#928d7f'), 0, 0.32, 0, 12.4, 0.64, 10.4);
  const wallFinish =
    choice === 'brick-library' ? 'brick' : choice === 'timber-library' ? 'wood' : 'siding';
  const wall = surface(a, wallFinish, wallColor);
  a.box(walls, wall, 0, 2.75, 0, 11.8, 4.2, 9.8);
  gablePanel(a, walls, 11.8, 2.35, 4.72, 5.365, wall);
  gablePanel(a, walls, 11.8, 2.35, 4.72, -5.365, wall, true);
  namedWindow(a, walls, 'library-gable-window', 0, 5.68, 5.43, 0.82, 0.72);
  a.box(walls, trim, 0, 0.76, 4.96, 11.8, 0.14, 0.18);
  a.box(walls, '#e4ddcd', 0, 4.85, 4.95, 12, 0.16, 0.18);
  for (const x of [-4.25, -1.55, 1.55, 4.25]) a.window(walls, x, 2.62, 4.97, 1.65, 2.05);
  a.box(walls, '#5c564b', 0, 1.75, 5.03, 1.36, 3.25, 0.22);
  a.box(walls, a.glass(), 0, 2.0, 5.18, 0.87, 1.8, 0.035);
  for (const x of [-2.5, 2.5]) a.box(walls, '#eee7d9', x, 1.55, 6.1, 0.18, 3.0, 0.18);
  a.box(walls, '#d9ceb8', 0, 3.45, 5.45, 6.0, 0.2, 2.15);
  a.roof(roof, 13.1, 10.7, 2.35, 4.72, surface(a, 'shingles', '#565e59'));
  a.box(roof, '#d0c4aa', 0, 4.8, -4.9, 11.8, 0.13, 0.15);
  for (const x of [-1.1, 1.1]) {
    a.box(roof, '#776b56', x, 5.45, 5.2, 0.18, 0.82, 0.18);
    a.box(roof, '#776b56', x, 5.89, 5.2, 0.76, 0.12, 0.18);
  }
  a.box(roof, '#c1ae83', 0, 5.58, 6.2, 3.15, 0.78, 0.14);
  a.box(roof, '#77684f', 0, 5.58, 6.31, 1.8, 0.11, 0.04);
  for (const [x, z, kind] of [
    [-7, -4, 'evergreen'],
    [7, -4, 'oak'],
    [-7, 4, 'flowering'],
    [7, 4, 'birch'],
  ] as const)
    plantTree(a, garden, x, z, 0.66, kind, x * 13 + z * 3 + 19);
  for (const x of [-5.5, 5.5]) {
    gardenBed(a, garden, x, 5.4, 2.6, 1.05, x * 29 + 201);
    a.lantern(garden, x, 1.9, 6.5, true, false);
  }
  a.bench(garden, 0, 7.7, Math.PI);
}

function smallFountain(a: AssetLibrary, parent: T.Object3D, x: number, z: number) {
  a.cylinder(parent, '#96958a', x, 0.38, z, 1.15, 0.4);
  a.cylinder(parent, '#c2bca9', x, 0.62, z, 1.0, 0.13);
  const lower = a.cylinder(parent, surface(a, 'water', '#6d9fa0'), x, 0.69, z, 0.84, 0.035);
  const upper = a.cylinder(parent, surface(a, 'water', '#7eaaab'), x, 1.32, z, 0.43, 0.025);
  lower.userData['ambientBaseY'] = lower.position.y;
  upper.userData['ambientBaseY'] = upper.position.y;
  a.animatedWater.push(lower, upper);
  a.cylinder(parent, '#aaa594', x, 0.95, z, 0.19, 0.58);
  a.cylinder(parent, '#d0c9b4', x, 1.24, z, 0.6, 0.12);
  a.sphere(parent, '#85afb0', x, 1.48, z, 0.1, 0.22, 0.1);
}

function buildPlaza(set: PieceSet, choice: string) {
  const paving = part(set, 'square-paving');
  const feature = part(set, 'square-feature');
  const planting = part(set, 'square-planting');
  const seating = part(set, 'square-seating');
  const a = set.a;
  a.box(paving, surface(a, 'paving', '#b7b09e'), 0, 0.11, 0, 22, 0.14, 18);
  a.box(paving, '#c8c1ae', 0, 0.2, 0, 19.6, 0.08, 15.6);
  for (const x of [-8, -4, 0, 4, 8]) a.box(paving, '#a79f8f', x, 0.25, 0, 0.035, 0.018, 15.2);
  for (const z of [-6, -3, 3, 6]) a.box(paving, '#a79f8f', 0, 0.25, z, 19.2, 0.018, 0.035);
  if (choice === 'square-fountain') {
    smallFountain(a, feature, 0, 0);
  } else if (choice === 'square-clock') {
    a.box(feature, '#8b8068', 0, 2.15, 0, 1.25, 4.3, 1.25);
    a.box(feature, '#d4c5a6', 0, 4.48, 0, 2.3, 0.35, 2.3);
    const cap = a.roof(feature, 2.4, 2.4, 1.35, 4.65, '#596158');
    cap.rotation.y = Math.PI / 4;
    for (const direction of [-1, 1]) {
      a.cylinder(feature, '#e7dcc4', direction * 0.67, 3.0, 0, 0.58, 0.045);
      a.box(feature, '#58594e', direction * 0.67, 3.0, 0.06, 0.035, 0.36, 0.03);
      a.box(feature, '#58594e', direction * 0.67 + 0.1, 3.0, 0.06, 0.22, 0.03, 0.03);
    }
    a.box(feature, '#8b8068', 0, 5.45, 0, 0.22, 1.3, 0.22);
  } else {
    for (const x of [-4.5, 4.5])
      for (const z of [-2.6, 2.6]) a.box(feature, '#8f704d', x, 1.75, z, 0.16, 3.5, 0.16);
    a.box(feature, '#b0956f', 0, 3.52, 0, 10.0, 0.18, 5.8);
    for (let x = -4; x <= 4; x += 1.2) a.box(feature, '#8f704d', x, 3.68, 0, 0.1, 0.13, 5.7);
    a.bench(feature, 0, -0.8, Math.PI);
  }
  for (const [i, [x, z]] of [
    [-8.2, -6.1],
    [8.2, -6.1],
    [-8.2, 6.1],
    [8.2, 6.1],
  ].entries()) {
    plantTree(
      a,
      planting,
      x,
      z,
      i % 2 ? 0.72 : 0.8,
      i === 1 ? 'evergreen' : i === 2 ? 'flowering' : 'oak',
      2201 + i * 5,
    );
    gardenBed(a, planting, x * 0.72, z * 0.72, 3.2, 1.0, 2231 + i);
    a.lantern(planting, x * 0.68, 2.0, z * 0.68, true, false);
  }
  for (const [x, z, rotation] of [
    [-7, 0, Math.PI / 2],
    [7, 0, -Math.PI / 2],
    [0, 7, Math.PI],
  ] as const)
    a.bench(seating, x, z, rotation);
}

function buildGreenway(set: PieceSet, choice: string) {
  const path = part(set, 'greenway-path');
  const groves = part(set, 'greenway-groves');
  const beds = part(set, 'greenway-garden-beds');
  const a = set.a;
  a.box(path, surface(a, 'grass', '#78875e'), 0, 0.08, 0, 20, 0.1, 18);
  a.box(path, surface(a, 'paving', '#beb8a6'), 0, 0.16, 0, 2.4, 0.1, 17.2);
  for (let z = -7; z <= 7; z += 2.4) a.box(path, '#d0cab8', 0, 0.23, z, 2.1, 0.035, 0.08);
  const types =
    choice === 'oak-grove'
      ? (['oak', 'evergreen', 'oak', 'birch'] as const)
      : choice === 'rain-garden'
        ? (['birch', 'evergreen', 'oak', 'flowering'] as const)
        : (['flowering', 'birch', 'oak', 'flowering'] as const);
  for (const [i, [x, z]] of [
    [-7.1, -5.7],
    [7.1, -5.7],
    [-7.1, 5.7],
    [7.1, 5.7],
  ].entries()) {
    plantTree(a, groves, x, z, 0.68 + (i % 2) * 0.1, types[i], 2401 + i * 13);
    shrub(a, beds, x * 0.69, z * 0.72, 0.5, true, 2441 + i * 7);
  }
  for (const x of [-5.5, 5.5]) gardenBed(a, beds, x, 0, 3.0, 2.0, 2481 + x);
  if (choice === 'rain-garden') {
    const basin = a.box(beds, '#76999a', 0, 0.12, -6.5, 3.0, 0.035, 2.1);
    basin.userData['ambientBaseY'] = basin.position.y;
    a.animatedWater.push(basin);
    for (const z of [-7.5, -5.5])
      for (const x of [-1.2, 1.2]) a.box(beds, '#a7ae8c', x, 0.2, z, 0.28, 0.19, 0.28);
  }
  for (const x of [-8.5, 8.5]) {
    a.bench(beds, x, 0, x < 0 ? Math.PI / 2 : -Math.PI / 2);
    a.lantern(beds, x, 1.9, -1.9, true, false);
  }
}

function projectDefinition(projectId: CityProjectId): Project {
  return CHAPTER_THREE_PROJECTS.find((project) => project.id === projectId)!;
}

export function buildCityProject(
  a: AssetLibrary,
  parent: T.Group,
  projectId: CityProjectId,
  choiceId: string,
): MilestoneAsset {
  const project = projectDefinition(projectId);
  if (!project.choices.some((choice) => choice.id === choiceId))
    throw new Error(`Unknown Town Center project or design: ${projectId}/${choiceId}`);
  const site = CITY_SITE_PLAN.projects.find((candidate) => candidate.id === projectId)!;
  const set = makeSet(
    a,
    parent,
    projectId,
    [
      CITY_SITE_PLAN.origin[0] + site.position[0],
      CITY_SITE_PLAN.origin[1] + site.position[1],
      CITY_SITE_PLAN.origin[2] + site.position[2],
    ],
    site.rotation,
  );
  switch (projectId) {
    case 'city-main-street':
      buildMainStreet(set, choiceId);
      break;
    case 'city-library':
      buildLibrary(set, choiceId);
      break;
    case 'city-plaza':
      buildPlaza(set, choiceId);
      break;
    case 'city-greenway':
      buildGreenway(set, choiceId);
      break;
  }
  const focus = {
    x: CITY_SITE_PLAN.origin[0] + site.position[0] - -5,
    z: CITY_SITE_PLAN.origin[2] + site.position[2] - -4.6,
    zoom: projectId === 'city-main-street' ? 0.58 : 0.72,
    ...(projectId === 'city-main-street' ? { angle: (Math.PI * 7) / 4 } : {}),
  };
  return finish(set, focus, 3300);
}

function roadRibbonGeometry(points: readonly (readonly [number, number])[], width: number) {
  const curve = new T.CatmullRomCurve3(
    points.map(([x, z]) => new T.Vector3(x, 0, z)),
    false,
    'centripetal',
    0.5,
  );
  const vertices: number[] = [];
  const indices: number[] = [];
  const segments = 110;
  for (let index = 0; index <= segments; index++) {
    const point = curve.getPointAt(index / segments);
    const tangent = curve.getTangentAt(index / segments);
    const nx = tangent.z;
    const nz = -tangent.x;
    vertices.push(point.x - (nx * width) / 2, point.y, point.z - (nz * width) / 2);
    vertices.push(point.x + (nx * width) / 2, point.y, point.z + (nz * width) / 2);
    if (index < segments) {
      const start = index * 2;
      indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function pathRibbon(
  a: AssetLibrary,
  parent: T.Group,
  segment: CityPathSegment,
  originX = 0,
  originZ = 0,
) {
  const [x1, z1] = segment.from;
  const [x2, z2] = segment.to;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  const geometry = new T.BoxGeometry(length, 0.12, segment.width);
  const mesh = a.mesh(
    parent,
    geometry,
    surface(a, 'paving', '#bdb7a4'),
    originX + (x1 + x2) / 2,
    0.14,
    originZ + (z1 + z2) / 2,
  );
  mesh.rotation.y = Math.atan2(-dz, dx);
  mesh.castShadow = false;
}

function streetRectangle(
  a: AssetLibrary,
  parent: T.Object3D,
  material: T.Material | string,
  start: readonly [number, number],
  end: readonly [number, number],
  width: number,
  y: number,
  height: number,
) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz);
  const group = a.group(parent, (start[0] + end[0]) / 2, 0, (start[1] + end[1]) / 2);
  group.rotation.y = Math.atan2(-dz, dx);
  const mesh = a.box(group, material, 0, y, 0, length, height, width);
  mesh.castShadow = false;
  return { group, length };
}

/** A short Main Street and civic lane continue the existing neighborhood road in one scene. */
export function buildCityInfrastructure(a: AssetLibrary, parent: T.Group): T.Group {
  const root = a.group(
    parent,
    CITY_SITE_PLAN.origin[0],
    CITY_SITE_PLAN.origin[1],
    CITY_SITE_PLAN.origin[2],
  );
  root.name = 'town-center-infrastructure';
  const roads = a.group(root);
  roads.name = 'connected-road-and-sidewalk-grid';
  const paving = a.group(root);
  paving.name = 'public-pedestrian-links';
  const landscape = a.group(root);
  landscape.name = 'town-center-verge-gardens';
  const roadMaterial = a.namedMaterial(
    'town-center-asphalt',
    () => new T.MeshStandardMaterial({ color: '#777e78', roughness: 0.96 }),
  );
  const asphaltConnector = a.mesh(
    roads,
    a.geometry(
      roadRibbonGeometry(CITY_SITE_PLAN.streets.connectorPoints, CITY_SITE_PLAN.streets.roadWidth),
    ),
    roadMaterial,
    0,
    0.245,
    0,
  );
  asphaltConnector.name = 'chapter-two-road-connector';
  asphaltConnector.castShadow = false;
  const roadEdge = CITY_SITE_PLAN.streets.roadWidth / 2;
  for (const segment of CITY_SITE_PLAN.streets.roadSegments) {
    const { group, length } = streetRectangle(
      a,
      roads,
      roadMaterial,
      segment.from,
      segment.to,
      CITY_SITE_PLAN.streets.roadWidth,
      0.245,
      0.08,
    );
    const yaw = Math.atan2(-(segment.to[1] - segment.from[1]), segment.to[0] - segment.from[0]);
    for (const side of [-1, 1]) {
      const offset = side * (roadEdge + 0.09);
      const curb = a.box(
        group,
        surface(a, 'stone', '#b8b4a2'),
        0,
        0.27,
        offset,
        length,
        0.16,
        0.18,
      );
      curb.rotation.y = yaw;
      const sidewalkOffset = side * CITY_SITE_PLAN.streets.sidewalkOffset;
      const sidewalk = a.box(
        group,
        surface(a, 'paving', '#c6c0ad'),
        0,
        0.29,
        sidewalkOffset,
        length,
        0.14,
        CITY_SITE_PLAN.streets.sidewalkWidth,
      );
      sidewalk.rotation.y = yaw;
      sidewalk.castShadow = false;
      for (let distance = 3.5; distance < length - 1; distance += 3.5) {
        const seam = a.box(
          group,
          '#aaa693',
          distance - length / 2,
          0.365,
          sidewalkOffset,
          0.025,
          0.012,
          CITY_SITE_PLAN.streets.sidewalkWidth - 0.07,
        );
        seam.rotation.y = yaw;
      }
    }
  }
  for (let z = -32; z <= 32; z += 8) a.box(roads, '#d5d0b9', 0, 0.3, z, 1.25, 0.015, 0.07);
  // Warm, restrained lamps frame the shop approach and the civic-lane entry.
  for (const [x, z] of [
    [4.9, -26],
    [4.9, 24],
    [18, 8.1],
    [18, 16],
  ] as const)
    a.lantern(roads, x, 2.8, z);
  const vergeTrees: readonly (readonly [
    number,
    number,
    'oak' | 'birch' | 'evergreen' | 'flowering',
  ])[] = [
    [-20, 23, 'evergreen'],
    [-20, -25, 'birch'],
    [20, -25, 'oak'],
    [45, -7, 'flowering'],
    [45, 20, 'evergreen'],
  ];
  for (const [i, [x, z, kind]] of vergeTrees.entries()) {
    plantTree(a, landscape, x, z, 0.76 + (i % 3) * 0.06, kind, 2551 + i * 9);
    shrub(a, landscape, x + (i % 2 ? 1.7 : -1.7), z + 0.55, 0.45, true, 2611 + i);
  }
  // The transition gardens visually carry the road from the last homes into Main Street.
  for (const [index, garden] of CITY_SITE_PLAN.transitionGardens.entries()) {
    plantTree(a, landscape, garden.position[0], garden.position[2], 0.72, garden.kind, garden.seed);
    gardenBed(
      a,
      landscape,
      garden.position[0] + (index ? -2 : 2),
      garden.position[2],
      3.2,
      0.9,
      garden.seed + 3,
    );
  }
  for (const segment of CITY_SITE_PLAN.pedestrianPaths) pathRibbon(a, paving, segment);
  batchStatic(root, (geometry) => a.geometry(geometry));
  root.userData['staticBatchBoundary'] = true;
  return root;
}

export interface MovingMonorail {
  root: T.Group;
  readonly trainCount: 2;
}

function station(set: PieceSet, parent: T.Group, stationId: string, choice: string) {
  const stationPlan = CITY_MONORAIL_PLAN.stations.find((entry) => entry.id === stationId)!;
  const group = set.a.group(parent, ...stationPlan.position);
  group.name = stationId;
  const a = set.a;
  const timber = choice === 'sage-stone' ? '#887a62' : '#9a744d';
  const wall = choice === 'cream-copper' ? '#d9d1bf' : '#b8af9b';
  const metal =
    choice === 'timber-brass' ? '#ad8958' : choice === 'sage-stone' ? '#777f74' : '#b37c5c';
  // The platform is paired so the single central guide beam remains clearly visible.
  for (const side of [-1, 1]) {
    a.box(group, surface(a, 'stone', '#bcb5a3'), side * 2.45, 12.0, 0, 17, 0.5, 2.4);
    a.box(group, wall, side * 2.45, 12.32, 0, 17.2, 0.1, 2.55);
    for (const z of [-6.4, -2.2, 2.2, 6.4])
      a.box(group, timber, side * 5.25, 13.55, z, 0.14, 3.1, 0.14);
    a.box(group, metal, side * 5.25, 15.1, 0, 0.34, 0.13, 14.2);
    a.box(group, wall, side * 5.25, 15.45, 0, 3.8, 0.42, 15.4);
    a.box(group, wall, side * 5.25, 15.68, 0, 3.2, 0.08, 14.8);
    for (const z of [-4.6, 0, 4.6]) a.lantern(group, side * 4.3, 14.3, z, false, false);
  }
  // Lift core plus switchback stairs form a readable ground entrance without passenger simulation.
  a.box(group, wall, 0, 6.1, 8.25, 2.5, 12.2, 2.5);
  a.box(group, '#78918c', 0, 6.0, 9.53, 1.4, 10.8, 0.08);
  a.box(group, metal, 0, 12.25, 8.25, 3.1, 0.23, 3.1);
  for (let flight = 0; flight < 4; flight++) {
    const side = flight % 2 ? 1 : -1;
    const yStart = flight * 2.95;
    const z = 4.2 - flight * 2.65;
    const run = a.box(group, timber, side * 3.2, yStart + 1.45, z, 1.15, 0.26, 5.5);
    run.rotation.x = -0.48;
    for (let step = 0; step < 12; step++) {
      const stepZ = z - 2.55 + step * 0.46;
      a.box(group, '#b8aa91', side * 3.2, yStart + 0.2 + step * 0.22, stepZ, 1.25, 0.07, 0.4);
    }
    a.box(group, wall, side * 3.2, yStart + 2.95, z, 1.45, 0.2, 1.4);
  }
  a.box(group, '#78674f', 0, 15.96, 0, 1.0, 0.12, 15.5);
}

function trainCoach(a: AssetLibrary, parent: T.Group, body: string, trim: string) {
  const coach = a.group(parent, 0, -1.75, 0);
  a.box(coach, '#555f5d', 0, -0.12, 0, 2.7, 0.35, 6.8);
  a.box(coach, body, 0, -1.05, 0, 2.65, 1.5, 6.4);
  a.box(coach, trim, 0, -0.24, 0, 2.72, 0.12, 6.55);
  a.box(coach, '#d9d3c3', 0, -0.31, 3.15, 1.85, 0.72, 0.06);
  a.box(coach, '#d9d3c3', 0, -0.31, -3.15, 1.85, 0.72, 0.06);
  for (const side of [-1, 1]) {
    for (const z of [-2.0, 0, 2.0]) {
      a.box(coach, a.glass(), side * 1.34, -0.92, z, 0.035, 0.62, 1.2);
      a.box(coach, trim, side * 1.37, -0.92, z, 0.045, 0.075, 1.32);
    }
    a.box(coach, trim, side * 1.35, -1.75, 0, 0.11, 0.08, 6.45);
  }
  for (const z of [-2.35, 2.35]) {
    a.box(coach, '#525c59', 0, 0.02, z, 0.26, 1.4, 0.26);
    a.box(coach, '#525c59', 0, 0.68, z, 1.1, 0.17, 0.56);
  }
  return coach;
}

export function buildMonorailProject(
  a: AssetLibrary,
  parent: T.Group,
  choiceId: string,
): MilestoneAsset & { movingMonorail: MovingMonorail } {
  const project = CHAPTER_FOUR_PROJECTS.find((candidate) => candidate.id === 'monorail')!;
  if (!project.choices.some((choice) => choice.id === choiceId))
    throw new Error(`Unknown elevated monorail design: ${choiceId}`);
  const set = makeSet(a, parent, 'monorail', CITY_MONORAIL_PLAN.origin);
  const supports = part(set, 'supports');
  const guideway = part(set, 'guideway');
  const stations = part(set, 'stations');
  const train = part(set, 'train');
  train.userData['staticBatchBoundary'] = true;
  const supportColor = choiceId === 'sage-stone' ? '#8a9185' : '#898b83';
  const beamColor = choiceId === 'cream-copper' ? '#a58a70' : '#858b83';
  for (let index = 0; index < CITY_MONORAIL_PLAN.supportCount; index++) {
    const point = monorailSupportPoint(index);
    const frame = monorailPoseAt(index / CITY_MONORAIL_PLAN.supportCount);
    a.box(
      supports,
      supportColor,
      point.x,
      CITY_MONORAIL_PLAN.trackY / 2,
      point.z,
      0.55,
      CITY_MONORAIL_PLAN.trackY - 0.42,
      0.55,
    );
    const cap = a.box(
      supports,
      '#a5a395',
      point.x,
      CITY_MONORAIL_PLAN.trackY - 0.42,
      point.z,
      1.62,
      0.55,
      1.48,
    );
    cap.rotation.y = Math.atan2(frame.tangent.x, frame.tangent.z);
  }
  const curve = new T.CatmullRomCurve3(
    CITY_MONORAIL_PLAN.points.map(([x, z]) => new T.Vector3(x, CITY_MONORAIL_PLAN.trackY, z)),
    true,
    'centripetal',
    0.5,
  );
  const beam = a.mesh(
    guideway,
    a.geometry(
      new T.TubeGeometry(
        curve,
        CITY_MONORAIL_PLAN.supportCount * 8,
        CITY_MONORAIL_PLAN.trackRadius,
        5,
        true,
      ),
    ),
    surface(a, 'stone', beamColor),
    0,
    0,
    0,
  );
  beam.name = 'single-elevated-monorail-guide-beam';
  beam.castShadow = true;
  for (const stationPlan of CITY_MONORAIL_PLAN.stations)
    station(set, stations, stationPlan.id, choiceId);
  const approach = part(set, 'station-approaches');
  const stationOne = CITY_MONORAIL_PLAN.stations[0];
  const stationOneStart: [number, number] = [
    stationOne.position[0] + stationOne.entry[0],
    stationOne.position[2] + stationOne.entry[2],
  ];
  const sidewalkEnd: [number, number] = [-64, 10.02];
  const stationTwo = CITY_MONORAIL_PLAN.stations[1];
  const stationTwoStart: [number, number] = [
    stationTwo.position[0] + stationTwo.entry[0],
    stationTwo.position[2] + stationTwo.entry[2],
  ];
  const greenwayEnd: [number, number] = [72, 37];
  for (const [start, end] of [
    [stationOneStart, sidewalkEnd],
    [stationTwoStart, greenwayEnd],
  ] as const) {
    const segment: CityPathSegment = {
      id: 'station-approach',
      from: start,
      to: end,
      width: 1.7,
    };
    pathRibbon(a, approach, segment, CITY_MONORAIL_PLAN.origin[0], CITY_MONORAIL_PLAN.origin[2]);
  }
  const body =
    choiceId === 'timber-brass' ? '#a77756' : choiceId === 'sage-stone' ? '#9eaa9a' : '#d2c7af';
  const trim = choiceId === 'cream-copper' ? '#a97859' : '#d6c6a2';
  const coachOne = a.group(train, 0, 0, 0);
  trainCoach(a, coachOne, body, trim);
  const coachTwo = a.group(train, 0, 0, -7.8);
  trainCoach(a, coachTwo, body, trim);
  train.traverse((object) => {
    if (object instanceof T.Mesh) object.castShadow = false;
  });
  const initialPose = monorailPoseAt(0.11);
  train.position.copy(initialPose.position);
  train.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), initialPose.tangent);
  train.userData['trainProgress'] = 0.11;
  const focus = {
    x: CITY_MONORAIL_PLAN.origin[0] - -5,
    z: CITY_MONORAIL_PLAN.origin[2] - -4.6,
    zoom: 0.32,
  };
  const result = finish(set, focus, 4800, ['train']);
  return { ...result, movingMonorail: { root: train, trainCount: 2 } };
}

export function buildCityProjectForWorld(
  a: AssetLibrary,
  parent: T.Group,
  projectId: string,
  choiceId: string,
): MilestoneAsset | undefined {
  if (CHAPTER_THREE_PROJECTS.some((project) => project.id === projectId))
    return buildCityProject(a, parent, projectId as CityProjectId, choiceId);
  if (projectId === 'monorail') return buildMonorailProject(a, parent, choiceId);
  return undefined;
}

export function cityAssetProject(id: string): Project | undefined {
  return [...CHAPTER_THREE_PROJECTS, ...CHAPTER_FOUR_PROJECTS].find((project) => project.id === id);
}
