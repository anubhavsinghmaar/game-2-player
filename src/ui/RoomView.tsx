import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { intensityLabels } from '../data/prompts.ts';
import { other } from '../games/boards.ts';
import { shuffled } from '../games/engine.ts';
import type { Action } from '../games/engine.ts';
import { byId, playable, worlds } from '../games/registry.ts';
import type { GameDefinition } from '../games/registry.ts';
import { humanError } from '../room/client.ts';
import type { Presence, RoomClient } from '../room/client.ts';
import { randomToken } from '../room/model.ts';
import type { Room, Seat } from '../room/model.ts';
import { Catalog } from './Catalog.tsx';
import { Dialog, tone } from './common.tsx';
import { Icon } from './Icon.tsx';

const GameView = lazy(async () => ({ default: (await import('./GameView.tsx')).GameView }));
const moods = ['Cute', 'Competitive', 'Chaotic', 'Curious', 'After Dark'] as const;
type Mood = typeof moods[number];

function plan(mood: Mood, minutes: number, consent: number) {
  const selection = shuffled(playable.filter((game) => {
    if (mood === 'After Dark') return game.adult && consent > 0;
    if (game.adult) return false;
    return mood === 'Cute' ? ['love', 'creative', 'daily'].includes(game.world)
      : mood === 'Competitive' ? game.mode === 'competitive'
      : mood === 'Chaotic' ? ['party', 'arcade', 'creative'].includes(game.world)
      : ['mystery', 'quiz', 'daily'].includes(game.world);
  }), crypto.getRandomValues(new Uint32Array(1))[0]);
  const ids: string[] = [];
  let total = 0;
  for (const game of selection) {
    if (ids.length === 8 || total + game.minutes > minutes + 2) continue;
    ids.push(game.id);
    total += game.minutes;
  }
  return ids;
}

export type RoomViewProps = {
  client: RoomClient; goHome: () => void; inspect: (game: GameDefinition) => void; selectedGame?: string;
  favorites: string[]; toggle: (id: string) => void; sound: boolean;
  shuffleOpen: boolean; setShuffleOpen: (value: boolean) => void; consentOpen: boolean; setConsentOpen: (value: boolean) => void;
};

export function RoomView({ client, goHome, inspect, selectedGame, favorites, toggle, sound,
  shuffleOpen, setShuffleOpen, consentOpen, setConsentOpen }: RoomViewProps) {
  const [room, setRoom] = useState<Room>();
  const [presence, setPresence] = useState<Presence>({ a: false, b: false });
  const [connected, setConnected] = useState(client.local);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [attest, setAttest] = useState(false);
  const [level, setLevel] = useState(1);
  const [mood, setMood] = useState<Mood>('Cute');
  const [minutes, setMinutes] = useState(20);

  useEffect(() => client.watchRoom((value) => setRoom({ ...value }), (reason) => { setMissing(true); setError(humanError(reason)); }), [client]);
  useEffect(() => client.watchPresence(setPresence, setConnected), [client]);
  const rev = room?.state.rev;
  const phase = room?.state.session?.phase;
  const sessionId = room?.state.session?.id;
  useEffect(() => { if (phase === 'reveal' || phase === 'result') tone(sound, phase === 'result' ? 523 : 440); }, [phase, sessionId, sound]);

  const perform = useCallback((action: Action) => {
    if (!room || !connected || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    void client.dispatch(room.state, action).then((committed) => {
      if (!committed) setError('The room changed first. Check the latest state and try again.');
      if (committed && action.type === 'consent') setConsentOpen(false);
    }).catch((reason: unknown) => setError(humanError(reason))).finally(() => { pending.current = false; setBusy(false); });
  }, [client, room, connected, setConsentOpen]);

  const proposal = useRef('');
  useEffect(() => {
    if (selectedGame && selectedGame !== proposal.current && room && connected) {
      proposal.current = selectedGame;
      const [game, mode, difficulty] = selectedGame.split('|');
      perform({ type: 'propose', game, mode: mode as 'quick', difficulty: difficulty as 'mixed' });
    }
  }, [selectedGame, perform, room, connected, rev]);

  if (missing || room?.state.ended || room && room.expires <= client.now()) return <main className="shell message-view" id="main">
    <Icon name="ticket" size={44} /><h1>This room is closed.</h1><p>{error || 'Start a fresh room to play again.'}</p><button className="button primary" onClick={goHome}>Back to the arcade</button>
  </main>;
  if (!room) return <main className="shell message-view" id="main" aria-live="polite"><Icon name="ticket" size={40} /><h1>Opening your room…</h1><button className="text-button" onClick={goHome}>Back to the arcade</button></main>;

  const state = room.state;
  const session = state.session;
  const seat = client.seat;
  const partner = presence[other(seat)];
  const consent = Math.min(state.consent.a, state.consent.b);
  const selected = byId[state.selected];
  const playlist = state.playlist ? state.playlist.split(',').map((id) => byId[id]).filter((item): item is GameDefinition => !!item) : [];
  const begin = () => perform({ type: 'start', id: randomToken(10), seed: crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000 });
  return <>
    {(!connected || client.local || error) && <div className="shell room-notices">
      {client.local && <div className="local-banner"><span><Icon name="controller" size={18} /> <b>LOCAL DEMO</b> <span className="local-help">· One device, two seats</span></span>
        <button className="button small outline" onClick={() => setHandoff(true)}>Switch seat <Icon name="swap" size={17} /></button></div>}
      {!connected && <p className="notice" role="status">Connection paused. Keep both tabs open. If it doesn’t return, start a fresh invitation.</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>}
    {session ? <Suspense fallback={<div className="shell message-view" aria-live="polite">Opening game…</div>}>
      <GameView key={`${session.id}:${session.round}:${seat}`} room={room} s={session} client={client} connected={connected} partner={partner} busy={busy} act={perform} />
    </Suspense> : <main className="shell room-layout" id="main">
      <section className="room-hero">
        <div><p className="eyebrow"><Icon name="sparkle" size={16} /> {client.local ? 'SAME-DEVICE SHOWCASE' : 'THE PRIVATE ROOM'}</p>
          <h1>Your game night.</h1><p>Get comfortable. Your next game is right here.</p></div>
        <span className="room-mode"><Icon name={client.local ? 'controller' : 'link'} size={17} /> {client.local ? 'One device' : 'Direct room'}</span>
      </section>
      <section className="seat-row" aria-label="Players">
        <PlayerChip room={room} side="a" seat={seat} online={presence.a} />
        <PlayerChip room={room} side="b" seat={seat} online={presence.b} />
      </section>
      {selected && <section className={`ready-card skin-${worlds[selected.world].color}`} aria-label="Game ready check">
        <div><p className="mini-label"><Icon name="sparkle" size={17} /> YOUR NEXT GAME</p><h2>{selected.title}</h2><p>{selected.description}</p></div>
        <div className="ready-actions">
          <div className="ready-line"><span><Icon name={state.ready.a ? 'check' : 'circle'} size={15} />{room.host.name}</span><span><Icon name={state.ready.b ? 'check' : 'circle'} size={15} />{room.guest?.name ?? 'Player 2'}</span></div>
          <button className={`button ${state.ready[seat] ? 'outline' : 'primary'}`} disabled={!connected || busy || !room.guest} onClick={() => perform({ type: 'ready' })}>{state.ready[seat] && <Icon name="check" size={17} />}{state.ready[seat] ? 'Ready' : 'I’m ready'}</button>
          {seat === 'a' && <button className="button primary" disabled={!connected || busy || !partner || !state.ready.a || !state.ready.b} onClick={begin}>Start game <Icon name="arrow" size={17} /></button>}
          <button className="text-button" disabled={!connected || busy} onClick={() => perform({ type: 'exit' })}>Cancel invite</button>
        </div>
      </section>}
      <section className="quick-grid" aria-label="Quick picks">
        <button className="quick-card skin-gold" onClick={() => setShuffleOpen(true)}><Icon name="shuffle" size={25} /><span><strong>Game Night Shuffle</strong><small>Build a little playlist for two.</small></span><Icon name="arrow" size={17} /></button>
        <button className="quick-card skin-blue" onClick={() => {
          const candidates = playable.filter((item) => !item.adult);
          inspect(shuffled(candidates, crypto.getRandomValues(new Uint32Array(1))[0])[0]);
        }}><Icon name="sparkle" size={25} /><span><strong>Surprise Me</strong><small>Let the arcade choose.</small></span><Icon name="arrow" size={17} /></button>
        <button className="quick-card skin-mint" onClick={() => { const daily = byId['daily-teaser']; if (daily) inspect(daily); }}><Icon name="sun" size={25} /><span><strong>Today’s Challenge</strong><small>A little daily brain teaser.</small></span><Icon name="arrow" size={17} /></button>
      </section>
      <div className="session-strip"><span><Icon name="trophy" size={17} /> <b>{state.stats.played}</b> games</span><span>{room.host.name} <b>{state.stats.a}</b> wins</span>
        <span>{room.guest?.name ?? 'Player 2'} <b>{state.stats.b}</b> wins</span><span><b>{state.stats.coOp}</b> co-op wins</span><span><b>{state.stats.matches}</b> shared matches</span>
        {byId[state.last] && <button className="text-button" onClick={() => inspect(byId[state.last]!)}>Last played · {byId[state.last]?.title}</button>}
      </div>
      <Catalog inspect={inspect} favorites={favorites} toggle={toggle} compact />
      <div className="room-bottom button-row">
        <button className="button outline" onClick={() => { setAttest(false); setConsentOpen(true); }}><Icon name="moon" size={18} /> {consent ? `After Dark · ${intensityLabels[consent]}` : 'After Dark settings'}</button>
        <button className="button outline" onClick={() => setLeaving(true)}>Leave room</button>
      </div>
    </main>}
    {handoff && <Dialog title="Pass the device" close={() => setHandoff(false)}><p>Hand the device to {seat === 'a' ? 'Player 2' : 'Player 1'} before continuing.</p>
      <button className="button primary" onClick={() => { client.switchSeat?.(); setAttest(false); setHandoff(false); }}>I’m {seat === 'a' ? 'Player 2' : 'Player 1'}</button></Dialog>}
    {leaving && <Dialog title="Leave the room?" close={() => setLeaving(false)}><p>{client.local ? 'You can return to this demo while this page is open.' : 'Leaving closes your direct connection. Start a new invitation to play again.'}</p>
      <div className="button-row"><button className="button primary" onClick={goHome}>Leave room</button>
        {!client.local && seat === 'a' && <button className="button outline" disabled={!connected || busy} onClick={() => { perform({ type: 'end' }); setLeaving(false); }}>End room for both</button>}</div></Dialog>}
    {consentOpen && <Dialog title="After Dark" close={() => { setConsentOpen(false); setAttest(false); }}>
      <p>For adults 18 and over. Each of you chooses separately. The room uses the lower of your two levels and you can revoke at any time.</p>
      <p className="notice">{consent ? `You both opted in · ${intensityLabels[consent]}` : state.consent[seat] ? 'You opted in. Your partner can decide on their own.' : 'This room is in PG mode.'}</p>
      <label className="filter-check"><input type="checkbox" checked={attest} onChange={(event) => setAttest(event.target.checked)} /> I’m 18 or over and I want to opt in.</label>
      <label className="field">My comfort level<select value={level} onChange={(event) => setLevel(Number(event.target.value))}>{intensityLabels.slice(1).map((label, index) => <option value={index + 1} key={label}>{label}</option>)}</select></label>
      <div className="button-row"><button className="button primary" disabled={!attest || !connected || busy} onClick={() => { perform({ type: 'consent', level }); setAttest(false); }}>Opt in for my seat</button>
        {state.consent[seat] > 0 && <button className="button outline" disabled={!connected || busy} onClick={() => perform({ type: 'consent', level: 0 })}>Revoke my consent</button>}</div>
    </Dialog>}
    {shuffleOpen && <Dialog title="Game Night Shuffle" close={() => setShuffleOpen(false)}>
      <p>Choose a mood and how long you want to play. Both of you get a say.</p>
      <div className="form-pair"><label className="field">Mood<select value={mood} onChange={(event) => setMood(event.target.value as Mood)}>
        {moods.map((item) => <option disabled={item === 'After Dark' && !consent} key={item}>{item}</option>)}</select></label>
        <label className="field">Time<select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>{[10, 20, 30, 60].map((n) => <option value={n} key={n}>{n} min</option>)}</select></label></div>
      <button className="button primary" disabled={!connected || busy || (mood === 'After Dark' && !consent)} onClick={() => perform({ type: 'shuffle', games: plan(mood, minutes, consent) })}><Icon name="shuffle" size={17} /> {playlist.length ? 'Reroll playlist' : 'Shuffle games'}</button>
      {playlist.length > 0 && <>
        <ol className="playlist">{playlist.map((item) => <li key={item.id}><span>{item.title}</span><small>{item.minutes} min</small>
          {state.approved.a && state.approved.b && !session && (!item.adult || !!consent) && <button className="text-button" onClick={() => { perform({ type: 'propose', game: item.id }); setShuffleOpen(false); }}>Invite <Icon name="arrow" size={15} /></button>}</li>)}</ol>
        <p className="game-aside">{state.approved.a && state.approved.b ? 'Playlist approved by both players.' : 'Waiting for both players to approve.'}</p>
        <button className="button outline" disabled={!connected || busy} onClick={() => perform({ type: 'approve-shuffle' })}>{state.approved[seat] ? 'Withdraw my approval' : 'Approve playlist'}</button>
        {client.local && <button className="text-button" onClick={() => { setShuffleOpen(false); setHandoff(true); }}>Switch demo seat</button>}
      </>}
    </Dialog>}
  </>;
}

function PlayerChip({ room, side, seat, online }: { room: Room; side: Seat; seat: Seat; online: boolean }) {
  const player = side === 'a' ? room.host : room.guest;
  return <div className="player-chip"><span className={`avatar side-${side}`}>{<Icon name={player?.emoji || (side === 'a' ? 'flower' : 'sparkle')} size={23} />}</span><div>
    <strong>{player?.name ?? 'Open seat'} {side === seat && <small>YOU</small>}</strong>
    <span><i className={online ? 'online' : ''} />{player ? online ? 'Here' : 'Away' : 'Waiting for partner'}</span>
  </div></div>;
}
