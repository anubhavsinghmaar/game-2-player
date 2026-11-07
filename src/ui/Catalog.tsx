import { useState } from 'react';
import { games, playable, worlds } from '../games/registry.ts';
import type { GameDefinition, World } from '../games/registry.ts';
import { Icon } from './Icon.tsx';

export const worldIcons: Record<World, string> = {
  love: 'heart', dark: 'moon', quiz: 'sparkle', party: 'bolt', arcade: 'controller', mystery: 'search', creative: 'pencil', daily: 'sun',
};

export function Catalog({ inspect, favorites, toggle, compact = false }: {
  inspect: (game: GameDefinition) => void; favorites: string[]; toggle: (id: string) => void; compact?: boolean;
}) {
  const [world, setWorld] = useState<World | 'all' | 'favorites'>('all');
  const [query, setQuery] = useState('');
  const [full, setFull] = useState(false);
  const [onlyPlayable, setOnlyPlayable] = useState(false);
  const filtered = games.filter((game) =>
    (world === 'all' || (world === 'favorites' ? favorites.includes(game.id) : game.world === world)) &&
    (!onlyPlayable || game.engine) &&
    `${game.title} ${game.description} ${worlds[game.world].name}`.toLowerCase().includes(query.trim().toLowerCase()));
  const featured = ['this-or-that', 'connect-four', 'bollywood', 'draw-guess', 'escape', 'story'];
  const limited = !full && !query && world === 'all' && !onlyPlayable;
  const shown = limited ? featured.map((id) => games.find((game) => game.id === id)!).filter(Boolean) : filtered;

  return <section className={`catalog ${compact ? 'compact' : ''}`} id="worlds" aria-label="Game worlds">
    <div className="section-heading">
      <div><p className="eyebrow"><Icon name="grid" size={15} /> THE GAME LIBRARY</p><h2>Pick your kind of play.</h2>
        <p>Eight worlds, from sweet little questions to serious rematch energy.</p></div>
      <div className="count-stamp"><strong>{playable.length}</strong><span>READY TO PLAY</span></div>
    </div>
    <div className="world-strip" role="group" aria-label="Filter by world">
      <button className={`world-chip all-worlds ${world === 'all' ? 'active' : ''}`} aria-pressed={world === 'all'} onClick={() => setWorld('all')}><Icon name="grid" size={17} /> All worlds</button>
      {(Object.keys(worlds) as World[]).map((item) => <button key={item}
        className={`world-chip skin-${worlds[item].color} ${world === item ? 'active' : ''}`}
        aria-pressed={world === item}
        onClick={() => setWorld(world === item ? 'all' : item)}>
        <Icon name={worldIcons[item]} size={19} />{worlds[item].name}
      </button>)}
    </div>
    <div className="filter-bar">
      <label className="search-field"><Icon name="search" size={18} /><input type="search" placeholder="Find a game…" aria-label="Find a game" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <button className="text-button" aria-pressed={world === 'favorites'} onClick={() => setWorld(world === 'favorites' ? 'all' : 'favorites')}><Icon name="heart" size={17} /> Favorites</button>
      <label className="filter-check"><input type="checkbox" checked={onlyPlayable} onChange={(event) => setOnlyPlayable(event.target.checked)} /> Playable only</label>
    </div>
    <div className="catalog-title">
      <h3>{world === 'all' ? limited ? 'Arcade favorites' : 'All games' : world === 'favorites' ? 'Your favorites' : worlds[world].name}</h3>
      {limited && <button className="text-button" onClick={() => setFull(true)}>View all {games.length} <Icon name="arrow" size={17} /></button>}
    </div>
    {shown.length ? <div className="game-grid">{shown.map((game) =>
      <article className={`game-card skin-${worlds[game.world].color}`} key={game.id}>
        <button className="card-main" onClick={() => inspect(game)}>
          <span className="card-icon"><Icon name={worldIcons[game.world]} size={24} /></span>
          <span className="card-world">{worlds[game.world].name}</span>
          <strong>{game.title}</strong>
          <span className="card-desc">{game.description}</span>
          <span className="card-meta">{game.engine ? <><Icon name="clock" size={15} /> {game.minutes} min</> : <><Icon name="lock" size={15} /> Coming Soon</>}</span>
        </button>
        <button className={`icon-button favorite ${favorites.includes(game.id) ? 'saved' : ''}`}
          aria-label={`${favorites.includes(game.id) ? 'Remove' : 'Save'} ${game.title} ${favorites.includes(game.id) ? 'from' : 'to'} favorites`}
          aria-pressed={favorites.includes(game.id)} onClick={() => toggle(game.id)}><Icon name="heart" size={18} /></button>
      </article>)}</div> : <p className="empty">{world === 'favorites' ? 'Tap the heart on a game to keep it close.' : 'No games match those filters.'}</p>}
  </section>;
}
