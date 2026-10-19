import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AssemblyPieceRecipe, AssemblyRecipe } from './assembly';
import type { AssetLibrary } from './assets';
import { batchStatic } from './batching';
import { buildBackyard } from './backyards';
import { PROJECTS } from '../domain/progression';
import { flower, plantTree, shrub } from './landscaping';
import { PORCH_DECK_TOP_Y } from './residential';
import { surface } from './surfaces';

export interface FeatureZone {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Metre-scale reservations around the Phase 3 home and driveway anchors. */
export const FEATURE_ZONES: Readonly<Record<string, FeatureZone>> = {
  frontGarden: { id: 'frontGarden', minX: -12.45, maxX: -9.25, minZ: -0.2, maxZ: 1.2 },
  centerpiece: { id: 'centerpiece', minX: -12.45, maxX: -9.7, minZ: -5.0, maxZ: -2.8 },
  backyard: { id: 'backyard', minX: -12.72, maxX: -8.72, minZ: -11.82, maxZ: -7.48 },
  porch: { id: 'porch', minX: -7.7, maxX: -2.35, minZ: -2.72, maxZ: -1.28 },
  retreat: { id: 'retreat', minX: -7.5, maxX: -2.85, minZ: -11.82, maxZ: -8.72 },
  gardenExpansion: {
    id: 'gardenExpansion',
    minX: -12.55,
    maxX: -9.9,
    minZ: -2.55,
    maxZ: -0.3,
  },
  boundary: { id: 'boundary', minX: -12.85, maxX: 1.15, minZ: -12.2, maxZ: 1.3 },
  outdoorLighting: { id: 'outdoorLighting', minX: -12.8, maxX: 0.85, minZ: -11.8, maxZ: 1.15 },
  signature: { id: 'signature', minX: -10.92, maxX: -8.78, minZ: -7.3, maxZ: -5.2 },
};

export interface MilestoneAsset {
  root: T.Group;
  pieces: ReadonlyMap<string, T.Group>;
  /** Stable geometry groups that are not animated assembly pieces (for plot ownership bindings). */
  renderObjects?: ReadonlyMap<string, T.Group>;
  recipe: AssemblyRecipe;
  focus: { x: number; z: number; zoom: number; angle?: number };
}

const COLOR = {
  rose: '#a85650',
  orange: '#d2874e',
  blue: '#8298ad',
  timber: '#99734d',
  stone: '#b6ad98',
  darkStone: '#88877d',
  water: '#62a3aa',
  warm: '#f2c77b',
};

type PieceSet = {
  root: T.Group;
  pieces: Map<string, T.Group>;
  a: AssetLibrary;
};

function part(set: PieceSet, id: string): T.Group {
  const group = set.a.group(set.root);
  group.name = id;
  set.pieces.set(id, group);
  return group;
}

function tile(
  a: AssetLibrary,
  p: T.Object3D,
  x: number,
  z: number,
  w: number,
  d: number,
  color: string,
) {
  a.box(p, surface(a, 'stone', color), x, 0.13, z, w, 0.12, d);
}

function flowerRow(
  a: AssetLibrary,
  p: T.Object3D,
  x: number,
  z: number,
  count: number,
  spacing: number,
  flowerColor: string,
  seed: number,
) {
  for (let i = 0; i < count; i++) {
    const px = x + (i - (count - 1) / 2) * spacing;
    shrub(a, p, px, z, 0.29 + (i % 2) * 0.04, true, seed + i);
    flower(a, p, px + (i % 2 ? 0.11 : -0.1), 0.51, z + (i % 2 ? 0.12 : -0.1), flowerColor, 0.095);
  }
}

function planter(a: AssetLibrary, p: T.Object3D, x: number, z: number, color: string) {
  a.cylinder(p, '#9b7753', x, 0.33, z, 0.28, 0.42);
  a.cylinder(p, '#806247', x, 0.55, z, 0.31, 0.08);
  shrub(a, p, x, z, 0.26, true, Math.round((x + z + 12) * 13));
  flower(a, p, x + 0.12, 0.85, z - 0.1, color, 0.1);
}

function createSet(a: AssetLibrary, parent: T.Group, id: string): PieceSet {
  const root = a.group(parent);
  root.name = `project-asset:${id}`;
  root.userData['staticBatchBoundary'] = true;
  return { root, pieces: new Map(), a };
}

function recipeFor(pieces: Map<string, T.Group>, durationMs: number): AssemblyRecipe {
  const entries: AssemblyPieceRecipe[] = [...pieces.keys()].map((id, order) => ({
    id,
    order,
    durationMs,
    dropHeight: 1.3 + (order % 3) * 0.35,
  }));
  return {
    pieces: entries,
    config: { durationMs, staggerMs: 190, concurrency: 2, settleMeters: 0.035 },
  };
}

function frontGarden(set: PieceSet, choice: string) {
  const { a } = set;
  const bed = part(set, 'bed-and-edging');
  const plants = part(set, 'flowering-composition');
  const details = part(set, 'garden-details');
  const x = -10.85,
    z = 0.42,
    color = choice === 'roses' ? COLOR.rose : choice === 'orange' ? COLOR.orange : COLOR.blue;
  a.box(bed, '#6d593e', x, 0.12, z, 2.8, 0.12, 0.94);
  for (const side of [-1, 1]) {
    a.box(bed, COLOR.stone, x, 0.18, z + side * 0.48, 2.95, 0.13, 0.11);
    a.box(bed, COLOR.stone, x + side * 1.43, 0.18, z, 0.11, 0.13, 0.94);
  }
  for (let i = 0; i < 5; i++) {
    const px = x - 1.06 + i * 0.53;
    shrub(a, plants, px, z, 0.39 + (i % 2) * 0.04, true, 71 + i);
    for (const dz of [-0.18, 0.12])
      flower(a, plants, px + (i % 2 ? -0.13 : 0.12), 0.56, z + dz, color, 0.105);
  }
  for (const offset of [-1.03, 0, 1.03]) tile(a, details, x + offset, 1.0, 0.28, 0.24, '#c2b9a4');
}

function centerpiece(set: PieceSet, choice: string) {
  const { a } = set;
  const ground = part(set, 'planted-base');
  const feature = part(set, 'stone-feature');
  const planting = part(set, 'soft-planting');
  const x = -11.12,
    z = -3.88;
  a.box(ground, '#6f6048', x, 0.13, z, 1.78, 0.13, 1.75);
  for (const side of [-1, 1]) {
    a.box(ground, '#b9aa8e', x, 0.22, z + side * 0.91, 1.85, 0.13, 0.1);
    a.box(ground, '#b9aa8e', x + side * 0.92, 0.22, z, 0.1, 0.13, 1.72);
  }
  if (choice === 'floweringTree') {
    plantTree(a, feature, x, z, 0.48, 'flowering', 97);
    a.cylinder(feature, '#796c51', x, 0.18, z, 0.29, 0.18);
  } else if (choice === 'fountain') {
    a.cylinder(feature, '#a7a492', x, 0.34, z, 0.72, 0.35);
    a.cylinder(feature, '#c3bda9', x, 0.56, z, 0.56, 0.12);
    a.cylinder(feature, COLOR.water, x, 0.63, z, 0.45, 0.035);
    a.cylinder(feature, '#a7a492', x, 0.91, z, 0.17, 0.62);
    a.cylinder(feature, '#c4beaa', x, 1.24, z, 0.39, 0.12);
    a.sphere(feature, COLOR.water, x, 1.34, z, 0.1, 0.16, 0.1);
  } else {
    a.cylinder(feature, '#aaa694', x, 0.46, z, 0.13, 0.66);
    a.cylinder(feature, '#c4beab', x, 0.77, z, 0.46, 0.13);
    a.cylinder(feature, COLOR.water, x, 0.84, z, 0.37, 0.025);
    a.cylinder(feature, '#c4beab', x, 0.91, z, 0.12, 0.1);
  }
  for (const dx of [-0.54, 0.54]) shrub(a, planting, x + dx, z + 0.53, 0.28, true, dx + 109);
  flowerRow(a, planting, x, z - 0.55, 3, 0.42, choice === 'fountain' ? '#d6c99a' : '#c78d91', 117);
}

function porch(set: PieceSet, choice: string, houseStyle: string) {
  const { a } = set;
  const wood = surface(a, 'wood', '#9b724d'),
    centerX = -5.35,
    frontZ = -1.66;
  const mat = part(set, 'porch-entry-mat');
  mat.position.y = PORCH_DECK_TOP_Y - 0.1;
  a.box(mat, surface(a, 'paving', '#b9ad97'), centerX, 0.13, -2.33, 1.55, 0.06, 0.78);
  for (const [id, x, color] of [
    ['porch-planter-left', -7.36, '#c6a18b'],
    ['porch-planter-right', -3.14, '#a7ad91'],
  ] as const) {
    const pot = part(set, id);
    pot.position.y = PORCH_DECK_TOP_Y - 0.12;
    pot.scale.set(0.85, 1, 0.85);
    planter(a, pot, x, -2.34, color);
  }
  const seat = (name: string, x: number, z = frontZ, y = PORCH_DECK_TOP_Y) => {
    const group = part(set, `porch-seat-${name}`);
    group.position.set(x, y, z);
    return group;
  };
  if (choice === 'rockingChairs') {
    for (const x of [-6.72, -3.4]) {
      const chair = seat(`rocker-${x < centerX ? 'left' : 'right'}`, x);
      a.box(chair, wood, 0, 0.47, 0, 0.58, 0.12, 0.55);
      const back = a.box(chair, wood, 0, 0.82, -0.24, 0.55, 0.65, 0.1);
      back.rotation.x = -0.12;
      for (const side of [-1, 1]) {
        a.box(chair, wood, side * 0.3, 0.6, 0, 0.07, 0.38, 0.5);
        const rocker = a.mesh(
          chair,
          a.cachedGeometry(
            'porch-rocker-arc',
            () => new T.TorusGeometry(0.2, 0.035, 5, 16, Math.PI),
          ),
          wood,
          side * 0.22,
          0.235,
          0,
          0.8,
          1,
          1,
        );
        rocker.rotation.z = Math.PI;
      }
    }
  } else if (choice === 'porchSwing') {
    const swingX = -6.72,
      swingSeat = seat('swing-left', swingX);
    a.box(swingSeat, wood, 0, 0.52, 0, 1.02, 0.15, 0.46);
    const back = a.box(swingSeat, wood, 0, 0.84, -0.2, 1.02, 0.5, 0.12);
    back.rotation.x = -0.08;
    const suspension = part(set, 'porch-swing-suspension'),
      roofAnchorY = houseStyle === 'cream' ? 2.92 : 2.86,
      ropeEndY = PORCH_DECK_TOP_Y + 0.595;
    suspension.userData['roofAnchorY'] = roofAnchorY;
    for (const x of [swingX - 0.36, swingX + 0.36]) {
      a.cylinder(
        suspension,
        '#50483c',
        x,
        (roofAnchorY + ropeEndY) / 2,
        frontZ - 0.09,
        0.022,
        roofAnchorY - ropeEndY,
      );
      a.box(suspension, '#6f5b44', x, roofAnchorY - 0.025, frontZ - 0.09, 0.1, 0.05, 0.09);
    }
  } else {
    const bench = seat('entry-bench', -6.65, -2.0);
    a.bench(bench, 0, 0, Math.PI / 2);
    bench.scale.z = 0.83;
    for (const [id, x] of [
      ['porch-entry-lantern-left', -5.95],
      ['porch-entry-lantern-right', -4.75],
    ] as const) {
      const lamp = part(set, id);
      lamp.position.y = PORCH_DECK_TOP_Y - 0.15;
      a.lantern(lamp, x, 0, -2.15, false, false);
    }
  }
}

function retreat(set: PieceSet, choice: string) {
  const { a } = set;
  const x = -5.18,
    z = -10.22,
    paving = surface(a, 'paving', '#b8ad96'),
    wood = surface(a, 'wood', '#98734e');
  const ground = part(set, 'retreat-patio-base');
  a.box(ground, paving, x, 0.13, z, 3.48, 0.12, 2.55);
  for (let row = 0; row < 3; row++) {
    const inlay = part(set, `retreat-patio-inlay-${row + 1}`);
    for (let xx = -1.4; xx <= 1.4; xx += 0.7)
      a.box(inlay, '#c8bea7', x + xx, 0.2, z - 0.65 + row * 0.65, 0.025, 0.018, 0.025);
  }
  if (choice === 'pergolaSeating') {
    for (const [index, [dx, dz]] of [
      [-1.32, -0.84],
      [-1.32, 0.84],
      [1.32, -0.84],
      [1.32, 0.84],
    ].entries()) {
      const post = part(set, `pergola-post-${index + 1}`);
      a.box(post, wood, x + dx, 1.42, z + dz, 0.15, 2.7, 0.15);
      a.box(post, '#b7a081', x + dx, 2.8, z + dz, 0.24, 0.12, 0.24);
    }
    for (const [index, dz] of [-0.87, 0.87].entries()) {
      const beam = part(set, `pergola-beam-${index + 1}`);
      a.box(beam, wood, x, 2.6, z + dz, 3, 0.17, 0.16);
    }
    for (let half = 0; half < 2; half++) {
      const slats = part(set, `pergola-roof-slats-${half + 1}`);
      for (let index = 0; index < 5; index++) {
        const dx = -1.4 + (half * 5 + index) * 0.35;
        a.box(slats, wood, x + dx, 2.68, z, 0.08, 0.1, 1.95);
      }
    }
    const bench = part(set, 'pergola-bench');
    a.bench(bench, x, z + 0.22, Math.PI);
    const table = part(set, 'pergola-side-table');
    a.box(table, '#d5c5a4', x, 0.68, z - 0.18, 0.52, 0.52, 0.52);
  } else if (choice === 'stonePatio') {
    const tableBase = part(set, 'patio-table-base');
    a.box(tableBase, '#a7a18f', x, 0.43, z, 0.92, 0.1, 0.82);
    a.cylinder(tableBase, wood, x, 0.82, z, 0.36, 0.62);
    const tableTop = part(set, 'patio-table-top');
    a.cylinder(tableTop, '#d2c6ae', x, 1.16, z, 0.58, 0.11);
    for (const [index, dx] of [-1.05, 1.05].entries()) {
      const chair = part(set, `patio-chair-${index + 1}`);
      a.box(chair, wood, x + dx, 0.47, z - 0.08, 0.48, 0.12, 0.46);
      a.box(chair, '#dfd4bd', x + dx, 0.56, z - 0.08, 0.4, 0.09, 0.36);
      for (const side of [-1, 1])
        a.box(chair, wood, x + dx + side * 0.21, 0.28, z - 0.08, 0.04, 0.42, 0.04);
    }
    const umbrellaBase = part(set, 'retreat-umbrella-base');
    umbrellaBase.userData['polePassesThroughTable'] = true;
    a.cylinder(umbrellaBase, '#6c685e', x, 0.31, z, 0.32, 0.22);
    const umbrellaPole = part(set, 'retreat-umbrella-pole');
    umbrellaPole.userData['polePassesThroughTable'] = true;
    a.cylinder(umbrellaPole, '#776448', x, 1.53, z, 0.045, 2.48);
    const umbrellaCanopy = part(set, 'retreat-umbrella-canopy');
    const canopy = a.mesh(
      umbrellaCanopy,
      a.cachedGeometry('retreat-umbrella-canopy', () => new T.ConeGeometry(1.08, 0.5, 12)),
      '#d0c2a3',
      x,
      2.62,
      z,
    );
    canopy.name = 'umbrella-canopy';
    canopy.castShadow = false;
  } else {
    for (const [index, dx] of [-1.15, 1.15].entries()) {
      const post = part(set, `lounge-post-${index + 1}`);
      a.box(post, wood, x + dx, 1.27, z, 0.12, 2.35, 0.12);
      a.box(post, '#b69c78', x + dx, 2.46, z, 0.2, 0.1, 0.18);
    }
    const canopy = part(set, 'lounge-roof');
    a.box(canopy, '#a89573', x, 2.45, z, 2.48, 0.12, 1.65);
    for (let half = 0; half < 2; half++) {
      const slats = part(set, `lounge-roof-slats-${half + 1}`);
      for (let index = 0; index < 4; index++) {
        const dx = -1.1 + (half * 4 + index) * 0.31;
        a.box(slats, wood, x + dx, 2.36, z, 0.055, 0.16, 1.55);
      }
    }
    const bench = part(set, 'lounge-bench');
    a.bench(bench, x - 0.25, z + 0.24, Math.PI / 2);
    const cushions = part(set, 'lounge-cushions');
    a.box(cushions, '#c1b29c', x - 0.22, 0.78, z + 0.18, 1.1, 0.24, 0.56);
    a.box(cushions, '#d9c9ae', x - 1.28, 0.83, z + 0.2, 0.2, 0.28, 0.62);
    a.box(cushions, '#d9c9ae', x + 0.84, 0.83, z + 0.2, 0.2, 0.28, 0.62);
    for (const [index, [dx, color]] of (
      [
        [-1.45, '#d3a49a'],
        [1.45, '#a9b493'],
      ] as const
    ).entries()) {
      const pot = part(set, `lounge-planter-${index + 1}`);
      planter(a, pot, x + dx, z + 0.78, color);
    }
  }
}

function flowerStem(
  a: AssetLibrary,
  p: T.Object3D,
  x: number,
  z: number,
  height: number,
  color: string,
  lean = 0,
  size = 0.09,
) {
  const base = 0.16,
    stem = a.mesh(
      p,
      a.cachedGeometry('phase4-flower-stem', () => new T.CylinderGeometry(0.013, 0.022, 1, 5)),
      '#657b52',
      x,
      base + height / 2,
      z,
      1,
      height,
      1,
    );
  stem.rotation.z = lean;
  flower(a, p, x + Math.sin(lean) * height * 0.34, base + height, z, color, size);
}

function gardenExpansion(set: PieceSet, choice: string) {
  const { a } = set;
  const bed = part(set, 'long-garden-bed');
  const x = -11.25,
    z = -1.45;
  a.box(bed, '#766044', x, 0.1, z, 2.2, 0.1, 1.8);
  for (const [id, edgeX, edgeZ, width, depth] of [
    ['garden-edge-west', x - 1.12, z, 0.06, 1.88],
    ['garden-edge-east', x + 1.12, z, 0.06, 1.88],
    ['garden-edge-north', x, z - 0.92, 2.28, 0.08],
    ['garden-edge-south', x, z + 0.92, 2.28, 0.08],
  ] as const) {
    const edge = part(set, id);
    a.box(edge, '#b2a890', edgeX, 0.18, edgeZ, width, 0.13, depth);
  }
  const plants = [
    part(set, 'garden-cluster-west'),
    part(set, 'garden-cluster-center'),
    part(set, 'garden-cluster-east'),
  ];
  const cluster = (dx: number) => plants[dx < -0.3 ? 0 : dx > 0.3 ? 2 : 1];
  if (choice === 'evergreenShrubs') {
    for (const [index, [dx, dz]] of [
      [-0.62, -0.45],
      [0, -0.45],
      [0.62, -0.45],
      [-0.34, 0.05],
      [0.34, 0.05],
      [-0.62, 0.53],
      [0, 0.53],
      [0.62, 0.53],
    ].entries())
      shrub(a, cluster(dx), x + dx, z + dz, index % 3 === 0 ? 0.28 : 0.24, false, 211 + index);
  } else if (choice === 'flowerBeds') {
    // Use one merged low-poly foliage mesh per section so the finished lot stays within its
    // mobile draw-call budget while preserving separate, reversible construction pieces.
    const flowerColors = [
      ['#c57979', '#ead9b2'],
      ['#897fa4', '#d89c83'],
      ['#c57979', '#e1c36f'],
    ];
    const flowerSpots = [
      [-0.5, -0.28],
      [-0.2, -0.32],
      [0.16, -0.28],
      [0.48, -0.22],
      [-0.43, 0.22],
      [-0.08, 0.3],
      [0.27, 0.2],
      [0.5, 0.28],
    ];
    for (const [index, center] of [
      [-0.74, 0],
      [0, 0],
      [0.74, 0],
    ].entries()) {
      const group = plants[index];
      const mound = a.mesh(
        group,
        a.cachedGeometry('phase4-flowering-bed-mound', () => {
          const lobes = [
            [-0.28, 0.02, -0.12, 0.37],
            [-0.08, 0.08, 0.1, 0.42],
            [0.19, 0.03, -0.08, 0.39],
            [0.34, 0.06, 0.12, 0.31],
          ].map(([lx, ly, lz, radius]) => {
            const blob = new T.IcosahedronGeometry(1, 0);
            blob.scale(radius, radius * 0.72, radius * 0.84);
            blob.translate(lx, ly, lz);
            return blob;
          });
          const merged = mergeGeometries(lobes, false)!;
          lobes.forEach((blob) => blob.dispose());
          return merged;
        }),
        '#65784f',
        x + center[0],
        0.32,
        z,
      );
      mound.castShadow = false;
      const colors = flowerColors[index];
      for (const [spot, [dx, dz]] of flowerSpots.entries())
        flower(
          a,
          group,
          x + center[0] + dx * 0.62,
          0.62 + (spot % 2) * 0.035,
          z + dz,
          colors[spot % 2],
          0.085,
        );
    }
  } else {
    // Irregular clusters, taller stems and scattered grasses distinguish the meadow-like option.
    const blooms: [number, number, number, string, number][] = [
      [-0.78, -0.52, 0.82, '#9286aa', -0.12],
      [-0.48, -0.45, 0.54, '#e5d2a4', 0.08],
      [0.03, -0.6, 0.98, '#b98b9d', -0.16],
      [0.55, -0.48, 0.69, '#d3b66e', 0.11],
      [0.82, -0.18, 0.9, '#9582ab', -0.09],
      [-0.72, 0.02, 0.62, '#e4d3ae', 0.13],
      [-0.22, 0.08, 1.02, '#a98aa8', -0.1],
      [0.34, 0.13, 0.74, '#d6b46d', 0.15],
      [-0.56, 0.57, 0.93, '#9685b0', -0.14],
      [0.04, 0.52, 0.61, '#e6d3a8', 0.08],
      [0.57, 0.62, 1.08, '#b4819a', -0.11],
    ];
    for (const [index, [dx, dz, height, color, lean]] of blooms.entries())
      flowerStem(
        a,
        cluster(dx),
        x + dx,
        z + dz,
        height,
        color,
        lean,
        index % 3 === 0 ? 0.095 : 0.08,
      );
    const grass = a.cachedGeometry(
      'phase4-wildflower-grass',
      () => new T.CylinderGeometry(0.005, 0.018, 1, 4),
    );
    for (const [index, [dx, dz, height, lean]] of [
      [-0.92, -0.28, 0.54, -0.18],
      [-0.61, -0.12, 0.72, 0.2],
      [-0.22, -0.67, 0.61, -0.13],
      [0.25, -0.48, 0.66, 0.17],
      [0.91, 0.02, 0.64, 0.15],
      [-0.94, 0.31, 0.7, 0.1],
      [-0.42, 0.39, 0.57, -0.16],
      [0.22, 0.64, 0.68, 0.15],
      [0.88, 0.49, 0.53, -0.12],
      [0.72, -0.65, 0.62, 0.13],
      [-0.04, -0.05, 0.48, -0.17],
      [0.42, 0.4, 0.58, -0.12],
    ].entries()) {
      const blade = a.mesh(
        cluster(dx),
        grass,
        index % 2 ? '#73845a' : '#899468',
        x + dx,
        0.16 + height / 2,
        z + dz,
        1,
        height,
        1,
      );
      blade.rotation.z = lean;
      blade.castShadow = false;
    }
  }
}

function clippedHedge(a: AssetLibrary, parent: T.Object3D, x: number, z: number, scale = 1) {
  const colors = ['#566c4d', '#566c4d', '#566c4d'];
  for (let i = 0; i < colors.length; i++)
    a.sphere(
      parent,
      colors[i],
      x,
      0.72 + i * 0.12,
      z,
      0.42 * scale,
      (0.78 - i * 0.08) * scale,
      0.38 * scale,
    );
}

function boundary(set: PieceSet, choice: string) {
  const { a } = set;
  const lowStone = choice === 'stoneWall';
  const hedge = choice === 'trimmedHedge';
  const material = choice === 'picketFence' ? '#e6e1d1' : lowStone ? '#999589' : '#566c4d';
  const addSpan = (id: string, axis: 'x' | 'z', start: number, end: number, fixed: number) => {
    const span = part(set, id),
      vertical = axis === 'z',
      length = end - start,
      mid = (start + end) / 2,
      x = vertical ? fixed : mid,
      z = vertical ? mid : fixed;
    if (hedge) {
      for (let value = start + 0.28; value < end - 0.15; value += 0.38)
        clippedHedge(a, span, vertical ? fixed : value, vertical ? value : fixed, 0.72);
    } else if (lowStone) {
      a.box(span, material, x, 0.34, z, vertical ? 0.34 : length, 0.58, vertical ? length : 0.34);
      a.box(span, material, x, 0.69, z, vertical ? 0.42 : length, 0.12, vertical ? length : 0.42);
      a.box(span, material, x, 0.4, z, vertical ? 0.48 : 0.42, 0.7, vertical ? 0.42 : 0.48);
      a.box(span, material, x, 0.79, z, vertical ? 0.54 : 0.48, 0.08, vertical ? 0.48 : 0.54);
    } else {
      const step = 0.64;
      for (let value = start + 0.32; value < end - 0.1; value += step) {
        const postX = vertical ? fixed : value,
          postZ = vertical ? value : fixed;
        a.box(span, material, postX, 0.53, postZ, vertical ? 0.1 : 0.58, 1, vertical ? 0.58 : 0.1);
        a.box(
          span,
          material,
          postX,
          0.92,
          postZ,
          vertical ? 0.17 : 0.65,
          0.12,
          vertical ? 0.65 : 0.17,
        );
      }
      if (axis === 'x') {
        for (const y of [0.36, 0.73]) a.box(span, material, x, y, z, length, 0.08, 0.07);
      } else {
        for (const y of [0.36, 0.73]) a.box(span, material, x, y, z, 0.07, 0.08, length);
      }
    }
    span.traverse((object) => {
      if (object instanceof T.Mesh) object.castShadow = false;
    });
  };
  const split = (start: number, end: number, count: number) =>
    Array.from({ length: count }, (_, index) => {
      const size = (end - start) / count;
      return [start + index * size, start + (index + 1) * size] as const;
    });
  // Five runs split into short, stable pieces; the front keeps clear pedestrian and driveway gates.
  for (const [index, [start, end]] of split(-12.55, 0.7, 5).entries())
    addSpan(`boundary-back-${index + 1}`, 'x', start, end, -11.86);
  for (const [index, [start, end]] of split(-11.86, 0.98, 5).entries()) {
    addSpan(`boundary-west-${index + 1}`, 'z', start, end, hedge ? -12.5 : -12.58);
    addSpan(`boundary-east-${index + 1}`, 'z', start, end, hedge ? 0.5 : 0.9);
  }
  for (const [index, [start, end]] of split(-12.55, -8.85, 2).entries())
    addSpan(`boundary-front-walk-${index + 1}`, 'x', start, end, hedge ? 0.98 : 1.0);
  for (const [index, [start, end]] of split(-5.6, -2.45, 2).entries())
    addSpan(`boundary-front-drive-${index + 1}`, 'x', start, end, hedge ? 0.98 : 1.0);
  // Gate piers make the open path and driveway intentional in all three boundary styles.
  for (const [index, [x, z]] of [
    [-8.85, 1.0],
    [-5.6, 1.0],
    [-2.45, 1.0],
    [hedge ? -12.5 : -12.58, hedge ? 0.98 : 1.0],
    [hedge ? 0.5 : 0.7, hedge ? 0.98 : 1.0],
  ].entries()) {
    const pier = part(set, `boundary-gate-pier-${index + 1}`);
    if (hedge) clippedHedge(a, pier, x, z, 0.82);
    else {
      a.box(pier, material, x, 0.46, z, 0.4, 0.9, 0.4);
      if (!lowStone) a.box(pier, material, x, 0.95, z, 0.46, 0.12, 0.46);
    }
    pier.traverse((object) => {
      if (object instanceof T.Mesh) object.castShadow = false;
    });
  }
}

function stringLight(
  a: AssetLibrary,
  cable: T.Object3D,
  bulbs: T.Object3D,
  from: T.Vector3,
  to: T.Vector3,
) {
  const bulb = a.namedMaterial(
    'phase4-string-light-bulb',
    () =>
      new T.MeshStandardMaterial({
        color: '#f0d8a6',
        emissive: '#f1bf6c',
        emissiveIntensity: 0.28,
        roughness: 0.42,
      }),
  );
  const sag = 0.14,
    curve = new T.QuadraticBezierCurve3(
      from,
      from
        .clone()
        .lerp(to, 0.5)
        .add(new T.Vector3(0, -sag * 2, 0)),
      to,
    );
  a.mesh(cable, a.geometry(new T.TubeGeometry(curve, 14, 0.025, 5, false)), '#685b46', 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const point = curve.getPoint(i / 6);
    const mesh = a.mesh(
      bulbs,
      a.cachedGeometry('phase4-string-light-globe', () => new T.SphereGeometry(0.075, 8, 6)),
      bulb,
      point.x,
      point.y - 0.08,
      point.z,
    );
    mesh.castShadow = false;
  }
}

function outdoorLighting(set: PieceSet, choice: string) {
  const { a } = set;
  if (choice === 'stringLights') {
    const from = new T.Vector3(-8.48, 2.82, -8.34),
      to = new T.Vector3(-2.52, 2.82, -8.34),
      west = part(set, 'string-light-post-west'),
      east = part(set, 'string-light-post-east'),
      cable = part(set, 'string-light-cable'),
      bulbs = part(set, 'string-light-bulbs');
    a.box(west, '#705c43', from.x, from.y / 2, from.z, 0.14, from.y, 0.14);
    a.box(east, '#705c43', to.x, to.y / 2, to.z, 0.14, to.y, 0.14);
    const footWest = a.box(west, '#8a765b', from.x, 0.1, from.z, 0.28, 0.2, 0.28),
      footEast = a.box(east, '#8a765b', to.x, 0.1, to.z, 0.28, 0.2, 0.28);
    footWest.castShadow = footEast.castShadow = false;
    cable.userData['stringLightAnchors'] = [[from.toArray(), to.toArray()]];
    stringLight(a, cable, bulbs, from, to);
  } else if (choice === 'gardenTorches') {
    for (const [index, [x, z]] of [
      [-8.8, -6.15],
      [-9.15, -7.15],
      [-6.9, -9.1],
      [-3.35, -9.15],
    ].entries()) {
      const torch = part(set, `garden-torch-${index + 1}`);
      a.cylinder(torch, '#76583b', x, 0.72, z, 0.055, 1.35);
      a.cylinder(torch, '#a8794c', x, 1.4, z, 0.12, 0.12);
      const flameMaterial = a.namedMaterial(
        'phase4-torch-glow',
        () =>
          new T.MeshStandardMaterial({
            color: '#ffc978',
            emissive: '#ed8f44',
            emissiveIntensity: 0.46,
          }),
      );
      const innerMaterial = a.namedMaterial(
        'phase4-torch-core',
        () =>
          new T.MeshStandardMaterial({
            color: '#fff0bb',
            emissive: '#ffd17b',
            emissiveIntensity: 0.55,
          }),
      );
      if (!a.torchFlames.includes(flameMaterial)) a.torchFlames.push(flameMaterial);
      if (!a.torchFlames.includes(innerMaterial)) a.torchFlames.push(innerMaterial);
      const flame = a.mesh(
        torch,
        a.cachedGeometry('phase4-torch-flame', () => new T.ConeGeometry(0.09, 0.22, 7)),
        flameMaterial,
        x,
        1.58,
        z,
      );
      flame.castShadow = false;
      flame.name = 'visible-torch-flame';
      const core = a.mesh(
        torch,
        a.cachedGeometry('phase4-torch-core', () => new T.ConeGeometry(0.046, 0.14, 6)),
        innerMaterial,
        x,
        1.59,
        z,
      );
      core.castShadow = false;
    }
  } else {
    for (const [index, [x, z]] of [
      [-6.08, 0.18],
      [-6.08, 0.5],
      [-6.08, 0.85],
      [-4.62, 0.18],
      [-4.62, 0.5],
      [-4.62, 0.85],
    ].entries()) {
      const fixture = part(set, `pathway-lantern-${index + 1}`);
      a.lantern(fixture, x, 1.1, z, true, false);
    }
  }
}

function signature(set: PieceSet, choice: string) {
  const { a } = set;
  const ground = part(set, 'signature-bed');
  const focal = part(set, 'garden-feature');
  const details = part(set, 'stone-and-water-details');
  const plants = part(set, 'signature-planting');
  const x = -9.86,
    z = -6.17;
  a.box(ground, '#6d5c44', x, 0.13, z, 1.78, 0.12, 1.48);
  for (const side of [-1, 1]) {
    a.box(ground, '#b8ac92', x, 0.21, z + side * 0.79, 1.84, 0.12, 0.1);
    a.box(ground, '#b8ac92', x + side * 0.91, 0.21, z, 0.1, 0.12, 1.48);
  }
  if (choice === 'pond') {
    a.cylinder(focal, '#a39c88', x, 0.33, z, 0.66, 0.34);
    a.cylinder(focal, '#c4bda8', x, 0.52, z, 0.54, 0.09);
    a.cylinder(focal, surface(a, 'water', '#5b9aa0'), x, 0.56, z, 0.43, 0.025);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      shrub(
        a,
        details,
        x + Math.cos(angle) * 0.79,
        z + Math.sin(angle) * 0.67,
        0.25,
        true,
        341 + i,
      );
    }
  } else if (choice === 'gazebo') {
    for (const dx of [-0.72, 0.72])
      for (const dz of [-0.55, 0.55]) {
        a.box(focal, '#92744f', x + dx, 0.94, z + dz, 0.11, 1.8, 0.11);
        a.box(focal, '#c0a47e', x + dx, 1.86, z + dz, 0.17, 0.11, 0.17);
      }
    a.box(focal, '#a68b67', x, 1.82, z, 1.62, 0.12, 1.35);
    const roof = a.mesh(
      focal,
      a.cachedGeometry('phase4-gazebo-roof', () => new T.ConeGeometry(1.22, 0.68, 4, 1)),
      '#555b53',
      x,
      2.28,
      z,
      1,
      1,
      0.78,
    );
    roof.rotation.y = Math.PI / 4;
    a.bench(details, x, z + 0.1, Math.PI / 2);
  } else {
    a.cylinder(focal, '#9e9783', x, 0.38, z, 0.42, 0.5);
    a.cylinder(focal, '#c2b9a2', x, 0.65, z, 0.58, 0.1);
    a.sphere(focal, '#768666', x, 0.81, z, 0.28, 0.17, 0.28);
    for (let i = 0; i < 5; i++)
      a.box(details, '#c2bba8', x - 0.67 + i * 0.33, 0.2, z + 0.52, 0.24, 0.1, 0.23);
  }
  for (const dx of [-0.68, 0.68]) shrub(a, plants, x + dx, z - 0.5, 0.28, true, dx + 373);
}

function compose(set: PieceSet, choice: string, houseStyle: string) {
  switch (set.root.name.split(':')[1]) {
    case 'frontGarden':
      frontGarden(set, choice);
      break;
    case 'centerpiece':
      centerpiece(set, choice);
      break;
    case 'backyard': {
      const base = part(set, 'backyard-base');
      const structure = part(set, 'attraction');
      const planting = part(set, 'backyard-softening');
      aBoxGround(set.a, base, -10.72, -9.75, 3.8, 3.6, '#b9ad97');
      buildBackyard(set.a, structure, choice, { x: -10.72, z: -9.75, scaleX: 0.68, scaleZ: 0.53 });
      for (const x of [-12.4, -9.05]) shrub(set.a, planting, x, -7.93, 0.27, true, x + 409);
      break;
    }
    case 'porch':
      porch(set, choice, houseStyle);
      break;
    case 'retreat':
      retreat(set, choice);
      break;
    case 'gardenExpansion':
      gardenExpansion(set, choice);
      break;
    case 'boundary':
      boundary(set, choice);
      break;
    case 'outdoorLighting':
      outdoorLighting(set, choice);
      break;
    case 'signature':
      signature(set, choice);
      break;
    default:
      throw new Error(`No Phase 4 composition is registered for ${set.root.name}.`);
  }
}

function aBoxGround(
  a: AssetLibrary,
  p: T.Object3D,
  x: number,
  z: number,
  w: number,
  d: number,
  color: string,
) {
  a.box(p, surface(a, 'paving', color), x, 0.13, z, w, 0.1, d);
}

export function buildMilestoneProject(
  a: AssetLibrary,
  parent: T.Group,
  projectId: string,
  choiceId: string,
  houseStyle = 'sage',
): MilestoneAsset {
  const definition = PROJECTS.find((project) => project.id === projectId);
  if (!FEATURE_ZONES[projectId] || !definition)
    throw new Error(`Unknown Phase 4 feature zone: ${projectId}`);
  if (!definition.choices.some((choice) => choice.id === choiceId))
    throw new Error(`Unknown ${projectId} design choice: ${choiceId}`);
  const set = createSet(a, parent, projectId);
  compose(set, choiceId, houseStyle);
  for (const piece of set.pieces.values()) {
    batchStatic(piece, (geometry) => a.geometry(geometry));
    piece.userData['staticBatchBoundary'] = true;
  }
  const zone = FEATURE_ZONES[projectId];
  return {
    root: set.root,
    pieces: set.pieces,
    recipe: recipeFor(
      set.pieces,
      projectId === 'backyard' || projectId === 'signature' ? 3300 : 2500,
    ),
    focus: {
      x: (zone.minX + zone.maxX) / 2 + 5,
      z: (zone.minZ + zone.maxZ) / 2 + 4.6,
      zoom: 1.28,
    },
  };
}
