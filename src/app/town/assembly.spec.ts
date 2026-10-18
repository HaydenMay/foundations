import { describe, expect, it, vi } from 'vitest';
import * as T from 'three';
import { AssemblyAnimator, AssemblyBindings, AssemblyRecipe } from './assembly';

function object(root: T.Object3D, x: number, y: number, z: number) {
  const piece = new T.Group();
  piece.position.set(x, y, z);
  root.add(piece);
  return piece;
}

function bindings(pieces: Record<string, T.Object3D | undefined>): AssemblyBindings {
  return new Map(Object.entries(pieces));
}

describe('asset-agnostic assembly playback', () => {
  it('orders unnumbered pieces by stable IDs and evaluates the same progress independent of history', () => {
    const firstRoot = new T.Group(),
      secondRoot = new T.Group();
    const firstAlpha = object(firstRoot, 2, 1, 0),
      firstZeta = object(firstRoot, -1, 3, 0),
      secondAlpha = object(secondRoot, 2, 1, 0),
      secondZeta = object(secondRoot, -1, 3, 0);
    const recipe: AssemblyRecipe = {
      pieces: [{ id: 'zeta', dropHeight: 3 }, { id: 'alpha', dropHeight: 1 }],
      config: { durationMs: 1000, staggerMs: 250, concurrency: 1 },
    };
    const first = new AssemblyAnimator(firstRoot, bindings({ alpha: firstAlpha, zeta: firstZeta }), recipe),
      second = new AssemblyAnimator(secondRoot, bindings({ alpha: secondAlpha, zeta: secondZeta }), recipe);

    first.evaluate(0);
    expect(firstAlpha.visible).toBe(true);
    expect(firstZeta.visible).toBe(false);
    first.evaluate(0.5);
    second.evaluate(0.12);
    second.evaluate(0.83);
    second.evaluate(0.5);
    expect(firstAlpha.position.toArray()).toEqual(secondAlpha.position.toArray());
    expect(firstZeta.position.toArray()).toEqual(secondZeta.position.toArray());
    expect(firstZeta.visible).toBe(secondZeta.visible);
    first.dispose();
    second.dispose();
  });

  it('drops pieces along world-up through a rotated, non-uniformly scaled parent', () => {
    const scene = new T.Group(),
      parent = new T.Group(),
      root = new T.Group();
    scene.add(parent);
    parent.position.set(4, 2, -7);
    parent.rotation.set(Math.PI / 3, -Math.PI / 5, Math.PI / 7);
    parent.scale.set(0.7, 1.8, 1.15);
    parent.add(root);
    const piece = object(root, 2, 1, -3);
    piece.rotation.set(0.2, 0.7, -0.4);
    const recipe: AssemblyRecipe = { pieces: [{ id: 'sculpture', dropHeight: 3.5 }] };
    const animator = new AssemblyAnimator(root, bindings({ sculpture: piece }), recipe);
    scene.updateMatrixWorld(true);
    const before = piece.getWorldPosition(new T.Vector3());

    expect(animator.play()).toBe(true);
    animator.evaluate(0);
    scene.updateMatrixWorld(true);
    const dropped = piece.getWorldPosition(new T.Vector3());
    expect(dropped.x - before.x).toBeCloseTo(0, 5);
    expect(dropped.y - before.y).toBeCloseTo(3.5, 5);
    expect(dropped.z - before.z).toBeCloseTo(0, 5);

    animator.update(1);
    scene.updateMatrixWorld(true);
    expect(piece.getWorldPosition(new T.Vector3()).distanceTo(before)).toBeLessThan(1e-10);
    animator.dispose();
  });

  it('restores exact local transforms and visibility after twenty replays', () => {
    const root = new T.Group(),
      visible = object(root, -1.25, 2.75, 3.5),
      hidden = object(root, 0.2, -0.1, 0.8);
    visible.quaternion.setFromEuler(new T.Euler(0.2, -0.35, 0.1));
    visible.scale.set(1.2, 0.85, 1.05);
    hidden.visible = false;
    const visibleBaseline = {
      position: visible.position.clone(),
      quaternion: visible.quaternion.clone(),
      scale: visible.scale.clone(),
      visibility: visible.visible,
    };
    const hiddenBaseline = {
      position: hidden.position.clone(),
      quaternion: hidden.quaternion.clone(),
      scale: hidden.scale.clone(),
      visibility: hidden.visible,
    };
    const animator = new AssemblyAnimator(
      root,
      bindings({ visible, hidden }),
      { pieces: [{ id: 'visible', order: 1 }, { id: 'hidden', order: 2 }] },
    );

    for (let replay = 0; replay < 20; replay++) {
      if (replay === 0) animator.play();
      else animator.replay();
      animator.update(0.25);
      animator.update(0.61);
      animator.update(1);
      expect(visible.position.toArray()).toEqual(visibleBaseline.position.toArray());
      expect(visible.quaternion.toArray()).toEqual(visibleBaseline.quaternion.toArray());
      expect(visible.scale.toArray()).toEqual(visibleBaseline.scale.toArray());
      expect(visible.visible).toBe(visibleBaseline.visibility);
      expect(hidden.position.toArray()).toEqual(hiddenBaseline.position.toArray());
      expect(hidden.quaternion.toArray()).toEqual(hiddenBaseline.quaternion.toArray());
      expect(hidden.scale.toArray()).toEqual(hiddenBaseline.scale.toArray());
      expect(hidden.visible).toBe(hiddenBaseline.visibility);
    }
    animator.dispose();
  });

  it('fires completion once when skipped and cancellation restores without success', () => {
    const root = new T.Group(),
      piece = object(root, 0, 2, 0),
      done = vi.fn();
    const animator = new AssemblyAnimator(root, bindings({ part: piece }), {
      pieces: [{ id: 'part' }],
    });
    animator.play(done);
    animator.update(0.4);
    expect(animator.skip()).toBe(true);
    expect(animator.skip()).toBe(false);
    expect(animator.lifecycle).toBe('completed');
    expect(done).toHaveBeenCalledOnce();
    expect(piece.position.toArray()).toEqual([0, 2, 0]);

    const secondDone = vi.fn();
    animator.replay(secondDone);
    animator.update(0.4);
    expect(animator.cancel()).toBe(true);
    expect(animator.lifecycle).toBe('idle');
    expect(secondDone).not.toHaveBeenCalled();
    expect(piece.position.toArray()).toEqual([0, 2, 0]);
    animator.dispose();
  });

  it('finishes immediately for reduced motion and does not mutate after disposal', () => {
    const reducedRoot = new T.Group(),
      reducedPiece = object(reducedRoot, 1, 4, 2),
      reducedDone = vi.fn();
    const reduced = new AssemblyAnimator(
      reducedRoot,
      bindings({ panel: reducedPiece }),
      { pieces: [{ id: 'panel' }] },
      { reducedMotion: true },
    );
    reduced.play(reducedDone);
    expect(reduced.lifecycle).toBe('completed');
    expect(reducedPiece.position.toArray()).toEqual([1, 4, 2]);
    expect(reducedDone).toHaveBeenCalledOnce();

    const root = new T.Group(),
      piece = object(root, 0, 1, 0);
    const animator = new AssemblyAnimator(root, bindings({ part: piece }), {
      pieces: [{ id: 'part' }],
    });
    animator.play();
    animator.update(0.35);
    const stoppedAt = piece.position.clone();
    animator.dispose();
    animator.update(0.9);
    expect(animator.lifecycle).toBe('disposed');
    expect(piece.position.toArray()).toEqual(stoppedAt.toArray());
    reduced.dispose();
  });

  it('aborts missing required, duplicate or ancestor/descendant bindings before movement', () => {
    const root = new T.Group(),
      parent = object(root, 0, 1, 0),
      child = object(parent, 0, 1, 0);
    expect(
      () =>
        new AssemblyAnimator(
          root,
          bindings({ parent, child }),
          { pieces: [{ id: 'parent' }, { id: 'child' }] },
        ),
    ).toThrow(/overlap/i);
    expect(
      () =>
        new AssemblyAnimator(
          root,
          bindings({ part: parent }),
          { pieces: [{ id: 'part' }, { id: 'part' }] },
        ),
    ).toThrow(/duplicate/i);
    expect(
      () =>
        new AssemblyAnimator(root, bindings({}), { pieces: [{ id: 'required' }] }),
    ).toThrow(/required/i);
    expect(parent.position.toArray()).toEqual([0, 1, 0]);
    expect(child.position.toArray()).toEqual([0, 1, 0]);
  });

  it('warns and skips a missing optional assembly while playing the resolved pieces', () => {
    const root = new T.Group(),
      piece = object(root, 0, 1, 0),
      warn = vi.fn();
    const animator = new AssemblyAnimator(
      root,
      bindings({ visible: piece }),
      { pieces: [{ id: 'missing', optional: true }, { id: 'visible' }] },
      {},
      warn,
    );
    expect(warn).toHaveBeenCalledOnce();
    expect(animator.play()).toBe(true);
    animator.update(1);
    expect(animator.lifecycle).toBe('completed');
    animator.dispose();
  });

  it('completes an all-optional empty recipe without leaving a playback active', () => {
    const root = new T.Group(),
      done = vi.fn(),
      warn = vi.fn();
    const animator = new AssemblyAnimator(
      root,
      bindings({}),
      { pieces: [{ id: 'future-detail', optional: true }] },
      {},
      warn,
    );
    expect(animator.durationMs).toBe(0);
    expect(animator.play(done)).toBe(true);
    expect(animator.lifecycle).toBe('completed');
    expect(done).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();
    animator.dispose();
  });

  it('rejects ambiguous object references and unsafe completed transforms before movement', () => {
    const root = new T.Group(),
      first = object(root, 0, 1, 0),
      invalid = object(root, 0, 2, 0);
    expect(
      () =>
        new AssemblyAnimator(
          root,
          bindings({ left: first, alias: first }),
          { pieces: [{ id: 'left' }, { id: 'alias' }] },
        ),
    ).toThrow(/ambiguous/i);

    invalid.position.x = Number.NaN;
    expect(
      () =>
        new AssemblyAnimator(
          root,
          bindings({ first, invalid }),
          { pieces: [{ id: 'first' }, { id: 'invalid' }] },
        ),
    ).toThrow(/unsafe completed transform/i);
    expect(first.position.toArray()).toEqual([0, 1, 0]);
    expect(invalid.position.x).toBeNaN();
  });

  it('prevents overlapping controllers but allows independent object instances', () => {
    const firstRoot = new T.Group(),
      secondRoot = new T.Group();
    const shared = object(firstRoot, 0, 0, 0),
      independent = object(secondRoot, 0, 0, 0);
    const recipe: AssemblyRecipe = { pieces: [{ id: 'part' }] };
    const first = new AssemblyAnimator(firstRoot, bindings({ part: shared }), recipe),
      conflicting = new AssemblyAnimator(firstRoot, bindings({ part: shared }), recipe),
      separate = new AssemblyAnimator(secondRoot, bindings({ part: independent }), recipe);
    expect(first.play()).toBe(true);
    expect(conflicting.play()).toBe(false);
    expect(separate.play()).toBe(true);
    separate.skip();
    expect(separate.lifecycle).toBe('completed');
    first.cancel();
    expect(conflicting.play()).toBe(true);
    first.dispose();
    conflicting.dispose();
    separate.dispose();
  });

  it('stops and restores the bound instance when its root is replaced', () => {
    const scene = new T.Group(),
      root = new T.Group();
    scene.add(root);
    const piece = object(root, 0, 1, 0),
      done = vi.fn();
    const animator = new AssemblyAnimator(root, bindings({ part: piece }), {
      pieces: [{ id: 'part' }],
    });
    animator.play(done);
    animator.update(0.4);
    scene.remove(root);
    new T.Group().add(root);
    animator.update(0.6);
    expect(animator.lifecycle).toBe('idle');
    expect(piece.position.toArray()).toEqual([0, 1, 0]);
    expect(done).not.toHaveBeenCalled();
    animator.dispose();
  });
});
