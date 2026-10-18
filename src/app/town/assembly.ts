import * as T from 'three';

export type AssemblyEasing = 'ease-out-cubic' | 'ease-in-out-cubic';
export type AssemblyLifecycle = 'idle' | 'playing' | 'completed' | 'disposed';

export interface AssemblyConfig {
  /** Duration of each piece's drop, before speed scaling. */
  durationMs: number;
  /** Distance each piece starts above its completed world position, in metres. */
  dropHeight: number;
  /** Delay between concurrent waves, before speed scaling. */
  staggerMs: number;
  /** Number of recipe pieces that start in each wave. */
  concurrency: number;
  /** Small, damped settling movement near the end, in metres. */
  settleMeters: number;
  easing: AssemblyEasing;
  /** Values above one make the preview finish faster. */
  speed: number;
  reducedMotion: boolean;
}

export type AssemblyConfigOverride = Partial<AssemblyConfig>;

export interface AssemblyPieceRecipe {
  /** Stable recipe identifier; it is not interpreted by the animator. */
  id: string;
  /** Explicit choreography order. Entries without one use stable-ID ordering. */
  order?: number;
  /** Optional per-piece start offset, in milliseconds before speed scaling. */
  delayMs?: number;
  /** Optional per-piece duration, in milliseconds before speed scaling. */
  durationMs?: number;
  /** Optional per-piece starting height, in world metres. */
  dropHeight?: number;
  /** Missing entries are required unless explicitly marked optional. */
  optional?: boolean;
}

export interface AssemblyRecipe {
  pieces: readonly AssemblyPieceRecipe[];
  config?: AssemblyConfigOverride;
}

export type AssemblyBindings = ReadonlyMap<string, T.Object3D | undefined>;

export const DEFAULT_ASSEMBLY_CONFIG: Readonly<AssemblyConfig> = Object.freeze({
  durationMs: 3600,
  dropHeight: 3.5,
  staggerMs: 220,
  concurrency: 4,
  settleMeters: 0.07,
  easing: 'ease-out-cubic',
  speed: 1,
  reducedMotion: false,
});

interface Baseline {
  id: string;
  object: T.Object3D;
  parent: T.Object3D | null;
  position: T.Vector3;
  quaternion: T.Quaternion;
  scale: T.Vector3;
  visible: boolean;
  parentLocalWorldUp: T.Vector3;
  startMs: number;
  durationMs: number;
  dropHeight: number;
}

const objectOwners = new WeakMap<T.Object3D, AssemblyAnimator>();

function isBelow(root: T.Object3D, object: T.Object3D): boolean {
  for (let current: T.Object3D | null = object; current; current = current.parent)
    if (current === root) return true;
  return false;
}

function overlaps(a: T.Object3D, b: T.Object3D): boolean {
  return isBelow(a, b) || isBelow(b, a);
}

function finite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

function resolveConfig(recipe: AssemblyRecipe, override: AssemblyConfigOverride): AssemblyConfig {
  const config = { ...DEFAULT_ASSEMBLY_CONFIG, ...recipe.config, ...override };
  if (
    !Number.isFinite(config.durationMs) ||
    config.durationMs <= 0 ||
    !Number.isFinite(config.dropHeight) ||
    config.dropHeight < 0 ||
    !Number.isFinite(config.staggerMs) ||
    config.staggerMs < 0 ||
    !Number.isInteger(config.concurrency) ||
    config.concurrency < 1 ||
    !Number.isFinite(config.settleMeters) ||
    config.settleMeters < 0 ||
    !Number.isFinite(config.speed) ||
    config.speed <= 0 ||
    !['ease-out-cubic', 'ease-in-out-cubic'].includes(config.easing) ||
    typeof config.reducedMotion !== 'boolean'
  )
    throw new Error('Assembly configuration contains an unsafe value.');
  return config;
}

function ease(progress: number, easing: AssemblyEasing): number {
  if (easing === 'ease-in-out-cubic')
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  return 1 - Math.pow(1 - progress, 3);
}

function selectedObjects(root: T.Object3D, objects: readonly T.Object3D[]): T.Object3D[] {
  const owned = new Set<T.Object3D>();
  for (const piece of objects) piece.traverse((object) => owned.add(object));
  // The root is intentionally not claimed when it contains several independent pieces.
  if (objects.length === 1 && objects[0] === root) owned.add(root);
  return [...owned];
}

/**
 * Asset-agnostic normalized assembly playback. This class owns no timer, RAF, renderer,
 * geometry or material; its caller supplies progress from the existing scene loop.
 */
export class AssemblyAnimator {
  readonly config: Readonly<AssemblyConfig>;
  readonly durationMs: number;
  readonly pieces: readonly Baseline[];
  private readonly boundParent: T.Object3D | null;
  private readonly ownedObjects: readonly T.Object3D[];
  private _lifecycle: AssemblyLifecycle = 'idle';
  private completion?: () => void;
  private completionFired = false;

  get lifecycle(): AssemblyLifecycle {
    return this._lifecycle;
  }

  constructor(
    private readonly root: T.Object3D,
    bindings: AssemblyBindings,
    recipe: AssemblyRecipe,
    override: AssemblyConfigOverride = {},
    warn: (message: string) => void = (message) => console.warn(message),
  ) {
    this.config = Object.freeze(resolveConfig(recipe, override));
    this.boundParent = root.parent;
    root.updateWorldMatrix(true, true);

    const ids = new Set<string>();
    const resolved: { entry: AssemblyPieceRecipe; object: T.Object3D }[] = [];
    for (const entry of recipe.pieces) {
      if (!entry.id || ids.has(entry.id))
        throw new Error('Duplicate assembly recipe ID: ' + entry.id);
      ids.add(entry.id);
      if (
        (entry.order !== undefined && !Number.isFinite(entry.order)) ||
        (entry.delayMs !== undefined && (!Number.isFinite(entry.delayMs) || entry.delayMs < 0)) ||
        (entry.durationMs !== undefined &&
          (!Number.isFinite(entry.durationMs) || entry.durationMs <= 0)) ||
        (entry.dropHeight !== undefined &&
          (!Number.isFinite(entry.dropHeight) || entry.dropHeight < 0))
      )
        throw new Error('Assembly recipe entry "' + entry.id + '" contains an unsafe value.');
      const object = bindings.get(entry.id);
      if (!object) {
        if (entry.optional) {
          warn('Optional assembly piece "' + entry.id + '" is missing and was skipped.');
          continue;
        }
        throw new Error('Required assembly piece "' + entry.id + '" is missing.');
      }
      if (!isBelow(root, object))
        throw new Error('Assembly piece "' + entry.id + '" does not belong to this asset instance.');
      resolved.push({ entry, object });
    }

    resolved.sort((a, b) => {
      const orderA = a.entry.order ?? Number.POSITIVE_INFINITY;
      const orderB = b.entry.order ?? Number.POSITIVE_INFINITY;
      return orderA - orderB || a.entry.id.localeCompare(b.entry.id);
    });

    const seenObjects = new Set<T.Object3D>();
    for (let i = 0; i < resolved.length; i++) {
      const current = resolved[i];
      if (seenObjects.has(current.object))
        throw new Error('Ambiguous assembly ownership for "' + current.entry.id + '".');
      seenObjects.add(current.object);
      for (let j = 0; j < i; j++)
        if (overlaps(current.object, resolved[j].object))
          throw new Error('Assembly pieces overlap by ancestor/descendant ownership.');
    }

    const baselines: Baseline[] = [];
    resolved.forEach(({ entry, object }, index) => {
      const parent = object.parent;
      const parentMatrix = parent?.matrixWorld;
      const determinant = parentMatrix?.determinant() ?? 1;
      if (
        !finite([
          ...object.position.toArray(),
          ...object.quaternion.toArray(),
          ...object.scale.toArray(),
        ]) ||
        object.quaternion.lengthSq() < 1e-12 ||
        Math.abs(object.scale.x * object.scale.y * object.scale.z) < 1e-12 ||
        (parentMatrix && (!finite(parentMatrix.elements) || Math.abs(determinant) < 1e-12))
      )
        throw new Error('Assembly piece "' + entry.id + '" has an unsafe completed transform.');
      const parentInverse = parentMatrix ? parentMatrix.clone().invert() : undefined;
      const parentLocalWorldUp = parentInverse
        ? new T.Vector3(0, 1, 0).applyMatrix3(new T.Matrix3().setFromMatrix4(parentInverse))
        : new T.Vector3(0, 1, 0);
      const wave = Math.floor(index / this.config.concurrency);
      const startMs = (entry.delayMs ?? wave * this.config.staggerMs) / this.config.speed;
      const durationMs = (entry.durationMs ?? this.config.durationMs) / this.config.speed;
      const dropHeight = entry.dropHeight ?? this.config.dropHeight;
      baselines.push({
        id: entry.id,
        object,
        parent,
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
        visible: object.visible,
        parentLocalWorldUp,
        startMs,
        durationMs,
        dropHeight,
      });
    });
    this.pieces = Object.freeze(baselines);
    this.durationMs = baselines.reduce(
      (duration, piece) => Math.max(duration, piece.startMs + piece.durationMs),
      0,
    );
    this.ownedObjects = Object.freeze(selectedObjects(root, baselines.map((piece) => piece.object)));
  }

  /** Begin from the immutable completed-state snapshot. Repeated play calls never stack. */
  play(onComplete?: () => void): boolean {
    if (this._lifecycle === 'disposed' || this._lifecycle === 'playing') return false;
    if (!this.structureIsCurrent() || !this.acquire()) return false;
    this.completion = onComplete;
    this.completionFired = false;
    this._lifecycle = 'playing';
    this.evaluate(0);
    if (this.durationMs === 0 || this.config.reducedMotion) this.update(1);
    return true;
  }

  /** Restart this instance without retaining transforms from an earlier playback. */
  replay(onComplete?: () => void): boolean {
    if (this._lifecycle === 'disposed') return false;
    if (this._lifecycle === 'playing') this.cancel();
    return this.play(onComplete);
  }

  /** Seek directly to normalized timeline progress; every pose is derived from baseline. */
  evaluate(progress: number): void {
    if (this._lifecycle === 'disposed') return;
    if (this._lifecycle === 'playing' && !this.structureIsCurrent()) {
      this.cancel();
      return;
    }
    const normalized = Number.isFinite(progress) ? T.MathUtils.clamp(progress, 0, 1) : 0;
    const elapsed = normalized * this.durationMs;
    for (const piece of this.pieces) {
      const localProgress = (elapsed - piece.startMs) / piece.durationMs;
      piece.object.position.copy(piece.position);
      piece.object.quaternion.copy(piece.quaternion);
      piece.object.scale.copy(piece.scale);
      if (localProgress < 0) {
        piece.object.visible = false;
        continue;
      }
      piece.object.visible = piece.visible;
      if (localProgress >= 1) continue;
      const local = T.MathUtils.clamp(localProgress, 0, 1);
      const easing = ease(local, this.config.easing);
      let offset = piece.dropHeight * (1 - easing);
      if (local >= 0.78 && this.config.settleMeters > 0) {
        const settleProgress = (local - 0.78) / 0.22;
        offset +=
          this.config.settleMeters * Math.sin(settleProgress * Math.PI * 2) * (1 - settleProgress);
      }
      piece.object.position.addScaledVector(piece.parentLocalWorldUp, offset);
    }
  }

  /** Apply an absolute normalized time sample from the caller's render loop. */
  update(progress: number): void {
    if (this._lifecycle !== 'playing') return;
    if (!this.structureIsCurrent()) {
      this.cancel();
      return;
    }
    const normalized = Number.isFinite(progress) ? T.MathUtils.clamp(progress, 0, 1) : 0;
    this.evaluate(normalized);
    if (normalized === 1) this.complete();
  }

  /** Complete active playback immediately and invoke the callback at most once. */
  skip(): boolean {
    if (this._lifecycle !== 'playing') return false;
    this.update(1);
    return this.lifecycle === 'completed';
  }

  /** Stop without reporting successful completion, restoring the exact completed asset. */
  cancel(): boolean {
    if (this._lifecycle !== 'playing') return false;
    this.restoreBaseline();
    this._lifecycle = 'idle';
    this.completion = undefined;
    this.release();
    return true;
  }

  /** Stop future updates without touching the current object transforms. */
  dispose(): void {
    if (this._lifecycle === 'disposed') return;
    this.release();
    this.completion = undefined;
    this._lifecycle = 'disposed';
  }

  private complete(): void {
    this.restoreBaseline();
    this._lifecycle = 'completed';
    this.release();
    if (!this.completionFired) {
      this.completionFired = true;
      const callback = this.completion;
      this.completion = undefined;
      callback?.();
    }
  }

  private restoreBaseline(): void {
    for (const piece of this.pieces) {
      piece.object.position.copy(piece.position);
      piece.object.quaternion.copy(piece.quaternion);
      piece.object.scale.copy(piece.scale);
      piece.object.visible = piece.visible;
    }
  }

  private structureIsCurrent(): boolean {
    return (
      this.root.parent === this.boundParent &&
      this.pieces.every(
        (piece) => piece.object.parent === piece.parent && isBelow(this.root, piece.object),
      )
    );
  }

  private acquire(): boolean {
    if (this.ownedObjects.some((object) => objectOwners.has(object))) return false;
    for (const object of this.ownedObjects) objectOwners.set(object, this);
    return true;
  }

  private release(): void {
    for (const object of this.ownedObjects)
      if (objectOwners.get(object) === this) objectOwners.delete(object);
  }
}
