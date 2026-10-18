import { AppState, Choice, Project } from './models';
import { lifetimeStars } from './habits';

const choice = (
  id: string,
  name: string,
  description: string,
  color: string,
  set?: 'A' | 'B' | 'C',
): Choice => ({ id, name, description, color, set });

export const CHAPTER_COMPLETE_THRESHOLD = 100;
export const CHAPTER_TWO_START_THRESHOLD = 100;
export const CHAPTER_TWO_COMPLETE_THRESHOLD = 200;

export function chapterLotVisible(
  stars: number,
  designs: Readonly<Record<string, string>>,
): boolean {
  return stars >= CHAPTER_COMPLETE_THRESHOLD && !designs['neighbor'];
}

/** The current, continuous original-home progression. */
export const PROJECTS: Project[] = [
  {
    id: 'home',
    name: 'Your First Home',
    threshold: 0,
    icon: 'home',
    zone: 'home',
    description: 'Your first healthy step unlocks a home. Choose where your story begins.',
    choices: [
      choice(
        'sage',
        'Classic Cottage',
        'Cream clapboard, dark shingles, twin dormers and a welcoming white porch.',
        '#d7d0ba',
        'A',
      ),
      choice(
        'cream',
        'Modern Craftsman',
        'Warm timber, layered gables and stone porch supports.',
        '#ae8b62',
        'B',
      ),
      choice(
        'blue',
        'Traditional Brick',
        'Warm brick, charcoal shingles, white trim and a classic entrance.',
        '#a66f55',
        'C',
      ),
    ],
  },
  {
    id: 'frontGarden',
    name: 'A Garden at the Door',
    threshold: 10,
    icon: 'leaf',
    zone: 'front-garden',
    description: 'A welcoming planting bed brings color to the front of your home.',
    choices: [
      choice(
        'roses',
        'Red Rose Bushes',
        'A low, full border of classic red roses.',
        '#a75654',
        'A',
      ),
      choice(
        'orange',
        'Orange Flowering Bushes',
        'Warm orange blossoms and deep green foliage.',
        '#d18a50',
        'B',
      ),
      choice(
        'blue',
        'Blue Flowering Bushes',
        'Cool blue flowers softened by leafy groundcover.',
        '#7f97aa',
        'C',
      ),
    ],
  },
  {
    id: 'centerpiece',
    name: 'A Garden Centerpiece',
    threshold: 20,
    icon: 'tree',
    zone: 'centerpiece',
    description: 'A small feature gives the front garden a quiet focal point.',
    choices: [
      choice(
        'floweringTree',
        'Flowering Ornamental Tree',
        'A softly flowering tree in a neat garden bed.',
        '#c18c8b',
        'A',
      ),
      choice(
        'fountain',
        'Small Stone Fountain',
        'A modest carved-stone fountain ringed with planting.',
        '#a6ada1',
        'B',
      ),
      choice(
        'birdbath',
        'Birdbath and Garden Bed',
        'A stone birdbath with a compact flowering border.',
        '#98a596',
        'C',
      ),
    ],
  },
  {
    id: 'backyard',
    name: 'A Backyard Favorite',
    threshold: 30,
    icon: 'sun',
    zone: 'backyard-attraction',
    description: 'Make a little space for play and the things that make you happy.',
    choices: [
      choice('pool', 'Swimming Pool', 'A blue plunge pool with a stone surround.', '#8dbfc4', 'A'),
      choice(
        'trampoline',
        'Residential Trampoline',
        'A garden trampoline with a soft safety net.',
        '#8faaa1',
        'B',
      ),
      choice(
        'fort',
        'Wooden Play Fort',
        'A cedar play fort, ladder and tiny pitched roof.',
        '#b58c61',
        'C',
      ),
    ],
  },
  {
    id: 'porch',
    name: 'A Welcoming Porch',
    threshold: 40,
    icon: 'home',
    zone: 'porch',
    description: 'Thoughtful seating and a little planting make the entry feel like yours.',
    choices: [
      choice(
        'rockingChairs',
        'Rocking Chairs and Planters',
        'A pair of wooden rockers with seasonal porch planters.',
        '#aa8664',
        'A',
      ),
      choice(
        'porchSwing',
        'Porch Swing and Planters',
        'A timber swing and coordinated porch planters.',
        '#ad9273',
        'B',
      ),
      choice(
        'benchLanterns',
        'Bench and Lanterns',
        'A simple entry bench with warm, low-glare lanterns.',
        '#c49e6d',
        'C',
      ),
    ],
  },
  {
    id: 'retreat',
    name: 'A Place to Unwind',
    threshold: 50,
    icon: 'leaf',
    zone: 'backyard-retreat',
    description: 'Create a peaceful outdoor place to pause and enjoy the garden.',
    choices: [
      choice(
        'pergolaSeating',
        'Pergola Seating',
        'A compact cedar pergola over a small seating nook.',
        '#a98b68',
        'A',
      ),
      choice(
        'stonePatio',
        'Stone Patio Seating',
        'A neat stone terrace with a comfortable table and chairs.',
        '#a5a195',
        'B',
      ),
      choice(
        'gardenLounge',
        'Garden Lounge',
        'A leafy lounge nook with a small outdoor settee.',
        '#8f9f8c',
        'C',
      ),
    ],
  },
  {
    id: 'gardenExpansion',
    name: 'Room to Bloom',
    threshold: 60,
    icon: 'leaf',
    zone: 'garden-expansion',
    description: 'Extend the planting around your home with a complete garden composition.',
    choices: [
      choice(
        'flowerBeds',
        'Colorful Flowering Beds',
        'Layered perennial beds with a gentle mix of color.',
        '#c58d81',
        'A',
      ),
      choice(
        'evergreenShrubs',
        'Evergreen Shrubs',
        'Structured evergreen planting with soft groundcover.',
        '#87967b',
        'B',
      ),
      choice(
        'wildflowerBeds',
        'Natural Wildflower Beds',
        'A loose, natural border of grasses and wildflowers.',
        '#a9a075',
        'C',
      ),
    ],
  },
  {
    id: 'boundary',
    name: 'A Gentle Property Edge',
    threshold: 70,
    icon: 'home',
    zone: 'boundary',
    description: 'A quiet, welcoming boundary ties the garden together.',
    choices: [
      choice(
        'picketFence',
        'Picket Fence',
        'A low painted fence with an open garden gate.',
        '#e4e0d2',
        'A',
      ),
      choice(
        'trimmedHedge',
        'Trimmed Hedge',
        'A tidy, low green hedge around the property.',
        '#657b57',
        'B',
      ),
      choice(
        'stoneWall',
        'Low Stone Wall',
        'A modest dry-stone edge with softened planting.',
        '#aaa395',
        'C',
      ),
    ],
  },
  {
    id: 'outdoorLighting',
    name: 'A Warm Welcome After Dark',
    threshold: 80,
    icon: 'sun',
    zone: 'outdoor-lighting',
    description: 'Low, warm lighting makes the garden welcoming in the evening.',
    choices: [
      choice(
        'stringLights',
        'Overhead String Lights',
        'A modest strand of warm lights above the backyard retreat.',
        '#d6b980',
        'A',
      ),
      choice(
        'gardenTorches',
        'Garden Torches',
        'A few restrained, warm garden lanterns along the path.',
        '#c88b5e',
        'B',
      ),
      choice(
        'wallSconces',
        'Pathway Lanterns',
        'Warm, low-intensity lights along the front walk and garden path.',
        '#ddbd80',
        'C',
      ),
    ],
  },
  {
    id: 'signature',
    name: 'Your Garden Signature',
    threshold: 90,
    icon: 'tree',
    zone: 'signature',
    description: 'Finish your original home with one small, special garden feature.',
    choices: [
      choice(
        'pond',
        'Decorative Pond',
        'A small stone-edged pond with quiet water and planting.',
        '#7fa8a4',
        'A',
      ),
      choice(
        'gazebo',
        'Garden Gazebo',
        'A compact timber gazebo tucked into the garden.',
        '#ad9273',
        'B',
      ),
      choice(
        'displayGarden',
        'Ornamental Display Garden',
        'A shaped planting bed with a stone focal point.',
        '#a4a079',
        'C',
      ),
    ],
  },
];

/** Selectable Chapter 2 projects. The 100- and 200-star events are automatic, not purchases. */
export const CHAPTER_TWO_PROJECTS: Project[] = [
  {
    id: 'ch2-neighbor-1',
    name: 'First Neighbor',
    threshold: 110,
    icon: 'home',
    zone: 'ch2-lot-1',
    chapter: 2,
    lot: 'compact',
    description: 'Welcome a compact single-story cottage, craftsman, or brick home to the street.',
    choices: [
      choice(
        'cottage',
        'Classic Cottage',
        'Cream siding, a dark roof, and a welcoming porch.',
        '#d7d0ba',
        'A',
      ),
      choice(
        'craftsman',
        'Modern Craftsman',
        'Warm wood, layered gables, and stone accents.',
        '#ae8b62',
        'B',
      ),
      choice(
        'brick',
        'Traditional Brick',
        'Warm brick, charcoal shingles, and white trim.',
        '#a66f55',
        'C',
      ),
    ],
  },
  {
    id: 'ch2-street-trees',
    name: 'Street Trees',
    threshold: 120,
    icon: 'tree',
    zone: 'ch2-street-trees',
    chapter: 2,
    description: 'Bring a gentle rhythm of seasonal color and shade to the neighborhood road.',
    choices: [
      choice(
        'flowering-trees',
        'Flowering Trees',
        'Soft spring blooms among green leaves.',
        '#b995a7',
        'A',
      ),
      choice(
        'autumn-maples',
        'Autumn Maples',
        'Warm amber and russet leaves for the street.',
        '#c3834f',
        'B',
      ),
      choice(
        'evergreens',
        'Evergreens',
        'Quiet evergreen forms through every season.',
        '#6f806a',
        'C',
      ),
    ],
  },
  {
    id: 'ch2-neighbor-2',
    name: 'Second Neighbor',
    threshold: 130,
    icon: 'home',
    zone: 'ch2-lot-2',
    chapter: 2,
    lot: 'l-shaped',
    description: 'Add a medium L-shaped family home with a connected driveway.',
    choices: [
      choice(
        'cottage',
        'Classic Cottage',
        'Cream siding, a dark roof, and a welcoming porch.',
        '#d7d0ba',
        'A',
      ),
      choice(
        'craftsman',
        'Modern Craftsman',
        'Warm wood, layered gables, and stone accents.',
        '#ae8b62',
        'B',
      ),
      choice(
        'brick',
        'Traditional Brick',
        'Warm brick, charcoal shingles, and white trim.',
        '#a66f55',
        'C',
      ),
    ],
  },
  {
    id: 'ch2-gardens',
    name: 'Streetside Gardens',
    threshold: 140,
    icon: 'leaf',
    zone: 'ch2-gardens',
    chapter: 2,
    description: 'Layer flowers, shrubs, or grasses along the sidewalks and planted verges.',
    choices: [
      choice(
        'flowering-borders',
        'Flowering Borders',
        'Low beds with a calm mix of seasonal flowers.',
        '#c58d81',
        'A',
      ),
      choice(
        'decorative-shrubs',
        'Decorative Shrubs',
        'Rounded shrubs with restrained accent blooms.',
        '#87967b',
        'B',
      ),
      choice(
        'ornamental-grasses',
        'Ornamental Grasses',
        'Soft grasses and small blue flower accents.',
        '#a9a075',
        'C',
      ),
    ],
  },
  {
    id: 'ch2-neighbor-3',
    name: 'Third Neighbor',
    threshold: 150,
    icon: 'home',
    zone: 'ch2-lot-3',
    chapter: 2,
    lot: 'two-story',
    description: 'Add a larger two-story home with a broad porch and a distinct roofline.',
    choices: [
      choice(
        'cottage',
        'Classic Cottage',
        'Cream siding, a dark roof, and a welcoming porch.',
        '#d7d0ba',
        'A',
      ),
      choice(
        'craftsman',
        'Modern Craftsman',
        'Warm wood, layered gables, and stone accents.',
        '#ae8b62',
        'B',
      ),
      choice(
        'brick',
        'Traditional Brick',
        'Warm brick, charcoal shingles, and white trim.',
        '#a66f55',
        'C',
      ),
    ],
  },
  {
    id: 'ch2-entrance',
    name: 'Neighborhood Entrance',
    threshold: 160,
    icon: 'home',
    zone: 'ch2-entrance',
    chapter: 2,
    description: 'Give the western entry a warm welcome for the neighborhood.',
    choices: [
      choice(
        'stone-pillars',
        'Stone Pillars',
        'Paired stone posts frame the entry walk.',
        '#aaa395',
        'A',
      ),
      choice(
        'flowering-entrance',
        'Flowering Entrance',
        'A planted entry with flowering borders.',
        '#c58d81',
        'B',
      ),
      choice(
        'timber-sign',
        'Timber Welcome Sign',
        'A simple timber sign with soft landscaping.',
        '#ad9273',
        'C',
      ),
    ],
  },
  {
    id: 'ch2-neighbor-4',
    name: 'Fourth Neighbor',
    threshold: 170,
    icon: 'home',
    zone: 'ch2-lot-4',
    chapter: 2,
    lot: 'wide-gable',
    description: 'Complete the residential street with a wide-gable family home.',
    choices: [
      choice(
        'cottage',
        'Classic Cottage',
        'Cream siding, a dark roof, and a welcoming porch.',
        '#d7d0ba',
        'A',
      ),
      choice(
        'craftsman',
        'Modern Craftsman',
        'Warm wood, layered gables, and stone accents.',
        '#ae8b62',
        'B',
      ),
      choice(
        'brick',
        'Traditional Brick',
        'Warm brick, charcoal shingles, and white trim.',
        '#a66f55',
        'C',
      ),
    ],
  },
  {
    id: 'ch2-community-park',
    name: 'Community Park',
    threshold: 180,
    icon: 'tree',
    zone: 'ch2-community-park',
    chapter: 2,
    description: 'Create a shared place to pause, play, and enjoy the neighborhood.',
    choices: [
      choice(
        'flower-garden',
        'Flower Garden',
        'A garden walk with a quiet place to sit.',
        '#c58d81',
        'A',
      ),
      choice(
        'playground',
        'Woodland Playground',
        'A small timber play structure among trees.',
        '#ad9273',
        'B',
      ),
      choice(
        'picnic-grove',
        'Picnic Grove',
        'A shaded grove with picnic tables and paths.',
        '#87967b',
        'C',
      ),
    ],
  },
  {
    id: 'ch2-landmark',
    name: 'Neighborhood Landmark',
    threshold: 190,
    icon: 'tree',
    zone: 'ch2-landmark',
    chapter: 2,
    description: 'Finish the street with a small landmark in its own landscaped square.',
    choices: [
      choice(
        'fountain-plaza',
        'Fountain Plaza',
        'A modest stone fountain in a planted plaza.',
        '#9eb8b5',
        'A',
      ),
      choice(
        'neighborhood-gazebo',
        'Neighborhood Gazebo',
        'A cozy timber gazebo with garden seating.',
        '#ad9273',
        'B',
      ),
      choice(
        'natural-stone',
        'Natural Stone Monument',
        'A few substantial stones among grasses and low lights.',
        '#aaa395',
        'C',
      ),
    ],
  },
];

/** Complete selectable catalog for unlock, selection, rendering and preview lookups. */
export const ALL_PROJECTS: Project[] = [...PROJECTS, ...CHAPTER_TWO_PROJECTS];

/** Previous catalog retained solely for players who had already earned it. */
export const LEGACY_PROJECTS: Project[] = [
  {
    id: 'exterior',
    name: 'A Fresh Welcome',
    threshold: 12,
    icon: 'paint',
    description: 'A new roof and thoughtful details for your little home.',
    legacy: true,
    choices: [
      choice(
        'clay',
        'Terracotta',
        'A warm clay roof, copper planters and a welcoming bench.',
        '#ad725c',
      ),
      choice(
        'slate',
        'Evening Slate',
        'A deep blue-grey roof and lavender at the doorstep.',
        '#657682',
      ),
      choice(
        'moss',
        'Forest Green',
        'A muted moss roof with terracotta pots and a bench.',
        '#6e8065',
      ),
    ],
  },
  {
    id: 'neighbor',
    name: 'Hello, Neighbor',
    threshold: 24,
    icon: 'home',
    description: 'Another porch. Another patch of garden. Your street is growing.',
    legacy: true,
    choices: [
      choice('cream', 'Buttercream', 'A cream bungalow with a russet roof.', '#ddcda8'),
      choice('rose', 'Rosewood', 'Muted rose siding with a charcoal roof.', '#b99386'),
      choice('blue', 'Bluebell', 'Powder blue siding with warm white trim.', '#92aab7'),
    ],
  },
  {
    id: 'garden',
    name: 'Room to Bloom',
    threshold: 40,
    icon: 'leaf',
    description: 'Turn the corner of your street into a lush pocket garden.',
    legacy: true,
    choices: [
      choice(
        'meadow',
        'Wildflower Meadow',
        'Daisies, tall grasses and a quiet garden seat.',
        '#bdbe87',
      ),
      choice(
        'orchard',
        'Little Orchard',
        'Fruit trees and raised beds along a gravel path.',
        '#9fae70',
      ),
      choice('roses', 'Rose Garden', 'Rose beds, clipped hedges and a timber pergola.', '#c38f9b'),
    ],
  },
  {
    id: 'street',
    name: 'The Scenic Route',
    threshold: 60,
    icon: 'road',
    description: 'A few everyday details make this feel like home.',
    legacy: true,
    choices: [
      choice(
        'lanterns',
        'Lantern Walk',
        'Warm street lamps, stone planters and timber benches.',
        '#c5b48f',
      ),
      choice('avenue', 'Leafy Avenue', 'An avenue of shade trees and planted verges.', '#91a675'),
      choice(
        'flowers',
        'Flower Lane',
        'Bright flower planters, benches and welcoming lights.',
        '#c49f9d',
      ),
    ],
  },
  {
    id: 'house2',
    name: 'Good Company',
    threshold: 85,
    icon: 'home',
    description: 'A third home brings a little more life to the neighborhood.',
    legacy: true,
    choices: [
      choice(
        'cream',
        'Linen House',
        'Pale plaster, a clay roof and deep green shutters.',
        '#ded2b8',
      ),
      choice('sage', 'Garden House', 'Soft sage siding and a slate roof.', '#98ad94'),
      choice('blue', 'Harbor House', 'Blue-grey siding and a charcoal roof.', '#8fa4b5'),
    ],
  },
  {
    id: 'circle',
    name: 'Our Little Cul-de-sac',
    threshold: 115,
    icon: 'tree',
    description: 'A peaceful turning circle. A place your good habits built.',
    legacy: true,
    choices: [
      choice('oak', 'The Old Oak', 'A broad oak in a planted turning-circle island.', '#8b9b6b'),
      choice('fountain', 'Water Garden', 'A small stone fountain framed by flowers.', '#9eb8b5'),
      choice(
        'gazebo',
        'Gathering Place',
        'A timber gazebo with a pitched roof and garden seats.',
        '#b99c7e',
      ),
    ],
  },
];

/** Legacy unlock thresholds are frozen so migration preserves earned access exactly. */
export const LEGACY_UNLOCK_THRESHOLDS: Readonly<Record<string, number>> = {
  backyard: 5,
  ...Object.fromEntries(LEGACY_PROJECTS.map(({ id, threshold }) => [id, threshold])),
};

export function legacyUnlocksFor(state: AppState): string[] {
  const stars = lifetimeStars(state);
  return Object.entries(LEGACY_UNLOCK_THRESHOLDS)
    .filter(([id, threshold]) => stars >= threshold || Object.hasOwn(state.designs || {}, id))
    .map(([id]) => id);
}

export function isProjectUnlocked(
  state: AppState,
  project: Project,
  stars = lifetimeStars(state),
): boolean {
  if (project.id === 'home') return state.onboarding.firstHomeUnlocked;
  if (project.legacy) return state.legacyUnlocks?.includes(project.id) ?? false;
  if (state.legacyUnlocks?.includes(project.id)) return true;
  return stars >= project.threshold;
}

export function unlockedProjects(state: AppState, stars = lifetimeStars(state)): Project[] {
  return [...ALL_PROJECTS, ...LEGACY_PROJECTS].filter((project) =>
    isProjectUnlocked(state, project, stars),
  );
}

export function selectDesign(state: AppState, projectId: string, choiceId: string): AppState {
  const project = [...ALL_PROJECTS, ...LEGACY_PROJECTS].find(
    (candidate) => candidate.id === projectId,
  );
  if (
    !project ||
    !isProjectUnlocked(state, project) ||
    !project.choices.some((candidate) => candidate.id === choiceId)
  ) {
    throw new Error('That design is not available yet.');
  }
  return { ...state, designs: { ...state.designs, [projectId]: choiceId } };
}
