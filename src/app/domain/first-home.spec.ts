import { describe, expect, it } from 'vitest';
import { initialState, importState, exportState } from './state';
import { completeHabit, createHabit, lifetimeStars } from './habits';
import { selectDesign, unlockedProjects } from './progression';

const DATE = '2026-10-17';
describe('first healthy step and save migration', () => {
  it('starts genuinely new profiles with an empty, locked home lot', () => {
    const s = initialState(DATE);
    expect(s).toMatchObject({ version: 3, onboarding: { firstHomeUnlocked: false }, designs: {} });
    expect(s.designs['home']).toBeUndefined();
    expect(unlockedProjects(s)).toEqual([]);
    expect(() => selectDesign(s, 'home', 'sage')).toThrow();
  });
  it.each(['easy', 'moderate', 'hard'] as const)(
    'unlocks once from the first valid %s completion',
    (difficulty) => {
      let s = initialState(DATE);
      s.habits[0].difficulty = difficulty;
      s = completeHabit(s, s.habits[0].id, DATE);
      expect(s).toMatchObject({ onboarding: { firstHomeUnlocked: true } });
      expect(unlockedProjects(s).map((p) => p.id)).toEqual(['home']);
      const stars = lifetimeStars(s),
        history = structuredClone(s.completions);
      for (const choice of ['sage', 'cream', 'blue']) s = selectDesign(s, 'home', choice);
      expect(lifetimeStars(s)).toBe(stars);
      expect(s.completions).toEqual(history);
      expect(completeHabit(s, s.habits[0].id, DATE)).toBe(s);
    },
  );
  it('does not unlock from an invalid or tomorrow-eligible attempt', () => {
    const s = initialState(DATE),
      h = createHabit(
        {
          name: 'Tomorrow',
          difficulty: 'easy',
          active: true,
          schedule: { kind: 'daily', days: [] },
        },
        DATE,
      );
    s.habits.push(h);
    expect(completeHabit(s, h.id, DATE)).toBe(s);
    expect(completeHabit(s, 'missing', DATE)).toBe(s);
    expect(unlockedProjects(s)).toEqual([]);
  });
  it('qualifies a recorded zero-star completion at the daily cap', () => {
    let s = initialState(DATE);
    s.habits = Array.from({ length: 5 }, () =>
      createHabit(
        {
          name: 'Synthetic step',
          difficulty: 'hard',
          active: true,
          schedule: { kind: 'daily', days: [] },
        },
        DATE,
        true,
      ),
    );
    for (const h of s.habits.slice(0, 4)) s = completeHabit(s, h.id, DATE);
    const capped = { ...s, onboarding: { firstHomeUnlocked: false } };
    const next = completeHabit(capped, s.habits[4].id, DATE);
    expect(next.completions.at(-1)?.stars).toBe(0);
    expect(next).toMatchObject({ onboarding: { firstHomeUnlocked: true } });
    expect(lifetimeStars(next)).toBe(10);
  });
  it('round trips pending selection and a confirmed home safely', () => {
    let s = initialState(DATE);
    s = completeHabit(s, s.habits[1].id, DATE);
    const pending = importState(exportState(s));
    expect(pending.designs['home']).toBeUndefined();
    expect(pending).toMatchObject({ onboarding: { firstHomeUnlocked: true } });
    expect(importState(exportState(selectDesign(pending, 'home', 'cream'))).designs['home']).toBe(
      'cream',
    );
  });
  it('conservatively migrates a zero-star legacy home and retains unknown fields', () => {
    const old = {
      ...initialState(DATE),
      version: 1,
      designs: { home: 'blue' },
      extension: { ownerNote: 'synthetic extension' },
      preferences: { ...initialState(DATE).preferences, futureSetting: 'keep' },
    };
    delete (old as { onboarding?: unknown }).onboarding;
    const migrated = importState(JSON.stringify(old));
    expect(migrated).toMatchObject({
      version: 3,
      onboarding: { firstHomeUnlocked: true },
      designs: { home: 'blue' },
      extension: old.extension,
      preferences: { futureSetting: 'keep' },
    });
    expect(migrated.completions).toEqual([]);
    expect(lifetimeStars(migrated)).toBe(0);
  });
  it('preserves older imported construction, history and schedules', () => {
    let s = initialState(DATE);
    for (const date of [DATE, '2026-10-18'])
      for (const h of s.habits) s = completeHabit(s, h.id, date);
    const old = {
      ...s,
      version: 1,
      designs: { home: 'cream', backyard: 'fort', exterior: 'moss' },
    };
    delete (old as { onboarding?: unknown }).onboarding;
    const migrated = importState(JSON.stringify(old));
    expect(migrated.designs).toEqual(old.designs);
    expect(migrated.habits).toEqual(old.habits);
    expect(migrated.completions).toEqual(old.completions);
    expect(lifetimeStars(migrated)).toBe(12);
  });
});
