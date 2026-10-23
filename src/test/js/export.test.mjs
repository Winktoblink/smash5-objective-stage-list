import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyBuilder } from '../../main/resources/static/js/builder.js';
import {
  DEFAULT_GAME, IMAGE, gameLines, renderStageListImage, ruleLines, rulesetMarkdown,
} from '../../main/resources/static/js/export.js';
import { byName, stages } from './support.mjs';

const names = new Map(stages.map((s) => [s.id, s.name]));
const id = (name) => byName(name).id;

const COLORS = {
  bg: '#fff', text: '#000', muted: '#666', border: '#ccc', accent: '#c00',
  zoneFar: '#999', zoneNear: '#555', stage: '#111', ledge: '#c00', ref: '#0a0',
};

function unaLike() {
  return {
    ...emptyBuilder(),
    starters: ['Battlefield', 'Final Destination', 'Town & City', 'Small Battlefield'].map(id),
    counterpicks: ['Pokémon Stadium 2', 'Smashville', 'Kalos Pokémon League'].map(id),
    bans: 2,
    dsr: 'modified',
    gentlemansRule: true,
  };
}

test('ruleset Markdown snapshot', () => {
  const markdown = rulesetMarkdown(unaLike(), DEFAULT_GAME, names, { starters: ['Hollow Bastion'], counterpicks: [] });
  assert.equal(markdown, `# Stage list

## Starters (5)

Game 1 striking order: 1-2-1.

- Battlefield
- Final Destination
- Town & City
- Small Battlefield
- Hollow Bastion

## Counterpicks (3)

- Pokémon Stadium 2
- Smashville
- Kalos Pokémon League

## Stage rules

- After each game the winner bans 2 stages.
- Modified DSR is in effect.
- Gentleman's Rule: on.

## Game settings

- Stocks: 3
- Time: 7:00
- Hazards: Off
- Items: Off
- Final Smash meter: Off
- Spirits: Off
`);
});

test('the forms rule is included only once someone writes it, and settings can be edited', () => {
  const game = { ...DEFAULT_GAME, stocks: '2', forms: 'Battlefield: any form. Ω: Final Destination only' };
  const markdown = rulesetMarkdown(emptyBuilder(), game, names);
  assert.match(markdown, /- Stocks: 2/);
  assert.match(markdown, /- Battlefield and Ω forms: Battlefield: any form\. Ω: Final Destination only/);
  assert.doesNotMatch(rulesetMarkdown(emptyBuilder(), DEFAULT_GAME, names), /forms/);
  assert.deepEqual(gameLines({ ...DEFAULT_GAME, items: '   ' }).map(([k]) => k), ['Stocks', 'Time', 'Hazards', 'Final Smash meter', 'Spirits']);
});

test('empty lists and unusual settings read sensibly', () => {
  const markdown = rulesetMarkdown({ ...emptyBuilder(), bans: 0, dsr: 'none' }, DEFAULT_GAME, names);
  assert.match(markdown, /## Starters \(0\)\n\nNone\./);
  assert.match(markdown, /does not ban any stages/);
  assert.match(markdown, /No stage repeat rule \(DSR is not in effect\)/);
  assert.match(markdown, /Gentleman's Rule: off/);
  assert.doesNotMatch(markdown, /striking order/);
  assert.deepEqual(ruleLines({ ...emptyBuilder(), bans: 1, dsr: 'dsr' }).slice(0, 2),
    ['After each game the winner bans 1 stage.', 'DSR is in effect.']);
});

/** A stand-in for a canvas context that records what is drawn. */
function recordingContext() {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'calls') return calls;
      if (prop === 'measureText') return (text) => ({ width: String(text).length * 6 });
      return (...args) => calls.push([prop, ...args]);
    },
    set(target, prop, value) {
      calls.push(['set', prop, value]);
      return true;
    },
  });
  return ctx;
}

test('the image shows the title, both rows with stage names and the settings', () => {
  const ctx = recordingContext();
  const builder = unaLike();
  renderStageListImage(ctx, {
    title: 'Spring Open stage list',
    starters: builder.starters.map((i) => stages.find((s) => s.id === i)),
    counterpicks: builder.counterpicks.map((i) => stages.find((s) => s.id === i)),
    reference: byName('Battlefield'),
    rules: ['Game 1 striking: 1-2-1', 'Winner bans 2'],
    settings: ['Stocks: 3', 'Time: 7:00'],
    missing: { starters: 1, counterpicks: 0 },
  }, COLORS);

  const text = ctx.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
  assert.ok(text.includes('Spring Open stage list'));
  assert.ok(text.includes('Starters (5)'));
  assert.ok(text.includes('Counterpicks (3)'));
  assert.ok(text.includes('+1 not in the data yet')); // the missing starter
  for (const name of ['Battlefield', 'Final Destination', 'Smashville', 'Kalos Pokémon League']) assert.ok(text.includes(name), name);
  assert.ok(text.includes('Game 1 striking: 1-2-1  ·  Winner bans 2'));
  assert.ok(text.includes('Stocks: 3  ·  Time: 7:00'));
  // The background covers the whole 1200x675 image, and every stage tile has a diagram drawn in it.
  assert.deepEqual(ctx.calls.find((c) => c[0] === 'fillRect'), ['fillRect', 0, 0, IMAGE.width, IMAGE.height]);
  assert.ok(ctx.calls.filter((c) => c[0] === 'strokeRect').length >= 7 * 2); // at least a border and a blast-zone box per tile
  // The picture uses the page's colors.
  const used = new Set(ctx.calls.filter((c) => c[0] === 'set' && /Style$/.test(c[1])).map((c) => c[2]));
  for (const color of [COLORS.bg, COLORS.text, COLORS.accent, COLORS.zoneFar, COLORS.stage]) assert.ok(used.has(color), color);
  // Nothing is drawn outside the image.
  for (const [name, ...args] of ctx.calls) {
    if (!['fillText', 'strokeRect', 'moveTo'].includes(name)) continue;
    const [x, y] = name === 'fillText' ? args.slice(1) : args; // fillText's first argument is the text
    assert.ok(x >= 0 && x <= IMAGE.width && y >= 0 && y <= IMAGE.height, `${name} ${x},${y}`);
  }
});

test('long names are cut to fit and empty lists say so', () => {
  const ctx = recordingContext();
  const long = { ...byName('Battlefield'), id: 9001, name: 'A very very long stage name that cannot fit in a tile' };
  renderStageListImage(ctx, {
    title: 't', starters: [long], counterpicks: [], reference: null, rules: [], settings: [], missing: { starters: 0, counterpicks: 2 },
  }, COLORS);
  const text = ctx.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
  assert.ok(text.some((t) => t.endsWith('…') && t.length < long.name.length));
  assert.ok(text.includes('2 not in the data yet'));
});
