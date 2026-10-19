import { afterEach, expect, it, vi } from 'vitest';
import * as T from 'three';
import { TownScene } from './scene';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function sceneWithAmbientAssets() {
  let requested = 0;
  vi.stubGlobal('requestAnimationFrame', () => ++requested);
  const water = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial());
  water.userData['ambientBaseY'] = 0.1;
  water.position.y = 0.1;
  const train = new T.Group();
  const foliageTime = { value: 0 };
  const scene: TownScene = Object.create(TownScene.prototype);
  Object.assign(scene, {
    world: {
      assets: { animatedWater: [water], foliageTimeUniforms: [foliageTime] },
      movingMonorail: { root: train, trainCount: 2 },
    },
    active: true,
    frameRequest: 0,
    ambientEpoch: 0,
    lastAmbientFrame: 0,
    lastTorchFrame: 0,
    torchActive: false,
    construction: undefined,
    render: vi.fn(),
  });
  return { scene, water, train, foliageTime, requested: () => requested };
}

it('moves the ambient train and pool water in the shared scene loop', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const test = sceneWithAmbientAssets();
  test.scene['updateFrame'](50);
  expect(test.train.position.y).toBe(14);
  expect(test.water.position.y).not.toBe(0.1);
  expect(test.foliageTime.value).toBe(0.05);
  expect(test.scene['render']).toHaveBeenCalledOnce();
  expect(test.requested()).toBe(1);
});

it('keeps ambient city motion still when the device requests reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const test = sceneWithAmbientAssets();
  test.scene['updateFrame'](50);
  expect(test.train.position.y).toBe(0);
  expect(test.water.position.y).toBe(0.1);
  expect(test.foliageTime.value).toBe(0);
  expect(test.scene['render']).not.toHaveBeenCalled();
  expect(test.requested()).toBe(0);
});
