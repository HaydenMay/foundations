import { describe, expect, it } from 'vitest';
import { AppState } from './models';
import {
  CHAPTER_COMPLETE_THRESHOLD,
  chapterLotVisible,
  LEGACY_PROJECTS,
  PROJECTS,
  isProjectUnlocked,
} from './progression';
import { initialState, importState } from './state';

const DATE = '2026-10-17';

describe('Phase 4 milestone catalog', () => {
  it('reveals one empty adjacent lot only at 100 stars and preserves an existing neighbor', () => {
    expect(chapterLotVisible(99, {})).toBe(false);
    expect(chapterLotVisible(100, {})).toBe(true);
    expect(chapterLotVisible(100000, { neighbor: 'rose' })).toBe(false);
  });
  it('uses the approved 1–100 home arc without repurposing legacy milestone IDs', () => {
    expect(PROJECTS.map(({ id, threshold }) => [id, threshold])).toEqual([
      ['home', 0],
      ['frontGarden', 10],
      ['centerpiece', 20],
      ['backyard', 30],
      ['porch', 40],
      ['retreat', 50],
      ['gardenExpansion', 60],
      ['boundary', 70],
      ['outdoorLighting', 80],
      ['signature', 90],
    ]);
    expect(CHAPTER_COMPLETE_THRESHOLD).toBe(100);
    expect(LEGACY_PROJECTS.map((project) => project.id)).toEqual([
      'exterior',
      'neighbor',
      'garden',
      'street',
      'house2',
      'circle',
    ]);
  });

  it.each([10, 20, 30, 40, 50, 60, 70, 80, 90])(
    'unlocks a lifetime-star project at %i and not one star before',
    (threshold) => {
      const state = initialState(DATE);
      const project = PROJECTS.find((candidate) => candidate.threshold === threshold)!;
      const homeowner = { ...state, onboarding: { firstHomeUnlocked: true } } as AppState;
      expect(isProjectUnlocked(homeowner, project, threshold - 1)).toBe(false);
      expect(isProjectUnlocked(homeowner, project, threshold)).toBe(true);
    },
  );

  it('does not grant retired legacy projects to a new profile at high star totals', () => {
    const state = initialState(DATE);
    state.onboarding.firstHomeUnlocked = true;
    const unlocked = PROJECTS.filter((project) => isProjectUnlocked(state, project, 100));
    expect(unlocked.map((project) => project.id)).toContain('signature');
    expect(unlocked.map((project) => project.id)).not.toContain('neighbor');
    expect(unlocked.map((project) => project.id)).not.toContain('circle');
  });

  it('migrates a v2 selection without guessing its new meaning or dropping extension fields', () => {
    const v2 = {
      ...initialState(DATE),
      version: 2,
      onboarding: { firstHomeUnlocked: true },
      designs: {
        home: 'blue',
        backyard: 'fort',
        exterior: 'moss',
        neighbor: 'rose',
      },
      ownerExtension: { keep: true },
    } as unknown as AppState;
    const migrated = importState(JSON.stringify(v2));
    expect(migrated.version).toBe(3);
    expect(migrated.designs).toEqual(v2.designs);
    expect(migrated.legacyUnlocks).toEqual(
      expect.arrayContaining(['backyard', 'exterior', 'neighbor']),
    );
    expect((migrated as AppState & { ownerExtension: unknown }).ownerExtension).toEqual({
      keep: true,
    });
    expect(importState(JSON.stringify(migrated))).toEqual(migrated);
  });

  it('grandfathers unchosen legacy milestones earned before migration', () => {
    const base = initialState(DATE);
    const v2 = {
      ...base,
      version: 2,
      onboarding: { firstHomeUnlocked: true },
      designs: { home: 'sage' },
      completions: [
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `completion-${i}`,
          habitId: base.habits[0].id,
          name: 'Old habit',
          difficulty: 'moderate',
          date: `2026-10-${String(1 + i).padStart(2, '0')}`,
          period: `2026-10-${String(1 + i).padStart(2, '0')}`,
          stars: 2,
        })),
        ...Array.from({ length: 3 }, (_, i) => ({
          id: `completion-hard-${i}`,
          habitId: base.habits[0].id,
          name: 'Old hard habit',
          difficulty: 'hard',
          date: `2026-10-${String(10 + i).padStart(2, '0')}`,
          period: `2026-10-${String(10 + i).padStart(2, '0')}`,
          stars: 3,
        })),
      ],
    } as unknown as AppState;
    const migrated = importState(JSON.stringify(v2));
    expect(migrated.legacyUnlocks).toEqual(
      expect.arrayContaining(['backyard', 'exterior', 'neighbor']),
    );
    expect(migrated.legacyUnlocks).not.toContain('garden');
  });
});
