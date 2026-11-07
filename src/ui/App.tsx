import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { games, worlds } from '../games/registry.ts';
import type { GameDefinition } from '../games/registry.ts';
import { mediaManifest } from '../data/mediaManifest.ts';
import { humanError } from '../room/client.ts';
import type { RoomClient } from '../room/client.ts';
import type { GuestPairing, HostPairing } from '../room/direct.ts';
import { difficulties, modes, tidy } from '../room/input.ts';
import type { QuizDifficulty, QuizMode } from '../room/model.ts';
import { Catalog, worldIcons } from './Catalog.tsx';
import { Dialog, tone, usePreference } from './common.tsx';
import { Icon } from './Icon.tsx';
import { Landing } from './Landing.tsx';
import { Pairing } from './Pairing.tsx';

const RoomView = lazy(async () => ({ default: (await import('./RoomView.tsx')).RoomView }));

type DialogName = 'create' | 'join' | 'help' | 'credits' | 'settings';
const labels: Record<QuizMode, string> = { quick: 'Quick play · up to 5', classic: 'Classic · up to 10', blitz: 'Blitz · 12 seconds', sudden: 'Sudden death', risk: 'Risk your points', collab: 'Collaborative discovery' };
const avatarChoices = ['flower', 'sparkle', 'moon', 'sun', 'heart', 'controller', 'bolt', 'ticket'];
const invitation = () => location.hash.startsWith('#invite=') ? location.hash.slice(8) : '';
const route = () => {
  const match = /^\/room\/([a-f0-9]{36})\/?$/.exec(location.pathname);
  return match?.[1] ?? (location.pathname === '/demo' ? 'demo' : '');
};

export function App() {
  const [path, setPath] = useState(route);
  const [invite, setInvite] = useState(invitation);
  const [dialog, setDialog] = useState<DialogName | undefined>(() => invitation() ? 'join' : undefined);
  const [inspection, setInspection] = useState<GameDefinition>();
  const [demo, setDemo] = useState<RoomClient>();
  const [remote, setRemote] = useState<{ client: RoomClient; close: () => void }>();
  const [pairing, setPairing] = useState<HostPairing | GuestPairing>();
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState('');
  const [proposal, setProposal] = useState<{ room: string; value: string }>();
  const [favorites, setFavorites] = usePreference<string[]>('favorites', []);
  const [sound, setSound] = usePreference('sound', false);
  const [reduced, setReduced] = usePreference('motion', false);
  const [shuffleOpen, setShuffleOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const client = path === 'demo' ? demo : remote?.client.id === path ? remote.client : undefined;

  useEffect(() => {
    const change = () => { setPath(route()); setInspection(undefined); setDialog(undefined); };
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, []);
  useEffect(() => { document.documentElement.dataset.reducedMotion = String(reduced); }, [reduced]);

  useEffect(() => {
    if (invitation()) history.replaceState(null, '', location.pathname);
  }, []);

  useEffect(() => {
    if (path !== 'demo' || demo) return;
    let active = true;
    void import('../room/local.ts').then(({ localRoom }) => { if (active) setDemo(localRoom()); });
    return () => { active = false; };
  }, [path, demo]);

  const navigate = useCallback((target: string, hash = '') => {
    const next = target === 'demo' ? '/demo' : target ? `/room/${target}` : '/';
    history.pushState(null, '', next + hash);
    setPath(target);
    setDialog(undefined);
    setInspection(undefined);
    setProblem('');
    setPending(false);
    setConsentOpen(false);
    setShuffleOpen(false);
    window.scrollTo(0, 0);
    if (hash) requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
  }, []);

  const open = (name: DialogName) => { setProblem(''); setDialog(name); };
  const toggle = (id: string) => setFavorites((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  async function enter(profile: { name: string; emoji: string }, code: string) {
    if (pending || !dialog) return;
    setPending(true);
    setProblem('');
    try {
      const { hostDirect, guestDirect } = await import('../room/direct.ts');
      const next = dialog === 'create' ? await hostDirect(profile) : await guestDirect(code, profile);
      setDialog(undefined);
      setInvite('');
      setPairing(next);
    } catch (error) { setProblem(humanError(error)); }
    finally { setPending(false); }
  }

  const completePairing = useCallback((next: RoomClient) => {
    if (!pairing) return;
    remote?.close();
    setRemote({ client: next, close: pairing.close });
    setPairing(undefined);
    navigate(next.id);
  }, [pairing, remote, navigate]);

  function arcade() {
    const catalog = document.getElementById('worlds');
    if (catalog) catalog.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' });
    else navigate('', '#worlds');
  }
  function gameNight() {
    if (!client) navigate('demo');
    setShuffleOpen(true);
  }

  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="header"><div className="shell header-inner">
      <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigate(''); }}><span className="brand-mark"><Icon name="ticket" size={28} /></span>
        <span className="brand-text">JUST US <strong>ARCADE</strong></span></a>
      <nav className="nav" aria-label="Main navigation">
        <button className="nav-item active" onClick={arcade}><Icon name="grid" size={16} /> The Arcade</button>
        <button className="nav-item" onClick={gameNight}><Icon name="shuffle" size={17} /> Game Night</button>
      </nav>
      <div className="nav-actions">
        <button className="icon-button" aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound} onClick={() => { setSound(!sound); tone(!sound); }}><Icon name={sound ? 'sound' : 'mute'} size={20} /></button>
        <button className="icon-button" aria-label="Help and settings" onClick={() => open('help')}><Icon name="help" size={20} /></button>
      </div>
    </div></header>
    {!path && <>
      <Landing create={() => open('create')} join={() => open('join')} demo={() => navigate('demo')} resume={remote ? () => navigate(remote.client.id) : undefined} />
      <div className="shell"><Catalog inspect={setInspection} favorites={favorites} toggle={toggle} /></div>
      <section className="shell landing-end"><div><p className="eyebrow"><Icon name="sparkle" size={15} /> THE NEXT MOVE IS YOURS</p><h2>Save the evening for two.</h2></div>
        <button className="button primary" onClick={() => open('create')}>Create our room <Icon name="arrow" size={18} /></button></section>
    </>}
    {client && <Suspense fallback={<main className="shell message-view" id="main" role="status">Opening your room…</main>}><RoomView key={client.id} client={client} goHome={() => { if (!client.local) { remote?.close(); setRemote(undefined); } navigate(''); }} inspect={setInspection}
      selectedGame={proposal?.room === client.id ? proposal.value : undefined} favorites={favorites} toggle={toggle} sound={sound}
      shuffleOpen={shuffleOpen} setShuffleOpen={setShuffleOpen} consentOpen={consentOpen} setConsentOpen={setConsentOpen} /></Suspense>}
    {path === 'demo' && !client && <main className="shell message-view" id="main" role="status">Opening the demo…</main>}
    {path && path !== 'demo' && !client && <main className="shell message-view" id="main">
      <Icon name="ticket" size={44} /><p className="eyebrow">DIRECT PLAY</p><h1>This room ended.</h1>
      <p>Start a fresh invitation to reconnect after a tab has been closed or refreshed.</p>
      <button className="button primary" onClick={() => open('create')}>Create a new room</button>
      <button className="text-button" onClick={() => navigate('')}>Back to the arcade</button>
    </main>}
    <nav className="mobile-nav" aria-label="Quick navigation">
      <button onClick={arcade}><Icon name="grid" size={21} /> Arcade</button>
      <button onClick={gameNight}><Icon name="shuffle" size={21} /> Shuffle</button>
      <button onClick={() => open('settings')}><Icon name="settings" size={21} /> Settings</button>
    </nav>
    <footer className="footer"><div className="shell footer-inner"><span><Icon name="ticket" size={19} /> JUST US ARCADE</span><span>Two players. Your rules.</span>
      <div><button className="text-button" onClick={() => open('settings')}>Settings</button><button className="text-button" onClick={() => open('credits')}>Credits & privacy</button></div></div></footer>

    {(dialog === 'create' || dialog === 'join') && <Dialog title={dialog === 'create' ? 'Create our room' : 'Take your seat'} close={() => { if (!pending) { setDialog(undefined); setProblem(''); } }}>
      <p>{dialog === 'create' ? 'Open a direct room and share the invite with one person.' : 'Make a reply to connect directly with your partner.'}</p>
      <EntryForm join={dialog === 'join'} invite={invite} pending={pending} error={problem} enter={(profile, code) => { void enter(profile, code); }} />
    </Dialog>}
    {pairing && <Pairing pairing={pairing} cancel={() => { pairing.close(); setPairing(undefined); }} enter={completePairing} />}
    {dialog === 'help' && <Dialog title="A little help" close={() => setDialog(undefined)}>
      <ol className="help-list"><li>Send an invite link. Your partner opens it, makes a reply code, and sends the reply back. Paste it to connect.</li><li>Pick a game. Both of you tap ready, then the host starts it.</li><li>Play as many games as you like in the same room.</li></ol>
      <p>Keep both arcade tabs open while playing. You can use the local demo with two seats on one device.</p>
      <button className="button outline" onClick={() => setDialog('settings')}>Open settings</button>
    </Dialog>}
    {dialog === 'settings' && <Dialog title="Make it yours" close={() => setDialog(undefined)}>
      <label className="filter-check"><input type="checkbox" checked={sound} onChange={(event) => { setSound(event.target.checked); tone(event.target.checked); }} /> Play arcade sounds</label>
      <label className="filter-check"><input type="checkbox" checked={reduced} onChange={(event) => setReduced(event.target.checked)} /> Reduce extra animation</label>
      {client && <button className="button outline" onClick={() => { setDialog(undefined); setConsentOpen(true); }}><Icon name="moon" size={17} /> After Dark preferences</button>}
    </Dialog>}
    {dialog === 'credits' && <Dialog title="Credits & privacy" close={() => setDialog(undefined)}>
      <p>Keep invitations and reply codes between yourselves. They carry the network information your browsers need to connect.</p>
      <p>Game traffic travels over an encrypted browser connection. Closing or refreshing a tab ends that room. The site keeps preferences on your device.</p>
      <p>Game icons, illustration and sounds are drawn or synthesized in the app. Trivia photographs:</p>
      <ul className="help-list">{Object.values(mediaManifest).map((asset) => <li key={asset.path}>{asset.credit} · {asset.license} <a href={asset.source} target="_blank" rel="noreferrer">Source <Icon name="external" size={14} /></a></li>)}</ul>
    </Dialog>}
    {inspection && <Details game={inspection} close={() => setInspection(undefined)} room={!!client} invite={(mode, difficulty) => {
      if (!client) { navigate('demo'); setProposal({ room: 'demo', value: `${inspection.id}|${mode}|${difficulty}` }); }
      else { setInspection(undefined); setProposal({ room: client.id, value: `${inspection.id}|${mode}|${difficulty}|${Date.now()}` }); }
    }} consent={() => {
      if (!client) navigate('demo');
      setInspection(undefined);
      setConsentOpen(true);
    }} />}
  </>;
}

function EntryForm({ join, invite, pending, error, enter }: {
  join: boolean; invite: string; pending: boolean; error: string; enter: (profile: { name: string; emoji: string }, code: string) => void;
}) {
  const [name, setName] = usePreference('nickname', '');
  const [icon, setIcon] = usePreference('seat-icon', 'flower');
  const [code, setCode] = useState(invite);
  const valid = !!tidy(name, 24) && (!join || code.trim().length > 20);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) enter({ name, emoji: icon }, code);
  }
  return <form className="entry-form" onSubmit={submit}>
    {join && !invite && <label className="field">Invite link or code<textarea rows={2} placeholder="Paste the invitation your partner sent" value={code} onChange={(event) => setCode(event.target.value)} autoCapitalize="off" spellCheck={false} /></label>}
    {join && invite && <p className="pair-status"><Icon name="link" size={17} /> Invitation received</p>}
    <label className="field">Your nickname<input type="text" maxLength={24} autoComplete="nickname" placeholder="What should we call you?" value={name} onChange={(event) => setName(event.target.value)} /></label>
    <fieldset className="icon-picker"><legend>Choose your seat icon</legend>{avatarChoices.map((item) =>
      <button type="button" key={item} aria-label={item} aria-pressed={icon === item} onClick={() => setIcon(item)}><Icon name={item} size={20} /></button>)}</fieldset>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="button primary" disabled={!valid || pending}>{pending ? 'Opening…' : 'Continue'} <Icon name="arrow" size={17} /></button>
  </form>;
}

function Details({ game, close, room, invite, consent }: {
  game: GameDefinition; close: () => void; room: boolean; invite: (mode: QuizMode, difficulty: QuizDifficulty) => void; consent: () => void;
}) {
  const [mode, setMode] = useState<QuizMode>('quick');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('mixed');
  const flavor = worlds[game.world];
  return <Dialog title={game.title} close={close}>
    <div className={`skin-${flavor.color}`}><span className="tag"><Icon name={worldIcons[game.world]} size={17} /> {flavor.name}</span></div>
    <p>{game.description}</p><p className="game-aside">2 players · About {game.minutes} min · {game.mode} · {game.difficulty}</p>
    {!game.engine ? <p className="notice"><Icon name="lock" size={17} /> Coming Soon</p> : <>
      {game.adult && <p className="notice"><Icon name="lock" size={17} /> Both seats must opt in to play.</p>}
      {game.engine === 'quiz' && <div className="form-pair">
        <label className="field">Match format<select value={mode} onChange={(event) => setMode(event.target.value as QuizMode)}>{modes.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label>
        <label className="field">Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as QuizDifficulty)}>{difficulties.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>}
      <div className="button-row">
        <button className="button primary" onClick={() => invite(mode, difficulty)}>{room ? 'Invite to play' : 'Try in local demo'} <Icon name="arrow" size={17} /></button>
        {game.adult && <button className="button outline" onClick={consent}>After Dark settings</button>}
      </div>
      {!room && <p className="game-aside">Explore all {games.length} offerings in the catalog. The demo shares one device.</p>}
    </>}
  </Dialog>;
}
