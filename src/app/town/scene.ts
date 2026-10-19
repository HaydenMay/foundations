import * as T from 'three';
import { CameraState, Lighting } from '../domain/models';
import { CITY_CAMERA_BOUNDS, HOME_CAMERA_BOUNDS, TownCamera } from './camera';
import { lightAt, torchFlickerIntensity } from './lighting';
import { buildWorld, TownWorld } from './world';
import { AssemblyAnimator } from './assembly';
import type { AssemblyConfigOverride } from './assembly';
import { homeTransition, projectTransition, settleConstructionCamera } from './construction';
import { CITY_MONORAIL_PLAN } from './city-site-plan';
import { CHAPTER_FOUR_PROJECTS, CHAPTER_THREE_PROJECTS } from '../domain/progression';

export class TownScene {
  readonly renderer: T.WebGLRenderer;
  readonly camera: TownCamera;
  private readonly scene = new T.Scene();
  private readonly sun = new T.DirectionalLight('#fff0d5', 2.8);
  private readonly hemi = new T.HemisphereLight('#cad9d4', '#adad91', 1.9);
  private world?: TownWorld;
  private designs: Record<string, string> = {};
  private frameworkProof = false;
  private readonly observer: ResizeObserver;
  private readonly ground: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;
  private lighting: Lighting = 'auto';
  private lightKey = '';
  private readonly timer: ReturnType<typeof setInterval>;
  private frameRequest = 0;
  private ambientEpoch = 0;
  private lastAmbientFrame = 0;
  private lastTorchFrame = 0;
  private torchActive = false;
  private active = true;
  private readonly motionPreference =
    typeof matchMedia === 'undefined' ? undefined : matchMedia('(prefers-reduced-motion: reduce)');
  private readonly motionPreferenceChanged = () => {
    if (this.reducedMotion()) {
      this.finishConstruction();
      if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
      this.stopTorchFlicker();
      return;
    }
    this.ensureFrameLoop();
    this.render();
  };
  private suppressCameraPersistence = false;
  private previewCamera?: CameraState;
  private construction?: {
    started: number;
    last: number;
    from: CameraState;
    focus?: { x: number; z: number; zoom: number; angle?: number };
    settleAtFocus: boolean;
    animator: AssemblyAnimator;
    visibility: boolean[];
    done: () => void;
  };
  private readonly visibility = () => {
    this.active = !document.hidden;
    if (this.active) {
      this.updateLight();
      this.ensureFrameLoop();
      this.render();
    } else {
      if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
      this.frameRequest = 0;
      this.stopTorchFlicker();
    }
  };
  constructor(
    private readonly container: HTMLElement,
    designs: Record<string, string>,
    initial: CameraState,
    changed: (s: CameraState) => void,
    private readonly label: (name: string) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute(
      'aria-label',
      'Interactive town. Drag to pan, pinch or scroll to zoom. Arrow keys pan, plus and minus zoom, R rotates, Home returns to your house.',
    );
    canvas.setAttribute('role', 'img');
    container.appendChild(canvas);
    this.sun.position.set(-14, 25, 18);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.hemi);
    this.ground = new T.Mesh(
      new T.PlaneGeometry(250, 250),
      new T.MeshBasicMaterial({ color: '#e8ede4', toneMapped: false }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.96;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.camera = new TownCamera(
      canvas,
      initial,
      (state) => {
        if (!this.suppressCameraPersistence && !this.previewCamera) changed(state);
      },
      () => this.render(),
      [...CHAPTER_THREE_PROJECTS, ...CHAPTER_FOUR_PROJECTS].some((project) =>
        Boolean(designs[project.id]),
      )
        ? CITY_CAMERA_BOUNDS
        : HOME_CAMERA_BOUNDS,
    );
    this.setDesigns(designs);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    this.timer = setInterval(() => this.updateLight(), 60000);
    document.addEventListener('visibilitychange', this.visibility);
    this.motionPreference?.addEventListener('change', this.motionPreferenceChanged);
  }
  setDesigns(designs: Record<string, string>) {
    this.designs = { ...designs };
    this.rebuildWorld();
  }
  setFrameworkProof(enabled: boolean) {
    if (this.frameworkProof === enabled) return;
    this.frameworkProof = enabled;
    this.rebuildWorld();
  }
  private rebuildWorld() {
    this.cancelConstruction();
    this.stopTorchFlicker();
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.assets.dispose();
    }
    this.world = buildWorld(this.designs, { frameworkProof: this.frameworkProof });
    const expanded = this.world.projectAssets.has('ch2-neighborhood');
    const cityExpanded = this.world.cityExpanded;
    this.camera.setBounds(cityExpanded ? CITY_CAMERA_BOUNDS : HOME_CAMERA_BOUNDS);
    this.sun.shadow.camera.left = cityExpanded ? -140 : expanded ? -40 : -30;
    this.sun.shadow.camera.right = cityExpanded ? 180 : expanded ? 70 : 30;
    this.sun.shadow.camera.top = cityExpanded ? 125 : expanded ? 40 : 30;
    this.sun.shadow.camera.bottom = cityExpanded ? -125 : expanded ? -40 : -30;
    this.sun.shadow.camera.far = cityExpanded ? 340 : expanded ? 130 : 80;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.ground.position.x = cityExpanded ? 55 : 0;
    this.ground.scale.set(1, 1, cityExpanded ? 0.66 : 1);
    this.ambientEpoch = performance.now();
    this.lastAmbientFrame = 0;
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.add(this.world.group);
    this.updateLight();
    this.ensureFrameLoop();
  }
  celebrate(done: () => void, override: AssemblyConfigOverride = {}) {
    const home = this.world?.home,
      assemblies = this.world?.homeAssemblies,
      recipe = this.world?.homeRecipe;
    this.celebrateAsset(home, assemblies, recipe, undefined, done, override);
  }
  celebrateProject(projectId: string, done: () => void, override: AssemblyConfigOverride = {}) {
    this.previewCamera = undefined;
    const asset = this.world?.projectAssets.get(projectId);
    if (!asset) {
      this.cancelConstruction();
      this.suppressCameraPersistence = true;
      this.camera.home();
      this.suppressCameraPersistence = false;
      this.render();
      done();
      return;
    }
    this.celebrateAsset(
      asset.root,
      asset.pieces,
      asset.recipe,
      asset.focus,
      done,
      override,
      projectId === 'ch2-neighborhood' ||
        projectId === 'framework-proof-neighbor' ||
        projectId.startsWith('city-') ||
        projectId === 'monorail',
    );
  }
  focusProjectPreview(projectId: string) {
    const focus = this.world?.projectAssets.get(projectId)?.focus;
    if (!focus) return;
    if (!this.previewCamera) this.previewCamera = this.camera.state();
    this.setTransientCamera({
      ...this.camera.state(),
      x: focus.x,
      z: focus.z,
      zoom: focus.zoom,
      angle: focus.angle ?? this.camera.state().angle,
    });
    this.render();
  }
  restoreProjectPreviewCamera() {
    const previous = this.previewCamera;
    this.previewCamera = undefined;
    if (!previous) return;
    this.setTransientCamera(previous);
    this.render();
  }
  private setTransientCamera(state: CameraState) {
    const previous = this.suppressCameraPersistence;
    this.suppressCameraPersistence = true;
    try {
      this.camera.set(state);
    } finally {
      this.suppressCameraPersistence = previous;
    }
  }
  private celebrateAsset(
    root: T.Object3D | undefined,
    pieces: ReadonlyMap<string, T.Group> | undefined,
    recipe: TownWorld['homeRecipe'],
    focus: { x: number; z: number; zoom: number; angle?: number } | undefined,
    done: () => void,
    override: AssemblyConfigOverride,
    settleAtFocus = false,
  ) {
    this.cancelConstruction();
    if (!root || !pieces || !recipe) {
      this.suppressCameraPersistence = true;
      this.camera.home();
      this.suppressCameraPersistence = false;
      this.render();
      done();
      return;
    }
    let animator: AssemblyAnimator;
    try {
      animator = new AssemblyAnimator(root, pieces, recipe, {
        ...override,
        reducedMotion:
          override.reducedMotion ??
          (typeof matchMedia !== 'undefined' &&
            matchMedia('(prefers-reduced-motion: reduce)').matches),
      });
    } catch (error) {
      console.warn('Assembly could not start; showing the completed project:', error);
      this.suppressCameraPersistence = true;
      this.camera.home();
      this.suppressCameraPersistence = false;
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
      done();
      return;
    }
    const animation = {
      started: performance.now(),
      last: -100,
      from: this.camera.state(),
      focus,
      settleAtFocus,
      animator,
      visibility: animator.pieces.map((piece) => piece.object.visible),
      done,
    };
    this.construction = animation;
    this.suppressCameraPersistence = true;
    this.camera.controls.enabled = false;
    if (!animator.play(() => this.completeConstruction(animation))) {
      this.construction = undefined;
      animator.dispose();
      this.camera.controls.enabled = true;
      this.camera.home();
      this.suppressCameraPersistence = false;
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
      done();
      return;
    }
    if (this.construction !== animation) return;
    this.ensureFrameLoop();
  }
  finishConstruction() {
    const animation = this.construction;
    if (!animation) return;
    if (!animation.animator.skip()) this.cancelConstruction();
  }
  cancelConstruction() {
    this.stopConstruction(true, true);
  }
  private completeConstruction(animation: NonNullable<TownScene['construction']>) {
    if (this.construction !== animation) return;
    this.construction = undefined;
    animation.animator.dispose();
    this.camera.controls.enabled = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.previewCamera = undefined;
    if (animation.settleAtFocus && animation.focus) {
      this.camera.set(settleConstructionCamera(animation.from, animation.focus, true));
    } else this.camera.home();
    this.suppressCameraPersistence = false;
    this.render();
    animation.done();
    this.releaseFrameLoopIfIdle();
  }
  private stopConstruction(resetCamera: boolean, refresh: boolean) {
    const animation = this.construction;
    if (!animation) return;
    this.construction = undefined;
    animation.animator.cancel();
    animation.animator.dispose();
    this.camera.controls.enabled = true;
    if (resetCamera) this.camera.set(animation.from);
    this.suppressCameraPersistence = false;
    if (refresh) {
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
    }
    this.releaseFrameLoopIfIdle();
    this.ensureFrameLoop();
  }
  setLighting(value: Lighting) {
    if (this.lighting === value) return;
    this.lighting = value;
    this.updateLight();
  }
  private updateLight() {
    const now = new Date(),
      palette = lightAt(this.lighting, now.getHours() + now.getMinutes() / 60);
    const key = JSON.stringify(palette);
    if (key !== this.lightKey) {
      this.lightKey = key;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.sun.color.set(palette.sun);
    this.sun.intensity = palette.sunPower;
    this.hemi.color.set(palette.ambient);
    this.hemi.intensity = palette.ambientPower;
    this.ground.material.color.set(palette.sky);
    this.container.style.background = palette.sky;
    this.sun.position.set(...palette.direction);
    this.hemi.groundColor.set(palette.ground);
    this.world?.assets.windows.forEach((m) => {
      m.emissiveIntensity = palette.windows * 1.8;
    });
    this.world?.assets.lamps.forEach((l) => {
      l.intensity = palette.windows * 14;
    });
    this.label(palette.label);
    this.updateTorchFlicker(
      palette.label === 'night' &&
        !(
          typeof matchMedia !== 'undefined' &&
          matchMedia('(prefers-reduced-motion: reduce)').matches
        ),
    );
    this.render();
  }
  private updateTorchFlicker(night: boolean) {
    const flames = this.world?.assets.torchFlames;
    if (!this.active || !night || !flames?.length || this.reducedMotion()) {
      this.torchActive = false;
      flames?.forEach((material, index) => {
        material.emissiveIntensity = torchFlickerIntensity(0, false) * (index ? 0.9 : 1);
      });
      return;
    }
    this.torchActive = true;
    this.ensureFrameLoop();
  }
  private stopTorchFlicker() {
    this.torchActive = false;
  }
  private reducedMotion() {
    return (
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
  private hasAmbientMotion() {
    const world = this.world;
    return (
      !this.reducedMotion() &&
      !!world &&
      (!!world.movingMonorail ||
        !!world.assets?.animatedWater?.length ||
        !!world.assets?.foliageTimeUniforms?.length)
    );
  }
  private ensureFrameLoop() {
    if (
      !this.active ||
      this.frameRequest ||
      (!this.construction && !this.torchActive && !this.hasAmbientMotion())
    )
      return;
    this.frameRequest = requestAnimationFrame((now) => this.updateFrame(now));
  }
  private releaseFrameLoopIfIdle() {
    if (this.construction || this.torchActive || this.hasAmbientMotion() || !this.frameRequest)
      return;
    cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
  }
  /** One low-rate scene loop owns assembly, foliage, water, night glow, and the optional monorail. */
  private updateFrame(now: number) {
    this.frameRequest = 0;
    if (!this.active) return;
    let shouldRender = false;
    const animation = this.construction;
    if (animation) {
      const elapsed = Math.max(0, now - animation.started);
      animation.animator.update(
        animation.animator.durationMs === 0 ? 1 : elapsed / animation.animator.durationMs,
      );
      if (this.construction === animation) {
        let visibilityChanged = false;
        for (let index = 0; index < animation.animator.pieces.length; index++) {
          const visible = animation.animator.pieces[index].object.visible;
          if (animation.visibility[index] !== visible) {
            animation.visibility[index] = visible;
            visibilityChanged = true;
          }
        }
        if (visibilityChanged) this.renderer.shadowMap.needsUpdate = true;
        if (visibilityChanged || now - animation.last >= 1000 / 30) {
          animation.last = now;
          this.camera.set(
            animation.focus
              ? projectTransition(animation.from, animation.focus, elapsed / 750)
              : homeTransition(animation.from, elapsed / 750),
          );
          this.render();
          shouldRender = true;
        }
      } else shouldRender = true;
    }

    if (this.hasAmbientMotion() && now - this.lastAmbientFrame >= 1000 / 30) {
      this.lastAmbientFrame = now;
      const world = this.world!;
      const seconds = (now - this.ambientEpoch) / 1000;
      for (const uniform of world.assets.foliageTimeUniforms) uniform.value = seconds;
      for (const water of world.assets.animatedWater) {
        const baseY = water.userData['ambientBaseY'] as number;
        water.position.y = baseY + Math.sin(seconds * 1.4 + water.id) * 0.012;
      }
      if (world.movingMonorail) {
        const progress = 0.11 + seconds / CITY_MONORAIL_PLAN.trainLapSeconds;
        world.movingMonorail.update(progress);
      }
      shouldRender = true;
    }

    if (this.torchActive && now - this.lastTorchFrame >= 520) {
      this.lastTorchFrame = now;
      const flames = this.world?.assets.torchFlames ?? [];
      const intensity = torchFlickerIntensity(now / 1000, true);
      flames.forEach((material, index) => {
        material.emissiveIntensity = intensity * (index ? 0.9 : 1);
      });
      shouldRender = true;
    }
    if (shouldRender && !animation) this.render();
    this.ensureFrameLoop();
  }
  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.resize(width, height);
    this.render();
  }
  render() {
    if (!this.camera || !this.active) return;
    this.renderer.render(this.scene, this.camera.camera);
    this.renderer.domElement.dataset['rendered'] = 'true';
  }
  dispose() {
    this.stopConstruction(false, false);
    this.stopTorchFlicker();
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = 0;
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.visibility);
    this.motionPreference?.removeEventListener('change', this.motionPreferenceChanged);
    this.observer.disconnect();
    this.camera.dispose();
    this.world?.assets.dispose();
    this.ground.geometry.dispose();
    this.ground.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
