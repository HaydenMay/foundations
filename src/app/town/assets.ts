import * as T from 'three';
import { plantTree, shrub } from './landscaping';

export interface HouseStyle {
  wall: string;
  roof: string;
  trim: string;
}
export const HOUSE_STYLES: Record<string, HouseStyle> = {
  sage: { wall: '#a1ac96', roof: '#64706a', trim: '#f1ede0' },
  cream: { wall: '#dfcfaf', roof: '#9c7160', trim: '#f6edda' },
  blue: { wall: '#9cafb4', roof: '#596973', trim: '#f1eee2' },
  rose: { wall: '#c2a092', roof: '#656d6c', trim: '#efe9d9' },
};

/** Replace these factories with loaded GLTF assets without changing progression or UI. Units are metres. */
export class AssetLibrary {
  readonly windows: T.MeshStandardMaterial[] = [];
  readonly lamps: T.PointLight[] = [];
  readonly torchFlames: T.MeshStandardMaterial[] = [];
  /** Shared shader uniforms and selected water surfaces updated by TownScene's one render loop. */
  readonly foliageTimeUniforms: { value: number }[] = [];
  readonly animatedWater: T.Mesh[] = [];
  private readonly materials = new Map<string, T.MeshStandardMaterial>();
  private readonly geometries = new Set<T.BufferGeometry>();
  private readonly geometryCache = new Map<string, T.BufferGeometry>();
  private readonly textures = new Set<T.Texture>();
  private readonly cube = this.geometry(new T.BoxGeometry(1, 1, 1));
  private readonly ball = this.geometry(new T.IcosahedronGeometry(1, 1));
  private readonly round = this.geometry(new T.CylinderGeometry(1, 1, 1, 12));
  namedMaterial(name: string, create: () => T.MeshStandardMaterial): T.MeshStandardMaterial {
    if (!this.materials.has(name)) this.materials.set(name, create());
    return this.materials.get(name)!;
  }
  texture(texture: T.Texture) {
    this.textures.add(texture);
    return texture;
  }
  cachedGeometry(name: string, create: () => T.BufferGeometry): T.BufferGeometry {
    if (!this.geometryCache.has(name)) this.geometryCache.set(name, this.geometry(create()));
    return this.geometryCache.get(name)!;
  }
  glass(): T.MeshStandardMaterial {
    return this.namedMaterial('warm-window-glass', () => {
      const m = new T.MeshStandardMaterial({
        color: '#657f7e',
        roughness: 0.32,
        metalness: 0.1,
        emissive: '#ffbd64',
        emissiveIntensity: 0,
      });
      this.windows.push(m);
      return m;
    });
  }
  material(color: string, extra?: T.MeshStandardMaterialParameters) {
    if (extra) {
      const m = new T.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
      this.materials.set(`${color}-${this.materials.size}`, m);
      return m;
    }
    if (!this.materials.has(color))
      this.materials.set(
        color,
        new T.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 }),
      );
    return this.materials.get(color)!;
  }
  foliageMaterial(color: string) {
    return this.namedMaterial(`ambient-foliage:${color}`, () => {
      const time = { value: 0 };
      this.foliageTimeUniforms.push(time);
      const material = new T.MeshStandardMaterial({ color, roughness: 0.94 });
      material.onBeforeCompile = (shader) => {
        shader.uniforms['foundationsFoliageTime'] = time;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          '#include <common>\nuniform float foundationsFoliageTime;',
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float foundationsCrownHeight = max(position.y - 1.35, 0.0);
          float foundationsBreezePhase = foundationsFoliageTime * 0.62 + dot(position.xz, vec2(0.071, 0.113));
          transformed.x += sin(foundationsBreezePhase) * foundationsCrownHeight * 0.015;
          transformed.z += cos(foundationsBreezePhase * 0.73) * foundationsCrownHeight * 0.009;`,
        );
      };
      material.customProgramCacheKey = () => 'foundations-soft-foliage-sway-v1';
      return material;
    });
  }
  geometry<G extends T.BufferGeometry>(geometry: G): G {
    this.geometries.add(geometry);
    return geometry;
  }
  mesh(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    color: string | T.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
  ) {
    const mesh = new T.Mesh(geometry, typeof color === 'string' ? this.material(color) : color);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  box(
    p: T.Object3D,
    color: string | T.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    return this.mesh(p, this.cube, color, x, y, z, w, h, d);
  }
  sphere(p: T.Object3D, color: string, x: number, y: number, z: number, w: number, h = w, d = w) {
    return this.mesh(p, this.ball, color, x, y, z, w, h, d);
  }
  cylinder(
    p: T.Object3D,
    color: string | T.Material,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
  ) {
    return this.mesh(p, this.round, color, x, y, z, r, h, r);
  }
  group(parent: T.Object3D, x = 0, y = 0, z = 0, rotation = 0) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotation;
    parent.add(group);
    return group;
  }
  roof(
    parent: T.Object3D,
    width: number,
    depth: number,
    height: number,
    y: number,
    color: string | T.Material,
  ) {
    const shape = new T.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(0, height);
    shape.lineTo(width / 2, 0);
    shape.closePath();
    const geometry = this.geometry(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }));
    const roof = this.mesh(parent, geometry, color, 0, y, -depth / 2);
    // Thin fascia follows the pitched roof edges at the front and back.
    const slope = Math.atan2(height, width / 2),
      length = Math.hypot(height, width / 2);
    for (const z of [-depth / 2 - 0.015, depth / 2 + 0.015])
      for (const side of [-1, 1]) {
        const trim = this.box(
          parent,
          '#ece8d9',
          (side * width) / 4,
          y + height / 2,
          z,
          length,
          0.1,
          0.1,
        );
        trim.rotation.z = -side * slope;
      }
    return roof;
  }
  window(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    width = 0.8,
    height = 1,
    rotation = 0,
  ) {
    const g = this.group(parent, x, y, z, rotation);
    this.box(g, '#f0ebdd', 0, 0, 0, width + 0.2, height + 0.2, 0.13);
    const glass = this.glass();
    this.box(g, glass, 0, 0, 0.08, width, height, 0.03);
    this.box(g, '#eee8d9', 0, 0, 0.11, 0.045, height, 0.04);
    this.box(g, '#eee8d9', 0, 0, 0.11, width, 0.045, 0.04);
    this.box(g, '#dcd8c9', 0, -height / 2 - 0.1, 0.12, width + 0.3, 0.12, 0.26);
    return g;
  }
  house(parent: T.Object3D, x: number, z: number, style: HouseStyle, rotation = 0, scale = 1) {
    const g = this.group(parent, x, 0.13, z, rotation);
    g.scale.setScalar(scale);
    this.box(g, '#b8b6a7', 0, 0.18, 0, 6.2, 0.36, 4.7);
    this.box(g, style.wall, 0, 1.8, 0, 5.8, 3, 4.3);
    // Horizontal weatherboard lines give the siding human-scale detail.
    for (let y = 0.6; y < 3.35; y += 0.25) {
      this.box(g, '#8e9c88', 0, y, 2.158, 5.8, 0.017, 0.025);
      this.box(g, '#8e9c88', 2.908, y, 0, 0.025, 0.017, 4.3);
    }
    for (const xx of [-2.88, 2.88])
      for (const zz of [-2.15, 2.15]) this.box(g, style.trim, xx, 1.8, zz, 0.13, 3.05, 0.13);
    this.roof(g, 6.5, 4.95, 1.75, 3.35, style.roof);
    // Roof seams are subtle raised strips rather than a flat placeholder wedge.
    for (const side of [-1, 1])
      for (let zz = -2.25; zz <= 2.3; zz += 0.5) {
        const seam = this.box(g, style.roof, side * 1.625, 4.25, zz, 3.72, 0.025, 0.045);
        seam.rotation.z = -side * Math.atan2(1.75, 3.25);
      }
    this.box(g, '#bd9f87', -1.8, 4.6, -1, 0.6, 1.8, 0.6);
    this.box(g, '#b9af9b', -1.8, 5.48, -1, 0.76, 0.16, 0.76);
    // Front dormer, recessed porch, turned posts, steps and door.
    const dormer = this.group(g, 1.05, 3.35, 1.6);
    this.box(dormer, style.wall, 0, 0.58, 0, 1.5, 1.15, 1.3);
    this.roof(dormer, 1.85, 1.65, 0.65, 1.15, style.roof);
    this.window(dormer, 0, 0.6, 0.68, 0.68, 0.72);
    this.box(g, '#d5d0ba', -0.35, 0.36, 2.65, 3.1, 0.3, 1.2);
    this.box(g, '#e4dece', -0.35, 0.22, 3.35, 2.8, 0.14, 0.35);
    this.box(g, '#e4dece', -0.35, 0.1, 3.63, 2.5, 0.1, 0.35);
    this.box(g, '#e7e1ce', -0.35, 2.82, 2.8, 3.35, 0.15, 1.7);
    const porchRoof = this.box(g, style.roof, -0.35, 3.03, 2.8, 3.5, 0.18, 1.9);
    porchRoof.rotation.x = 0.08;
    for (const xx of [-1.7, 1]) this.box(g, style.trim, xx, 1.7, 3.28, 0.14, 2.7, 0.14);
    this.box(g, style.trim, -0.35, 1.55, 2.2, 1.12, 2.3, 0.16);
    this.box(g, '#526c5a', -0.35, 1.5, 2.31, 0.92, 2.12, 0.11);
    this.box(g, '#9db3ae', -0.35, 1.94, 2.38, 0.58, 0.83, 0.02);
    this.sphere(g, '#c2a36b', -0.02, 1.35, 2.4, 0.04);
    this.window(g, -2.05, 1.75, 2.19, 0.75, 1.15);
    this.window(g, 1.95, 1.75, 2.19, 0.85, 1.15);
    for (const zz of [-1.1, 1.1]) this.window(g, 2.94, 1.8, zz, 0.85, 1.1, Math.PI / 2);
    for (const zz of [-1.1, 1.1]) this.window(g, -2.94, 1.8, zz, 0.85, 1.1, -Math.PI / 2);
    this.window(g, 0, 1.8, -2.2, 1.4, 1.1, Math.PI);
    for (const xx of [-2, 2]) this.flowerBox(g, xx, 0.5, 2.5, '#c3b1a2');
    this.lantern(g, 0.47, 2.3, 2.55, false);
    return g;
  }
  tree(parent: T.Object3D, x: number, z: number, scale = 1, _shade = '#849264') {
    return plantTree(
      this,
      parent,
      x,
      z,
      scale,
      Math.abs(Math.round(x + z)) % 3 === 0 ? 'birch' : 'oak',
      Math.abs(x * 3 + z) + 1,
    );
  }
  shrub(parent: T.Object3D, x: number, z: number, scale = 0.6, _color = '#73855f') {
    return shrub(this, parent, x, z, scale, false, Math.abs(x * 2 + z) + 1);
  }
  flowerBox(parent: T.Object3D, x: number, y: number, z: number, color = '#ab8770') {
    this.box(parent, color, x, y, z, 1.1, 0.4, 0.5);
    for (let i = 0; i < 5; i++) {
      this.sphere(parent, '#7c8d58', x - 0.4 + i * 0.2, y + 0.27, z, 0.19, 0.16, 0.23);
      this.sphere(parent, i % 2 ? '#d8c2bb' : '#e7d9aa', x - 0.4 + i * 0.2, y + 0.4, z, 0.09);
    }
  }
  fence(parent: T.Object3D, x: number, z: number, length: number, rotation = 0) {
    const g = this.group(parent, x, 0, z, rotation);
    for (let xx = -length / 2; xx <= length / 2; xx += 0.55)
      this.box(g, '#e8e4d0', xx, 0.6, 0, 0.12, 1.1, 0.12);
    for (const y of [0.35, 0.85]) this.box(g, '#dcdac6', 0, y, 0, length, 0.1, 0.08);
  }
  bench(parent: T.Object3D, x: number, z: number, rotation = 0) {
    const g = this.group(parent, x, 0, z, rotation);
    for (const xx of [-0.65, 0.65]) this.box(g, '#5e6c5a', xx, 0.3, 0, 0.08, 0.6, 0.55);
    for (const zz of [-0.22, 0, 0.22]) this.box(g, '#b09a78', 0, 0.58, zz, 1.7, 0.09, 0.17);
    for (const y of [0.9, 1.14]) this.box(g, '#b09a78', 0, y, -0.3, 1.7, 0.18, 0.07);
  }
  lantern(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    tall = true,
    includePointLight = true,
  ) {
    if (tall) {
      this.cylinder(parent, '#5d685a', x, y / 2, z, 0.065, y);
      this.cylinder(parent, '#7b8270', x, 0.1, z, 0.18, 0.2);
    }
    const material = this.glass();
    this.box(parent, material, x, y + 0.15, z, 0.3, 0.45, 0.3);
    this.box(parent, '#57644f', x, y + 0.42, z, 0.42, 0.1, 0.42);
    if (includePointLight) {
      const light = new T.PointLight('#ffd39a', 0, 6, 2);
      light.position.set(x, y + 0.1, z);
      parent.add(light);
      this.lamps.push(light);
    }
  }
  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.textures.clear();
    this.windows.length = 0;
    this.lamps.length = 0;
    this.torchFlames.length = 0;
    this.foliageTimeUniforms.length = 0;
    this.animatedWater.length = 0;
    this.materials.clear();
    this.geometries.clear();
    this.geometryCache.clear();
  }
}
