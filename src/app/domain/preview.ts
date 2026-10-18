import { AppState } from './models';
import { completeHabit, lifetimeStars } from './habits';
import { initialState } from './state';
import {
  CHAPTER_COMPLETE_THRESHOLD,
  LEGACY_PROJECTS,
  LEGACY_UNLOCK_THRESHOLDS,
  PROJECTS,
  selectDesign,
} from './progression';
import { Project } from './models';

export type PreviewScenario = 'new' | 'ready' | 'home' | 'several' | 'all';
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
export function previewDesign(
  session: PreviewSession,
  project: string,
  choice: string,
): PreviewSession {
  const definition = [...PROJECTS, ...LEGACY_PROJECTS].find((p) => p.id === project);
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
  project: 'home' | 'backyard',
  visible: boolean,
): PreviewSession {
  if (visible)
    return previewDesign(
      session,
      project,
      session.hiddenDesigns[project] ||
        [...PROJECTS, ...LEGACY_PROJECTS].find((p) => p.id === project)!.choices[0].id,
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
      : [...PROJECTS, ...LEGACY_PROJECTS].find((p) => p.id === projectId);
  if (!target) throw new Error('Choose an existing milestone.');
  const threshold = target.threshold;
  const designs: Record<string, string> = {};
  for (const p of PROJECTS.filter((p) => p.threshold <= threshold))
    designs[p.id] = session.hiddenDesigns[p.id] || p.choices[0].id;
  const legacyUnlocks =
    target.legacy || target.id === 'chapter'
      ? Object.entries(LEGACY_UNLOCK_THRESHOLDS)
          .filter(([, required]) => (target.legacy ? required <= threshold : false))
          .map(([id]) => id)
      : [];
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
  return {
    ...session,
    stars: threshold,
    state: {
      ...session.state,
      onboarding: { ...session.state.onboarding, firstHomeUnlocked: true },
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
  if (kind === 'all') return jumpPreview(session, 'chapter');
  return session;
}
