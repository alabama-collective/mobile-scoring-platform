import React from 'react';
import { Timer, Play, Square, RotateCcw } from 'lucide-react';
import {
  formatClock,
  resetFinaleTimer,
  startFinaleTimer,
  stopFinaleTimer,
  useFinaleTimer,
} from '../services/finaleTimer';

// Story F: the staff controls. Shown only while the finale is live.
export const FinaleTimerPanel: React.FC = () => {
  const { status, remainingMs, timeUp } = useFinaleTimer();
  return (
    <div className="bg-tac-ink-800 rounded-sm border border-tac-gold-700/60 p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Timer className="w-6 h-6 text-tac-gold-500" />
        <div>
          <h3 className="font-display font-bold text-sm text-tac-stone-100 uppercase tracking-wider">Finale timer (3 minutes)</h3>
          <p className="text-xs text-tac-stone-400">Every finale judge sees this countdown. Judges cannot control it.</p>
        </div>
      </div>
      <div
        role="timer"
        aria-label="Finale time left"
        className={`font-display font-black text-4xl tabular-nums ${timeUp ? 'text-red-400' : 'text-tac-gold-400'}`}
      >
        {formatClock(remainingMs)}
      </div>
      <div className="flex gap-2">
        {status === 'running' ? (
          <button
            onClick={stopFinaleTimer}
            className="flex items-center gap-1.5 px-4 py-2 bg-tac-ink-900 hover:bg-tac-ink-700 text-white border border-tac-ink-600 font-bold text-xs rounded-xs"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        ) : (
          <button
            onClick={startFinaleTimer}
            disabled={timeUp}
            className="flex items-center gap-1.5 px-4 py-2 bg-tac-gold-700 hover:bg-tac-gold-600 disabled:opacity-40 text-tac-ink-900 font-bold text-xs rounded-xs"
          >
            <Play className="w-3.5 h-3.5" /> {status === 'stopped' && !timeUp ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          onClick={resetFinaleTimer}
          className="flex items-center gap-1.5 px-4 py-2 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-200 border border-tac-ink-600 font-bold text-xs rounded-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </div>
  );
};

// Story F: what a finale judge sees, under the team name. Display only.
export const JudgeFinaleTimer: React.FC<{ submitted: boolean }> = ({ submitted }) => {
  const { status, remainingMs, timeUp } = useFinaleTimer();
  if (status === 'idle') return null;
  if (timeUp) {
    return (
      <div role="timer" className="mt-1 rounded-xs border border-red-700 bg-red-950/70 px-3 py-1.5 text-sm font-bold text-red-200">
        {submitted ? 'Time is up.' : 'Time is up. Submit your score.'}
      </div>
    );
  }
  return (
    <div
      role="timer"
      className="mt-1 inline-flex items-center gap-2 rounded-xs border border-tac-gold-700/60 bg-tac-ink-900 px-3 py-1 text-sm text-tac-stone-200"
    >
      <Timer className="w-4 h-4 text-tac-gold-500" />
      <span>Time left</span>
      <span className="font-display font-black text-lg tabular-nums text-tac-gold-400">{formatClock(remainingMs)}</span>
      {status === 'stopped' && <span className="text-xs text-tac-stone-400">(paused)</span>}
    </div>
  );
};
