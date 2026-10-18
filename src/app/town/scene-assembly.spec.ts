import { afterEach, expect, it, vi } from 'vitest';
import { Group } from 'three';
import * as T from 'three';
import { TownScene } from './scene';
import { AssemblyAnimator } from './assembly';
import { buildWorld } from './world';
import { PROJECTS } from '../domain/progression';

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
  const projectRoot = new Group(),
    projectPieces = new Map<string, Group>();
  for (const id of ['beds', 'focal']) {
    const piece = new Group();
    piece.position.set(0, 2, 0);
    projectRoot.add(piece);
    projectPieces.set(id, piece);
  }
  const projectAsset = {
    root: projectRoot,
    pieces: projectPieces,
    recipe: {
      pieces: ['beds', 'focal'].map((id, order) => ({ id, order })),
      config: { durationMs: 1000, dropHeight: 10, staggerMs: 0, concurrency: 1 },
    },
    focus: { x: -7, z: -5, zoom: 1.35 },
  };
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
      projectAssets: new Map([['frontGarden', projectAsset]]),
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
  return {
    scene,
    root,
    home,
    assemblies,
    projectRoot,
    projectPieces,
    frames,
    frame,
    done,
    cameraSet,
    cameraHome,
    shadowMap,
  };
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

it('reveals a selected milestone composition, focuses its lot zone and returns home', () => {
  const f = sceneFixture();
  f.scene.celebrateProject('frontGarden', f.done, {
    durationMs: 1000,
    dropHeight: 10,
    staggerMs: 0,
    concurrency: 1,
  });
  const firstPiece = f.projectPieces.get('beds')!;
  expect(firstPiece.position.y).toBeGreaterThan(2);
  expect(f.cameraSet).not.toHaveBeenCalled();
  f.frame(0);
  expect(firstPiece.position.y).toBeGreaterThan(2);
  f.frame(300);
  expect(firstPiece.position.y).toBeGreaterThan(2);
  expect(f.cameraSet).toHaveBeenCalledWith(
    expect.objectContaining({
      x: expect.any(Number),
      z: expect.any(Number),
      zoom: expect.any(Number),
    }),
  );
  const focus = f.cameraSet.mock.calls.at(-1)?.[0];
  expect(focus.x).toBeLessThan(4);
  expect(focus.z).toBeLessThan(2);
  expect(focus).not.toEqual({ x: -7, z: -5, zoom: 1.35, angle: 0 });
  f.frame(1000);
  expect(f.done).toHaveBeenCalledOnce();
  expect(f.projectPieces.get('beds')?.position.y).toBe(2);
  expect(f.cameraHome).toHaveBeenCalledOnce();
});

it('focuses in-world previews temporarily and restores the original camera without saving it', () => {
  const f = sceneFixture(),
    original = { x: 4, z: 2, zoom: 0.8, angle: 0 },
    suppression: boolean[] = [];
  f.cameraSet.mockImplementation(() => {
    suppression.push(
      (f.scene as unknown as { suppressCameraPersistence: boolean }).suppressCameraPersistence,
    );
  });

  f.scene.focusProjectPreview('frontGarden');
  expect((f.scene as unknown as { previewCamera: unknown }).previewCamera).toEqual(original);
  expect(f.cameraSet).toHaveBeenCalledWith({ x: -7, z: -5, zoom: 1.35, angle: 0 });
  f.scene.restoreProjectPreviewCamera();
  expect((f.scene as unknown as { previewCamera: unknown }).previewCamera).toBeUndefined();
  expect(f.cameraSet).toHaveBeenLastCalledWith(original);
  expect(suppression).toEqual([true, true]);
  expect(f.scene.render).toHaveBeenCalledTimes(2);
});

it('replays every production Phase 4 recipe ten times without drift or duplicate geometry', () => {
  const designs = Object.fromEntries([
      ['home', 'sage'],
      ...PROJECTS.filter((project) => project.id !== 'home').map((project) => [
        project.id,
        project.choices[0].id,
      ]),
      ['chapter', 'reveal'],
    ]),
    world = buildWorld(designs);
  const assets = [
    {
      id: 'home',
      root: world.home!,
      pieces: world.homeAssemblies!,
      recipe: world.homeRecipe!,
    },
    ...[...world.projectAssets].map(([id, asset]) => ({ id, ...asset })),
  ];
  const meshCount = (root: T.Object3D) => {
    let count = 0;
    root.traverse((object) => {
      if (object instanceof T.Mesh) count++;
    });
    return count;
  };

  try {
    expect(assets.map((asset) => asset.id).sort()).toEqual(
      [...PROJECTS.map((project) => project.id), 'chapter'].sort(),
    );
    for (const asset of assets) {
      expect([...asset.pieces.keys()], asset.id).toEqual(
        asset.recipe.pieces.map((piece) => piece.id),
      );
      const count = meshCount(asset.root),
        baseline = asset.recipe.pieces.map(({ id }) => {
          const piece = asset.pieces.get(id)!;
          return {
            id,
            position: piece.position.toArray(),
            rotation: piece.quaternion.toArray(),
            scale: piece.scale.toArray(),
            visible: piece.visible,
          };
        }),
        animator = new AssemblyAnimator(asset.root, asset.pieces, asset.recipe, { speed: 2 });
      for (let replay = 0; replay < 10; replay++) {
        expect(replay === 0 ? animator.play() : animator.replay(), asset.id).toBe(true);
        animator.update(0.4);
        animator.update(1);
        expect(
          asset.recipe.pieces.map(({ id }) => {
            const piece = asset.pieces.get(id)!;
            return {
              id,
              position: piece.position.toArray(),
              rotation: piece.quaternion.toArray(),
              scale: piece.scale.toArray(),
              visible: piece.visible,
            };
          }),
          `${asset.id} replay ${replay + 1}`,
        ).toEqual(baseline);
        expect(meshCount(asset.root), asset.id).toBe(count);
      }
      animator.dispose();
    }
  } finally {
    world.assets.dispose();
  }
});
