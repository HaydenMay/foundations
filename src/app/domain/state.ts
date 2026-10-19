import {
  AppState,
  CAMERA_MAX_ZOOM,
  CAMERA_MIN_ZOOM,
  CAMERA_X_LIMIT,
  CAMERA_Z_LIMIT,
} from './models';
import { createHabit, lifetimeStars, STAR_VALUES, validateInput } from './habits';
import { isDate, weekStart } from './dates';
import { LEGACY_UNLOCK_THRESHOLDS, legacyUnlocksFor, selectDesign } from './progression';
export const STORAGE_KEY = 'foundations.v1';
export const MIGRATION_BACKUP_KEY = 'foundations.pre-v2';
export const MIGRATION_BACKUP_V3_KEY = 'foundations.pre-v3';
export const MIGRATION_BACKUP_V4_KEY = 'foundations.pre-v4';
export function initialState(date: string): AppState {
  return {
    version: 4,
    onboarding: { firstHomeUnlocked: false },
    chapterNotices: { neighborhoodSeen: false, completeSeen: false },
    habits: [
      createHabit(
        {
          name: 'Step outside for a little walk',
          difficulty: 'moderate',
          schedule: { kind: 'daily', days: [] },
          active: true,
        },
        date,
        true,
      ),
      createHabit(
        {
          name: 'Make a moment to unwind',
          difficulty: 'easy',
          schedule: { kind: 'daily', days: [] },
          active: true,
        },
        date,
        true,
      ),
      createHabit(
        {
          name: 'Move in a way you enjoy',
          difficulty: 'hard',
          schedule: { kind: 'daily', days: [] },
          active: true,
        },
        date,
        true,
      ),
    ],
    completions: [],
    designs: {},
    legacyUnlocks: [],
    preferences: {
      panelOpen: true,
      lighting: 'auto',
      camera: { x: 0, z: 0, zoom: 1, angle: Math.PI / 4 },
    },
  };
}
export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}
function requireValid(condition: unknown): asserts condition {
  if (!condition)
    throw new Error(
      'This is not a valid supported Foundations backup. Your current data has not changed.',
    );
}
export function importState(json: string): AppState {
  requireValid(typeof json === 'string' && json.length <= 5_000_000);
  const s = JSON.parse(json) as AppState;
  const version = (s as { version: number })?.version;
  requireValid(
    s &&
      (version === 1 || version === 2 || version === 3 || version === 4) &&
      Array.isArray(s.habits) &&
      s.habits.length <= 10000 &&
      Array.isArray(s.completions) &&
      s.completions.length <= 100000,
  );
  const ids = new Set<string>();
  for (const h of s.habits) {
    requireValid(h && typeof h.id === 'string' && h.id.length <= 100 && !ids.has(h.id));
    ids.add(h.id);
    validateInput(h);
    requireValid(
      isDate(h.createdOn) &&
        isDate(h.eligibleOn) &&
        h.eligibleOn >= h.createdOn &&
        typeof h.archived === 'boolean',
    );
  }
  const completions = new Set<string>(),
    periods = new Set<string>(),
    dates = new Set<string>();
  const daily = new Map<string, number>();
  const onceDates = new Map<string, string>(),
    latestDates = new Map<string, string>();
  for (const c of s.completions) {
    requireValid(
      c &&
        typeof c.id === 'string' &&
        c.id.length <= 100 &&
        !completions.has(c.id) &&
        ids.has(c.habitId) &&
        typeof c.name === 'string' &&
        c.name.length > 0 &&
        c.name.length <= 80,
    );
    requireValid(
      Object.hasOwn(STAR_VALUES, c.difficulty) &&
        Number.isInteger(c.stars) &&
        c.stars >= 0 &&
        c.stars <= STAR_VALUES[c.difficulty] &&
        isDate(c.date),
    );
    requireValid(
      c.period === c.date || c.period === 'once' || c.period === `week:${weekStart(c.date)}`,
    );
    const pk = `${c.habitId}/${c.period}`,
      dk = `${c.habitId}/${c.date}`;
    requireValid(!periods.has(pk) && !dates.has(dk));
    completions.add(c.id);
    periods.add(pk);
    dates.add(dk);
    daily.set(c.date, (daily.get(c.date) ?? 0) + c.stars);
    requireValid(daily.get(c.date)! <= 10);
    latestDates.set(
      c.habitId,
      c.date > (latestDates.get(c.habitId) || '') ? c.date : latestDates.get(c.habitId)!,
    );
    if (c.period === 'once') onceDates.set(c.habitId, c.date);
  }
  for (const [id, date] of onceDates) requireValid(latestDates.get(id) === date);
  const p = s.preferences,
    camera = p?.camera;
  requireValid(
    p &&
      typeof p.panelOpen === 'boolean' &&
      ['auto', 'sunrise', 'day', 'sunset', 'night'].includes(p.lighting),
  );
  requireValid(
    camera &&
      [camera.x, camera.z, camera.zoom, camera.angle].every(Number.isFinite) &&
      Math.abs(camera.x) <= CAMERA_X_LIMIT &&
      Math.abs(camera.z) <= CAMERA_Z_LIMIT &&
      camera.zoom >= CAMERA_MIN_ZOOM &&
      camera.zoom <= CAMERA_MAX_ZOOM &&
      Math.abs(camera.angle) <= Math.PI * 100,
  );
  requireValid(s.designs && typeof s.designs === 'object' && !Array.isArray(s.designs));
  if (version === 1) {
    requireValid(Object.hasOwn(s.designs, 'home'));
    // Every v1 profile already owned a home, even with no earned stars.
    s.onboarding = { ...s.onboarding, firstHomeUnlocked: true };
    s.legacyUnlocks = legacyUnlocksFor(s);
  } else {
    requireValid(
      s.onboarding &&
        typeof s.onboarding === 'object' &&
        !Array.isArray(s.onboarding) &&
        typeof s.onboarding.firstHomeUnlocked === 'boolean',
    );
    if (s.completions.length || s.designs['home']) s.onboarding.firstHomeUnlocked = true;
    if (version === 3 || version === 4) {
      const allowedLegacyIds = Object.keys(LEGACY_UNLOCK_THRESHOLDS);
      requireValid(
        Array.isArray(s.legacyUnlocks) &&
          s.legacyUnlocks.length <= allowedLegacyIds.length &&
          s.legacyUnlocks.every(
            (id, index) =>
              typeof id === 'string' &&
              allowedLegacyIds.includes(id) &&
              s.legacyUnlocks.indexOf(id) === index,
          ),
      );
    } else {
      // Freeze prior access before the new threshold schedule is applied.
      s.legacyUnlocks = legacyUnlocksFor(s);
    }
  }
  if (version < 4) {
    const stars = lifetimeStars(s);
    s.chapterNotices = {
      neighborhoodSeen: stars >= 100,
      completeSeen: stars >= 200,
      // Existing profiles predate these chapters; only record new flags when that milestone is historical.
      ...(stars >= 210 ? { cityCenterSeen: true } : {}),
      ...(stars >= 300 ? { cityCompleteSeen: true } : {}),
      ...(stars >= 400 ? { monorailSeen: true } : {}),
    };
    s.version = 4;
  } else {
    requireValid(
      s.chapterNotices &&
        typeof s.chapterNotices === 'object' &&
        typeof s.chapterNotices.neighborhoodSeen === 'boolean' &&
        typeof s.chapterNotices.completeSeen === 'boolean' &&
        (s.chapterNotices.cityCenterSeen === undefined ||
          typeof s.chapterNotices.cityCenterSeen === 'boolean') &&
        (s.chapterNotices.cityCompleteSeen === undefined ||
          typeof s.chapterNotices.cityCompleteSeen === 'boolean') &&
        (s.chapterNotices.monorailSeen === undefined ||
          typeof s.chapterNotices.monorailSeen === 'boolean'),
    );
    const stars = lifetimeStars(s);
    // Additive v4 fields default according to existing progress, preserving old-save continuity.
    if (s.chapterNotices.cityCenterSeen === undefined && stars >= 210)
      s.chapterNotices.cityCenterSeen = true;
    if (s.chapterNotices.cityCompleteSeen === undefined && stars >= 300)
      s.chapterNotices.cityCompleteSeen = true;
    if (s.chapterNotices.monorailSeen === undefined && stars >= 400)
      s.chapterNotices.monorailSeen = true;
  }
  for (const [id, choice] of Object.entries(s.designs)) selectDesign(s, id, choice);
  // Parse into a fresh object so the caller cannot mutate a previously validated backup.
  return structuredClone(s);
}
