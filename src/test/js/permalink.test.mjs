import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decode, defaultState, encode, isDefault } from '../../main/resources/static/js/permalink.js';
import { stages } from './support.mjs';

const valid = { stageIds: new Set(stages.map((s) => s.id)), presetIds: new Set(['una', 'midwest']) };
const toHash = (obj) => `#v1.${Buffer.from(JSON.stringify(obj)).toString('base64url')}`;

function sampleState() {
  const state = defaultState();
  state.plain.sides = { min: 230, max: 260 };
  state.plain.top = { min: null, max: 200 };
  state.plain.ledgeCount = { min: 2, max: 2 };
  state.plain.features = { walkOffs: false, symmetry: true };
  state.plain.rangeMatch = 'OVERLAPS';
  state.plain.separateSides = true;
  state.builder = {
    starters: [5, 22, 96], counterpicks: [74], missingStarters: 1, missingCounterpicks: 0,
    bans: 3, dsr: 'modified', gentlemansRule: true, loadedPreset: 'una',
  };
  state.game = { ...state.game, stocks: '2', forms: 'Battlefield: all forms legal. Ω: Final Destination only' };
  return state;
}

test('a state survives a round trip through the address', () => {
  const state = sampleState();
  const hash = encode(state);
  assert.match(hash, /^#v1\.[A-Za-z0-9_-]+$/);
  const result = decode(hash, valid);
  assert.deepEqual(result.notices, []);
  assert.deepEqual(result.state, state);
});

test('non-ASCII text in the game settings round-trips', () => {
  const state = defaultState();
  state.game.forms = 'Ω forms: Pokémon Stadium 2 → “legal”';
  assert.equal(decode(encode(state), valid).state.game.forms, state.game.forms);
});

test('an empty address gives the default state and no notice', () => {
  assert.deepEqual(decode('', valid), { state: defaultState(), notices: [] });
  assert.deepEqual(decode('#', valid), { state: defaultState(), notices: [] });
});

test('bad input falls back to the default state with a notice', () => {
  for (const hash of ['#v1.', '#v1.!!!', '#v1.bm90IGpzb24', `#v1.${Buffer.from('[1,2]').toString('base64url')}`, '#nonsense']) {
    const result = decode(hash, valid);
    assert.deepEqual(result.state, defaultState(), hash);
    assert.equal(result.notices.length, 1, hash);
    assert.match(result.notices[0], /couldn't be read/, hash);
  }
});

test('an unknown version falls back to the default state and says so', () => {
  const result = decode(`#v2.${Buffer.from('{}').toString('base64url')}`, valid);
  assert.deepEqual(result.state, defaultState());
  assert.match(result.notices[0], /different version/);
});

test('stage ids that no longer exist are dropped with a notice', () => {
  const state = sampleState();
  state.builder.starters = [5, 9999, 22];
  state.builder.counterpicks = [74, 8888];
  const result = decode(encode(state), valid);
  assert.deepEqual(result.state.builder.starters, [5, 22]);
  assert.deepEqual(result.state.builder.counterpicks, [74]);
  assert.deepEqual(result.notices, ['2 stages in that link no longer exist and were dropped.']);
  state.builder.starters = [5, 9999];
  state.builder.counterpicks = [];
  assert.deepEqual(decode(encode(state), valid).notices, ['1 stage in that link no longer exists and was dropped.']);
});

test('every field is checked, and wrong values become defaults', () => {
  const hash = toHash({
    plain: { sides: { min: 'x', max: 5 }, features: { walkOffs: 'yes', ice: true, bogus: true }, rangeMatch: 'TOUCHES', separateSides: 'true' },
    builder: { starters: [5, 5, 'a'], counterpicks: [5, 22], bans: 99, dsr: 'weird', gentlemansRule: 1, loadedPreset: 'nope' },
    game: { stocks: 3, time: 'x'.repeat(500) },
  });
  const { state } = decode(hash, valid);
  assert.deepEqual(state.plain.sides, { min: null, max: 5 });
  assert.deepEqual(state.plain.features, { ice: true });
  assert.equal(state.plain.rangeMatch, 'CONTAINED');
  assert.equal(state.plain.separateSides, false);
  assert.deepEqual(state.builder.starters, [5]);
  assert.deepEqual(state.builder.counterpicks, [22]); // 5 is already a starter
  assert.equal(state.builder.bans, 2);
  assert.equal(state.builder.dsr, 'none');
  assert.equal(state.builder.gentlemansRule, false);
  assert.equal('loadedPreset' in state.builder, false);
  assert.equal(state.game.stocks, '3');
  assert.equal(state.game.time.length, 200);
});

test('isDefault is true only for a fresh page', () => {
  assert.equal(isDefault(defaultState()), true);
  assert.equal(isDefault(sampleState()), false);
  const changed = defaultState();
  changed.plain.features = { ice: false };
  assert.equal(isDefault(changed), false);
  const game = defaultState();
  game.game.stocks = '2';
  assert.equal(isDefault(game), false);
});
