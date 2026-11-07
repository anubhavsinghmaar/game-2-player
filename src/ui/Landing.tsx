import { Icon } from './Icon.tsx';

export function Landing({ create, join, demo, resume }: {
  create: () => void; join: () => void; demo: () => void; resume?: () => void;
}) {
  return <main id="main">
    <section className="hero shell">
      <div className="hero-copy">
        <p className="eyebrow"><Icon name="ticket" size={16} /> THE PRIVATE ARCADE FOR TWO</p>
        <h1>Your favorite person.<br /><em>A hundred reasons<br className="hero-break" /> to play.</em></h1>
        <p className="hero-lead">One private room. Cards, clues, board games and a good excuse to spend the evening together.</p>
        <div className="hero-actions">
          <button className="button primary" onClick={create}><Icon name="plus" /> Create our room</button>
          <button className="button outline" onClick={join}><Icon name="key" /> Join a room</button>
        </div>
        <div className="hero-secondary">
          <button className="text-button" onClick={demo}>Explore demo <Icon name="arrow" size={16} /></button>
          {resume && <button className="text-button" onClick={resume}>Rejoin last room <Icon name="link" size={16} /></button>}
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="art-frame">
          <div className="art-kicker"><span>JUST US / VOL. 01</span><span>THE TWO-PLAYER DECK</span></div>
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-star star-one"><Icon name="sparkle" size={29} /></div><div className="art-star star-two"><Icon name="sparkle" size={38} /></div><div className="art-star star-three"><Icon name="sparkle" size={26} /></div>
          <div className="art-card art-card-blue"><span className="art-corner">02</span><Icon name="bolt" size={72} /><span className="art-card-text">PRESS START</span></div>
          <div className="art-card art-card-pink"><span className="art-corner">01</span><Icon name="heart" size={76} /><span className="art-card-text">PLAY TOGETHER</span></div>
          <div className="art-card art-card-gold"><span className="art-corner">03</span><Icon name="sparkle" size={65} /><span className="art-card-text">GOOD LUCK</span></div>
          <div className="art-ticket"><Icon name="ticket" size={24} /><span>ADMIT TWO</span><small>GOOD FOR ONE GAME NIGHT</small></div>
          <div className="art-foot"><span>THE DATE-NIGHT EDITION</span><span>01 / 03</span></div>
        </div>
      </div>
    </section>
    <div className="hero-ribbon"><div className="shell ribbon-content"><span><Icon name="lock" size={16} /> Private by invitation</span><span className="ribbon-divider" aria-hidden="true" /><span><Icon name="controller" size={19} /> One room, eight worlds</span><span className="ribbon-divider" aria-hidden="true" /><span><Icon name="heart" size={17} /> Across the room or across the world</span></div></div>
  </main>;
}
