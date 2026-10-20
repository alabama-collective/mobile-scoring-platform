import React from 'react';
import { Clock, UserCheck } from 'lucide-react';
import type { Competition, Judge, Round } from '../types';

const BRAND = `${import.meta.env.BASE_URL}brand/`;

// MSP-46: the judge's own header. No staff tabs. Same height as the staff
// header (4px gold bar + h-16 / sm:h-20 + 1px border), because the judge
// screen's sticky team banner sits directly under it.
export const JudgeHeader: React.FC<{ judge?: Judge; onNotYou?: () => void }> = ({ judge, onNotYou }) => (
  <header className="bg-tac-ink-900 border-b border-tac-ink-700 sticky top-0 z-50 shadow-tac-md">
    <div className="h-1 bg-gradient-to-r from-tac-gold-500 via-tac-gold-800 to-tac-gold-600 w-full" />
    <div className="max-w-xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
      <img src={`${BRAND}tac-submark.png`} alt="The Alabama Collective" className="h-9 w-9 shrink-0" />
      {judge ? (
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck className="w-4 h-4 text-tac-gold-500 shrink-0" />
          <span className="text-sm font-semibold text-white truncate">{judge.name}</span>
          {onNotYou && (
            <button onClick={onNotYou} className="text-xs text-tac-gold-400 underline underline-offset-2 shrink-0">
              Not you?
            </button>
          )}
        </div>
      ) : (
        <span className="text-sm font-semibold text-tac-stone-300">Judge scoring</span>
      )}
    </div>
  </header>
);

// Shown when no round is live: judges never see a draft or closed form.
export const JudgingNotStarted: React.FC<{ competition: Competition }> = ({ competition }) => {
  const anyClosed = competition.rounds.some((r) => r.status === 'completed');
  return (
    <div className="max-w-xl mx-auto bg-tac-ink-800 border border-tac-ink-700 rounded-sm p-6 text-center space-y-3">
      <Clock className="w-8 h-8 text-tac-gold-500 mx-auto" />
      <h2 className="font-display font-bold text-lg text-white">
        {anyClosed ? 'No round is open for scoring right now' : 'Judging has not started yet'}
      </h2>
      <p className="text-sm text-tac-stone-300">
        This screen changes by itself as soon as staff open the next round. You can leave it open.
      </p>
      <p className="text-xs text-tac-stone-500">{competition.name}</p>
    </div>
  );
};

// More than one round live at once: the judge picks which one.
export const RoundPicker: React.FC<{ rounds: Round[]; onPick: (id: string) => void }> = ({ rounds, onPick }) => (
  <div className="max-w-xl mx-auto bg-tac-ink-800 border border-tac-ink-700 rounded-sm p-5 space-y-3">
    <h2 className="font-display font-bold text-lg text-white">Which round are you judging?</h2>
    {rounds.map((r) => (
      <button
        key={r.id}
        onClick={() => onPick(r.id)}
        className="w-full text-left px-4 py-3 bg-tac-ink-900 hover:bg-tac-ink-700 border border-tac-ink-600 rounded-sm text-sm font-semibold text-white"
      >
        {r.name}
      </button>
    ))}
  </div>
);

// The judge picks their own name once. The phone remembers it.
export const JudgeNamePicker: React.FC<{ judges: Judge[]; onPick: (id: string) => void }> = ({ judges, onPick }) => {
  const groups = new Map<string, Judge[]>();
  judges.forEach((j) => {
    const key = j.boothAssigned || '';
    groups.set(key, [...(groups.get(key) || []), j]);
  });
  return (
    <div className="max-w-xl mx-auto bg-tac-ink-800 border border-tac-ink-700 rounded-sm p-5 space-y-4">
      <div>
        <h2 className="font-display font-bold text-lg text-white">Who are you?</h2>
        <p className="text-sm text-tac-stone-300">Tap your name. Your scores are saved under it.</p>
      </div>
      {[...groups.entries()].map(([booth, list]) => (
        <div key={booth} className="space-y-2">
          {booth && <p className="text-[11px] uppercase tracking-widest text-tac-gold-500 font-bold">{booth}</p>}
          {list.map((j) => (
            <button
              key={j.id}
              onClick={() => onPick(j.id)}
              className="w-full text-left px-4 py-3 bg-tac-ink-900 hover:bg-tac-ink-700 border border-tac-ink-600 rounded-sm text-base font-semibold text-white"
            >
              {j.name}
            </button>
          ))}
        </div>
      ))}
      {judges.length === 0 && <p className="text-sm text-tac-stone-400">No judges have been added yet. Please ask staff.</p>}
    </div>
  );
};
