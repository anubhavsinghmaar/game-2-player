import type { Seat } from '../room/model.ts';

export const other = (seat: Seat): Seat => seat === 'a' ? 'b' : 'a';
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const replace = (board: string, index: number, value: string) => board.slice(0, index) + value + board.slice(index + 1);
const inBounds = (x: number, y: number, w: number, h: number) => x >= 0 && y >= 0 && x < w && y < h;

export const lineGames: Record<string, { width: number; height: number; needed: number; gravity: boolean }> = {
  'tic-tac-toe': { width: 3, height: 3, needed: 3, gravity: false },
  'connect-four': { width: 7, height: 6, needed: 4, gravity: true },
  'five-row': { width: 10, height: 10, needed: 5, gravity: false },
};

export const cardRanks = '23456789TJQKA';
export const higherLowerRounds = 10;

/** Deterministic card run for Higher or Lower: no two neighbours share a rank, so every guess has a right answer. */
function cardRun(seed: number) {
  let state = (seed || 1) >>> 0;
  let previous = -1;
  let run = '';
  while (run.length < higherLowerRounds + 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const rank = (state >>> 0) % cardRanks.length;
    if (rank === previous) continue;
    previous = rank;
    run += cardRanks[rank];
  }
  return run;
}

const checkersStart = Array.from({ length: 64 }, (_, i) => {
  const x = i % 8, y = Math.floor(i / 8);
  if ((x + y) % 2 === 0) return '.';
  return y < 3 ? 'b' : y > 4 ? 'a' : '.';
}).join('');

export function newBoard(game: string, seed = 1) {
  if (game === 'checkers') return checkersStart;
  if (game === 'higher-lower') return cardRun(seed);
  if (game === 'five-row') return '.'.repeat(100);
  if (game === 'connect-four') return '.'.repeat(42);
  if (game === 'reversi') return '.'.repeat(27) + 'ba' + '.'.repeat(6) + 'ab' + '.'.repeat(27);
  if (game === 'dots-boxes') return '.'.repeat(24);
  return '.'.repeat(9);
}

export function reversiCaptures(board: string, index: number, seat: Seat) {
  if (board[index] !== '.') return [];
  const found: number[] = [];
  for (const [dx, dy] of directions) {
    const line: number[] = [];
    let x = index % 8 + dx;
    let y = Math.floor(index / 8) + dy;
    while (inBounds(x, y, 8, 8) && board[y * 8 + x] === other(seat)) {
      line.push(y * 8 + x);
      x += dx;
      y += dy;
    }
    if (inBounds(x, y, 8, 8) && board[y * 8 + x] === seat) found.push(...line);
  }
  return found;
}

export function boxes(board: string): string {
  return Array.from({ length: 9 }, (_, index) => {
    const x = index % 3;
    const y = Math.floor(index / 3);
    const edges = [y * 3 + x, (y + 1) * 3 + x, 12 + y * 4 + x, 13 + y * 4 + x];
    return edges.every((edge) => board[edge] !== '.') ? '+' : '.';
  }).join('');
}

const owner = (piece: string) => piece === '.' ? '' : piece.toLowerCase();
const isKing = (piece: string) => piece === 'A' || piece === 'B';

/** Legal destination squares for one checkers piece. Jumps are mandatory when any jump exists. */
export function checkersTargets(board: string, from: number, seat: Seat, jumpsOnly: boolean = mustJump(board, seat)): { to: number; capture: number }[] {
  const piece = board[from];
  if (owner(piece) !== seat) return [] as { to: number; capture: number }[];
  const forward = seat === 'a' ? -1 : 1;
  const steps = isKing(piece) ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, forward], [-1, forward]];
  const x = from % 8, y = Math.floor(from / 8);
  const found: { to: number; capture: number }[] = [];
  for (const [dx, dy] of steps) {
    const nx = x + dx, ny = y + dy;
    if (!inBounds(nx, ny, 8, 8)) continue;
    const near = ny * 8 + nx;
    if (board[near] === '.' && !jumpsOnly) found.push({ to: near, capture: -1 });
    const jx = nx + dx, jy = ny + dy;
    if (owner(board[near]) === other(seat) && inBounds(jx, jy, 8, 8) && board[jy * 8 + jx] === '.') found.push({ to: jy * 8 + jx, capture: near });
  }
  return jumpsOnly ? found.filter((target) => target.capture >= 0) : found;
}

export function mustJump(board: string, seat: Seat): boolean {
  return [...board].some((piece, index) => owner(piece) === seat && checkersTargets(board, index, seat, false).some((t) => t.capture >= 0));
}

const checkersCanMove = (board: string, seat: Seat): boolean => [...board].some((piece, index) => owner(piece) === seat && checkersTargets(board, index, seat).length > 0);
const pieces = (board: string, seat: Seat) => [...board].filter((piece) => owner(piece) === seat).length;

/** Checkers selection lives in `claims`: "." none, "s12" selected square 12, "f12" piece 12 must keep jumping. */
export function checkersSelection(claims: string) {
  const match = /^([sf])(\d+)$/.exec(claims);
  return match ? { square: Number(match[2]), forced: match[1] === 'f' } : undefined;
}

type Move = { board: string; turn: Seat; done: boolean; a: number; b: number; claims?: string };
const count = (board: string, seat: Seat) => [...board].filter((piece) => piece === seat).length;

export function boardMove(game: string, board: string, seat: Seat, input: number, claims: string): Move | undefined {
  if (!Number.isInteger(input) || input < 0) return;
  const rival = other(seat);

  if (game === 'dots-boxes') {
    if (board[input] !== '.') return;
    const next = replace(board, input, seat);
    const closed = boxes(next);
    const captured = [...closed].filter((box, index) => box === '+' && claims[index] === '.').length;
    const owners = [...claims].map((owner, index) => owner === '.' && closed[index] === '+' ? seat : owner).join('');
    return { board: next, turn: captured ? seat : rival, done: !next.includes('.'), a: count(owners, 'a'), b: count(owners, 'b'), claims: owners };
  }

  if (game === 'checkers') {
    if (input > 63) return;
    const selection = checkersSelection(claims);
    const scores = (next: string) => ({ a: 12 - pieces(next, 'b'), b: 12 - pieces(next, 'a') });
    if (!selection?.forced && owner(board[input]) === seat) {
      if (!checkersTargets(board, input, seat).length) return;
      return { board, turn: seat, done: false, ...scores(board), claims: `s${input}` };
    }
    if (!selection) return;
    const from = selection.square;
    const target = checkersTargets(board, from, seat, selection.forced || undefined).find((item) => item.to === input);
    if (!target) return;
    let piece = board[from];
    const row = Math.floor(input / 8);
    const crowned = !isKing(piece) && (seat === 'a' ? row === 0 : row === 7);
    if (crowned) piece = piece.toUpperCase();
    let next = replace(replace(board, from, '.'), input, piece);
    if (target.capture >= 0) next = replace(next, target.capture, '.');
    const chain = target.capture >= 0 && !crowned && checkersTargets(next, input, seat, true).length > 0;
    if (chain) return { board: next, turn: seat, done: false, ...scores(next), claims: `f${input}` };
    const done = !pieces(next, rival) || !checkersCanMove(next, rival);
    const score = scores(next);
    if (done) score[seat] = Math.max(score[seat], score[rival] + 1);
    return { board: next, turn: rival, done, ...score, claims: '.' };
  }

  if (game === 'higher-lower') {
    if (input > 1) return;
    const log = claims.replace(/\./g, '');
    if (log.length >= higherLowerRounds) return;
    const current = cardRanks.indexOf(board[log.length]);
    const coming = cardRanks.indexOf(board[log.length + 1]);
    const right = input === 1 ? coming > current : coming < current;
    const entry = right ? seat : seat === 'a' ? 'x' : 'y';
    const next = log + entry;
    return { board, turn: rival, done: next.length >= higherLowerRounds, a: count(next, 'a'), b: count(next, 'b'), claims: next };
  }

  if (game === 'reversi') {
    const captures = reversiCaptures(board, input, seat);
    if (!captures.length) return;
    const next = captures.reduce((current, cell) => replace(current, cell, seat), replace(board, input, seat));
    const canPlay = (side: Seat) => [...next].some((_, cell) => reversiCaptures(next, cell, side).length > 0);
    const rivalCan = canPlay(rival);
    return { board: next, turn: rivalCan ? rival : seat, done: !rivalCan && !canPlay(seat), a: count(next, 'a'), b: count(next, 'b') };
  }

  const line = lineGames[game];
  if (!line) return;
  const { gravity, width, height, needed } = line;
  if (input >= (gravity ? width : width * height)) return;
  let index = gravity ? (height - 1) * width + input : input;
  while (gravity && index >= 0 && board[index] !== '.') index -= width;
  if (board[index] !== '.') return;
  const next = replace(board, index, seat);
  const run = (dx: number, dy: number) => {
    let x = index % width + dx;
    let y = Math.floor(index / width) + dy;
    let length = 0;
    while (inBounds(x, y, width, height) && next[y * width + x] === seat) {
      length++;
      x += dx;
      y += dy;
    }
    return length;
  };
  const win = [[1, 0], [0, 1], [1, 1], [1, -1]].some(([dx, dy]) =>
    1 + run(dx, dy) + run(-dx, -dy) >= needed);
  return { board: next, turn: rival, done: win || !next.includes('.'), a: win && seat === 'a' ? 1 : 0, b: win && seat === 'b' ? 1 : 0 };
}
