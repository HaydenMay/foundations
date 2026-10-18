import * as T from 'three';
import type { AssemblyPieceRecipe, AssemblyRecipe } from './assembly';
import type { AssetLibrary } from './assets';
import { batchStatic } from './batching';
import { buildBackyard } from './backyards';
import { PROJECTS } from '../domain/progression';
import { flower, plantTree, shrub } from './landscaping';
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
  recipe: AssemblyRecipe;
  focus: { x: number; z: number; zoom: number };
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

function porch(set: PieceSet, choice: string) {
  const { a } = set;
  const ground = part(set, 'porch-rug-and-planters');
  const structure = part(set, 'seating');
  const details = part(set, 'warm-entry-details');
  const centerX = -5.35,
    frontZ = -2.02,
    wood = surface(a, 'wood', '#9b724d');
  tile(a, ground, centerX, frontZ, 1.8, 0.9, '#b9ad97');
  a.box(details, '#7f765f', centerX, 0.19, -1.48, 0.78, 0.05, 0.3);
  if (choice === 'rockingChairs') {
    for (const x of [-6.04, -4.66]) {
      a.box(structure, wood, x, 0.47, frontZ, 0.58, 0.12, 0.55);
      const back = a.box(structure, wood, x, 0.82, frontZ - 0.24, 0.55, 0.65, 0.1);
      back.rotation.x = -0.12;
      for (const side of [-1, 1]) {
        a.box(structure, wood, x + side * 0.3, 0.6, frontZ, 0.07, 0.38, 0.5);
        const rocker = a.mesh(
          structure,
          a.cachedGeometry(
            'porch-rocker-arc',
            () => new T.TorusGeometry(0.35, 0.035, 5, 16, Math.PI),
          ),
          wood,
          x + side * 0.22,
          0.18,
          frontZ,
          0.8,
          1,
          1,
        );
        rocker.rotation.z = Math.PI;
      }
    }
  } else if (choice === 'porchSwing') {
    for (const x of [-6.06, -4.64]) {
      a.box(structure, wood, x, 1.07, frontZ - 0.09, 0.055, 1.95, 0.055);
      a.cylinder(structure, '#4d544a', x, 2.02, frontZ - 0.09, 0.025, 0.2);
    }
    a.box(structure, wood, centerX, 0.52, frontZ, 1.5, 0.15, 0.46);
    const back = a.box(structure, wood, centerX, 0.85, frontZ - 0.2, 1.5, 0.5, 0.12);
    back.rotation.x = -0.08;
    for (const x of [-6.05, -4.65]) planter(a, ground, x, frontZ + 0.33, '#d2a18e');
  } else {
    a.bench(structure, centerX, frontZ, Math.PI);
    for (const x of [-6.18, -4.52]) a.lantern(details, x, 1.25, frontZ, true);
  }
  if (choice !== 'porchSwing') {
    planter(a, ground, -6.32, frontZ + 0.16, '#c6a18b');
    planter(a, ground, -4.38, frontZ + 0.16, '#a7ad91');
  }
  if (choice === 'benchLanterns') {
    a.box(details, '#e2c88e', centerX, 1.02, frontZ - 0.3, 0.08, 0.46, 0.08);
  }
}

function retreat(set: PieceSet, choice: string) {
  const { a } = set;
  const ground = part(set, 'patio-and-path');
  const structure = part(set, 'shelter-or-seating');
  const details = part(set, 'furnishings');
  const planting = part(set, 'retreat-planting');
  const x = -5.18,
    z = -10.22,
    paving = surface(a, 'paving', '#b8ad96'),
    wood = surface(a, 'wood', '#98734e');
  a.box(ground, paving, x, 0.13, z, 3.48, 0.12, 2.55);
  for (let xx = -1.4; xx <= 1.4; xx += 0.7)
    for (let zz = -0.9; zz <= 0.9; zz += 0.65)
      a.box(ground, '#c8bea7', x + xx, 0.2, z + zz, 0.025, 0.018, 0.025);
  if (choice === 'pergolaSeating') {
    for (const dx of [-1.32, 1.32])
      for (const dz of [-0.84, 0.84]) {
        a.box(structure, wood, x + dx, 1.42, z + dz, 0.15, 2.7, 0.15);
        a.box(structure, '#b7a081', x + dx, 2.8, z + dz, 0.24, 0.12, 0.24);
      }
    for (let dx = -1.4; dx <= 1.4; dx += 0.35)
      a.box(structure, wood, x + dx, 2.68, z, 0.08, 0.1, 1.95);
    for (const dz of [-0.87, 0.87]) a.box(structure, wood, x, 2.6, z + dz, 3, 0.17, 0.16);
    a.bench(details, x, z + 0.22, Math.PI);
    a.box(details, '#d5c5a4', x, 0.68, z - 0.18, 0.52, 0.52, 0.52);
  } else if (choice === 'stonePatio') {
    a.box(structure, '#a7a18f', x, 0.43, z, 0.92, 0.1, 0.82);
    a.cylinder(structure, wood, x, 0.82, z, 0.36, 0.62);
    a.cylinder(structure, '#d2c6ae', x, 1.16, z, 0.58, 0.11);
    for (const dx of [-1.05, 1.05]) {
      a.box(details, wood, x + dx, 0.47, z - 0.08, 0.48, 0.12, 0.46);
      a.box(details, '#dfd4bd', x + dx, 0.56, z - 0.08, 0.4, 0.09, 0.36);
      for (const side of [-1, 1])
        a.box(details, wood, x + dx + side * 0.21, 0.28, z - 0.08, 0.04, 0.42, 0.04);
    }
  } else {
    a.bench(structure, x, z, Math.PI / 2);
    const shade = a.mesh(
      structure,
      a.cachedGeometry('garden-lounge-canopy', () => new T.ConeGeometry(1, 0.35, 12)),
      '#a6aa91',
      x,
      2.15,
      z,
      1.25,
      1,
      0.95,
    );
    shade.rotation.y = Math.PI / 6;
    planter(a, details, x - 1.3, z + 0.75, '#d3a49a');
    planter(a, details, x + 1.3, z + 0.75, '#a9b493');
  }
  for (const dx of [-1.92, 1.92]) shrub(a, planting, x + dx, z + 0.85, 0.35, true, dx + 159);
}

function gardenExpansion(set: PieceSet, choice: string) {
  const { a } = set;
  const bed = part(set, 'long-garden-bed');
  const edging = part(set, 'stone-edging');
  const plants = part(set, 'layered-planting');
  const x = -11.25,
    z = -1.45;
  a.box(bed, '#766044', x, 0.1, z, 2.2, 0.1, 1.8);
  for (const dx of [-1.12, 1.12]) a.box(edging, '#b2a890', x + dx, 0.18, z, 0.06, 0.13, 1.88);
  for (const dz of [-0.92, 0.92]) a.box(edging, '#b2a890', x, 0.18, z + dz, 2.28, 0.13, 0.08);
  if (choice === 'evergreenShrubs') {
    for (const dx of [-0.56, 0, 0.56])
      for (const dz of [-0.42, 0, 0.42])
        shrub(
          a,
          plants,
          x + dx,
          z + dz,
          0.24 + (Math.round((dx + dz + 2) * 3) % 2) * 0.025,
          false,
          211 + Math.round((dx + 2) * 13 + dz),
        );
  } else {
    const color = choice === 'flowerBeds' ? '#c88c88' : '#d2b96f';
    for (const dx of [-0.56, 0, 0.56]) {
      for (const dz of [-0.42, 0, 0.42]) {
        shrub(a, plants, x + dx, z + dz, 0.21, true, 231 + Math.round((dx + 1) * 17 + dz));
        flower(a, plants, x + dx - 0.12, 0.48, z + dz + 0.1, color, 0.075);
        flower(
          a,
          plants,
          x + dx + 0.12,
          0.47,
          z + dz - 0.12,
          choice === 'flowerBeds' ? '#e7d9b5' : color,
          0.07,
        );
      }
    }
  }
}

function boundary(set: PieceSet, choice: string) {
  const { a } = set;
  const perimeter = part(set, 'property-perimeter');
  const details = part(set, 'open-gate-details');
  const planting = part(set, 'boundary-planting');
  const lowStone = choice === 'stoneWall';
  const hedge = choice === 'trimmedHedge';
  const material = choice === 'picketFence' ? '#e6e1d1' : lowStone ? '#999589' : '#667b58';
  const post = (x: number, z: number, vertical = false) => {
    if (hedge) {
      shrub(a, perimeter, x, z, 0.25, false, Math.round((x + z + 20) * 17));
    } else if (lowStone) {
      a.box(perimeter, material, x, 0.34, z, vertical ? 0.34 : 0.5, 0.58, vertical ? 0.5 : 0.34);
      a.box(perimeter, '#beb8a7', x, 0.66, z, vertical ? 0.42 : 0.56, 0.1, vertical ? 0.56 : 0.42);
    } else {
      a.box(perimeter, '#eee8d8', x, 0.53, z, vertical ? 0.1 : 0.58, 1, vertical ? 0.58 : 0.1);
      a.box(perimeter, '#eee8d8', x, 0.92, z, vertical ? 0.17 : 0.65, 0.12, vertical ? 0.65 : 0.17);
    }
  };
  const line = (
    axis: 'x' | 'z',
    start: number,
    end: number,
    fixed: number,
    gap?: [number, number],
  ) => {
    for (let value = start; value <= end + 0.001; value += hedge ? 0.58 : 0.64) {
      if (gap && value > gap[0] && value < gap[1]) continue;
      const x = axis === 'x' ? value : fixed;
      const z = axis === 'z' ? value : fixed;
      post(x, z, axis === 'z');
    }
    if (hedge) return;
    const length = end - start;
    const mid = (start + end) / 2;
    if (axis === 'x') {
      if (lowStone) a.box(perimeter, '#b5ad9b', mid, 0.63, fixed, length, 0.12, 0.42);
      else
        for (const y of [0.36, 0.73])
          a.box(perimeter, '#ddd8c8', mid, y, fixed, length, 0.08, 0.07);
    } else if (lowStone) a.box(perimeter, '#b5ad9b', fixed, 0.63, mid, 0.42, 0.12, length);
    else
      for (const y of [0.36, 0.73]) a.box(perimeter, '#ddd8c8', fixed, y, mid, 0.07, 0.08, length);
  };
  // Three enclosed edges plus front segments with generous gaps for the existing walk and drive.
  line('x', -12.55, 0.7, -11.86);
  line('z', -11.86, 1.0, -12.58);
  line('z', -11.86, 1.0, 0.9);
  line('x', -12.55, -8.85, 1.0);
  line('x', -5.6, -2.45, 1.0);
  // Gate piers make the open path and driveway intentional in all three boundary styles.
  for (const [x, z] of [
    [-8.85, 1.0],
    [-5.6, 1.0],
    [-2.45, 1.0],
    [-12.58, 1.0],
    [0.7, 1.0],
  ]) {
    if (hedge) shrub(a, details, x, z, 0.33, false, x + z + 277);
    else {
      a.box(details, lowStone ? '#89877d' : '#ddd8c8', x, 0.46, z, 0.4, 0.9, 0.4);
      if (!lowStone) a.box(details, '#f2eddf', x, 0.95, z, 0.46, 0.12, 0.46);
    }
  }
  if (hedge) {
    for (const x of [-11.9, -11.25, -10.6, -9.95]) shrub(a, planting, x, -2.2, 0.3, true, x + 291);
  } else {
    for (const x of [-11.9, -11.25, -10.6, -9.95]) shrub(a, planting, x, -2.2, 0.26, true, x + 301);
  }
}

function stringLight(a: AssetLibrary, p: T.Object3D, x: number, z: number) {
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
  const curve = new T.CatmullRomCurve3([
    new T.Vector3(x - 1.9, 2.95, z - 0.8),
    new T.Vector3(x - 1.0, 2.52, z - 0.35),
    new T.Vector3(x, 2.43, z),
    new T.Vector3(x + 1.0, 2.52, z + 0.35),
    new T.Vector3(x + 1.9, 2.95, z + 0.8),
  ]);
  a.mesh(p, a.geometry(new T.TubeGeometry(curve, 14, 0.025, 5, false)), '#685b46', 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const point = curve.getPoint(i / 6);
    const mesh = a.mesh(
      p,
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
  const hardware = part(set, 'lighting-hardware');
  const accents = part(set, 'warm-light-accents');
  const plants = part(set, 'lighting-garden');
  if (choice === 'stringLights') {
    for (const x of [-6.5, -3.8])
      for (const z of [-11.0, -9.45]) a.box(hardware, '#705c43', x, 1.5, z, 0.12, 3, 0.12);
    stringLight(a, accents, -5.15, -10.22);
    for (const x of [-6.8, -3.45]) planter(a, plants, x, -9.55, '#d2b18b');
  } else if (choice === 'gardenTorches') {
    for (const [x, z] of [
      [-8.8, -6.15],
      [-9.15, -7.15],
      [-6.9, -9.1],
      [-3.35, -9.15],
    ]) {
      a.cylinder(hardware, '#76583b', x, 0.72, z, 0.055, 1.35);
      a.cylinder(hardware, '#a8794c', x, 1.4, z, 0.12, 0.12);
      const flame = a.mesh(
        accents,
        a.cachedGeometry('phase4-torch-flame', () => new T.ConeGeometry(0.09, 0.22, 7)),
        a.namedMaterial(
          'phase4-torch-glow',
          () =>
            new T.MeshStandardMaterial({
              color: '#ffc978',
              emissive: '#ed8f44',
              emissiveIntensity: 0.6,
            }),
        ),
        x,
        1.57,
        z,
      );
      flame.castShadow = false;
      a.lantern(accents, x, 1.58, z, false);
    }
    planter(a, plants, -7.15, -7.8, '#ad9580');
    planter(a, plants, -3.1, -8.5, '#c0a18a');
  } else {
    for (const [x, z] of [
      [-7.55, -2.25],
      [-3.12, -2.25],
      [-7.55, -6.25],
    ]) {
      a.box(hardware, '#4f554d', x, 1.83, z, 0.13, 0.2, 0.1);
      a.box(hardware, '#4f554d', x, 1.7, z - 0.09, 0.07, 0.12, 0.23);
      a.lantern(accents, x, 1.93, z - 0.17, false);
    }
    planter(a, plants, -7.85, -1.0, '#c0a18d');
    planter(a, plants, -2.82, -1.0, '#a7ad91');
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

function compose(set: PieceSet, choice: string) {
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
      porch(set, choice);
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
): MilestoneAsset {
  const definition = PROJECTS.find((project) => project.id === projectId);
  if (!FEATURE_ZONES[projectId] || !definition)
    throw new Error(`Unknown Phase 4 feature zone: ${projectId}`);
  if (!definition.choices.some((choice) => choice.id === choiceId))
    throw new Error(`Unknown ${projectId} design choice: ${choiceId}`);
  const set = createSet(a, parent, projectId);
  compose(set, choiceId);
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
