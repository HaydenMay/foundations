import * as T from 'three';
import { expect, it } from 'vitest';
import { CHAPTER_TWO_PROJECTS } from '../domain/progression';
import { AssetLibrary } from './assets';
import {
  buildChapterTwoProject,
  buildChapterTwoRoad,
  CHAPTER_TWO_LOTS,
} from './chapter-two-assets';
import { CHAPTER_TWO_HOUSE_BLUEPRINTS } from './chapter-two-blueprints';
import { buildWorld } from './world';

it('builds a continuous road and reserves four distinct, empty residential lots', () => {
  const assets = new AssetLibrary();
  const parent = new T.Group();
  const road = buildChapterTwoRoad(assets, parent);

  expect(road.root.name).toBe('project-asset:ch2-neighborhood');
  expect([...road.pieces.keys()]).toContain('continuous-road');
  expect(CHAPTER_TWO_LOTS).toHaveLength(4);
  for (const lot of CHAPTER_TWO_LOTS) {
    expect(road.pieces.has(`reserved-lot-${lot.index}`)).toBe(true);
  }
  expect(road.focus.x).toBeGreaterThan(18);
  expect(road.focus.zoom).toBeLessThan(1);
  expect(parent.getObjectByName('chapter-two-house:compact:cottage')).toBeUndefined();
  assets.dispose();
});

it('builds every neighborhood house lot in each of the three architectural styles', () => {
  const houseProjects = CHAPTER_TWO_PROJECTS.filter((project) => project.lot);
  expect(houseProjects).toHaveLength(4);
  for (const project of houseProjects) {
    for (const style of ['cottage', 'craftsman', 'brick']) {
      const assets = new AssetLibrary();
      const result = buildChapterTwoProject(assets, new T.Group(), project.id, style);
      expect(result.root.name).toBe(`project-asset:${project.id}`);
      expect(result.renderObjects?.has('house')).toBe(true);
      expect(result.pieces.has('house-foundation')).toBe(true);
      expect(result.pieces.has('house-main-roof')).toBe(true);
      expect(result.pieces.has('driveway-and-walk')).toBe(true);
      expect(result.pieces.has('front-garden')).toBe(true);
      expect([...result.pieces.keys()]).toEqual(result.recipe.pieces.map((piece) => piece.id));
      expect(result.focus.zoom).toBeGreaterThan(0);
      assets.dispose();
    }
  }
});

it('schedules production house pieces only after their blueprint prerequisites complete', () => {
  const assets = new AssetLibrary();
  const house = buildChapterTwoProject(assets, new T.Group(), 'ch2-neighbor-2', 'craftsman');
  const recipe = new Map(house.recipe.pieces.map((piece) => [piece.id, piece]));
  const blueprint = CHAPTER_TWO_HOUSE_BLUEPRINTS['l-shaped'];
  try {
    for (const step of blueprint.assembly) {
      const scheduled = recipe.get(`house-${step.id}`)!;
      for (const dependency of step.dependsOn ?? []) {
        const predecessor = recipe.get(`house-${dependency}`)!;
        expect(scheduled.delayMs).toBeGreaterThanOrEqual(
          (predecessor.delayMs ?? 0) + (predecessor.durationMs ?? 0),
        );
      }
    }
  } finally {
    assets.dispose();
  }
});

it('builds all three choices for each shared neighborhood feature', () => {
  const sharedProjects = CHAPTER_TWO_PROJECTS.filter((project) => !project.lot);
  expect(sharedProjects).toHaveLength(5);
  for (const project of sharedProjects) {
    for (const choice of project.choices) {
      const assets = new AssetLibrary();
      const result = buildChapterTwoProject(assets, new T.Group(), project.id, choice.id);
      expect(result.pieces.size).toBeGreaterThanOrEqual(1);
      expect(result.root.children.length).toBeGreaterThan(0);
      assets.dispose();
    }
  }
});

it('integrates Chapter 2 into the same world and removes a reserved lot as its house arrives', () => {
  const designs = {
    home: 'sage',
    'ch2-neighborhood': 'reveal',
    'ch2-neighbor-1': 'brick',
    'ch2-street-trees': 'autumn-maples',
    'ch2-neighbor-2': 'craftsman',
    'ch2-gardens': 'flowering-borders',
    'ch2-neighbor-3': 'cottage',
    'ch2-entrance': 'timber-sign',
    'ch2-neighbor-4': 'brick',
    'ch2-community-park': 'picnic-grove',
    'ch2-landmark': 'natural-stone',
  };
  const world = buildWorld(designs);
  try {
    expect(world.home).toBeDefined();
    expect(world.projectAssets.size).toBe(10);
    expect(world.projectAssets.has('ch2-neighborhood')).toBe(true);
    expect(world.projectAssets.get('ch2-neighborhood')?.pieces.has('reserved-lot-1')).toBe(false);
    expect(world.projectAssets.get('ch2-neighbor-1')?.renderObjects?.has('house')).toBe(true);
    expect(
      world.projectAssets.get('ch2-community-park')?.pieces.has('community-gathering-place'),
    ).toBe(true);
    expect(world.projectAssets.get('ch2-landmark')?.pieces.has('neighborhood-landmark')).toBe(true);
    for (const project of CHAPTER_TWO_PROJECTS.filter((entry) => entry.lot)) {
      const driveway = world.projectAssets.get(project.id)?.pieces.get('driveway-and-walk');
      expect(driveway?.userData['connectsToRoad']).toBe(true);
      expect(Number.isFinite(driveway?.userData['roadEdgeWorldZ'])).toBe(true);
    }
    const firstNeighborRoot = world.projectAssets.get('ch2-neighbor-1')!.root;
    expect(firstNeighborRoot.position.x).toBeCloseTo(CHAPTER_TWO_LOTS[0].x, 6);
    expect(firstNeighborRoot.position.z).toBeCloseTo(CHAPTER_TWO_LOTS[0].z, 6);
    const names: string[] = [];
    world.group.traverse((object) => names.push(object.name));
    expect(names.some((name) => /car|vehicle/i.test(name))).toBe(false);
  } finally {
    world.assets.dispose();
  }
});
