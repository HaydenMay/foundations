import { AppState } from './models';
import { createHabit, STAR_VALUES, validateInput } from './habits';
import { isDate, weekStart } from './dates';
import { selectDesign } from './progression';
export const STORAGE_KEY = 'foundations.v1';
export function initialState(date: string): AppState {
  return {
    version: 1,
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
    designs: { home: 'sage' },
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
      'This is not a valid Foundations v1 backup. Your current data has not changed.',
    );
}
export function importState(json: string): AppState {
  requireValid(typeof json === 'string' && json.length <= 5_000_000);
  const s = JSON.parse(json) as AppState;
  requireValid(
    s &&
      s.version === 1 &&
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
      Math.abs(camera.x) <= 18 &&
      Math.abs(camera.z) <= 18 &&
      camera.zoom >= 0.5 &&
      camera.zoom <= 2.5 &&
      Math.abs(camera.angle) <= Math.PI * 100,
  );
  requireValid(s.designs && typeof s.designs === 'object' && !Array.isArray(s.designs));
  for (const [id, choice] of Object.entries(s.designs)) selectDesign(s, id, choice);
  requireValid(Object.hasOwn(s.designs, 'home'));
  // Parse into a fresh object so the caller cannot mutate a previously validated backup.
  return structuredClone(s);
}
