import { describe, expect, it } from 'vitest';
import { initialState, importState, exportState } from './state';
import { completeHabit, lifetimeStars } from './habits';
import { selectDesign, PROJECTS } from './progression';
describe('visual production compatibility', () => {
  it('retains all legacy home IDs, history and backyard choices through free changes', () => {
    let state = initialState('2026-10-17');
    for (const h of state.habits) state = completeHabit(state, h.id, '2026-10-17');
    const history = JSON.stringify(state.completions, null, 2);
    for (const home of ['sage', 'cream', 'blue'])
      for (const backyard of ['pool', 'fort', 'trampoline']) {
        state = selectDesign(selectDesign(state, 'home', home), 'backyard', backyard);
        const restored = importState(exportState(state));
        expect(restored.designs).toEqual({ home, backyard });
        expect(lifetimeStars(restored)).toBe(6);
        expect(JSON.stringify(restored.completions, null, 2)).toBe(history);
      }
  });
  it('keeps new house appearances free and the backyard reward gated', () => {
    const state = importState(
      JSON.stringify({ ...initialState('2026-10-17'), version: 1, designs: { home: 'sage' } }),
    );
    for (const id of ['sage', 'cream', 'blue'])
      expect(lifetimeStars(selectDesign(state, 'home', id))).toBe(0);
    expect(() => selectDesign(state, 'backyard', 'pool')).toThrow();
    expect(PROJECTS[0].choices.map((c) => c.name)).toEqual([
      'Classic Cottage',
      'Modern Craftsman',
      'Traditional Brick',
    ]);
  });
});
