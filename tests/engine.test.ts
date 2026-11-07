import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyAction, choicePrompt, question, validAnswer } from '../src/games/engine.ts';
import { boardMove, newBoard, reversiCaptures } from '../src/games/boards.ts';
import { games, playable } from '../src/games/registry.ts';
import { initialState } from '../src/room/model.ts';
import type { QuizMode, RoomState, Seat } from '../src/room/model.ts';
import { localRoom } from '../src/room/local.ts';

const time = 1_790_000_000_000;
const id = 'b'.repeat(20);

function started(game: string, mode: QuizMode = 'quick', base = initialState()) {
  const proposed = applyAction(base, { type: 'propose', game, mode }, 'a', time)!;
  const aReady = applyAction(proposed, { type: 'ready' }, 'a', time)!;
  assert.equal(applyAction(aReady, { type: 'start', id, seed: 62 }, 'a', time), undefined);
  const ready = applyAction(aReady, { type: 'ready' }, 'b', time)!;
  assert.equal(applyAction(ready, { type: 'start', id, seed: 62 }, 'b', time), undefined);
  return applyAction(ready, { type: 'start', id, seed: 62 }, 'a', time)!;
}

test('the full catalog is represented and every playable entry can enter a game', () => {
  assert.equal(games.length, 69);
  assert.equal(new Set(games.map((game) => game.id)).size, 69);
  const base = initialState();
  base.consent = { a: 3, b: 2 };
  for (const game of playable) assert.equal(started(game.id, 'quick', base).session?.game, game.id);
});

test('both answers are required and score applies once', () => {
  const state = started('this-or-that');
  const a = { value: '0', at: time, locked: true as const };
  assert.equal(applyAction(state, { type: 'settle', answers: { a } }, 'a', time), undefined);
  const result = applyAction(state, { type: 'settle', answers: { a, b: a } }, 'b', time)!;
  assert.equal(result.session?.score.a, 1);
  assert.equal(result.session?.phase, 'reveal');
  assert.equal(applyAction(result, { type: 'settle', answers: { a, b: a } }, 'a', time), undefined);
  const next = applyAction(result, { type: 'advance' }, 'a', time)!;
  assert.notDeepEqual(choicePrompt(state.session!), choicePrompt(next.session!));
});

test('quiz preserves deterministic rounds, rejects early and late settlement, and handles missing answers', () => {
  const state = started('animals', 'blitz');
  const s = state.session!;
  assert.equal(s.deadline, time + 12_000);
  assert.equal(question(s)?.id, question(started('animals', 'blitz').session!)?.id);
  assert.ok(validAnswer(s, String(question(s)!.answer)));
  const value = String(question(s)!.answer);
  const a = { value, at: s.deadline - 1, locked: true as const };
  assert.equal(applyAction(state, { type: 'settle', answers: { a } }, 'a', s.deadline - 1), undefined);
  assert.equal(applyAction(state, { type: 'settle', answers: { a: { ...a, at: s.deadline + 1 } } }, 'a', s.deadline + 2), undefined);
  const result = applyAction(state, { type: 'settle', answers: { a } }, 'a', s.deadline)!;
  assert.deepEqual(result.session?.score, { a: 1, b: 0 });
});

test('consent is per seat, takes the lower level, and revocation closes the game', () => {
  let state = applyAction(initialState(), { type: 'consent', level: 3 }, 'a', time)!;
  assert.equal(applyAction(state, { type: 'propose', game: 'confessions' }, 'a', time), undefined);
  state = applyAction(state, { type: 'consent', level: 1 }, 'b', time)!;
  const active = started('confessions', 'quick', state);
  assert.equal(active.session?.intensity, 1);
  const stopped = applyAction(active, { type: 'consent', level: 0 }, 'b', time)!;
  assert.equal(stopped.session, undefined);
  assert.equal(stopped.consent.a, 3);
});

test('Connect Four checks gravity, turn ownership, wins and one result increment', () => {
  let state = started('connect-four');
  assert.equal(applyAction(state, { type: 'move', value: 0 }, 'b', time), undefined);
  const moves: [Seat, number][] = [['a', 0], ['b', 1], ['a', 0], ['b', 1], ['a', 0], ['b', 1], ['a', 0]];
  for (const [side, column] of moves) state = applyAction(state, { type: 'move', value: column }, side, time)!;
  assert.equal(state.session?.phase, 'result');
  assert.equal(state.session?.board[35], 'a');
  assert.equal(state.stats.a, 1);
  assert.equal(state.stats.played, 1);
  assert.equal(applyAction(state, { type: 'move', value: 1 }, 'b', time), undefined);
});

test('Connect Four detects a rising diagonal and rejects full or invalid columns', () => {
  let board = newBoard('connect-four');
  const moves: [Seat, number][] = [['a',0], ['b',1], ['a',1], ['b',2], ['b',2], ['a',2], ['b',3], ['b',3], ['b',3], ['a',3]];
  for (const [seat, col] of moves) {
    const move = boardMove('connect-four', board, seat, col, '');
    assert.ok(move);
    board = move.board;
    if (seat === 'a' && col === 3) assert.deepEqual([move.done, move.a, move.b], [true, 1, 0]);
  }
  assert.equal(boardMove('connect-four', board, 'b', 7, ''), undefined);
  assert.equal(boardMove('connect-four', 'a'.repeat(42), 'b', 0, ''), undefined);
});

test('Reversi flips across directions and terminates when neither seat can move', () => {
  const opening = newBoard('reversi');
  assert.equal(opening.length, 64);
  assert.deepEqual(reversiCaptures(opening, 19, 'a'), [27]);
  assert.equal(boardMove('reversi', opening, 'a', 0, ''), undefined);
  const moved = boardMove('reversi', opening, 'a', 19, '')!;
  assert.equal(moved.board[27], 'a');
  assert.deepEqual([moved.a, moved.b, moved.turn], [4, 1, 'b']);
  const final = boardMove('reversi', 'a'.repeat(62) + 'b.', 'a', 63, '')!;
  assert.deepEqual([final.a, final.b, final.done], [64, 0, true]);
});

test('Dots & Boxes gives an extra turn when a line closes a box', () => {
  const board = 'b..b........b...........';
  const move = boardMove('dots-boxes', board, 'a', 13, '.........')!;
  assert.equal(move.turn, 'a');
  assert.equal(move.claims?.[0], 'a');
  assert.equal(move.a, 1);
});

test('split puzzle advances only after solving and follows a stable daily date', () => {
  const state = started('escape');
  const wrong = applyAction(state, { type: 'solve', value: 'wrong' }, 'b', time)!;
  assert.equal(wrong.session?.phase, 'playing');
  assert.equal(wrong.session?.misses, 1);
  const solved = applyAction(wrong, { type: 'solve', value: 'KRY' }, 'b', time)!;
  assert.equal(solved.session?.detail, 'The brass box-office key');
  assert.equal(applyAction(solved, { type: 'advance' }, 'a', time)?.session?.round, 1);
  assert.equal(started('daily-teaser').session?.seed, Math.floor(time / 86_400_000));
});

test('same-device adapter hides another seat’s answer and rejects stale revisions', async () => {
  const client = localRoom();
  let state: RoomState = initialState();
  const stop = client.watchRoom((room) => { state = room.state; }, () => {});
  const stale = state;
  assert.ok(await client.dispatch(state, { type: 'propose', game: 'this-or-that' }));
  assert.equal(await client.dispatch(stale, { type: 'ready' }), false);
  await client.dispatch(state, { type: 'ready' });
  client.switchSeat?.();
  await client.dispatch(state, { type: 'ready' });
  client.switchSeat?.();
  await client.dispatch(state, { type: 'start', id, seed: 4 });
  const s = state.session!;
  await client.lock(s, '0');
  await assert.rejects(() => client.lock(s, '1'));
  client.switchSeat?.();
  assert.equal((await client.answers(s)).a, undefined);
  await client.lock(s, '1');
  assert.equal((await client.answers(s)).a?.value, '0');
  stop();
});
