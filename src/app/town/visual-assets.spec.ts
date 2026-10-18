import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { AssetLibrary } from './assets';
import { buildStartingHouse } from './residential';
import { batchStatic } from './batching';
import { buildWorld } from './world';
import { homeViewHeight } from './camera';
import { lightAt } from './lighting';
import { buildBackyard } from './backyards';
import { surface } from './surfaces';
import { PROJECTS } from '../domain/progression';
import { FEATURE_ZONES } from './milestone-assets';

describe('residential asset contracts', () => {
  it('offers distinct architecture in the same usable lot with a shared entrance', () => {
    const signatures: string[] = [];
    for (const choice of ['sage', 'cream', 'blue']) {
      const a = new AssetLibrary(),
        scene = new T.Group();
      const home = buildStartingHouse(a, scene, choice).root;
      const box = new T.Box3().setFromObject(home),
        size = box.getSize(new T.Vector3());
      expect(size.x).toBeGreaterThan(8);
      expect(size.x).toBeLessThan(10.5);
      expect(size.y).toBeGreaterThan(5);
      expect(size.y).toBeLessThan(6.8);
      expect(box.min.x).toBeGreaterThan(-8.5);
      expect(box.max.x).toBeLessThan(0.6);
      const door = home.getObjectByName('front-door');
      expect(door).toBeDefined();
      expect(door!.getWorldPosition(new T.Vector3()).x).toBeCloseTo(-5.35);
      let vertices = 0;
      home.traverse((o) => {
        if (o instanceof T.Mesh) {
          const p = o.geometry.getAttribute('position');
          vertices += p.count;
          expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        }
      });
      signatures.push(`${size.y.toFixed(2)}/${vertices}`);
      a.dispose();
    }
    expect(new Set(signatures).size).toBe(3);
  });
  it('preserves nested geometry placement when batching repeated details', () => {
    const a = new AssetLibrary(),
      root = new T.Group();
    const parent = a.group(root, 4, 2, -3, Math.PI / 3);
    parent.scale.set(1.3, 0.7, 0.9);
    for (let i = 0; i < 12; i++) a.box(parent, '#eeeecc', i * 0.3, i * 0.1, -0.5, 0.2, 0.4, 0.3);
    const before = new T.Box3().setFromObject(root);
    batchStatic(root, (geometry) => a.geometry(geometry));
    const after = new T.Box3().setFromObject(root);
    expect(after.min.distanceTo(before.min)).toBeLessThan(0.0001);
    expect(after.max.distanceTo(before.max)).toBeLessThan(0.0001);
    let meshes = 0;
    root.traverse((o) => {
      if (o instanceof T.Mesh) meshes++;
    });
    expect(meshes).toBe(1);
    a.dispose();
  });
  it('fits all backyard choices in the same left/rear zone without crossing the fence', () => {
    for (const choice of ['pool', 'fort', 'trampoline']) {
      const a = new AssetLibrary(),
        root = new T.Group();
      const yard = buildBackyard(a, root, choice);
      expect(yard.position.toArray()).toEqual([-10, 0.13, -8.2]);
      const bounds = new T.Box3().setFromObject(yard);
      expect(bounds.min.x).toBeGreaterThan(-12.8);
      expect(bounds.max.x).toBeLessThan(-7.5);
      expect(bounds.min.z).toBeGreaterThan(-12.2);
      expect(bounds.max.z).toBeLessThan(-4.6);
      a.dispose();
    }
  });
  it('keeps shingle courses following each roof ridge when a gable is rotated', () => {
    const a = new AssetLibrary(),
      root = new T.Group();
    const roof = surface(a, 'shingles', '#414b50');
    for (const [x, rotation] of [
      [0, 0],
      [10, Math.PI / 2],
    ]) {
      const g = a.group(root, x, 0, 0, rotation);
      a.box(g, roof, 0, 0, 0, 4, 0.1, 2);
    }
    batchStatic(root, (geometry) => a.geometry(geometry));
    const mesh = root.children.find((o) => o instanceof T.Mesh) as T.Mesh;
    const uvs = mesh.geometry.getAttribute('uv');
    for (let i = 0; i < uvs.count / 2; i++) {
      expect(uvs.getX(i)).toBeCloseTo(uvs.getX(i + uvs.count / 2));
      expect(uvs.getY(i)).toBeCloseTo(uvs.getY(i + uvs.count / 2));
    }
    a.dispose();
  });
  it('recesses the pool water under a genuine open coping ring', () => {
    const a = new AssetLibrary(),
      root = new T.Group();
    const yard = buildBackyard(a, root, 'pool');
    const coping = yard.getObjectByName('pool-coping') as T.Mesh<T.ExtrudeGeometry>;
    const water = yard.getObjectByName('pool-water')!;
    const shape = coping.geometry.parameters.shapes as T.Shape;
    expect(shape.holes).toHaveLength(1);
    expect(new T.Box3().setFromObject(water).max.y).toBeLessThan(
      new T.Box3().setFromObject(coping).max.y,
    );
    a.dispose();
  });
  it('connects each fort support to the sloped canopy', () => {
    const a = new AssetLibrary(),
      root = new T.Group();
    const yard = buildBackyard(a, root, 'fort');
    root.updateMatrixWorld(true);
    const roofs = yard.children.filter((o) => o.name === 'fort-canopy');
    for (const support of yard.children.filter((o) => o.name === 'fort-support')) {
      const p = support.getWorldPosition(new T.Vector3());
      const hit = new T.Raycaster(
        new T.Vector3(p.x, 10, p.z),
        new T.Vector3(0, -1, 0),
      ).intersectObjects(roofs)[0];
      expect(hit).toBeDefined();
      const top = new T.Box3().setFromObject(support).max.y;
      expect(top).toBeGreaterThan(hit.point.y - 0.12);
      expect(top).toBeLessThan(hit.point.y + 0.1);
    }
    a.dispose();
  });
  it('keeps the detailed initial scene in a practical draw submission budget', () => {
    const world = buildWorld({ home: 'sage' });
    let meshes = 0,
      triangles = 0;
    world.group.traverse((o) => {
      if (o instanceof T.Mesh) {
        meshes++;
        triangles += (o.geometry.index?.count || o.geometry.getAttribute('position').count) / 3;
      }
    });
    expect(meshes).toBeLessThan(120);
    expect(triangles).toBeLessThan(220000);
    const materials = new Set<T.Material>(),
      geometries = new Set<T.BufferGeometry>();
    world.group.traverse((o) => {
      if (o instanceof T.Mesh) {
        geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
      }
    });
    const textures = new Set<T.Texture>();
    materials.forEach((m) => {
      if (m instanceof T.MeshStandardMaterial)
        for (const texture of [m.map, m.bumpMap]) if (texture) textures.add(texture);
    });
    let released = 0,
      releasedMaterials = 0,
      releasedTextures = 0;
    geometries.forEach((g) => g.addEventListener('dispose', () => released++));
    materials.forEach((m) => m.addEventListener('dispose', () => releasedMaterials++));
    textures.forEach((t) => t.addEventListener('dispose', () => releasedTextures++));
    world.assets.dispose();
    expect(released).toBe(geometries.size);
    expect(releasedMaterials).toBe(materials.size);
    expect(releasedTextures).toBe(textures.size);
  });
  it('keeps selected milestone roots separately addressable on each compatible house lot', () => {
    const projects = PROJECTS.filter((project) => project.id !== 'home');
    for (const house of ['sage', 'cream', 'blue']) {
      const designs = Object.fromEntries([
        ['home', house],
        ...projects.map((project) => [project.id, project.choices[0].id]),
      ]);
      const world = buildWorld(designs);
      expect(world.projectAssets?.size).toBe(projects.length);
      const home = world.group.getObjectByName('starting-home')!;
      expect(home.position.toArray()).toEqual([-5, 0.13, -4.6]);
      for (const project of projects) {
        const asset = world.projectAssets!.get(project.id)!;
        expect(asset.root.parent).toBe(world.group);
        expect(asset.root.name).toBe(`project-asset:${project.id}`);
        const bounds = new T.Box3().setFromObject(asset.root);
        const zone = FEATURE_ZONES[project.id];
        expect(bounds.min.x, `${house}/${project.id} west`).toBeGreaterThanOrEqual(
          zone.minX - 0.05,
        );
        expect(bounds.max.x, `${house}/${project.id} east`).toBeLessThanOrEqual(zone.maxX + 0.05);
        expect(bounds.min.z, `${house}/${project.id} rear`).toBeGreaterThanOrEqual(
          zone.minZ - 0.05,
        );
        expect(bounds.max.z, `${house}/${project.id} front`).toBeLessThanOrEqual(zone.maxZ + 0.05);
      }
      world.assets.dispose();
    }
  });
  it('retains selected legacy constructions outside the new Phase 4 reservations', () => {
    const world = buildWorld({
      home: 'cream',
      exterior: 'moss',
      garden: 'orchard',
      street: 'avenue',
      neighbor: 'rose',
      house2: 'sage',
      circle: 'oak',
    });
    const reserved = Object.values(FEATURE_ZONES).filter(
      (zone) => zone.id !== 'boundary' && zone.id !== 'outdoorLighting',
    );
    for (const id of ['exterior', 'garden', 'street', 'neighbor', 'house2', 'circle']) {
      const root = world.group.getObjectByName(`legacy-project:${id}`);
      expect(root, `${id} remains available`).toBeDefined();
      const bounds = new T.Box3().setFromObject(root!);
      for (const zone of reserved) {
        const overlaps =
          bounds.min.x < zone.maxX &&
          bounds.max.x > zone.minX &&
          bounds.min.z < zone.maxZ &&
          bounds.max.z > zone.minZ;
        expect(overlaps, `${id} avoids ${zone.id}`).toBe(false);
      }
    }
    world.assets.dispose();
  });
  it('keeps a fully built original home inside the mobile scene-geometry budget', () => {
    const projects = PROJECTS.filter((project) => project.id !== 'home');
    for (const house of ['sage', 'cream', 'blue']) {
      const world = buildWorld(
        Object.fromEntries([
          ['home', house],
          ...projects.map((project) => [project.id, project.choices[0].id]),
        ]),
      );
      let meshes = 0,
        triangles = 0;
      world.group.traverse((object) => {
        if (object instanceof T.Mesh) {
          meshes++;
          triangles +=
            (object.geometry.index?.count || object.geometry.getAttribute('position').count) / 3;
        }
      });
      expect(meshes, `${house} mesh budget`).toBeLessThan(240);
      expect(triangles, `${house} triangle budget`).toBeLessThan(350000);
      world.assets.dispose();
    }
  });
});
describe('reference lighting and framing', () => {
  it('has a lower golden-hour sun and continuous direction at mood boundaries', () => {
    expect(lightAt('day', 12).direction?.[1]).toBeGreaterThan(
      lightAt('sunset', 18).direction?.[1] || 0,
    );
    for (const hour of [5, 6, 8, 17, 18, 20]) {
      const a = lightAt('auto', hour - 0.001).direction,
        b = lightAt('auto', hour + 0.001).direction;
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(new T.Vector3(...a!).distanceTo(new T.Vector3(...b!))).toBeLessThan(0.1);
      const before = new T.Color(lightAt('auto', hour - 0.001).ground);
      const after = new T.Color(lightAt('auto', hour + 0.001).ground);
      expect(
        Math.abs(before.r - after.r) + Math.abs(before.g - after.g) + Math.abs(before.b - after.b),
      ).toBeLessThan(0.01);
    }
  });
  it('frames the residential lot consistently across phone panel sizes', () => {
    const expanded = homeViewHeight(390, 448),
      collapsed = homeViewHeight(390, 714);
    expect((expanded * 390) / 448).toBeCloseTo((collapsed * 390) / 714);
    expect((expanded * 390) / 448).toBeLessThan(23);
    expect(homeViewHeight(584, 331)).toBeLessThan(24);
  });
});
