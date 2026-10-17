import { CameraState } from '../domain/models';
import { MOUSE, OrthographicCamera, TOUCH, Vector3 } from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
const HOME = new Vector3(-5, 1.8, -4.6);
export function homeViewHeight(width: number, height: number): number {
  return Math.max(19, (20.5 * height) / Math.max(1, width));
}
export function clampCamera(state: CameraState): CameraState {
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  return {
    x: clamp(state.x, -18, 18),
    z: clamp(state.z, -18, 18),
    zoom: clamp(state.zoom, 0.5, 2.5),
    angle: ((state.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
  };
}
export class TownCamera {
  readonly camera = new OrthographicCamera(-15, 15, 15, -15, 0.1, 180);
  readonly controls: MapControls;
  private angle = Math.PI / 4;
  private applying = false;
  private readonly keyHandler = (event: KeyboardEvent) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (moves[event.key]) {
      event.preventDefault();
      const [x, z] = moves[event.key];
      const s = this.state();
      this.set({ ...s, x: s.x + x, z: s.z + z });
    } else if (event.key === '+' || event.key === '=') this.zoom(1.15);
    else if (event.key === '-') this.zoom(1 / 1.15);
    else if (event.key.toLowerCase() === 'r') this.rotate();
    else if (event.key === 'Home') this.home();
  };
  constructor(
    private readonly canvas: HTMLCanvasElement,
    initial: CameraState,
    private readonly changed: (s: CameraState) => void,
    private readonly render: () => void,
  ) {
    this.controls = new MapControls(this.camera, canvas);
    this.controls.enableRotate = false;
    this.controls.enableDamping = false;
    this.controls.screenSpacePanning = false;
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 2.5;
    this.controls.mouseButtons = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    this.controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN };
    this.controls.addEventListener('change', () => {
      if (this.applying) return;
      const s = this.state(),
        bounded = clampCamera(s);
      const correction = new Vector3(bounded.x - s.x, 0, bounded.z - s.z);
      this.controls.target.add(correction);
      this.camera.position.add(correction);
      this.render();
      this.changed(bounded);
    });
    canvas.addEventListener('keydown', this.keyHandler);
    this.set(initial);
  }
  state(): CameraState {
    return {
      x: this.controls.target.x - HOME.x,
      z: this.controls.target.z - HOME.z,
      zoom: this.camera.zoom,
      angle: this.angle,
    };
  }
  set(state: CameraState) {
    const s = clampCamera(state);
    this.applying = true;
    this.angle = s.angle;
    this.controls.target.copy(HOME).add(new Vector3(s.x, 0, s.z));
    this.camera.position
      .copy(this.controls.target)
      .add(new Vector3(Math.sin(s.angle) * 34, 28, Math.cos(s.angle) * 34));
    this.camera.zoom = s.zoom;
    this.camera.lookAt(this.controls.target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.applying = false;
    this.render();
    this.changed(s);
  }
  resize(width: number, height: number) {
    const aspect = width / height;
    const viewHeight = homeViewHeight(width, height);
    this.camera.left = (-viewHeight * aspect) / 2;
    this.camera.right = (viewHeight * aspect) / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }
  home() {
    this.set({ x: 0, z: 0, zoom: 1, angle: Math.PI / 4 });
  }
  zoom(factor: number) {
    this.set({ ...this.state(), zoom: this.camera.zoom * factor });
  }
  rotate() {
    this.set({ ...this.state(), angle: this.angle + Math.PI / 4 });
  }
  dispose() {
    this.controls.dispose();
    this.canvas.removeEventListener('keydown', this.keyHandler);
  }
}
