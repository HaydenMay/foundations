import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FoundationsStore } from './state.service';
import {
  initialState,
  STORAGE_KEY,
  MIGRATION_BACKUP_KEY,
  MIGRATION_BACKUP_V3_KEY,
} from './domain/state';
import { importState, exportState } from './domain/state';
import { completeHabit } from './domain/habits';

describe('safe schema migration and durable first house', () => {
  const stores: FoundationsStore[] = [];
  const make = () => {
    const s = new FoundationsStore();
    stores.push(s);
    return s;
  };
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    stores.splice(0).forEach((s) => s.ngOnDestroy());
    vi.restoreAllMocks();
  });
  const old = () =>
    JSON.stringify({
      ...initialState('2026-09-01'),
      version: 1,
      designs: { home: 'blue' },
      futureExtension: { keep: true },
    });
  it('copies original legacy bytes before migrating a zero-star player', () => {
    const raw = old();
    localStorage.setItem(STORAGE_KEY, raw);
    const s = make();
    expect(localStorage.getItem(MIGRATION_BACKUP_KEY)).toBe(raw);
    expect(s.state().designs['home']).toBe('blue');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      version: 3,
      onboarding: { firstHomeUnlocked: true },
      futureExtension: { keep: true },
    });
  });
  it('keeps original disk bytes if the safety backup cannot be saved', () => {
    const raw = old();
    localStorage.setItem(STORAGE_KEY, raw);
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === MIGRATION_BACKUP_KEY) throw new Error('quota');
      write.call(this, key, value);
    });
    const s = make();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    expect(s.warning()).toContain('open tab');
    expect(s.state().designs['home']).toBe('blue');
  });
  it('retains the first safety copy across later reloads', () => {
    const raw = old();
    localStorage.setItem(STORAGE_KEY, raw);
    make();
    make();
    expect(localStorage.getItem(MIGRATION_BACKUP_KEY)).toBe(raw);
  });
  it('keeps an exact v2 backup before migrating the chapter catalog', () => {
    const raw = JSON.stringify({
      ...initialState('2026-09-01'),
      version: 2,
      legacyUnlocks: undefined,
      onboarding: { firstHomeUnlocked: true },
      designs: { home: 'blue', backyard: 'fort', exterior: 'moss' },
      lifetimeExtension: { keep: true },
    });
    localStorage.setItem(STORAGE_KEY, raw);
    const s = make();
    expect(localStorage.getItem(MIGRATION_BACKUP_V3_KEY)).toBe(raw);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBe(raw);
    expect(s.state().designs).toEqual({ home: 'blue', backyard: 'fort', exterior: 'moss' });
    expect(s.state().legacyUnlocks).toEqual(expect.arrayContaining(['backyard', 'exterior']));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).lifetimeExtension).toEqual({
      keep: true,
    });
  });
  it('does not overwrite the v2 source if its migration backup cannot be written', () => {
    const raw = JSON.stringify({
      ...initialState('2026-09-01'),
      version: 2,
      legacyUnlocks: undefined,
      onboarding: { firstHomeUnlocked: true },
      designs: { home: 'sage' },
    });
    localStorage.setItem(STORAGE_KEY, raw);
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === MIGRATION_BACKUP_V3_KEY) throw new Error('quota');
      write.call(this, key, value);
    });
    const s = make();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    expect(s.state().designs['home']).toBe('sage');
    expect(s.warning()).toContain('open tab');
  });
  it('saves unlock and completion together before selection and reload', async () => {
    const s = make();
    await s.complete(s.state().habits[1].id);
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.onboarding.firstHomeUnlocked).toBe(true);
    expect(saved.completions).toHaveLength(1);
    expect(saved.designs.home).toBeUndefined();
    const reopened = make();
    expect(reopened.state().onboarding.firstHomeUnlocked).toBe(true);
    expect(reopened.state().designs['home']).toBeUndefined();
  });
  it('keeps selection pending and rejects construction if its durable write fails', async () => {
    const s = make();
    await s.complete(s.state().habits[1].id);
    const before = localStorage.getItem(STORAGE_KEY);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await expect(s.design('home', 'cream')).rejects.toThrow('save');
    expect(s.state().designs['home']).toBeUndefined();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it('acknowledges first construction only for the first confirmed writer', async () => {
    const s = make();
    await s.complete(s.state().habits[1].id);
    const other = make();
    const results = await Promise.all([s.design('home', 'sage'), other.design('home', 'cream')]);
    expect(results).toEqual([true, false]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).completions).toHaveLength(1);
  });
  it('preserves a newer completion saved between the initial read and startup write', () => {
    const original = old();
    localStorage.setItem(STORAGE_KEY, original);
    const parsed = importState(original),
      latest = completeHabit(parsed, parsed.habits[0].id, '2026-10-17');
    const read = Storage.prototype.getItem,
      write = Storage.prototype.setItem;
    let first = true;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      const value = read.call(this, key);
      if (key === STORAGE_KEY && first) {
        first = false;
        write.call(this, MIGRATION_BACKUP_KEY, original);
        write.call(this, STORAGE_KEY, exportState(latest));
      }
      return value;
    });
    const s = make();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).completions).toEqual(latest.completions);
    expect(s.realState().completions).toEqual(latest.completions);
  });
  it.each([false, true])(
    'serializes startup with the shared state lock, legacy=%s',
    async (legacy) => {
      const original = legacy ? old() : null;
      if (original) localStorage.setItem(STORAGE_KEY, original);
      const descriptor = Object.getOwnPropertyDescriptor(navigator, 'locks');
      let release: (() => void) | undefined;
      const request = vi.fn(
        (_name: string, apply: () => void) =>
          new Promise<void>((resolve, reject) => {
            release = () => {
              try {
                apply();
                resolve();
              } catch (e) {
                reject(e);
              }
            };
          }),
      );
      Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
      try {
        const s = make();
        expect(request).toHaveBeenCalledWith('foundations-state', expect.any(Function));
        expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
        const current = s.realState();
        const latest = completeHabit(current, current.habits[0].id, '2026-10-17');
        // A lock owner finishes its genuine completion before startup's queued turn is granted.
        if (original) localStorage.setItem(MIGRATION_BACKUP_KEY, original);
        localStorage.setItem(STORAGE_KEY, exportState(latest));
        release!();
        await Promise.resolve();
        expect(s.realState()).toEqual(latest);
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(latest);
      } finally {
        if (descriptor) Object.defineProperty(navigator, 'locks', descriptor);
        else Reflect.deleteProperty(navigator, 'locks');
      }
    },
  );
});
