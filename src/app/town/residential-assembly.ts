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
        { id: 'entry', order: 4 },
        { id: 'roofline', order: 5 },
        { id: 'garage', order: 6 },
        { id: 'details', order: 7 },
      ],
    },
    cream: {
      config: { concurrency: 2 },
      pieces: [
        { id: 'foundation', order: 1 },
        { id: 'walls', order: 2 },
        { id: 'entry', order: 3 },
        { id: 'openings', order: 4 },
        { id: 'roofline', order: 5 },
        { id: 'details', order: 6 },
        { id: 'garage', order: 7 },
      ],
    },
    blue: {
      config: { concurrency: 2 },
      pieces: [
        { id: 'foundation', order: 1 },
        { id: 'walls', order: 2 },
        { id: 'openings', order: 3 },
        { id: 'entry', order: 4 },
        { id: 'roofline', order: 5 },
        { id: 'details', order: 6 },
        { id: 'garage', order: 7 },
      ],
    },
  });
