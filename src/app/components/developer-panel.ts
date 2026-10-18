import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FoundationsStore } from '../state.service';
import { PROJECTS } from '../domain/progression';
import { Lighting } from '../domain/models';
import { PreviewScenario } from '../domain/preview';
import type { AssemblyConfigOverride } from '../town/assembly';
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
          <label class="check"
            ><input
              type="checkbox"
              data-preview-visible="chapter"
              [checked]="
                store.stars() >= 100 &&
                store.preview()?.hiddenDesigns?.['chapter'] !== '__hidden__' &&
                !store.state().designs['neighbor']
              "
              [disabled]="store.stars() < 100 || !!store.state().designs['neighbor']"
              (change)="visible('chapter', $event)"
            />Show the 100-star empty next lot</label
          >
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
            @for (c of homeProject.choices; track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }</select
          ><label class="check"
            ><input
              type="checkbox"
              [checked]="!!store.state().designs['home']"
              (change)="visible('home', $event)"
            />Show first house</label
          ><label for="assembly-speed">Assembly speed</label
          ><select
            id="assembly-speed"
            [value]="assemblySpeed()"
            (change)="setAssemblySpeed($event)"
          >
            <option value="0.5">Slow · ½×</option>
            <option value="1">Natural · 1×</option>
            <option value="2">Quick · 2×</option>
          </select>
          <label class="check"
            ><input
              id="force-reduced-motion"
              type="checkbox"
              [checked]="forceReducedMotion()"
              (change)="setForceReducedMotion($event)"
            />Force reduced motion</label
          ><button class="wide" (click)="previewConstruction()">Preview construction</button>
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
            @for (c of backyardProject.choices; track c.id) {
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
          <h3>Other home milestones</h3>
          <p class="hint">Try every composition without changing the genuine town.</p>
          @for (p of otherProjects; track p.id) {
            <details class="project-preview">
              <summary>{{ p.name }}</summary>
              <label [attr.for]="'preview-' + p.id">Preview {{ p.name }}</label>
              <select
                [id]="'preview-' + p.id"
                [attr.data-preview-project]="p.id"
                [value]="
                  store.state().designs[p.id] ||
                  store.preview()?.hiddenDesigns?.[p.id] ||
                  p.choices[0].id
                "
                (change)="design(p.id, $event)"
              >
                @for (c of p.choices; track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              <label class="check"
                ><input
                  type="checkbox"
                  [attr.data-preview-visible]="p.id"
                  [checked]="!!store.state().designs[p.id]"
                  (change)="visible(p.id, $event)"
                />Show {{ p.name }}</label
              >
            </details>
          }
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
  readonly homeProject = PROJECTS.find((project) => project.id === 'home')!;
  readonly backyardProject = PROJECTS.find((project) => project.id === 'backyard')!;
  readonly otherProjects = PROJECTS.filter(
    (project) => project.id !== 'home' && project.id !== 'backyard',
  );
  readonly pi = Math.PI;
  readonly open = input(true);
  readonly position = input<{ x: number; y: number; z: number } | null>(null);
  readonly toggle = output<void>();
  readonly construct = output<AssemblyConfigOverride>();
  readonly home = output<void>();
  readonly error = signal('');
  readonly scenario = signal('');
  readonly assemblySpeed = signal(1);
  readonly forceReducedMotion = signal(false);
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
  visible(project: string, e: Event) {
    this.run(() => this.store.previewVisible(project, (e.target as HTMLInputElement).checked));
  }
  lighting(e: Event) {
    this.store
      .preferences({ lighting: this.value(e) as Lighting })
      .catch((e) => this.error.set(e.message));
  }
  setAssemblySpeed(e: Event) {
    const speed = Number(this.value(e));
    if ([0.5, 1, 2].includes(speed)) this.assemblySpeed.set(speed);
  }
  setForceReducedMotion(e: Event) {
    this.forceReducedMotion.set((e.target as HTMLInputElement).checked);
  }
  previewConstruction() {
    const override: AssemblyConfigOverride = { speed: this.assemblySpeed() };
    if (this.forceReducedMotion()) override.reducedMotion = true;
    this.construct.emit(override);
  }
}
