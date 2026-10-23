// The striking simulator's page: DOM wiring only. The rules are in strike-engine.js. It is opened from the
// stage list builder with the lists and settings in the address (see permalink.js), and every screen asks for
// one thing: who strikes first, a stage to strike, a winner, a stage to ban, a stage to pick.

import { decode } from './permalink.js';
import { stageDiagram } from './diagram.js';
import { STAGE_LIST_PRESETS } from './presets.js';
import { DSR_OPTIONS, strikingOrder } from './builder.js';
import {
  actingPlayer, ban, createSet, dsrBlocked, gamesToWin, pickStage, recordWinner, setWinner, strike, whyNotPickable,
} from './strike-engine.js';

const $ = (id) => document.getElementById(id);

let stages = [];
let byId = new Map();
let reference = null;
let builder = null;
let setup = { names: ['Player 1', 'Player 2'], bestOf: 3, first: 0 };
let history = []; // the set's states; the last one is the current one

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

const name = (player) => setup.names[player];
const stageName = (id) => byId.get(id)?.name ?? `Stage ${id}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** A big button for one stage. `onPick` is left out for a stage that can't be chosen; `reason` says why. */
function stageButton(id, onPick, reason = '') {
  const stage = byId.get(id);
  const picture = el('span', { class: 'sb-picture' });
  picture.innerHTML = stageDiagram(stage, reference);
  const button = el('button', { type: 'button', class: 'stage-button' }, picture,
    el('span', { class: 'sb-name' }, stage.name), ...(reason ? [el('span', { class: 'sb-reason' }, reason)] : []));
  if (onPick) button.addEventListener('click', onPick);
  else button.disabled = true;
  return el('li', {}, button);
}

const grid = (...items) => el('ul', { class: 'stage-grid' }, ...items);
const score = (state) => `${name(0)}: ${state.wins[0]} · ${name(1)}: ${state.wins[1]}`;

function push(next) {
  history.push(next);
  render();
}

// ---------- screens ----------

function screenProblem(message) {
  return [el('h2', {}, 'This stage list can\'t be simulated'), el('p', {}, message),
    el('p', {}, el('a', { href: $('back').href, class: 'button' }, 'Back to the builder'))];
}

function screenSetup() {
  const names = [0, 1].map((i) => el('input', { type: 'text', value: setup.names[i], maxlength: '30', 'aria-label': `Player ${i + 1} name`, 'data-name': i }));
  const radio = (group, value, label, checked) => el('label', { class: 'choice' },
    el('input', { type: 'radio', name: group, value: String(value), ...(checked ? { checked: '' } : {}) }), label);
  const start = el('button', { type: 'button', class: 'primary big', id: 'start' }, 'Start the set');
  start.addEventListener('click', () => {
    const typed = names.map((input, i) => input.value.trim() || `Player ${i + 1}`);
    setup = {
      names: typed,
      bestOf: Number(document.querySelector('input[name="bestOf"]:checked').value),
      first: Number(document.querySelector('input[name="first"]:checked').value),
    };
    history = [createSet({
      starters: builder.starters, counterpicks: builder.counterpicks, bans: builder.bans, dsr: builder.dsr,
      bestOf: setup.bestOf, first: setup.first,
    })];
    render();
  });
  const dsr = DSR_OPTIONS.find((o) => o.value === builder.dsr)?.label ?? 'No DSR';
  return [
    el('h2', {}, 'Set up the set'),
    el('p', { class: 'hint' }, `${plural(builder.starters.length, 'starter')} (${strikingOrder(builder.starters.length)} striking), `
      + `${plural(builder.counterpicks.length, 'counterpick')}, winner bans ${builder.bans}, ${dsr}.`),
    el('div', { class: 'setup-field' }, el('span', { class: 'name' }, 'Players'), ...names),
    el('fieldset', {}, el('legend', {}, 'Length of the set'),
      el('div', { class: 'choices' }, radio('bestOf', 3, 'Best of 3', setup.bestOf === 3), radio('bestOf', 5, 'Best of 5', setup.bestOf === 5))),
    el('fieldset', {}, el('legend', {}, 'Who strikes first?'),
      el('div', { class: 'choices' }, radio('first', 0, 'Player 1', setup.first === 0), radio('first', 1, 'Player 2', setup.first === 1)),
      el('p', { class: 'hint' }, 'The first striker goes first in the striking order. Decide it however your event does (for example rock-paper-scissors).'),
    ),
    start,
  ];
}

function screenStrike(state) {
  const left = state.strikesLeftInStep;
  return [
    el('h2', {}, `${name(actingPlayer(state))}: strike ${plural(left, 'stage')}`),
    el('p', { class: 'hint' }, `Game 1. Tap a starter to strike it. ${state.remaining.length - 1} more ${state.remaining.length - 1 === 1 ? 'strike' : 'strikes'} until one stage is left.`),
    grid(...state.remaining.map((id) => stageButton(id, () => push(strike(history.at(-1), id))))),
  ];
}

function screenPlay(state) {
  const n = state.games.length + 1;
  const picture = el('div', { class: 'big-picture' });
  picture.innerHTML = stageDiagram(byId.get(state.stage), reference, { label: true });
  const won = (player) => {
    const button = el('button', { type: 'button', class: 'primary big' }, `${name(player)} won`);
    button.addEventListener('click', () => push(recordWinner(history.at(-1), player)));
    return button;
  };
  return [
    el('h2', {}, `Game ${n}: ${stageName(state.stage)}`),
    el('p', { class: 'hint' }, `${score(state)} · first to ${gamesToWin(state)}`),
    picture,
    el('p', {}, 'Play the game, then say who won.'),
    el('div', { class: 'win-buttons' }, won(0), won(1)),
  ];
}

function screenBan(state) {
  const left = state.bansLeft;
  const all = state.config.allStages;
  return [
    el('h2', {}, `${name(state.banner)}: ban ${plural(left, 'stage')}`),
    el('p', { class: 'hint' }, `${score(state)}. ${name(state.picker)} will pick the next stage from what is left.`),
    grid(...all.map((id) => (state.banned.includes(id)
      ? stageButton(id, null, 'Banned')
      : stageButton(id, () => push(ban(history.at(-1), id)))))),
  ];
}

function screenPick(state) {
  const reasonText = { banned: 'Banned', dsr: "Can't pick (stage repeat rule)" };
  const blocked = dsrBlocked(state, state.picker);
  return [
    el('h2', {}, `${name(state.picker)}: pick the stage for game ${state.games.length + 1}`),
    el('p', { class: 'hint' }, `${score(state)}.${blocked.length ? ` ${name(state.picker)} can't pick ${blocked.map(stageName).join(', ')} (stage repeat rule).` : ''}`),
    grid(...state.config.allStages.map((id) => {
      const why = whyNotPickable(state, id);
      return stageButton(id, why ? null : () => push(pickStage(history.at(-1), id)), why ? reasonText[why] : '');
    })),
  ];
}

function screenDone(state) {
  const winner = setWinner(state);
  return [
    el('h2', {}, `${name(winner)} wins the set`),
    el('p', {}, `${score(state)}`),
    el('ol', { class: 'games' }, ...state.games.map((g) => el('li', {}, `${stageName(g.stage)}: ${name(g.winner)} won`))),
    (() => {
      const again = el('button', { type: 'button', class: 'primary big' }, 'New set');
      again.addEventListener('click', () => { history = []; render(); });
      return again;
    })(),
  ];
}

// ---------- log, undo, render ----------

function describe(entry) {
  const who = name(entry.player);
  return {
    strike: `Game ${entry.game}: ${who} struck ${stageName(entry.stage)}.`,
    ban: `Game ${entry.game}: ${who} banned ${stageName(entry.stage)}.`,
    pick: `Game ${entry.game}: ${who} picked ${stageName(entry.stage)}.`,
    win: `Game ${entry.game}: ${who} won on ${stageName(entry.stage)}.`,
  }[entry.type];
}

function render() {
  const state = history.at(-1);
  let nodes;
  if (!state) nodes = screenSetup();
  else nodes = { strike: screenStrike, play: screenPlay, ban: screenBan, pick: screenPick, done: screenDone }[state.phase](state);
  $('screen').replaceChildren(...nodes);
  $('undo-row').hidden = !state;
  $('log-section').hidden = !state || state.log.length === 0;
  $('log').replaceChildren(...(state?.log ?? []).map((e) => el('li', {}, describe(e))));
  window.scrollTo(0, 0);
}

async function init() {
  try {
    const response = await fetch('data/stages.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    stages = await response.json();
  } catch (err) {
    $('screen').replaceChildren(...screenProblem(`The stage list could not be loaded (${err.message}).`));
    return;
  }
  byId = new Map(stages.map((s) => [s.id, s]));
  reference = stages.find((s) => s.name === 'Battlefield') ?? null;
  $('back').href = `index.html${location.hash}`;

  const { state, notices } = decode(location.hash, {
    stageIds: new Set(byId.keys()),
    presetIds: new Set(STAGE_LIST_PRESETS.map((p) => p.id)),
  });
  builder = state.builder;

  const missing = builder.missingStarters + builder.missingCounterpicks;
  if (!strikingOrder(builder.starters.length)) {
    const n = builder.starters.length;
    $('screen').replaceChildren(...screenProblem(
      `The simulator needs 3, 5 or 7 starters that are in the data, and this list has ${n}`
      + `${missing ? ` (${missing} more ${missing === 1 ? 'stage is' : 'stages are'} not in the data yet)` : ''}. ${notices.join(' ')}`));
    return;
  }

  $('undo').addEventListener('click', () => {
    history.pop();
    render();
  });
  render();
}

init();
