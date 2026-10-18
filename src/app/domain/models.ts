export type Difficulty = 'easy' | 'moderate' | 'hard';
export type Frequency = 'daily' | 'weekdays' | 'weekly' | 'once';
export type Lighting = 'auto' | 'sunrise' | 'day' | 'sunset' | 'night';
export interface Schedule {
  kind: Frequency;
  days: number[];
}
export interface Habit {
  id: string;
  name: string;
  difficulty: Difficulty;
  schedule: Schedule;
  createdOn: string;
  eligibleOn: string;
  active: boolean;
  archived: boolean;
}
export interface Completion {
  id: string;
  habitId: string;
  name: string;
  difficulty: Difficulty;
  date: string;
  period: string;
  stars: number;
}
export interface CameraState {
  x: number;
  z: number;
  zoom: number;
  angle: number;
}
export interface Preferences {
  panelOpen: boolean;
  lighting: Lighting;
  camera: CameraState;
}
export interface AppState {
  version: 3;
  onboarding: { firstHomeUnlocked: boolean };
  habits: Habit[];
  completions: Completion[];
  designs: Record<string, string>;
  /** Legacy milestone access captured during the v2 → v3 migration. */
  legacyUnlocks: string[];
  preferences: Preferences;
}
export interface HabitInput {
  name: string;
  difficulty: Difficulty;
  schedule: Schedule;
  active: boolean;
}
export interface Choice {
  id: string;
  name: string;
  description: string;
  color: string;
  set?: 'A' | 'B' | 'C';
}
export interface Project {
  id: string;
  name: string;
  threshold: number;
  description: string;
  icon: string;
  choices: Choice[];
  /** Stable lot region used by the renderer and camera focus. */
  zone?: string;
  /** Legacy projects remain available to migrated profiles only. */
  legacy?: boolean;
}
