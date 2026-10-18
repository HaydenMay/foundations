import { describe, expect, it } from 'vitest';
import { completeHabit, lifetimeStars } from './habits';
import { nextDate } from './dates';
import { AppState } from './models';
import { exportState, importState, initialState } from './state';

const DATE = '2026-09-01';

function stateWithStarsAtLeast(stars: number): AppState {
  let state = initialState(DATE);
  let date = DATE;
  while (lifetimeStars(state) < stars) {
    state = completeHabit(state, state.habits[2].id, date);
    date = nextDate(date);
  }
  return state;
}

function versionThree(state: AppState): string {
  const old = JSON.parse(exportState(state));
  old.version = 3;
  delete old.chapterNotices;
  return JSON.stringify(old);
}

describe('version 4 chapter notice migration', () => {
  it('creates a new profile with unseen Chapter 2 notices', () => {
    expect(initialState(DATE)).toMatchObject({
      version: 4,
      chapterNotices: { neighborhoodSeen: false, completeSeen: false },
    });
  });

  it('marks historical Chapter 2 notices seen when importing older progress', () => {
    const hundredStars = importState(versionThree(stateWithStarsAtLeast(100)));
    const twoHundredStars = importState(versionThree(stateWithStarsAtLeast(200)));

    expect(hundredStars.chapterNotices).toEqual({ neighborhoodSeen: true, completeSeen: false });
    expect(twoHundredStars.chapterNotices).toEqual({ neighborhoodSeen: true, completeSeen: true });
  });

  it('preserves a pending v4 notice when importing a save with earned stars', () => {
    const pending = stateWithStarsAtLeast(100);
    const reopened = importState(exportState(pending));

    expect(reopened.chapterNotices).toEqual({ neighborhoodSeen: false, completeSeen: false });
    expect(lifetimeStars(reopened)).toBe(lifetimeStars(pending));
  });

  it('preserves existing house and unknown extension fields across v3 migration', () => {
    const state = stateWithStarsAtLeast(100);
    state.designs['home'] = 'blue';
    const old = JSON.parse(versionThree(state));
    old.ownerExtension = { saved: true };
    const migrated = importState(JSON.stringify(old));

    expect(migrated.version).toBe(4);
    expect(migrated.designs['home']).toBe('blue');
    expect(migrated.completions).toEqual(state.completions);
    expect((migrated as AppState & { ownerExtension: { saved: boolean } }).ownerExtension).toEqual({
      saved: true,
    });
  });

  it('keeps explicitly pending notice flags through JSON backup import', () => {
    const state = stateWithStarsAtLeast(100);
    const backup = exportState(state);
    expect(importState(backup).chapterNotices.neighborhoodSeen).toBe(false);
  });

  it('retains saved camera positions that reach the expanded neighborhood', () => {
    const state = initialState(DATE);
    state.preferences.camera = { x: 59.5, z: -34, zoom: 0.3, angle: Math.PI / 4 };
    expect(importState(exportState(state)).preferences.camera).toEqual(state.preferences.camera);
  });
});
