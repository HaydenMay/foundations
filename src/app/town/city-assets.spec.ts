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
