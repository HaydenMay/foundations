import * as T from 'three';
import { CameraState, Lighting } from '../domain/models';
import { TownCamera } from './camera';
import { lightAt } from './lighting';
import { buildWorld, TownWorld } from './world';

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
  private readonly timer: ReturnType<typeof setInterval>;
  private active = true;
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
    this.sun.shadow.normalBias = 0.035;
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
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.assets.dispose();
    }
    this.world = buildWorld(designs);
    this.scene.add(this.world.group);
    this.updateLight();
  }
  setLighting(value: Lighting) {
    this.lighting = value;
    this.updateLight();
  }
  private updateLight() {
    const now = new Date(),
      palette = lightAt(this.lighting, now.getHours() + now.getMinutes() / 60);
    this.sun.color.set(palette.sun);
    this.sun.intensity = palette.sunPower;
    this.hemi.color.set(palette.ambient);
    this.hemi.intensity = palette.ambientPower;
    this.ground.material.color.set(palette.sky);
    this.container.style.background = palette.sky;
    const evening = palette.label === 'sunset' || palette.label === 'night';
    this.sun.position.set(evening ? 20 : -14, palette.label === 'day' ? 25 : 14, 18);
    this.world?.assets.windows.forEach((m) => {
      m.emissiveIntensity = palette.windows * 1.8;
    });
    this.world?.assets.lamps.forEach((l) => {
      l.intensity = palette.windows * 5;
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
