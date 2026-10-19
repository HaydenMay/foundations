import * as T from 'three';
import { describe, expect, it } from 'vitest';
import { buildWorld } from './world';

describe('Town Center storefront architecture', () => {
  it('puts frontage gardens and lamps on the street-facing side of Main Street', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'city-main-street': 'bakery-row',
    });
    const frontage = world.projectAssets.get('city-main-street')!.pieces.get('frontage-gardens')!;
    frontage.updateMatrixWorld(true);
    const bounds = { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
    frontage.traverse((node) => {
      if (!(node instanceof T.Mesh)) return;
      node.geometry.computeBoundingBox();
      const box = node.geometry.boundingBox;
      if (!box) return;
      bounds.min = Math.min(bounds.min, box.min.z);
      bounds.max = Math.max(bounds.max, box.max.z);
    });
    expect(bounds.min).toBeGreaterThan(3.5);
    expect(bounds.max).toBeLessThan(8.5);
    world.assets.dispose();
  });

  it('gives each shop a distinct roof profile and finished side elevations', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'city-main-street': 'bakery-row',
    });
    const shops = ['bakery', 'bookshop', 'market'].map((name) => {
      const storefront = world.projectAssets
        .get('city-main-street')!
        .root.getObjectByName(`storefront-${name}`);
      expect(storefront, `storefront-${name} should be named in the assembled asset`).toBeDefined();
      expect(storefront!.getObjectByName('roof-shell')).toBeDefined();
      expect(storefront!.getObjectByName('side-window-left')).toBeDefined();
      expect(storefront!.getObjectByName('side-window-right')).toBeDefined();
      return storefront!;
    });

    expect(shops.map((shop) => shop.userData['roofProfile'])).toEqual([
      'front-gable',
      'dormer-gable',
      'parapet',
    ]);
    expect(shops.map((shop) => shop.userData['facadeFinish'])).toEqual([
      'painted-siding',
      'timber-siding',
      'brick',
    ]);
    world.assets.dispose();
  });
});

describe('Town Center library architecture', () => {
  it('sets the gable siding and attic window in front of the roof caps', () => {
    const world = buildWorld({
      home: 'sage',
      'ch2-neighborhood': 'reveal',
      'city-library': 'garden-library',
    });
    const library = world.projectAssets.get('city-library')!.root;
    const walls = library.getObjectByName('library-walls')!;
    const wallBounds = new T.Box3().setFromObject(walls);
    expect(wallBounds.max.y).toBeGreaterThan(7);
    const gableSiding = [...walls.children]
      .filter(
        (object): object is T.Mesh =>
          object instanceof T.Mesh &&
          !Array.isArray(object.material) &&
          object.material.map !== null,
      )
      .find((mesh) => {
        mesh.geometry.computeBoundingBox();
        return mesh.geometry.boundingBox!.max.y > 7;
      });
    expect(gableSiding?.geometry.boundingBox?.max.z).toBeGreaterThan(5.3);
    const glassBatch = [...walls.children].find(
      (object) =>
        object instanceof T.Mesh &&
        !Array.isArray(object.material) &&
        object.material.emissiveIntensity !== undefined &&
        object.material.map === null,
    ) as T.Mesh;
    glassBatch.geometry.computeBoundingBox();
    expect(glassBatch.geometry.boundingBox!.max.z).toBeGreaterThan(5.45);
    const roof = library.getObjectByName('library-roof')!;
    const texturedRoof = [...roof.children].find(
      (object) =>
        object instanceof T.Mesh &&
        !Array.isArray(object.material) &&
        object.material.map !== null,
    );
    expect(texturedRoof).toBeDefined();
    world.assets.dispose();
  });
});
