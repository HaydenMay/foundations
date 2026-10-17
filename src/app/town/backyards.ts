import * as T from 'three';
import type { AssetLibrary } from './assets';
import { surface } from './surfaces';
import { shrub } from './landscaping';

function rounded(
  a: AssetLibrary,
  p: T.Object3D,
  width: number,
  depth: number,
  radius: number,
  y: number,
  material: T.Material,
) {
  const s = new T.Shape(),
    x = -width / 2,
    z = -depth / 2;
  s.moveTo(x + radius, z);
  s.lineTo(x + width - radius, z);
  s.quadraticCurveTo(x + width, z, x + width, z + radius);
  s.lineTo(x + width, z + depth - radius);
  s.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth);
  s.lineTo(x + radius, z + depth);
  s.quadraticCurveTo(x, z + depth, x, z + depth - radius);
  s.lineTo(x, z + radius);
  s.quadraticCurveTo(x, z, x + radius, z);
  const mesh = a.mesh(
    p,
    a.geometry(new T.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 8 })),
    material,
    0,
    y,
    0,
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
function lounge(a: AssetLibrary, p: T.Object3D, x: number, z: number) {
  const wood = surface(a, 'wood', '#b39a72');
  a.box(p, wood, x, 0.33, z, 0.66, 0.1, 1.3);
  a.box(p, '#ded5bd', x, 0.42, z + 0.18, 0.57, 0.11, 0.94);
  const back = a.box(p, '#e5dcc3', x, 0.66, z - 0.62, 0.57, 0.1, 0.65);
  back.rotation.x = -0.7;
  for (const side of [-1, 1]) a.box(p, wood, x + side * 0.23, 0.18, z, 0.06, 0.3, 1.0);
}
export function buildBackyard(a: AssetLibrary, parent: T.Group, choice: string) {
  const g = a.group(parent, -10, 0.13, -8.2);
  g.name = 'backyard-project';
  if (choice === 'pool') {
    rounded(a, g, 3.8, 4.7, 0.68, 0.02, surface(a, 'paving', '#c5b79d'));
    rounded(a, g, 3.2, 4.03, 0.9, 0.13, a.material('#d5d6bf'));
    rounded(a, g, 2.94, 3.76, 0.85, 0.19, surface(a, 'water', '#3994ac'));
    const chrome = a.namedMaterial(
      'pool-metal',
      () => new T.MeshStandardMaterial({ color: '#bdc3b5', metalness: 0.65, roughness: 0.28 }),
    );
    for (const x of [0.82, 1.15]) {
      a.cylinder(g, chrome, x, 0.48, 1.64, 0.025, 0.7);
      for (let y = 0.2; y < 0.65; y += 0.18) a.box(g, chrome, 0.985, y, 1.65, 0.37, 0.025, 0.05);
    }
    lounge(a, g, -1.1, -3.0);
    lounge(a, g, -0.15, -3.0);
    a.cylinder(g, '#a58f69', 1, 1.4, -2.7, 0.035, 2.65);
    a.mesh(
      g,
      a.cachedGeometry('garden-parasol', () => new T.ConeGeometry(1, 0.4, 12)),
      '#e4cda4',
      1,
      2.8,
      -2.7,
      1.05,
      1,
      1.05,
    );
    a.sphere(g, '#b79d74', 1, 3.03, -2.7, 0.055);
  } else if (choice === 'fort') {
    const cedar = surface(a, 'wood', '#aa8052'),
      trim = '#795333';
    for (const x of [-0.95, 0.95])
      for (const z of [-0.9, 0.9]) a.box(g, cedar, x, 1.14, z, 0.15, 2.25, 0.15);
    a.box(g, cedar, 0, 1.2, 0, 2.2, 0.14, 2.15);
    for (const z of [-0.97, 0.97]) {
      a.box(g, cedar, 0, 1.96, z, 2.15, 0.13, 0.1);
      for (let x = -0.88; x < 1; x += 0.25)
        if (z < 0 || x < -0.2) a.box(g, cedar, x, 1.64, z, 0.075, 0.58, 0.075);
    }
    for (const x of [-0.99, 0.99]) a.box(g, cedar, x, 1.92, 0, 0.1, 0.13, 2);
    const angle = Math.atan2(0.65, 1.25),
      length = Math.hypot(0.65, 1.25);
    for (const side of [-1, 1]) {
      const roof = a.box(
        g,
        surface(a, 'wood', '#94704a'),
        side * 0.625,
        2.9,
        0,
        length + 0.1,
        0.1,
        2.65,
      );
      roof.rotation.z = -side * angle;
    }
    a.box(g, trim, 0, 3.23, 0, 0.12, 0.1, 2.7);
    // The slide stays entirely in the same left/rear zone for every house.
    const slide = a.group(g, 0.65, 0.7, 1.75);
    slide.rotation.x = 0.55;
    a.box(slide, '#507a69', 0, 0, 0, 0.65, 0.075, 2.1);
    for (const x of [-0.34, 0.34]) a.box(slide, '#638979', x, 0.09, 0, 0.07, 0.2, 2.15);
    for (const x of [-1.0, -0.4]) {
      const rail = a.box(g, cedar, x, 0.65, 1.48, 0.08, 1.5, 0.09);
      rail.rotation.x = -0.4;
    }
    for (let i = 0; i < 5; i++)
      a.box(g, cedar, -0.7, 0.15 + i * 0.23, 1.74 - i * 0.1, 0.68, 0.06, 0.12);
    a.box(g, cedar, -1.03, 0.12, 2.4, 1.12, 0.2, 0.88);
    a.box(g, '#cab883', -1.03, 0.23, 2.4, 0.91, 0.03, 0.68);
  } else {
    const steel = a.namedMaterial(
      'trampoline-steel',
      () => new T.MeshStandardMaterial({ color: '#9ba6a0', metalness: 0.55, roughness: 0.36 }),
    );
    a.cylinder(g, '#394945', 0, 0.58, 0, 1.57, 0.15);
    a.cylinder(g, '#253d3c', 0, 0.67, 0, 1.43, 0.035);
    const net = a.namedMaterial('trampoline-net', () => {
      const bytes = new Uint8Array(64 * 64 * 4);
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const i = (y * 64 + x) * 4;
          bytes[i] = 65;
          bytes[i + 1] = 78;
          bytes[i + 2] = 72;
          bytes[i + 3] = x % 8 < 1 || y % 8 < 1 ? 180 : 0;
        }
      const map = a.texture(new T.DataTexture(bytes, 64, 64));
      map.needsUpdate = true;
      map.wrapS = map.wrapT = T.RepeatWrapping;
      map.repeat.set(8, 2);
      return new T.MeshStandardMaterial({
        color: '#abb7b0',
        map,
        transparent: true,
        opacity: 0.7,
        side: T.DoubleSide,
        depthWrite: false,
        roughness: 0.9,
      });
    });
    const wall = a.geometry(new T.CylinderGeometry(1.57, 1.57, 1.55, 40, 1, true));
    a.mesh(g, wall, net, 0, 1.5, 0);
    const ring = a.mesh(
      g,
      a.geometry(new T.TorusGeometry(1.57, 0.028, 6, 40)),
      '#637c78',
      0,
      2.27,
      0,
    );
    ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4,
        x = Math.sin(angle) * 1.58,
        z = Math.cos(angle) * 1.58;
      a.cylinder(g, steel, x, 1.35, z, 0.027, 1.95);
      a.cylinder(g, '#6a827b', x, 1.72, z, 0.045, 1.1);
      a.cylinder(g, steel, x, 0.28, z, 0.04, 0.48);
    }
    a.box(g, '#b8b3a0', 0, 0.12, 2.05, 0.8, 0.18, 0.55);
  }
  for (const x of [-1.85, 1.85]) shrub(a, g, x, 2.6, 0.36, true, x + 8);
  return g;
}
