// Compares the stages your criteria allow with a regional stage-list preset. Pure functions, no DOM.

import { evaluate } from './criteria.js';

/**
 * Three groups, each a list of stages:
 *  - `onlyCriteria`: your criteria allow them, but the preset doesn't (it bans them or leaves them out)
 *  - `onlyPreset`: the preset allows them, but your criteria exclude them; each has `failures` saying why
 *  - `both`: both allow them
 * `missing` lists the preset's stages that the data doesn't have yet, so they can't be compared.
 */
export function diffWithPreset(stages, criteria, preset) {
  const presetIds = new Set([...preset.starters, ...preset.counterpicks]);
  const groups = { onlyCriteria: [], onlyPreset: [], both: [], missing: [...preset.missing.starters, ...preset.missing.counterpicks] };
  for (const stage of stages) {
    const { pass, failures } = evaluate(stage, criteria);
    const inPreset = presetIds.has(stage.id);
    if (pass && inPreset) groups.both.push({ stage, failures });
    else if (pass) groups.onlyCriteria.push({ stage, failures });
    else if (inPreset) groups.onlyPreset.push({ stage, failures });
  }
  return groups;
}

/** How the builder's two lists differ from a preset's: stages you added, stages you left out, and shared ones. */
export function compareLists(state, preset) {
  const mine = new Set([...state.starters, ...state.counterpicks]);
  const theirs = new Set([...preset.starters, ...preset.counterpicks]);
  return {
    added: [...mine].filter((id) => !theirs.has(id)),
    leftOut: [...theirs].filter((id) => !mine.has(id)),
    shared: [...mine].filter((id) => theirs.has(id)),
  };
}
