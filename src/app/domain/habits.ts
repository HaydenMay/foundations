import { AppState, Habit, HabitInput } from './models';
import { isDate, nextDate, weekday, weekStart } from './dates';
export const STAR_VALUES = { easy: 1, moderate: 2, hard: 3 } as const;
export const DAILY_CAP = 10;
export function validateInput(input: HabitInput): HabitInput {
  if (
    !input ||
    typeof input.name !== 'string' ||
    !input.name.trim() ||
    input.name.trim().length > 80
  )
    throw new Error('Give your habit a name of 1–80 characters.');
  if (!Object.hasOwn(STAR_VALUES, input.difficulty)) throw new Error('Choose a valid difficulty.');
  const s = input.schedule;
  if (
    !s ||
    !['daily', 'weekdays', 'weekly', 'once'].includes(s.kind) ||
    !Array.isArray(s.days) ||
    s.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    (s.kind === 'weekdays' && !s.days.length)
  )
    throw new Error('Choose a schedule and at least one selected weekday.');
  if (typeof input.active !== 'boolean') throw new Error('Invalid active status.');
  return {
    name: input.name.trim(),
    difficulty: input.difficulty,
    schedule: { kind: s.kind, days: [...new Set(s.days)].sort() },
    active: input.active,
  };
}
export function createHabit(input: HabitInput, date: string, starter = false): Habit {
  if (!isDate(date)) throw new Error('Invalid local date.');
  return {
    ...validateInput(input),
    id: crypto.randomUUID(),
    createdOn: date,
    eligibleOn: starter ? date : nextDate(date),
    archived: false,
  };
}
export function editHabit(habit: Habit, input: HabitInput): Habit {
  return { ...habit, ...validateInput(input) };
}
export function isScheduled(habit: Habit, date: string): boolean {
  return (
    habit.active &&
    !habit.archived &&
    date >= habit.eligibleOn &&
    (habit.schedule.kind !== 'weekdays' || habit.schedule.days.includes(weekday(date)))
  );
}
export function periodFor(habit: Habit, date: string): string {
  return habit.schedule.kind === 'once'
    ? 'once'
    : habit.schedule.kind === 'weekly'
      ? `week:${weekStart(date)}`
      : date;
}
export function isCompleted(state: AppState, habit: Habit, date: string): boolean {
  const period = periodFor(habit, date);
  return state.completions.some(
    (c) =>
      c.habitId === habit.id && (c.period === 'once' || c.date === date || c.period === period),
  );
}
export function completeHabit(state: AppState, id: string, date: string): AppState {
  const habit = state.habits.find((h) => h.id === id);
  if (!isDate(date) || !habit || !isScheduled(habit, date) || isCompleted(state, habit, date))
    return state;
  const stars = Math.max(
    0,
    Math.min(STAR_VALUES[habit.difficulty], DAILY_CAP - dailyStars(state, date)),
  );
  return {
    ...state,
    onboarding: state.onboarding.firstHomeUnlocked
      ? state.onboarding
      : { ...state.onboarding, firstHomeUnlocked: true },
    completions: [
      ...state.completions,
      {
        id: crypto.randomUUID(),
        habitId: id,
        name: habit.name,
        difficulty: habit.difficulty,
        date,
        period: periodFor(habit, date),
        stars,
      },
    ],
  };
}
export function lifetimeStars(state: AppState): number {
  return state.completions.reduce((sum, c) => sum + c.stars, 0);
}
export function dailyStars(state: AppState, date: string): number {
  return state.completions.filter((c) => c.date === date).reduce((sum, c) => sum + c.stars, 0);
}
export function scheduleLabel(habit: Habit): string {
  const { kind, days } = habit.schedule;
  if (kind === 'weekdays')
    return days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
  return { daily: 'Every day', weekly: 'Once this week', once: 'One time' }[kind];
}
