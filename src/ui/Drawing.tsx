import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { drawingWord } from '../games/engine.ts';
import type { Action } from '../games/engine.ts';
import { humanError } from '../room/client.ts';
import type { RoomClient } from '../room/client.ts';
import { randomToken } from '../room/model.ts';
import type { Session, Stroke, StrokeEntry } from '../room/model.ts';
import { Icon } from './Icon.tsx';

const colors = { ink: '#2e213a', rose: '#d85c85', blue: '#4f7abb', mint: '#30846b', gold: '#d08f25', paper: '#fff5e8' };
const W = 900;
const H = 540;
type Point = [number, number];
const roundPoint = ([x, y]: Point) => [x, y].map((value) => String(Math.max(0, Math.min(999, Math.round(value)))).padStart(3, '0')).join(',');
const unpack = (value: string): Point[] => value.split(';').map((point) => point.split(',').map(Number) as Point);

function renderStroke(ctx: CanvasRenderingContext2D, points: Point[], color: Stroke['color']) {
  if (!points.length) return;
  ctx.strokeStyle = colors[color];
  ctx.lineWidth = color === 'paper' ? 31 : 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0] * W / 999, points[0][1] * H / 999);
  for (const [x, y] of points) ctx.lineTo(x * W / 999, y * H / 999);
  if (points.length === 1) ctx.lineTo(points[0][0] * W / 999 + .01, points[0][1] * H / 999);
  ctx.stroke();
}

export function Drawing({ s, client, act, disabled }: { s: Session; client: RoomClient; act: (action: Action) => void; disabled: boolean }) {
  const [strokes, setStrokes] = useState<StrokeEntry[]>([]);
  const [color, setColor] = useState<Stroke['color']>('ink');
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const points = useRef<Point[]>([]);
  const group = useRef('');
  const pointer = useRef<number | undefined>(undefined);
  const lastSent = useRef(0);
  const shared = s.game === 'paint';
  const canDraw = !disabled && s.phase === 'playing' && (shared || s.turn === client.seat);
  const own = strokes.filter((stroke) => stroke.seat === client.seat);
  const sessionID = s.id;
  const round = s.round;

  useEffect(() => client.watchStrokes(s, setStrokes), [client, sessionID, round]); // The stream key is immutable for a round.

  function redraw() {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, W, H);
    for (const stroke of strokes) renderStroke(ctx, unpack(stroke.points), stroke.color);
    renderStroke(ctx, points.current, color);
  }
  useEffect(redraw, [strokes, color]);

  function send() {
    const batch = points.current;
    if (!batch.length) return;
    if (strokes.length >= 320) { setError('This sketch is full. Undo a stroke or finish the round.'); return; }
    points.current = batch.slice(-1);
    lastSent.current = performance.now();
    void client.stroke(s, { seat: client.seat, group: group.current, color, points: batch.map(roundPoint).join(';') })
      .catch((reason: unknown) => setError(humanError(reason)));
  }

  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - rect.x) / rect.width * 999, (event.clientY - rect.y) / rect.height * 999];
  }
  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || event.pointerId !== pointer.current) return;
    const next = point(event);
    const previous = points.current.at(-1);
    points.current.push(next);
    const ctx = canvas.current?.getContext('2d');
    if (ctx && previous) renderStroke(ctx, [previous, next], color);
    if (points.current.length >= 70 || performance.now() - lastSent.current > 150) send();
  }
  function end(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerId !== pointer.current) return;
    if (canDraw) send();
    points.current = [];
    pointer.current = undefined;
  }
  function remove(keys: string[]) {
    setClearing(false);
    void client.eraseStrokes(s, keys).catch((reason: unknown) => setError(humanError(reason)));
  }

  return <div className="drawing-area">
    <h2>{shared ? 'Make a mark together.' : s.phase === 'reveal' ? `The word was ${drawingWord(s)}.` : s.turn === client.seat ? `Draw: ${drawingWord(s)}` : 'What are they drawing?'}</h2>
    <p>{shared ? 'This sketch belongs to this round. Save a copy only after you both agree.' : 'Draw without letters or numbers. You’ll switch roles next round.'}</p>
    {canDraw && <div className="drawing-tools" aria-label="Drawing tools">
      {Object.entries(colors).map(([name, hex]) => <button type="button" key={name} className="swatch"
        aria-label={name === 'paper' ? 'Eraser' : `${name} pen`} aria-pressed={name === color}
        style={{ '--ink': hex } as React.CSSProperties} onClick={() => setColor(name as Stroke['color'])}>{name === 'paper' ? '⌫' : ''}</button>)}
      <button className="button small outline" disabled={!own.length} onClick={() => {
        const last = own.at(-1)?.group;
        remove(own.filter((stroke) => stroke.group === last).map((stroke) => stroke.key));
      }}>Undo</button>
      <button className="button small outline" disabled={!own.length} onClick={() => setClearing(true)}>Clear mine</button>
      {clearing && <button className="button small primary" onClick={() => remove(own.map((stroke) => stroke.key))}>Confirm clear</button>}
    </div>}
    <canvas ref={canvas} width={W} height={H} className={canDraw ? 'canvas interactive' : 'canvas'} aria-label="Shared freehand drawing"
      onPointerDown={(event) => {
        if (!canDraw || pointer.current !== undefined || event.button !== 0) return;
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        points.current = [point(event)];
        group.current = randomToken(5);
        lastSent.current = performance.now();
        const ctx = canvas.current?.getContext('2d');
        if (ctx) renderStroke(ctx, points.current, color);
      }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} />
    {error && <p className="error" role="alert">{error}</p>}
    {shared && s.phase === 'playing' && <button className="button primary" disabled={disabled} onClick={() => act({ type: 'finish' })}>Finish sketch <Icon name="check" size={17} /></button>}
    {!shared && s.phase === 'playing' && s.turn !== client.seat && <form className="inline-form" onSubmit={(event) => {
      event.preventDefault();
      if (guess.trim()) act({ type: 'solve', value: guess });
      setGuess('');
    }}><input aria-label="Your drawing guess" placeholder="Type your guess" maxLength={80} value={guess} onChange={(event) => setGuess(event.target.value)} /><button className="button primary" disabled={disabled || !guess.trim()}>Guess</button></form>}
    {!shared && s.misses > 0 && s.phase === 'playing' && <p aria-live="polite">{s.misses} {s.misses === 1 ? 'guess' : 'guesses'} so far. Keep going!</p>}
  </div>;
}
