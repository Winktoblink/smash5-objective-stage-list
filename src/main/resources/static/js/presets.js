// Two different kinds of preset live here and the page keeps them apart:
//  - criteria presets: ready-made answers to "what do I want from a stage?" (page plain terms, see toCriteria)
//  - stage-list presets: a real ruleset's stage list (starters, counterpicks, bans, DSR)

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

/**
 * Regional stage lists. Stages are referred to by stage id (see data/stages.json). A stage that the data
 * does not have yet is listed by name under `missing`, and the page says so.
 *
 * Every list here was read from SmashWiki, a secondary source, and has NOT been confirmed against the
 * ruleset's own document. `reviewed: false` keeps a list out of the page until the project owner approves
 * it. Add ?review=1 to the page's address to see unreviewed lists.
 *
 * `dsr` is 'none', 'dsr' or 'modified'. `bans` is how many stages the winner of a game bans.
 */
export const STAGE_LIST_PRESETS = [
  {
    id: 'una',
    name: 'Unified North American (UNA)',
    starters: [5, 22, 96, 84], // Battlefield, Final Destination, Town & City, Small Battlefield
    counterpicks: [74, 85, 43], // Pokémon Stadium 2, Smashville, Kalos Pokémon League
    missing: { starters: ['Hollow Bastion'], counterpicks: [] },
    bans: 2,
    dsr: 'modified',
    source: 'https://www.ssbwiki.com/Tournament_rulesets_(SSBU)',
    checked: '2026-10-22',
    reviewed: false,
    note: 'Approved June 5, 2024 according to SmashWiki. Not checked against the ruleset document itself.',
  },
  {
    id: 'unified-european',
    name: 'Unified European',
    // No starter / counterpick split: all nine stages are available from the start.
    // Small Battlefield, Battlefield, Final Destination, Smashville, Town & City, Kalos Pokémon League,
    // Pokémon Stadium 2, Yoshi's Story (and Hollow Bastion, which is missing from the data)
    starters: [84, 5, 22, 85, 96, 43, 74, 109],
    counterpicks: [],
    missing: { starters: ['Hollow Bastion'], counterpicks: [] },
    bans: 3,
    dsr: 'none',
    source: 'https://www.ssbwiki.com/Tournament_rulesets_(SSBU)',
    checked: '2026-10-22',
    reviewed: false,
    note: 'All nine stages are available from the start; there are no counterpicks. Game 1 uses its own striking procedure, not the 1-2-1 order. Not checked against the ruleset document itself.',
  },
  {
    id: 'midwest',
    name: 'Midwest',
    starters: [5, 74, 84, 85, 96], // Battlefield, Pokémon Stadium 2, Small Battlefield, Smashville, Town & City
    counterpicks: [22, 43], // Final Destination, Kalos Pokémon League
    missing: { starters: [], counterpicks: ['Hollow Bastion'] },
    bans: 3,
    dsr: 'none',
    source: 'https://www.ssbwiki.com/Tournament_rulesets_(SSBU)',
    checked: '2026-10-22',
    reviewed: false,
    note: 'Not checked against a Midwest ruleset document. SmashWiki says no stage list is universally agreed.',
  },
];

/** The presets the page offers: reviewed ones, plus unreviewed ones when asked for. */
export function visibleStagePresets(includeUnreviewed = false) {
  return STAGE_LIST_PRESETS.filter((p) => p.reviewed || includeUnreviewed);
}

/** Number of stages of a preset that the data doesn't have yet. */
export function missingCount(preset) {
  return preset.missing.starters.length + preset.missing.counterpicks.length;
}
