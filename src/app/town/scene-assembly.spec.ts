import { afterEach, expect, it, vi } from 'vitest';
import { Group } from 'three';
import { TownScene } from './scene';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function sceneFixture(recipePieces: readonly string[] = ['walls', 'roof']) {
  let nextRequest = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const request = ++nextRequest;
    frames.set(request, callback);
    return request;
  });
  vi.stubGlobal('cancelAnimationFrame', (request: number) => frames.delete(request));
  vi.spyOn(performance, 'now').mockReturnValue(0);
  const frame = (now: number) => {
    const pending = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!pending) throw new Error('No animation frame is pending.');
    frames.delete(pending[0]);
    pending[1](now);
  };

  const root = new Group();
  const assemblies = new Map<string, Group>();
  for (const id of recipePieces) {
    const piece = new Group();
    piece.position.set(0, 2, 0);
    root.add(piece);
    assemblies.set(id, piece);
  }
  const home = new Group();
  home.add(root);
  const shadowMap = { needsUpdate: false };
  const done = vi.fn();
  const cameraSet = vi.fn();
  const cameraHome = vi.fn();
  const scene: TownScene = Object.create(TownScene.prototype);
  Object.assign(scene, {
    world: {
      home,
      homeAssemblies: assemblies,
      homeRecipe: {
        pieces: recipePieces.map((id, order) => ({ id, order })),
        config: { durationMs: 1000, dropHeight: 10, staggerMs: 0, concurrency: 1 },
      },
    },
    renderer: { shadowMap },
    camera: {
      state: () => ({ x: 4, z: 2, zoom: 0.8, angle: 0 }),
      controls: { enabled: true },
      set: cameraSet,
      home: cameraHome,
    },
    active: true,
    render: vi.fn(),
  });
  return { scene, root, home, assemblies, frames, frame, done, cameraSet, cameraHome, shadowMap };
}

it('plays stable house assemblies from elapsed scene time and restores completed transforms', () => {
  const f = sceneFixture();
  f.scene.celebrate(f.done, { durationMs: 1000, dropHeight: 10, staggerMs: 0, concurrency: 1 });
  f.frame(0);
  expect(f.assemblies.get('walls')?.position.y).toBeGreaterThan(2);
  f.frame(500);
  expect(f.assemblies.get('walls')?.position.y).toBeGreaterThan(2);
  expect(f.assemblies.get('walls')?.position.y).toBeLessThan(4);
  expect(f.cameraSet).toHaveBeenCalled();
  f.frame(1000);
  expect(f.done).toHaveBeenCalledOnce();
  expect(f.assemblies.get('walls')?.position.y).toBe(2);
  expect(f.assemblies.get('roof')?.position.y).toBe(2);
  expect(f.cameraHome).toHaveBeenCalledOnce();
});

it('skip completes once while cancellation restores the house without success', () => {
  const skipped = sceneFixture();
  skipped.scene.celebrate(skipped.done);
  skipped.frame(0);
  skipped.scene.finishConstruction();
  expect(skipped.done).toHaveBeenCalledOnce();
  expect(skipped.assemblies.get('walls')?.position.y).toBe(2);

  const cancelled = sceneFixture();
  cancelled.scene.celebrate(cancelled.done);
  cancelled.frame(0);
  cancelled.scene.cancelConstruction();
  expect(cancelled.done).not.toHaveBeenCalled();
  expect(cancelled.assemblies.get('walls')?.position.y).toBe(2);
  expect(cancelled.frames.size).toBe(0);
  expect(cancelled.scene.camera.controls.enabled).toBe(true);
});

it('honors reduced-motion overrides without scheduling animation frames', () => {
  const f = sceneFixture();
  f.scene.celebrate(f.done, { reducedMotion: true });
  expect(f.frames.size).toBe(0);
  expect(f.done).toHaveBeenCalledOnce();
  expect(f.assemblies.get('walls')?.position.y).toBe(2);
});

it('finishes safely when a required assembly binding is unavailable', () => {
  const f = sceneFixture(['walls']);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const world = (f.scene as unknown as { world: { homeRecipe: { pieces: { id: string }[] } } })
    .world;
  world.homeRecipe.pieces.push({ id: 'missing' });
  expect(() => f.scene.celebrate(f.done)).not.toThrow();
  expect(f.done).toHaveBeenCalledOnce();
  expect(f.frames.size).toBe(0);
  expect(f.assemblies.get('walls')?.position.y).toBe(2);
});
