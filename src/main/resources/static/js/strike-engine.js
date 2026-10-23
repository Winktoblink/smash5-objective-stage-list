// The striking simulator's rules. Pure functions, no DOM: every function takes a state and returns a new one,
// so the page can keep a history and offer "undo", and Node can test whole sets.
//
// Players are 0 and 1. A set goes through these phases:
//   strike  game 1: the players take turns striking starters until one is left (order from strikingOrder)
//   play    a stage is chosen and the game is played; the caller records the winner
//   ban     the winner of the last game bans stages from the full list
//   pick    the loser of the last game picks from what is left, without breaking the stage repeat rule (DSR)
//   done    one player has won enough games

import { strikingOrder } from './builder.js';

/**
 * Who strikes how many stages in game 1. `0` is the player who strikes first. The order ends with one starter
 * left, so 3 starters give 1-1, 5 give 1-2-1 and 7 give 1-2-2-1.
 */
export function strikeSteps(starterCount) {
  const order = strikingOrder(starterCount);
  if (!order) return null;
  return order.split('-').map((count, i) => ({ player: i % 2, count: Number(count) }));
}

/**
 * Starts a set. `config` is `{ starters, counterpicks, bans, dsr, bestOf, first }`: stage ids, how many stages
 * the winner bans, 'none' | 'dsr' | 'modified', 3 or 5, and which player (0 or 1) strikes first.
 * Throws if the lists can't make a set.
 */
export function createSet(config) {
  const steps = strikeSteps(config.starters.length);
  if (!steps) throw new Error(`There is no standard striking order for ${config.starters.length} starters.`);
  if (config.starters.some((id) => config.counterpicks.includes(id))) throw new Error('A stage is both a starter and a counterpick.');
  if (![3, 5].includes(config.bestOf)) throw new Error('A set is best of 3 or best of 5.');
  return {
    config: { ...config, allStages: [...config.starters, ...config.counterpicks] },
    phase: 'strike',
    steps,
    stepIndex: 0,
    strikesLeftInStep: steps[0].count,
    remaining: [...config.starters],
    striker: (config.first + steps[0].player) % 2,
    games: [],
    wins: [0, 0],
    banned: [],
    banner: null,
    picker: null,
    bansLeft: 0,
    stage: null,
    log: [],
  };
}

const other = (player) => 1 - player;
const fail = (message) => {
  throw new Error(message);
};

/** Games a player needs to win the set. */
export function gamesToWin(state) {
  return Math.ceil(state.config.bestOf / 2);
}

/** The stages `player` may not pick, because of DSR: all they have won on, or only the last for modified DSR. */
export function dsrBlocked(state, player) {
  const wonOn = state.games.filter((g) => g.winner === player).map((g) => g.stage);
  if (state.config.dsr === 'dsr') return [...new Set(wonOn)];
  if (state.config.dsr === 'modified') return wonOn.length ? [wonOn.at(-1)] : [];
  return [];
}

/** Stages the picker can choose from right now: not banned, not blocked by DSR. */
export function pickable(state) {
  const blocked = new Set([...state.banned, ...dsrBlocked(state, state.picker ?? 0)]);
  return state.config.allStages.filter((id) => !blocked.has(id));
}

/** Why a stage can't be picked, or null if it can. */
export function whyNotPickable(state, id) {
  if (state.banned.includes(id)) return 'banned';
  if (dsrBlocked(state, state.picker).includes(id)) return 'dsr';
  return null;
}

/** Stages that can be struck (game 1) or banned (after a game) right now. */
export function selectable(state) {
  if (state.phase === 'strike') return [...state.remaining];
  if (state.phase === 'ban') return state.config.allStages.filter((id) => !state.banned.includes(id));
  return [];
}

/** Which player has to act, or null when nobody does. */
export function actingPlayer(state) {
  return { strike: state.striker, ban: state.banner, pick: state.picker }[state.phase] ?? null;
}

const log = (state, entry) => [...state.log, { game: state.games.length + 1, ...entry }];

/** Game 1: the current striker strikes a starter. When one is left, it becomes the stage to play. */
export function strike(state, id) {
  if (state.phase !== 'strike') fail('Striking is over.');
  if (!state.remaining.includes(id)) fail('That stage is not one of the remaining starters.');
  const remaining = state.remaining.filter((x) => x !== id);
  const next = { ...state, remaining, log: log(state, { type: 'strike', player: state.striker, stage: id }) };

  if (remaining.length === 1) return { ...next, phase: 'play', stage: remaining[0], striker: null, strikesLeftInStep: 0 };

  const strikesLeftInStep = state.strikesLeftInStep - 1;
  if (strikesLeftInStep > 0) return { ...next, strikesLeftInStep };
  const stepIndex = state.stepIndex + 1;
  const step = state.steps[stepIndex];
  return { ...next, stepIndex, strikesLeftInStep: step.count, striker: (state.config.first + step.player) % 2 };
}

/** Records who won the game that is being played. Starts the ban phase, or ends the set. */
export function recordWinner(state, winner) {
  if (state.phase !== 'play') fail('There is no game being played.');
  if (winner !== 0 && winner !== 1) fail('The winner is player 0 or 1.');
  const games = [...state.games, { stage: state.stage, winner }];
  const wins = [...state.wins];
  wins[winner] += 1;
  const next = { ...state, games, wins, log: log(state, { type: 'win', player: winner, stage: state.stage }), stage: null };

  if (wins[winner] >= gamesToWin(state)) return { ...next, phase: 'done', banner: null, picker: null, bansLeft: 0, banned: [] };

  const picker = other(winner);
  const ready = { ...next, phase: 'ban', banner: winner, picker, banned: [] };
  // Whatever the winner bans, the loser must keep at least one stage to choose from.
  const bansLeft = Math.max(0, Math.min(state.config.bans, pickable(ready).length - 1));
  return bansLeft === 0 ? { ...ready, phase: 'pick', bansLeft: 0 } : { ...ready, bansLeft };
}

/** The winner bans a stage. Once their bans are used up, the loser picks. */
export function ban(state, id) {
  if (state.phase !== 'ban') fail('It is not the ban phase.');
  if (!state.config.allStages.includes(id)) fail('That stage is not on the stage list.');
  if (state.banned.includes(id)) fail('That stage is already banned.');
  const banned = [...state.banned, id];
  const next = { ...state, banned, bansLeft: state.bansLeft - 1, log: log(state, { type: 'ban', player: state.banner, stage: id }) };
  return next.bansLeft === 0 ? { ...next, phase: 'pick' } : next;
}

/** The loser of the last game picks the next stage. Banned and DSR-blocked stages can't be picked. */
export function pickStage(state, id) {
  if (state.phase !== 'pick') fail('It is not the pick phase.');
  const reason = whyNotPickable(state, id);
  if (!state.config.allStages.includes(id)) fail('That stage is not on the stage list.');
  if (reason === 'banned') fail('That stage was banned.');
  if (reason === 'dsr') fail('The stage repeat rule stops this player picking that stage.');
  return {
    ...state,
    phase: 'play',
    stage: id,
    banned: [],
    banner: null,
    picker: null,
    log: log(state, { type: 'pick', player: state.picker, stage: id }),
  };
}

/** The set's winner, or null while it is still being played. */
export function setWinner(state) {
  return state.phase === 'done' ? (state.wins[0] > state.wins[1] ? 0 : 1) : null;
}
