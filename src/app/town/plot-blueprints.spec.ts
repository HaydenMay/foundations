import { describe, expect, it } from 'vitest';
import { buildWorld } from './world';
import { createChapterOnePropertyPlot } from './plot-blueprints';
import { resolvePlotPoint, validatePlot } from './plot-framework';

describe('Chapter 1 plot adapter', () => {
  it('wraps the measured existing house and milestone regions without changing the render tree', () => {
    const world = buildWorld({ home: 'sage', backyard: 'pool', frontGarden: 'roses' });
    const definition = createChapterOnePropertyPlot(
      {
        home: world.home,
        homeAssemblies: world.homeAssemblies,
        homeRecipe: world.homeRecipe,
        projectAssets: world.projectAssets,
        legacyAssets: world.legacyAssets,
      },
      'sage',
    );
    const nodes = new Map(definition.nodes.map((node) => [node.id, node]));

    expect(validatePlot(definition)).toEqual([]);
    expect(nodes.get('chapter1-home')?.parentId).toBe('chapter1-property');
    expect(nodes.get('chapter1-home')?.renderObject).toBe(world.home);
    expect(nodes.get('chapter1-home')?.assembly?.recipeRef).toBe('starting-home:sage');
    expect(nodes.get('chapter1-zone-backyard')?.renderObject).toBe(
      world.projectAssets.get('backyard')?.root,
    );
    const homeOrigin = resolvePlotPoint(definition, 'chapter1-home', [0, 0, 0]);
    expect(homeOrigin.x).toBeCloseTo(-5);
    expect(homeOrigin.y).toBeCloseTo(0.13);
    expect(homeOrigin.z).toBeCloseTo(-4.6);
    expect(world.home?.parent).toBe(world.group);
    expect(world.group.children).toContain(world.home);
    world.assets.dispose();
  });

  it('retains a property hierarchy even for a new player with no constructed house', () => {
    const world = buildWorld({});
    const definition = createChapterOnePropertyPlot(
      {
        home: world.home,
        homeAssemblies: world.homeAssemblies,
        homeRecipe: world.homeRecipe,
        projectAssets: world.projectAssets,
        legacyAssets: world.legacyAssets,
      },
      'sage',
    );

    expect(definition.nodes.map((node) => node.id)).toContain('chapter1-property');
    expect(definition.nodes.map((node) => node.id)).toContain('chapter1-zone-backyard');
    expect(definition.nodes.map((node) => node.id)).not.toContain('chapter1-home');
    expect(validatePlot(definition)).toEqual([]);
    world.assets.dispose();
  });
});
