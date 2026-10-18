import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { AssetLibrary } from './assets';
import { CHAPTER_TWO_HOUSE_BLUEPRINTS } from './chapter-two-blueprints';
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
        const blueprint = CHAPTER_TWO_HOUSE_BLUEPRINTS[lot];
        expect(size.x).toBeGreaterThan(4.5);
        expect(size.x).toBeLessThanOrEqual(blueprint.envelope.width + 0.03);
        expect(size.z).toBeGreaterThan(3.5);
        expect(size.z).toBeLessThanOrEqual(blueprint.envelope.depth + 0.03);
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

  it('keeps each curated architecture inside its standardized production footprint', () => {
    const signatures: string[] = [];
    for (const lot of lots) {
      const blueprint = CHAPTER_TWO_HOUSE_BLUEPRINTS[lot];
      const lotSignatures: string[] = [];
      for (const style of styles) {
        const assets = new AssetLibrary();
        const house = buildChapterTwoHouse(assets, new T.Group(), lot, style);
        const bounds = new T.Box3().setFromObject(house.root);
        const size = bounds.getSize(new T.Vector3());
        const center = bounds.getCenter(new T.Vector3());

        expect(house.root.userData['blueprintId']).toBe(blueprint.id);
        expect(size.x).toBeLessThanOrEqual(blueprint.envelope.width + 0.03);
        expect(size.z).toBeLessThanOrEqual(blueprint.envelope.depth + 0.03);
        expect(size.y).toBeLessThanOrEqual(blueprint.envelope.height + 0.03);
        expect(center.x).toBeCloseTo(0, 2);
        expect(center.z).toBeCloseTo(0, 2);
        expect(house.pieces.size).toBe(blueprint.assembly.length);
        expect(house.pieces.has('foundation')).toBe(true);
        expect(house.pieces.has('walls')).toBe(true);
        expect(house.pieces.has('main-roof')).toBe(true);
        lotSignatures.push(`${size.x.toFixed(2)}:${size.y.toFixed(2)}:${size.z.toFixed(2)}`);
        assets.dispose();
      }
      signatures.push(lotSignatures[0]);
      expect(new Set(lotSignatures).size).toBe(1);
    }
    expect(new Set(signatures).size).toBe(4);
  });

  it('defines a staged construction order with explicit prerequisites for each house shape', () => {
    for (const lot of lots) {
      const blueprint = CHAPTER_TWO_HOUSE_BLUEPRINTS[lot];
      const ids = new Set(blueprint.assembly.map((piece) => piece.id));
      expect(blueprint.assembly[0].id).toBe('foundation');
      expect(blueprint.assembly.some((piece) => piece.id === 'main-roof')).toBe(true);
      expect(blueprint.assembly.some((piece) => piece.id === 'walls')).toBe(true);
      for (const piece of blueprint.assembly)
        for (const prerequisite of piece.dependsOn ?? []) expect(ids.has(prerequisite)).toBe(true);
      if (lot === 'l-shaped') expect(ids.has('garage')).toBe(true);
      if (lot === 'two-story') expect(ids.has('upper-walls')).toBe(true);
    }
  });
});
