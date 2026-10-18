import { expect, it } from 'vitest';
import * as T from 'three';
import { AssetLibrary } from './assets';
import { buildMilestoneProject } from './milestone-assets';
import { buildStartingHouse } from './residential';
import { STARTING_HOME_ASSEMBLY_RECIPES } from './residential-assembly';
import { buildWorld } from './world';

const ASSEMBLY_IDS = [
  'foundation',
  'walls',
  'openings',
  'porch-deck',
  'porch-supports',
  'porch-rails',
  'porch-stairs',
  'porch-roof',
  'entry',
  'roofline',
  'garage',
  'details',
];
const EXPECTED_CHOREOGRAPHY: Record<string, string[]> = {
  sage: ASSEMBLY_IDS,
  cream: ASSEMBLY_IDS,
  blue: ASSEMBLY_IDS,
};
const BASELINE_BOUNDS: Record<string, { min: number[]; max: number[] }> = {
  sage: {
    min: [-8.25, 0.13, -7.915],
    max: [0.451954, 5.86, -0.05],
  },
  cream: {
    min: [-8.225, 0.13, -7.915],
    max: [0.451954, 6.71, -0.05],
  },
  blue: {
    min: [-8.25, 0.13, -7.915],
    max: [0.451954, 5.86, -0.05],
  },
};

it('gives all three house styles explicit visual assembly choreography', () => {
  for (const style of ['sage', 'cream', 'blue']) {
    const recipe = STARTING_HOME_ASSEMBLY_RECIPES[style];
    expect(recipe).toBeDefined();
    expect(recipe.pieces.map((piece) => piece.id)).toEqual(EXPECTED_CHOREOGRAPHY[style]);
    expect(recipe.pieces.map((piece) => piece.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  }
});

it('keeps existing finished house bounds and batches each piece inside its stable boundary', () => {
  for (const style of ['sage', 'cream', 'blue']) {
    const world = buildWorld({ home: style });
    expect(world.home).toBeDefined();
    expect(world.homeAssemblies).toBeDefined();
    expect(world.homeRecipe).toBe(STARTING_HOME_ASSEMBLY_RECIPES[style]);
    const home = world.home!;
    const bounds = new T.Box3().setFromObject(home);
    const want = BASELINE_BOUNDS[style];
    expect(bounds.min.x).toBeCloseTo(want.min[0], 3);
    expect(bounds.min.y).toBeCloseTo(want.min[1], 3);
    expect(bounds.min.z).toBeCloseTo(want.min[2], 3);
    expect(bounds.max.x).toBeCloseTo(want.max[0], 3);
    expect(bounds.max.y).toBeCloseTo(want.max[1], 3);
    expect(bounds.max.z).toBeCloseTo(want.max[2], 3);
    expect([...world.homeAssemblies!.keys()]).toEqual(ASSEMBLY_IDS);
    for (const [id, piece] of world.homeAssemblies!) {
      expect(piece.parent).toBe(home);
      expect(piece.userData['assemblyId']).toBe(id);
      expect(piece.userData['staticBatchBoundary']).toBe(true);
      expect(piece.position.toArray()).toEqual([0, 0, 0]);
      expect(piece.quaternion.toArray()).toEqual([0, 0, 0, 1]);
      expect(piece.scale.toArray()).toEqual([1, 1, 1]);
      const batches: T.Mesh[] = [];
      piece.traverse((object) => {
        if (object instanceof T.Mesh) batches.push(object);
      });
      expect(batches.length).toBeGreaterThan(0);
      expect(batches.every((mesh) => mesh.parent === piece)).toBe(true);
      expect(batches.every((mesh) => mesh.name === 'static-material-batch')).toBe(true);
    }
    expect(
      home.children.every((piece) => world.homeAssemblies!.has(piece.userData['assemblyId'])),
    ).toBe(true);
    world.assets.dispose();
  }
});

it('keeps batched house draw calls and triangles within a mobile-friendly budget', () => {
  for (const style of ['sage', 'cream', 'blue']) {
    const world = buildWorld({ home: style });
    let meshes = 0;
    let triangles = 0;
    world.group.traverse((object) => {
      if (object instanceof T.Mesh) {
        meshes++;
        triangles +=
          (object.geometry.index?.count || object.geometry.getAttribute('position').count) / 3;
      }
    });
    expect(meshes).toBeLessThan(145);
    expect(triangles).toBeLessThan(220000);
    world.assets.dispose();
  }
});

it('rests every selected porch seat on the real deck and clears the house entry structure', () => {
  const choices = ['rockingChairs', 'porchSwing', 'benchLanterns'];
  for (const style of ['sage', 'cream', 'blue']) {
    for (const choice of choices) {
      const assets = new AssetLibrary(),
        parent = new T.Group(),
        house = buildStartingHouse(assets, parent, style),
        deck = house.assemblies.get('porch-deck')!.getObjectByName('porch-deck-surface')!;
      parent.updateMatrixWorld(true);
      const deckTop = new T.Box3().setFromObject(deck).max.y,
        project = buildMilestoneProject(assets, parent, 'porch', choice, style),
        seats = [...project.pieces.entries()].filter(([id]) => id.startsWith('porch-seat-'));
      parent.updateMatrixWorld(true);

      expect(seats, `${style}/${choice} exposes separate furniture pieces`).toHaveLength(
        choice === 'rockingChairs' ? 2 : 1,
      );
      for (const [id, seat] of seats) {
        const bounds = new T.Box3().setFromObject(seat);
        expect(bounds.min.y, `${style}/${choice} stays above the deck`).toBeGreaterThanOrEqual(
          deckTop - 0.01,
        );
        for (const obstacleId of ['porch-supports', 'porch-rails', 'porch-stairs', 'entry']) {
          const obstacle = house.assemblies.get(obstacleId)!;
          const intersectingMeshes: string[] = [];
          obstacle.traverse((object) => {
            if (object instanceof T.Mesh)
              if (bounds.intersectsBox(new T.Box3().setFromObject(object))) {
                const meshBounds = new T.Box3().setFromObject(object);
                intersectingMeshes.push(
                  `${object.name || object.type} ${meshBounds.min.toArray()}..${meshBounds.max.toArray()}`,
                );
              }
          });
          expect(
            intersectingMeshes,
            `${style}/${choice}/${id} ${bounds.min.toArray()}..${bounds.max.toArray()} avoids ${obstacleId}`,
          ).toEqual([]);
        }
      }

      if (choice === 'porchSwing') {
        const swing = seats[0][1],
          hanger = project.pieces.get('porch-swing-suspension')!,
          seatBounds = new T.Box3().setFromObject(swing),
          hangerBounds = new T.Box3().setFromObject(hanger),
          roof = house.assemblies.get('porch-roof')!,
          roofBounds = new T.Box3().setFromObject(roof);
        expect(hanger).toBeDefined();
        expect(seatBounds.min.y).toBeGreaterThan(deckTop + 0.2);
        expect(hangerBounds.max.y).toBeLessThanOrEqual(roofBounds.max.y + 0.01);
        expect(hangerBounds.min.y).toBeLessThan(seatBounds.max.y + 0.15);
      }

      const porchFinish = [...project.pieces.entries()].filter(([id]) =>
        ['porch-entry-mat', 'porch-planter-left', 'porch-planter-right'].includes(id),
      );
      expect(porchFinish).toHaveLength(3);
      for (const [id, piece] of porchFinish)
        expect(
          new T.Box3().setFromObject(piece).min.y,
          `${style}/${choice}/${id} rests on deck`,
        ).toBeCloseTo(deckTop, 2);

      assets.dispose();
    }
  }
});
