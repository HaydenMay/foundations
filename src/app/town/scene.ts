import * as T from 'three';
import { CameraState, Lighting } from '../domain/models';
import { TownCamera } from './camera';
import { lightAt } from './lighting';
import { buildWorld, TownWorld } from './world';
import { constructionFrame, homeTransition } from './construction';

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
    baseY: number;
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
    this.finishConstruction();
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.assets.dispose();
    }
    this.world = buildWorld(designs);
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.add(this.world.group);
    this.updateLight();
  }
  celebrate(done: () => void) {
    this.finishConstruction();
    const home = this.world?.home;
    if (!home || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.camera.home();
      done();
      return;
    }
    const animation = {
      request: 0,
      started: performance.now(),
      last: -100,
      from: this.camera.state(),
      baseY: home.position.y,
      done,
    };
    this.construction = animation;
    this.camera.controls.enabled = false;
    const frame = (now: number) => {
      if (this.construction !== animation) return;
      const phase = constructionFrame(now - animation.started);
      if (phase.done) {
        this.finishConstruction();
        return;
      }
      animation.request = requestAnimationFrame(frame);
      if (now - animation.last < 1000 / 30) return;
      animation.last = now;
      // Cache shadows during the small reveal; refresh only at visibility changes and settlement.
      const visibilityChanged = home.visible !== phase.visible;
      if (
        !visibilityChanged &&
        home.scale.x === phase.scale &&
        home.position.y === animation.baseY + phase.rise &&
        phase.homeT === 1
      )
        return;
      home.visible = phase.visible;
      home.scale.setScalar(phase.scale);
      home.position.y = animation.baseY + phase.rise;
      if (visibilityChanged) this.renderer.shadowMap.needsUpdate = true;
      this.camera.set(homeTransition(animation.from, phase.homeT));
    };
    animation.request = requestAnimationFrame(frame);
  }
  finishConstruction() {
    this.stopConstruction(true, true);
  }
  private stopConstruction(notify: boolean, resetCamera: boolean) {
    const animation = this.construction;
    if (!animation) return;
    cancelAnimationFrame(animation.request);
    this.construction = undefined;
    const home = this.world?.home;
    if (home) {
      home.visible = true;
      home.scale.setScalar(1);
      home.position.y = animation.baseY;
    }
    this.camera.controls.enabled = true;
    this.renderer.shadowMap.needsUpdate = true;
    if (resetCamera) this.camera.home();
    if (notify) animation.done();
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
