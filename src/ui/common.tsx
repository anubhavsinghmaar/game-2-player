import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon.tsx';

export function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="dialog" aria-labelledby="dialog-title"
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="dialog-content">
      <button className="icon-button close" type="button" aria-label="Close dialog" onClick={close}><Icon name="close" /></button>
      <h2 id="dialog-title">{title}</h2>
      {children}
    </div>
  </dialog>;
}

export function usePreference<T>(key: string, initial: T) {
  const [value, set] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(`jua:${key}`) ?? 'null') ?? initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(`jua:${key}`, JSON.stringify(value)); } catch { /* Storage is optional. */ } }, [key, value]);
  return [value, set] as const;
}

let audio: AudioContext | undefined;
export function tone(enabled: boolean, frequency = 440) {
  if (!enabled) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.25, audio.currentTime + 0.13);
    gain.gain.setValueAtTime(0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.19);
  } catch { /* Audio is enhancement only. */ }
}
