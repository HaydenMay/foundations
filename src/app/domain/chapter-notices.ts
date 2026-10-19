import { AppState } from './models';
import { lifetimeStars } from './habits';
import {
  CHAPTER_FOUR_START_THRESHOLD,
  CHAPTER_THREE_COMPLETE_THRESHOLD,
  CHAPTER_THREE_START_THRESHOLD,
  CHAPTER_TWO_COMPLETE_THRESHOLD,
  CHAPTER_TWO_START_THRESHOLD,
} from './progression';

export type ChapterNotice = 'neighborhood' | 'complete' | 'city-center' | 'city-complete' | 'monorail';

/** Returns the oldest unacknowledged notice so crossing both thresholds remains ordered. */
export function pendingChapterNotice(
  state: AppState,
  stars = lifetimeStars(state),
): ChapterNotice | undefined {
  if (stars >= CHAPTER_TWO_START_THRESHOLD && !state.chapterNotices.neighborhoodSeen)
    return 'neighborhood';
  if (stars >= CHAPTER_TWO_COMPLETE_THRESHOLD && !state.chapterNotices.completeSeen)
    return 'complete';
  if (stars >= CHAPTER_THREE_START_THRESHOLD && !state.chapterNotices.cityCenterSeen)
    return 'city-center';
  if (stars >= CHAPTER_THREE_COMPLETE_THRESHOLD && !state.chapterNotices.cityCompleteSeen)
    return 'city-complete';
  if (stars >= CHAPTER_FOUR_START_THRESHOLD && !state.chapterNotices.monorailSeen)
    return 'monorail';
  return undefined;
}

export function acknowledgeChapterNotice(state: AppState, notice: ChapterNotice): AppState {
  const flag = {
    neighborhood: 'neighborhoodSeen',
    complete: 'completeSeen',
    'city-center': 'cityCenterSeen',
    'city-complete': 'cityCompleteSeen',
    monorail: 'monorailSeen',
  }[notice] as keyof AppState['chapterNotices'];
  if (state.chapterNotices[flag]) return state;
  return {
    ...state,
    chapterNotices: {
      ...state.chapterNotices,
      [flag]: true,
    },
  };
}
