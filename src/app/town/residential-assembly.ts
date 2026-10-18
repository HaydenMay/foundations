import type { AssemblyRecipe } from './assembly';

/**
 * Residential-only choreography. IDs bind to the factory's explicit assembly references;
 * the playback controller reads only IDs, order and numeric timing.
 */
export const STARTING_HOME_ASSEMBLY_RECIPES: Readonly<Record<string, AssemblyRecipe>> =
  Object.freeze({
    sage: {
      config: { concurrency: 2 },
      pieces: [
        { id: 'foundation', order: 1 },
        { id: 'walls', order: 2 },
        { id: 'openings', order: 3 },
        { id: 'porch-deck', order: 4 },
        { id: 'porch-supports', order: 5 },
        { id: 'porch-rails', order: 6 },
        { id: 'porch-stairs', order: 7 },
        { id: 'porch-roof', order: 8 },
        { id: 'entry', order: 9 },
        { id: 'roofline', order: 10 },
        { id: 'garage', order: 11 },
        { id: 'details', order: 12 },
      ],
    },
    cream: {
      config: { concurrency: 2 },
      pieces: [
        { id: 'foundation', order: 1 },
        { id: 'walls', order: 2 },
        { id: 'openings', order: 3 },
        { id: 'porch-deck', order: 4 },
        { id: 'porch-supports', order: 5 },
        { id: 'porch-rails', order: 6 },
        { id: 'porch-stairs', order: 7 },
        { id: 'porch-roof', order: 8 },
        { id: 'entry', order: 9 },
        { id: 'roofline', order: 10 },
        { id: 'garage', order: 11 },
        { id: 'details', order: 12 },
      ],
    },
    blue: {
      config: { concurrency: 2 },
      pieces: [
        { id: 'foundation', order: 1 },
        { id: 'walls', order: 2 },
        { id: 'openings', order: 3 },
        { id: 'porch-deck', order: 4 },
        { id: 'porch-supports', order: 5 },
        { id: 'porch-rails', order: 6 },
        { id: 'porch-stairs', order: 7 },
        { id: 'porch-roof', order: 8 },
        { id: 'entry', order: 9 },
        { id: 'roofline', order: 10 },
        { id: 'garage', order: 11 },
        { id: 'details', order: 12 },
      ],
    },
  });
