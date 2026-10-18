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

  it('decomposes the larger Phase 4 projects into stable, mobile-sized construction steps', () => {
    for (const project of PROJECTS.filter((candidate) =>
      ['porch', 'retreat', 'gardenExpansion', 'boundary', 'outdoorLighting'].includes(candidate.id),
    )) {
      for (const option of project.choices) {
        const firstAssets = new AssetLibrary(),
          secondAssets = new AssetLibrary(),
          first = buildMilestoneProject(firstAssets, new T.Group(), project.id, option.id),
          second = buildMilestoneProject(secondAssets, new T.Group(), project.id, option.id),
          ids = [...first.pieces.keys()];
        const limits: Record<string, [number, number]> = {
          porch: [5, 12],
          retreat: [8, 25],
          gardenExpansion: [8, 16],
          boundary: [8, 25],
          outdoorLighting: [4, 12],
        };
        expect(ids, `${project.id}/${option.id} has stable deterministic piece IDs`).toEqual([
          ...second.pieces.keys(),
        ]);
        expect(
          ids.length,
          `${project.id}/${option.id} has useful assembly detail`,
        ).toBeGreaterThanOrEqual(limits[project.id][0]);
        expect(
          ids.length,
          `${project.id}/${option.id} avoids excessive assembly pieces`,
        ).toBeLessThanOrEqual(limits[project.id][1]);
        expect(first.recipe.pieces.map(({ id }) => id)).toEqual(ids);
        expect(first.recipe.pieces.map(({ order }) => order)).toEqual(ids.map((_, order) => order));
        firstAssets.dispose();
        secondAssets.dispose();
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
        bounds = new T.Box3();
      for (const [id, piece] of project.pieces)
        if (id.startsWith('garden-cluster-')) bounds.union(new T.Box3().setFromObject(piece));
      const height = bounds.max.y - bounds.min.y;
      assets.dispose();
      return height;
    };
    const flowerBeds = buildPlants('flowerBeds'),
      wildflowers = buildPlants('wildflowerBeds'),
      evergreens = buildPlants('evergreenShrubs');

    expect(wildflowers).toBeGreaterThan(flowerBeds + 0.2);
    expect(evergreens).toBeLessThan(wildflowers);
  });

  it('keeps boundary designs structural and removes incidental flowers from the stone wall', () => {
    for (const choice of ['picketFence', 'trimmedHedge', 'stoneWall']) {
      const assets = new AssetLibrary(),
        project = buildMilestoneProject(assets, new T.Group(), 'boundary', choice),
        ids = [...project.pieces.keys()];
      expect(ids.length, choice).toBeGreaterThanOrEqual(8);
      expect(ids.length, choice).toBeLessThanOrEqual(25);
      expect(ids).not.toContain('boundary-planting');
      expect(
        ids.every((id) => id.startsWith('boundary-')),
        choice,
      ).toBe(true);
      const bounds = new T.Box3().setFromObject(project.root);
      expect(bounds.max.y - bounds.min.y, `${choice} has a visible boundary`).toBeGreaterThan(0.45);
      assets.dispose();
    }
    for (const garden of ['flowerBeds', 'evergreenShrubs', 'wildflowerBeds']) {
      const world = buildWorld({ home: 'sage', boundary: 'stoneWall', gardenExpansion: garden });
      const wall = world.projectAssets.get('boundary')!;
      expect(
        [...wall.pieces.keys()].some((id) => id.includes('planting')),
        garden,
      ).toBe(false);
      world.assets.dispose();
    }
  });

  it('keeps porch seats out of the front-door path in all three arrangements', () => {
    const doorApproach = { minX: -5.9, maxX: -4.8, minZ: -2.5, maxZ: -1.25 };
    for (const choice of ['rockingChairs', 'porchSwing', 'benchLanterns']) {
      const assets = new AssetLibrary(),
        project = buildMilestoneProject(assets, new T.Group(), 'porch', choice),
        seatGroups = [...project.pieces.entries()].filter(([id]) => id.startsWith('porch-seat-'));
      expect(seatGroups.length, `${choice} exposes separate furniture items`).toBeGreaterThan(0);
      for (const [id, seat] of seatGroups) {
        const bounds = new T.Box3().setFromObject(seat);
        const intersects =
          bounds.min.x < doorApproach.maxX &&
          bounds.max.x > doorApproach.minX &&
          bounds.min.z < doorApproach.maxZ &&
          bounds.max.z > doorApproach.minZ;
        expect(intersects, `${choice} keeps ${id} clear of the door path`).toBe(false);
      }
      assets.dispose();
    }
  });

  it('preserves the legacy lighting choice ID while rendering ground-based pathway lanterns', () => {
    for (const style of ['sage', 'cream', 'blue']) {
      const world = buildWorld({ home: style, outdoorLighting: 'wallSconces' }),
        project = world.projectAssets.get('outdoorLighting')!,
        fixtures = [...project.pieces.entries()].filter(([id]) =>
          id.startsWith('pathway-lantern-'),
        );
      expect(fixtures).toHaveLength(6);
      expect(fixtures.every(([, fixture]) => new T.Box3().setFromObject(fixture).min.y >= 0)).toBe(
        true,
      );
      expect(project.root.getObjectByName('wall-sconce-mount-front-1.02')).toBeUndefined();
      let pointLights = 0;
      project.root.traverse((object) => {
        if (object instanceof T.PointLight) pointLights++;
      });
      expect(pointLights).toBe(0);
      expect([...project.pieces.keys()].some((id) => id === 'lighting-garden')).toBe(false);
      expect(world.assets.lamps).toHaveLength(2);
      const driveway = new T.Box3(new T.Vector3(-2.2, 0, -5.6), new T.Vector3(0.55, 2.4, 2.4)),
        entryPath = new T.Box3(new T.Vector3(-5.565, 0, -0.12), new T.Vector3(-5.135, 1, 1.96));
      for (const [, fixture] of fixtures) {
        const bounds = new T.Box3().setFromObject(fixture);
        expect(bounds.intersectsBox(new T.Box3().setFromObject(world.home!))).toBe(false);
        expect(bounds.intersectsBox(driveway)).toBe(false);
        expect(bounds.intersectsBox(entryPath)).toBe(false);
      }
      world.assets.dispose();
    }
  });

  it('routes one supported string-light run clear of all house, attraction, and retreat choices', () => {
    for (const style of ['sage', 'cream', 'blue'])
      for (const backyard of ['pool', 'trampoline', 'fort'])
        for (const retreat of ['pergolaSeating', 'stonePatio', 'gardenLounge']) {
          const world = buildWorld({
            home: style,
            backyard,
            retreat,
            outdoorLighting: 'stringLights',
          });
          const lighting = world.projectAssets.get('outdoorLighting')!;
          const anchors = lighting.pieces.get('string-light-cable')!.userData[
            'stringLightAnchors'
          ] as number[][][];
          expect(anchors).toHaveLength(1);
          expect(anchors[0][0][1]).toBe(anchors[0][1][1]);
          expect(lighting.pieces.has('string-light-post-west')).toBe(true);
          expect(lighting.pieces.has('string-light-post-east')).toBe(true);
          for (const projectId of ['home', 'backyard', 'retreat']) {
            const other =
              projectId === 'home' ? world.home! : world.projectAssets.get(projectId)!.root;
            expect(
              new T.Box3()
                .setFromObject(lighting.root)
                .intersectsBox(new T.Box3().setFromObject(other)),
              `${style}/${backyard}/${retreat} lights clear ${projectId}`,
            ).toBe(false);
          }
          world.assets.dispose();
        }

    const stringAssets = new AssetLibrary(),
      stringProject = buildMilestoneProject(
        stringAssets,
        new T.Group(),
        'outdoorLighting',
        'stringLights',
      ),
      anchors = stringProject.pieces.get('string-light-cable')!.userData[
        'stringLightAnchors'
      ] as number[][][];
    expect(anchors).toHaveLength(1);
    expect(stringProject.pieces.has('string-light-bulbs')).toBe(true);
    stringAssets.dispose();

    const patioAssets = new AssetLibrary(),
      patio = buildMilestoneProject(patioAssets, new T.Group(), 'retreat', 'stonePatio'),
      umbrellaBase = patio.pieces.get('retreat-umbrella-base')!,
      umbrellaPole = patio.pieces.get('retreat-umbrella-pole')!,
      umbrellaCanopy = patio.pieces.get('retreat-umbrella-canopy')!;
    expect(umbrellaBase.userData['polePassesThroughTable']).toBe(true);
    expect(umbrellaPole.userData['polePassesThroughTable']).toBe(true);
    expect(umbrellaCanopy).toBeDefined();
    patioAssets.dispose();
  });

  it('tracks the real outdoor torch flame materials for low-rate night animation', () => {
    const world = buildWorld({ home: 'sage', outdoorLighting: 'gardenTorches' }),
      flames = (world.assets as unknown as { torchFlames?: T.MeshStandardMaterial[] }).torchFlames;
    expect(flames?.length).toBeGreaterThan(0);
    expect(world.assets.lamps).toHaveLength(2);
    world.assets.dispose();
  });
});
