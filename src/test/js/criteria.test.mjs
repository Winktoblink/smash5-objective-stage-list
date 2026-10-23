import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classify, distanceToSignedRange, evaluate, isEmpty, rangeMatches, search, signedToDistanceRange, toCriteria,
} from '../../main/resources/static/js/criteria.js';
import { CRITERIA_PRESETS } from '../../main/resources/static/js/presets.js';
import { byName, stages } from './support.mjs';

test('a distance range on the left becomes a flipped, negative range', () => {
  assert.deepEqual(distanceToSignedRange('left', { min: 220, max: 260 }), { min: -260, max: -220 });
  assert.deepEqual(distanceToSignedRange('bottom', { min: 100, max: 150 }), { min: -150, max: -100 });
});

test('the right and top keep their sign and order', () => {
  assert.deepEqual(distanceToSignedRange('right', { min: 220, max: 260 }), { min: 220, max: 260 });
  assert.deepEqual(distanceToSignedRange('top', { min: 170, max: 200 }), { min: 170, max: 200 });
});

test('open-ended bounds stay open after conversion, in both directions', () => {
  assert.deepEqual(distanceToSignedRange('left', { min: 220, max: null }), { min: null, max: -220 });
  assert.deepEqual(distanceToSignedRange('left', { min: null, max: 260 }), { min: -260, max: null });
  assert.deepEqual(distanceToSignedRange('right', { min: 220, max: null }), { min: 220, max: null });
  assert.deepEqual(signedToDistanceRange('left', { min: null, max: -220 }), { min: 220, max: null });
  assert.deepEqual(signedToDistanceRange('left', { min: -260, max: -220 }), { min: 220, max: 260 });
});

test('converting there and back gives the original range', () => {
  for (const side of ['left', 'right', 'top', 'bottom']) {
    for (const range of [{ min: 1, max: 5 }, { min: 3, max: null }, { min: null, max: 7 }]) {
      assert.deepEqual(signedToDistanceRange(side, distanceToSignedRange(side, range)), range);
    }
  }
});

test('toCriteria leaves out empty fields and uses one side range for both sides', () => {
  assert.deepEqual(toCriteria({}), {});
  const criteria = toCriteria({ sides: { min: 200, max: 240 }, top: { min: null, max: 200 } });
  assert.deepEqual(criteria, {
    blastZones: {
      left: { min: -240, max: -200 },
      right: { min: 200, max: 240 },
      top: { min: null, max: 200 },
    },
  });
});

test('toCriteria uses the separate sides only when asked to', () => {
  const plain = { sides: { min: 1, max: 2 }, left: { min: 10, max: 20 }, right: { min: 30, max: 40 } };
  assert.deepEqual(toCriteria({ ...plain, separateSides: true }).blastZones, {
    left: { min: -20, max: -10 }, right: { min: 30, max: 40 },
  });
});

test('toCriteria carries flags and the overlap mode, and ignores the default mode', () => {
  const criteria = toCriteria({ features: { walkOffs: false, ice: true }, rangeMatch: 'OVERLAPS' });
  assert.deepEqual(criteria, { features: { walkOffs: false, ice: true }, rangeMatch: 'OVERLAPS' });
  assert.equal('rangeMatch' in toCriteria({ rangeMatch: 'CONTAINED' }), false);
});

test('containment needs the whole stage range inside the filter', () => {
  const stage = { min: -230, max: -180 };
  assert.equal(rangeMatches(stage, { min: -240, max: -170 }, 'CONTAINED'), true);
  assert.equal(rangeMatches(stage, { min: -240, max: -200 }, 'CONTAINED'), false);
  assert.equal(rangeMatches(stage, { min: -200, max: null }, 'CONTAINED'), false);
  assert.equal(rangeMatches(stage, { min: null, max: -170 }, 'CONTAINED'), true);
});

test('overlap needs the ranges to share a value, and each open end is handled', () => {
  const stage = { min: -230, max: -180 };
  assert.equal(rangeMatches(stage, { min: -240, max: -200 }, 'OVERLAPS'), true);
  assert.equal(rangeMatches(stage, { min: -170, max: null }, 'OVERLAPS'), false);
  assert.equal(rangeMatches(stage, { min: -180, max: null }, 'OVERLAPS'), true);
  assert.equal(rangeMatches(stage, { min: null, max: -240 }, 'OVERLAPS'), false);
  assert.equal(rangeMatches(stage, { min: null, max: -230 }, 'OVERLAPS'), true);
});

test('Delfino Plaza matches an overlapping filter but not a containing one', () => {
  const delfino = byName('Delfino Plaza');
  const request = { blastZones: { left: { min: -240, max: -200 } } };
  assert.equal(evaluate(delfino, request).pass, false);
  assert.equal(evaluate(delfino, { ...request, rangeMatch: 'OVERLAPS' }).pass, true);
});

test('evaluate reports every failed criterion with the stage value and what was wanted', () => {
  const result = evaluate(byName('Battlefield'), {
    ledgeCount: { min: 3, max: 4 },
    stageWidth: { max: 100 },
    features: { symmetry: false },
  });
  assert.equal(result.pass, false);
  assert.deepEqual(result.failures.map((f) => f.criterion), ['ledgeCount', 'stageWidth', 'features.symmetry']);
  assert.deepEqual(result.failures[0], {
    criterion: 'ledgeCount', label: 'Ledges', stageValue: { min: 2, max: 2 }, wanted: { min: 3, max: 4 },
  });
});

test('stage width matches the same way in both modes', () => {
  const battlefield = byName('Battlefield');
  assert.equal(evaluate(battlefield, { stageWidth: { min: 150 } }).pass, true);
  assert.equal(evaluate(battlefield, { stageWidth: { min: 150 }, rangeMatch: 'OVERLAPS' }).pass, true);
  assert.equal(evaluate(battlefield, { stageWidth: { min: 170 }, rangeMatch: 'OVERLAPS' }).pass, false);
});

test('classify splits stages into matches, near misses and excluded', () => {
  const criteria = { ledgeCount: { min: 2, max: 2 }, features: { symmetry: true } };
  const { matches, nearMisses, excluded } = classify(stages, criteria);
  assert.equal(matches.length + nearMisses.length + excluded.length, stages.length);
  assert.ok(nearMisses.every((e) => e.failures.length === 1));
  assert.ok(excluded.every((e) => e.failures.length >= 2));
  assert.ok(matches.every((e) => e.failures.length === 0));
});

test('an empty criteria set matches every stage', () => {
  assert.equal(isEmpty({}), true);
  assert.equal(isEmpty({ rangeMatch: 'OVERLAPS' }), true);
  assert.equal(search(stages, {}).length, stages.length);
});

test('the classic competitive preset keeps the ground-truth stage count', () => {
  const criteria = toCriteria(CRITERIA_PRESETS[0].plain);
  assert.equal(search(stages, criteria).length, 28);
});

test('stage data sanity: every stage has the fields the page reads', () => {
  for (const s of stages) {
    assert.ok(s.name && Number.isFinite(s.stageWidth), s.name);
    for (const side of ['left', 'right', 'top', 'bottom']) assert.ok(s.blastZones[side].min <= s.blastZones[side].max, s.name);
  }
});
