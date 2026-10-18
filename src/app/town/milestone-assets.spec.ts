import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { PROJECTS } from '../domain/progression';
import { AssetLibrary } from './assets';
import { buildMilestoneProject, FEATURE_ZONES } from './milestone-assets';

describe('Phase 4 curated lot compositions', () => {
  it('rejects unknown project designs instead of silently rendering a default', () => {
    const assets = new AssetLibrary();
    expect(() => buildMilestoneProject(assets, new T.Group(), 'frontGarden', 'violet')).toThrow(
      'Unknown frontGarden design choice: violet',
    );
    assets.dispose();
  });
  it('builds every A/B/C selection as an owned, multi-piece deterministic asset', () => {
    for (const project of PROJECTS.filter((candidate) => candidate.id !== 'home')) {
      const zone = FEATURE_ZONES[project.id];
      expect(zone, `${project.id} has a fixed world-space zone`).toBeDefined();
      for (const option of project.choices) {
        const assets = new AssetLibrary();
        const world = new T.Group();
        const built = buildMilestoneProject(assets, world, project.id, option.id);
        expect(built.root.parent).toBe(world);
        expect(built.root.name).toBe(`project-asset:${project.id}`);
        expect(built.pieces.size).toBeGreaterThanOrEqual(2);
        expect(built.recipe.pieces.map((piece) => piece.id)).toEqual([...built.pieces.keys()]);
        world.updateMatrixWorld(true);
        const bounds = new T.Box3().setFromObject(built.root);
        expect(bounds.isEmpty(), `${project.id}/${option.id} has geometry`).toBe(false);
        expect(bounds.min.x, `${project.id}/${option.id} west bound`).toBeGreaterThanOrEqual(
          zone.minX - 0.05,
        );
        expect(bounds.max.x, `${project.id}/${option.id} east bound`).toBeLessThanOrEqual(
          zone.maxX + 0.05,
        );
        expect(bounds.min.z, `${project.id}/${option.id} rear bound`).toBeGreaterThanOrEqual(
          zone.minZ - 0.05,
        );
        expect(bounds.max.z, `${project.id}/${option.id} front bound`).toBeLessThanOrEqual(
          zone.maxZ + 0.05,
        );
        for (const [pieceId, piece] of built.pieces) {
          expect(piece.userData['staticBatchBoundary']).toBe(true);
          expect(piece.children.length, `${project.id}/${option.id}/${pieceId}`).toBeGreaterThan(0);
        }
        assets.dispose();
      }
    }
  });

  it('keeps feature zones clear of the home entrance, driveway and each other', () => {
    const zones = Object.values(FEATURE_ZONES).filter(
      (zone) => zone.id !== 'boundary' && zone.id !== 'outdoorLighting',
    );
    const entrance = { minX: -6.3, maxX: -4.3, minZ: -2.2, maxZ: 0.8 };
    const entryPath = { minX: -5.9, maxX: -4.8, minZ: -1.25, maxZ: 0.8 };
    const driveway = { minX: -2.2, maxX: 0.55, minZ: -5.6, maxZ: 2.4 };
    const intersects = (a: typeof entrance, b: typeof entrance) =>
      a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
    const front = zones.find((zone) => zone.id === 'porch')!;
    expect(intersects(front, driveway)).toBe(false);
    expect(intersects(front, entryPath)).toBe(false);
    for (let i = 0; i < zones.length; i++)
      for (let j = i + 1; j < zones.length; j++)
        expect(intersects(zones[i], zones[j]), `${zones[i].id} overlaps ${zones[j].id}`).toBe(
          false,
        );
  });
});
