import { describe, expect, it } from 'vitest';
import { initialState } from './state';
import {
  copyPreview,
  jumpPreview,
  previewDesign,
  previewNotice,
  previewVisible,
  scenarioPreview,
} from './preview';

describe('chapter-aware developer preview', () => {
  it('jumps to the continuous Chapter 2 road and its reserved lots', () => {
    const preview = jumpPreview(copyPreview(initialState('2026-10-18')), 'ch2-neighborhood');
    expect(preview.stars).toBe(100);
    expect(preview.state.designs['ch2-neighborhood']).toBe('reveal');
    expect(preview.state.designs['home']).toBeDefined();
    expect(preview.state.chapterNotices.neighborhoodSeen).toBe(true);
  });

  it('supports all four Chapter 2 neighbor styles and reversible design choices', () => {
    let preview = jumpPreview(copyPreview(initialState('2026-10-18')), 'ch2-neighbor-1');
    preview = previewDesign(preview, 'ch2-neighbor-1', 'brick');
    preview = previewDesign(preview, 'ch2-neighbor-1', 'craftsman');
    expect(preview.state.designs['ch2-neighbor-1']).toBe('craftsman');
  });

  it('can hide and restore the automatic road only inside its disposable copy', () => {
    const real = initialState('2026-10-18');
    const preview = jumpPreview(copyPreview(real), 'ch2-neighborhood');
    const hidden = previewVisible(preview, 'ch2-neighborhood', false);
    expect(hidden.state.designs['ch2-neighborhood']).toBeUndefined();
    expect(hidden.hiddenDesigns['ch2-neighborhood']).toBe('__hidden__');
    const shown = previewVisible(hidden, 'ch2-neighborhood', true);
    expect(shown.state.designs['ch2-neighborhood']).toBe('reveal');
    expect(real.designs['ch2-neighborhood']).toBeUndefined();
  });

  it('makes all existing projects and Chapter 2 completion available in the final scenario', () => {
    const preview = scenarioPreview('all', '2026-10-18');
    expect(preview.stars).toBe(200);
    expect(preview.state.designs['ch2-neighbor-4']).toBeDefined();
    expect(preview.state.designs['ch2-landmark']).toBeDefined();
    expect(preview.state.chapterNotices).toEqual({ neighborhoodSeen: true, completeSeen: true });
  });

  it('replays a selected chapter notice in preview without changing the genuine profile', () => {
    const real = initialState('2026-10-18');
    const ready = scenarioPreview('complete', '2026-10-18');
    const replay = previewNotice(ready, 'neighborhood');
    expect(replay.state.chapterNotices.neighborhoodSeen).toBe(false);
    expect(replay.state.chapterNotices.completeSeen).toBe(true);
    expect(replay.stars).toBe(200);
    expect(real.chapterNotices).toEqual({ neighborhoodSeen: false, completeSeen: false });
  });
});
