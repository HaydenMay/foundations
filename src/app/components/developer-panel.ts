import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FoundationsStore } from '../state.service';
import { PROJECTS } from '../domain/progression';
import { Lighting } from '../domain/models';
import { PreviewScenario } from '../domain/preview';
@Component({
  selector: 'app-developer-panel',
  imports: [DecimalPipe],
  template: ` <aside aria-label="Developer Preview controls">
    <button
      class="toggle"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="open() ? 'Collapse preview controls' : 'Expand preview controls'"
      (click)="toggle.emit()"
    >
      <strong>Preview controls</strong><span>{{ open() ? '⌄' : '⌃' }}</span>
    </button>
    @if (open()) {
      <div class="content">
        <p class="intro">
          Disposable working copy. Genuine habits, stars and backups stay untouched.
        </p>
        @if (error()) {
          <p role="alert" class="error">{{ error() }}</p>
        }
        <section>
          <h3>Test scenarios</h3>
          <label for="scenario">Test scenario</label
          ><select id="scenario" [value]="scenario()" (change)="setScenario($event)">
            <option value="">Choose a scenario</option>
            <option value="new">Brand-new player</option>
            <option value="ready">First habit · choose a home</option>
            <option value="home">First home constructed</option>
            <option value="several">Several milestones unlocked</option>
            <option value="all">All current milestones unlocked</option>
          </select>
        </section>
        <section>
          <h3>Progression</h3>
          <label for="sim-stars">Simulated lifetime stars</label>
          <div class="row">
            <input
              #stars
              id="sim-stars"
              type="number"
              min="0"
              max="100000"
              step="1"
              [value]="store.stars()"
            /><button (click)="setStars(stars.value)" aria-label="Apply simulated stars">
              Apply
            </button>
          </div>
          <label for="jump">Jump to milestone</label
          ><select id="jump" (change)="jump($event)">
            <option value="">Choose a milestone</option>
            @for (p of projects; track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
          <button class="wide" (click)="unlockAll()">Unlock all existing milestones</button>
          <div class="two">
            <button (click)="setScenarioValue('new')">Return to empty lot</button
            ><button (click)="setScenarioValue('ready')">Preview first-home unlock</button>
          </div>
          <button class="wide" (click)="reset()">Reset preview to real progress</button>
        </section>
        <section>
          <h3>First house</h3>
          <label for="preview-house">Preview house style</label
          ><select
            id="preview-house"
            [value]="
              store.state().designs['home'] || store.preview()?.hiddenDesigns?.['home'] || 'sage'
            "
            (change)="design('home', $event)"
          >
            @for (c of projects[0].choices; track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }</select
          ><label class="check"
            ><input
              type="checkbox"
              [checked]="!!store.state().designs['home']"
              (change)="visible('home', $event)"
            />Show first house</label
          ><button class="wide" (click)="construct.emit()">Preview construction</button>
        </section>
        <section>
          <h3>Backyard</h3>
          <p class="hint">Locked choices are available only in this disposable preview.</p>
          <label for="preview-yard">Preview backyard</label
          ><select
            id="preview-yard"
            [value]="
              store.state().designs['backyard'] ||
              store.preview()?.hiddenDesigns?.['backyard'] ||
              'pool'
            "
            (change)="design('backyard', $event)"
          >
            @for (c of projects[1].choices; track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }</select
          ><label class="check"
            ><input
              type="checkbox"
              [checked]="!!store.state().designs['backyard']"
              (change)="visible('backyard', $event)"
            />Show backyard project</label
          >
        </section>
        <section>
          <h3>Lighting</h3>
          <label for="preview-light">Preview lighting</label
          ><select
            id="preview-light"
            [value]="store.state().preferences.lighting"
            (change)="lighting($event)"
          >
            <option value="auto">Automatic local time</option>
            <option value="sunrise">Morning</option>
            <option value="day">Afternoon</option>
            <option value="sunset">Sunset</option>
            <option value="night">Night</option>
          </select>
        </section>
        <section>
          <h3>Camera</h3>
          <output aria-label="Preview camera position">
            @if (position(); as p) {
              Position X {{ p.x | number: '1.1-1' }} · Y {{ p.y | number: '1.1-1' }} · Z
              {{ p.z | number: '1.1-1' }}
            }
            <br />Zoom {{ store.state().preferences.camera.zoom | number: '1.2-2' }} · Rotation
            {{ (store.state().preferences.camera.angle * 180) / pi | number: '1.0-0' }}°</output
          ><button class="wide" (click)="home.emit()">Reset preview camera</button>
        </section>
      </div>
    }
  </aside>`,
  styleUrl: './developer-panel.css',
})
export class DeveloperPanel {
  readonly store = inject(FoundationsStore);
  readonly projects = PROJECTS;
  readonly pi = Math.PI;
  readonly open = input(true);
  readonly position = input<{ x: number; y: number; z: number } | null>(null);
  readonly toggle = output<void>();
  readonly construct = output<void>();
  readonly home = output<void>();
  readonly error = signal('');
  readonly scenario = signal('');
  private run(action: () => void) {
    try {
      this.error.set('');
      action();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  private value(e: Event) {
    return (e.target as HTMLSelectElement).value;
  }
  setScenario(e: Event) {
    this.setScenarioValue(this.value(e) as PreviewScenario);
  }
  setScenarioValue(value: PreviewScenario) {
    this.run(() => {
      this.store.previewScenario(value);
      this.scenario.set(value);
    });
  }
  setStars(value: string) {
    this.run(() => this.store.previewStars(Number(value)));
  }
  jump(e: Event) {
    const value = this.value(e);
    if (value) this.run(() => this.store.previewJump(value));
  }
  unlockAll() {
    this.run(() => this.store.previewScenario('all'));
  }
  reset() {
    this.run(() => {
      this.store.resetPreview();
      this.scenario.set('');
    });
  }
  design(project: string, e: Event) {
    this.run(() => this.store.previewDesign(project, this.value(e)));
  }
  visible(project: 'home' | 'backyard', e: Event) {
    this.run(() => this.store.previewVisible(project, (e.target as HTMLInputElement).checked));
  }
  lighting(e: Event) {
    this.store
      .preferences({ lighting: this.value(e) as Lighting })
      .catch((e) => this.error.set(e.message));
  }
}
