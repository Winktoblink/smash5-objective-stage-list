// Plain-language explanations for criteria that a stage fails. Pure functions, no DOM.

import { RANGES, RANGE_MATCH, signedToDistanceRange } from './criteria.js';

const SIDE_OF = Object.fromEntries(RANGES.filter((r) => r.side).map((r) => [r.key, r.side]));

/** Whole numbers without a decimal point, anything else as is. */
function num(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function span(min, max) {
  return min === max ? num(min) : `${num(min)}–${num(max)}`;
}

/** What the user asked for, such as "220–260", "at least 220" or "at most 260". */
export function describeWanted(wanted) {
  const hasMin = typeof wanted.min === 'number';
  const hasMax = typeof wanted.max === 'number';
  if (hasMin && hasMax) return wanted.min === wanted.max ? num(wanted.min) : span(wanted.min, wanted.max);
  return hasMin ? `at least ${num(wanted.min)}` : `at most ${num(wanted.max)}`;
}

/**
 * One sentence saying why a stage failed one criterion, in the terms the page uses (blast zones as a
 * distance from the center). `failure` comes from `evaluate`; `rangeMatch` is the mode the criteria used.
 */
export function explainFailure(failure, rangeMatch = RANGE_MATCH.CONTAINED) {
  const { criterion, label, stageValue, wanted } = failure;

  if (typeof wanted === 'boolean') {
    return `${label}: ${stageValue ? 'Yes' : 'No'} on this stage, but you asked for ${wanted ? 'Yes' : 'No'}.`;
  }

  if (criterion === 'stageWidth') {
    return `${label} is ${num(stageValue)}; you asked for ${describeWanted(wanted)}.`;
  }

  const side = SIDE_OF[criterion];
  const stageRange = side ? signedToDistanceRange(side, stageValue) : stageValue;
  const wantedRange = side ? signedToDistanceRange(side, wanted) : wanted;
  const fixed = stageRange.min === stageRange.max;
  const unit = side ? ' from center' : '';
  const stageText = fixed ? `is ${num(stageRange.min)}${unit}` : `ranges ${span(stageRange.min, stageRange.max)}${unit}`;
  const when = fixed ? '' : rangeMatch === RANGE_MATCH.OVERLAPS ? ' at some point' : ' at all times';
  return `${label} ${stageText}; you asked for ${describeWanted(wantedRange)}${when}.`;
}

/** The note shown next to the match mode, so the wording of the results is easy to interpret. */
export function describeMode(rangeMatch) {
  return rangeMatch === RANGE_MATCH.OVERLAPS
    ? 'A stage matches if it can reach the range you asked for at some point.'
    : 'A stage matches only if it stays inside the range you asked for at all times.';
}

/** A stage's measurements in the page's plain terms, for result cards and the detail view. */
export function measurementRows(stage) {
  const zone = (side, range) => {
    const d = signedToDistanceRange(side, range);
    return span(d.min, d.max);
  };
  const z = stage.blastZones;
  return [
    ['Left blast zone', `${zone('left', z.left)} from center`],
    ['Right blast zone', `${zone('right', z.right)} from center`],
    ['Top blast zone', `${zone('top', z.top)} from center`],
    ['Bottom blast zone', `${zone('bottom', z.bottom)} from center`],
    ['Stage width', num(stage.stageWidth)],
    ['Distance from ledge to side blast zone', span(stage.distanceToBlastZone.min, stage.distanceToBlastZone.max)],
    ['Ledges', span(stage.ledgeCount.min, stage.ledgeCount.max)],
  ];
}

/** The same numbers as one short line. */
export function summaryLine(stage) {
  const d = (side) => {
    const r = signedToDistanceRange(side, stage.blastZones[side]);
    return span(r.min, r.max);
  };
  return `Width ${num(stage.stageWidth)} · Blast zones L ${d('left')} R ${d('right')} T ${d('top')} B ${d('bottom')} · Ledges ${span(stage.ledgeCount.min, stage.ledgeCount.max)}`;
}

export { span as formatRange };
