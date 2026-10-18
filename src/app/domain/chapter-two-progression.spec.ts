import { describe, expect, it } from 'vitest';
import { completeHabit, lifetimeStars } from './habits';
import { nextDate } from './dates';
import { initialState } from './state';
import {
  CHAPTER_TWO_COMPLETE_THRESHOLD,
  CHAPTER_TWO_PROJECTS,
  CHAPTER_TWO_START_THRESHOLD,
  isProjectUnlocked,
  selectDesign,
} from './progression';

const DATE = '2026-10-19';
const neighborProjects = CHAPTER_TWO_PROJECTS.filter((project) => project.id.includes('neighbor-'));

describe('Chapter 2 progression', () => {
  it('starts at 100 lifetime stars and completes at 200', () => {
    expect(CHAPTER_TWO_START_THRESHOLD).toBe(100);
    expect(CHAPTER_TWO_COMPLETE_THRESHOLD).toBe(200);
  });

  it('unlocks each Chapter 2 project at its lifetime threshold', () => {
    const state = { ...initialState(DATE), onboarding: { firstHomeUnlocked: true } };
    expect(CHAPTER_TWO_PROJECTS.map(({ id, threshold }) => [id, threshold])).toEqual([
      ['ch2-neighbor-1', 110],
      ['ch2-street-trees', 120],
      ['ch2-neighbor-2', 130],
      ['ch2-gardens', 140],
      ['ch2-neighbor-3', 150],
      ['ch2-entrance', 160],
      ['ch2-neighbor-4', 170],
      ['ch2-community-park', 180],
      ['ch2-landmark', 190],
    ]);
    for (const project of CHAPTER_TWO_PROJECTS) {
      expect(isProjectUnlocked(state, project, project.threshold - 1)).toBe(false);
      expect(isProjectUnlocked(state, project, project.threshold)).toBe(true);
    }
  });

  it('uses namespaced IDs without changing Chapter 1 IDs', () => {
    expect(CHAPTER_TWO_PROJECTS.every((project) => project.id.startsWith('ch2-'))).toBe(true);
    expect(CHAPTER_TWO_PROJECTS.every((project) => project.chapter === 2)).toBe(true);
  });

  it('offers all three house styles for four distinct neighbor lot identities', () => {
    expect(neighborProjects).toHaveLength(4);
    expect(neighborProjects.map((project) => project.lot)).toEqual([
      'compact',
      'l-shaped',
      'two-story',
      'wide-gable',
    ]);
    for (const project of neighborProjects) {
      expect(project.choices.map((choice) => choice.id)).toEqual(['cottage', 'craftsman', 'brick']);
    }
  });

  it('keeps shared-space choices independent of house style', () => {
    expect(CHAPTER_TWO_PROJECTS.filter((project) => !project.lot)).toHaveLength(5);
    expect(
      CHAPTER_TWO_PROJECTS.filter((project) => !project.lot).every((p) => p.chapter === 2),
    ).toBe(true);
  });

  it('allows free reversible house selection without changing lifetime stars', () => {
    let state = { ...initialState(DATE), onboarding: { firstHomeUnlocked: true } };
    let date = DATE;
    for (let i = 0; i < 37; i++) {
      state = completeHabit(state, state.habits[2].id, date);
      date = nextDate(date);
    }
    const stars = lifetimeStars(state);
    expect(stars).toBeGreaterThanOrEqual(110);
    const house = neighborProjects[0];
    const cottage = selectDesign(state, house.id, 'cottage');
    const brick = selectDesign(cottage, house.id, 'brick');
    expect(cottage.designs[house.id]).toBe('cottage');
    expect(brick.designs[house.id]).toBe('brick');
    expect(lifetimeStars(brick)).toBe(stars);
  });
});
