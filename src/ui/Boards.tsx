import { Icon } from './Icon.tsx';
import { memoryDeck } from '../games/engine.ts';
import type { Action } from '../games/engine.ts';
import { reversiCaptures } from '../games/boards.ts';
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
  const gravity = s.game === 'connect-four';
  const reversi = s.game === 'reversi';
  const cols = gravity ? 7 : reversi ? 8 : 3;
  return <div className={`board-wrap ${gravity ? 'gravity' : reversi ? 'reversi' : 'tictac'}`} style={{ '--cols': cols } as React.CSSProperties}>
    {gravity && <div className="column-keys">{Array.from({ length: cols }, (_, index) =>
      <button className="column-key" key={index} aria-label={`Drop in column ${index + 1}`} disabled={!canMove || s.board[index] !== '.'} onClick={() => act({ type: 'move', value: index })}><Icon name="down" size={20} /></button>)}</div>}
    <div className="board" aria-label={gravity ? 'Connect Four board' : reversi ? 'Reversi board' : 'Tic-Tac-Toe board'}>
      {[...s.board].map((piece, index) => {
        const legal = reversi ? reversiCaptures(s.board, index, seat).length > 0 : piece === '.';
        const label = `Row ${Math.floor(index / cols) + 1}, column ${index % cols + 1}, ${piece === '.' ? 'empty' : piece === 'a' ? 'Player 1' : 'Player 2'}`;
        const name = `board-cell piece-${piece} ${canMove && legal ? 'legal' : ''}`;
        return gravity ? <span className={name} key={index} role="img" aria-label={label} /> :
          <button key={index} className={name} disabled={!canMove || !legal} aria-label={label} onClick={() => act({ type: 'move', value: index })}>
            {!reversi && piece !== '.' && <Icon name={piece === 'a' ? 'close' : 'circle'} size={35} />}
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
