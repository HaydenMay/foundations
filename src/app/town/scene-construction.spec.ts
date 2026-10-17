import { afterEach, expect, it, vi } from 'vitest';
import { Group } from 'three';
import { TownScene } from './scene';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('does not repaint identical lighting preferences while other preferences synchronize', () => {
  const updateLight = vi.fn();
  const scene: TownScene = Object.create(TownScene.prototype);
  Object.assign(scene, { lighting: 'auto', updateLight });
  scene.setLighting('auto');
  expect(updateLight).not.toHaveBeenCalled();
  scene.setLighting('night');
  expect(updateLight).toHaveBeenCalledOnce();
  scene.setLighting('night');
  expect(updateLight).toHaveBeenCalledOnce();
  scene.setLighting('auto');
  expect(updateLight).toHaveBeenCalledTimes(2);
});

it('limits construction shadow refreshes and stops submitting unchanged settled frames', () => {
  let frame: FrameRequestCallback = () => {},
    requests = 0,
    refreshes = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return ++requests;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const home = new Group();
  home.position.y = 0.13;
  const shadowMap = { needsUpdate: false };
  const set = vi.fn(() => {
    if (shadowMap.needsUpdate) refreshes++;
    shadowMap.needsUpdate = false;
  });
  const settled = vi.fn();
  // Exercise the real sequence without requiring a WebGL driver in unit tests.
  const scene: TownScene = Object.create(TownScene.prototype);
  Object.assign(scene, {
    world: { home },
    renderer: { shadowMap },
    camera: {
      state: () => ({ x: 4, z: 2, zoom: 0.8, angle: 0 }),
      controls: { enabled: true },
      set,
      home: settled,
    },
  });
  const done = vi.fn();
  scene.celebrate(done);
  for (let t = 0; t <= 1800; t += 50) frame(t);
  expect(refreshes).toBeLessThanOrEqual(3);
  const rendered = set.mock.calls.length;
  for (let t = 1850; t <= 2700; t += 50) frame(t);
  expect(set.mock.calls.length).toBe(rendered);
  scene.finishConstruction();
  expect(home.visible).toBe(true);
  expect(home.scale.x).toBe(1);
  expect(home.position.y).toBe(0.13);
  expect(done).toHaveBeenCalledOnce();
  expect(settled).toHaveBeenCalledOnce();
});
