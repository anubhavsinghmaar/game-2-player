import { z } from 'zod';
import { difficulties, modes } from './input.ts';

export { difficulties, modes, tidy } from './input.ts';
export type { QuizDifficulty, QuizMode } from './input.ts';

export const seatSchema = z.enum(['a', 'b']);
export type Seat = z.infer<typeof seatSchema>;
const smallInt = z.number().int().min(0).max(1_000_000);
const timestamp = z.number().int().nonnegative();
const boolPair = z.object({ a: z.boolean(), b: z.boolean() });
const numberPair = z.object({ a: smallInt, b: smallInt });

export const sessionSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{20}$/), game: z.string().regex(/^[a-z0-9-]+$/).max(32), seed: smallInt,
  mode: z.enum(modes), difficulty: z.enum(difficulties), intensity: z.number().int().min(0).max(3),
  phase: z.enum(['playing', 'reveal', 'result']), round: smallInt, total: smallInt,
  turn: seatSchema, deadline: timestamp, score: numberPair,
  board: z.string().max(100), claims: z.string().max(12),
  found: z.number().int().min(0).max(4095), first: z.number().int().min(-1).max(11), second: z.number().int().min(-1).max(11),
  hint: smallInt, misses: smallInt, text: z.string().max(1800),
  marks: z.number().int().min(0).max(511), proposed: z.number().int().min(-1).max(8),
  chooser: seatSchema, pick: z.number().int().min(-1).max(1),
  detail: z.string().max(250),
});
export type Session = z.infer<typeof sessionSchema>;

export const stateSchema = z.object({
  version: z.literal(1), rev: smallInt, ended: z.boolean(), actor: seatSchema,
  action: z.enum(['init', 'propose', 'ready', 'consent', 'start', 'advance', 'settle', 'play', 'exit', 'end', 'shuffle']),
  selected: z.string().max(32), mode: z.enum(modes), difficulty: z.enum(difficulties),
  ready: boolPair, consent: z.object({ a: z.number().int().min(0).max(3), b: z.number().int().min(0).max(3) }),
  stats: z.object({ a: smallInt, b: smallInt, coOp: smallInt, played: smallInt, matches: smallInt }),
  playlist: z.string().max(160), approved: boolPair,
  last: z.string().max(32), session: sessionSchema.optional(),
});
export type RoomState = z.infer<typeof stateSchema>;

export const playerSchema = z.object({ uid: z.string().min(1).max(128), name: z.string().min(1).max(24), emoji: z.string().max(12) });
export type Player = z.infer<typeof playerSchema>;
export type Profile = Omit<Player, 'uid'>;

export const roomSchema = z.object({
  code: z.string().regex(/^\d{6}$/), created: timestamp, expires: timestamp,
  host: playerSchema, guest: playerSchema.optional(), state: stateSchema,
});
export type Room = z.infer<typeof roomSchema>;

export function initialState(): RoomState {
  return { version: 1, rev: 0, ended: false, actor: 'a', action: 'init', selected: '', mode: 'quick', difficulty: 'mixed',
    ready: { a: false, b: false }, consent: { a: 0, b: 0 }, stats: { a: 0, b: 0, coOp: 0, played: 0, matches: 0 },
    playlist: '', approved: { a: false, b: false }, last: '' };
}

export type Answer = { value: string; at: number; locked: true };
export type Answers = Partial<Record<Seat, Answer>>;
export type Locks = Record<Seat, boolean>;
export const answerSchema = z.object({ value: z.string().min(1).max(500), at: timestamp, locked: z.literal(true) });

export const strokeSchema = z.object({
  seat: seatSchema, group: z.string().regex(/^[a-f0-9]{10}$/), color: z.enum(['ink', 'rose', 'blue', 'mint', 'gold', 'paper']),
  points: z.string().min(7).max(640).regex(/^\d{3},\d{3}(;\d{3},\d{3})*$/),
});
export type Stroke = z.infer<typeof strokeSchema>;
export type StrokeEntry = Stroke & { key: string };

export function randomToken(bytes: number) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((value) => value.toString(16).padStart(2, '0')).join('');
}
