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

@Component({
  selector: 'app-town',
  imports: [Icon],
  host: { '[attr.data-lighting]': 'lightLabel()' },
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
  readonly cameraChange = output<CameraState>();
  readonly lightChange = output<string>();
  readonly lightLabel = signal('day');
  readonly failed = signal(false);
  readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private scene?: TownScene;
  private lastDesigns = '';
  private lastCamera = '';
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private readonly zone: NgZone) {
    afterNextRender(() =>
      this.zone.runOutsideAngular(async () => {
        try {
          const { TownScene } = await import('./scene');
          this.lastCamera = JSON.stringify(this.preferences().camera);
          this.scene = new TownScene(
            this.viewport().nativeElement,
            this.designs(),
            this.preferences().camera,
            (state) => {
              this.lastCamera = JSON.stringify(state);
              clearTimeout(this.timer);
              this.timer = setTimeout(
                () => this.zone.run(() => this.cameraChange.emit(state)),
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
        } catch (e) {
          console.warn('Town renderer unavailable:', e);
          this.zone.run(() => this.failed.set(true));
        }
      }),
    );
    effect(() => {
      const designs = this.designs(),
        preferences = this.preferences();
      if (!this.scene) return;
      const key = JSON.stringify(designs);
      if (this.lastDesigns !== key) {
        this.lastDesigns = key;
        this.scene.setDesigns(designs);
      }
      const cameraKey = JSON.stringify(preferences.camera);
      if (cameraKey !== this.lastCamera) {
        this.lastCamera = cameraKey;
        this.scene.camera.set(preferences.camera);
      }
      this.scene.setLighting(preferences.lighting);
    });
  }
  command(command: string) {
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
