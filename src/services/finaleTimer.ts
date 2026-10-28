import { useEffect, useState, useSyncExternalStore } from 'react';

// Steph's story F (Oct 14, fixed at 3 minutes on Oct 16): a finale timer that
// only staff control (Start, Stop, Reset). Every finale judge's screen shows
// it within a second or two. At zero judges see "Time is up." and can still
// submit. Round 1 has no timer.
//
// With the shared database the timer is one small field on the competition
// record, which judges' phones already listen to. Without it (tests, or no
// Firebase settings) it is shared between tabs of one browser.

export const FINALE_TIMER_MS = 3 * 60 * 1000;

export interface FinaleTimer {
  status: 'idle' | 'running' | 'stopped';
  remainingMs: number; // when running: what was left at startedAtMs
  startedAtMs?: number;
}

const IDLE: FinaleTimer = { status: 'idle', remainingMs: FINALE_TIMER_MS };
const LOCAL_KEY = 'tac_finale_timer_v1';

let timer: FinaleTimer = IDLE;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Set by the shared database layer (services/cloud.ts) for staff devices.
let sender: ((t: FinaleTimer) => void) | null = null;
export const setFinaleTimerSender = (fn: ((t: FinaleTimer) => void) | null) => {
  sender = fn;
};

// A timer state that came from the database, or from another tab.
export const applyFinaleTimer = (t: FinaleTimer | null | undefined) => {
  timer = t && t.status ? t : IDLE;
  notify();
};

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    if (saved) timer = JSON.parse(saved);
  } catch {
    /* no saved timer */
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== LOCAL_KEY) return;
    try {
      applyFinaleTimer(e.newValue ? JSON.parse(e.newValue) : IDLE);
    } catch {
      applyFinaleTimer(IDLE);
    }
  });
}

const commit = (t: FinaleTimer) => {
  timer = t;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(t));
  } catch {
    /* storage blocked: this tab still shows it */
  }
  sender?.(t);
  notify();
};

export const remainingAt = (t: FinaleTimer, now: number): number =>
  t.status === 'running' && t.startedAtMs !== undefined
    ? Math.max(0, t.remainingMs - (now - t.startedAtMs))
    : t.remainingMs;

export const getFinaleTimer = () => timer;

// Staff controls
export const startFinaleTimer = () => {
  if (timer.status === 'running') return;
  const from = timer.status === 'stopped' && timer.remainingMs > 0 ? timer.remainingMs : FINALE_TIMER_MS;
  commit({ status: 'running', remainingMs: from, startedAtMs: Date.now() });
};
export const stopFinaleTimer = () => {
  if (timer.status !== 'running') return;
  commit({ status: 'stopped', remainingMs: remainingAt(timer, Date.now()) });
};
export const resetFinaleTimer = () => commit(IDLE);

export const formatClock = (ms: number): string => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// The timer as a screen sees it, ticking while it runs.
export const useFinaleTimer = () => {
  const t = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => timer
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (t.status !== 'running') return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [t]);
  const remainingMs = remainingAt(t, now);
  return { status: t.status, remainingMs, timeUp: t.status !== 'idle' && remainingMs <= 0 };
};
