import * as T from 'three';
import type { AssetLibrary } from './assets';
import { surface } from './surfaces';

const TRIM = '#eee6d3',
  WOOD = '#8b5736';
const ROOF_COLORS: Record<string, string> = { clay: '#886350', slate: '#454f58', moss: '#52634b' };
type Paint = T.MeshStandardMaterial | string;

function gable(
  a: AssetLibrary,
  p: T.Object3D,
  width: number,
  rise: number,
  y: number,
  z: number,
  material: Paint,
) {
  const shape = new T.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  a.mesh(
    p,
    a.geometry(new T.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false })),
    material,
    0,
    y,
    z,
  );
}

/** Ridge lies along X; optional rotation supplies gable-front wings and dormers. */
export function pitchedRoof(
  a: AssetLibrary,
  p: T.Object3D,
  width: number,
  depth: number,
  rise: number,
  eave: number,
  roof: Paint,
  wall: Paint,
  trim = TRIM,
  openPositiveEnd = false,
) {
  const angle = Math.atan2(rise, depth / 2),
    length = Math.hypot(rise, depth / 2);
  for (const side of [-1, 1]) {
    const panel = a.box(p, roof, 0, eave + rise / 2, (side * depth) / 4, width, 0.1, length + 0.12);
    panel.rotation.x = side * angle;
    a.box(p, trim, 0, eave - 0.06, (side * depth) / 2, width + 0.06, 0.12, 0.13);
    for (const x of [-width / 2, width / 2]) {
      const fascia = a.box(
        p,
        trim,
        x,
        eave + rise / 2,
        (side * depth) / 4,
        0.1,
        0.13,
        length + 0.17,
      );
      fascia.rotation.x = side * angle;
    }
  }
  a.box(p, roof, 0, eave + rise + 0.07, 0, width + 0.04, 0.1, 0.16);
  for (const x of openPositiveEnd ? [-width / 2 + 0.17] : [-width / 2 + 0.17, width / 2 - 0.25]) {
    const end = a.group(p, x, 0, 0, Math.PI / 2);
    gable(a, end, depth - 0.2, rise - 0.05, eave - 0.03, 0, wall);
  }
}

function window(
  a: AssetLibrary,
  p: T.Object3D,
  x: number,
  y: number,
  z: number,
  width = 0.9,
  height = 1.2,
  rotation = 0,
  trim = TRIM,
  shutters = false,
) {
  const g = a.group(p, x, y, z, rotation);
  a.box(g, trim, 0, 0, 0, width + 0.18, height + 0.18, 0.13);
  a.box(g, a.glass(), 0, 0, 0.085, width, height, 0.035);
  for (const xx of [-width * 0.38, width * 0.38])
    a.box(g, '#d6c7a1', xx, 0, 0.11, 0.09, height * 0.92, 0.025);
  a.box(g, trim, 0, 0, 0.14, 0.045, height, 0.04);
  a.box(g, trim, 0, 0.03, 0.14, width, 0.045, 0.04);
  a.box(g, trim, 0, -height / 2 - 0.12, 0.08, width + 0.28, 0.12, 0.28);
  a.box(g, trim, 0, height / 2 + 0.12, 0.02, width + 0.28, 0.1, 0.16);
  if (shutters)
    for (const side of [-1, 1]) {
      a.box(g, '#3f5747', side * (width / 2 + 0.28), 0, -0.01, 0.28, height + 0.06, 0.07);
      for (let yy = -height / 2 + 0.1; yy < height / 2; yy += 0.13)
        a.box(g, '#516451', side * (width / 2 + 0.28), yy, 0.035, 0.23, 0.025, 0.02);
    }
  return g;
}

function door(
  a: AssetLibrary,
  g: T.Object3D,
  x: number,
  z: number,
  trim: string,
  craftsman = false,
) {
  const frame = a.group(g, x, 0.45, z);
  frame.name = 'front-door';
  a.box(frame, trim, 0, 1.05, 0, 1.15, 2.25, 0.17);
  const timber = surface(a, 'wood', craftsman ? '#80532f' : '#98663d');
  a.box(frame, timber, 0, 1, 0.11, 0.94, 2.04, 0.14);
  a.box(frame, a.glass(), 0, 1.56, 0.19, 0.65, 0.63, 0.02);
  for (const xx of [-0.19, 0.19]) a.box(frame, timber, xx, 1.56, 0.21, 0.035, 0.66, 0.03);
  for (const xx of [-0.22, 0.22]) {
    a.box(frame, '#704727', xx, 0.66, 0.2, 0.33, 0.61, 0.025);
    a.box(frame, '#af8050', xx, 0.66, 0.22, 0.27, 0.55, 0.018);
  }
  a.sphere(frame, '#b29b67', 0.31, 1.0, 0.22, 0.047);
}

function railing(
  a: AssetLibrary,
  g: T.Object3D,
  x: number,
  z: number,
  width: number,
  color: string,
) {
  for (const xx of [-width / 2, width / 2]) {
    a.box(g, color, x + xx, 0.95, z, 0.12, 1.08, 0.12);
    a.box(g, color, x + xx, 1.5, z, 0.18, 0.08, 0.18);
  }
  for (let xx = -0.5 * width + 0.2; xx < width / 2 - 0.1; xx += 0.19)
    a.box(g, color, x + xx, 0.99, z, 0.055, 0.76, 0.055);
  for (const y of [0.57, 1.4]) a.box(g, color, x, y, z, width, 0.09, 0.1);
}

function porch(
  a: AssetLibrary,
  g: T.Object3D,
  roof: Paint,
  wall: Paint,
  craftsman: boolean,
  brick: boolean,
) {
  const width = brick ? 2.2 : 5.6,
    center = brick ? -0.35 : 0;
  const paving = surface(a, 'stone', '#bcb4a0');
  a.box(g, paving, center, 0.3, 2.85, width, 0.38, 1.5);
  for (let i = 0; i < 3; i++)
    a.box(g, '#c4bba7', -0.35, 0.12 + i * 0.1, 3.75 - i * 0.24, 1.55 + i * 0.14, 0.19, 0.37);
  const post = craftsman ? '#785333' : TRIM;
  for (const x of brick ? [-1.28, 0.58] : [-2.55, -0.9, 0.9, 2.55]) {
    if (craftsman) {
      a.box(g, paving, x, 0.92, 3.35, 0.48, 1.0, 0.48);
      a.box(g, '#c9bda1', x, 1.43, 3.35, 0.55, 0.12, 0.55);
    }
    a.box(
      g,
      post,
      x,
      craftsman ? 2.05 : 1.67,
      3.35,
      craftsman ? 0.22 : 0.13,
      craftsman ? 1.35 : 2.4,
      craftsman ? 0.22 : 0.13,
    );
    if (!craftsman) a.box(g, TRIM, x, 2.73, 3.35, 0.24, 0.15, 0.24);
  }
  a.box(g, post, center, 2.83, 3.35, width + 0.2, 0.2, 0.2);
  if (brick) {
    const portico = a.group(g, -0.35, 0, 2.95, Math.PI / 2);
    pitchedRoof(a, portico, 1.8, 2.5, 0.57, 2.95, roof, wall);
  } else {
    const canopy = a.box(g, roof, 0, 3.02, 2.9, 6.1, 0.13, 1.9);
    canopy.rotation.x = 0.2;
    a.box(g, post, 0, 2.85, 3.8, 6.1, 0.12, 0.12);
    railing(a, g, -1.83, 3.5, 1.45, post);
    railing(a, g, 1.53, 3.5, 2.05, post);
    for (const side of [-1, 1]) {
      const end = a.group(g, side * 2.75, 0, 2.9, Math.PI / 2);
      railing(a, end, 0, 0, 1.22, post);
    }
  }
}

function dormer(a: AssetLibrary, g: T.Object3D, x: number, roof: Paint, wall: Paint) {
  const d = a.group(g, x, 0, 1.4);
  a.box(d, wall, 0, 4.12, 0, 1.25, 1.14, 1.55);
  // Bury the rear cap in the main pitch, leaving no detached rear gable above it.
  const cap = a.group(d, 0, 0, -0.225, Math.PI / 2);
  pitchedRoof(a, cap, 2.35, 1.55, 0.65, 4.7, roof, wall, TRIM, true);
  window(a, d, 0, 4.12, 0.8, 0.67, 0.88);
  a.flowerBox(d, 0, 3.5, 0.88, '#8b7051');
}

function garage(a: AssetLibrary, g: T.Object3D, roof: Paint, wall: Paint, craftsman: boolean) {
  const wing = a.group(g, 4.02, 0, -0.25);
  a.box(wing, surface(a, 'stone', '#aba594'), 0, 0.22, 0, 2.4, 0.35, 3.8);
  a.box(wing, wall, 0, 1.4, 0, 2.3, 2.15, 3.5);
  const cap = a.group(wing, 0, 0, 0, Math.PI / 2);
  pitchedRoof(a, cap, 4, 2.65, 0.95, 2.53, roof, wall, craftsman ? '#97774c' : TRIM);
  const doorMaterial = craftsman ? surface(a, 'wood', '#8b633e') : a.material('#dfd8c6');
  a.box(wing, TRIM, 0, 1.33, 1.79, 2.15, 2.2, 0.1);
  a.box(wing, doorMaterial, 0, 1.32, 1.87, 1.97, 2.07, 0.08);
  for (const y of [0.52, 1.02, 1.52])
    a.box(wing, craftsman ? '#694c33' : '#b3ad9b', 0, y, 1.93, 1.94, 0.025, 0.02);
  for (const x of [-0.69, -0.23, 0.23, 0.69]) {
    a.box(wing, '#b4ae98', x, 2.02, 1.94, 0.41, 0.37, 0.03);
    a.box(wing, a.glass(), x, 2.02, 1.97, 0.33, 0.28, 0.025);
  }
  window(a, wing, 1.19, 1.5, -0.15, 0.8, 0.95, Math.PI / 2);
  window(a, wing, 0, 1.5, -1.8, 0.85, 0.9, Math.PI);
}

export interface StartingHouseAsset {
  root: T.Group;
  assemblies: ReadonlyMap<string, T.Group>;
}

export function buildStartingHouse(
  a: AssetLibrary,
  parent: T.Group,
  choice: string,
  roofChoice?: string,
): StartingHouseAsset {
  const craftsman = choice === 'cream',
    brick = choice === 'blue';
  const wall = surface(
    a,
    craftsman ? 'wood' : brick ? 'brick' : 'siding',
    craftsman ? '#a17b50' : brick ? '#995d46' : '#e3dcc6',
  );
  const roof = surface(
    a,
    'shingles',
    ROOF_COLORS[roofChoice || ''] || (craftsman ? '#454944' : '#414b50'),
  );
  const g = a.group(parent, -5, 0.13, -4.6);
  g.name = 'starting-home';
  const assemblies = new Map<string, T.Group>();
  const assembly = (id: string) => {
    const part = a.group(g);
    part.userData['assemblyId'] = id;
    assemblies.set(id, part);
    return part;
  };
  const foundation = assembly('foundation'),
    walls = assembly('walls'),
    openings = assembly('openings'),
    entry = assembly('entry'),
    roofline = assembly('roofline'),
    garagePiece = assembly('garage'),
    details = assembly('details');

  a.box(foundation, surface(a, 'stone', '#a9a18d'), 0, 0.23, 0, 6, 0.4, 4.7);
  a.box(walls, wall, 0, 1.72, 0, 5.8, 2.65, 4.4);
  for (const x of [-2.9, 2.9])
    for (const z of [-2.2, 2.2])
      a.box(walls, craftsman ? '#725234' : TRIM, x, 1.75, z, 0.13, 2.8, 0.13);
  if (craftsman) {
    a.box(walls, wall, -0.6, 3.7, -0.2, 4.6, 1.5, 4);
    pitchedRoof(a, roofline, 6.35, 5.05, 1.65, 4.33, roof, wall, '#9b7b50');
    const front = a.group(roofline, -1.0, 0, 1.2, Math.PI / 2);
    pitchedRoof(a, front, 2.8, 3.25, 1.05, 4.5, roof, wall, '#9b7b50');
    a.box(walls, wall, -1, 3.9, 1.4, 2.9, 1.4, 1.5);
    window(a, openings, -1.55, 4.0, 2.2, 0.82, 1.04, 0, '#ab8a5b');
    window(a, openings, -0.35, 4.0, 2.2, 0.82, 1.04, 0, '#ab8a5b');
    for (const x of [-1.8, -0.2]) a.box(openings, '#765035', x, 4.9, 2.24, 0.08, 0.55, 0.08);
    window(a, openings, 1.4, 3.8, -2.25, 0.85, 1.05, Math.PI, '#ab8a5b');
    window(a, openings, 2.96, 4.98, -0.2, 0.62, 0.78, Math.PI / 2, '#ab8a5b');
  } else {
    pitchedRoof(a, roofline, 6.4, 5.2, 2.38, 3.0, roof, wall);
    dormer(a, roofline, -1.55, roof, wall);
    dormer(a, roofline, 1.35, roof, wall);
    window(a, openings, -2.94, 4.05, 0, 0.7, 0.95, -Math.PI / 2);
    window(a, openings, 2.94, 4.05, 0, 0.7, 0.95, Math.PI / 2);
  }
  porch(a, entry, roof, wall, craftsman, brick);
  door(a, entry, -0.35, 2.24, craftsman ? '#9c7c50' : TRIM, craftsman);
  for (const x of [-1.8, 1.45]) {
    window(a, openings, x, 1.72, 2.24, x > 0 ? 1.15 : 0.95, 1.3, 0, TRIM, brick);
    if (!brick) a.flowerBox(openings, x, 0.92, 2.4, craftsman ? '#785b3e' : '#c3b492');
  }
  // Deliberate rear elevation: a back door, paired windows and small garden steps.
  for (const x of [-1.65, 1.5]) window(a, openings, x, 1.7, -2.24, 0.9, 1.15, Math.PI);
  const back = a.group(openings, 0, 0, -2.24, Math.PI);
  a.box(back, '#9b764b', -0.35, 1.35, 0.1, 0.85, 2.0, 0.12);
  a.box(back, a.glass(), -0.35, 1.8, 0.18, 0.57, 0.65, 0.025);
  a.box(details, '#bfb7a1', 0.35, 0.28, -2.65, 1.4, 0.4, 0.8);
  a.box(details, '#ccc4ae', 0.35, 0.13, -3.14, 1.6, 0.16, 0.35);
  for (const z of [-1.1, 1.1]) window(a, openings, -2.94, 1.7, z, 0.75, 1.1, -Math.PI / 2);
  const chimney = surface(a, 'brick', brick ? '#9b5c43' : '#ac8067');
  const chimneyLift = craftsman ? 0.85 : 0;
  a.box(roofline, chimney, 2.03, 4.77 + chimneyLift, -0.85, 0.56, 1.65, 0.65);
  a.box(roofline, '#b8ad95', 2.03, 5.62 + chimneyLift, -0.85, 0.73, 0.15, 0.79);
  a.box(roofline, '#524b3f', 2.03, 5.71 + chimneyLift, -0.85, 0.37, 0.04, 0.43);
  garage(a, garagePiece, roof, wall, craftsman);
  a.lantern(details, 0.4, 2.17, 2.55, false);
  a.lantern(details, -1.0, 2.0, -2.6, false);
  return { root: g, assemblies };
}
