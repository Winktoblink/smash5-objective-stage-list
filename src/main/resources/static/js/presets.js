// Criteria presets: ready-made answers to "what do I want from a stage?". These are not stage lists.
// They use the page's plain terms (see toCriteria in criteria.js).

export const CRITERIA_PRESETS = [
  {
    id: 'classic-competitive',
    name: 'Classic competitive',
    description: 'Two ledges, symmetrical, and none of the hazards that tournaments usually ban.',
    plain: {
      ledgeCount: { min: 2, max: 2 },
      features: {
        walkOffs: false, wallInfinite: false, random: false, water: false,
        symmetry: true, transform: false, ice: false, hurtBox: false,
      },
    },
  },
];
