import { describe, expect, it } from 'vitest';
import { initialState } from './state';
import {
  CHAPTER_FOUR_START_THRESHOLD,
  CHAPTER_FOUR_PROJECTS,
  CHAPTER_THREE_COMPLETE_THRESHOLD,
  CHAPTER_THREE_PROJECTS,
  CHAPTER_THREE_START_THRESHOLD,
  CHAPTER_TWO_PROJECTS,
  isProjectUnlocked,
} from './progression';
import {
  acknowledgeChapterNotice,
  pendingChapterNotice,
} from './chapter-notices';
import { scenarioPreview } from './preview';

describe('additive city progression', () => {
  it('preserves the approved Chapter 2 milestones and adds later chapters without renumbering', () => {
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
    expect(CHAPTER_THREE_START_THRESHOLD).toBe(210);
    expect(CHAPTER_THREE_COMPLETE_THRESHOLD).toBe(300);
    expect(CHAPTER_FOUR_START_THRESHOLD).toBe(400);
    expect(CHAPTER_THREE_PROJECTS.every((project) => project.chapter === 3)).toBe(true);
    expect(CHAPTER_FOUR_PROJECTS.every((project) => project.chapter === 4)).toBe(true);
    expect(new Set([...CHAPTER_THREE_PROJECTS, ...CHAPTER_FOUR_PROJECTS].map((p) => p.id)).size)
      .toBe(CHAPTER_THREE_PROJECTS.length + CHAPTER_FOUR_PROJECTS.length);
  });

  it('unlocks later projects only at their additive lifetime-star thresholds', () => {
    const state = initialState('2026-10-18');
    for (const project of [...CHAPTER_THREE_PROJECTS, ...CHAPTER_FOUR_PROJECTS]) {
      expect(isProjectUnlocked(state, project, project.threshold - 1)).toBe(false);
      expect(isProjectUnlocked(state, project, project.threshold)).toBe(true);
    }
  });

  it('queues chapter transitions in order when a profile crosses multiple thresholds', () => {
    let state = initialState('2026-10-18');
    expect(pendingChapterNotice(state, 500)).toBe('neighborhood');
    state = acknowledgeChapterNotice(state, 'neighborhood');
    expect(pendingChapterNotice(state, 500)).toBe('complete');
    state = acknowledgeChapterNotice(state, 'complete');
    expect(pendingChapterNotice(state, 500)).toBe('city-center');
    state = acknowledgeChapterNotice(state, 'city-center');
    expect(pendingChapterNotice(state, 500)).toBe('city-complete');
    state = acknowledgeChapterNotice(state, 'city-complete');
    expect(pendingChapterNotice(state, 500)).toBe('monorail');
    state = acknowledgeChapterNotice(state, 'monorail');
    expect(pendingChapterNotice(state, 500)).toBeUndefined();
  });

  it('provides isolated preview scenarios for a growing town center and the completed transit loop', () => {
    const center = scenarioPreview('town-center', '2026-10-18');
    expect(center.stars).toBeGreaterThanOrEqual(CHAPTER_THREE_START_THRESHOLD);
    expect(CHAPTER_THREE_PROJECTS.every((project) => center.state.designs[project.id])).toBe(true);
    const transit = scenarioPreview('monorail-city', '2026-10-18');
    expect(transit.stars).toBe(CHAPTER_FOUR_START_THRESHOLD);
    expect(CHAPTER_FOUR_PROJECTS.every((project) => transit.state.designs[project.id])).toBe(true);
  });
});
