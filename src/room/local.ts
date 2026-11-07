import { applyAction, needsAnswers, validAnswer } from '../games/engine.ts';
import type { RoomClient, Change, Presence } from './client.ts';
import { initialState } from './model.ts';
import type { Answers, Locks, Room, Seat, Session, StrokeEntry } from './model.ts';

const key = (s: Session) => `${s.id}/${s.round}`;

export function localRoom(): RoomClient {
  const host = { uid: 'demo-a', name: 'Player 1', emoji: 'flower' };
  const guest = { uid: 'demo-b', name: 'Player 2', emoji: 'sparkle' };
  let seat: Seat = 'a';
  let room: Room = { host, guest, code: '000000', created: Date.now(), expires: Date.now() + 86_400_000, state: initialState() };
  let strokeID = 0;
  const answers = new Map<string, Answers>();
  const drawings = new Map<string, StrokeEntry[]>();
  const rooms = new Set<Change>();
  const lockWatchers = new Map<string, Set<(locks: Locks) => void>>();
  const strokeWatchers = new Map<string, Set<(strokes: StrokeEntry[]) => void>>();
  const locks = (s: Session) => ({ a: !!answers.get(key(s))?.a, b: !!answers.get(key(s))?.b });
  const emit = () => rooms.forEach((change) => change(room));
  const emitStrokes = (s: Session) => strokeWatchers.get(key(s))?.forEach((change) => change(drawings.get(key(s)) ?? []));
  const presence: Presence = { a: true, b: true };

  return {
    id: 'demo', get seat() { return seat; }, local: true, now: Date.now,
    switchSeat() { seat = seat === 'a' ? 'b' : 'a'; emit(); },
    watchRoom(change) { rooms.add(change); change(room); return () => { rooms.delete(change); }; },
    watchPresence(change, connected) { change(presence); connected(true); return () => {}; },
    async dispatch(expected, action) {
      if (room.state.rev !== expected.rev) return false;
      const next = applyAction(room.state, action, seat, Date.now());
      if (!next) return false;
      room = { ...room, state: next };
      emit();
      if (expected.session && (next.session?.id !== expected.session.id || next.session.round !== expected.session.round)) {
        answers.delete(key(expected.session));
        drawings.delete(key(expected.session));
      }
      return true;
    },
    async lock(s, value) {
      const current = room.state.session;
      const at = Date.now();
      if (current?.id !== s.id || current.round !== s.round || current.phase !== 'playing' ||
          !needsAnswers(s) || !validAnswer(s, value) || (current.deadline && at > current.deadline)) throw new Error('This round has closed.');
      const existing = answers.get(key(s)) ?? {};
      if (existing[seat]) throw new Error('Your answer is already locked.');
      answers.set(key(s), { ...existing, [seat]: { value, at, locked: true } });
      lockWatchers.get(key(s))?.forEach((change) => change(locks(s)));
    },
    watchLocks(s, change) {
      const watchers = lockWatchers.get(key(s)) ?? new Set();
      lockWatchers.set(key(s), watchers);
      watchers.add(change);
      change(locks(s));
      return () => {
        watchers.delete(change);
        if (!watchers.size) lockWatchers.delete(key(s));
      };
    },
    async answers(s) {
      const current = room.state.session;
      if (current?.id !== s.id || current.round !== s.round) return {};
      const values = answers.get(key(s)) ?? {};
      return (values.a && values.b) || (s.deadline > 0 && Date.now() >= s.deadline) ? values : { [seat]: values[seat] };
    },
    watchStrokes(s, change) {
      const watchers = strokeWatchers.get(key(s)) ?? new Set();
      strokeWatchers.set(key(s), watchers);
      watchers.add(change);
      change(drawings.get(key(s)) ?? []);
      return () => {
        watchers.delete(change);
        if (!watchers.size) strokeWatchers.delete(key(s));
      };
    },
    async stroke(s, stroke) {
      const current = room.state.session;
      if (current?.id !== s.id || current.round !== s.round || current.phase !== 'playing' ||
          (s.game !== 'paint' && s.turn !== seat)) return;
      const existing = drawings.get(key(s)) ?? [];
      if (existing.length >= 320) throw new Error('This sketch is full. Undo a stroke or finish the round.');
      drawings.set(key(s), [...existing, { ...stroke, key: String(++strokeID) }]);
      emitStrokes(s);
    },
    async undo(s, id) {
      drawings.set(key(s), (drawings.get(key(s)) ?? []).filter((stroke) => stroke.key !== id || stroke.seat !== seat));
      emitStrokes(s);
    },
    async eraseStrokes(s, ids) {
      const selected = new Set(ids);
      drawings.set(key(s), (drawings.get(key(s)) ?? []).filter((stroke) => !selected.has(stroke.key) || stroke.seat !== seat));
      emitStrokes(s);
    },
    async purgeSession(s) {
      for (let round = 0; round < s.total; round++) {
        answers.delete(`${s.id}/${round}`);
        drawings.delete(`${s.id}/${round}`);
      }
    },
  };
}
