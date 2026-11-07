import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  flower: <><path d="M12 8c-2-5-7-3-5 1-5-1-6 5-1 6-2 4 3 6 6 2 3 4 8 2 6-2 5-1 4-7-1-6 2-4-3-6-5-1Z"/><circle cx="12" cy="12.5" r="2"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  share: <><path d="M12 15V3m-4 4 4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></>,
  circle: <circle cx="12" cy="12" r="5"/>,
  down: <path d="M12 4v15m-5-5 5 5 5-5"/>,
  swap: <path d="M3 8h17m-4-4 4 4-4 4m5 4H4m4-4-4 4 4 4"/>,
  settings: <><path d="M4 7h16M4 12h16M4 17h16"/><path d="M8 5v4m7 1v4m-5 1v4"/></>,
  external: <path d="M14 4h6v6m0-6-9 9m-2-7H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/>,
  ticket: <><path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Z"/><path d="m12 14-2-1.9c-1.4-1.5.5-3.4 2-1.8 1.5-1.6 3.4.3 2 1.8Z"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8 2 2-2 2 1 1-2 2-1-1-2 2"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>, back: <path d="M20 12H5m6-6-6 6 6 6"/>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  shuffle: <path d="M3 6h3c5 0 7 12 12 12h3m-3-3 3 3-3 3M3 18h3c1.9 0 3.3-1.6 4.5-3.6m3-4.8C14.7 7.6 16.1 6 18 6h3m-3-3 3 3-3 3"/>,
  heart: <path d="M20.5 8.5c0 4.4-8.5 9.5-8.5 9.5s-8.5-5.1-8.5-9.5a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z"/>,
  moon: <path d="M21 15A9 9 0 0 1 9 3a9 9 0 1 0 12 12Z"/>,
  sparkle: <><path d="M12 3c.8 5.3 3.7 8.2 9 9-5.3.8-8.2 3.7-9 9-.8-5.3-3.7-8.2-9-9 5.3-.8 8.2-3.7 9-9Z"/><path d="M20 3v4m-2-2h4"/></>,
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>,
  controller: <><path d="M7 7h10c2.5 0 3 2 4 6l1 4c.5 2-2 3-3 2l-4-4H9l-4 4c-1 1-3.5 0-3-2l1-4c1-4 1.5-6 4-6Z"/><path d="M7 9v4m-2-2h4m6 0h.01m3 2h.01"/></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/></>,
  pencil: <><path d="m5 16 10-10 4 4-10 10H5Zm8-8 4 4"/><path d="m15 6 2-2c1-1 2-.5 3.5 1s2 2.5 1 3.5l-2.5 2.5"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></>,
  sound: <><path d="M3 9h4l5-4v14l-5-4H3Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  mute: <><path d="M3 9h4l5-4v14l-5-4H3Z"/><path d="m16 10 5 5m0-5-5 5"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v2"/></>,
  check: <path d="m5 12 4 4L19 6"/>, link: <><path d="M9 14l6-6m-8 2-2 2a4 4 0 1 0 6 6l2-2m-2-8 2-2a4 4 0 1 1 6 6l-2 2"/></>,
  trophy: <><path d="M8 4h8v7a4 4 0 0 1-8 0Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v5m-4 0h8"/></>,
};

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.sparkle}</svg>;
}
