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

it('refreshes cached shadows only as assembly pieces appear and when the home settles', () => {
  let frame: FrameRequestCallback | undefined,
    requests = 0,
    refreshes = 0,
    renders = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return ++requests;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    frame = undefined;
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const home = new Group(),
    walls = new Group(),
    roof = new Group();
  walls.position.y = 0.13;
  roof.position.y = 0.13;
  home.add(walls, roof);
  const shadowMap = { needsUpdate: false };
  const set = vi.fn();
  const done = vi.fn();
  const render = () => {
    renders++;
    if (shadowMap.needsUpdate) refreshes++;
    shadowMap.needsUpdate = false;
  };
  // Exercise the real sequence without requiring a WebGL driver in unit tests.
  const scene: TownScene = Object.create(TownScene.prototype);
  Object.assign(scene, {
    world: {
      home,
      homeAssemblies: new Map([
        ['walls', walls],
        ['roof', roof],
      ]),
      homeRecipe: {
        pieces: [
          { id: 'walls', order: 1 },
          { id: 'roof', order: 2 },
        ],
        config: { durationMs: 1000, dropHeight: 2, staggerMs: 200, concurrency: 1 },
      },
    },
    renderer: { shadowMap },
    camera: {
      state: () => ({ x: 4, z: 2, zoom: 0.8, angle: 0 }),
      controls: { enabled: true },
      set,
      home: vi.fn(),
    },
    active: true,
    render,
  });
  scene.celebrate(done);
  for (let t = 0; t <= 1200; t += 50) {
    const current = frame;
    frame = undefined;
    current?.(t);
  }
  expect(refreshes).toBeLessThanOrEqual(3);
  expect(done).toHaveBeenCalledOnce();
  expect(walls.position.y).toBe(0.13);
  expect(roof.position.y).toBe(0.13);
  expect(frame).toBeUndefined();
  const finishedRenders = renders;
  expect(renders).toBeGreaterThan(3);
  expect(finishedRenders).toBe(renders);
});
