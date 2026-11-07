import type { Seat } from '../room/model.ts';

export const other = (seat: Seat): Seat => seat === 'a' ? 'b' : 'a';
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const replace = (board: string, index: number, value: string) => board.slice(0, index) + value + board.slice(index + 1);
const inBounds = (x: number, y: number, w: number, h: number) => x >= 0 && y >= 0 && x < w && y < h;

export function newBoard(game: string) {
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

  if (game === 'reversi') {
    const captures = reversiCaptures(board, input, seat);
    if (!captures.length) return;
    const next = captures.reduce((current, cell) => replace(current, cell, seat), replace(board, input, seat));
    const canPlay = (side: Seat) => [...next].some((_, cell) => reversiCaptures(next, cell, side).length > 0);
    const rivalCan = canPlay(rival);
    return { board: next, turn: rivalCan ? rival : seat, done: !rivalCan && !canPlay(seat), a: count(next, 'a'), b: count(next, 'b') };
  }

  const gravity = game === 'connect-four';
  const width = gravity ? 7 : 3;
  const height = gravity ? 6 : 3;
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
    1 + run(dx, dy) + run(-dx, -dy) >= (gravity ? 4 : 3));
  return { board: next, turn: rival, done: win || !next.includes('.'), a: win && seat === 'a' ? 1 : 0, b: win && seat === 'b' ? 1 : 0 };
}
