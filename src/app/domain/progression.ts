import { AppState, Choice, Project } from './models';
import { lifetimeStars } from './habits';
const choice = (id: string, name: string, description: string, color: string): Choice => ({
  id,
  name,
  description,
  color,
});
export const PROJECTS: Project[] = [
  {
    id: 'home',
    name: 'A place to begin',
    threshold: 0,
    icon: 'home',
    description: 'Your first home. A small beginning with room to grow.',
    choices: [
      choice(
        'sage',
        'Sage cottage',
        'Soft green siding, a slate roof and warm white trim.',
        '#8eaa93',
      ),
      choice('cream', 'Warm linen', 'Cream siding with a weathered terracotta roof.', '#e0d3b6'),
      choice('blue', 'Coastal blue', 'Dusty blue siding and a charcoal roof.', '#8da9b6'),
    ],
  },
  {
    id: 'backyard',
    name: 'Your backyard retreat',
    threshold: 5,
    icon: 'sun',
    description: 'Make a little space for the things that make you happy.',
    choices: [
      choice('pool', 'Quiet waters', 'A blue plunge pool with a stone surround.', '#8dbfc4'),
      choice(
        'fort',
        'Woodland fort',
        'A cedar play fort, ladder and tiny pitched roof.',
        '#b58c61',
      ),
      choice(
        'trampoline',
        'A little lift',
        'A garden trampoline with a soft safety net.',
        '#8faaa1',
      ),
    ],
  },
  {
    id: 'exterior',
    name: 'A fresh welcome',
    threshold: 12,
    icon: 'paint',
    description: 'A new roof and thoughtful details for your little home.',
    choices: [
      choice(
        'clay',
        'Terracotta',
        'A warm clay roof, copper planters and a welcoming bench.',
        '#ad725c',
      ),
      choice(
        'slate',
        'Evening slate',
        'A deep blue-grey roof and lavender at the doorstep.',
        '#657682',
      ),
      choice(
        'moss',
        'Forest green',
        'A muted moss roof with terracotta pots and a bench.',
        '#6e8065',
      ),
    ],
  },
  {
    id: 'neighbor',
    name: 'Hello, neighbor',
    threshold: 24,
    icon: 'home',
    description: 'Another porch. Another patch of garden. Your street is growing.',
    choices: [
      choice('cream', 'Buttercream', 'A cream bungalow with a russet roof.', '#ddcda8'),
      choice('rose', 'Rosewood', 'Muted rose siding with a charcoal roof.', '#b99386'),
      choice('blue', 'Bluebell', 'Powder blue siding with warm white trim.', '#92aab7'),
    ],
  },
  {
    id: 'garden',
    name: 'Room to bloom',
    threshold: 40,
    icon: 'leaf',
    description: 'Turn the corner of your street into a lush pocket garden.',
    choices: [
      choice(
        'meadow',
        'Wildflower meadow',
        'Daisies, tall grasses and a quiet garden seat.',
        '#bdbe87',
      ),
      choice(
        'orchard',
        'Little orchard',
        'Fruit trees and raised beds along a gravel path.',
        '#9fae70',
      ),
      choice('roses', 'Rose garden', 'Rose beds, clipped hedges and a timber pergola.', '#c38f9b'),
    ],
  },
  {
    id: 'street',
    name: 'The scenic route',
    threshold: 60,
    icon: 'road',
    description: 'A few everyday details make this feel like home.',
    choices: [
      choice(
        'lanterns',
        'Lantern walk',
        'Warm street lamps, stone planters and timber benches.',
        '#c5b48f',
      ),
      choice('avenue', 'Leafy avenue', 'An avenue of shade trees and planted verges.', '#91a675'),
      choice(
        'flowers',
        'Flower lane',
        'Bright flower planters, benches and welcoming lights.',
        '#c49f9d',
      ),
    ],
  },
  {
    id: 'house2',
    name: 'Good company',
    threshold: 85,
    icon: 'home',
    description: 'A third home brings a little more life to the neighborhood.',
    choices: [
      choice(
        'cream',
        'Linen house',
        'Pale plaster, a clay roof and deep green shutters.',
        '#ded2b8',
      ),
      choice('sage', 'Garden house', 'Soft sage siding and a slate roof.', '#98ad94'),
      choice('blue', 'Harbor house', 'Blue-grey siding and a charcoal roof.', '#8fa4b5'),
    ],
  },
  {
    id: 'circle',
    name: 'Our little cul-de-sac',
    threshold: 115,
    icon: 'tree',
    description: 'A peaceful turning circle. A place your good habits built.',
    choices: [
      choice('oak', 'The old oak', 'A broad oak in a planted turning-circle island.', '#8b9b6b'),
      choice('fountain', 'Water garden', 'A small stone fountain framed by flowers.', '#9eb8b5'),
      choice(
        'gazebo',
        'Gathering place',
        'A timber gazebo with a pitched roof and garden seats.',
        '#b99c7e',
      ),
    ],
  },
];
export function unlockedProjects(state: AppState): Project[] {
  return PROJECTS.filter((p) => lifetimeStars(state) >= p.threshold);
}
export function selectDesign(state: AppState, projectId: string, choiceId: string): AppState {
  const p = unlockedProjects(state).find((p) => p.id === projectId);
  if (!p || !p.choices.some((c) => c.id === choiceId))
    throw new Error('That design is not available yet.');
  return { ...state, designs: { ...state.designs, [projectId]: choiceId } };
}
