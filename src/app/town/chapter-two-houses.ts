import * as T from 'three';
import type { Project } from '../domain/models';
import type { AssetLibrary } from './assets';
import {
  CHAPTER_TWO_HOUSE_BLUEPRINTS,
  type ChapterTwoHouseBlueprint,
  type ChapterTwoHouseId,
} from './chapter-two-blueprints';
import { addResidentialDoor, addResidentialWindow, pitchedRoof } from './residential';
import { surface } from './surfaces';

export type NeighborLot = NonNullable<Project['lot']>;
export type NeighborStyle = 'cottage' | 'craftsman' | 'brick';

export interface ChapterTwoHouse {
  root: T.Group;
  pieces: ReadonlyMap<string, T.Group>;
}

interface HousePalette {
  wallFinish: 'siding' | 'wood' | 'brick';
  wall: string;
  roof: string;
  trim: string;
  wood: string;
  stone: string;
}

const STYLE: Readonly<Record<NeighborStyle, HousePalette>> = Object.freeze({
  cottage: {
    wallFinish: 'siding',
    wall: '#e4ddc9',
    roof: '#3f494c',
    trim: '#f2eddf',
    wood: '#805d3f',
    stone: '#aaa391',
  },
  craftsman: {
    wallFinish: 'wood',
    wall: '#a27c53',
    roof: '#464a43',
    trim: '#dfd0ae',
    wood: '#745132',
    stone: '#978d79',
  },
  brick: {
    wallFinish: 'brick',
    wall: '#9d5b45',
    roof: '#414a4f',
    trim: '#eee8da',
    wood: '#684934',
    stone: '#a49b89',
  },
});

function blueprintFor(lot: NeighborLot): ChapterTwoHouseBlueprint {
  return CHAPTER_TWO_HOUSE_BLUEPRINTS[lot as ChapterTwoHouseId];
}

function addVolumeTrim(
  a: AssetLibrary,
  parent: T.Object3D,
  blueprint: ChapterTwoHouseBlueprint,
  style: NeighborStyle,
  material: T.Material,
  palette: HousePalette,
) {
  for (const volume of blueprint.volumes) {
    const frontZ = volume.centerZ + volume.depth / 2 + 0.018;
    const trimColor = style === 'craftsman' ? palette.wood : palette.trim;
    for (const side of [-1, 1]) {
      const corner = a.box(
        parent,
        trimColor,
        volume.centerX + side * (volume.width / 2 - 0.08),
        volume.bottomY + volume.height / 2,
        frontZ,
        0.12,
        volume.height + 0.08,
        0.095,
      );
      corner.name = `${volume.id}-front-corner-trim`;
    }
    a.box(
      parent,
      material,
      volume.centerX,
      volume.bottomY + volume.height + 0.055,
      frontZ,
      volume.width - 0.22,
      0.11,
      0.1,
    );
  }
}

function addOpenings(
  a: AssetLibrary,
  parent: T.Object3D,
  blueprint: ChapterTwoHouseBlueprint,
  style: NeighborStyle,
  palette: HousePalette,
) {
  const wallVolumes = blueprint.volumes.filter((volume) => volume.assemblyId !== 'garage');
  for (const [volumeIndex, volume] of wallVolumes.entries()) {
    const frontZ = volume.centerZ + volume.depth / 2 + 0.03;
    const sideCount = volume.width > 8.8 ? 4 : 2;
    const spacing = volume.width > 8.8 ? volume.width * 0.37 : volume.width * 0.28;
    const windowXs =
      sideCount === 4 ? [-spacing, -spacing / 3, spacing / 3, spacing] : [-spacing, spacing];
    const windowY = volume.bottomY + Math.min(volume.height * 0.54, 1.62);
    for (const x of windowXs) {
      const worldX = volume.centerX + x;
      if (Math.abs(worldX - blueprint.door.x) < 0.96) continue;
      addResidentialWindow(
        a,
        parent,
        worldX,
        windowY,
        frontZ,
        volume.width > 8 ? 0.9 : 0.82,
        volumeIndex > 0 ? 1.0 : 1.12,
        0,
        palette.trim,
        style === 'cottage',
      );
      if (style === 'brick') {
        a.box(parent, palette.trim, worldX, windowY + 0.64, frontZ + 0.02, 1.12, 0.11, 0.18);
        a.box(parent, palette.trim, worldX, windowY - 0.66, frontZ + 0.02, 1.14, 0.1, 0.19);
      }
    }

    const rearZ = volume.centerZ - volume.depth / 2 - 0.035;
    for (const x of [-volume.width * 0.25, volume.width * 0.25])
      addResidentialWindow(
        a,
        parent,
        volume.centerX + x,
        windowY,
        rearZ,
        0.78,
        1.02,
        Math.PI,
        palette.trim,
      );

    const sideZs = [volume.centerZ - 0.8, volume.centerZ + 0.8];
    for (const side of [-1, 1]) {
      for (const z of sideZs) {
        if (Math.abs(z - volume.centerZ) > volume.depth / 2 - 0.58) continue;
        addResidentialWindow(
          a,
          parent,
          volume.centerX + side * (volume.width / 2 + 0.025),
          windowY,
          z,
          0.72,
          1.02,
          (side * Math.PI) / 2,
          palette.trim,
        );
      }
    }
  }

  if (blueprint.garageDoorX !== undefined) {
    const garage = blueprint.volumes.find((volume) => volume.assemblyId === 'garage')!;
    const frontZ = garage.centerZ + garage.depth / 2 + 0.075;
    const door = a.group(parent, blueprint.garageDoorX, 0, frontZ);
    door.name = 'attached-garage-door';
    a.box(door, palette.trim, 0, 1.2, 0, 2.38, 2.22, 0.14);
    a.box(door, style === 'craftsman' ? palette.wood : '#c6c0af', 0, 1.2, 0.085, 2.18, 2.02, 0.08);
    for (const y of [0.48, 1.03, 1.58])
      a.box(door, style === 'craftsman' ? '#6e5134' : '#aea996', 0, y, 0.13, 2.08, 0.035, 0.025);
    for (const x of [-0.8, -0.27, 0.27, 0.8]) {
      a.box(door, palette.trim, x, 2.04, 0.15, 0.42, 0.35, 0.03);
      a.box(door, a.glass(), x, 2.04, 0.175, 0.32, 0.26, 0.025);
    }
  }
}

function addPorch(
  a: AssetLibrary,
  blueprint: ChapterTwoHouseBlueprint,
  style: NeighborStyle,
  palette: HousePalette,
  pieces: ReadonlyMap<string, T.Group>,
  roof: T.MeshStandardMaterial,
  wall: T.MeshStandardMaterial,
) {
  const porch = blueprint.porch;
  const deckCenterZ = porch.wallFrontZ + porch.depth / 2 - 0.04;
  const deck = pieces.get('porch-deck')!;
  a.box(
    deck,
    surface(a, 'stone', '#bcb5a2'),
    porch.centerX,
    porch.deckY,
    deckCenterZ,
    porch.width,
    0.36,
    porch.depth,
  );
  a.box(
    deck,
    palette.stone,
    porch.centerX,
    0.48,
    deckCenterZ - porch.depth / 2 + 0.1,
    porch.width + 0.12,
    0.16,
    0.13,
  );

  const supports = pieces.get('porch-supports')!;
  const postMaterial = style === 'craftsman' ? palette.wood : palette.trim;
  for (const x of [-1, 1].map((side) => porch.centerX + side * (porch.width / 2 - 0.12))) {
    if (style === 'craftsman') {
      a.box(supports, surface(a, 'stone', palette.stone), x, 0.82, deckCenterZ, 0.48, 0.82, 0.48);
      a.box(supports, palette.trim, x, 1.26, deckCenterZ, 0.56, 0.1, 0.56);
    }
    a.box(supports, postMaterial, x, 1.58, deckCenterZ, 0.19, 2.05, 0.19);
    a.box(supports, postMaterial, x, 2.64, deckCenterZ, 0.3, 0.13, 0.3);
  }

  const rails = pieces.get('porch-rails')!;
  const railZ = deckCenterZ + porch.depth / 2 - 0.11;
  for (const side of [-1, 1]) {
    const railX = porch.centerX + side * (porch.width / 2 - 0.14);
    a.box(rails, palette.trim, railX, 0.9, deckCenterZ, 0.11, 0.95, porch.depth - 0.18);
    for (const z of [deckCenterZ - porch.depth / 2 + 0.16, railZ])
      a.box(rails, palette.trim, railX, 0.87, z, 0.11, 0.1, 0.11);
  }
  const railWidth = Math.max(0.8, porch.width - 1.75);
  a.box(rails, palette.trim, porch.centerX, 0.73, railZ, railWidth, 0.11, 0.09);
  a.box(rails, palette.trim, porch.centerX, 1.32, railZ, railWidth, 0.11, 0.09);
  for (let x = -railWidth / 2 + 0.16; x < railWidth / 2; x += 0.32)
    a.box(rails, palette.trim, porch.centerX + x, 1.02, railZ, 0.055, 0.52, 0.06);

  const stairs = pieces.get('porch-stairs')!;
  for (let step = 0; step < 3; step++)
    a.box(
      stairs,
      surface(a, 'stone', '#c8c0ad'),
      porch.centerX,
      0.14 + step * 0.12,
      deckCenterZ + porch.depth / 2 + 0.19 + step * 0.29,
      1.42 + step * 0.17,
      0.16,
      0.32,
    );

  const roofGroup = pieces.get('porch-roof')!;
  const canopy = a.group(roofGroup, porch.centerX, 0, deckCenterZ);
  canopy.name = 'covered-entry-roof';
  pitchedRoof(
    a,
    canopy,
    porch.width + 0.54,
    porch.depth + 0.5,
    porch.roofRise,
    porch.roofEaveY,
    roof,
    wall,
    style === 'craftsman' ? palette.wood : palette.trim,
  );

  const trim = pieces.get('porch')!;
  if (style === 'craftsman') {
    for (const side of [-1, 1]) {
      const bracket = a.box(
        trim,
        palette.wood,
        porch.centerX + side * (porch.width / 2 - 0.38),
        2.48,
        deckCenterZ - porch.depth / 2 + 0.12,
        0.14,
        0.58,
        0.12,
      );
      bracket.rotation.z = side * -0.48;
    }
  }
}

function addRoofline(
  a: AssetLibrary,
  blueprint: ChapterTwoHouseBlueprint,
  pieces: ReadonlyMap<string, T.Group>,
  palette: HousePalette,
) {
  const chimney = pieces.get('roofline')!;
  const c = blueprint.chimney;
  a.box(
    chimney,
    surface(a, 'brick', '#9a6048'),
    c.x,
    c.bottomY + c.height / 2,
    c.z,
    0.55,
    c.height,
    0.58,
  );
  a.box(chimney, palette.stone, c.x, c.bottomY + c.height, c.z, 0.7, 0.14, 0.73);
  a.box(chimney, '#4f5049', c.x, c.bottomY + c.height + 0.09, c.z, 0.39, 0.06, 0.41);
}

export function buildChapterTwoHouse(
  a: AssetLibrary,
  parent: T.Group,
  lot: NeighborLot,
  styleName: NeighborStyle,
): ChapterTwoHouse {
  const blueprint = blueprintFor(lot);
  const palette = STYLE[styleName];
  const wall = surface(a, palette.wallFinish, palette.wall);
  const roof = surface(a, 'shingles', palette.roof);
  const stone = surface(a, 'stone', palette.stone);
  const trim = a.material(palette.trim);
  const root = a.group(parent);
  root.name = `chapter-two-house:${lot}:${styleName}`;
  root.userData['lot'] = lot;
  root.userData['style'] = styleName;
  root.userData['blueprintId'] = blueprint.id;
  root.userData['architecturalDetail'] =
    styleName === 'cottage'
      ? 'cottage-dormer'
      : styleName === 'craftsman'
        ? 'craftsman-beam'
        : 'brick-lintel';

  const pieces = new Map<string, T.Group>();
  for (const step of blueprint.assembly) {
    const piece = a.group(root);
    piece.name = step.id;
    piece.userData['assemblyId'] = step.id;
    piece.userData['staticBatchBoundary'] = true;
    pieces.set(step.id, piece);
  }

  const foundation = pieces.get('foundation')!;
  for (const volume of blueprint.volumes)
    a.box(
      foundation,
      stone,
      volume.centerX,
      volume.bottomY - 0.16,
      volume.centerZ,
      volume.width + 0.26,
      0.34,
      volume.depth + 0.26,
    );

  for (const volume of blueprint.volumes) {
    const mass = pieces.get(volume.assemblyId)!;
    a.box(
      mass,
      wall,
      volume.centerX,
      volume.bottomY + volume.height / 2,
      volume.centerZ,
      volume.width,
      volume.height,
      volume.depth,
    );
    if (volume.assemblyId !== 'upper-walls') {
      const front = volume.centerZ + volume.depth / 2;
      const trimColor = styleName === 'craftsman' ? palette.wood : palette.trim;
      for (const x of [
        volume.centerX - volume.width / 2 + 0.08,
        volume.centerX + volume.width / 2 - 0.08,
      ])
        a.box(
          mass,
          trimColor,
          x,
          volume.bottomY + volume.height / 2,
          front + 0.018,
          0.12,
          volume.height + 0.04,
          0.1,
        );
      a.box(
        mass,
        palette.trim,
        volume.centerX,
        volume.bottomY + volume.height - 0.04,
        front + 0.02,
        volume.width - 0.18,
        0.12,
        0.11,
      );
    }
  }
  addVolumeTrim(a, pieces.get('details')!, blueprint, styleName, trim, palette);

  for (const roofDefinition of blueprint.roofs) {
    const roofRoot = a.group(
      pieces.get(roofDefinition.assemblyId)!,
      roofDefinition.centerX,
      0,
      roofDefinition.centerZ,
      roofDefinition.rotationY ?? 0,
    );
    roofRoot.name = `${roofDefinition.assemblyId}-construction`;
    pitchedRoof(
      a,
      roofRoot,
      roofDefinition.width,
      roofDefinition.depth,
      roofDefinition.rise,
      roofDefinition.eaveY,
      roof,
      wall,
      styleName === 'craftsman' ? palette.wood : palette.trim,
    );
  }

  addOpenings(a, pieces.get('openings')!, blueprint, styleName, palette);
  addResidentialDoor(
    a,
    pieces.get('openings')!,
    blueprint.door.x,
    blueprint.door.z,
    palette.trim,
    styleName === 'craftsman',
  );
  addPorch(a, blueprint, styleName, palette, pieces, roof, wall);
  addRoofline(a, blueprint, pieces, palette);

  if (blueprint.frontGables?.length) {
    const gables = pieces.get('front-gables')!;
    for (const [index, detail] of blueprint.frontGables.entries()) {
      const gable = a.group(gables, detail.centerX, 0, detail.centerZ, Math.PI / 2);
      gable.name = `front-gable-${index + 1}`;
      pitchedRoof(
        a,
        gable,
        detail.width,
        detail.depth,
        detail.rise,
        detail.eaveY,
        roof,
        wall,
        styleName === 'craftsman' ? palette.wood : palette.trim,
      );
      if (styleName === 'craftsman') {
        const beam = a.box(
          gables,
          palette.wood,
          detail.centerX,
          detail.eaveY + detail.rise * 0.53,
          detail.centerZ + detail.depth / 2,
          0.14,
          detail.rise * 0.78,
          0.12,
        );
        beam.rotation.z = Math.PI / 2;
      }
    }
  }

  if (blueprint.dormer) {
    const dormer = pieces.get('details')!;
    const d = blueprint.dormer;
    a.box(dormer, wall, d.x, d.baseY + 0.43, d.z, 1.2, 0.86, 0.96);
    const cap = a.group(dormer, d.x, 0, d.z, Math.PI / 2);
    pitchedRoof(a, cap, 1.48, 1.25, 0.58, d.baseY + 0.82, roof, wall, palette.trim);
    addResidentialWindow(a, dormer, d.x, d.baseY + 0.44, d.z + 0.51, 0.59, 0.68, 0, palette.trim);
    a.box(dormer, palette.wood, d.x, d.baseY - 0.06, d.z + 0.59, 1.23, 0.1, 0.18);
  }

  if (styleName === 'craftsman') {
    const details = pieces.get('details')!;
    for (const volume of blueprint.volumes.filter((entry) => entry.assemblyId === 'walls')) {
      const frontZ = volume.centerZ + volume.depth / 2 + 0.1;
      for (const side of [-1, 1]) {
        const bracket = a.box(
          details,
          palette.wood,
          volume.centerX + side * (volume.width / 2 - 0.45),
          volume.bottomY + volume.height - 0.18,
          frontZ,
          0.13,
          0.64,
          0.12,
        );
        bracket.rotation.z = side * 0.4;
      }
    }
  } else if (styleName === 'brick') {
    const details = pieces.get('details')!;
    for (const volume of blueprint.volumes.filter((entry) => entry.assemblyId === 'walls'))
      for (const side of [-1, 1])
        a.box(
          details,
          palette.trim,
          volume.centerX + side * (volume.width / 2 - 0.16),
          volume.bottomY + volume.height / 2,
          volume.centerZ + volume.depth / 2 + 0.08,
          0.13,
          volume.height + 0.04,
          0.1,
        );
  }

  // Recentre each curated silhouette on its lot anchor. The offsets live with the blueprint so
  // doors, garages, walkways and house geometry share one stable local coordinate system.
  for (const piece of pieces.values()) {
    piece.position.x -= blueprint.visualCenter.x;
    piece.position.z -= blueprint.visualCenter.z;
  }
  return { root, pieces };
}
