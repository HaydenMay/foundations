import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { PROJECTS } from '../domain/progression';
import { AssetLibrary } from './assets';
import { buildMilestoneProject, FEATURE_ZONES } from './milestone-assets';
import { buildWorld } from './world';

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

  it('gives the three garden-expansion choices distinct silhouettes and compositions', () => {
    const buildPlants = (choice: string) => {
      const assets = new AssetLibrary(),
        project = buildMilestoneProject(assets, new T.Group(), 'gardenExpansion', choice),
        planting = project.pieces.get('layered-planting')!;
      const bounds = new T.Box3().setFromObject(planting),
        height = bounds.max.y - bounds.min.y;
      assets.dispose();
      return height;
    };
    const flowerBeds = buildPlants('flowerBeds'),
      wildflowers = buildPlants('wildflowerBeds'),
      evergreens = buildPlants('evergreenShrubs');

    expect(wildflowers).toBeGreaterThan(flowerBeds + 0.2);
    expect(evergreens).toBeLessThan(wildflowers);
  });

  it('builds trimmed hedges as tall solid-green walls without flowering planting', () => {
    const assets = new AssetLibrary(),
      project = buildMilestoneProject(assets, new T.Group(), 'boundary', 'trimmedHedge'),
      wall = project.pieces.get('property-perimeter')!,
      planting = project.pieces.get('boundary-planting')!,
      bounds = new T.Box3().setFromObject(wall),
      colors: string[] = [];
    planting.traverse((object) => {
      if (object instanceof T.Mesh) {
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        for (const mat of mats)
          if (mat instanceof T.MeshStandardMaterial) colors.push(`#${mat.color.getHexString()}`);
      }
    });

    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(1.3);
    expect(colors).not.toContain('#d2b4b1');
    expect(colors).not.toContain('#e9dfbb');
    assets.dispose();
  });

  it('keeps porch seating clear of the front-door approach in every selected arrangement', () => {
    const doorApproach = { minX: -5.9, maxX: -4.8, minZ: -2.5, maxZ: -1.25 };
    for (const choice of ['rockingChairs', 'porchSwing', 'benchLanterns']) {
      const assets = new AssetLibrary(),
        project = buildMilestoneProject(assets, new T.Group(), 'porch', choice),
        seating = project.pieces.get('seating')!,
        porchGround = project.pieces.get('porch-rug-and-planters')!,
        seatGroups: T.Group[] = [];
      seating.traverse((object) => {
        if (object instanceof T.Group && object.name.startsWith('porch-seat-'))
          seatGroups.push(object);
      });
      expect(seatGroups.length, `${choice} exposes its separate seating zones`).toBeGreaterThan(0);
      expect(new T.Box3().setFromObject(porchGround).min.y, `${choice} porch props rest on the deck`)
        .toBeLessThan(0.2);
      for (const seat of seatGroups) {
        const bounds = new T.Box3().setFromObject(seat);
        const intersects =
          bounds.min.x < doorApproach.maxX &&
          bounds.max.x > doorApproach.minX &&
          bounds.min.z < doorApproach.maxZ &&
          bounds.max.z > doorApproach.minZ;
        expect(intersects, `${choice} keeps ${seat.name} clear of the door path`).toBe(false);
      }
      assets.dispose();
    }
  });

  it('anchors exterior sconces to style-aware front, rear and side wall locations', () => {
    for (const style of ['sage', 'cream', 'blue']) {
      const world = buildWorld({ home: style, outdoorLighting: 'wallSconces' }),
        project = world.projectAssets.get('outdoorLighting')!,
        hardware = project.pieces.get('lighting-hardware')!,
        mounts: T.Group[] = [];
      hardware.traverse((object) => {
        if (object instanceof T.Group && object.userData['wallSconce']) mounts.push(object);
      });
      expect(mounts).toHaveLength(6);
      expect(mounts.map((mount) => mount.userData['wallSconce'].side).sort()).toEqual([
        'front',
        'front',
        'left',
        'rear',
        'rear',
        'right',
      ]);
      expect(mounts.every((mount) => mount.userData['wallSconce'].style === style)).toBe(true);
      expect(world.assets.lamps).toHaveLength(2);
      world.assets.dispose();
    }
  });

  it('connects string-light runs to their support posts and retains a complete umbrella assembly', () => {
    const stringAssets = new AssetLibrary(),
      stringProject = buildMilestoneProject(
        stringAssets,
        new T.Group(),
        'outdoorLighting',
        'stringLights',
      ),
      anchors = stringProject.pieces.get('warm-light-accents')!.userData[
        'stringLightAnchors'
      ] as number[][][];
    expect(anchors).toHaveLength(2);
    expect(anchors).toEqual([
      [[-6.5, 2.82, -11], [-3.8, 2.82, -11]],
      [[-6.5, 2.82, -9.45], [-3.8, 2.82, -9.45]],
    ]);
    stringAssets.dispose();

    const patioAssets = new AssetLibrary(),
      patio = buildMilestoneProject(patioAssets, new T.Group(), 'retreat', 'stonePatio'),
      umbrella = patio.pieces.get('furnishings')!.getObjectByName('retreat-umbrella')!;
    expect(umbrella).toBeDefined();
    expect(umbrella.userData['polePassesThroughTable']).toBe(true);
    expect(umbrella.getObjectByName('umbrella-base')).toBeDefined();
    expect(umbrella.getObjectByName('umbrella-pole')).toBeDefined();
    expect(umbrella.getObjectByName('umbrella-canopy')).toBeDefined();
    patioAssets.dispose();
  });

  it('tracks the real outdoor torch flame materials for low-rate night animation', () => {
    const world = buildWorld({ home: 'sage', outdoorLighting: 'gardenTorches' }),
      flames = (world.assets as unknown as { torchFlames?: T.MeshStandardMaterial[] })
        .torchFlames;
    expect(flames?.length).toBeGreaterThan(0);
    expect(world.assets.lamps).toHaveLength(2);
    world.assets.dispose();
  });
});
