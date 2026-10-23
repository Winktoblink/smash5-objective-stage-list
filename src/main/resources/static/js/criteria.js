// The criteria model and the matching rules. Pure functions only: nothing here touches the DOM, so
// Node can test it. The rules must give the same answer as the Java API (see ADR-0005); the shared
// conformance cases in src/test/resources/search-conformance.json check that they do.

/** Range filters, in the same order as the API's request. `side` marks blast zones measured from the center. */
export const RANGES = [
  { key: 'blastZones.left', label: 'Left blast zone', side: 'left' },
  { key: 'blastZones.right', label: 'Right blast zone', side: 'right' },
  { key: 'blastZones.top', label: 'Top blast zone', side: 'top' },
  { key: 'blastZones.bottom', label: 'Bottom blast zone', side: 'bottom' },
  { key: 'distanceToBlastZone', label: 'Distance from ledge to side blast zone' },
  { key: 'ledgeCount', label: 'Ledges', integer: true },
];

export const WIDTH = { key: 'stageWidth', label: 'Stage width' };

/**
 * Feature flags. `help` is only filled in where DATA.md gives a clear meaning; the rest stay null until the
 * project owner confirms what each flag covers.
 */
export const FEATURES = [
  { key: 'walkOffs', label: 'Walk-offs', help: 'A fighter can walk off the edge of the stage into a blast zone without falling.' },
  { key: 'ceiling', label: 'Ceiling', help: 'The stage has a ceiling that stops fighters leaving through the top.' },
  { key: 'wallInfinite', label: 'Infinite wall', help: null },
  { key: 'random', label: 'Random', help: null },
  { key: 'water', label: 'Water', help: 'The stage has water that a fighter can fall into.' },
  { key: 'symmetry', label: 'Symmetrical', help: 'The left and right halves of the stage are mirror images.' },
  { key: 'transform', label: 'Transforms', help: null },
  { key: 'twoDimensional', label: '2D', help: 'The stage is a flat 2D scene.' },
  { key: 'ice', label: 'Ice', help: 'Part of the stage is slippery.' },
  { key: 'hurtBox', label: 'Hurtbox hazard', help: null },
];

export const RANGE_MATCH = { CONTAINED: 'CONTAINED', OVERLAPS: 'OVERLAPS' };

export function get(object, path) {
  return path.split('.').reduce((node, part) => node?.[part], object);
}

function set(object, path, value) {
  const parts = path.split('.');
  let node = object;
  for (const part of parts.slice(0, -1)) node = node[part] ??= {};
  node[parts.at(-1)] = value;
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * A distance from the center (positive) to the signed position the data stores. The left and bottom blast
 * zones are negative, the right and top ones are positive.
 */
export function signed(side, distance) {
  return side === 'left' || side === 'bottom' ? -distance : distance;
}

/**
 * A distance range `[min, max]` becomes a signed range. On the negative sides the order flips, so a distance
 * range of 180 to 230 on the left becomes -230 to -180. An open end stays open.
 */
export function distanceToSignedRange(side, range) {
  const { min = null, max = null } = range ?? {};
  if (side === 'left' || side === 'bottom') {
    return { min: max === null ? null : -max, max: min === null ? null : -min };
  }
  return { min, max };
}

/** The reverse of {@link distanceToSignedRange}. */
export function signedToDistanceRange(side, range) {
  return distanceToSignedRange(side, range); // negating and swapping is its own inverse
}

/**
 * The plain-terms form state turned into the request criteria that the API (and {@link evaluate}) use.
 *
 * `plain` has distances from the center as positive numbers: `sides` (both side blast zones at once, used
 * unless `separateSides` is true), `left`, `right`, `top`, `bottom`, plus `stageWidth`,
 * `distanceToBlastZone`, `ledgeCount`, `features` and `rangeMatch`. Every range is `{ min, max }`, with
 * `null` or a missing bound meaning open-ended.
 */
export function toCriteria(plain) {
  const criteria = {};
  const put = (path, range) => {
    const min = isNumber(range?.min) ? range.min : null;
    const max = isNumber(range?.max) ? range.max : null;
    if (min !== null || max !== null) set(criteria, path, { min, max });
  };

  const sideRange = (side) => (plain.separateSides ? plain[side] : plain.sides);
  for (const side of ['left', 'right']) {
    put(`blastZones.${side}`, distanceToSignedRange(side, sideRange(side)));
  }
  for (const side of ['top', 'bottom']) {
    put(`blastZones.${side}`, distanceToSignedRange(side, plain[side]));
  }
  put('stageWidth', plain.stageWidth);
  put('distanceToBlastZone', plain.distanceToBlastZone);
  put('ledgeCount', plain.ledgeCount);

  for (const [key, value] of Object.entries(plain.features ?? {})) {
    if (typeof value === 'boolean') set(criteria, `features.${key}`, value);
  }
  if (plain.rangeMatch === RANGE_MATCH.OVERLAPS) criteria.rangeMatch = RANGE_MATCH.OVERLAPS;
  return criteria;
}

/** Does a stage's `[min, max]` range satisfy a filter? A missing filter bound leaves that side open. */
export function rangeMatches(stageRange, filter, rangeMatch) {
  const overlaps = rangeMatch === RANGE_MATCH.OVERLAPS;
  if (isNumber(filter.min) && !((overlaps ? stageRange.max : stageRange.min) >= filter.min)) return false;
  if (isNumber(filter.max) && !((overlaps ? stageRange.min : stageRange.max) <= filter.max)) return false;
  return true;
}

/**
 * Checks one stage against the criteria.
 *
 * Returns `{ pass, failures }`. Each failure is `{ criterion, label, stageValue, wanted }`, where
 * `criterion` is the API field name (for example `blastZones.left`), `stageValue` is the stage's own value
 * and `wanted` is what the criteria asked for. Nothing is short-circuited, so a stage that fails three
 * criteria reports all three.
 */
export function evaluate(stage, criteria) {
  const failures = [];
  const fail = (criterion, label, stageValue, wanted) => failures.push({ criterion, label, stageValue, wanted });
  const mode = criteria.rangeMatch ?? RANGE_MATCH.CONTAINED;

  for (const { key, label } of RANGES) {
    const wanted = get(criteria, key);
    if (wanted && !rangeMatches(get(stage, key), wanted, mode)) fail(key, label, get(stage, key), wanted);
  }

  // Width is a single number, so it matches the same way in both modes.
  const width = criteria.stageWidth;
  if (width) {
    const value = stage.stageWidth;
    if ((isNumber(width.min) && value < width.min) || (isNumber(width.max) && value > width.max)) {
      fail(WIDTH.key, WIDTH.label, value, width);
    }
  }

  for (const { key, label } of FEATURES) {
    const wanted = criteria.features?.[key];
    if (typeof wanted === 'boolean' && stage.features[key] !== wanted) fail(`features.${key}`, label, stage.features[key], wanted);
  }

  return { pass: failures.length === 0, failures };
}

/** Splits stages into the three groups the page shows. Each group keeps the input order. */
export function classify(stages, criteria) {
  const groups = { matches: [], nearMisses: [], excluded: [] };
  for (const stage of stages) {
    const { pass, failures } = evaluate(stage, criteria);
    if (pass) groups.matches.push({ stage, failures });
    else if (failures.length === 1) groups.nearMisses.push({ stage, failures });
    else groups.excluded.push({ stage, failures });
  }
  return groups;
}

/** The stages that pass, matching what `POST /api/v1/stages/search` returns (sorted by name). */
export function search(stages, criteria) {
  return stages
    .filter((stage) => evaluate(stage, criteria).pass)
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** True when no criterion is set, so every stage matches. */
export function isEmpty(criteria) {
  return Object.keys(criteria).filter((key) => key !== 'rangeMatch').length === 0;
}
