import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FoundationsStore } from './state.service';
import { exportState, importState, initialState, STORAGE_KEY } from './domain/state';
import { completeHabit } from './domain/habits';
import { nextDate } from './domain/dates';
describe('local storage resilience', () => {
  const stores: FoundationsStore[] = [];
  function makeStore() {
    const store = new FoundationsStore();
    stores.push(store);
    return store;
  }
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    stores.splice(0).forEach((s) => s.ngOnDestroy());
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  it('allows tracking in memory when browser storage reads are blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = makeStore();
    await store.complete(store.state().habits[0].id);
    expect(store.stars()).toBe(2);
    expect(store.warning()).toContain('open tab');
  });
  it('retains unsaved completions across subsequent actions if quota is exhausted', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const store = makeStore();
    await store.complete(store.state().habits[0].id);
    await store.complete(store.state().habits[1].id);
    expect(store.stars()).toBe(3);
    expect(store.state().completions).toHaveLength(2);
  });
  it('preserves unreadable original storage until explicit restore', async () => {
    localStorage.setItem(STORAGE_KEY, '{bad data');
    const store = makeStore();
    await expect(store.complete(store.state().habits[0].id)).rejects.toThrow('Import');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad data');
  });
  it('does not overwrite data that becomes unreadable during an open session', async () => {
    const store = makeStore();
    localStorage.setItem(STORAGE_KEY, '{broken while open');
    await expect(store.complete(store.state().habits[0].id)).rejects.toThrow('Import');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken while open');
  });
  it('protects newer tab progress when an unsaved tab recovers storage access', async () => {
    const store = makeStore();
    const original = importState(localStorage.getItem(STORAGE_KEY)!);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await store.complete(store.state().habits[0].id);
    write.mockRestore();
    const other = completeHabit(original, original.habits[1].id, store.today());
    localStorage.setItem(STORAGE_KEY, exportState(other));
    await store.complete(store.state().habits[2].id);
    expect(importState(localStorage.getItem(STORAGE_KEY)!)).toEqual(other);
    expect(store.stars()).toBe(5);
    expect(store.warning()).toContain('Another tab');
  });
  it('protects unreadable storage received from another tab', async () => {
    const store = makeStore();
    localStorage.setItem(STORAGE_KEY, '{invalid external data');
    window.dispatchEvent(
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{invalid external data' }),
    );
    await expect(store.preferences({ panelOpen: false })).rejects.toThrow('Import');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{invalid external data');
  });
  it('recovers a pending neighborhood notice after reload and persists dismissal', async () => {
    let state = initialState('2026-08-01');
    let date = '2026-08-01';
    for (let i = 0; i < 50; i++) {
      state = completeHabit(state, state.habits[0].id, date);
      date = nextDate(date);
    }
    localStorage.setItem(STORAGE_KEY, exportState(state));
    const store = makeStore();

    expect(store.chapterNotice()).toBe('neighborhood');
    await store.acknowledgeChapterNotice('neighborhood');

    const reopened = makeStore();
    expect(reopened.chapterNotice()).toBeUndefined();
    expect(reopened.realState().chapterNotices.neighborhoodSeen).toBe(true);
  });
});
