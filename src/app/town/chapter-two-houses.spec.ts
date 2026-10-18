import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { AssetLibrary } from './assets';
import { buildChapterTwoHouse } from './chapter-two-houses';

const lots = ['compact', 'l-shaped', 'two-story', 'wide-gable'] as const;
const styles = ['cottage', 'craftsman', 'brick'] as const;

describe('Chapter 2 neighbor houses', () => {
  it('builds twelve complete assemblies with distinct lot massing', () => {
    const lotSignatures = new Map<string, string[]>();
    for (const lot of lots) {
      const signatures: string[] = [];
      for (const style of styles) {
        const assets = new AssetLibrary();
        const parent = new T.Group();
        const house = buildChapterTwoHouse(assets, parent, lot, style);
        parent.updateMatrixWorld(true);
        const bounds = new T.Box3().setFromObject(house.root);
        const size = bounds.getSize(new T.Vector3());
        expect(size.x).toBeGreaterThan(4.5);
        expect(size.x).toBeLessThan(9.5);
        expect(size.z).toBeGreaterThan(3.5);
        expect(size.z).toBeLessThan(9.5);
        expect(house.root.getObjectByName('front-door')).toBeDefined();
        for (const id of ['foundation', 'walls', 'roofline', 'openings', 'porch'])
          expect(house.pieces.has(id), `${lot}/${style} missing ${id}`).toBe(true);
        if (lot === 'l-shaped') expect(house.pieces.has('garage')).toBe(true);
        signatures.push(`${size.x.toFixed(2)}:${size.y.toFixed(2)}:${size.z.toFixed(2)}`);
        assets.dispose();
      }
      lotSignatures.set(lot, signatures);
    }
    for (const styleIndex of [0, 1, 2]) {
      const silhouettes = lots.map((lot) => lotSignatures.get(lot)![styleIndex]);
      expect(new Set(silhouettes).size).toBe(4);
    }
  });

  it('uses distinct cottage, craftsman, and brick architectural details', () => {
    const details: string[] = [];
    for (const style of styles) {
      const assets = new AssetLibrary();
      const house = buildChapterTwoHouse(assets, new T.Group(), 'compact', style);
      details.push(house.root.userData['architecturalDetail']);
      assets.dispose();
    }
    expect(details).toEqual(['cottage-dormer', 'craftsman-beam', 'brick-lintel']);
  });
});
