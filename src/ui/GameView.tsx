import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { bingoCards, intensityLabels } from '../data/prompts.ts';
import { mediaManifest } from '../data/mediaManifest.ts';
import { choicePrompt, dateFields, datePlan, needsAnswers, puzzle, question, storyStart, truth, validAnswer } from '../games/engine.ts';
import type { Action } from '../games/engine.ts';
import { other } from '../games/boards.ts';
import { byId, worlds } from '../games/registry.ts';
import { humanError } from '../room/client.ts';
import type { RoomClient } from '../room/client.ts';
import type { Answers, Room, Seat, Session } from '../room/model.ts';
import { tidy } from '../room/model.ts';
import { Board, Memory } from './Boards.tsx';
import { Drawing } from './Drawing.tsx';
import { Icon } from './Icon.tsx';

type Props = {
  room: Room; s: Session; client: RoomClient; connected: boolean; partner: boolean;
  busy: boolean; act: (action: Action) => void;
};
const blankLocks = { a: false, b: false };
const player = (room: Room, seat: Seat) => seat === 'a' ? room.host.name : room.guest?.name ?? 'Player 2';

export function GameView({ room, s, client, connected, partner, busy, act }: Props) {
  const seat = client.seat;
  const game = byId[s.game];
  const [clock, setClock] = useState(() => client.now());
  const [locks, setLocks] = useState(blankLocks);
  const [answers, setAnswers] = useState<Answers>({});
  const [value, setValue] = useState('');
  const [localError, setLocalError] = useState('');
  const [locking, setLocking] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const deadline = s.deadline;
  const seconds = deadline ? Math.max(0, Math.ceil((deadline - clock) / 1000)) : 0;
  const expired = deadline > 0 && clock >= deadline;
  const secret = needsAnswers(s);
  const sKey = `${s.id}:${s.round}`;
  const both = locks.a && locks.b;
  const reveal = s.phase === 'reveal';
  const finished = s.phase === 'result';
  const paused = !client.local && !partner && !deadline;
  const disabled = busy || !connected || paused;
  const canSettle = connected && secret && (reveal || !client.managesReveal && (both || expired)) && !finished;
  const drawTimeout = connected && s.game === 'draw-guess' && expired && s.phase === 'playing';

  useEffect(() => {
    if (!deadline || s.phase !== 'playing') return;
    const tick = () => setClock(client.now());
    tick();
    const timer = window.setInterval(tick, 150);
    return () => window.clearInterval(timer);
  }, [deadline, client, s.phase]);

  useEffect(() => {
    if (secret && s.phase !== 'result') return client.watchLocks(s, setLocks);
  }, [client, sKey, secret, s.phase]);

  useEffect(() => {
    if (!canSettle && !drawTimeout) return;
    let stale = false;
    let timer = 0;
    const sync = async (attempt: number) => {
      try {
        if (drawTimeout) {
          await client.dispatch(room.state, { type: 'advance' });
          return;
        }
        const all = await client.answers(s);
        if (stale) return;
        if (reveal) { setAnswers(all); return; }
        await client.dispatch(room.state, { type: 'settle', answers: all });
      } catch {
        if (!stale && attempt < 5) timer = window.setTimeout(() => { void sync(attempt + 1); }, 300 * (attempt + 1));
      }
    };
    void sync(0);
    return () => { stale = true; window.clearTimeout(timer); };
  }, [canSettle, drawTimeout, client, room.state, s, reveal]);

  if (!game?.engine) return <p>This game version is unavailable. <button onClick={() => act({ type: 'exit' })}>Return to room</button></p>;
  const rival = player(room, other(seat));
  const prompt = choicePrompt(s);
  const quiz = game.engine === 'quiz' ? question(s) : undefined;
  const currentPuzzle = game.engine === 'puzzle' ? puzzle(s) : undefined;
  const options = quiz?.options ?? prompt?.options;
  const selected = value ? options?.[Number(value)] : undefined;
  const title = quiz?.prompt ?? prompt?.question ?? game.title;
  const optionText = (option: string, index: number) => s.game === 'most-likely' && index < 2 ? player(room, index === 0 ? 'a' : 'b') : option;
  const readAnswer = (side: Seat) => {
    const answer = answers[side]?.value;
    if (answer === undefined) return 'No answer';
    return options ? optionText(options[Number(answer)] ?? 'Invalid answer', Number(answer)) : answer;
  };

  function lock(event: FormEvent) {
    event.preventDefault();
    const answer = tidy(value, 500);
    if (locking || locks[seat] || !validAnswer(s, answer)) return;
    setLocking(true);
    setLocalError('');
    void client.lock(s, answer).catch((reason: unknown) => setLocalError(humanError(reason))).finally(() => setLocking(false));
  }

  const next = () => act({ type: 'advance' });
  const activeName = player(room, s.turn);
  let play: ReactNode;

  if (secret && !finished) {
    play = <>
      <div className="prompt-heading">
        {game.engine === 'prediction' && <p className="mini-label">{s.turn === seat ? 'ANSWER FOR YOURSELF' : `PREDICT ${activeName.toLocaleUpperCase()}’S PICK`}</p>}
        {quiz?.media && mediaManifest[quiz.media] && <Media id={quiz.media} />}
        <h2 className={s.game === 'emoji-decoder' ? 'emoji-prompt' : ''}>{title}</h2>
      </div>
      {reveal ? <div className="reveal" aria-live="polite">
        <div className="reveal-grid">{(['a', 'b'] as const).map((side) => <div className={`reveal-card side-${side}`} key={side}><span>{player(room, side)}</span><strong>{readAnswer(side)}</strong></div>)}</div>
        {quiz ? <div className="fact"><span className="mini-label">THE ANSWER</span><strong>{s.detail}</strong><p>{quiz.explanation}</p>{quiz.source && <a href={quiz.source} target="_blank" rel="noreferrer">Read the source <Icon name="external" size={14} /></a>}</div> : <p className="reveal-note">{s.detail}</p>}
        <button className="button primary" disabled={disabled} onClick={next}>{s.round + 1 >= s.total ? 'See results' : 'Next round'} <Icon name="arrow" size={18} /></button>
      </div> : locks[seat] || expired ? <div className="waiting-card" aria-live="polite"><Icon name="lock" size={26} />
        <h3>{expired ? 'Time’s up' : 'You locked in'}</h3><p>{both || expired ? 'Opening the round…' : `Waiting for ${rival} to lock in.`}</p></div> :
        <form onSubmit={lock} className="answer-form">
          {options ? <div className="option-grid" aria-label="Answer choices">
            {options.map((option, index) => <button key={option} className={`choice ${value === String(index) ? 'chosen' : ''}`} aria-pressed={value === String(index)}
              type="button" disabled={disabled || locking} onClick={() => setValue(String(index))}>
              <span className="choice-index">{String.fromCharCode(65 + index)}</span>{optionText(option, index)}
              {value === String(index) && <Icon name="check" size={17} />}
            </button>)}
          </div> : s.game === 'hot-takes' ? <div className="scale"><label htmlFor="hot-take">Your rating <strong>{value || '5'} / 10</strong></label>
            <input id="hot-take" type="range" min="1" max="10" step="1" value={value || '5'} onChange={(event) => setValue(event.target.value)} />
            <div className="scale-labels"><span>Hard disagree</span><span>Strong agree</span></div>
            {!value && <button type="button" className="text-button" onClick={() => setValue('5')}>Choose 5</button>}
          </div> : quiz ? <label className="field">Your estimate<input type="number" step="1" inputMode="numeric" placeholder="Enter a whole number" value={value} onChange={(event) => setValue(event.target.value)} /></label>
            : <label className="field">Your private answer<textarea placeholder="Type your answer…" maxLength={500} value={value} onChange={(event) => setValue(event.target.value)} /></label>}
          <button className="button primary" disabled={disabled || locking || !validAnswer(s, tidy(value, 500))}><Icon name="lock" size={17} /> {locking ? 'Locking…' : 'Lock in'}</button>
          {selected && <span className="sr-only">Selected {selected}</span>}
          <p className="game-aside">Your answer stays sealed until both players lock in{s.deadline ? ' or the timer ends' : ''}.</p>
        </form>}
    </>;
  } else if (game.engine === 'board') {
    play = <><p className="turn-label" aria-live="polite">{finished ? 'Final board' : s.turn === seat ? 'Your turn' : `${activeName}’s turn`}</p>
      <Board s={s} seat={seat} act={act} disabled={disabled} /></>;
  } else if (game.engine === 'memory') {
    play = <><p className="turn-label" aria-live="polite">{finished ? 'Every pair found!' : reveal ? 'Different cards. Take a good look.' : s.turn === seat ? 'Your turn to flip' : `${activeName} is flipping`}</p>
      <Memory s={s} seat={seat} act={act} disabled={disabled} />
      {reveal && <button className="button primary" disabled={disabled} onClick={next}>Pass the turn <Icon name="arrow" size={17} /></button>}</>;
  } else if (currentPuzzle && !finished) {
    const actorGame = ['charades', 'forbidden'].includes(s.game);
    const canGuess = actorGame ? s.turn !== seat : s.game !== 'puzzle-relay' || s.turn === seat;
    play = <><div className="prompt-heading"><h2>{currentPuzzle.title}</h2><p>{currentPuzzle.brief}</p></div>
      {reveal ? <div className="fact"><span className="mini-label">EVIDENCE COLLECTED</span><strong>{s.detail}</strong>
        <button className="button primary" disabled={disabled} onClick={next}>{s.round + 1 === s.total ? 'Finish mission' : 'Open next clue'} <Icon name="arrow" size={17} /></button></div>
        : <><div className="clue"><span className="mini-label"><Icon name="lock" size={15} /> ONLY YOUR SEAT SEES THIS CLUE</span><p>{currentPuzzle[seat]}</p></div>
          {s.round > 0 && <p className="game-aside">Evidence collected: {s.round} of {s.total}</p>}
          {s.hint > 0 && (!actorGame || s.turn === seat) && <p className="hint">Hint · {currentPuzzle.hint}</p>}
          {canGuess ? <form className="inline-form" onSubmit={(event) => { event.preventDefault(); if (value.trim()) act({ type: 'solve', value }); setValue(''); }}>
            <input aria-label="Puzzle solution" placeholder="Enter the solution" value={value} maxLength={100} onChange={(event) => setValue(event.target.value)} />
            <button className="button primary" disabled={disabled || !value.trim()}>Try solution</button>
          </form> : <p className="game-aside">Share your clue aloud. The other player enters the solution.</p>}
          {!s.hint && (!actorGame || s.turn === seat) && <button className="text-button" disabled={disabled} onClick={() => act({ type: 'hint' })}>Get a hint</button>}
          {s.misses > 0 && <p aria-live="polite" className="game-aside">The lock is still closed. Attempts: {s.misses}.</p>}
        </>}
    </>;
  } else if (game.engine === 'drawing' && (!finished || s.game === 'paint')) {
    play = <><Drawing s={s} client={client} act={act} disabled={disabled} />
      {reveal && <><p className="reveal-note">{s.detail}</p><button className="button primary" disabled={disabled} onClick={next}>{s.round + 1 === s.total ? 'See results' : 'Switch roles'} <Icon name="arrow" size={17} /></button></>}</>;
  } else if (game.engine === 'story') {
    if (s.game === 'story') {
      play = <><div className="story-paper"><p>{storyStart(s)}</p>{s.text && s.text.split('\n').map((line, index) => <p key={index}>{line}</p>)}</div>
        {!finished && <><p className="turn-label">{s.turn === seat ? 'Your sentence' : `Waiting for ${activeName}’s sentence`}</p>
          {s.turn === seat && <form className="answer-form" onSubmit={(event) => { event.preventDefault(); act({ type: 'write', value }); setValue(''); }}>
            <label className="field">One sentence, up to 24 words<textarea value={value} onChange={(event) => setValue(event.target.value)} maxLength={230} /></label>
            <button className="button primary" disabled={disabled || !value.trim() || value.trim().split(/\s+/).length > 24}>Add to story</button>
          </form>}</>}
      </>;
    } else {
      const field = dateFields(s)[s.round];
      play = finished ? <div className={`story-paper ${s.game === 'mystery-date' ? 'scratch-card' : ''}`}>
        {s.game === 'mystery-date' && !waiting ? <button className="button primary" onClick={() => setWaiting(true)}>Uncover our date <Icon name="sparkle" /></button>
          : datePlan(s).map((line) => <p key={line}>{line}</p>)}
      </div> : <><h2>{field?.label}</h2><p className="turn-label">{s.turn === seat ? 'Your choice' : `${activeName} is choosing`}</p>
        <div className="option-grid">{field?.options.map((option, index) => <button className="choice" key={option} disabled={disabled || s.turn !== seat} onClick={() => act({ type: 'choose', value: index })}>{option}</button>)}</div>
      </>;
    }
  } else if (game.engine === 'truth' && !finished) {
    play = <><p className="turn-label">{s.turn === seat ? 'Your turn' : `${activeName}’s turn`}</p>
      {s.pick < 0 ? <div className="option-grid">
        <button className="choice" disabled={disabled || s.turn !== seat} onClick={() => act({ type: 'choose', value: 0 })}>{s.game === 'midnight' ? 'Draw a conversation card' : 'Truth'}</button>
        <button className="choice" disabled={disabled || s.turn !== seat} onClick={() => act({ type: 'choose', value: 1 })}>{s.game === 'midnight' ? 'Draw an activity card' : 'Dare'}</button>
      </div> : <><h2>{truth(s)}</h2><button className="button primary" disabled={disabled} onClick={next}>Done <Icon name="check" size={17} /></button></>}
    </>;
  } else if (game.engine === 'bingo') {
    play = <><div className="bingo-grid">{(s.intensity ? bingoCards.adult : bingoCards.pg).map((label, i) =>
      <button className={`choice ${(s.marks & 1 << i) ? 'chosen' : ''} ${s.proposed === i ? 'pending-mark' : ''}`} key={label}
        disabled={disabled || finished || !!(s.marks & 1 << i) || s.proposed !== -1 && (s.proposed !== i || s.chooser === seat)}
        onClick={() => act({ type: 'mark', value: i })}>{label}{s.proposed === i && s.chooser !== seat ? ' · Confirm' : ''}</button>)}</div>
      <p className="game-aside">Pick a square after doing it together. The other player confirms it.</p>
      {s.proposed >= 0 && <button className="text-button" disabled={disabled} onClick={() => act({ type: 'mark', value: -1 })}>Pass on this square</button>}
    </>;
  }

  return <main className={`shell game-layout skin-${worlds[game.world].color}`} id="main">
    <div className="game-top"><button className="text-button" onClick={() => act(s.intensity ? { type: 'consent', level: 0 } : { type: 'exit' })} disabled={!connected || busy}><Icon name="back" size={17} /> {s.intensity ? 'Return to PG' : 'Back to room'}</button>
      {s.intensity > 0 && <span className="tag"><Icon name="moon" size={16} /> {intensityLabels[s.intensity]}</span>}</div>
    <div className="game-shell">
      <div className="game-banner"><div><p className="mini-label">{worlds[game.world].name}</p><h1>{game.title}</h1></div>
        {deadline > 0 && !reveal && !finished && <span className={`timer ${seconds < 10 ? 'urgent' : ''}`} aria-label={`${seconds} seconds remaining`}><Icon name="clock" size={19} /> {seconds}s</span>}</div>
      <div className="game-rail"><span>{finished ? 'FINAL SCORE' : s.total > 1 ? `ROUND ${s.round + 1} / ${s.total}` : 'IN PLAY'}</span>
        {game.mode === 'competitive' && s.mode !== 'collab' && <span>{room.host.name} <b>{s.score.a}</b> <i>·</i> <b>{s.score.b}</b> {room.guest?.name ?? 'Player 2'}</span>}
        {(game.mode === 'cooperative' || s.mode === 'collab') && <span><Icon name="heart" size={14} /> TEAM <b>{s.score.a}</b></span>}
      </div>
      <div className="game-content">
        {paused && !finished && <p className="notice" role="status">Waiting for {rival} to reconnect. Your game is still here.</p>}
        {localError && <p role="alert" className="error">{localError}</p>}
        {finished && <Result room={room} s={s} act={act} disabled={busy || !connected} />}
        {play}
        {s.intensity > 0 && !finished && game.engine !== 'bingo' && <button className="text-button" disabled={disabled} onClick={next}>Skip this prompt <Icon name="arrow" size={15} /></button>}
      </div>
    </div>
  </main>;
}

function Media({ id }: { id: string }) {
  const entry = mediaManifest[id];
  const [status, set] = useState('loading');
  return <figure className={`question-media ${status}`}>{status === 'failed' ? <div className="media-fallback"><Icon name="sparkle" size={32} /><span>{entry.alt}</span></div> :
    <img src={entry.path} alt={entry.alt} loading="lazy" decoding="async" width={540} height={360} onLoad={() => set('ready')} onError={() => set('failed')} />}
    <figcaption>{entry.credit}</figcaption>
  </figure>;
}

function Result({ room, s, act, disabled }: { room: Room; s: Session; act: (action: Action) => void; disabled: boolean }) {
  const game = byId[s.game];
  const competitive = game?.mode === 'competitive' && s.mode !== 'collab';
  const winner = s.score.a > s.score.b ? room.host.name : room.guest?.name ?? 'Player 2';
  const title = competitive ? s.score.a === s.score.b ? 'It’s a tie.' : `${winner} takes the round!` : s.score.a ? 'Look what you did together.' : 'That’s a wrap.';
  return <div className="result-card" aria-live="polite"><Icon name="trophy" size={33} /><h2>{title}</h2>
    {competitive && <p>{room.host.name} {s.score.a} · {s.score.b} {room.guest?.name ?? 'Player 2'}</p>}
    {game?.engine === 'puzzle' && <p>{s.score.a} {s.score.a === 1 ? 'lock' : 'locks'} opened together.</p>}
    <div className="button-row"><button className="button primary" disabled={disabled} onClick={() => act({ type: 'propose', game: s.game, mode: s.mode, difficulty: s.difficulty })}>Request rematch</button>
      <button className="button outline" disabled={disabled} onClick={() => act({ type: 'exit' })}>Play another</button></div>
  </div>;
}
