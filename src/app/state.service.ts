import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { localDate } from './domain/dates';
import { completeHabit, createHabit, dailyStars, editHabit, lifetimeStars } from './domain/habits';
import { AppState, HabitInput, Preferences } from './domain/models';
import { PROJECTS, selectDesign, unlockedProjects } from './domain/progression';
import { exportState, importState, initialState, STORAGE_KEY } from './domain/state';

@Injectable({ providedIn: 'root' })
export class FoundationsStore implements OnDestroy {
  readonly today = signal(localDate());
  readonly warning = signal('');
  readonly state = signal<AppState>(initialState(this.today()));
  readonly stars = computed(() => lifetimeStars(this.state()));
  readonly daily = computed(() => dailyStars(this.state(), this.today()));
  readonly unlocked = computed(() => unlockedProjects(this.state()));
  readonly pending = computed(() => this.unlocked().filter((p) => !this.state().designs[p.id]));
  readonly next = computed(() => PROJECTS.find((p) => p.threshold > this.stars()));
  private unsaved = false;
  private corrupt = false;
  private storageBlocked = false;
  private readonly clock: ReturnType<typeof setInterval>;
  private readonly focus = () => this.today.set(localDate());
  private readonly storage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    if (this.unsaved) {
      this.warning.set(
        'Another tab changed your town. This tab has unsaved progress; export a backup before reloading.',
      );
      return;
    }
    try {
      this.state.set(importState(event.newValue));
    } catch {
      this.warning.set(
        'Another tab saved unreadable data. Your current session is still available to export.',
      );
    }
  };
  constructor() {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      this.storageBlocked = true;
      this.unsaved = true;
      this.storageWarning();
    }
    try {
      if (saved) this.state.set(importState(saved));
      else if (!this.storageBlocked) this.persist(this.state());
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
  private storageWarning() {
    this.warning.set(
      'Browser storage is unavailable or full. Progress is only in this open tab. Export a backup before closing.',
    );
  }
  private persist(state: AppState): void {
    if (this.storageBlocked) {
      this.unsaved = true;
      this.storageWarning();
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, exportState(state));
      this.unsaved = false;
      this.warning.set('');
    } catch {
      this.unsaved = true;
      this.storageWarning();
    }
  }
  private async commit(change: (s: AppState) => AppState, replace = false): Promise<void> {
    const apply = () => {
      if (this.corrupt && !replace)
        throw new Error(
          'Import a valid backup in Settings first. Your original saved data is untouched.',
        );
      let current = this.state();
      if (!this.unsaved && !replace) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) current = importState(raw);
        } catch {
          /* Retain the in-memory session if storage becomes inaccessible. */
        }
      }
      const next = change(current);
      this.state.set(next);
      this.corrupt = false;
      if (replace) this.storageBlocked = false;
      this.persist(next);
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
  design(project: string, choice: string): Promise<void> {
    return this.commit((s) => selectDesign(s, project, choice));
  }
  preferences(patch: Partial<Preferences>): Promise<void> {
    return this.commit((s) => ({ ...s, preferences: { ...s.preferences, ...patch } }));
  }
  restore(state: AppState): Promise<void> {
    return this.commit(() => importState(exportState(state)), true);
  }
  exportBackup(recovery = false): void {
    let text = exportState(this.state());
    if (recovery) {
      try {
        text = localStorage.getItem(STORAGE_KEY) || text;
      } catch {
        /* Export the in-memory session when storage cannot be read. */
      }
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `foundations-${recovery ? 'recovery-' : ''}${localDate()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  ngOnDestroy() {
    clearInterval(this.clock);
    window.removeEventListener('focus', this.focus);
    window.removeEventListener('storage', this.storage);
  }
}
