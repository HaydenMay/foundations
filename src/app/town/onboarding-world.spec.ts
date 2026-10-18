import { expect, it } from 'vitest';
import { Box3, Mesh, Vector3 } from 'three';
import { buildWorld } from './world';

it('leaves the original residential lot empty until a home is selected', () => {
  const world = buildWorld({});
  expect(world.group.getObjectByName('starting-home')).toBeUndefined();
  expect(world.group.getObjectByName('backyard-project')).toBeUndefined();
  expect(world.assets.windows).toHaveLength(0);
  expect(world.assets.lamps).toHaveLength(0);
  let meshes = 0;
  world.group.traverse((o) => {
    if (o instanceof Mesh) meshes++;
  });
  expect(meshes).toBeGreaterThan(0);
  world.assets.dispose();
});
it('keeps the existing house geometry in a separately animated subtree on the same lot', () => {
  for (const choice of ['sage', 'cream', 'blue']) {
    const world = buildWorld({ home: choice }),
      home = world.group.getObjectByName('starting-home')!;
    const box = new Box3().setFromObject(home);
    expect(box.isEmpty()).toBe(false);
    expect(box.getSize(new Vector3()).x).toBeGreaterThan(8);
    expect(home.position.x).toBe(-5);
    expect(home.position.z).toBe(-4.6);
    world.assets.dispose();
  }
});

it('adds a same-world empty next-lot teaser without replacing a legacy neighbor', () => {
  const teaser = buildWorld({ chapter: 'reveal' });
  expect(teaser.group.getObjectByName('chapter-empty-lot')).toBeDefined();
  expect(teaser.projectAssets.has('chapter')).toBe(true);
  teaser.assets.dispose();

  const existingNeighbor = buildWorld({ chapter: 'reveal', neighbor: 'rose' });
  expect(existingNeighbor.group.getObjectByName('legacy-project:neighbor')).toBeDefined();
  expect(existingNeighbor.group.getObjectByName('chapter-empty-lot')).toBeUndefined();
  expect(existingNeighbor.projectAssets.has('chapter')).toBe(false);
  existingNeighbor.assets.dispose();
});
