import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareLists, diffWithPreset } from '../../main/resources/static/js/diff.js';
import { toCriteria } from '../../main/resources/static/js/criteria.js';
import {
  CRITERIA_PRESETS, STAGE_LIST_PRESETS, missingCount, visibleStagePresets,
} from '../../main/resources/static/js/presets.js';
import { conformance, stages } from './support.mjs';

const byId = new Map(stages.map((s) => [s.id, s]));
const names = (ids) => ids.map((id) => byId.get(id)?.name);

// The lists as read from SmashWiki on 2026-10-22, written out by name so a wrong id is caught here.
const EXPECTED = {
  una: {
    starters: ['Battlefield', 'Final Destination', 'Town & City', 'Small Battlefield'],
    counterpicks: ['Pokémon Stadium 2', 'Smashville', 'Kalos Pokémon League'],
    missing: { starters: ['Hollow Bastion'], counterpicks: [] },
  },
  'unified-european': {
    starters: ['Small Battlefield', 'Battlefield', 'Final Destination', 'Smashville', 'Town & City',
      'Kalos Pokémon League', 'Pokémon Stadium 2', "Yoshi's Story"],
    counterpicks: [],
    missing: { starters: ['Hollow Bastion'], counterpicks: [] },
  },
  midwest: {
    starters: ['Battlefield', 'Pokémon Stadium 2', 'Small Battlefield', 'Smashville', 'Town & City'],
    counterpicks: ['Final Destination', 'Kalos Pokémon League'],
    missing: { starters: [], counterpicks: ['Hollow Bastion'] },
  },
};

test('every stage id in every preset exists in the data, and names the stage it should', () => {
  for (const preset of STAGE_LIST_PRESETS) {
    for (const id of [...preset.starters, ...preset.counterpicks]) assert.ok(byId.has(id), `${preset.name}: id ${id}`);
    assert.deepEqual(names(preset.starters), EXPECTED[preset.id].starters, preset.name);
    assert.deepEqual(names(preset.counterpicks), EXPECTED[preset.id].counterpicks, preset.name);
    assert.deepEqual(preset.missing, EXPECTED[preset.id].missing, preset.name);
  }
});

test('a stage listed as missing really is missing from the data', () => {
  // When Hollow Bastion is added to the data, move it from `missing` to the id lists and update this test.
  for (const preset of STAGE_LIST_PRESETS) {
    for (const name of [...preset.missing.starters, ...preset.missing.counterpicks]) {
      assert.equal(stages.some((s) => s.name === name), false, `${preset.name}: ${name} is in the data now`);
    }
  }
});

test('every preset records its source, the date it was checked and whether it has been reviewed', () => {
  for (const preset of STAGE_LIST_PRESETS) {
    assert.match(preset.source, /^https:\/\//);
    assert.match(preset.checked, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof preset.reviewed, 'boolean');
    assert.ok(preset.bans >= 0 && preset.bans <= 4);
    assert.ok(['none', 'dsr', 'modified'].includes(preset.dsr));
  }
});

test('unreviewed presets stay hidden unless asked for', () => {
  assert.deepEqual(visibleStagePresets().map((p) => p.id), STAGE_LIST_PRESETS.filter((p) => p.reviewed).map((p) => p.id));
  assert.equal(visibleStagePresets(true).length, STAGE_LIST_PRESETS.length);
  assert.equal(missingCount(STAGE_LIST_PRESETS[0]), 1);
});

test('criteria presets and stage-list presets are different things', () => {
  assert.ok(CRITERIA_PRESETS.every((p) => p.plain));
  assert.ok(STAGE_LIST_PRESETS.every((p) => !p.plain && Array.isArray(p.starters)));
});

test('diffing UNA against classic competitive gives what a hand computation says', () => {
  // Independent of the evaluator: the 28 classic competitive stages come from the conformance file, which the
  // real API is also checked against.
  const classic = new Set(conformance.find((c) => c.name === 'classic competitive').expected);
  const una = new Set([...EXPECTED.una.starters, ...EXPECTED.una.counterpicks]);
  const handBoth = [...una].filter((n) => classic.has(n)).sort();
  const handOnlyCriteria = [...classic].filter((n) => !una.has(n)).sort();
  const handOnlyPreset = [...una].filter((n) => !classic.has(n)).sort();

  const diff = diffWithPreset(stages, toCriteria(CRITERIA_PRESETS[0].plain), STAGE_LIST_PRESETS[0]);
  const diffNames = (group) => group.map((e) => e.stage.name).sort();
  assert.deepEqual(diffNames(diff.both), handBoth);
  assert.deepEqual(diffNames(diff.onlyCriteria), handOnlyCriteria);
  assert.deepEqual(diffNames(diff.onlyPreset), handOnlyPreset);
  assert.deepEqual(diff.missing, ['Hollow Bastion']);
  assert.equal(diff.both.length, 7);
  assert.equal(diff.onlyCriteria.length, 21);
});

test('stages the preset allows but the criteria exclude come with their failure reasons', () => {
  const diff = diffWithPreset(stages, { ledgeCount: { min: 4, max: 4 } }, STAGE_LIST_PRESETS[0]);
  assert.equal(diff.onlyPreset.length, 7);
  assert.ok(diff.onlyPreset.every((e) => e.failures.length === 1 && e.failures[0].criterion === 'ledgeCount'));
});

test('comparing the builder lists with a preset', () => {
  const preset = STAGE_LIST_PRESETS[2];
  const mine = { starters: [preset.starters[0], 22], counterpicks: [] };
  const result = compareLists(mine, preset);
  assert.deepEqual(result.shared, [preset.starters[0], 22]);
  assert.equal(result.added.length, 0);
  assert.equal(result.leftOut.length, preset.starters.length + preset.counterpicks.length - 2);
  assert.deepEqual(compareLists({ starters: [1], counterpicks: [] }, preset).added, [1]);
});
