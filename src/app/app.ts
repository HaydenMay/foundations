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
import {
  ALL_PROJECTS,
  CHAPTER_TWO_PROJECTS,
  PROJECTS,
  isProjectUnlocked,
} from './domain/progression';
import { importState } from './domain/state';
import { HomeSelection } from './components/home-selection';
import { ConstructionPreviewRequest, DeveloperPanel } from './components/developer-panel';
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
  readonly previewingProject = signal(false);
  readonly draftHome = signal('sage');
  readonly draftProjects = signal<Record<string, string>>({});
  readonly previewPanelOpen = signal(true);
  readonly construction = signal(0);
  readonly constructionProject = signal('home');
  readonly previewAssemblyOptions = signal<AssemblyConfigOverride>({});
  readonly cameraPosition = signal<{ x: number; y: number; z: number } | null>(null);
  readonly renderDesigns = computed(() => {
    const designs = { ...this.store.state().designs, ...this.draftProjects() };
    if (this.choosingHome()) designs['home'] = this.draftHome();
    const neighborhoodHidden =
      this.store.preview()?.hiddenDesigns['ch2-neighborhood'] === '__hidden__';
    if (this.store.stars() >= 100 && !neighborhoodHidden) designs['ch2-neighborhood'] = 'reveal';
    else delete designs['ch2-neighborhood'];
    return designs;
  });
  private constructionId = 0;
  private offeredSession = -1;
  private constructionSession = 0;
  private draftSession = -1;
  private startedNoticeKey = '';
  readonly sceneLight = signal('day');
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly overlay = signal('');
  readonly toast = signal('');
  readonly error = signal('');
  readonly editing = signal<Habit | undefined>(undefined);
  readonly selectedProject = signal<Project>(PROJECTS[0]);
  readonly backup = signal<AppState | null>(null);
  readonly busy = signal(false);
  readonly projects = ALL_PROJECTS;
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
        session = this.store.sessionKey(),
        previewActive = !!this.store.preview();
      untracked(() => {
        if (this.constructionSession !== session) {
          this.constructionSession = session;
          this.construction.set(0);
        }
        if (this.draftSession !== session) {
          this.draftSession = session;
          this.draftProjects.set({});
        }
        const notice = this.store.chapterNotice();
        if (notice === 'neighborhood') {
          const noticeKey = `${session}:${previewActive ? 'preview' : 'real'}:${notice}`;
          if (this.startedNoticeKey !== noticeKey) {
            this.startedNoticeKey = noticeKey;
            this.constructionProject.set('ch2-neighborhood');
            this.construction.set(++this.constructionId);
          }
        } else if (!notice) {
          this.startedNoticeKey = '';
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
    const dialog = this.dialog().nativeElement;
    if (!dialog.open && typeof dialog.showModal === 'function') dialog.showModal();
  }
  close() {
    if (this.previewingProject()) this.town()?.restoreProjectPreviewCamera();
    this.clearProjectDraft();
    this.previewingProject.set(false);
    const dialog = this.dialog().nativeElement;
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
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
    if (this.previewingProject()) this.town()?.restoreProjectPreviewCamera();
    this.clearProjectDraft();
    this.previewingProject.set(false);
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
      if (first) {
        this.constructionProject.set('home');
        this.construction.set(++this.constructionId);
      } else this.notify('Your home, your way. Style saved.');
    });
  }
  private clearProjectDraft(projectId = this.selectedProject().id) {
    this.draftProjects.update((drafts) => {
      if (!(projectId in drafts)) return drafts;
      const next = { ...drafts };
      delete next[projectId];
      return next;
    });
  }
  cancelProject() {
    const wasViewing = this.previewingProject();
    if (wasViewing) this.town()?.restoreProjectPreviewCamera();
    this.previewingProject.set(false);
    this.clearProjectDraft();
    if (wasViewing) this.notify('Preview closed. Your saved design is unchanged.');
    else this.show('projects');
  }
  viewProjectPreview() {
    if (!this.draftProjects()[this.selectedProject().id]) return;
    const dialog = this.dialog().nativeElement;
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    this.overlay.set('');
    this.previewingProject.set(true);
    this.town()?.focusProjectPreview(this.selectedProject().id);
  }
  confirmProject(): Promise<void> {
    const project = this.selectedProject(),
      choice = this.draftProjects()[project.id];
    if (!choice || this.busy()) return Promise.resolve();
    return this.act(
      () => this.store.design(project.id, choice),
      () => {
        this.clearProjectDraft(project.id);
        this.previewingProject.set(false);
        this.constructionProject.set(project.id);
        this.close();
        this.construction.set(++this.constructionId);
      },
    );
  }
  constructionFinished(event: { id: number; sessionKey: number }) {
    if (event.id !== this.construction() || event.sessionKey !== this.store.sessionKey()) return;
    this.construction.set(0);
    const project = this.constructionProject();
    if (project === 'ch2-neighborhood' && this.store.chapterNotice() === 'neighborhood')
      this.act(() => this.store.acknowledgeChapterNotice('neighborhood'));
    this.notify(
      this.store.preview()
        ? 'Construction preview complete.'
        : project === 'home'
          ? 'A home, built by your first healthy step.'
          : project === 'chapter'
            ? 'Your next little lot is ready for the future.'
            : 'A new piece of your home is ready.',
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
  dismissChapterNotice() {
    const notice = this.store.chapterNotice();
    if (notice) this.act(() => this.store.acknowledgeChapterNotice(notice));
  }
  skipChapterNotice() {
    const notice = this.store.chapterNotice();
    if (!notice) return;
    if (notice === 'neighborhood') {
      this.town()?.skipConstruction();
      this.construction.set(0);
    }
    this.act(() => this.store.acknowledgeChapterNotice(notice));
  }
  enterPreview() {
    this.close();
    this.cancelHome();
    this.draftProjects.set({});
    this.construction.set(0);
    this.previewAssemblyOptions.set({});
    this.store.enterPreview();
    this.previewPanelOpen.set(true);
  }
  exitPreview() {
    this.close();
    this.cancelHome();
    this.draftProjects.set({});
    this.construction.set(0);
    this.previewAssemblyOptions.set({});
    this.store.exitPreview();
  }
  previewConstruction(request: ConstructionPreviewRequest) {
    if (!this.store.preview()) return;
    this.previewAssemblyOptions.set(request.override);
    this.cancelHome();
    this.store.previewVisible('home', true);
    if (request.projectId === 'chapter') {
      this.store.previewStars(Math.max(100, this.store.stars()));
      this.store.previewVisible('chapter', true);
    } else if (request.projectId === 'ch2-neighborhood') {
      this.store.previewStars(Math.max(100, this.store.stars()));
      void this.store.acknowledgeChapterNotice('neighborhood');
      this.store.previewVisible('ch2-neighborhood', true);
    } else if (CHAPTER_TWO_PROJECTS.some((project) => project.id === request.projectId)) {
      const project = CHAPTER_TWO_PROJECTS.find((candidate) => candidate.id === request.projectId)!;
      this.store.previewStars(Math.max(100, project.threshold, this.store.stars()));
      void this.store.acknowledgeChapterNotice('neighborhood');
      this.store.previewVisible('ch2-neighborhood', true);
      this.store.previewVisible(request.projectId, true);
    } else {
      this.store.previewVisible(request.projectId, true);
    }
    this.constructionProject.set(request.projectId);
    this.construction.set(++this.constructionId);
  }
  showPreviewControls() {
    this.cancelHome();
    this.previewPanelOpen.set(true);
  }
  exportUpgradeBackup(version: 1 | 2 | 3 = 1) {
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
    const project = this.selectedProject(),
      current = this.store.state().designs[project.id];
    this.draftProjects.update((drafts) => {
      const next = { ...drafts };
      if (choice === current) delete next[project.id];
      else next[project.id] = choice;
      return next;
    });
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
