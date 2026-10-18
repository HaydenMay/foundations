import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FoundationsStore } from './state.service';
import { HabitEditor } from './components/habit-editor';
import { Icon } from './components/icon';
import { TownComponent } from './town/town.component';
import { AppState, Habit, HabitInput, Lighting, Project, CameraState } from './domain/models';
import { isCompleted, isScheduled, scheduleLabel, STAR_VALUES } from './domain/habits';
import { PROJECTS, isProjectUnlocked } from './domain/progression';
import { importState } from './domain/state';
import { HomeSelection } from './components/home-selection';
import { DeveloperPanel } from './components/developer-panel';
import type { AssemblyConfigOverride } from './town/assembly';

@Component({
  selector: 'app-root',
  imports: [Icon, HabitEditor, TownComponent, DatePipe, HomeSelection, DeveloperPanel],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly store = inject(FoundationsStore);
  readonly town = viewChild(TownComponent);
  readonly choosingHome = signal(false);
  readonly firstSelection = signal(false);
  readonly draftHome = signal('sage');
  readonly previewPanelOpen = signal(true);
  readonly construction = signal(0);
  readonly previewAssemblyOptions = signal<AssemblyConfigOverride>({});
  readonly cameraPosition = signal<{ x: number; y: number; z: number } | null>(null);
  readonly renderDesigns = computed(() =>
    this.choosingHome()
      ? { ...this.store.state().designs, home: this.draftHome() }
      : this.store.state().designs,
  );
  private constructionId = 0;
  private offeredSession = -1;
  private constructionSession = 0;
  readonly sceneLight = signal('day');
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly overlay = signal('');
  readonly toast = signal('');
  readonly error = signal('');
  readonly editing = signal<Habit | undefined>(undefined);
  readonly selectedProject = signal<Project>(PROJECTS[0]);
  readonly backup = signal<AppState | null>(null);
  readonly busy = signal(false);
  readonly projects = PROJECTS;
  readonly values = STAR_VALUES;
  readonly scheduleLabel = scheduleLabel;
  readonly due = computed(() =>
    this.store.state().habits.filter((h) => isScheduled(h, this.store.today())),
  );
  readonly scheduledTomorrow = computed(
    () =>
      this.store
        .state()
        .habits.filter((h) => !h.archived && h.active && h.eligibleOn > this.store.today()).length,
  );
  readonly history = computed(() => [...this.store.state().completions].reverse());
  readonly title = computed(
    () =>
      ({
        projects: 'Your growing town',
        settings: 'Make yourself at home',
        manage: 'Your habits',
        history: 'Every step, remembered',
        habit: this.editing() ? 'Make it your own' : 'Plant a new habit',
        choice: this.selectedProject().name,
        'preview-entry': 'A disposable town to explore',
      })[this.overlay()] || 'Foundations',
  );
  private toastTimer?: ReturnType<typeof setTimeout>;
  constructor() {
    effect(() => {
      const state = this.store.state(),
        session = this.store.sessionKey();
      untracked(() => {
        if (this.constructionSession !== session) {
          this.constructionSession = session;
          this.construction.set(0);
        }
        // A constructed home has already been offered in this session, including preview hides.
        if (state.designs['home']) this.offeredSession = session;
        if (this.firstSelection() && state.designs['home']) this.choosingHome.set(false);
        if (
          state.onboarding.firstHomeUnlocked &&
          !state.designs['home'] &&
          this.offeredSession !== session
        ) {
          this.offeredSession = session;
          this.openHomeSelection();
        }
      });
    });
  }
  cameraChanged(event: {
    camera: CameraState;
    sessionKey: number;
    position?: { x: number; y: number; z: number } | null;
  }) {
    if (event.sessionKey !== this.store.sessionKey()) return;
    this.cameraPosition.set(event.position || null);
    this.store.preferences({ camera: event.camera }).catch((e) => {
      if (event.sessionKey === this.store.sessionKey()) this.error.set((e as Error).message);
    });
  }
  done(habit: Habit) {
    return isCompleted(this.store.state(), habit, this.store.today());
  }
  show(kind: string) {
    this.error.set('');
    this.overlay.set(kind);
    if (!this.dialog().nativeElement.open) this.dialog().nativeElement.showModal();
  }
  close() {
    this.dialog().nativeElement.close();
    this.overlay.set('');
    this.backup.set(null);
  }
  backdrop(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) this.close();
  }
  add() {
    this.editing.set(undefined);
    this.show('habit');
  }
  edit(h: Habit) {
    this.editing.set(h);
    this.show('habit');
  }
  choose(p: Project) {
    if (p.id === 'home') {
      this.close();
      this.openHomeSelection();
      return;
    }
    this.selectedProject.set(p);
    this.show('choice');
  }
  unlocked(p: Project) {
    return !!this.store.preview() || isProjectUnlocked(this.store.state(), p, this.store.stars());
  }
  selection(p: Project) {
    return p.choices.find((c) => c.id === this.store.state().designs[p.id]);
  }
  notify(message: string) {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(''), 4500);
  }
  async act(action: () => Promise<unknown>, after?: () => void) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const session = this.store.sessionKey();
    try {
      await action();
      if (session === this.store.sessionKey()) after?.();
    } catch (e) {
      if (session === this.store.sessionKey()) this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  openHomeSelection() {
    this.firstSelection.set(!this.store.state().designs['home']);
    this.draftHome.set(this.store.state().designs['home'] || 'sage');
    this.choosingHome.set(true);
  }
  cancelHome() {
    this.choosingHome.set(false);
    this.firstSelection.set(false);
  }
  confirmHome() {
    this.act(async () => {
      const session = this.store.sessionKey();
      const first = await this.store.design('home', this.draftHome());
      if (session !== this.store.sessionKey()) return;
      this.cancelHome();
      if (first) this.construction.set(++this.constructionId);
      else this.notify('Your home, your way. Style saved.');
    });
  }
  constructionFinished(event: { id: number; sessionKey: number }) {
    if (event.id !== this.construction() || event.sessionKey !== this.store.sessionKey()) return;
    this.construction.set(0);
    this.notify(
      this.store.preview()
        ? 'Construction preview complete.'
        : 'A home, built by your first healthy step.',
    );
  }
  constructionCancelled(event: { id: number; sessionKey: number }) {
    if (event.id === this.construction() && event.sessionKey === this.store.sessionKey())
      this.construction.set(0);
  }
  skipConstruction() {
    this.town()?.skipConstruction();
    this.construction.set(0);
  }
  enterPreview() {
    this.close();
    this.cancelHome();
    this.construction.set(0);
    this.previewAssemblyOptions.set({});
    this.store.enterPreview();
    this.previewPanelOpen.set(true);
  }
  exitPreview() {
    this.close();
    this.cancelHome();
    this.construction.set(0);
    this.previewAssemblyOptions.set({});
    this.store.exitPreview();
  }
  previewConstruction(options: AssemblyConfigOverride = {}) {
    if (!this.store.preview()) return;
    this.previewAssemblyOptions.set(options);
    this.cancelHome();
    this.store.previewVisible('home', true);
    this.construction.set(++this.constructionId);
  }
  showPreviewControls() {
    this.cancelHome();
    this.previewPanelOpen.set(true);
  }
  exportUpgradeBackup(version: 1 | 2 = 1) {
    this.act(async () => this.store.exportMigrationBackup(version));
  }
  complete(h: Habit) {
    this.act(async () => {
      const stars = await this.store.complete(h.id);
      this.notify(
        stars
          ? `A little step forward. +${stars} ${stars === 1 ? 'star' : 'stars'}`
          : 'Habit recorded. Your daily stars are full.',
      );
    });
  }
  saveHabit(input: HabitInput) {
    this.act(
      () => this.store.saveHabit(input, this.editing()?.id),
      () => {
        this.close();
        this.notify(
          this.editing()
            ? 'Habit updated. Your history stays with you.'
            : 'A new beginning. Your habit will be ready tomorrow.',
        );
      },
    );
  }
  archive(h: Habit) {
    this.act(() => this.store.archive(h.id));
  }
  togglePanel() {
    this.act(() =>
      this.store.preferences({ panelOpen: !this.store.state().preferences.panelOpen }),
    );
  }
  lighting(event: Event) {
    this.act(() =>
      this.store.preferences({ lighting: (event.target as HTMLSelectElement).value as Lighting }),
    );
  }
  select(choice: string) {
    this.act(
      () => this.store.design(this.selectedProject().id, choice),
      () => {
        this.show('projects');
        this.notify('A little more you. Design saved.');
      },
    );
  }
  async importFile(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    this.error.set('');
    this.backup.set(null);
    try {
      if (file.size > 5_000_000) throw new Error('That backup is too large (maximum 5 MB).');
      this.backup.set(importState(await file.text()));
    } catch (e) {
      this.error.set(`Could not import this backup. ${(e as Error).message}`);
    }
    input.value = '';
  }
  restore() {
    const b = this.backup();
    if (b)
      this.act(
        () => this.store.restore(b),
        () => {
          this.close();
          this.notify('Your Foundations backup is restored.');
        },
      );
  }
}
