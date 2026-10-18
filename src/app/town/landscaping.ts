import * as T from 'three';
import type { AssetLibrary } from './assets';
import { surface } from './surfaces';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const GREENS = ['#45613a', '#526c3d', '#607b43', '#71894f'];
const random = (n: number) => {
  const v = Math.sin(n * 91.71 + 3.41) * 41771.4;
  return v - Math.floor(v);
};
type TreeKind = 'oak' | 'birch' | 'flowering' | 'evergreen';

function foliage(a: AssetLibrary, sprays = 23) {
  return a.cachedGeometry(`irregular-foliage:${sprays}`, () => {
    // Small overlapping leaf sprays break the silhouette without alpha overdraw or leaf textures.
    const parts: T.BufferGeometry[] = [];
    for (let i = 0; i < sprays; i++) {
      const angle = i * 2.39996,
        y = 1 - (2 * (i + 0.5)) / sprays;
      const ring = Math.sqrt(1 - y * y),
        radius = 0.23 + random(i + 31) * 0.14;
      const part = new T.IcosahedronGeometry(1, 0);
      part.scale(radius * 1.2, radius * 0.8, radius);
      part.rotateY(angle);
      part.rotateZ(random(i) * 0.8);
      part.translate(Math.cos(angle) * ring * 0.73, y * 0.73, Math.sin(angle) * ring * 0.73);
      parts.push(part);
    }
    const geometry = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    return geometry;
  });
}
function branch(a: AssetLibrary, p: T.Object3D, from: T.Vector3, to: T.Vector3, radius: number) {
  const delta = to.clone().sub(from),
    center = from.clone().add(to).multiplyScalar(0.5);
  const geometry = a.cachedGeometry('tapered-branch', () => new T.CylinderGeometry(0.55, 1, 1, 7));
  const mesh = a.mesh(
    p,
    geometry,
    surface(a, 'wood', '#79654a'),
    center.x,
    center.y,
    center.z,
    radius,
    delta.length(),
    radius,
  );
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
}
export function plantTree(
  a: AssetLibrary,
  parent: T.Object3D,
  x: number,
  z: number,
  scale = 1,
  kind: TreeKind = 'oak',
  seed = 1,
) {
  const g = a.group(parent, x, 0.12, z, random(seed) * Math.PI * 2);
  g.scale.setScalar(scale);
  const shape = foliage(a);
  branch(a, g, new T.Vector3(), new T.Vector3(0.1, 3.2, -0.12), 0.18);
  if (kind === 'evergreen') {
    for (let tier = 0; tier < 7; tier++) {
      const y = 0.9 + tier * 0.48,
        width = 1.18 - tier * 0.12;
      for (let j = 0; j < 4; j++) {
        const angle = (j * Math.PI) / 2 + tier * 0.7;
        a.mesh(
          g,
          shape,
          GREENS[(j + tier) % 3],
          Math.cos(angle) * width * 0.42,
          y,
          Math.sin(angle) * width * 0.42,
          width * 0.68,
          0.43,
          width * 0.72,
        );
      }
    }
    a.mesh(g, shape, GREENS[1], 0.03, 4.15, 0, 0.24, 0.6, 0.24);
  } else {
    const count = kind === 'birch' ? 15 : 24;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996,
        ring = i < 7 ? 0.55 : i < 18 ? 1.13 : 0.72;
      const xx = Math.cos(angle) * ring * (kind === 'birch' ? 0.65 : 1),
        zz = Math.sin(angle) * ring * 0.83;
      const y = (kind === 'birch' ? 2.65 : 2.7) + (i % 3) * 0.55 + random(seed + i) * 0.35;
      const radius = 0.48 + random(seed + i * 3) * 0.19;
      if (i % 4 === 0) branch(a, g, new T.Vector3(0.05, 1.7, 0), new T.Vector3(xx, y, zz), 0.065);
      const color =
        kind === 'flowering' && i % 3 !== 0
          ? i % 2
            ? '#c9aaa5'
            : '#dfc9b8'
          : GREENS[(i + Math.floor(seed)) % 3];
      const clump = a.mesh(
        g,
        shape,
        color,
        xx,
        y,
        zz,
        radius,
        radius * (kind === 'birch' ? 1.25 : 0.85),
        radius,
      );
      clump.rotation.set(random(i + seed) * 0.5, angle, random(i * 2 + seed) * 0.3);
    }
  }
  return g;
}
export function shrub(
  a: AssetLibrary,
  parent: T.Object3D,
  x: number,
  z: number,
  scale = 0.6,
  flowering = false,
  seed = 1,
) {
  const g = a.group(parent, x, 0.13, z, random(seed) * Math.PI);
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4,
      radius = scale * (0.35 + random(seed + i) * 0.13);
    a.mesh(
      g,
      foliage(a, 9),
      GREENS[(i + 1) % 3],
      Math.cos(angle) * scale * 0.4,
      radius * 0.8,
      Math.sin(angle) * scale * 0.35,
      radius * 1.3,
      radius,
      radius * 1.2,
    );
  }
  if (flowering)
    for (let i = 0; i < 15; i++) {
      const angle = i * 2.4,
        r = scale * Math.sqrt(random(seed + i)) * 0.64;
      flower(
        a,
        g,
        Math.cos(angle) * r,
        scale * (0.5 + random(i + 2) * 0.3),
        Math.sin(angle) * r,
        i % 3 ? '#d2b4b1' : '#e9dfbb',
        0.085,
      );
    }
  return g;
}
export function flower(
  a: AssetLibrary,
  p: T.Object3D,
  x: number,
  y: number,
  z: number,
  color: string,
  size = 0.09,
) {
  const bloom = a.mesh(
    p,
    a.cachedGeometry('petal-disk', () => new T.CircleGeometry(1, 7)),
    color,
    x,
    y,
    z,
    size,
    size,
    size,
  );
  bloom.rotation.x = -Math.PI / 2;
  bloom.castShadow = false;
  a.sphere(p, '#d2b86d', x, y + 0.012, z, size * 0.23);
}
export function gardenBed(
  a: AssetLibrary,
  parent: T.Object3D,
  x: number,
  z: number,
  width: number,
  depth: number,
  seed = 1,
) {
  const g = a.group(parent, x, 0.14, z);
  a.box(g, '#6b5940', 0, 0, 0, width, 0.09, depth);
  for (const side of [-1, 1])
    a.box(g, '#b2a890', 0, 0.035, (side * depth) / 2, width + 0.1, 0.12, 0.09);
  for (const side of [-1, 1]) a.box(g, '#b2a890', (side * width) / 2, 0.035, 0, 0.09, 0.12, depth);
  const plants = Math.max(3, Math.floor(width / 0.55));
  for (let i = 0; i < plants; i++) {
    const px = -width / 2 + 0.3 + (i * (width - 0.6)) / Math.max(1, plants - 1),
      pz = (random(seed + i) - 0.5) * depth * 0.42;
    shrub(a, g, px, pz, 0.38 + random(seed + i * 2) * 0.15, true, seed + i);
  }
  return g;
}
export function startingLandscape(a: AssetLibrary, parent: T.Group) {
  // Keep the fixed project zones visibly open so each earned garden can occupy its own space.
  // These trees sit beyond the original lot edge and frame it without consuming future rewards.
  plantTree(a, parent, -14.1, -3.1, 0.78, 'birch', 11);
  plantTree(a, parent, -14.25, -9.2, 0.82, 'flowering', 8);
  plantTree(a, parent, 2.65, -13.2, 0.9, 'evergreen', 16);
}
