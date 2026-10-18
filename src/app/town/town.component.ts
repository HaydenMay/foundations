import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  input,
  NgZone,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CameraState, Preferences } from '../domain/models';
import { Icon } from '../components/icon';
import type { TownScene } from './scene';
import type { AssemblyConfigOverride } from './assembly';

@Component({
  selector: 'app-town',
  imports: [Icon],
  host: {
    '[attr.data-lighting]': 'lightLabel()',
    '[attr.data-construction]': "building() ? 'active' : 'idle'",
    '[attr.data-home-visible]': "designs()['home'] ? 'true' : 'false'",
  },
  template: ` <div #viewport class="viewport"></div>
    @if (failed()) {
      <div class="render-error">
        <app-icon name="leaf" /><strong>Your progress is safe.</strong>
        <p>
          The town needs WebGL to render. Try a recent browser with graphics acceleration enabled.
          Habits and backups still work.
        </p>
      </div>
    }
    @if (building()) {
      <div class="construction-glow" aria-hidden="true">
        @for (i of [0, 1, 2, 3, 4, 5, 6, 7]; track i) {
          <span [style.--i]="i"></span>
        }
      </div>
    }
    <div class="camera-controls" role="group" aria-label="Town camera">
      <button aria-label="Return to your first home" title="Home" (click)="command('home')">
        <app-icon name="home" /></button
      ><span></span>
      <button
        aria-label="Rotate town clockwise"
        title="Rotate 45 degrees"
        (click)="command('rotate')"
      >
        <app-icon name="rotate" />
      </button>
      <button aria-label="Zoom out" title="Zoom out" (click)="command('out')">
        <app-icon name="minus" />
      </button>
      <button aria-label="Zoom in" title="Zoom in" (click)="command('in')">
        <app-icon name="plus" />
      </button>
    </div>
    <div class="camera-hint">DRAG TO EXPLORE <span>·</span> PINCH TO ZOOM</div>`,
  styles: `
    :host {
      display: block;
      overflow: hidden;
    }
    .viewport {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
    }
    .viewport::after {
      content: '';
      position: absolute;
      inset: 0;
      box-shadow: inset 0 0 130px #ecf0e514;
      pointer-events: none;
    }
    canvas {
      display: block;
      touch-action: none;
    }
    .camera-controls {
      position: absolute;
      bottom: 57px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 5px 8px;
      border: 1px solid #fff9;
      background: #f8faf0e8;
      border-radius: 28px;
      box-shadow: 0 5px 20px #34472f09;
      backdrop-filter: blur(12px);
    }
    .camera-controls button {
      display: grid;
      place-items: center;
      min-width: 43px;
      min-height: 42px;
      border-radius: 50%;
      color: #77846c;
    }
    .camera-controls app-icon {
      width: 18px;
      height: 18px;
    }
    .camera-controls > span {
      height: 18px;
      border-left: 1px solid #d7dfce;
      margin: 0 4px;
    }
    .camera-hint {
      position: absolute;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      font-size: 7px;
      letter-spacing: 1.4px;
      color: #909e85;
      pointer-events: none;
    }
    .camera-hint span {
      margin: 0 8px;
    }
    .construction-glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(ellipse at 50% 52%, #f6d99a38, transparent 55%);
      animation: warmth 2.8s ease-out both;
    }
    .construction-glow span {
      position: absolute;
      left: calc(27% + var(--i) * 6%);
      top: 55%;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #edcf86;
      animation: sprinkle 1.7s 0.5s ease-out both;
      transform: translateY(0);
    }
    @keyframes warmth {
      0%,
      100% {
        opacity: 0;
      }
      25%,
      65% {
        opacity: 1;
      }
    }
    @keyframes sprinkle {
      0% {
        opacity: 0;
        transform: translateY(8px);
      }
      30% {
        opacity: 0.8;
      }
      100% {
        opacity: 0;
        transform: translateY(calc(-20px - var(--i) * 5px));
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .construction-glow {
        display: none;
      }
    }
    .render-error {
      position: absolute;
      inset: 30% 10%;
      text-align: center;
      line-height: 1.6;
      font-size: 12px;
    }
    .render-error strong {
      display: block;
      margin: 10px;
    }
    .render-error app-icon {
      margin: auto;
    }
    @media (max-width: 650px) and (orientation: portrait) {
      .camera-controls {
        bottom: 18px;
        left: 24px;
        transform: none;
        padding: 2px 5px;
      }
      .camera-controls button {
        min-width: 42px;
        min-height: 44px;
      }
      .camera-controls app-icon {
        width: 16px;
        height: 16px;
      }
      .camera-controls > span {
        margin: 0 2px;
      }
      .camera-hint {
        display: none;
      }
    }
    @media (orientation: landscape) and (max-height: 550px) {
      .camera-controls {
        bottom: 15px;
      }
      .camera-hint {
        display: none;
      }
    }
  `,
})
export class TownComponent implements OnDestroy {
  readonly designs = input.required<Record<string, string>>();
  readonly preferences = input.required<Preferences>();
  readonly sessionKey = input(0);
  readonly construction = input(0);
  readonly assemblyOptions = input<AssemblyConfigOverride>({});
  readonly constructionFinished = output<{ id: number; sessionKey: number }>();
  readonly constructionCancelled = output<{ id: number; sessionKey: number }>();
  readonly cameraChange = output<{
    camera: CameraState;
    sessionKey: number;
    position: { x: number; y: number; z: number } | null;
  }>();
  readonly lightChange = output<string>();
  readonly lightLabel = signal('day');
  readonly failed = signal(false);
  readonly building = signal(false);
  readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private scene?: TownScene;
  private lastDesigns = '';
  private lastCamera = '';
  private incomingCamera = '';
  private lastSession = 0;
  private lastConstruction = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private readonly zone: NgZone) {
    afterNextRender(() =>
      this.zone.runOutsideAngular(async () => {
        try {
          const { TownScene } = await import('./scene');
          this.lastCamera = JSON.stringify(this.preferences().camera);
          this.incomingCamera = this.lastCamera;
          this.lastSession = this.sessionKey();
          this.scene = new TownScene(
            this.viewport().nativeElement,
            this.designs(),
            this.preferences().camera,
            (state) => {
              const sessionKey = this.sessionKey();
              this.lastCamera = JSON.stringify(state);
              clearTimeout(this.timer);
              this.timer = setTimeout(
                () =>
                  this.zone.run(() => {
                    if (sessionKey === this.sessionKey()) {
                      const p = this.scene?.camera.camera.position;
                      this.cameraChange.emit({
                        camera: state,
                        sessionKey,
                        position: p ? { x: p.x, y: p.y, z: p.z } : null,
                      });
                    }
                  }),
                200,
              );
            },
            (label) =>
              this.zone.run(() => {
                this.lightLabel.set(label);
                this.lightChange.emit(label);
              }),
          );
          this.lastDesigns = JSON.stringify(this.designs());
          this.scene.setLighting(this.preferences().lighting);
          this.sync(
            this.designs(),
            this.preferences(),
            this.sessionKey(),
            this.construction(),
            this.assemblyOptions(),
          );
        } catch (e) {
          console.warn('Town renderer unavailable:', e);
          this.zone.run(() => this.failed.set(true));
        }
      }),
    );
    effect(() => {
      const designs = this.designs(),
        preferences = this.preferences(),
        assemblyOptions = this.assemblyOptions();
      this.sync(designs, preferences, this.sessionKey(), this.construction(), assemblyOptions);
    });
  }
  private sync(
    designs: Record<string, string>,
    preferences: Preferences,
    sessionKey: number,
    construction: number,
    assemblyOptions: AssemblyConfigOverride,
  ) {
    if (!this.scene) return;
    if (sessionKey !== this.lastSession) {
      clearTimeout(this.timer);
      this.scene.cancelConstruction();
      this.building.set(false);
      this.lastSession = sessionKey;
      this.incomingCamera = '';
      this.lastCamera = '';
      // Consume a request from the previous view instead of replaying it in the new scenario.
      this.lastConstruction = construction;
    }
    const key = JSON.stringify(designs);
    if (this.lastDesigns !== key) {
      if (this.building()) {
        this.scene.cancelConstruction();
        this.building.set(false);
        this.constructionCancelled.emit({ id: this.lastConstruction, sessionKey });
      }
      this.lastDesigns = key;
      this.scene.setDesigns(designs);
    }
    const cameraKey = JSON.stringify(preferences.camera);
    if (cameraKey !== this.incomingCamera) {
      this.incomingCamera = cameraKey;
      if (cameraKey !== this.lastCamera) {
        clearTimeout(this.timer);
        this.lastCamera = cameraKey;
        this.scene.camera.set(preferences.camera);
      }
    }
    this.scene.setLighting(preferences.lighting);
    if (construction && construction !== this.lastConstruction) {
      this.lastConstruction = construction;
      this.building.set(true);
      this.scene.celebrate(
        () =>
          this.zone.run(() => {
            if (this.sessionKey() === sessionKey && this.construction() === construction) {
              this.building.set(false);
              this.constructionFinished.emit({ id: construction, sessionKey });
            }
          }),
        assemblyOptions,
      );
    }
  }
  skipConstruction() {
    this.scene?.finishConstruction();
    this.building.set(false);
  }
  command(command: string) {
    if (this.building()) this.skipConstruction();
    const camera = this.scene?.camera;
    if (!camera) return;
    if (command === 'home') camera.home();
    else if (command === 'rotate') camera.rotate();
    else camera.zoom(command === 'in' ? 1.2 : 1 / 1.2);
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
    this.scene?.dispose();
  }
}
