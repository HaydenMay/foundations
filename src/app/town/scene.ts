import * as T from 'three';
import { CameraState, Lighting } from '../domain/models';
import { TownCamera } from './camera';
import { lightAt } from './lighting';
import { buildWorld, TownWorld } from './world';
import { AssemblyAnimator } from './assembly';
import type { AssemblyConfigOverride } from './assembly';
import { homeTransition } from './construction';

export class TownScene {
  readonly renderer: T.WebGLRenderer;
  readonly camera: TownCamera;
  private readonly scene = new T.Scene();
  private readonly sun = new T.DirectionalLight('#fff0d5', 2.8);
  private readonly hemi = new T.HemisphereLight('#cad9d4', '#adad91', 1.9);
  private world?: TownWorld;
  private readonly observer: ResizeObserver;
  private readonly ground: T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;
  private lighting: Lighting = 'auto';
  private lightKey = '';
  private readonly timer: ReturnType<typeof setInterval>;
  private active = true;
  private construction?: {
    request: number;
    started: number;
    last: number;
    from: CameraState;
    animator: AssemblyAnimator;
    visibility: boolean[];
    done: () => void;
  };
  private readonly visibility = () => {
    this.active = !document.hidden;
    if (this.active) {
      this.updateLight();
      this.render();
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
    this.camera = new TownCamera(canvas, initial, changed, () => this.render());
    this.setDesigns(designs);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    this.timer = setInterval(() => this.updateLight(), 60000);
    document.addEventListener('visibilitychange', this.visibility);
  }
  setDesigns(designs: Record<string, string>) {
    this.cancelConstruction();
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.assets.dispose();
    }
    this.world = buildWorld(designs);
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.add(this.world.group);
    this.updateLight();
  }
  celebrate(done: () => void, override: AssemblyConfigOverride = {}) {
    this.cancelConstruction();
    const home = this.world?.home,
      assemblies = this.world?.homeAssemblies,
      recipe = this.world?.homeRecipe;
    if (!home || !assemblies || !recipe) {
      this.camera.home();
      this.render();
      done();
      return;
    }
    let animator: AssemblyAnimator;
    try {
      animator = new AssemblyAnimator(home, assemblies, recipe, {
        ...override,
        reducedMotion:
          override.reducedMotion ??
          (typeof matchMedia !== 'undefined' &&
            matchMedia('(prefers-reduced-motion: reduce)').matches),
      });
    } catch (error) {
      console.warn('Home assembly could not start; showing the completed house:', error);
      this.camera.home();
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
      done();
      return;
    }
    const animation = {
      request: 0,
      started: performance.now(),
      last: -100,
      from: this.camera.state(),
      animator,
      visibility: animator.pieces.map((piece) => piece.object.visible),
      done,
    };
    this.construction = animation;
    this.camera.controls.enabled = false;
    if (!animator.play(() => this.completeConstruction(animation))) {
      this.construction = undefined;
      animator.dispose();
      this.camera.controls.enabled = true;
      this.camera.home();
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
      done();
      return;
    }
    if (this.construction !== animation) return;
    const frame = (now: number) => {
      if (this.construction !== animation) return;
      const elapsed = Math.max(0, now - animation.started),
        progress =
          animation.animator.durationMs === 0 ? 1 : elapsed / animation.animator.durationMs;
      animation.animator.update(progress);
      if (this.construction !== animation) return;
      let visibilityChanged = false;
      for (let i = 0; i < animation.animator.pieces.length; i++) {
        const visible = animation.animator.pieces[i].object.visible;
        if (animation.visibility[i] !== visible) {
          animation.visibility[i] = visible;
          visibilityChanged = true;
        }
      }
      const settled = animation.animator.lifecycle === 'completed';
      if (visibilityChanged) this.renderer.shadowMap.needsUpdate = true;
      if (visibilityChanged || settled || now - animation.last >= 1000 / 30) {
        animation.last = now;
        // Shadow maps stay cached; redraw only when a piece is revealed and when the home settles.
        this.camera.set(homeTransition(animation.from, Math.min(1, elapsed / 750)));
        this.render();
      }
      if (settled) return;
      animation.request = requestAnimationFrame(frame);
    };
    animation.request = requestAnimationFrame(frame);
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
    cancelAnimationFrame(animation.request);
    this.construction = undefined;
    animation.animator.dispose();
    this.camera.controls.enabled = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.camera.home();
    this.render();
    animation.done();
  }
  private stopConstruction(resetCamera: boolean, refresh: boolean) {
    const animation = this.construction;
    if (!animation) return;
    cancelAnimationFrame(animation.request);
    this.construction = undefined;
    animation.animator.cancel();
    animation.animator.dispose();
    this.camera.controls.enabled = true;
    if (resetCamera) this.camera.set(animation.from);
    if (refresh) {
      this.renderer.shadowMap.needsUpdate = true;
      this.render();
    }
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
    this.render();
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
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.visibility);
    this.observer.disconnect();
    this.camera.dispose();
    this.world?.assets.dispose();
    this.ground.geometry.dispose();
    this.ground.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
