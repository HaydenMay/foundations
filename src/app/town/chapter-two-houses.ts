import * as T from 'three';
import type { AssetLibrary } from './assets';
import type { Project } from '../domain/models';
import { surface } from './surfaces';

export type NeighborLot = NonNullable<Project['lot']>;
export type NeighborStyle = 'cottage' | 'craftsman' | 'brick';

export interface ChapterTwoHouse {
  root: T.Group;
  pieces: ReadonlyMap<string, T.Group>;
}

interface LotShape {
  width: number;
  depth: number;
  eaves: number;
  rise: number;
  porchWidth: number;
  porchDepth: number;
  twoStorey?: boolean;
  lShape?: boolean;
}

const LOTS: Record<NeighborLot, LotShape> = {
  compact: { width: 5.35, depth: 4.2, eaves: 2.45, rise: 1.48, porchWidth: 2.9, porchDepth: 1.25 },
  'l-shaped': {
    width: 7.45,
    depth: 5.85,
    eaves: 2.62,
    rise: 1.55,
    porchWidth: 3.1,
    porchDepth: 1.2,
    lShape: true,
  },
  'two-story': {
    width: 7.25,
    depth: 6.1,
    eaves: 4.45,
    rise: 1.9,
    porchWidth: 5.4,
    porchDepth: 1.55,
    twoStorey: true,
  },
  'wide-gable': {
    width: 8.15,
    depth: 4.95,
    eaves: 2.7,
    rise: 1.72,
    porchWidth: 3.7,
    porchDepth: 1.3,
  },
};

const STYLE = {
  cottage: {
    finish: 'siding' as const,
    wall: '#e5dec9',
    roof: '#3e494d',
    trim: '#f2eddf',
    wood: '#77563b',
    foundation: '#aaa593',
  },
  craftsman: {
    finish: 'wood' as const,
    wall: '#a17b50',
    roof: '#434943',
    trim: '#dccbaa',
    wood: '#704b2e',
    foundation: '#978c78',
  },
  brick: {
    finish: 'brick' as const,
    wall: '#9e5d48',
    roof: '#404a50',
    trim: '#eee8da',
    wood: '#684a38',
    foundation: '#a59d8c',
  },
};

function addOpening(
  a: AssetLibrary,
  parent: T.Group,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  rotation = 0,
) {
  const opening = a.window(parent, x, y, z, width, height, rotation);
  opening.name = 'house-window';
  return opening;
}

export function buildChapterTwoHouse(
  a: AssetLibrary,
  parent: T.Group,
  lot: NeighborLot,
  styleName: NeighborStyle,
): ChapterTwoHouse {
  const shape = LOTS[lot];
  const palette = STYLE[styleName];
  const root = a.group(parent);
  root.name = `chapter-two-house:${lot}:${styleName}`;
  root.userData['lot'] = lot;
  root.userData['style'] = styleName;
  root.userData['architecturalDetail'] =
    styleName === 'cottage'
      ? 'cottage-dormer'
      : styleName === 'craftsman'
        ? 'craftsman-beam'
        : 'brick-lintel';
  const pieces = new Map<string, T.Group>();
  const part = (id: string) => {
    const piece = a.group(root);
    piece.name = id;
    piece.userData['assemblyId'] = id;
    pieces.set(id, piece);
    return piece;
  };
  const foundation = part('foundation');
  const walls = part('walls');
  const roofline = part('roofline');
  const openings = part('openings');
  const porch = part('porch');
  const details = part('details');
  const garage = shape.lShape ? part('garage') : undefined;

  const wall = surface(a, palette.finish, palette.wall);
  const roof = surface(a, 'shingles', palette.roof);
  const trim = a.material(palette.trim);
  const stone = surface(a, 'stone', palette.foundation);
  const mainWidth = shape.lShape ? 4.9 : shape.width;
  const mainCenterX = shape.lShape ? -0.9 : 0;
  const mainDepth = shape.lShape ? shape.depth - 0.6 : shape.depth;
  const wallHeight = shape.twoStorey ? 2.8 : shape.eaves;
  const firstFloorCenterY = wallHeight / 2 + 0.16;

  a.box(foundation, stone, mainCenterX, 0.22, 0, mainWidth + 0.34, 0.38, mainDepth + 0.34);
  a.box(walls, wall, mainCenterX, firstFloorCenterY, 0, mainWidth, wallHeight, mainDepth);
  for (const x of [mainCenterX - mainWidth / 2 + 0.12, mainCenterX + mainWidth / 2 - 0.12]) {
    for (const z of [-mainDepth / 2 + 0.11, mainDepth / 2 - 0.11])
      a.box(
        walls,
        styleName === 'craftsman' ? palette.wood : trim,
        x,
        firstFloorCenterY,
        z,
        0.16,
        wallHeight + 0.08,
        0.15,
      );
  }

  if (shape.twoStorey) {
    a.box(walls, wall, 0, 3.7, -0.1, mainWidth - 0.9, 1.75, mainDepth - 0.8);
    a.box(foundation, stone, 0, 2.84, 0, mainWidth - 0.72, 0.14, mainDepth - 0.55);
  }
  if (shape.lShape) {
    const wingX = 2.25,
      wingZ = -0.7,
      wingWidth = 2.45,
      wingDepth = 3.8;
    a.box(foundation, stone, wingX, 0.22, wingZ, wingWidth + 0.25, 0.38, wingDepth + 0.28);
    a.box(walls, wall, wingX, 1.34, wingZ, wingWidth, 2.45, wingDepth);
    const garageDoor = a.group(garage!, wingX, 0, wingZ + wingDepth / 2 + 0.045);
    garageDoor.name = 'attached-garage-door';
    a.box(garageDoor, trim, 0, 1.2, 0, 2.22, 2.2, 0.12);
    a.box(garageDoor, palette.wood, 0, 1.2, 0.075, 2.04, 2.0, 0.07);
    for (const y of [0.52, 1.08, 1.64])
      a.box(
        garageDoor,
        styleName === 'craftsman' ? '#b49b78' : '#c5bca9',
        0,
        y,
        0.12,
        1.98,
        0.035,
        0.02,
      );
    for (const x of [-0.65, -0.22, 0.22, 0.65]) {
      a.box(garageDoor, trim, x, 2.02, 0.12, 0.34, 0.34, 0.025);
      a.box(garageDoor, a.glass(), x, 2.02, 0.145, 0.27, 0.27, 0.02);
    }
    const wingRoof = a.group(roofline, wingX, 0, wingZ);
    wingRoof.name = 'garage-roofline';
    a.roof(wingRoof, wingWidth + 0.6, wingDepth + 0.55, 1.1, 2.55, palette.roof);
  }

  const roofY = shape.twoStorey ? 4.55 : shape.eaves + 0.02;
  a.roof(roofline, mainWidth + 0.72, mainDepth + 0.72, shape.rise, roofY, palette.roof);
  if (lot === 'wide-gable' || lot === 'two-story') {
    const frontGable = a.group(roofline, shape.lShape ? -0.9 : 0, 0, mainDepth * 0.18, Math.PI / 2);
    frontGable.name = 'front-gable-roof';
    a.roof(frontGable, mainDepth * 0.76, 2.5, shape.rise * 0.78, roofY - 0.03, palette.roof);
  }

  if (shape.twoStorey) {
    for (const x of [-1.7, 1.7])
      addOpening(a, openings, x, 3.73, mainDepth / 2 + 0.025, 0.82, 1.05);
  } else {
    for (const x of [mainCenterX - mainWidth * 0.29, mainCenterX + mainWidth * 0.29])
      addOpening(a, openings, x, 1.63, mainDepth / 2 + 0.025, 0.84, 1.12);
  }
  for (const side of [-1, 1]) {
    addOpening(
      a,
      openings,
      mainCenterX + side * (mainWidth / 2 + 0.02),
      1.62,
      -0.9,
      0.72,
      1.05,
      (side * Math.PI) / 2,
    );
    addOpening(
      a,
      openings,
      mainCenterX + side * (mainWidth / 2 + 0.02),
      1.62,
      0.95,
      0.72,
      1.05,
      (side * Math.PI) / 2,
    );
  }
  for (const x of [-mainWidth * 0.28, mainWidth * 0.28])
    addOpening(a, openings, mainCenterX + x, 1.61, -mainDepth / 2 - 0.025, 0.8, 1.05, Math.PI);

  const doorX = shape.lShape ? -1.0 : 0;
  const door = a.group(openings, doorX, 0, mainDepth / 2 + 0.09);
  door.name = 'front-door';
  a.box(door, trim, 0, 1.16, 0, 1.1, 2.32, 0.16);
  a.box(door, surface(a, 'wood', palette.wood), 0, 1.15, 0.1, 0.88, 2.08, 0.13);
  a.box(door, a.glass(), 0, 1.68, 0.18, 0.56, 0.66, 0.025);
  a.box(door, '#bea374', 0.29, 1.14, 0.19, 0.045, 0.045, 0.04);

  const deckZ = mainDepth / 2 + shape.porchDepth / 2 - 0.02;
  a.box(
    porch,
    surface(a, 'stone', '#bcb5a2'),
    doorX,
    0.31,
    deckZ,
    shape.porchWidth,
    0.3,
    shape.porchDepth,
  );
  for (const x of [-shape.porchWidth / 2 + 0.15, shape.porchWidth / 2 - 0.15]) {
    const colX = doorX + x;
    if (styleName === 'craftsman') a.box(porch, stone, colX, 0.95, deckZ, 0.43, 1.05, 0.43);
    a.box(
      porch,
      styleName === 'craftsman' ? palette.wood : trim,
      colX,
      1.68,
      deckZ,
      0.17,
      1.45,
      0.17,
    );
    a.box(
      porch,
      styleName === 'craftsman' ? palette.wood : trim,
      colX,
      2.43,
      deckZ,
      0.25,
      0.12,
      0.25,
    );
  }
  a.box(
    porch,
    styleName === 'craftsman' ? palette.wood : trim,
    doorX,
    2.42,
    deckZ,
    shape.porchWidth + 0.2,
    0.16,
    0.18,
  );
  const porchRoof = a.box(
    porch,
    roof,
    doorX,
    2.62,
    deckZ + 0.08,
    shape.porchWidth + 0.55,
    0.16,
    shape.porchDepth + 0.36,
  );
  porchRoof.rotation.x = 0.08;
  for (const x of [-shape.porchWidth / 2 + 0.36, shape.porchWidth / 2 - 0.36]) {
    for (const z of [deckZ - shape.porchDepth / 2 + 0.12, deckZ + shape.porchDepth / 2 - 0.12])
      a.box(porch, trim, doorX + x, 0.91, z, 0.09, 0.8, 0.09);
  }
  for (let i = -2; i <= 2; i++) {
    if (Math.abs(i) === 0) continue;
    const railX = doorX + i * Math.min(0.38, shape.porchWidth / 10);
    a.box(porch, trim, railX, 0.62, deckZ + shape.porchDepth / 2 - 0.05, 0.055, 0.52, 0.055);
  }
  a.box(
    porch,
    trim,
    doorX,
    0.86,
    deckZ + shape.porchDepth / 2 - 0.05,
    shape.porchWidth - 0.72,
    0.09,
    0.09,
  );
  for (let step = 0; step < 3; step++)
    a.box(
      porch,
      surface(a, 'stone', '#c6beab'),
      doorX,
      0.16 + step * 0.1,
      deckZ + shape.porchDepth / 2 + 0.22 + step * 0.31,
      1.42 + step * 0.18,
      0.14,
      0.3,
    );

  if (styleName === 'cottage') {
    const dormer = a.group(details, 0.55, 0, mainDepth * 0.16);
    dormer.name = 'cottage-dormer';
    a.box(dormer, wall, 0, roofY + shape.rise * 0.42, 0, 1.18, 0.98, 1.15);
    a.roof(dormer, 1.56, 1.45, 0.58, roofY + shape.rise * 0.42 + 0.5, palette.roof);
    addOpening(a, dormer, 0, roofY + shape.rise * 0.42, 0.6, 0.58, 0.7);
    a.box(details, '#8a7052', 0.55, roofY + 0.18, mainDepth * 0.16 + 0.62, 1.25, 0.09, 0.2);
  }
  if (styleName === 'craftsman') {
    for (const side of [-1, 1]) {
      const beam = a.box(
        details,
        palette.wood,
        doorX + side * 0.68,
        shape.twoStorey ? 4.4 : shape.eaves + 0.12,
        mainDepth / 2 + 0.18,
        0.16,
        0.68,
        0.14,
      );
      beam.rotation.z = side * -0.55;
    }
    for (const x of [-mainWidth * 0.25, mainWidth * 0.25])
      a.box(details, palette.wood, mainCenterX + x, 0.45, mainDepth / 2 + 0.16, 0.1, 0.48, 0.08);
  }
  if (styleName === 'brick') {
    for (const x of [mainCenterX - mainWidth * 0.29, mainCenterX + mainWidth * 0.29]) {
      a.box(details, trim, x, 2.26, mainDepth / 2 + 0.12, 1.02, 0.1, 0.2);
      a.box(details, trim, x, 0.94, mainDepth / 2 + 0.12, 1.03, 0.1, 0.2);
    }
    a.box(details, trim, doorX, 2.4, mainDepth / 2 + 0.14, 1.2, 0.12, 0.22);
  }
  if (lot === 'wide-gable') {
    for (const x of [-2.25, 2.25]) {
      a.box(details, wall, x, 2.62, mainDepth / 2 + 0.035, 1.2, 0.82, 0.14);
      addOpening(a, details, x, 2.62, mainDepth / 2 + 0.12, 0.6, 0.48);
    }
  }

  return { root, pieces };
}
