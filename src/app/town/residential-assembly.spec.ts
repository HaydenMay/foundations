import { expect, it } from 'vitest';
import * as T from 'three';
import { STARTING_HOME_ASSEMBLY_RECIPES } from './residential-assembly';
import { buildWorld } from './world';

const ASSEMBLY_IDS = ['foundation', 'walls', 'openings', 'entry', 'roofline', 'garage', 'details'];
const EXPECTED_CHOREOGRAPHY: Record<string, string[]> = {
  sage: ['foundation', 'walls', 'openings', 'entry', 'roofline', 'garage', 'details'],
  cream: ['foundation', 'walls', 'entry', 'openings', 'roofline', 'details', 'garage'],
  blue: ['foundation', 'walls', 'openings', 'entry', 'roofline', 'details', 'garage'],
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
    expect(recipe.pieces.map((piece) => piece.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
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
    expect(home.children.every((piece) => world.homeAssemblies!.has(piece.userData['assemblyId']))).toBe(
      true,
    );
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

it('keeps front-rail sections clear of porch seat footprints for every house style', () => {
  for (const style of ['sage', 'cream', 'blue']) {
    const world = buildWorld({ home: style, porch: 'rockingChairs' });
    world.group.updateMatrixWorld(true);
    const frontRails: T.Group[] = [];
    world.homeAssemblies!.get('entry')!.traverse((object) => {
      if (object instanceof T.Group && object.userData['porchFrontRail']) frontRails.push(object);
    });
    const porchSeats: T.Group[] = [];
    world.projectAssets.get('porch')!.pieces.get('seating')!.traverse((object) => {
      if (object instanceof T.Group && object.name.startsWith('porch-seat-')) porchSeats.push(object);
    });

    expect(frontRails.length, `${style} has split front-rail segments`).toBeGreaterThan(0);
    expect(porchSeats).toHaveLength(2);
    for (const seat of porchSeats) {
      const bounds = new T.Box3().setFromObject(seat);
      for (const rail of frontRails) {
        const center = rail.getWorldPosition(new T.Vector3());
        const width = rail.userData['porchFrontRail'].width as number;
        expect(
          bounds.min.x < center.x + width / 2 && bounds.max.x > center.x - width / 2,
          `${style} ${seat.name} is screened by ${rail.name}`,
        ).toBe(false);
      }
    }
    world.assets.dispose();
  }
});
