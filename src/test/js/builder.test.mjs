import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addStage, checkAgainstCriteria, checkEnoughStages, checkOverlap, checkRedundant, checkStarterCount,
  emptyBuilder, fromPreset, lookRedundant, removeStage, strikingOrder, validate,
} from '../../main/resources/static/js/builder.js';
import { STAGE_LIST_PRESETS } from '../../main/resources/static/js/presets.js';
import { byName, stages } from './support.mjs';

const byId = new Map(stages.map((s) => [s.id, s]));
const ids = (...names) => names.map((n) => byName(n).id);
const state = (starters, counterpicks = [], extra = {}) => ({ ...emptyBuilder(), starters, counterpicks, ...extra });

test('striking order: 1-1 for 3 starters, 1-2-1 for 5, 1-2-2-1 for 7, none otherwise', () => {
  assert.equal(strikingOrder(3), '1-1');
  assert.equal(strikingOrder(5), '1-2-1');
  assert.equal(strikingOrder(7), '1-2-2-1');
  assert.equal(strikingOrder(4), null);
  assert.equal(strikingOrder(9), null);
});

test('error: an even or empty starter list', () => {
  const two = ids('Battlefield', 'Final Destination');
  assert.equal(checkStarterCount(state(two))[0].message, 'Striking needs an odd number of starters.');
  assert.equal(checkStarterCount(state([])).length, 1);
  assert.equal(checkStarterCount(state(ids('Battlefield'))).length, 0);
  assert.equal(checkStarterCount(state(ids('Battlefield', 'Final Destination', 'Smashville'))).length, 0);
});

test('starters the data lacks still count towards the odd rule', () => {
  const four = ids('Battlefield', 'Final Destination', 'Town & City', 'Small Battlefield');
  assert.equal(checkStarterCount(state(four)).length, 1);
  assert.equal(checkStarterCount(state(four, [], { missingStarters: 1 })).length, 0);
});

test('error: a stage that is both a starter and a counterpick, naming the stage', () => {
  const messages = checkOverlap(state(ids('Battlefield'), ids('Battlefield', 'Smashville')), byId);
  assert.deepEqual(messages.map((m) => m.message), ['Battlefield is both a starter and a counterpick.']);
  assert.equal(checkOverlap(state(ids('Battlefield'), ids('Smashville')), byId).length, 0);
});

test('error: fewer than 2 stages left for the loser after bans and DSR', () => {
  const three = ids('Battlefield', 'Final Destination', 'Smashville');
  assert.equal(checkEnoughStages(state(three, [], { bans: 1 })).length, 0); // 3 - 1 = 2
  assert.equal(checkEnoughStages(state(three, [], { bans: 2 })).length, 1); // 3 - 2 = 1
  assert.equal(checkEnoughStages(state(three, [], { bans: 1, dsr: 'dsr' })).length, 1); // 3 - 1 - 1 = 1
  assert.equal(checkEnoughStages(state(three, [], { bans: 0, dsr: 'modified' })).length, 0); // 3 - 0 - 1 = 2
  assert.match(checkEnoughStages(state(three, [], { bans: 3 }))[0].message, /fewer than 2 stages/);
});

test('warning: two stages in the same layout family with close measurements may be redundant', () => {
  const base = byName('Battlefield');
  const twin = { ...structuredClone(base), id: 9001, name: 'Twin Field', layoutFamily: 'battlefield' };
  const a = { ...base, layoutFamily: 'battlefield' };
  const map = new Map([[a.id, a], [twin.id, twin]]);
  const warnings = checkRedundant(state([a.id, twin.id]), map);
  assert.deepEqual(warnings.map((w) => [w.level, w.message]), [['warning', 'Battlefield and Twin Field may be redundant.']]);

  // Too far apart: a blast zone differs by more than 10.
  const wider = { ...structuredClone(twin), blastZones: { ...twin.blastZones, left: { min: -260, max: -260 } } };
  assert.equal(lookRedundant(a, wider), false);
  // Different or missing layout families never warn, so today's data gives no warnings.
  assert.equal(lookRedundant(a, { ...twin, layoutFamily: 'other' }), false);
  assert.equal(lookRedundant(base, byName('Small Battlefield')), false);
});

test('warning: a chosen stage that fails the current criteria', () => {
  const lylat = byName('Lylat Cruise');
  const warnings = checkAgainstCriteria(state([lylat.id]), byId, { ledgeCount: { min: 3, max: 4 } });
  assert.deepEqual(warnings.map((w) => [w.level, w.message]), [['warning', "Lylat Cruise doesn't meet your current criteria."]]);
  assert.equal(checkAgainstCriteria(state([lylat.id]), byId, { ledgeCount: { min: 2, max: 2 } }).length, 0);
});

test('validate lists errors before warnings', () => {
  const messages = validate(state(ids('Lylat Cruise', 'Smashville')), stages, { ledgeCount: { min: 3, max: 4 } });
  assert.deepEqual(messages.map((m) => m.level), ['error', 'error', 'warning', 'warning']);
});

test('adding a stage to one list takes it out of the other, and removing takes it out of both', () => {
  const id = byName('Battlefield').id;
  let s = addStage(emptyBuilder(), 'starters', id);
  assert.deepEqual(s.starters, [id]);
  s = addStage(s, 'counterpicks', id);
  assert.deepEqual([s.starters, s.counterpicks], [[], [id]]);
  assert.deepEqual(addStage(s, 'counterpicks', id).counterpicks, [id]);
  s = removeStage(s, id);
  assert.deepEqual([s.starters, s.counterpicks], [[], []]);
});

test('loading every stage-list preset produces no errors', () => {
  for (const preset of STAGE_LIST_PRESETS) {
    const errors = validate(fromPreset(preset), stages).filter((m) => m.level === 'error');
    assert.deepEqual(errors, [], preset.name);
  }
});
