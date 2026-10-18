import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FoundationsStore } from '../state.service';
import { ALL_PROJECTS, CHAPTER_TWO_PROJECTS, PROJECTS } from '../domain/progression';
import { Lighting } from '../domain/models';
import { PreviewScenario } from '../domain/preview';
import type { AssemblyConfigOverride } from '../town/assembly';

export interface ConstructionPreviewRequest {
  projectId: string;
  override: AssemblyConfigOverride;
}

type PreviewTab = 'chapter1' | 'chapter2' | 'shared';

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
        <nav class="chapter-tabs" aria-label="Preview chapter">
          <button
            [class.active]="tab() === 'chapter1'"
            [attr.aria-pressed]="tab() === 'chapter1'"
            (click)="selectTab('chapter1')"
          >
            Chapter 1
          </button>
          <button
            [class.active]="tab() === 'chapter2'"
            [attr.aria-pressed]="tab() === 'chapter2'"
            (click)="selectTab('chapter2')"
          >
            Chapter 2
          </button>
          <button
            [class.active]="tab() === 'shared'"
            [attr.aria-pressed]="tab() === 'shared'"
            (click)="selectTab('shared')"
          >
            Shared
          </button>
        </nav>
        @if (tab() === 'chapter1') {
          <section>
            <h3>Chapter 1 · Your First Home</h3>
            <label for="scenario">Test scenario</label
            ><select id="scenario" [value]="scenario()" (change)="setScenario($event)">
              <option value="">Choose a scenario</option>
              <option value="new">Brand-new player · empty lot</option>
              <option value="ready">First habit · choose a home</option>
              <option value="home">First home constructed</option>
              <option value="several">Several home milestones unlocked</option>
            </select>
            <div class="two">
              <button (click)="setScenarioValue('new')">Return to empty lot</button
              ><button (click)="setScenarioValue('ready')">Preview first-home unlock</button>
            </div>
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
            ><button
              class="wide build-preview"
              data-build-preview="home"
              (click)="buildPreview('home')"
            >
              ▶ Build Preview
            </button>
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
            ><button
              class="wide build-preview"
              data-build-preview="backyard"
              (click)="buildPreview('backyard')"
            >
              ▶ Build Preview
            </button>
          </section>
          <section>
            <h3>Home milestones</h3>
            <p class="hint">Try each appearance without changing the genuine town.</p>
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
                <button
                  class="wide build-preview"
                  [attr.data-build-preview]="p.id"
                  [attr.aria-label]="'Build preview: ' + p.name"
                  (click)="buildPreview(p.id)"
                >
                  ▶ Build Preview
                </button>
              </details>
            }
          </section>
        }
        @if (tab() === 'chapter2') {
          <section>
            <h3>Chapter 2 · Welcome to the Neighborhood</h3>
            <label for="chapter-two-scenario">Test scenario</label
            ><select id="chapter-two-scenario" [value]="scenario()" (change)="setScenario($event)">
              <option value="">Choose a neighborhood state</option>
              <option value="neighborhood">100 stars · road and reserved lots</option>
              <option value="chapter-two">150 stars · growing neighborhood</option>
              <option value="complete">200 stars · Chapter 2 complete</option>
            </select>
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
              />
              <button (click)="setStars(stars.value)" aria-label="Apply simulated stars">
                Apply
              </button>
            </div>
            <label for="jump">Jump to Chapter 2 milestone</label
            ><select id="jump" (change)="jump($event)">
              <option value="">Choose a milestone</option>
              <option value="ch2-neighborhood">Chapter 2 · Continuous road</option>
              @for (p of chapterTwoProjects; track p.id) {
                <option [value]="p.id">{{ p.name }} · {{ p.threshold }} stars</option>
              }
              <option value="ch2-complete">Chapter 2 · Complete</option>
            </select>
            <button class="wide" (click)="unlockAll()">Unlock all current milestones</button>
            <div class="two">
              <button (click)="replayNotice('neighborhood')">Replay Chapter 2 welcome</button>
              <button (click)="replayNotice('complete')">Replay Chapter 2 completion</button>
            </div>
            <label class="check"
              ><input
                type="checkbox"
                data-preview-visible="ch2-neighborhood"
                [checked]="roadVisible()"
                [disabled]="store.stars() < 100"
                (change)="visible('ch2-neighborhood', $event)"
              />Show continuous road and reserved lots</label
            >
            <button
              class="wide build-preview"
              data-build-preview="ch2-neighborhood"
              (click)="buildPreview('ch2-neighborhood')"
            >
              ▶ Preview neighborhood reveal
            </button>
          </section>
          <section>
            <h3>Universal plot proof</h3>
            <p class="hint">
              A disposable Chapter 1-built neighbor beside your home, using the shared house assets
              and assembly recipe.
            </p>
            <button
              class="wide"
              data-framework-proof-toggle
              [attr.aria-pressed]="frameworkProofActive()"
              (click)="frameworkProofChange.emit(!frameworkProofActive())"
            >
              {{
                frameworkProofActive()
                  ? 'Restore original neighbor'
                  : 'Preview Chapter 1-built neighbor'
              }}
            </button>
            @if (frameworkProofActive()) {
              <button
                class="wide build-preview"
                data-build-preview="framework-proof-neighbor"
                (click)="buildPreview('framework-proof-neighbor')"
              >
                ▶ Preview staged construction
              </button>
            }
          </section>
          <section>
            <h3>Neighborhood homes and shared places</h3>
            <p class="hint">
              Each neighbor has three styles. Selection stays free in the real town.
            </p>
            @for (p of chapterTwoProjects; track p.id) {
              <details class="project-preview">
                <summary>
                  {{ p.name }} <span>{{ p.threshold }} ★</span>
                </summary>
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
                <button
                  class="wide build-preview"
                  [attr.data-build-preview]="p.id"
                  [attr.aria-label]="'Build preview: ' + p.name"
                  (click)="buildPreview(p.id)"
                >
                  ▶ Build Preview
                </button>
              </details>
            }
          </section>
        }
        @if (tab() === 'shared') {
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
            <h3>Camera and construction</h3>
            <label for="assembly-speed">Assembly speed</label>
            <select
              id="assembly-speed"
              [value]="assemblySpeed()"
              (change)="setAssemblySpeed($event)"
            >
              <option value="0.25">Very slow · ¼×</option>
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
            >
            <output aria-label="Preview camera position">
              @if (position(); as p) {
                Position X {{ p.x | number: '1.1-1' }} · Y {{ p.y | number: '1.1-1' }} · Z
                {{ p.z | number: '1.1-1' }}
              }
              <br />Zoom {{ store.state().preferences.camera.zoom | number: '1.2-2' }} · Rotation
              {{ (store.state().preferences.camera.angle * 180) / pi | number: '1.0-0' }}°
            </output>
            <button class="wide" (click)="home.emit()">Reset preview camera</button>
            <button class="wide" (click)="reset()">Reset preview to real progress</button>
          </section>
        }
      </div>
    }
  </aside>`,
  styleUrl: './developer-panel.css',
})
export class DeveloperPanel {
  readonly store = inject(FoundationsStore);
  readonly projects = ALL_PROJECTS;
  readonly chapterTwoProjects = CHAPTER_TWO_PROJECTS;
  readonly homeProject = PROJECTS.find((project) => project.id === 'home')!;
  readonly backyardProject = PROJECTS.find((project) => project.id === 'backyard')!;
  readonly otherProjects = PROJECTS.filter(
    (project) => project.id !== 'home' && project.id !== 'backyard',
  );
  readonly pi = Math.PI;
  readonly open = input(true);
  readonly position = input<{ x: number; y: number; z: number } | null>(null);
  readonly frameworkProofActive = input(false);
  readonly toggle = output<void>();
  readonly construct = output<ConstructionPreviewRequest>();
  readonly home = output<void>();
  readonly frameworkProofChange = output<boolean>();
  readonly error = signal('');
  readonly scenario = signal('');
  readonly tab = signal<PreviewTab>('chapter1');
  readonly assemblySpeed = signal(1);
  readonly forceReducedMotion = signal(false);
  readonly roadVisible = () =>
    this.store.stars() >= 100 &&
    this.store.preview()?.hiddenDesigns?.['ch2-neighborhood'] !== '__hidden__';

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
  selectTab(tab: PreviewTab) {
    this.tab.set(tab);
  }
  setScenario(e: Event) {
    const value = this.value(e);
    if (value) this.setScenarioValue(value as PreviewScenario);
    else this.scenario.set('');
  }
  setScenarioValue(value: PreviewScenario) {
    this.run(() => {
      this.store.previewScenario(value);
      this.scenario.set(value);
    });
  }
  replayNotice(notice: 'neighborhood' | 'complete') {
    const scenario: PreviewScenario = notice === 'neighborhood' ? 'neighborhood' : 'complete';
    this.run(() => {
      this.store.previewScenario(scenario);
      this.store.previewChapterNotice(notice);
      this.scenario.set(scenario);
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
    this.setScenarioValue('all');
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
    if ([0.25, 0.5, 1, 2].includes(speed)) this.assemblySpeed.set(speed);
  }
  setForceReducedMotion(e: Event) {
    this.forceReducedMotion.set((e.target as HTMLInputElement).checked);
  }
  buildPreview(projectId: string) {
    const override: AssemblyConfigOverride = { speed: this.assemblySpeed() };
    if (this.forceReducedMotion()) override.reducedMotion = true;
    this.construct.emit({ projectId, override });
  }
}
