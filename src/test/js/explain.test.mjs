import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate } from '../../main/resources/static/js/criteria.js';
import {
  describeMode, describeWanted, explainFailure, formatRange, measurementRows, summaryLine,
} from '../../main/resources/static/js/explain.js';
import { byName } from './support.mjs';

const only = (stage, criteria) => explainFailure(evaluate(stage, criteria).failures[0], criteria.rangeMatch);

test('a moving blast zone is described as a distance from the center, with the time qualifier', () => {
  const text = only(byName('Delfino Plaza'), { blastZones: { left: { min: -260, max: -220 } } });
  assert.equal(text, 'Left blast zone ranges 180–230 from center; you asked for 220–260 at all times.');
});

test('the overlap mode changes the wording to "at some point"', () => {
  const text = only(byName('Delfino Plaza'), { blastZones: { left: { min: -170, max: -160 } }, rangeMatch: 'OVERLAPS' });
  assert.equal(text, 'Left blast zone ranges 180–230 from center; you asked for 160–170 at some point.');
});

test('a fixed measurement has no time qualifier', () => {
  const text = only(byName('Battlefield'), { blastZones: { right: { min: 250, max: 300 } } });
  assert.equal(text, 'Right blast zone is 240 from center; you asked for 250–300.');
});

test('open-ended asks read naturally', () => {
  assert.equal(describeWanted({ min: 220, max: null }), 'at least 220');
  assert.equal(describeWanted({ min: null, max: 260 }), 'at most 260');
  assert.equal(describeWanted({ min: 5, max: 5 }), '5');
});

test('width, ledge and flag failures are explained', () => {
  const battlefield = byName('Battlefield');
  assert.equal(only(battlefield, { stageWidth: { min: 200 } }), 'Stage width is 160; you asked for at least 200.');
  assert.equal(only(battlefield, { ledgeCount: { min: 0, max: 0 } }), 'Ledges is 2; you asked for 0.');
  assert.equal(only(battlefield, { features: { symmetry: false } }), 'Symmetrical: Yes on this stage, but you asked for No.');
});

test('the mode note and the formatting helpers', () => {
  assert.match(describeMode('OVERLAPS'), /at some point/);
  assert.match(describeMode('CONTAINED'), /at all times/);
  assert.equal(formatRange(1, 1), '1');
  assert.equal(formatRange(1.5, 3), '1.5–3');
});

test('measurement rows put blast zones in plain terms', () => {
  const rows = Object.fromEntries(measurementRows(byName('Battlefield')));
  assert.equal(rows['Left blast zone'], '240 from center');
  assert.equal(rows['Bottom blast zone'], '140 from center');
  assert.match(summaryLine(byName('Battlefield')), /Width 160 · Blast zones L 240 R 240 T 192 B 140 · Ledges 2/);
});
