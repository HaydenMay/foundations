import type { Page } from '@playwright/test';
import { initialState } from '../src/app/domain/state';
export function existingState(date = '2026-09-01') {
  const state = initialState(date);
  state.onboarding.firstHomeUnlocked = true;
  state.designs.home = 'sage';
  return state;
}
/** Existing-functionality suites deliberately exercise a pre-onboarding house owner. */
export async function openTown(page: Page, state: unknown = existingState()) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem('foundations.v1'))
      localStorage.setItem('foundations.v1', JSON.stringify(s));
  }, state);
  await page.goto('./');
}
