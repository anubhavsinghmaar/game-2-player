import { adultDecks, choiceDecks, truthCards } from '../data/prompts.ts';
import { quizzes } from '../data/quiz.ts';
import { dateChoices, dateReveals, drawWords, puzzles, storyStarts, surpriseDates } from '../data/scenarios.ts';
import { tidy } from '../room/model.ts';
import type { Answers, QuizDifficulty, QuizMode, RoomState, Seat, Session } from '../room/model.ts';
import { boardMove, newBoard, other } from './boards.ts';
import { byId } from './registry.ts';

export function shuffled<T>(values: readonly T[], seed: number): T[] {
  const items = [...values];
  let state = (seed || 1) >>> 0;
  for (let i = items.length - 1; i > 0; i--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function choicePrompt(s: Session) {
  const list = s.intensity ? adultDecks[s.game]?.[s.intensity - 1] : choiceDecks[s.game];
  return list?.[shuffled(list.map((_, i) => i), s.seed)[s.round % list.length]];
}

function quizDeck(game: string, difficulty: QuizDifficulty) {
  const pack = quizzes[game] ?? [];
  const filtered = pack.filter((item) => item.difficulty === difficulty);
  return difficulty === 'mixed' || !filtered.length ? pack : filtered;
}

export function question(s: Session) {
  const pack = quizDeck(s.game, s.difficulty);
  return shuffled(pack, s.seed)[s.round];
}

export const puzzle = (s: Session) => puzzles[s.game]?.[s.game.startsWith('daily-') ? s.seed % puzzles[s.game].length : s.round];
export const drawingWord = (s: Session) => shuffled(drawWords, s.seed)[s.round % drawWords.length];
const memoryIcons = ['moon', 'heart', 'sparkle', 'flower', 'bolt', 'controller'];
export const memoryDeck = (s: Session) => shuffled([...memoryIcons, ...memoryIcons], s.seed);
export const storyStart = (s: Session) => storyStarts[s.seed % storyStarts.length];
export const dateFields = (s: Session) => s.game === 'dream-date' ? dateChoices : surpriseDates;
export const datePlan = (s: Session) => {
  const [setting, vibe, budget] = s.text.split('\n').map(Number);
  if (s.game === 'mystery-date') return [dateReveals[setting]?.[vibe], surpriseDates[2].options[budget]].filter(Boolean);
  return s.text.split('\n').map((value, index) => dateChoices[index]?.options[Number(value)]).filter(Boolean);
};
export const truth = (s: Session) => shuffled(truthCards[s.intensity - 1], s.seed)[s.round % 4]?.[s.pick];

const roundSeconds = (s: Session) => {
  const engine = byId[s.game]?.engine;
  if (s.game === 'draw-guess') return 75;
  if (engine === 'quiz') return s.mode === 'blitz' ? 12 : 35;
  return 0;
};
const timed = (s: Session, now: number): Session => {
  const seconds = roundSeconds(s);
  return { ...s, deadline: seconds ? now + seconds * 1000 : 0 };
};
const normalized = (value: string) => tidy(value, 500).toLocaleLowerCase('en').replace(/[^\p{L}\p{N}\s]/gu, '').trim();
const masks = [7, 56, 448, 73, 146, 292, 273, 84];

function newSession(state: RoomState, id: string, random: number, now: number): Session | undefined {
  const game = byId[state.selected];
  if (!game?.engine) return;
  const intensity = game.adult ? Math.min(state.consent.a, state.consent.b) : 0;
  if (game.adult && !intensity) return;
  const seed = game.id.startsWith('daily-') ? Math.floor(now / 86_400_000) : random;
  const quizTotal = Math.min(state.mode === 'quick' || state.mode === 'blitz' ? 5 : 10, quizDeck(game.id, state.difficulty).length);
  const promptTotal = (intensity ? adultDecks[game.id]?.[intensity - 1] : choiceDecks[game.id])?.length ?? 5;
  const totals = {
    quiz: quizTotal, choice: game.id === 'rps' ? 5 : Math.min(5, promptTotal), prediction: Math.min(6, promptTotal),
    board: 1, memory: 1, puzzle: game.id.startsWith('daily-') ? 1 : puzzles[game.id]?.length ?? 1,
    story: game.id === 'story' ? 6 : game.id === 'dream-date' ? 4 : 3, drawing: game.id === 'paint' ? 1 : 4,
    truth: 4, bingo: 1,
  };
  return timed({
    id, game: game.id, seed, mode: state.mode, difficulty: state.difficulty, intensity, phase: 'playing',
    round: 0, total: totals[game.engine], turn: 'a', deadline: 0, score: { a: 0, b: 0 },
    board: game.engine === 'board' ? newBoard(game.id, seed) : '', claims: game.id === 'checkers' || game.id === 'higher-lower' ? '.' : '.........', found: 0, first: -1, second: -1,
    hint: 0, misses: 0, text: '', marks: 0, proposed: -1, chooser: 'a', pick: -1, detail: '',
  }, now);
}

export type Action =
  | { type: 'propose'; game: string; mode?: QuizMode; difficulty?: QuizDifficulty }
  | { type: 'ready' | 'exit' | 'end' | 'advance' | 'hint' | 'miss' | 'finish' | 'approve-shuffle' }
  | { type: 'start'; id: string; seed: number }
  | { type: 'consent'; level: number }
  | { type: 'settle'; answers: Answers }
  | { type: 'move' | 'flip' | 'choose' | 'mark'; value: number }
  | { type: 'solve' | 'write'; value: string }
  | { type: 'shuffle'; games: string[] };

export function needsAnswers(s: Session) {
  const engine = byId[s.game]?.engine;
  return engine === 'choice' || engine === 'prediction' || engine === 'quiz';
}

export function validAnswer(s: Session, value: string) {
  if (!value || value.length > 500) return false;
  const engine = byId[s.game]?.engine;
  const options = engine === 'quiz' ? question(s)?.options : choicePrompt(s)?.options;
  if (options) return /^\d$/.test(value) && Number(value) < options.length;
  if (engine === 'quiz') return /^-?\d{1,8}$/.test(value);
  if (s.game === 'hot-takes') return /^(10|[1-9])$/.test(value);
  if (s.game === 'mind-meld') return value.split(/\s+/u).length <= 3;
  return true;
}

function settled(s: Session, answers: Answers, now: number): Session | undefined {
  if (!needsAnswers(s) || s.phase !== 'playing') return;
  const { a, b } = answers;
  if (!a?.locked || !b?.locked) {
    if (!s.deadline || now < s.deadline) return;
  }
  if ([a, b].some((answer) => answer && (!validAnswer(s, answer.value) || (s.deadline > 0 && answer.at > s.deadline)))) return;
  const next = { ...s, phase: 'reveal' as const, detail: '', score: { ...s.score } };
  if (s.game === 'rps' && a && b) {
    const outcome = (Number(a.value) - Number(b.value) + 3) % 3;
    if (outcome) next.score[outcome === 1 ? 'a' : 'b']++;
    next.detail = outcome === 0 ? 'Same throw. It’s a draw.' : 'One clean point.';
  } else if (byId[s.game]?.engine === 'prediction') {
    if (a && b && a.value === b.value) {
      next.score[other(s.turn)]++;
      next.detail = 'You called it!';
    } else next.detail = 'A little surprise.';
  } else if (byId[s.game]?.engine === 'quiz') {
    const q = question(s);
    if (!q) return;
    const distance = (value?: string) => value === undefined ? Infinity : Math.abs(Number(value) - q.answer);
    const dA = distance(a?.value);
    const dB = distance(b?.value);
    const okA = q.options ? dA === 0 : !!a && dA <= dB;
    const okB = q.options ? dB === 0 : !!b && dB <= dA;
    if (s.mode === 'collab') {
      if (okA || okB) next.score.a++;
    } else {
      next.score.a = Math.max(0, s.score.a + (okA ? (s.mode === 'risk' ? 2 : 1) : s.mode === 'risk' ? -1 : 0));
      next.score.b = Math.max(0, s.score.b + (okB ? (s.mode === 'risk' ? 2 : 1) : s.mode === 'risk' ? -1 : 0));
    }
    if (s.mode === 'sudden' && okA !== okB) {
      next.total = s.round + 1;
      next.score = { a: okA ? 1 : 0, b: okB ? 1 : 0 };
    }
    next.detail = q.options ? q.options[q.answer] : String(q.answer);
  } else {
    const match = !!a && !!b && normalized(a.value) === normalized(b.value);
    if (match && !s.intensity && !['caption-clash', 'finish-sentence', 'love-letter'].includes(s.game)) next.score.a++;
    next.detail = s.game === 'hot-takes' && a && b ? `${Math.abs(Number(a.value) - Number(b.value))} points apart`
      : match ? 'You landed in the same place.' : 'Two different takes.';
  }
  return next;
}

function nextRound(s: Session, now: number): Session {
  if (s.round + 1 >= s.total) return { ...s, phase: 'result' };
  return timed({ ...s, phase: 'playing', round: s.round + 1, turn: other(s.turn), detail: '', hint: 0, misses: 0, pick: -1 }, now);
}

function gameAction(s: Session, action: Action, seat: Seat, now: number): Session | undefined {
  const engine = byId[s.game]?.engine;
  if (action.type === 'settle') return settled(s, action.answers, now);
  if (action.type === 'advance' && s.phase !== 'result') {
    if (s.phase === 'reveal' && engine === 'memory') return { ...s, phase: 'playing', first: -1, second: -1, turn: other(s.turn) };
    if (s.phase === 'reveal' || s.intensity && engine !== 'bingo' || engine === 'truth') return nextRound(s, now);
    if (s.game === 'draw-guess' && now >= s.deadline) return { ...s, phase: 'reveal', detail: 'Time’s up!' };
    return;
  }
  if (s.phase !== 'playing') return;

  if (engine === 'board' && action.type === 'move' && s.turn === seat) {
    const move = boardMove(s.game, s.board, seat, action.value, s.claims);
    if (move) return { ...s, board: move.board, turn: move.turn, claims: move.claims ?? s.claims,
      score: { a: move.a, b: move.b }, phase: move.done ? 'result' : 'playing' };
  }
  if (engine === 'memory' && action.type === 'flip' && s.turn === seat && Number.isInteger(action.value)) {
    const i = action.value;
    if (i < 0 || i > 11 || s.first === i || (s.found & (1 << i))) return;
    if (s.first === -1) return { ...s, first: i };
    const deck = memoryDeck(s);
    if (deck[s.first] !== deck[i]) return { ...s, second: i, phase: 'reveal' };
    const found = s.found | (1 << s.first) | (1 << i);
    return { ...s, found, first: -1, second: -1, score: { ...s.score, [seat]: s.score[seat] + 1 }, phase: found === 4095 ? 'result' : 'playing' };
  }
  if (engine === 'puzzle') {
    const current = puzzle(s);
    if (!current) return;
    const isActorGame = ['forbidden', 'charades'].includes(s.game);
    if (action.type === 'hint' && (!isActorGame || seat === s.turn) && s.hint < 1) return { ...s, hint: 1 };
    if (action.type === 'solve' && (!isActorGame || seat !== s.turn) && (s.game !== 'puzzle-relay' || seat === s.turn)) {
      if (!current.answer.some((value) => normalized(value) === normalized(action.value))) return { ...s, misses: s.misses + 1 };
      return { ...s, phase: 'reveal', detail: current.evidence, score: { ...s.score, a: s.score.a + 1 } };
    }
  }
  if (engine === 'drawing') {
    if (s.game === 'paint' && action.type === 'finish') return { ...s, phase: 'result', score: { a: 1, b: 0 } };
    if (s.game === 'draw-guess' && action.type === 'solve' && seat !== s.turn && now < s.deadline) {
      if (normalized(action.value) !== drawingWord(s)) return { ...s, misses: s.misses + 1 };
      return { ...s, phase: 'reveal', detail: 'You got it!', score: { a: s.score.a + 1, b: 0 } };
    }
  }
  if (engine === 'story' && s.turn === seat) {
    if (s.game === 'story' && action.type === 'write') {
      const line = tidy(action.value, 230);
      if (!line || line.split(' ').length > 24) return;
      return { ...nextRound(s, now), text: [s.text, line].filter(Boolean).join('\n'), score: { a: 1, b: 0 } };
    }
    if (s.game !== 'story' && action.type === 'choose' && dateFields(s)[s.round]?.options[action.value]) {
      return { ...nextRound(s, now), text: [s.text, String(action.value)].filter(Boolean).join('\n'), score: { a: 1, b: 0 } };
    }
  }
  if (engine === 'truth' && s.turn === seat && s.pick < 0 && action.type === 'choose' && [0, 1].includes(action.value)) {
    return { ...s, pick: action.value };
  }
  if (engine === 'bingo' && action.type === 'mark' && Number.isInteger(action.value)) {
    if (action.value === -1 && s.proposed !== -1) return { ...s, proposed: -1 };
    if (action.value < 0 || action.value > 8 || (s.marks & (1 << action.value))) return;
    if (s.proposed === action.value && s.chooser !== seat) {
      const marks = s.marks | (1 << action.value);
      const done = masks.some((mask) => (marks & mask) === mask);
      return { ...s, marks, proposed: -1, phase: done ? 'result' : 'playing', score: { a: done ? 1 : 0, b: 0 } };
    }
    if (s.proposed === -1) return { ...s, proposed: action.value, chooser: seat };
  }
}

export function applyAction(state: RoomState, action: Action, seat: Seat, now: number): RoomState | undefined {
  if (state.ended) return;
  let changes: Partial<RoomState>;
  const { session: s } = state;
  const reset = { ready: { a: false, b: false }, session: undefined };
  switch (action.type) {
    case 'propose': {
      const game = byId[action.game];
      if (!game?.engine || (s && s.phase !== 'result') || (game.adult && !Math.min(state.consent.a, state.consent.b))) return;
      changes = { ...reset, selected: game.id, mode: action.mode ?? 'quick', difficulty: action.difficulty ?? 'mixed', action: 'propose' };
      break;
    }
    case 'ready':
      if (!state.selected || s) return;
      changes = { ready: { ...state.ready, [seat]: !state.ready[seat] }, action: 'ready' };
      break;
    case 'consent': {
      if (!Number.isInteger(action.level) || action.level < 0 || action.level > 3) return;
      const consent = { ...state.consent, [seat]: action.level };
      const lowered = Math.min(consent.a, consent.b) < (s?.intensity ?? 1);
      const stop = !!byId[state.selected]?.adult && lowered;
      changes = { consent, action: 'consent', ...(stop ? { ...reset, selected: '' } : {}) };
      break;
    }
    case 'start': {
      if (seat !== 'a' || s || !state.ready.a || !state.ready.b) return;
      const session = newSession(state, action.id, action.seed, now);
      if (!session) return;
      changes = { session, action: 'start' };
      break;
    }
    case 'end':
      if (seat !== 'a') return;
      changes = { ...reset, selected: '', ended: true, action: 'end' };
      break;
    case 'exit':
      changes = { ...reset, selected: '', action: 'exit' };
      break;
    case 'shuffle': {
      if (!action.games.length || action.games.length > 8 || action.games.some((id) => {
        const game = byId[id];
        return !game?.engine || (game.adult && !Math.min(state.consent.a, state.consent.b));
      })) return;
      changes = { playlist: action.games.join(','), approved: { a: seat === 'a', b: seat === 'b' }, action: 'shuffle' };
      break;
    }
    case 'approve-shuffle':
      if (!state.playlist) return;
      changes = { approved: { ...state.approved, [seat]: !state.approved[seat] }, action: 'shuffle' };
      break;
    default: {
      if (!s || s.phase === 'result') return;
      const next = gameAction(s, action, seat, now);
      if (!next) return;
      changes = { session: next, action: action.type === 'settle' ? 'settle' : action.type === 'advance' ? 'advance' : 'play' };
      if (next.phase === 'result') {
        const game = byId[s.game];
        const stats = { ...state.stats, played: state.stats.played + 1 };
        if (game?.mode === 'competitive' && s.mode !== 'collab') {
          if (next.score.a > next.score.b) stats.a++;
          if (next.score.b > next.score.a) stats.b++;
        } else if ((game?.mode === 'cooperative' || s.mode === 'collab') && next.score.a) stats.coOp++;
        if (game?.engine === 'choice' && !s.intensity && game.mode !== 'competitive') stats.matches += next.score.a;
        changes = { ...changes, stats, last: s.game };
      }
    }
  }
  return { ...state, ...changes, actor: seat, rev: state.rev + 1 };
}
