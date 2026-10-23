import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  actingPlayer, ban, createSet, dsrBlocked, gamesToWin, pickStage, pickable, recordWinner, selectable, setWinner,
  strike, strikeSteps, whyNotPickable,
} from '../../main/resources/static/js/strike-engine.js';

// Plain ids: the engine does not look at stage data.
const STARTERS = [1, 2, 3, 4, 5];
const COUNTERPICKS = [6, 7, 8];
const config = (extra = {}) => ({
  starters: STARTERS, counterpicks: COUNTERPICKS, bans: 2, dsr: 'none', bestOf: 5, first: 0, ...extra,
});

/** Game 1 striking for five starters: player 0 strikes 1, player 1 strikes 2 and 3, player 0 strikes 4. Stage 5 is played. */
function afterStriking(extra = {}) {
  let state = createSet(config(extra));
  for (const id of [1, 2, 3, 4]) state = strike(state, id);
  return state;
}

test('striking steps: 1-1 for 3 starters, 1-2-1 for 5, 1-2-2-1 for 7, none for other counts', () => {
  assert.deepEqual(strikeSteps(3), [{ player: 0, count: 1 }, { player: 1, count: 1 }]);
  assert.deepEqual(strikeSteps(5), [{ player: 0, count: 1 }, { player: 1, count: 2 }, { player: 0, count: 1 }]);
  assert.deepEqual(strikeSteps(7).map((s) => s.count), [1, 2, 2, 1]);
  assert.equal(strikeSteps(4), null);
  assert.equal(strikeSteps(9), null);
});

test('every standard order leaves exactly one starter', () => {
  for (const n of [3, 5, 7]) {
    const total = strikeSteps(n).reduce((sum, s) => sum + s.count, 0);
    assert.equal(total, n - 1);
  }
});

test('a set needs a standard number of starters, no stage in both lists, and best of 3 or 5', () => {
  assert.throws(() => createSet(config({ starters: [1, 2, 3, 4] })), /no standard striking order/);
  assert.throws(() => createSet(config({ counterpicks: [5, 6] })), /both a starter and a counterpick/);
  assert.throws(() => createSet(config({ bestOf: 7 })), /best of 3 or best of 5/);
});

test('game 1 striking follows the order and who strikes first', () => {
  let state = createSet(config({ first: 1 }));
  const actors = [];
  for (const id of [1, 2, 3, 4]) {
    actors.push(actingPlayer(state));
    state = strike(state, id);
  }
  assert.deepEqual(actors, [1, 0, 0, 1]); // player 1 strikes first: 1-2-1 means 1, then 0 twice, then 1
  assert.equal(state.phase, 'play');
  assert.equal(state.stage, 5);
  assert.deepEqual(state.log.map((e) => [e.type, e.player, e.stage]), [
    ['strike', 1, 1], ['strike', 0, 2], ['strike', 0, 3], ['strike', 1, 4],
  ]);
});

test('a struck or unknown stage cannot be struck again, and striking ends once a stage is chosen', () => {
  let state = createSet(config());
  state = strike(state, 1);
  assert.throws(() => strike(state, 1), /not one of the remaining starters/);
  assert.throws(() => strike(state, 7), /not one of the remaining starters/);
  assert.deepEqual(selectable(state), [2, 3, 4, 5]);
  assert.throws(() => strike(afterStriking(), 5), /Striking is over/);
});

test('a full best-of-5 transcript with standard DSR', () => {
  let state = afterStriking({ dsr: 'dsr' });
  assert.equal(state.stage, 5);

  // Game 1: player 0 wins on 5. Player 0 bans 6 and 7, then player 1 picks 8.
  state = recordWinner(state, 0);
  assert.deepEqual([state.phase, state.banner, state.picker, state.bansLeft, state.wins], ['ban', 0, 1, 2, [1, 0]]);
  state = ban(state, 6);
  state = ban(state, 7);
  assert.equal(state.phase, 'pick');
  assert.deepEqual(pickable(state).sort(), [1, 2, 3, 4, 5, 8]);
  state = pickStage(state, 8);
  assert.deepEqual([state.phase, state.stage, state.banned], ['play', 8, []]);

  // Game 2: player 1 wins on 8. Player 0 picks next and may not pick 5, which they won on.
  state = recordWinner(state, 1);
  assert.deepEqual([state.banner, state.picker, state.wins], [1, 0, [1, 1]]);
  state = ban(state, 1);
  state = ban(state, 2);
  assert.equal(whyNotPickable(state, 5), 'dsr');
  assert.equal(whyNotPickable(state, 1), 'banned');
  assert.throws(() => pickStage(state, 5), /stage repeat rule/);
  assert.throws(() => pickStage(state, 1), /banned/);
  state = pickStage(state, 3);

  // Game 3: player 0 wins on 3. Player 1 may not pick 8.
  state = recordWinner(state, 0);
  assert.deepEqual([state.picker, state.wins], [1, [2, 1]]);
  assert.deepEqual(dsrBlocked(state, 1), [8]);
  state = ban(state, 4);
  state = ban(state, 6);
  state = pickStage(state, 7);

  // Game 4: player 1 wins on 7 (2-2). Player 0 may not pick 5 or 3.
  state = recordWinner(state, 1);
  assert.deepEqual(state.wins, [2, 2]);
  assert.deepEqual(dsrBlocked(state, 0).sort(), [3, 5]);
  state = ban(state, 1);
  state = ban(state, 2);
  state = pickStage(state, 4);

  // Game 5: player 0 wins on 4 and takes the set.
  state = recordWinner(state, 0);
  assert.deepEqual([state.phase, state.wins, setWinner(state)], ['done', [3, 2], 0]);
  assert.deepEqual(state.games, [
    { stage: 5, winner: 0 }, { stage: 8, winner: 1 }, { stage: 3, winner: 0 }, { stage: 7, winner: 1 }, { stage: 4, winner: 0 },
  ]);
  assert.equal(actingPlayer(state), null);
  assert.throws(() => recordWinner(state, 1), /no game being played/);
});

test('each DSR variant blocks different stages', () => {
  // Player 0 won on 5 and then on 3. Player 1 won on 8. It is player 0's turn to pick.
  const scenario = (dsr) => {
    let state = afterStriking({ dsr });
    state = recordWinner(state, 0); // game 1 on 5
    state = ban(state, 6);
    state = ban(state, 7);
    state = pickStage(state, 8);
    state = recordWinner(state, 1); // game 2 on 8
    state = ban(state, 1);
    state = ban(state, 2);
    state = pickStage(state, 3);
    state = recordWinner(state, 0); // game 3 on 3, so player 1 picks next
    state = ban(state, 4);
    state = ban(state, 6);
    state = pickStage(state, 7);
    return recordWinner(state, 1); // game 4 on 7: 2-2, player 0 picks game 5
  };
  assert.deepEqual(dsrBlocked(scenario('none'), 0), []);
  assert.deepEqual(dsrBlocked(scenario('dsr'), 0).sort(), [3, 5]);
  assert.deepEqual(dsrBlocked(scenario('modified'), 0), [3]); // only the last stage they won on

  const modified = scenario('modified');
  const afterBans = ban(ban(modified, 1), 2);
  assert.equal(pickStage(afterBans, 5).stage, 5); // allowed again under modified DSR
  assert.throws(() => pickStage(afterBans, 3), /stage repeat rule/);

  const none = ban(ban(scenario('none'), 1), 2);
  assert.equal(pickStage(none, 3).stage, 3); // no DSR: anything not banned
});

test('DSR never blocks the player who is not picking, and nothing is blocked in game 2 before a win', () => {
  const state = recordWinner(afterStriking({ dsr: 'dsr' }), 0);
  assert.deepEqual(dsrBlocked(state, 1), []); // the loser has won nothing
  assert.deepEqual(dsrBlocked(state, 0), [5]); // the winner would be blocked, but the loser picks
  assert.equal(whyNotPickable(ban(ban(state, 6), 7), 5), null); // 5 is fine for the picker, player 1
});

test('the winner cannot leave the loser without a stage to pick', () => {
  // Three starters and no counterpicks, with 3 bans asked for: only 2 can be used, so one stage is left.
  let state = createSet({ starters: [1, 2, 3], counterpicks: [], bans: 3, dsr: 'none', bestOf: 3, first: 0 });
  state = strike(strike(state, 1), 2);
  state = recordWinner(state, 0);
  assert.equal(state.bansLeft, 2);
  state = ban(ban(state, 1), 2);
  assert.equal(state.phase, 'pick');
  assert.deepEqual(pickable(state), [3]);
});

test('with no bans the loser picks straight away, and an already banned stage cannot be banned twice', () => {
  const noBans = recordWinner(afterStriking({ bans: 0 }), 1);
  assert.deepEqual([noBans.phase, noBans.picker], ['pick', 0]);
  let state = recordWinner(afterStriking(), 0);
  state = ban(state, 6);
  assert.throws(() => ban(state, 6), /already banned/);
  assert.throws(() => ban(state, 99), /not on the stage list/);
  assert.throws(() => pickStage(state, 1), /not the pick phase/);
});

test('a best-of-3 set ends at two wins, and the winner is the player with more wins', () => {
  let state = afterStriking({ bestOf: 3 });
  assert.equal(gamesToWin(state), 2);
  state = recordWinner(state, 1);
  assert.equal(state.phase, 'ban');
  state = ban(ban(state, 6), 7);
  state = pickStage(state, 1);
  state = recordWinner(state, 1);
  assert.deepEqual([state.phase, setWinner(state), state.wins], ['done', 1, [0, 2]]);
});

test('striking, banning and picking cannot happen in the wrong phase', () => {
  const play = afterStriking();
  assert.throws(() => ban(play, 6), /not the ban phase/);
  assert.throws(() => pickStage(play, 6), /not the pick phase/);
  assert.throws(() => recordWinner(createSet(config()), 0), /no game being played/);
  assert.throws(() => recordWinner(play, 2), /player 0 or 1/);
  assert.deepEqual(selectable(play), []);
});

test('states are not changed by later moves, so the page can undo', () => {
  const start = createSet(config());
  const after = strike(start, 1);
  assert.deepEqual(start.remaining, STARTERS);
  assert.equal(start.log.length, 0);
  assert.notEqual(after, start);
});
