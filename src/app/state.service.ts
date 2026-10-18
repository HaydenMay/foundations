import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { localDate } from './domain/dates';
import { completeHabit, createHabit, dailyStars, editHabit, lifetimeStars } from './domain/habits';
import { AppState, HabitInput, Preferences } from './domain/models';
import { PROJECTS, selectDesign, unlockedProjects } from './domain/progression';
import {
  exportState,
  importState,
  initialState,
  STORAGE_KEY,
  MIGRATION_BACKUP_KEY,
  MIGRATION_BACKUP_V3_KEY,
} from './domain/state';
import {
  copyPreview,
  jumpPreview,
  previewDesign,
  previewStars,
  previewVisible,
  PreviewScenario,
  PreviewSession,
  scenarioPreview,
} from './domain/preview';

@Injectable({ providedIn: 'root' })
export class FoundationsStore implements OnDestroy {
  readonly today = signal(localDate());
  readonly warning = signal('');
  private readonly real = signal<AppState>(initialState(this.today()));
  readonly realState = this.real.asReadonly();
  private readonly previewSession = signal<PreviewSession | null>(null);
  readonly preview = this.previewSession.asReadonly();
  private readonly epoch = signal(0);
  readonly sessionKey = this.epoch.asReadonly();
  readonly state = computed(() => this.previewSession()?.state || this.real());
  readonly stars = computed(() => this.previewSession()?.stars ?? lifetimeStars(this.real()));
  readonly daily = computed(() => dailyStars(this.state(), this.today()));
  readonly unlocked = computed(() => unlockedProjects(this.state(), this.stars()));
  readonly pending = computed(() => this.unlocked().filter((p) => !this.state().designs[p.id]));
  readonly next = computed(() =>
    !this.state().onboarding.firstHomeUnlocked
      ? PROJECTS[0]
      : PROJECTS.find((p) => p.threshold > this.stars()),
  );
  private unsaved = false;
  private corrupt = false;
  private storageBlocked = false;
  private conflict = false;
  private persistedBaseline: string | null = null;
  private readonly clock: ReturnType<typeof setInterval>;
  private readonly focus = () => this.today.set(localDate());
  private readonly storage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    if (this.unsaved) {
      if (event.newValue !== this.persistedBaseline) this.conflict = true;
      this.conflictWarning();
      return;
    }
    try {
      this.real.set(importState(event.newValue));
      this.persistedBaseline = event.newValue;
    } catch {
      this.corrupt = true;
      this.warning.set(
        'Another tab saved unreadable data. Your current session is still available to export.',
      );
    }
  };
  constructor() {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
      this.persistedBaseline = saved;
    } catch {
      this.storageBlocked = true;
      this.unsaved = true;
      this.storageWarning();
    }
    try {
      if (saved) {
        this.real.set(importState(saved));
        if (JSON.parse(saved).version < 3) this.initializeStorage();
      } else if (!this.storageBlocked) this.initializeStorage();
    } catch {
      this.corrupt = true;
      this.warning.set(
        'Saved data could not be opened. It has been kept untouched. Export the recovery file in Settings, or import a valid backup to continue.',
      );
    }
    this.clock = setInterval(this.focus, 30000);
    window.addEventListener('focus', this.focus);
    window.addEventListener('storage', this.storage);
  }
  private initializeStorage() {
    const epoch = this.epoch();
    // Startup creation/migration is a genuine transaction: re-read under the same tab lock.
    void this.commit((state) => state).catch(() => {
      if (epoch === this.epoch() && !this.corrupt) {
        this.unsaved = true;
        this.storageWarning();
      }
    });
  }
  private storageWarning() {
    this.warning.set(
      'Browser storage is unavailable or full. Progress is only in this open tab. Export a backup before closing.',
    );
  }
  private conflictWarning() {
    this.warning.set(
      'Another tab saved a different town while this tab had unsaved progress. Both versions are preserved. Export this session before reloading to open the saved town. Automatic saving is paused until you explicitly import a backup.',
    );
  }
  private persist(state: AppState): boolean {
    if (this.conflict) {
      this.unsaved = true;
      this.conflictWarning();
      return false;
    }
    if (this.storageBlocked) {
      this.unsaved = true;
      this.storageWarning();
      return false;
    }
    try {
      if (this.persistedBaseline) {
        const previousVersion = JSON.parse(this.persistedBaseline).version;
        const backupKey =
          previousVersion === 1
            ? MIGRATION_BACKUP_KEY
            : previousVersion === 2
              ? MIGRATION_BACKUP_V3_KEY
              : undefined;
        if (backupKey && !localStorage.getItem(backupKey)) {
          localStorage.setItem(backupKey, this.persistedBaseline);
        }
      }
      const serialized = exportState(state);
      localStorage.setItem(STORAGE_KEY, serialized);
      this.persistedBaseline = serialized;
      this.unsaved = false;
      this.warning.set('');
      return true;
    } catch {
      this.unsaved = true;
      this.storageWarning();
      return false;
    }
  }
  private async commit(
    change: (s: AppState) => AppState,
    replace = false,
    requireDurable = false,
  ): Promise<void> {
    const session = this.previewSession(),
      epoch = this.epoch();
    if (session) {
      if (replace) throw new Error('Exit Developer Preview before restoring a real backup.');
      const next = change(session.state);
      this.previewSession.set({
        ...session,
        state: next,
        stars: session.stars + lifetimeStars(next) - lifetimeStars(session.state),
      });
      return;
    }
    const apply = () => {
      if (epoch !== this.epoch())
        throw new Error('The view changed before this action finished. Please try again.');
      if (this.corrupt && !replace)
        throw new Error(
          'Import a valid backup in Settings first. Your original saved data is untouched.',
        );
      let current = this.real();
      if (!replace) {
        let raw: string | null = null;
        let readable = true;
        try {
          raw = localStorage.getItem(STORAGE_KEY);
        } catch {
          readable = false;
          this.storageBlocked = true;
          this.unsaved = true;
        }
        if (readable) {
          this.storageBlocked = false;
          let disk: AppState | null = null;
          try {
            if (raw) disk = importState(raw);
          } catch {
            this.corrupt = true;
            this.warning.set(
              'Saved data became unreadable. The original is protected. Export this session and the original storage in Settings, then import a valid backup.',
            );
            throw new Error(
              'Import a valid backup in Settings first. Your original saved data is untouched.',
            );
          }
          if (this.unsaved) {
            if (raw !== this.persistedBaseline) this.conflict = true;
          } else {
            current = disk || current;
            this.persistedBaseline = raw;
          }
        }
      }
      const next = change(current);
      this.corrupt = false;
      if (replace) {
        this.storageBlocked = false;
        this.conflict = false;
      }
      if (requireDurable && !this.persist(next))
        throw new Error(
          'Your home could not be saved. Your selection is still pending. Try again when storage is available, or export your progress before closing.',
        );
      this.real.set(next);
      if (!requireDurable) this.persist(next);
    };
    if (navigator.locks) await navigator.locks.request('foundations-state', apply);
    else apply();
  }
  async complete(id: string): Promise<number> {
    this.today.set(localDate());
    let gained = 0;
    await this.commit((s) => {
      const next = completeHabit(s, id, this.today());
      gained = lifetimeStars(next) - lifetimeStars(s);
      return next;
    });
    return gained;
  }
  saveHabit(input: HabitInput, id?: string): Promise<void> {
    return this.commit((s) => ({
      ...s,
      habits: id
        ? s.habits.map((h) => (h.id === id ? editHabit(h, input) : h))
        : [...s.habits, createHabit(input, localDate())],
    }));
  }
  archive(id: string): Promise<void> {
    return this.commit((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === id ? { ...h, archived: !h.archived } : h)),
    }));
  }
  async design(project: string, choice: string): Promise<boolean> {
    let first = project === 'home' && !this.state().designs['home'];
    if (this.preview()) {
      this.previewDesign(project, choice);
      return first;
    }
    await this.commit(
      (s) => {
        first = project === 'home' && !s.designs['home'];
        return selectDesign(s, project, choice);
      },
      false,
      project === 'home',
    );
    return first;
  }
  preferences(patch: Partial<Preferences>): Promise<void> {
    return this.commit((s) => ({ ...s, preferences: { ...s.preferences, ...patch } }));
  }
  restore(state: AppState): Promise<void> {
    return this.commit(() => importState(exportState(state)), true);
  }
  exportBackup(recovery = false): void {
    this.download(this.backupJSON(recovery), recovery ? 'recovery-' : '');
  }
  backupJSON(recovery = false): string {
    let text = exportState(this.real());
    if (recovery) {
      try {
        text = localStorage.getItem(STORAGE_KEY) || text;
      } catch {
        /* Export the in-memory session when storage cannot be read. */
      }
    }
    return text;
  }
  exportMigrationBackup(version: 1 | 2 = 1): void {
    const text = localStorage.getItem(
      version === 1 ? MIGRATION_BACKUP_KEY : MIGRATION_BACKUP_V3_KEY,
    );
    if (!text) throw new Error('No pre-upgrade backup is stored in this browser.');
    this.download(text, `pre-v${version}-`);
  }
  migrationBackupAvailable(version: 1 | 2 = 1): boolean {
    try {
      return !!localStorage.getItem(version === 1 ? MIGRATION_BACKUP_KEY : MIGRATION_BACKUP_V3_KEY);
    } catch {
      return false;
    }
  }
  private download(text: string, prefix: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `foundations-${prefix}${localDate()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  enterPreview(): void {
    if (this.previewSession()) return;
    this.epoch.update((n) => n + 1);
    this.previewSession.set(copyPreview(this.real()));
  }
  exitPreview(): void {
    this.epoch.update((n) => n + 1);
    this.previewSession.set(null);
  }
  private changePreview(change: (s: PreviewSession) => PreviewSession, resetCamera = false): void {
    const session = this.previewSession();
    if (!session) throw new Error('Enter Developer Preview first.');
    const next = change(session);
    if (resetCamera) this.epoch.update((n) => n + 1);
    this.previewSession.set(next);
  }
  resetPreview(): void {
    this.changePreview(() => copyPreview(this.real()), true);
  }
  previewScenario(kind: PreviewScenario): void {
    this.changePreview(() => scenarioPreview(kind, this.today()), true);
  }
  previewStars(stars: number): void {
    this.changePreview((s) => previewStars(s, stars));
  }
  previewJump(project: string): void {
    this.changePreview((s) => jumpPreview(s, project), true);
  }
  previewDesign(project: string, choice: string): void {
    this.changePreview((s) => previewDesign(s, project, choice));
  }
  previewVisible(project: 'home' | 'backyard', visible: boolean): void {
    this.changePreview((s) => previewVisible(s, project, visible));
  }
  ngOnDestroy() {
    clearInterval(this.clock);
    window.removeEventListener('focus', this.focus);
    window.removeEventListener('storage', this.storage);
  }
}
