import { AppState } from './models';
import { completeHabit, lifetimeStars } from './habits';
import { initialState } from './state';
import {
  CHAPTER_COMPLETE_THRESHOLD,
  CHAPTER_FOUR_START_THRESHOLD,
  CHAPTER_THREE_COMPLETE_THRESHOLD,
  CHAPTER_THREE_START_THRESHOLD,
  CHAPTER_TWO_COMPLETE_THRESHOLD,
  CHAPTER_TWO_START_THRESHOLD,
  ALL_PROJECTS,
  LEGACY_PROJECTS,
  LEGACY_UNLOCK_THRESHOLDS,
  PROJECTS,
  selectDesign,
} from './progression';
import { Project } from './models';
import type { ChapterNotice } from './chapter-notices';

export type PreviewScenario =
  | 'new'
  | 'ready'
  | 'home'
  | 'several'
  | 'neighborhood'
  | 'chapter-two'
  | 'complete'
  | 'city-start'
  | 'town-center'
  | 'monorail-city'
  | 'all';
export interface PreviewSession {
  state: AppState;
  stars: number;
  hiddenDesigns: Record<string, string>;
}
export function copyPreview(real: AppState): PreviewSession {
  return {
    state: structuredClone(real),
    stars: lifetimeStars(real),
    hiddenDesigns: { ...real.designs },
  };
}
export function previewStars(session: PreviewSession, stars: number): PreviewSession {
  if (!Number.isInteger(stars) || stars < 0 || stars > 100000)
    throw new Error('Use a whole simulated star total from 0 to 100,000.');
  return { ...session, stars };
}
export function previewNotice(session: PreviewSession, notice: ChapterNotice): PreviewSession {
  const flag = {
    neighborhood: 'neighborhoodSeen',
    complete: 'completeSeen',
    'city-center': 'cityCenterSeen',
    'city-complete': 'cityCompleteSeen',
    monorail: 'monorailSeen',
  }[notice] as keyof AppState['chapterNotices'];
  return {
    ...session,
    state: {
      ...session.state,
      chapterNotices: {
        ...session.state.chapterNotices,
        [flag]: false,
      },
    },
  };
}
export function previewDesign(
  session: PreviewSession,
  project: string,
  choice: string,
): PreviewSession {
  const definition = [...ALL_PROJECTS, ...LEGACY_PROJECTS].find((p) => p.id === project);
  if (!definition?.choices.some((c) => c.id === choice))
    throw new Error('Choose an existing preview design.');
  return {
    ...session,
    state: {
      ...session.state,
      onboarding: {
        ...session.state.onboarding,
        firstHomeUnlocked: project === 'home' || session.state.onboarding.firstHomeUnlocked,
      },
      designs: { ...session.state.designs, [project]: choice },
      legacyUnlocks: definition.legacy
        ? [...new Set([...session.state.legacyUnlocks, project])]
        : session.state.legacyUnlocks,
    },
    hiddenDesigns: { ...session.hiddenDesigns, [project]: choice },
  };
}
export function previewVisible(
  session: PreviewSession,
  project: string,
  visible: boolean,
): PreviewSession {
  if (
    project !== 'chapter' &&
    project !== 'ch2-neighborhood' &&
    ![...ALL_PROJECTS, ...LEGACY_PROJECTS].some((definition) => definition.id === project)
  )
    throw new Error('Choose an existing preview project.');
  if (project === 'chapter' || project === 'ch2-neighborhood') {
    const hiddenDesigns = { ...session.hiddenDesigns };
    if (visible) delete hiddenDesigns[project];
    else hiddenDesigns[project] = '__hidden__';
    if (project === 'ch2-neighborhood') {
      const designs = { ...session.state.designs };
      if (visible) designs[project] = 'reveal';
      else delete designs[project];
      return { ...session, state: { ...session.state, designs }, hiddenDesigns };
    }
    return { ...session, hiddenDesigns };
  }
  if (visible)
    return previewDesign(
      session,
      project,
      session.hiddenDesigns[project] ||
        [...ALL_PROJECTS, ...LEGACY_PROJECTS].find((p) => p.id === project)!.choices[0].id,
    );
  const designs = { ...session.state.designs };
  delete designs[project];
  return {
    ...session,
    state: { ...session.state, designs },
    hiddenDesigns: { ...session.hiddenDesigns, ...session.state.designs },
  };
}
export function jumpPreview(session: PreviewSession, projectId: string): PreviewSession {
  const target: Project | undefined =
    projectId === 'chapter'
      ? {
          id: 'chapter',
          name: 'Chapter complete',
          threshold: CHAPTER_COMPLETE_THRESHOLD,
          description: 'Reveal the next empty lot.',
          icon: 'home',
          choices: [],
        }
      : projectId === 'ch2-neighborhood'
        ? {
            id: 'ch2-neighborhood',
            name: 'Chapter 2 · Neighborhood',
            threshold: CHAPTER_TWO_START_THRESHOLD,
            description: 'Reveal the continuous neighborhood road and reserved home lots.',
            icon: 'road',
            choices: [],
          }
        : projectId === 'ch2-complete'
          ? {
              id: 'ch2-complete',
              name: 'Chapter 2 · Complete',
              threshold: CHAPTER_TWO_COMPLETE_THRESHOLD,
              description: 'Unlock every current Chapter 2 project.',
              icon: 'tree',
              choices: [],
            }
          : projectId === 'city-center'
            ? {
                id: 'city-center',
                name: 'Chapter 3 · Town Center',
          threshold: CHAPTER_THREE_START_THRESHOLD,
                description: 'Open the connected town center beyond the neighborhood.',
                icon: 'home',
                choices: [],
              }
            : projectId === 'city-complete'
              ? {
                  id: 'city-complete',
                  name: 'Chapter 3 · Complete',
              threshold: CHAPTER_THREE_COMPLETE_THRESHOLD,
                  description: 'Unlock every current Town Center project.',
                  icon: 'tree',
                  choices: [],
                }
              : projectId === 'monorail-city'
                ? {
                    id: 'monorail-city',
                    name: 'Chapter 4 · Elevated Monorail',
                    threshold: CHAPTER_FOUR_START_THRESHOLD,
                    description: 'Unlock the complete connected city and monorail loop.',
                    icon: 'road',
                    choices: [],
                  }
          : [...ALL_PROJECTS, ...LEGACY_PROJECTS].find((p) => p.id === projectId);
  if (!target) throw new Error('Choose an existing milestone.');
  const threshold = target.threshold;
  const designs: Record<string, string> = {};
  for (const p of ALL_PROJECTS.filter((p) => p.threshold <= threshold))
    designs[p.id] = session.hiddenDesigns[p.id] || p.choices[0].id;
  const legacyUnlocks = Object.entries(LEGACY_UNLOCK_THRESHOLDS)
    .filter(([, required]) => required <= threshold)
    .map(([id]) => id);
  if (target.legacy) {
    for (const project of LEGACY_PROJECTS.filter((p) => p.threshold <= threshold)) {
      designs[project.id] = session.hiddenDesigns[project.id] || project.choices[0].id;
    }
    if (legacyUnlocks.includes('backyard') && !designs['backyard']) {
      designs['backyard'] =
        session.hiddenDesigns['backyard'] ||
        PROJECTS.find((p) => p.id === 'backyard')!.choices[0].id;
    }
  }
  if (
    threshold >= CHAPTER_TWO_START_THRESHOLD &&
    session.hiddenDesigns['ch2-neighborhood'] !== '__hidden__'
  )
    designs['ch2-neighborhood'] = 'reveal';
  if (
    threshold >= CHAPTER_THREE_START_THRESHOLD &&
    session.hiddenDesigns['city-main-street'] !== '__hidden__'
  )
    designs['city-main-street'] ||= 'bakery-row';
  if (projectId === 'chapter') designs['chapter'] = 'reveal';
  const neighborhoodSeen =
      threshold >= CHAPTER_TWO_START_THRESHOLD || session.state.chapterNotices.neighborhoodSeen,
    completeSeen =
      threshold >= CHAPTER_TWO_COMPLETE_THRESHOLD || session.state.chapterNotices.completeSeen,
    cityCenterSeen = threshold >= CHAPTER_THREE_START_THRESHOLD
      ? true
      : session.state.chapterNotices.cityCenterSeen,
    cityCompleteSeen = threshold >= CHAPTER_THREE_COMPLETE_THRESHOLD
      ? true
      : session.state.chapterNotices.cityCompleteSeen,
    monorailSeen = threshold >= CHAPTER_FOUR_START_THRESHOLD
      ? true
      : session.state.chapterNotices.monorailSeen;
  return {
    ...session,
    stars: threshold,
    state: {
      ...session.state,
      onboarding: { ...session.state.onboarding, firstHomeUnlocked: true },
      chapterNotices: {
        ...session.state.chapterNotices,
        neighborhoodSeen,
        completeSeen,
        ...(cityCenterSeen === undefined ? {} : { cityCenterSeen }),
        ...(cityCompleteSeen === undefined ? {} : { cityCompleteSeen }),
        ...(monorailSeen === undefined ? {} : { monorailSeen }),
      },
      designs,
      legacyUnlocks,
      preferences: {
        ...session.state.preferences,
        camera: {
          x: threshold >= 30 ? 3 : 0,
          z: 0,
          zoom: threshold >= 90 ? 0.6 : threshold >= 30 ? 0.8 : 1,
          angle: Math.PI / 4,
        },
      },
    },
    hiddenDesigns: { ...session.hiddenDesigns, ...designs },
  };
}
export function scenarioPreview(kind: PreviewScenario, date: string): PreviewSession {
  let state = initialState(date);
  if (kind === 'new') return copyPreview(state);
  state = completeHabit(state, state.habits[1].id, date);
  if (kind === 'ready') return copyPreview(state);
  state = selectDesign(state, 'home', 'sage');
  const session = copyPreview(state);
  if (kind === 'several') return jumpPreview(session, 'retreat');
  if (kind === 'neighborhood') return jumpPreview(session, 'ch2-neighborhood');
  if (kind === 'chapter-two') return jumpPreview(session, 'ch2-neighbor-3');
  if (kind === 'complete' || kind === 'all') return jumpPreview(session, 'ch2-complete');
  if (kind === 'city-start') return jumpPreview(session, 'city-center');
  if (kind === 'town-center') return jumpPreview(session, 'city-complete');
  if (kind === 'monorail-city') return jumpPreview(session, 'monorail-city');
  return session;
}
