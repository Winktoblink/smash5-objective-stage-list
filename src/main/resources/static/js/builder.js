// The stage-list builder's rules. Pure functions, no DOM: each validation rule returns messages that the page
// shows, and each is unit tested.

import { evaluate } from './criteria.js';

export const DSR_OPTIONS = [
  { value: 'none', label: 'No DSR' },
  { value: 'dsr', label: 'DSR' },
  { value: 'modified', label: 'Modified DSR' },
];

/** How close two stages' measurements must be, in game units, for them to be called redundant. */
export const REDUNDANT_WITHIN = 10;

export function emptyBuilder() {
  return {
    starters: [], counterpicks: [], missingStarters: 0, missingCounterpicks: 0, bans: 2, dsr: 'none', gentlemansRule: false,
  };
}

/**
 * The game 1 striking order that fits a number of starters: 1-1 for 3, 1-2-1 for 5 and 1-2-2-1 for 7.
 * Other counts have no standard order, so this returns null.
 */
export function strikingOrder(starterCount) {
  return { 3: '1-1', 5: '1-2-1', 7: '1-2-2-1' }[starterCount] ?? null;
}

/** Puts a stage in a list, taking it out of the other one first. Returns a new state. */
export function addStage(state, list, id) {
  const other = list === 'starters' ? 'counterpicks' : 'starters';
  return {
    ...state,
    [other]: state[other].filter((x) => x !== id),
    [list]: state[list].includes(id) ? state[list] : [...state[list], id],
  };
}

export function removeStage(state, id) {
  return {
    ...state,
    starters: state.starters.filter((x) => x !== id),
    counterpicks: state.counterpicks.filter((x) => x !== id),
  };
}

const error = (message, extra = {}) => ({ level: 'error', message, ...extra });
const warning = (message, extra = {}) => ({ level: 'warning', message, ...extra });

/** Error: striking needs an odd number of starters, and at least one. */
export function checkStarterCount(state) {
  const n = state.starters.length + (state.missingStarters ?? 0);
  return n === 0 || n % 2 === 0 ? [error('Striking needs an odd number of starters.')] : [];
}

/** Error: a stage can't be both a starter and a counterpick. */
export function checkOverlap(state, stagesById) {
  return state.starters
    .filter((id) => state.counterpicks.includes(id))
    .map((id) => error(`${stagesById.get(id)?.name ?? `Stage ${id}`} is both a starter and a counterpick.`));
}

/** Error: after the winner's bans (and the DSR stage), the loser must still have at least two stages. */
export function checkEnoughStages(state) {
  const total = state.starters.length + state.counterpicks.length
    + (state.missingStarters ?? 0) + (state.missingCounterpicks ?? 0);
  const dsrRemoves = state.dsr === 'none' ? 0 : 1;
  return total - state.bans - dsrRemoves < 2
    ? [error('After bans, the loser would have fewer than 2 stages to choose from.')]
    : [];
}

function near(a, b) {
  return Math.abs(a - b) <= REDUNDANT_WITHIN;
}

/** True when two stages share a layout family and every blast zone and the width are within 10 units. */
export function lookRedundant(a, b) {
  if (!a.layoutFamily || a.layoutFamily !== b.layoutFamily) return false;
  const sides = ['left', 'right', 'top', 'bottom'];
  return near(a.stageWidth, b.stageWidth)
    && sides.every((s) => near(a.blastZones[s].min, b.blastZones[s].min) && near(a.blastZones[s].max, b.blastZones[s].max));
}

/**
 * Warning: two chosen stages may be redundant. This needs a `layoutFamily` on the stages, which the data
 * doesn't have yet, so with today's data it never fires.
 */
export function checkRedundant(state, stagesById) {
  const chosen = [...new Set([...state.starters, ...state.counterpicks])].map((id) => stagesById.get(id)).filter(Boolean);
  const warnings = [];
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      if (lookRedundant(chosen[i], chosen[j])) {
        warnings.push(warning(`${chosen[i].name} and ${chosen[j].name} may be redundant.`));
      }
    }
  }
  return warnings;
}

/** Warning: a chosen stage doesn't meet the criteria currently set. Happens when the criteria change. */
export function checkAgainstCriteria(state, stagesById, criteria) {
  return [...new Set([...state.starters, ...state.counterpicks])]
    .map((id) => stagesById.get(id))
    .filter(Boolean)
    .filter((stage) => !evaluate(stage, criteria).pass)
    .map((stage) => warning(`${stage.name} doesn't meet your current criteria.`, { stageId: stage.id }));
}

/** Every rule, errors first. */
export function validate(state, stages, criteria = {}) {
  const stagesById = new Map(stages.map((s) => [s.id, s]));
  const all = [
    ...checkStarterCount(state),
    ...checkOverlap(state, stagesById),
    ...checkEnoughStages(state),
    ...checkRedundant(state, stagesById),
    ...checkAgainstCriteria(state, stagesById, criteria),
  ];
  return [...all.filter((m) => m.level === 'error'), ...all.filter((m) => m.level === 'warning')];
}

/**
 * A builder state loaded from a stage-list preset. Stages the data doesn't have can't be shown, but they are
 * counted (`missingStarters`, `missingCounterpicks`) so the rules still see the whole list.
 */
export function fromPreset(preset) {
  return {
    starters: [...preset.starters],
    counterpicks: [...preset.counterpicks],
    missingStarters: preset.missing.starters.length,
    missingCounterpicks: preset.missing.counterpicks.length,
    bans: preset.bans,
    dsr: preset.dsr,
    gentlemansRule: false,
  };
}
