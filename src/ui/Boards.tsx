import { Icon } from './Icon.tsx';
import { memoryDeck } from '../games/engine.ts';
import type { Action } from '../games/engine.ts';
import { cardRanks, checkersSelection, checkersTargets, higherLowerRounds, lineGames, mustJump, reversiCaptures } from '../games/boards.ts';
import type { Seat, Session } from '../room/model.ts';

type Props = { s: Session; seat: Seat; act: (action: Action) => void; disabled: boolean };

export function Board({ s, seat, act, disabled }: Props) {
  const canMove = !disabled && s.turn === seat && s.phase === 'playing';
  if (s.game === 'dots-boxes') return <div className="dots-grid" aria-label="Dots and boxes board">
    {Array.from({ length: 49 }, (_, i) => {
      const x = i % 7, y = Math.floor(i / 7);
      if (x % 2 === 0 && y % 2 === 0) return <span key={i} className="dot-cell" aria-hidden="true" />;
      if (x % 2 === 1 && y % 2 === 1) return <span key={i} className={`box-cell piece-${s.claims[(y - 1) / 2 * 3 + (x - 1) / 2]}`} />;
      const horizontal = y % 2 === 0;
      const edge = horizontal ? y / 2 * 3 + (x - 1) / 2 : 12 + (y - 1) / 2 * 4 + x / 2;
      return <button key={i} className={`edge ${horizontal ? 'horizontal' : 'vertical'} piece-${s.board[edge]}`}
        aria-label={`${horizontal ? 'Horizontal' : 'Vertical'} edge, row ${Math.ceil((y + 1) / 2)}, column ${Math.ceil((x + 1) / 2)}`}
        disabled={!canMove || s.board[edge] !== '.'} onClick={() => act({ type: 'move', value: edge })} />;
    })}
  </div>;
  if (s.game === 'checkers') return <Checkers s={s} seat={seat} act={act} disabled={!canMove} />;
  if (s.game === 'higher-lower') return <HigherLower s={s} seat={seat} act={act} disabled={!canMove} />;
  const gravity = s.game === 'connect-four';
  const reversi = s.game === 'reversi';
  const gomoku = s.game === 'five-row';
  const cols = reversi ? 8 : lineGames[s.game]?.width ?? 3;
  return <div className={`board-wrap ${gravity ? 'gravity' : reversi ? 'reversi' : gomoku ? 'gomoku' : 'tictac'}`} style={{ '--cols': cols } as React.CSSProperties}>
    {gravity && <div className="column-keys">{Array.from({ length: cols }, (_, index) =>
      <button className="column-key" key={index} aria-label={`Drop in column ${index + 1}`} disabled={!canMove || s.board[index] !== '.'} onClick={() => act({ type: 'move', value: index })}><Icon name="down" size={20} /></button>)}</div>}
    <div className="board" aria-label={gravity ? 'Connect Four board' : reversi ? 'Reversi board' : gomoku ? 'Five in a Row board' : 'Tic-Tac-Toe board'}>
      {[...s.board].map((piece, index) => {
        const legal = reversi ? reversiCaptures(s.board, index, seat).length > 0 : piece === '.';
        const label = `Row ${Math.floor(index / cols) + 1}, column ${index % cols + 1}, ${piece === '.' ? 'empty' : piece === 'a' ? 'Player 1' : 'Player 2'}`;
        const name = `board-cell piece-${piece} ${canMove && legal ? 'legal' : ''}`;
        return gravity ? <span className={name} key={index} role="img" aria-label={label} /> :
          <button key={index} className={name} disabled={!canMove || !legal} aria-label={label} onClick={() => act({ type: 'move', value: index })}>
            {!reversi && !gomoku && piece !== '.' && <Icon name={piece === 'a' ? 'close' : 'circle'} size={35} />}
          </button>;
      })}
    </div>
  </div>;
}

export function Memory({ s, seat, act, disabled }: Props) {
  const deck = memoryDeck(s);
  return <div className="memory-grid" aria-label="Memory Match board">{deck.map((value, index) => {
    const found = !!(s.found & (1 << index));
    const visible = found || s.first === index || s.second === index;
    return <button key={index} className={`memory-tile ${visible ? 'face-up' : ''} ${found ? 'matched' : ''}`}
      aria-label={`Tile ${index + 1}, ${visible ? value : 'face down'}${found ? ', matched' : ''}`}
      disabled={disabled || visible || s.turn !== seat || s.phase !== 'playing'} onClick={() => act({ type: 'flip', value: index })}>
      <Icon name={visible ? value : 'help'} size={29} />
    </button>;
  })}</div>;
}

function Checkers({ s, seat, act, disabled }: Props) {
  const selection = checkersSelection(s.claims);
  const targets = selection ? checkersTargets(s.board, selection.square, seat, selection.forced || undefined).map((t) => t.to) : [];
  const forcedJump = !disabled && mustJump(s.board, seat);
  const flip = seat === 'b';
  const order = Array.from({ length: 64 }, (_, i) => flip ? 63 - i : i);
  return <div className="board-wrap checkers">
    {!disabled && <p className="board-hint">{selection?.forced ? 'Keep jumping!' : forcedJump ? 'A capture is available — you must jump.' : selection ? 'Tap a glowing square to move.' : 'Tap one of your pieces.'}</p>}
    <div className="board" aria-label="Checkers board">
      {order.map((index) => {
        const piece = s.board[index];
        const x = index % 8, y = Math.floor(index / 8);
        const dark = (x + y) % 2 === 1;
        const mine = piece.toLowerCase() === seat;
        const target = targets.includes(index);
        const selectable = !disabled && mine && !selection?.forced && checkersTargets(s.board, index, seat).length > 0;
        const name = `board-cell ${dark ? 'dark' : 'light'} piece-${piece.toLowerCase()} ${piece === 'A' || piece === 'B' ? 'king' : ''} ${selection?.square === index ? 'selected' : ''} ${target ? 'target' : ''} ${selectable ? 'legal' : ''}`;
        const label = `Row ${y + 1}, column ${x + 1}, ${piece === '.' ? 'empty' : `${piece.toLowerCase() === 'a' ? 'Player 1' : 'Player 2'}${piece === 'A' || piece === 'B' ? ' king' : ''}`}`;
        return <button key={index} className={name} aria-label={label} disabled={disabled || !(target || selectable)}
          onClick={() => act({ type: 'move', value: index })}>
          {(piece === 'A' || piece === 'B') && <span className="crown" aria-hidden="true">♛</span>}
        </button>;
      })}
    </div>
  </div>;
}

const rankName = (rank: string) => ({ T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' } as Record<string, string>)[rank] ?? rank;
const suits = ['♠', '♥', '♦', '♣'];

function PlayingCard({ rank, index, hidden = false }: { rank: string; index: number; hidden?: boolean }) {
  const suit = suits[index % 4];
  const red = suit === '♥' || suit === '♦';
  if (hidden) return <div className="playing-card back" aria-label="Face-down card" />;
  return <div className={`playing-card ${red ? 'red' : ''}`} aria-label={`${rankName(rank)} of ${suit}`}>
    <span className="corner">{rankName(rank)}<br />{suit}</span>
    <span className="pip">{suit}</span>
    <span className="corner bottom">{rankName(rank)}<br />{suit}</span>
  </div>;
}

function HigherLower({ s, act, disabled }: Props) {
  const log = s.claims.replace(/\./g, '');
  const position = Math.min(log.length, higherLowerRounds);
  const current = s.board[position];
  const finished = log.length >= higherLowerRounds;
  return <div className="higher-lower">
    <div className="card-row">
      <PlayingCard rank={current} index={position} />
      {!finished && <PlayingCard rank="" index={0} hidden />}
    </div>
    <p className="board-hint">Card {position + 1} of {higherLowerRounds + 1} · Rank order 2 → A ({cardRanks.length} ranks)</p>
    {!finished && <div className="hl-actions">
      <button className="button primary" disabled={disabled} onClick={() => act({ type: 'move', value: 1 })}>▲ Higher</button>
      <button className="button" disabled={disabled} onClick={() => act({ type: 'move', value: 0 })}>▼ Lower</button>
    </div>}
    <ol className="hl-history" aria-label="Previous calls">
      {[...log].map((entry, i) => <li key={i} className={entry === 'a' || entry === 'x' ? 'seat-a' : 'seat-b'}>
        <span>{rankName(s.board[i])} → {rankName(s.board[i + 1])}</span>
        <strong>{entry === 'a' || entry === 'b' ? '✓' : '✗'}</strong>
      </li>)}
    </ol>
  </div>;
}
