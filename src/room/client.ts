import type { Action } from '../games/engine.ts';
import type { Answers, Locks, Room, RoomState, Seat, Session, Stroke, StrokeEntry } from './model.ts';

export type Presence = Record<Seat, boolean>;
export type Stop = () => void;
export type Change = (value: Room) => void;
export type Failure = (error: Error) => void;

export interface RoomClient {
  readonly id: string;
  readonly seat: Seat;
  readonly local: boolean;
  readonly managesReveal?: boolean;
  now(): number;
  watchRoom(change: Change, fail: Failure): Stop;
  watchPresence(change: (presence: Presence) => void, connected: (value: boolean) => void): Stop;
  dispatch(expected: RoomState, action: Action): Promise<boolean>;
  lock(s: Session, value: string): Promise<void>;
  watchLocks(s: Session, change: (locks: Locks) => void): Stop;
  answers(s: Session): Promise<Answers>;
  watchStrokes(s: Session, change: (strokes: StrokeEntry[]) => void): Stop;
  stroke(s: Session, stroke: Stroke): Promise<void>;
  undo(s: Session, key: string): Promise<void>;
  eraseStrokes(s: Session, keys: string[]): Promise<void>;
  purgeSession(s: Session): Promise<void>;
  switchSeat?(): void;
}

export function humanError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/network-request-failed|disconnected|network error/i.test(message)) return 'Connection lost. Check your network and try again.';
  return message || 'Something got in the way. Please try again.';
}
