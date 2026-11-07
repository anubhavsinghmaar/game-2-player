import { z } from 'zod';
import { applyAction, needsAnswers, validAnswer } from '../games/engine.ts';
import type { Action } from '../games/engine.ts';
import type { Change, Presence, RoomClient } from './client.ts';
import { answerSchema, difficulties, initialState, modes, playerSchema, randomToken, roomSchema, strokeSchema, tidy } from './model.ts';
import type { Answer, Answers, Locks, Profile, Room, RoomState, Seat, Session, StrokeEntry } from './model.ts';

const tokenSchema = z.string().regex(/^[a-f0-9]{36}$/);
const keySchema = z.string().regex(/^[a-f0-9]{20}:[0-9]{1,2}$/);
const wireId = z.number().int().nonnegative();
const strokeEntry = strokeSchema.extend({ key: z.string().regex(/^[a-f0-9]{12}$/) });
const locksSchema = z.object({ a: z.boolean(), b: z.boolean() });
const answersSchema = z.object({ a: answerSchema.optional(), b: answerSchema.optional() });
const guestAction = z.discriminatedUnion('type', [
  z.object({ type: z.enum(['ready', 'exit', 'advance', 'hint', 'finish', 'approve-shuffle']) }),
  z.object({ type: z.literal('propose'), game: z.string().max(32), mode: z.enum(modes).optional(), difficulty: z.enum(difficulties).optional() }),
  z.object({ type: z.literal('consent'), level: z.number().int().min(0).max(3) }),
  z.object({ type: z.enum(['move', 'flip', 'choose', 'mark']), value: z.number().int().min(-1).max(100) }),
  z.object({ type: z.enum(['solve', 'write']), value: z.string().max(500) }),
  z.object({ type: z.literal('shuffle'), games: z.array(z.string().max(32)).max(8) }),
]);

const wireSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), player: playerSchema }),
  z.object({ type: z.literal('state'), room: roomSchema, now: wireId }),
  z.object({ type: z.literal('act'), id: wireId, rev: wireId, action: guestAction }),
  z.object({ type: z.literal('ack'), id: wireId, ok: z.boolean() }),
  z.object({ type: z.enum(['locked', 'open']), key: keySchema }),
  z.object({ type: z.literal('locks'), key: keySchema, locks: locksSchema }),
  z.object({ type: z.literal('answer'), key: keySchema, value: z.string().min(1).max(500) }),
  z.object({ type: z.literal('reveal'), key: keySchema, answers: answersSchema }),
  z.object({ type: z.literal('stroke'), key: keySchema, stroke: strokeEntry }),
  z.object({ type: z.literal('erase'), key: keySchema, keys: z.array(z.string().regex(/^[a-f0-9]{12}$/)).max(320) }),
]);
type Wire = z.infer<typeof wireSchema>;

const signalSchema = z.object({
  v: z.literal(1), room: tokenSchema, kind: z.enum(['offer', 'answer']),
  sdp: z.string().min(100).max(24_000), expires: wireId,
});
type Signal = z.infer<typeof signalSchema>;
const signalPrefix = 'jua1.';
const emptyLocks = (): Locks => ({ a: false, b: false });
const roundKey = (s: Session) => `${s.id}:${s.round}`;

function encode(value: Signal) {
  return signalPrefix + btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function inviteFrom(value: string) {
  const fragment = value.trim().split('#invite=').at(-1) ?? '';
  return fragment.trim();
}

function decode(input: string, kind: Signal['kind']): Signal {
  try {
    const code = inviteFrom(input);
    if (!code.startsWith(signalPrefix) || code.length > 33_000) throw new Error();
    const decoded: unknown = JSON.parse(atob(code.slice(signalPrefix.length).replace(/-/g, '+').replace(/_/g, '/')));
    const parsed = signalSchema.parse(decoded);
    if (parsed.kind !== kind) throw new Error();
    if (parsed.expires <= Date.now()) throw new Error('expired');
    return parsed;
  } catch (reason) {
    if (reason instanceof Error && reason.message === 'expired') throw new Error('This connection code has expired. Ask for a fresh invitation.', { cause: reason });
    throw new Error(kind === 'offer' ? 'Paste the complete invite link or code.' : 'Paste the complete reply code from your partner.', { cause: reason });
  }
}

function peerConnection() {
  if (!window.isSecureContext || !('RTCPeerConnection' in window)) throw new Error('Open the HTTPS site in a browser that supports direct connections.');
  return new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] });
}

async function gather(peer: RTCPeerConnection, description: RTCSessionDescriptionInit) {
  await peer.setLocalDescription(description);
  if (peer.iceGatheringState !== 'complete') {
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        peer.removeEventListener('icegatheringstatechange', update);
        resolve();
      };
      const update = () => { if (peer.iceGatheringState === 'complete') finish(); };
      const timer = window.setTimeout(finish, 5_500);
      peer.addEventListener('icegatheringstatechange', update);
    });
  }
  const sdp = peer.localDescription?.sdp;
  if (!sdp || !sdp.includes('a=candidate:')) throw new Error('No direct network route was found. Try another connection.');
  return sdp;
}

const participant = (profile: Profile) => {
  const name = tidy(profile.name, 24);
  if (!name) throw new Error('Enter a nickname to continue.');
  return { uid: randomToken(12), name, emoji: tidy(profile.emoji, 12) };
};

type Status = 'waiting' | 'connecting' | 'connected' | 'away' | 'failed' | 'closed';
type Pairing = {
  client: RoomClient;
  watch: (change: (status: Status) => void) => () => void;
  close: () => void;
};
export type HostPairing = Pairing & { invite: string; accept: (reply: string) => Promise<void> };
export type GuestPairing = Pairing & { reply: string };

function directRoom(peer: RTCPeerConnection, id: string, seat: Seat, profile: Profile): Pairing & { attach: (channel: RTCDataChannel) => void } {
  const me = participant(profile);
  const isHost = seat === 'a';
  const created = Date.now();
  let room: Room | undefined = isHost ? { host: me, code: '000000', created, expires: created + 86_400_000, state: initialState() } : undefined;
  let channel: RTCDataChannel | undefined;
  let status: Status = 'waiting';
  let offset = 0;
  let closed = false;
  let requestID = 0;
  let locks = emptyLocks();
  let values: Answers = {};
  let strokes: StrokeEntry[] = [];
  let requested = '';
  let revealTimer = 0;
  let deadlineTimer = 0;
  let connectionTimer = 0;
  const actions = new Map<number, { timer: number; resolve: (ok: boolean) => void }>();
  const roomListeners = new Set<Change>();
  const statusListeners = new Set<(value: Status) => void>();
  const lockListeners = new Set<(key: string, value: Locks) => void>();
  const drawListeners = new Set<(key: string, value: StrokeEntry[]) => void>();
  const now = () => Date.now() + offset;

  function setStatus(next: Status) {
    if (status === next || closed && next !== 'closed') return;
    status = next;
    statusListeners.forEach((listener) => listener(next));
  }

  function send(message: Wire) {
    if (channel?.readyState !== 'open' || channel.bufferedAmount > 512_000) return false;
    try { channel.send(JSON.stringify(message)); return true; }
    catch { return false; }
  }

  function emitLocks(key: string) { lockListeners.forEach((listener) => listener(key, { ...locks })); }
  function emitDrawing(key: string) { drawListeners.forEach((listener) => listener(key, [...strokes])); }

  function store(next: Room, broadcast = isHost) {
    const previous = room?.state.session;
    const current = next.state.session;
    if (!previous || !current || roundKey(previous) !== roundKey(current)) {
      locks = emptyLocks();
      values = {};
      strokes = [];
      requested = '';
      clearTimeout(revealTimer);
    }
    room = next;
    if (broadcast) send({ type: 'state', room, now: Date.now() });
    roomListeners.forEach((listener) => listener(next));
    clearTimeout(deadlineTimer);
    if (isHost && current?.phase === 'playing' && current.deadline && needsAnswers(current)) {
      deadlineTimer = window.setTimeout(() => maybeOpen(), Math.max(0, current.deadline - now()) + 35);
    }
  }

  function commit(rev: number, action: Action, side: Seat) {
    if (!room?.guest || status !== 'connected' || room.state.rev !== rev) return false;
    const next = applyAction(room.state, action, side, now());
    if (!next) return false;
    store({ ...room, state: next });
    return true;
  }

  function settle(s: Session) {
    if (!room || !isHost || room.state.session?.id !== s.id || room.state.session?.round !== s.round) return;
    const next = applyAction(room.state, { type: 'settle', answers: values }, 'a', now());
    if (!next) return;
    if (status !== 'connected') return;
    send({ type: 'reveal', key: roundKey(s), answers: values });
    store({ ...room, state: next });
  }

  function maybeOpen() {
    const s = room?.state.session;
    if (!isHost || status !== 'connected' || !s || s.phase !== 'playing' || !needsAnswers(s)) return;
    const elapsed = s.deadline > 0 && now() >= s.deadline;
    if (!(locks.a && locks.b) && !elapsed) return;
    const key = roundKey(s);
    if (locks.b && !values.b) {
      if (requested !== key) {
        requested = key;
        send({ type: 'open', key });
        if (s.deadline) revealTimer = window.setTimeout(() => settle(s), Math.max(1400, s.deadline - now() + 1400));
      }
      return;
    }
    settle(s);
  }

  function canDraw(s: Session, side: Seat) {
    return s.phase === 'playing' && (s.game === 'paint' || s.game === 'draw-guess' && s.turn === side && now() < s.deadline);
  }

  function addStroke(s: Session, stroke: StrokeEntry, side: Seat) {
    if (!canDraw(s, side) || stroke.seat !== side || strokes.length >= 320 || strokes.some((item) => item.key === stroke.key)) return;
    strokes = [...strokes, stroke];
    emitDrawing(roundKey(s));
    send({ type: 'stroke', key: roundKey(s), stroke });
  }

  function erase(s: Session, keys: string[], side: Seat) {
    if (!canDraw(s, side)) return;
    const removed = strokes.filter((stroke) => stroke.seat === side && keys.includes(stroke.key)).map((stroke) => stroke.key);
    if (!removed.length) return;
    strokes = strokes.filter((stroke) => !removed.includes(stroke.key));
    emitDrawing(roundKey(s));
    send({ type: 'erase', key: roundKey(s), keys: removed });
  }

  function onWire(message: Wire) {
    if (message.type === 'hello' && isHost && room) {
      if (!room.guest) store({ ...room, guest: message.player });
      return;
    }
    if (message.type === 'state' && !isHost) {
      if (message.room.guest?.uid !== me.uid || room && message.room.state.rev < room.state.rev) return;
      offset = message.now - Date.now();
      store(message.room, false);
      return;
    }
    if (message.type === 'act' && isHost) {
      send({ type: 'ack', id: message.id, ok: commit(message.rev, message.action, 'b') });
      return;
    }
    if (message.type === 'ack' && !isHost) {
      const pending = actions.get(message.id);
      if (pending) { clearTimeout(pending.timer); actions.delete(message.id); pending.resolve(message.ok); }
      return;
    }
    const s = room?.state.session;
    if (!s || !('key' in message) || message.key !== roundKey(s)) return;
    const key = message.key;
    if (message.type === 'locked' && isHost && s.phase === 'playing' && needsAnswers(s) &&
      !locks.b && (!s.deadline || now() <= s.deadline)) {
      locks.b = true;
      emitLocks(key);
      send({ type: 'locks', key, locks });
      maybeOpen();
    } else if (message.type === 'locks' && !isHost && s.phase === 'playing') {
      locks = { ...message.locks, b: !!values.b };
      emitLocks(key);
    } else if (message.type === 'open' && !isHost && values.b && s.phase === 'playing' &&
      (locks.a && locks.b || s.deadline > 0 && now() >= s.deadline - 500)) {
      send({ type: 'answer', key, value: values.b.value });
    } else if (message.type === 'answer' && isHost && requested === key && locks.b && !values.b && s.phase === 'playing' && validAnswer(s, message.value)) {
      values.b = { value: message.value, at: s.deadline ? Math.min(now(), s.deadline) : now(), locked: true };
      settle(s);
    } else if (message.type === 'reveal' && !isHost && (locks.a && locks.b || s.deadline > 0 && now() >= s.deadline - 500)) {
      values = message.answers;
    } else if (message.type === 'stroke') {
      if (isHost) addStroke(s, message.stroke, 'b');
      else { strokes = [...strokes, message.stroke].slice(-320); emitDrawing(key); }
    } else if (message.type === 'erase') {
      if (isHost) erase(s, message.keys, 'b');
      else { strokes = strokes.filter((stroke) => !message.keys.includes(stroke.key)); emitDrawing(key); }
    }
  }

  function close() {
    closed = true;
    clearTimeout(deadlineTimer);
    clearTimeout(revealTimer);
    clearTimeout(connectionTimer);
    for (const pending of actions.values()) { clearTimeout(pending.timer); pending.resolve(false); }
    actions.clear();
    channel?.close();
    peer.close();
    setStatus('closed');
  }

  function refreshStatus() {
    const state = peer.connectionState;
    if (state === 'failed') { clearTimeout(connectionTimer); setStatus('failed'); }
    else if (state === 'closed') setStatus('closed');
    else if (state === 'disconnected') setStatus('away');
    else if (state === 'connected' && channel?.readyState === 'open') {
      clearTimeout(connectionTimer);
      setStatus('connected');
      if (isHost && room?.guest) {
        requested = '';
        send({ type: 'state', room, now: Date.now() });
        maybeOpen();
      }
    } else if (state === 'connecting') setStatus('connecting');
  }
  peer.addEventListener('connectionstatechange', refreshStatus);

  const client: RoomClient = {
    id, seat, local: false, managesReveal: true, now,
    watchRoom(listener) { roomListeners.add(listener); if (room) listener(room); return () => { roomListeners.delete(listener); }; },
    watchPresence(listener, connected) {
      const update = (status: Status) => {
        connected(status === 'connected');
        const value: Presence = { a: seat === 'a', b: seat === 'b' };
        if (status === 'connected') value.a = value.b = true;
        listener(value);
      };
      statusListeners.add(update);
      update(status);
      return () => { statusListeners.delete(update); };
    },
    async dispatch(expected: RoomState, action) {
      if (isHost) return commit(expected.rev, action, seat);
      const validated = guestAction.safeParse(action);
      if (status !== 'connected' || !validated.success) return false;
      const id = ++requestID;
      if (!send({ type: 'act', id, rev: expected.rev, action: validated.data })) return false;
      return new Promise<boolean>((resolve) => {
        const timer = window.setTimeout(() => { actions.delete(id); resolve(false); }, 3500);
        actions.set(id, { timer, resolve });
      });
    },
    async lock(s, input) {
      const current = room?.state.session;
      const value = tidy(input, 500);
      if (status !== 'connected' || !current || roundKey(current) !== roundKey(s) || current.phase !== 'playing' ||
        !needsAnswers(current) || locks[seat] || !validAnswer(s, value) || s.deadline && now() > s.deadline) throw new Error('This round has closed or the connection has paused.');
      const answer: Answer = { value, at: now(), locked: true };
      if (!isHost && !send({ type: 'locked', key: roundKey(s) })) throw new Error('The connection paused before your answer locked.');
      values[seat] = answer;
      locks[seat] = true;
      emitLocks(roundKey(s));
      if (isHost) { send({ type: 'locks', key: roundKey(s), locks }); maybeOpen(); }
    },
    watchLocks(s, listener) {
      const key = roundKey(s);
      const update = (changed: string, value: Locks) => { if (key === changed) listener(value); };
      lockListeners.add(update);
      listener({ ...locks });
      return () => { lockListeners.delete(update); };
    },
    async answers(s) {
      const current = room?.state.session;
      if (!current || roundKey(current) !== roundKey(s)) return {};
      return current.phase === 'reveal' ? { ...values } : { [seat]: values[seat] };
    },
    watchStrokes(s, listener) {
      const key = roundKey(s);
      const update = (changed: string, value: StrokeEntry[]) => { if (key === changed) listener(value); };
      drawListeners.add(update);
      listener([...strokes]);
      return () => { drawListeners.delete(update); };
    },
    async stroke(s, stroke) {
      const current = room?.state.session;
      if (status !== 'connected' || !current || roundKey(current) !== roundKey(s) || !canDraw(current, seat)) return;
      const entry = { ...stroke, key: randomToken(6) };
      if (isHost) addStroke(s, entry, seat);
      else send({ type: 'stroke', key: roundKey(s), stroke: entry });
    },
    async undo(s, key) { await this.eraseStrokes(s, [key]); },
    async eraseStrokes(s, keys) {
      const current = room?.state.session;
      if (!current || roundKey(current) !== roundKey(s) || !canDraw(current, seat)) return;
      if (isHost) erase(s, keys, seat);
      else send({ type: 'erase', key: roundKey(s), keys });
    },
    async purgeSession() { /* Advancing the round discards its transient state. */ },
  };
  return {
    client, close,
    watch(listener) { statusListeners.add(listener); listener(status); return () => { statusListeners.delete(listener); }; },
    attach(next) {
      if (channel) { next.close(); return; }
      channel = next;
      next.addEventListener('open', () => {
        clearTimeout(connectionTimer);
        setStatus('connected');
        if (!isHost) send({ type: 'hello', player: me });
      });
      next.addEventListener('close', () => { setStatus('closed'); });
      next.addEventListener('message', (event: MessageEvent<unknown>) => {
        if (typeof event.data !== 'string' || event.data.length > 55_000) return;
        try {
          const result = wireSchema.safeParse(JSON.parse(event.data));
          if (result.success) onWire(result.data);
        } catch { /* Ignore malformed peer messages. */ }
      });
      if (!isHost) connectionTimer = window.setTimeout(() => { if (status !== 'connected') setStatus('failed'); }, 90_000);
    },
  };
}

export async function hostDirect(profile: Profile): Promise<HostPairing> {
  const peer = peerConnection();
  const id = randomToken(18);
  const expires = Date.now() + 15 * 60_000;
  const session = directRoom(peer, id, 'a', profile);
  session.attach(peer.createDataChannel('just-us-arcade'));
  try {
    const sdp = await gather(peer, await peer.createOffer());
    let accepted = false;
    return {
      ...session, invite: encode({ v: 1, room: id, kind: 'offer', sdp, expires }),
      async accept(input) {
        if (accepted) throw new Error('This room already accepted a reply.');
        const reply = decode(input, 'answer');
        if (reply.room !== id) throw new Error('This reply belongs to a different invitation.');
        await peer.setRemoteDescription({ type: 'answer', sdp: reply.sdp });
        accepted = true;
      },
    };
  } catch (error) { session.close(); throw error; }
}

export async function guestDirect(input: string, profile: Profile): Promise<GuestPairing> {
  const invite = decode(input, 'offer');
  const peer = peerConnection();
  const session = directRoom(peer, invite.room, 'b', profile);
  peer.addEventListener('datachannel', (event) => session.attach(event.channel));
  try {
    await peer.setRemoteDescription({ type: 'offer', sdp: invite.sdp });
    const sdp = await gather(peer, await peer.createAnswer());
    return { ...session, reply: encode({ v: 1, room: invite.room, kind: 'answer', sdp, expires: invite.expires }) };
  } catch (error) { session.close(); throw error; }
}
