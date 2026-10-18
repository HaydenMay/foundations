import { describe, expect, it } from 'vitest';
import { completeHabit, lifetimeStars } from './habits';
import { nextDate } from './dates';
import { AppState } from './models';
import { initialState } from './state';
import { acknowledgeChapterNotice, pendingChapterNotice } from './chapter-notices';

function earned(stars: number): AppState {
  let state = initialState('2026-09-01');
  let date = '2026-09-01';
  while (lifetimeStars(state) < stars) {
    state = completeHabit(state, state.habits[0].id, date);
    date = nextDate(date);
  }
  return state;
}

describe('durable chapter notices', () => {
  it('has no notice before the neighborhood threshold', () => {
    expect(pendingChapterNotice(earned(98))).toBeUndefined();
  });

  it('shows the neighborhood welcome at 100 lifetime stars', () => {
    expect(pendingChapterNotice(earned(100))).toBe('neighborhood');
  });

  it('queues the chapter completion after the neighborhood welcome', () => {
    expect(pendingChapterNotice(earned(200))).toBe('neighborhood');
  });

  it('shows chapter completion after the welcome is acknowledged', () => {
    const state = acknowledgeChapterNotice(earned(200), 'neighborhood');
    expect(state.chapterNotices.neighborhoodSeen).toBe(true);
    expect(pendingChapterNotice(state)).toBe('complete');
  });

  it('stops replaying an acknowledged notice', () => {
    const state = acknowledgeChapterNotice(earned(200), 'complete');
    expect(pendingChapterNotice(state)).toBe('neighborhood');
    const finished = acknowledgeChapterNotice(state, 'neighborhood');
    expect(pendingChapterNotice(finished)).toBeUndefined();
  });
});
