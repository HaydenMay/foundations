import { AppState } from './models';
import { lifetimeStars } from './habits';
import { CHAPTER_TWO_COMPLETE_THRESHOLD, CHAPTER_TWO_START_THRESHOLD } from './progression';

export type ChapterNotice = 'neighborhood' | 'complete';

/** Returns the oldest unacknowledged notice so crossing both thresholds remains ordered. */
export function pendingChapterNotice(
  state: AppState,
  stars = lifetimeStars(state),
): ChapterNotice | undefined {
  if (stars >= CHAPTER_TWO_START_THRESHOLD && !state.chapterNotices.neighborhoodSeen)
    return 'neighborhood';
  if (stars >= CHAPTER_TWO_COMPLETE_THRESHOLD && !state.chapterNotices.completeSeen)
    return 'complete';
  return undefined;
}

export function acknowledgeChapterNotice(state: AppState, notice: ChapterNotice): AppState {
  if (state.chapterNotices[notice === 'neighborhood' ? 'neighborhoodSeen' : 'completeSeen'])
    return state;
  return {
    ...state,
    chapterNotices: {
      ...state.chapterNotices,
      [notice === 'neighborhood' ? 'neighborhoodSeen' : 'completeSeen']: true,
    },
  };
}
