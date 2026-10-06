import React, { useState } from 'react';
import { Round, RoundStatus } from '../types';
import { Play, Copy, CheckCircle2, Lock, Tag } from 'lucide-react';

interface RoundManagerProps {
  rounds: Round[];
  activeRoundId: string;
  onSelectRound: (roundId: string) => void;
  onUpdateRoundStatus: (roundId: string, status: RoundStatus) => void;
  onCloneRound1ToRound2: () => void;
  onUpdateBoothCategories?: (roundId: string, categories: string[]) => void;
}

export const RoundManager: React.FC<RoundManagerProps> = ({
  rounds,
  activeRoundId,
  onSelectRound,
  onUpdateRoundStatus,
  onCloneRound1ToRound2,
  onUpdateBoothCategories,
}) => {
  const activeRound = rounds.find((r) => r.id === activeRoundId) || rounds[0];
  const round1 = rounds.find((r) => r.roundType === 'booth') || rounds[0];
  const hasRound2 = rounds.some((r) => r.roundType === 'finale' && r.id !== round1?.id);

  const [newCategoryInput, setNewCategoryInput] = useState('');

  const handleStatusChange = (status: RoundStatus) => {
    if (!activeRound) return;
    if (status === 'live') {
      const confirmOpen = window.confirm(
        `Are you sure you want to set "${activeRound.name}" to LIVE? This will lock the scoring rubric against further modifications while judges are scoring (MSP-32).`
      );
      if (!confirmOpen) return;
    }
    onUpdateRoundStatus(activeRound.id, status);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryInput.trim() || !activeRound.boothCategories || !onUpdateBoothCategories) return;
    const updated = [...activeRound.boothCategories, newCategoryInput.trim()];
    onUpdateBoothCategories(activeRound.id, updated);
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (cat: string) => {
    if (!activeRound.boothCategories || !onUpdateBoothCategories) return;
    const updated = activeRound.boothCategories.filter((c) => c !== cat);
    onUpdateBoothCategories(activeRound.id, updated);
  };

  return (
    <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-6 space-y-6">
      {/* Round Tabs & Clone Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-tac-ink-700">
        <div>
          <h2 className="font-display font-bold text-base sm:text-lg text-tac-stone-100 uppercase tracking-wide">
            Competition Rounds
          </h2>
          <p className="text-xs text-tac-stone-400 mt-0.5">
            Manage stage progression, pitch booth categories, and live scoring windows.
          </p>
        </div>

        {/* Round 1 -> Round 2 Cloner (MSP-33) */}
        {!hasRound2 && round1 && (
          <button
            onClick={onCloneRound1ToRound2}
            className="flex items-center space-x-2 px-3.5 py-2 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-semibold text-xs rounded-xs shadow-tac-sm transition-all"
            title="Create independent Round 2 duplicate from Round 1"
          >
            <Copy className="w-4 h-4 text-tac-gold-300" />
            <span>Create Round 2 from Round 1 (MSP-33)</span>
          </button>
        )}
      </div>

      {/* Round Selection Tabs */}
      <div className="flex flex-wrap gap-2">
        {rounds.map((round) => {
          const isSelected = round.id === activeRoundId;
          const isLive = round.status === 'live';
          const isCompleted = round.status === 'completed';

          return (
            <button
              key={round.id}
              onClick={() => onSelectRound(round.id)}
              className={`flex items-center space-x-2.5 px-4 py-3 rounded-xs border text-left transition-all ${
                isSelected
                  ? 'bg-tac-ink-900 border-tac-gold-600 text-white shadow-tac-sm ring-1 ring-tac-gold-700/50'
                  : 'bg-tac-ink-900/60 border-tac-ink-700 text-tac-stone-400 hover:text-white hover:bg-tac-ink-900'
              }`}
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-display font-semibold text-xs sm:text-sm">
                    {round.name}
                  </span>
                  {/* Status Badge */}
                  {isLive && (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-green-950 text-green-400 border border-green-700 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      <span>LIVE</span>
                    </span>
                  )}
                  {isCompleted && (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-tac-ink-700 text-tac-stone-400 border border-tac-ink-600">
                      <CheckCircle2 className="w-3 h-3 text-tac-stone-400" />
                      <span>Closed</span>
                    </span>
                  )}
                  {round.status === 'draft' && (
                    <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-xs text-[10px] font-medium bg-tac-ink-800 text-tac-stone-400 border border-tac-ink-700">
                      Draft
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-tac-stone-400 mt-1 flex items-center space-x-2">
                  <span>{round.rubric.criteria.length} criteria</span>
                  <span>•</span>
                  <span>{round.rubric.criteria.reduce((a, c) => a + c.maxPoints, 0)} pts total</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Round Controls & Status Lifecycle (MSP-32) */}
      {activeRound && (
        <div className="bg-tac-ink-900 p-4 rounded-sm border border-tac-ink-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-tac-gold-400">
                Round Status & Lifecycle Controls
              </span>
              <h4 className="font-display font-bold text-sm text-tac-stone-100">
                {activeRound.name}
              </h4>
            </div>

            {/* Lifecycle Status Buttons (MSP-32) */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleStatusChange('draft')}
                disabled={activeRound.status === 'draft'}
                className={`px-3 py-1.5 rounded-xs text-xs font-semibold transition-colors ${
                  activeRound.status === 'draft'
                    ? 'bg-tac-ink-700 text-white border border-tac-ink-500 cursor-default'
                    : 'bg-tac-ink-800 text-tac-stone-400 hover:text-white border border-tac-ink-700'
                }`}
              >
                Set Draft
              </button>

              <button
                onClick={() => handleStatusChange('live')}
                disabled={activeRound.status === 'live'}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold transition-all ${
                  activeRound.status === 'live'
                    ? 'bg-green-700 text-white shadow-tac-sm cursor-default'
                    : 'bg-tac-ink-800 hover:bg-green-900/60 text-green-400 border border-green-800/80 hover:border-green-600'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open Round (LIVE)</span>
              </button>

              <button
                onClick={() => handleStatusChange('completed')}
                disabled={activeRound.status === 'completed'}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xs text-xs font-semibold transition-colors ${
                  activeRound.status === 'completed'
                    ? 'bg-tac-ink-700 text-tac-stone-300 border border-tac-ink-500 cursor-default'
                    : 'bg-tac-ink-800 text-tac-stone-400 hover:text-white border border-tac-ink-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Close Round</span>
              </button>
            </div>
          </div>

          {/* MSP-32 Rubric Lock status message */}
          {activeRound.status === 'live' && (
            <div className="text-xs bg-green-950/40 border border-green-800 text-green-300 p-2.5 rounded-xs flex items-center space-x-2">
              <Lock className="w-4 h-4 text-green-400 shrink-0" />
              <span>
                <strong>Round is currently LIVE:</strong> Judges can score teams against this rubric.
                The rubric is locked to prevent unfair adjustments during active competition.
              </span>
            </div>
          )}

          {/* Booth Categories if Round 1 (Morning Pitch Booths) */}
          {activeRound.roundType === 'booth' && activeRound.boothCategories && (
            <div className="pt-3 border-t border-tac-ink-800">
              <div className="flex items-center space-x-1.5 text-xs text-tac-gold-400 font-semibold mb-2">
                <Tag className="w-3.5 h-3.5 text-tac-gold-500" />
                <span>Pitch Booth Categories (Morning Round):</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {activeRound.boothCategories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center space-x-1.5 bg-tac-ink-950 border border-tac-ink-700 text-tac-stone-200 text-xs px-2.5 py-1 rounded-xs"
                  >
                    <span>{category}</span>
                    {activeRound.status !== 'live' && onUpdateBoothCategories && (
                      <button
                        onClick={() => handleRemoveCategory(category)}
                        className="text-tac-stone-500 hover:text-red-400 ml-1"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}

                {activeRound.status !== 'live' && onUpdateBoothCategories && (
                  <form onSubmit={handleAddCategory} className="inline-flex items-center space-x-1">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="+ Add category"
                      className="bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-2 py-0.5 text-xs text-tac-stone-200 focus:outline-none focus:border-tac-gold-700 w-32"
                    />
                    <button
                      type="submit"
                      className="px-2 py-0.5 bg-tac-ink-800 hover:bg-tac-ink-700 text-xs text-tac-gold-400 rounded-xs"
                    >
                      Add
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
