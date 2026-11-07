import { useEffect, useState } from 'react';
import type { RoomClient } from '../room/client.ts';
import { humanError } from '../room/client.ts';
import type { GuestPairing, HostPairing } from '../room/direct.ts';
import { Dialog } from './common.tsx';
import { Icon } from './Icon.tsx';

export function Pairing({ pairing, cancel, enter }: {
  pairing: HostPairing | GuestPairing; cancel: () => void; enter: (client: RoomClient) => void;
}) {
  const host = 'invite' in pairing;
  const shareValue = host ? `${location.origin}/#invite=${pairing.invite}` : pairing.reply;
  const [status, setStatus] = useState('waiting');
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => pairing.watch(setStatus), [pairing]);
  useEffect(() => { if (status === 'connected') enter(pairing.client); }, [status, pairing, enter]);

  async function copy() {
    try { await navigator.clipboard.writeText(shareValue); setCopied(true); }
    catch { setError('Select the text below to copy it manually.'); }
  }
  async function share() {
    if (!navigator.share) { await copy(); return; }
    try {
      await navigator.share(host ? { title: 'Join me at Just Us Arcade', url: shareValue } : { text: shareValue });
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') await copy();
    }
  }

  return <Dialog title={host ? 'Invite your partner' : 'Send your reply'} close={cancel}>
    <ol className="pair-steps">
      <li><span className="step-number">1</span><div><strong>{host ? 'Send this invitation' : 'Copy your reply code'}</strong>
        <p>{host ? 'Share the link in your usual chat. Keep this tab open.' : 'Send the reply to your partner in the same chat as the invite.'}</p>
        <div className="button-row"><button className="button primary" onClick={() => { void copy(); }}>
          <Icon name={copied ? 'check' : 'copy'} size={18} /> {copied ? 'Copied' : host ? 'Copy invite link' : 'Copy reply code'}</button>
          {typeof navigator.share === 'function' && <button className="button outline" onClick={() => { void share(); }}><Icon name="share" size={18} /> Share</button>}</div>
        <label className="field pairing-code">{host ? 'Invite link' : 'Reply code'}<textarea aria-label={host ? 'Invite link' : 'Reply code'} readOnly rows={2} value={shareValue} onFocus={(event) => event.currentTarget.select()} /></label>
      </div></li>
      <li><span className="step-number">2</span><div><strong>{host ? 'Paste their reply' : 'Keep this tab open'}</strong>
        {host ? <form className="entry-form" onSubmit={(event) => {
          event.preventDefault();
          setError('');
          setSubmitting(true);
          void pairing.accept(reply).catch((reason: unknown) => { setError(humanError(reason)); setSubmitting(false); });
        }}><label className="field"><span className="sr-only">Partner’s reply code</span>
            <textarea rows={2} value={reply} placeholder="Paste your partner’s reply code" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={(event) => setReply(event.target.value)} /></label>
          <button className="button outline" disabled={!reply.trim() || submitting || status === 'failed'}>{submitting ? 'Connecting…' : 'Connect room'} <Icon name="link" size={17} /></button>
        </form> : <p>You’ll both enter the room when your partner pastes your reply.</p>}
      </div></li>
    </ol>
    {status === 'failed' ? <p className="error" role="alert">These networks couldn’t open a direct connection. Start again on another Wi-Fi or mobile data connection.</p>
      : <p className="pair-status" role="status"><span className="status-dot" />{submitting || status === 'connecting' ? 'Connecting your devices…' : 'Waiting for your partner'}</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </Dialog>;
}
