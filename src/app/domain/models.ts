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
/** Offsets from the original home camera; bounds cover the current continuous city footprint. */
export const CAMERA_X_LIMIT = 220;
export const CAMERA_Z_LIMIT = 100;
export const CAMERA_MIN_ZOOM = 0.3;
export const CAMERA_MAX_ZOOM = 2.5;
export interface Preferences {
  panelOpen: boolean;
  lighting: Lighting;
  camera: CameraState;
}
export interface ChapterNotices {
  neighborhoodSeen: boolean;
  completeSeen: boolean;
  /** Additive notices; older version-4 saves may omit these flags. */
  cityCenterSeen?: boolean;
  cityCompleteSeen?: boolean;
  monorailSeen?: boolean;
}
export interface AppState {
  version: 4;
  onboarding: { firstHomeUnlocked: boolean };
  chapterNotices: ChapterNotices;
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
  /** Chapter metadata used for progression and preview grouping. Older projects default to Chapter 1. */
  chapter?: 1 | 2 | 3 | 4;
  /** Distinct base footprint for Chapter 2 neighbor homes. */
  lot?: 'compact' | 'l-shaped' | 'two-story' | 'wide-gable';
  /** Legacy projects remain available to migrated profiles only. */
  legacy?: boolean;
}
