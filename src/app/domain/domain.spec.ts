import { describe, expect, it } from 'vitest';
import { localDate, nextDate, weekStart } from './dates';
import {
  completeHabit,
  createHabit,
  dailyStars,
  editHabit,
  isCompleted,
  isScheduled,
  lifetimeStars,
} from './habits';
import { AppState, Difficulty, HabitInput, Schedule } from './models';
import { PROJECTS, selectDesign, unlockedProjects } from './progression';
import { exportState, importState, initialState } from './state';

const MON = '2026-10-19';
function input(
  difficulty: Difficulty = 'hard',
  schedule: Schedule = { kind: 'daily', days: [] },
): HabitInput {
  return { name: 'A little movement', difficulty, schedule, active: true };
}
function fixture(count = 1, difficulty: Difficulty = 'hard'): AppState {
  const state = initialState(MON);
  state.habits = Array.from({ length: count }, () => createHabit(input(difficulty), MON, true));
  return state;
}
function earn(count: number): AppState {
  let state = fixture(count);
  for (const h of state.habits) state = completeHabit(state, h.id, MON);
  return state;
}
describe('calendar and scheduling', () => {
  it('uses the device calendar rather than a UTC timestamp', () =>
    expect(localDate(new Date(2026, 9, 19, 23, 59))).toBe(MON));
  it('advances a calendar day over DST and year boundaries', () => {
    expect(nextDate('2026-12-31')).toBe('2027-01-01');
    expect(nextDate('2026-03-08')).toBe('2026-03-09');
  });
  it('groups Sunday and Monday into different local weeks', () => {
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
    expect(weekStart(MON)).toBe(MON);
  });
  it('makes new custom goals eligible tomorrow', () => {
    const h = createHabit(input(), MON);
    expect(h.eligibleOn).toBe('2026-10-20');
    expect(isScheduled(h, MON)).toBe(false);
    expect(isScheduled(h, '2026-10-20')).toBe(true);
  });
  it('makes starter goals eligible immediately', () =>
    expect(isScheduled(createHabit(input(), MON, true), MON)).toBe(true));
  it('respects selected weekdays', () => {
    const h = createHabit(input('easy', { kind: 'weekdays', days: [1, 3] }), MON, true);
    expect(isScheduled(h, MON)).toBe(true);
    expect(isScheduled(h, '2026-10-20')).toBe(false);
    expect(isScheduled(h, '2026-10-21')).toBe(true);
  });
  it('excludes paused and archived habits', () => {
    const h = createHabit(input(), MON, true);
    expect(isScheduled({ ...h, active: false }, MON)).toBe(false);
    expect(isScheduled({ ...h, archived: true }, MON)).toBe(false);
  });
  it('rejects empty names and weekday schedules', () => {
    expect(() => createHabit({ ...input(), name: ' ' }, MON)).toThrow();
    expect(() => createHabit(input('easy', { kind: 'weekdays', days: [] }), MON)).toThrow();
  });
});
describe('permanent rewards', () => {
  it.each([
    ['easy', 1],
    ['moderate', 2],
    ['hard', 3],
  ] as const)('awards %s difficulty %i stars', (difficulty, expected) => {
    const s = fixture(1, difficulty);
    expect(dailyStars(completeHabit(s, s.habits[0].id, MON), MON)).toBe(expected);
  });
  it('partially rewards a hard goal when only one star remains', () => {
    const s = earn(4);
    expect(s.completions.map((c) => c.stars)).toEqual([3, 3, 3, 1]);
    expect(lifetimeStars(s)).toBe(10);
  });
  it('records completion after the cap with zero additional stars', () => {
    const s = earn(5);
    expect(s.completions).toHaveLength(5);
    expect(s.completions[4].stars).toBe(0);
    expect(dailyStars(s, MON)).toBe(10);
  });
  it('blocks repeated scheduled completions', () => {
    const s = earn(1);
    expect(completeHabit(s, s.habits[0].id, MON).completions).toHaveLength(1);
  });
  it('resets daily allowance without decreasing lifetime stars', () => {
    const s = earn(5);
    const next = completeHabit(s, s.habits[0].id, '2026-10-20');
    expect(dailyStars(next, '2026-10-20')).toBe(3);
    expect(lifetimeStars(next)).toBe(13);
  });
  it('does not award inactive, early or unknown goals', () => {
    const s = fixture();
    s.habits[0].eligibleOn = '2026-10-20';
    expect(completeHabit(s, s.habits[0].id, MON).completions).toHaveLength(0);
    expect(completeHabit(s, 'missing', MON).completions).toHaveLength(0);
  });
  it('allows a weekly completion once per Monday–Sunday period', () => {
    let s = fixture();
    s.habits[0].schedule = { kind: 'weekly', days: [] };
    s = completeHabit(s, s.habits[0].id, MON);
    expect(isCompleted(s, s.habits[0], '2026-10-25')).toBe(true);
    s = completeHabit(s, s.habits[0].id, '2026-10-25');
    expect(s.completions).toHaveLength(1);
    expect(completeHabit(s, s.habits[0].id, '2026-10-26').completions).toHaveLength(2);
  });
  it('records a one-time goal once, including after changing its schedule', () => {
    let s = fixture();
    s.habits[0].schedule = { kind: 'once', days: [] };
    s = completeHabit(s, s.habits[0].id, MON);
    s.habits[0] = editHabit(s.habits[0], input());
    expect(completeHabit(s, s.habits[0].id, '2026-10-20').completions).toHaveLength(1);
  });
  it('does not score twice on the same date after changing frequency', () => {
    const s = earn(1);
    s.habits[0].schedule = { kind: 'weekly', days: [] };
    expect(completeHabit(s, s.habits[0].id, MON).completions).toHaveLength(1);
  });
  it('retains immutable history and lifetime stars after edits and archival', () => {
    const s = earn(1);
    s.habits[0] = {
      ...editHabit(s.habits[0], { ...input('easy'), name: 'Changed' }),
      archived: true,
    };
    expect(s.completions[0].name).toBe('A little movement');
    expect(s.completions[0].stars).toBe(3);
    expect(lifetimeStars(s)).toBe(3);
  });
});
describe('construction and backups', () => {
  it('rejects later completions after a one-time record while preserving earlier recurring history', () => {
    let s = earn(1);
    s.habits[0].schedule = { kind: 'once', days: [] };
    s = completeHabit(s, s.habits[0].id, '2026-10-20');
    expect(importState(exportState(s)).completions).toHaveLength(2);
    s.completions.push({
      ...s.completions[0],
      id: 'invalid-later-completion',
      date: '2026-10-21',
      period: '2026-10-21',
    });
    expect(() => importState(exportState(s))).toThrow();
  });
  it('keeps every unlocked project pending until a choice is made', () => {
    const s = earn(4);
    expect(unlockedProjects(s).map((p) => p.id)).toEqual(['home', 'backyard']);
    expect(s.designs['backyard']).toBeUndefined();
  });
  it('allows free reversible customization without spending stars', () => {
    const s = earn(4);
    const a = selectDesign(s, 'backyard', 'pool');
    const b = selectDesign(a, 'backyard', 'fort');
    expect(b.designs['backyard']).toBe('fort');
    expect(lifetimeStars(b)).toBe(10);
  });
  it('rejects locked projects and invalid design IDs', () => {
    const s = initialState(MON);
    expect(() => selectDesign(s, 'neighbor', 'cream')).toThrow();
    expect(() => selectDesign(s, 'home', 'missing')).toThrow();
  });
  it('ships eight distinct projects with three choices each', () => {
    expect(PROJECTS).toHaveLength(8);
    expect(PROJECTS.every((p) => p.choices.length === 3)).toBe(true);
  });
  it('round-trips habits, history, stars, designs and preferences', () => {
    const s = selectDesign(earn(4), 'backyard', 'pool');
    s.preferences.panelOpen = false;
    s.preferences.lighting = 'night';
    const restored = importState(exportState(s));
    expect(restored).toEqual(s);
    expect(lifetimeStars(restored)).toBe(10);
  });
  it.each(['{}', '{', '{"version":99}', '{"version":1,"habits":[]}'])(
    'rejects malformed or unsupported backup %s',
    (json) => expect(() => importState(json)).toThrow(),
  );
  it('rejects invalid dates, excessive rewards and duplicate completions', () => {
    const s = earn(1);
    s.completions[0].date = '2026-02-30';
    expect(() => importState(JSON.stringify(s))).toThrow();
    s.completions[0].date = MON;
    s.completions[0].stars = 100;
    expect(() => importState(JSON.stringify(s))).toThrow();
    s.completions[0].stars = 3;
    s.completions.push({ ...s.completions[0], id: 'another-id' });
    expect(() => importState(JSON.stringify(s))).toThrow();
  });
});
