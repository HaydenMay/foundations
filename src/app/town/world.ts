import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { AssetLibrary, HOUSE_STYLES } from './assets';
import { buildStartingHouse } from './residential';
import { startingLandscape } from './landscaping';
import { surface } from './surfaces';
import { batchStatic } from './batching';
import type { AssemblyRecipe } from './assembly';
import { STARTING_HOME_ASSEMBLY_RECIPES } from './residential-assembly';
import { buildMilestoneProject, FEATURE_ZONES, MilestoneAsset } from './milestone-assets';

export interface TownWorld {
  group: T.Group;
  assets: AssetLibrary;
  home?: T.Group;
  homeAssemblies?: ReadonlyMap<string, T.Group>;
  homeRecipe?: AssemblyRecipe;
  projectAssets: Map<string, MilestoneAsset>;
  legacyAssets: Map<string, T.Group>;
}
type ProjectFactory = (a: AssetLibrary, g: T.Group, choice: string) => void;

function garden(a: AssetLibrary, g: T.Group, choice: string) {
  const area = a.group(g, 9, 0, -11);
  a.box(area, '#b9b697', 0, 0.09, 0, 10, 0.08, 4.5);
  a.box(area, '#d2ceb4', 0, 0.15, 0, 9.5, 0.06, 0.9);
  for (let i = 0; i < 5; i++) {
    const x = -3.5 + i * 1.7;
    if (choice === 'orchard') {
      a.tree(area, x, -1.2, 0.58, '#9b9d63');
      a.sphere(area, '#c5a16c', x + 0.4, 1.75, -0.9, 0.13);
    } else {
      a.flowerBox(area, x, 0.3, -1.1, choice === 'roses' ? '#bc9d8e' : '#b8b194');
      a.flowerBox(area, x, 0.3, 1.1, '#b5b396');
    }
  }
  if (choice === 'roses') {
    for (const x of [-3, 3])
      for (const z of [-0.8, 0.8]) a.box(area, '#a29372', x, 1.4, z, 0.12, 2.8, 0.12);
    for (let z = -1; z <= 1; z += 0.4) a.box(area, '#b8aa85', 0, 2.85, z, 6.6, 0.1, 0.13);
  }
  a.bench(area, 0, 1.7, Math.PI);
}
function street(a: AssetLibrary, g: T.Group, choice: string) {
  for (const x of [-13, -3, 7, 15]) {
    if (choice === 'avenue') {
      a.tree(g, x, 8.8, 0.9, '#879969');
      a.shrub(g, x + 1.3, 8.7);
    } else {
      a.lantern(g, x, 2.8, 8.6);
      if (choice === 'flowers') a.flowerBox(g, x + 1, 0.4, 8.6);
    }
  }
  for (const x of [-9, 3, 12]) a.bench(g, x, 8.75, Math.PI);
}
function circle(a: AssetLibrary, g: T.Group, choice: string) {
  const area = a.group(g, 12, 0, 5);
  a.cylinder(area, '#bcbca7', 0, 0.12, 0, 5.25, 0.18);
  a.cylinder(area, '#858c80', 0, 0.23, 0, 4.95, 0.08);
  a.cylinder(area, '#c8c7ae', 0, 0.31, 0, 2.5, 0.16);
  a.cylinder(area, '#9ca87c', 0, 0.42, 0, 2.3, 0.12);
  if (choice === 'oak') a.tree(area, 0, 0, 1.4, '#879569');
  if (choice === 'fountain') {
    a.cylinder(area, '#d3d0ba', 0, 0.65, 0, 1.4, 0.4);
    a.cylinder(area, '#87b5b0', 0, 0.89, 0, 1.15, 0.05);
    a.cylinder(area, '#bfbea7', 0, 1.1, 0, 0.3, 0.7);
    a.cylinder(area, '#d3d0ba', 0, 1.42, 0, 0.7, 0.15);
    a.sphere(area, '#b9c6b2', 0, 1.65, 0, 0.22);
  }
  if (choice === 'gazebo') {
    for (const x of [-1, 1])
      for (const z of [-1, 1]) a.box(area, '#c2b18d', x, 1.4, z, 0.13, 2.3, 0.13);
    a.roof(area, 3.1, 3.1, 0.9, 2.55, '#8e8a70');
    a.bench(area, 0, -0.75);
  }
  for (let i = 0; i < 9; i++) {
    const t = (i * Math.PI * 2) / 9;
    a.shrub(area, Math.cos(t) * 1.9, Math.sin(t) * 1.9, 0.35);
  }
}

function buildChapterLot(a: AssetLibrary, parent: T.Group): MilestoneAsset {
  const root = a.group(parent),
    ground = a.group(root),
    marker = a.group(root);
  root.name = 'chapter-empty-lot';
  root.userData['staticBatchBoundary'] = true;
  ground.name = 'empty-lot-clearing';
  marker.name = 'empty-lot-parcel-marker';
  a.box(ground, surface(a, 'grass', '#89996a'), 5.8, 0.09, -3.3, 11.2, 0.1, 9.8);
  for (const x of [0.35, 11.25])
    for (const z of [-8.1, 1.5]) a.box(ground, '#b8b29b', x, 0.17, z, 0.18, 0.24, 0.18);
  // The little marker makes the reserved empty parcel legible without implying a building.
  a.box(marker, '#796346', 0.55, 0.52, 1.14, 0.11, 0.82, 0.11);
  a.box(marker, '#b8a27b', 0.55, 0.97, 1.14, 0.72, 0.28, 0.2);
  a.box(marker, '#e1d4b5', 0.55, 0.99, 1.025, 0.54, 0.13, 0.025);
  for (const piece of [ground, marker]) {
    batchStatic(piece, (geometry) => a.geometry(geometry));
    piece.userData['staticBatchBoundary'] = true;
  }
  const pieces = new Map([
    ['clearing', ground],
    ['marker', marker],
  ]);
  return {
    root,
    pieces,
    recipe: {
      pieces: [
        { id: 'clearing', order: 0, durationMs: 1400, dropHeight: 0.35 },
        { id: 'marker', order: 1, delayMs: 220, durationMs: 1200, dropHeight: 0.45 },
      ],
      config: { durationMs: 1550, staggerMs: 220, concurrency: 1, settleMeters: 0.025 },
    },
    focus: { x: 10.8, z: 1.3, zoom: 1.05 },
  };
}

const PROJECT_ASSETS: Record<string, ProjectFactory> = {
  garden,
  street,
  circle,
  exterior(a, g, choice) {
    // Retain the legacy bench and planting on the west verge, clear of all reward zones.
    a.bench(g, -14.05, -6.35);
    a.flowerBox(g, -15.0, 0.34, -5.7);
    a.flowerBox(g, -13.1, 0.34, -5.7);
    if (choice === 'slate') for (const x of [-15.25, -12.85]) a.shrub(g, x, -6.95, 0.42, '#9991a0');
  },
  neighbor(a, g, choice) {
    a.box(g, '#a3ad7f', 5.8, 0.06, -3.3, 11.4, 0.1, 10);
    a.house(g, 6, -4.1, HOUSE_STYLES[choice] || HOUSE_STYLES['cream'], 0, 0.86);
    a.box(g, '#cac8b4', 9.5, 0.16, -0.5, 2.1, 0.1, 5.9);
    a.fence(g, 5.5, -8.8, 10.5);
    a.tree(g, 1.9, -6, 0.78);
    a.shrub(g, 2.4, -0.2, 0.75);
  },
  house2(a, g, choice) {
    a.box(g, '#a2ad80', -6, 0.08, 11, 11, 0.1, 8);
    a.house(g, -6, 11.4, HOUSE_STYLES[choice] || HOUSE_STYLES['sage'], Math.PI, 0.8);
    a.box(g, '#ccc8b3', -2.6, 0.18, 10, 2, 0.1, 4.2);
    a.shrub(g, -10.2, 9, 0.7);
  },
};

export function buildWorld(designs: Record<string, string>): TownWorld {
  const group = new T.Group(),
    a = new AssetLibrary();
  // A shallow rounded terrain slice keeps the whole environment miniature and replaceable.
  const base = a.geometry(new RoundedBoxGeometry(36, 0.8, 29, 2, 0.35));
  a.mesh(group, base, '#b9b79a', 0, -0.52, -1.5);
  const turf = a.geometry(new RoundedBoxGeometry(35.8, 0.22, 28.8, 2, 0.28));
  a.mesh(group, turf, surface(a, 'grass', '#829456'), 0, -0.04, -1.5);
  a.box(group, surface(a, 'grass', '#819852'), -6, 0.085, -5.4, 13.8, 0.08, 13.4);
  // Road, kerb, two continuous sidewalks, and quiet material seams.
  a.box(group, '#bdbfac', 0, 0.13, 5, 35.8, 0.18, 6.6);
  a.box(group, '#858d83', 0, 0.24, 5, 35.8, 0.08, 4.8);
  for (const z of [1.7, 8.3]) {
    a.box(group, '#d5d3bc', 0, 0.25, z, 35.8, 0.13, 1.25);
    for (let x = -17; x < 18; x += 1.55) a.box(group, '#bfc3ad', x, 0.32, z, 0.025, 0.012, 1.22);
  }
  for (let x = -16; x < 18; x += 4) a.box(group, '#d1cdb2', x, 0.29, 5, 1.75, 0.012, 0.07);
  for (const z of [2.73, 7.27]) a.box(group, '#bbc0a9', 0, 0.29, z, 35.8, 0.012, 0.045);
  let home: T.Group | undefined,
    homeAssemblies: ReadonlyMap<string, T.Group> | undefined,
    homeRecipe: AssemblyRecipe | undefined;
  const projectAssets = new Map<string, MilestoneAsset>(),
    legacyAssets = new Map<string, T.Group>();
  if (designs['home']) {
    a.box(group, '#c8c7b5', -0.8, 0.19, -1.6, 2.6, 0.14, 7.8);
    for (let z = -4; z < 2; z += 1.55) a.box(group, '#b9bda7', -0.8, 0.27, z, 2.58, 0.008, 0.025);
    a.box(group, '#d4d0b9', -5.35, 0.2, 0.65, 1.3, 0.15, 2.2);
    const house = buildStartingHouse(a, group, designs['home'], designs['exterior']);
    home = house.root;
    homeAssemblies = house.assemblies;
    homeRecipe =
      STARTING_HOME_ASSEMBLY_RECIPES[designs['home']] || STARTING_HOME_ASSEMBLY_RECIPES['sage'];
    home.userData['staticBatchBoundary'] = true;
    for (const piece of homeAssemblies.values()) {
      batchStatic(piece, (geometry) => a.geometry(geometry));
      piece.userData['staticBatchBoundary'] = true;
    }
    // A clear pedestrian route reaches the sidewalk without overlapping porch furniture.
    for (let i = 0; i < 5; i++)
      a.box(group, '#c2c1a8', -5.35, 0.16, -0.12 + i * 0.52, 0.43, 0.09, 0.44);
    a.box(group, '#857b61', -2.82, 0.65, 1.34, 0.11, 1.1, 0.11);
    a.box(group, '#63735e', -2.82, 1.22, 1.34, 0.45, 0.28, 0.6);
    a.box(group, '#b5ab84', -2.57, 1.3, 1.37, 0.02, 0.16, 0.1);
  } else {
    // A quiet plot marker and modest verge planting mark the same future residential lot.
    a.box(group, '#857b61', -2.82, 0.65, 1.34, 0.11, 1.1, 0.11);
    a.box(group, '#63735e', -2.82, 1.22, 1.34, 0.45, 0.28, 0.6);
    for (const x of [-12.4, 0.3])
      for (const z of [-11.8, 0.5]) a.box(group, '#b6b29c', x, 0.2, z, 0.18, 0.3, 0.18);
    for (const z of [-3.5, -4.8]) a.shrub(group, -13.45, z, 0.38);
  }
  const trees: [number, number, number, string][] = [
    [-15.2, -13, 1.1, '#88956d'],
    [-15, -4, 1.15, '#7e9066'],
    [-14.5, 11, 1.25, '#8a986d'],
    [16, -12, 1.35, '#89946a'],
    [14, -4.5, 1.15, '#7f8f68'],
    [0, -13.2, 1, '#9a9f71'],
    [8, -14, 1.2, '#839268'],
  ];
  for (const [x, z, scale, color] of trees) a.tree(group, x, z, scale, color);
  for (let i = 0; i < (home ? 26 : 8); i++) {
    const x = Math.sin(i * 4.37) * 16,
      z = -13.6 + (i % 4) * 0.35;
    a.shrub(group, x, z, 0.3 + (i % 3) * 0.12, i % 2 ? '#9ba47a' : '#8b9c71');
  }
  if (home) startingLandscape(a, group);
  for (const [id, choice] of Object.entries(designs)) {
    if (FEATURE_ZONES[id])
      projectAssets.set(
        id,
        buildMilestoneProject(a, group, id, choice, designs['home'] || 'sage'),
      );
    else if (PROJECT_ASSETS[id]) {
      const legacy = a.group(group);
      legacy.name = `legacy-project:${id}`;
      PROJECT_ASSETS[id](a, legacy, choice);
      batchStatic(legacy, (geometry) => a.geometry(geometry));
      legacy.userData['staticBatchBoundary'] = true;
      legacyAssets.set(id, legacy);
    }
  }
  if (designs['chapter'] === 'reveal' && !designs['neighbor'])
    projectAssets.set('chapter', buildChapterLot(a, group));
  batchStatic(group, (geometry) => a.geometry(geometry));
  return { group, assets: a, home, homeAssemblies, homeRecipe, projectAssets, legacyAssets };
}
