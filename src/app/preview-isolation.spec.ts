import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FoundationsStore } from './state.service';
import { AppState } from './domain/models';
import { completeHabit, dailyStars, lifetimeStars } from './domain/habits';
import { exportState, STORAGE_KEY, MIGRATION_BACKUP_KEY } from './domain/state';

// The intended public boundary; before implementation these calls fail on missing behavior.
type PreviewStore = FoundationsStore & {
  realState(): AppState;
  preview(): { state: AppState; stars: number } | null;
  sessionKey(): number;
  enterPreview(): void;
  exitPreview(): void;
  resetPreview(): void;
  previewScenario(name: 'new' | 'ready' | 'home' | 'several' | 'all'): void;
  previewStars(stars: number): void;
  previewJump(project: string): void;
  previewDesign(project: string, choice: string): void;
  previewVisible(project: 'home' | 'backyard', visible: boolean): void;
  backupJSON(): string;
};
describe('disposable Developer Preview boundary', () => {
  const stores: FoundationsStore[] = [];
  function make() {
    const s = new FoundationsStore() as PreviewStore;
    stores.push(s);
    return s;
  }
  beforeEach(() => localStorage.clear());
  afterEach(() => stores.splice(0).forEach((s) => s.ngOnDestroy()));
  it('keeps real history, stars, schedules, designs, backup and stored bytes unchanged under all controls', async () => {
    const s = make();
    await s.complete(s.state().habits[0].id);
    await s.design('home', 'blue');
    const real = structuredClone(s.state()),
      raw = localStorage.getItem(STORAGE_KEY),
      backup = s.backupJSON(),
      safety = localStorage.getItem(MIGRATION_BACKUP_KEY);
    s.enterPreview();
    expect(s.state()).not.toBe(s.realState());
    for (const scenario of ['new', 'ready', 'home', 'several', 'all'] as const)
      s.previewScenario(scenario);
    s.previewStars(999);
    for (const p of [
      'home',
      'backyard',
      'exterior',
      'neighbor',
      'garden',
      'street',
      'house2',
      'circle',
    ])
      s.previewJump(p);
    for (const home of ['sage', 'cream', 'blue']) s.previewDesign('home', home);
    for (const yard of ['pool', 'fort', 'trampoline']) s.previewDesign('backyard', yard);
    s.previewVisible('home', false);
    s.previewVisible('home', true);
    s.previewVisible('backyard', false);
    await s.preferences({
      lighting: 'night',
      panelOpen: false,
      camera: { x: 3, z: 4, zoom: 2, angle: Math.PI },
    });
    await s.complete(s.state().habits[1].id);
    expect(s.realState()).toEqual(real);
    expect(lifetimeStars(s.realState())).toBe(2);
    expect(dailyStars(s.realState(), s.today())).toBe(2);
    expect(s.backupJSON()).toBe(backup);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    expect(localStorage.getItem(MIGRATION_BACKUP_KEY)).toBe(safety);
    s.exitPreview();
    expect(s.state()).toEqual(real);
    expect(s.preview()).toBeNull();
  });
  it('reloads into genuine progress and resets a preview from current real state', async () => {
    const s = make();
    await s.complete(s.state().habits[1].id);
    const real = structuredClone(s.state());
    s.enterPreview();
    s.previewScenario('all');
    expect(s.stars()).toBe(115);
    const reopened = make();
    expect(reopened.preview()).toBeNull();
    expect(reopened.state()).toEqual(real);
    s.resetPreview();
    expect(s.state()).toEqual(real);
    expect(s.stars()).toBe(1);
  });
  it('accepts genuine updates from another tab behind the isolated view and exports only real data', async () => {
    const s = make(),
      real = structuredClone(s.state());
    s.enterPreview();
    s.previewScenario('all');
    const other = completeHabit(real, real.habits[2].id, s.today()),
      raw = exportState(other);
    localStorage.setItem(STORAGE_KEY, raw);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: raw }));
    expect(s.stars()).toBe(115);
    expect(JSON.parse(s.backupJSON())).toEqual(other);
    s.exitPreview();
    expect(s.state()).toEqual(other);
    expect(s.stars()).toBe(3);
  });
  it('blocks real backup replacement while preview is active', async () => {
    const s = make(),
      real = structuredClone(s.state());
    s.enterPreview();
    s.previewScenario('all');
    await expect(s.restore(s.state())).rejects.toThrow('Exit Developer Preview');
    expect(s.realState()).toEqual(real);
    expect(JSON.parse(s.backupJSON())).toEqual(real);
  });
  it('invalidates queued real actions on a view transition', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'locks');
    let held: (() => void) | undefined;
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: (_name: string, apply: () => void) =>
          new Promise<void>((resolve, reject) => {
            held = () => {
              try {
                apply();
                resolve();
              } catch (e) {
                reject(e);
              }
            };
          }),
      },
    });
    try {
      const s = make(),
        raw = localStorage.getItem(STORAGE_KEY);
      const pending = s.preferences({ lighting: 'night' });
      s.enterPreview();
      held!();
      await expect(pending).rejects.toThrow('view changed');
      s.exitPreview();
      expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
      expect(s.state().preferences.lighting).toBe('auto');
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'locks', descriptor);
      else Reflect.deleteProperty(navigator, 'locks');
    }
  });
  it('can inspect locked choices without granting real unlocks', () => {
    const s = make();
    s.enterPreview();
    s.previewDesign('backyard', 'trampoline');
    s.previewDesign('home', 'cream');
    expect(s.state().designs).toEqual({ home: 'cream', backyard: 'trampoline' });
    expect(s.realState().designs).toEqual({});
    expect(s.realState().onboarding.firstHomeUnlocked).toBe(false);
    expect(() => s.previewStars(-1)).toThrow();
    expect(() => s.previewStars(NaN)).toThrow();
    expect(() => s.previewDesign('invented-project', 'invented-choice')).toThrow();
  });
});
