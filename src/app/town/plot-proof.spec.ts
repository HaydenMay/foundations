import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { AssetLibrary } from './assets';
import { CHAPTER_TWO_LOTS } from './chapter-two-assets';
import {
  buildChapterTwoFrameworkProof,
  createChapterTwoProofPlot,
  frameworkHomeStyleForNeighbor,
} from './plot-proof';
import { resolvePlotPoint, validatePlot } from './plot-framework';
import { STARTING_HOME_ASSEMBLY_RECIPES } from './residential-assembly';
import { buildWorld } from './world';

describe('single Chapter 2 framework neighbor proof', () => {
  it('maps all player-selectable neighbor styles independently of the starting house', () => {
    expect(['cottage', 'craftsman', 'brick'].map(frameworkHomeStyleForNeighbor)).toEqual([
      'sage',
      'cream',
      'blue',
    ]);
  });

  it('uses the Chapter 1 house recipe and validates a connected lot at two transforms', () => {
    for (const [position, rotation] of [
      [[0, 0, 0] as const, 0],
      [[17, 0, -12] as const, Math.PI / 2],
    ] as const) {
      const definition = createChapterTwoProofPlot('blue', position, rotation);
      expect(validatePlot(definition)).toEqual([]);
      expect(
        definition.nodes.map((node) => node.id).filter((id) => id.startsWith('chapter2-proof-')),
      ).toEqual(
        expect.arrayContaining([
          'chapter2-proof-district',
          'chapter2-proof-lot',
          'chapter2-proof-house',
          'chapter2-proof-driveway',
          'chapter2-proof-walkway',
          'chapter2-proof-landscape',
        ]),
      );
      expect(
        definition.nodes.find((node) => node.id === 'chapter2-proof-house')?.assembly?.recipeRef,
      ).toBe('starting-home:blue');
      const house = resolvePlotPoint(definition, 'chapter2-proof-house', [0, 0, 0]);
      expect(house.x).toBeCloseTo(position[0] + (rotation ? -4.1 : 16.3));
      expect(house.z).toBeCloseTo(position[2] + (rotation ? -16.3 : -4.1));
    }
  });

  it('builds the proof neighbor with the shared Chapter 1 asset and stable assembly IDs', () => {
    const assets = new AssetLibrary();
    const parent = new T.Group();
    const proof = buildChapterTwoFrameworkProof(assets, parent, 'cream');

    expect(proof.asset.root.parent).toBe(parent);
    expect(proof.asset.pieces.size).toBe(12);
    expect([...proof.asset.pieces.keys()]).toEqual(
      STARTING_HOME_ASSEMBLY_RECIPES['cream'].pieces.map((piece) => piece.id),
    );
    expect(
      proof.definition.nodes.find((node) => node.id === 'chapter2-proof-house')?.renderObject,
    ).toBe(proof.asset.root.getObjectByName('starting-home'));
    expect(validatePlot(proof.definition)).toEqual([]);
    let meshes = 0;
    proof.asset.root.traverse((object) => {
      if (object instanceof T.Mesh) meshes++;
    });
    expect(meshes).toBeLessThan(180);
    assets.dispose();
  });

  it('adds only the first-lot proof when the disposable world option is enabled', () => {
    const designs = {
      home: 'blue',
      'ch2-neighborhood': 'reveal',
      'ch2-neighbor-1': 'cottage',
    };
    const ordinary = buildWorld(designs);
    const preview = buildWorld(designs, { frameworkProof: true });

    expect(ordinary.projectAssets.has('framework-proof-neighbor')).toBe(false);
    expect(ordinary.projectAssets.has('ch2-neighbor-1')).toBe(true);
    expect(preview.projectAssets.has('ch2-neighbor-1')).toBe(false);
    expect(preview.projectAssets.has('framework-proof-neighbor')).toBe(true);
    expect(preview.plotDefinitions).toHaveLength(2);
    expect(preview.plotDefinitions.flatMap((plot) => plot.nodes.map((node) => node.id))).toContain(
      'chapter2-proof-house',
    );
    ordinary.assets.dispose();
    preview.assets.dispose();
  });

  it('uses the selected neighbor style and gives the proof home a generous separate lot', () => {
    const preview = buildWorld(
      {
        home: 'sage',
        'ch2-neighborhood': 'reveal',
        'ch2-neighbor-1': 'craftsman',
      },
      { frameworkProof: true },
    );
    const starterLot = preview.plotDefinitions
      .find((plot) => plot.nodes.some((node) => node.id === 'chapter1-property'))!
      .nodes.find((node) => node.id === 'chapter1-property')!;
    const proofLot = preview.plotDefinitions
      .flatMap((plot) => plot.nodes)
      .find((node) => node.id === 'chapter2-proof-lot')!;
    const proofHouse = preview.plotDefinitions
      .flatMap((plot) => plot.nodes)
      .find((node) => node.id === 'chapter2-proof-house')!;
    const starterEastEdge = starterLot.localTransform.position[0] + starterLot.dimensions.width / 2;
    const proofWestEdge = proofLot.localTransform.position[0] - proofLot.dimensions.width / 2;

    expect(proofHouse.assembly?.recipeRef).toBe('starting-home:cream');
    expect(proofLot.dimensions.width).toBeGreaterThan(CHAPTER_TWO_LOTS[0].width);
    expect(proofWestEdge - starterEastEdge).toBeGreaterThanOrEqual(8);
    preview.assets.dispose();
  });
});
