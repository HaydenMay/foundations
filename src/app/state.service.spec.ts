import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FoundationsStore } from './state.service';
import { STORAGE_KEY } from './domain/state';
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
});
