import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FoundationsStore } from './state.service';
import { initialState, STORAGE_KEY, MIGRATION_BACKUP_KEY } from './domain/state';

describe('safe v2 upgrade and durable first house', () => {
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
      version: 2,
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
});
