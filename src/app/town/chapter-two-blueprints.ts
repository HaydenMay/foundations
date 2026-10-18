export type ChapterTwoHouseId = 'compact' | 'l-shaped' | 'two-story' | 'wide-gable';

export interface ChapterTwoAssemblyStep {
  id: string;
  order: number;
  dependsOn?: readonly string[];
}

export interface ChapterTwoHouseVolume {
  id: string;
  assemblyId: 'walls' | 'upper-walls' | 'garage';
  width: number;
  depth: number;
  height: number;
  bottomY: number;
  centerX: number;
  centerZ: number;
}

export interface ChapterTwoRoof {
  assemblyId: 'main-roof' | 'garage-roof';
  width: number;
  depth: number;
  rise: number;
  eaveY: number;
  centerX: number;
  centerZ: number;
  rotationY?: number;
}

export interface ChapterTwoPorch {
  centerX: number;
  wallFrontZ: number;
  width: number;
  depth: number;
  deckY: number;
  roofEaveY: number;
  roofRise: number;
}

export interface ChapterTwoGable {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  rise: number;
  eaveY: number;
}

export interface ChapterTwoHouseBlueprint {
  id: ChapterTwoHouseId;
  label: string;
  envelope: Readonly<{ width: number; depth: number; height: number }>;
  /** The center of authored geometry before it is centered on the lot's house anchor. */
  visualCenter: Readonly<{ x: number; z: number }>;
  volumes: readonly ChapterTwoHouseVolume[];
  roofs: readonly ChapterTwoRoof[];
  porch: ChapterTwoPorch;
  door: Readonly<{ x: number; z: number }>;
  garageDoorX?: number;
  garageDoorZ?: number;
  frontGables?: readonly ChapterTwoGable[];
  dormer?: Readonly<{ x: number; z: number; baseY: number }>;
  chimney: Readonly<{ x: number; z: number; bottomY: number; height: number }>;
  assembly: readonly ChapterTwoAssemblyStep[];
}

const commonPorchAssembly: readonly ChapterTwoAssemblyStep[] = [
  { id: 'porch-deck', order: 4, dependsOn: ['foundation', 'walls'] },
  { id: 'porch-supports', order: 5, dependsOn: ['porch-deck'] },
  { id: 'porch-rails', order: 6, dependsOn: ['porch-supports'] },
  { id: 'porch-stairs', order: 6, dependsOn: ['porch-deck'] },
  { id: 'porch-roof', order: 7, dependsOn: ['porch-supports', 'main-roof'] },
];

export const CHAPTER_TWO_HOUSE_BLUEPRINTS: Readonly<
  Record<ChapterTwoHouseId, ChapterTwoHouseBlueprint>
> = Object.freeze({
  compact: {
    id: 'compact',
    label: 'Compact cottage',
    envelope: { width: 7.0, depth: 7.45, height: 5.9 },
    visualCenter: { x: 0, z: 0.3441 },
    volumes: [
      {
        id: 'main',
        assemblyId: 'walls',
        width: 5.9,
        depth: 4.75,
        height: 2.58,
        bottomY: 0.38,
        centerX: 0,
        centerZ: -0.55,
      },
    ],
    roofs: [
      {
        assemblyId: 'main-roof',
        width: 6.82,
        depth: 5.42,
        rise: 1.82,
        eaveY: 2.88,
        centerX: 0,
        centerZ: -0.55,
      },
    ],
    porch: {
      centerX: 0,
      wallFrontZ: 1.825,
      width: 3.65,
      depth: 1.34,
      deckY: 0.39,
      roofEaveY: 2.7,
      roofRise: 0.44,
    },
    door: { x: 0, z: 1.85 },
    dormer: { x: 0.82, z: 0.02, baseY: 3.32 },
    chimney: { x: 2.02, z: -0.6, bottomY: 3.7, height: 2.05 },
    assembly: [
      { id: 'foundation', order: 0 },
      { id: 'walls', order: 1, dependsOn: ['foundation'] },
      { id: 'openings', order: 2, dependsOn: ['walls'] },
      { id: 'main-roof', order: 3, dependsOn: ['walls'] },
      { id: 'roofline', order: 4, dependsOn: ['main-roof'] },
      ...commonPorchAssembly,
      { id: 'porch', order: 8, dependsOn: ['porch-rails', 'porch-stairs'] },
      { id: 'details', order: 9, dependsOn: ['openings', 'roofline', 'porch'] },
    ],
  },
  'l-shaped': {
    id: 'l-shaped',
    label: 'L-shaped family home',
    envelope: { width: 9.2, depth: 8.35, height: 5.6 },
    visualCenter: { x: -0.082, z: 0.472 },
    volumes: [
      {
        id: 'main',
        assemblyId: 'walls',
        width: 6.05,
        depth: 5.62,
        height: 2.75,
        bottomY: 0.38,
        centerX: -1.2,
        centerZ: -0.43,
      },
      {
        id: 'garage',
        assemblyId: 'garage',
        width: 3.1,
        depth: 4.25,
        height: 2.62,
        bottomY: 0.38,
        centerX: 2.8,
        centerZ: 0.17,
      },
    ],
    roofs: [
      {
        assemblyId: 'main-roof',
        width: 6.82,
        depth: 6.28,
        rise: 1.88,
        eaveY: 3.02,
        centerX: -1.2,
        centerZ: -0.43,
      },
      {
        assemblyId: 'garage-roof',
        width: 4.72,
        depth: 3.18,
        rise: 1.34,
        eaveY: 2.88,
        centerX: 2.8,
        centerZ: 0.17,
        rotationY: Math.PI / 2,
      },
    ],
    porch: {
      centerX: -1.2,
      wallFrontZ: 2.38,
      width: 3.9,
      depth: 1.35,
      deckY: 0.4,
      roofEaveY: 2.85,
      roofRise: 0.48,
    },
    door: { x: -1.2, z: 2.38 },
    garageDoorX: 2.8,
    garageDoorZ: 2.37,
    chimney: { x: 0.95, z: -0.45, bottomY: 3.65, height: 1.78 },
    assembly: [
      { id: 'foundation', order: 0 },
      { id: 'walls', order: 1, dependsOn: ['foundation'] },
      { id: 'garage', order: 2, dependsOn: ['foundation'] },
      { id: 'openings', order: 3, dependsOn: ['walls', 'garage'] },
      { id: 'main-roof', order: 4, dependsOn: ['walls'] },
      { id: 'garage-roof', order: 4, dependsOn: ['garage'] },
      { id: 'roofline', order: 5, dependsOn: ['main-roof', 'garage-roof'] },
      ...commonPorchAssembly,
      { id: 'porch', order: 8, dependsOn: ['porch-rails', 'porch-stairs'] },
      { id: 'details', order: 9, dependsOn: ['openings', 'roofline', 'porch'] },
    ],
  },
  'two-story': {
    id: 'two-story',
    label: 'Two-story family home',
    envelope: { width: 9.4, depth: 9.7, height: 7.5 },
    visualCenter: { x: 0, z: 0.3923 },
    volumes: [
      {
        id: 'main',
        assemblyId: 'walls',
        width: 8.05,
        depth: 6.4,
        height: 2.7,
        bottomY: 0.38,
        centerX: 0,
        centerZ: -0.65,
      },
      {
        id: 'upper',
        assemblyId: 'upper-walls',
        width: 7.05,
        depth: 5.54,
        height: 2.08,
        bottomY: 3.08,
        centerX: 0,
        centerZ: -0.72,
      },
    ],
    roofs: [
      {
        assemblyId: 'main-roof',
        width: 9.24,
        depth: 7.32,
        rise: 1.92,
        eaveY: 5.22,
        centerX: 0,
        centerZ: -0.65,
      },
    ],
    porch: {
      centerX: 0,
      wallFrontZ: 2.55,
      width: 6.25,
      depth: 1.76,
      deckY: 0.4,
      roofEaveY: 3.0,
      roofRise: 0.5,
    },
    door: { x: 0, z: 2.55 },
    frontGables: [
      { centerX: -2.22, centerZ: 1.72, width: 3.25, depth: 2.6, rise: 1.14, eaveY: 4.82 },
      { centerX: 2.22, centerZ: 1.72, width: 3.25, depth: 2.6, rise: 1.14, eaveY: 4.82 },
    ],
    chimney: { x: 3.0, z: -0.95, bottomY: 5.15, height: 2.2 },
    assembly: [
      { id: 'foundation', order: 0 },
      { id: 'walls', order: 1, dependsOn: ['foundation'] },
      { id: 'upper-walls', order: 2, dependsOn: ['walls'] },
      { id: 'openings', order: 3, dependsOn: ['walls', 'upper-walls'] },
      { id: 'main-roof', order: 4, dependsOn: ['upper-walls'] },
      { id: 'front-gables', order: 5, dependsOn: ['main-roof'] },
      { id: 'roofline', order: 5, dependsOn: ['main-roof'] },
      ...commonPorchAssembly,
      { id: 'porch', order: 8, dependsOn: ['porch-rails', 'porch-stairs'] },
      { id: 'details', order: 9, dependsOn: ['openings', 'roofline', 'porch'] },
    ],
  },
  'wide-gable': {
    id: 'wide-gable',
    label: 'Wide gabled ranch',
    envelope: { width: 10.6, depth: 8.5, height: 6.5 },
    visualCenter: { x: 0, z: 0.172 },
    volumes: [
      {
        id: 'main',
        assemblyId: 'walls',
        width: 9.7,
        depth: 5.58,
        height: 2.72,
        bottomY: 0.38,
        centerX: 0,
        centerZ: -0.7,
      },
    ],
    roofs: [
      {
        assemblyId: 'main-roof',
        width: 10.42,
        depth: 6.5,
        rise: 1.88,
        eaveY: 2.98,
        centerX: 0,
        centerZ: -0.7,
      },
    ],
    porch: {
      centerX: 0,
      wallFrontZ: 2.09,
      width: 4.8,
      depth: 1.42,
      deckY: 0.39,
      roofEaveY: 2.75,
      roofRise: 0.45,
    },
    door: { x: 0, z: 2.09 },
    frontGables: [
      { centerX: -2.7, centerZ: 1.28, width: 3.15, depth: 2.75, rise: 1.22, eaveY: 2.78 },
      { centerX: 2.7, centerZ: 1.28, width: 3.15, depth: 2.75, rise: 1.22, eaveY: 2.78 },
    ],
    chimney: { x: 4.1, z: -1.2, bottomY: 4.25, height: 2.12 },
    assembly: [
      { id: 'foundation', order: 0 },
      { id: 'walls', order: 1, dependsOn: ['foundation'] },
      { id: 'openings', order: 2, dependsOn: ['walls'] },
      { id: 'main-roof', order: 3, dependsOn: ['walls'] },
      { id: 'front-gables', order: 4, dependsOn: ['main-roof'] },
      { id: 'roofline', order: 5, dependsOn: ['main-roof'] },
      ...commonPorchAssembly,
      { id: 'porch', order: 8, dependsOn: ['porch-rails', 'porch-stairs'] },
      { id: 'details', order: 9, dependsOn: ['openings', 'roofline', 'porch'] },
    ],
  },
});
