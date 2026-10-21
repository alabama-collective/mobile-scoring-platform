import React, { useEffect, useState } from 'react';
import { BoothDetails, Competition, Round, RoundStatus } from '../types';
import { storageService } from '../services/storageService';
import { boothDetails, boothInUseMessage, boothUsage } from '../services/booths';
import { Play, Copy, CheckCircle2, Lock, Tag, Pencil } from 'lucide-react';

interface RoundManagerProps {
  rounds: Round[];
  activeRoundId: string;
  onSelectRound: (roundId: string) => void;
  onUpdateRoundStatus: (roundId: string, status: RoundStatus) => void;
  onCloneRound1ToRound2: () => void;
  onUpdateBoothCategories?: (roundId: string, categories: string[]) => void;
  // MSP-47: renaming a booth also moves its judges and teams to the new name.
  onRenameBooth?: (from: string, to: string) => void;
  onBoothDetails?: (booth: string, details: BoothDetails) => void;
  competition?: Competition;
}

// A booth's category and location. Saved when the field loses focus.
const BoothDetailInputs: React.FC<{ booth: string; details: BoothDetails; onSave: (d: BoothDetails) => void }> = ({
  booth,
  details,
  onSave,
}) => {
  const [category, setCategory] = useState(details.category ?? '');
  const [location, setLocation] = useState(details.location ?? '');
  useEffect(() => {
    setCategory(details.category ?? '');
    setLocation(details.location ?? '');
  }, [details.category, details.location]);
  const save = () => {
    const next = { category: category.trim() || undefined, location: location.trim() || undefined };
    if (next.category !== details.category || next.location !== details.location) onSave(next);
  };
  const cls =
    'bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-2 py-1 text-xs text-tac-stone-200 focus:outline-none focus:border-tac-gold-700';
  return (
    <>
      <input
        aria-label={`Category for ${booth}`}
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onBlur={save}
        className={`${cls} w-44`}
      />
      <input
        aria-label={`Location for ${booth}`}
        placeholder="Location, e.g. Level 2, Bay 14"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        onBlur={save}
        className={`${cls} w-52`}
      />
    </>
  );
};

export const RoundManager: React.FC<RoundManagerProps> = ({
  rounds,
  activeRoundId,
  onSelectRound,
  onUpdateRoundStatus,
  onCloneRound1ToRound2,
  onUpdateBoothCategories,
  onRenameBooth,
  onBoothDetails,
  competition,
}) => {
  const activeRound = rounds.find((r) => r.id === activeRoundId) || rounds[0];
  // MSP-57: whether anyone has scored this round yet
  const hasScores = !!activeRound && storageService.roundHasScores(activeRound.id);
  const { round1, round2 } = storageService.findRound1And2(rounds);
  // MSP-33: a Round 2 that has been opened is never overwritten.
  const round2Locked = !!round2 && (round2.status !== 'draft' || round2.isLocked);

  const handleCopyRound1 = () => {
    if (round2 && round2Locked) return;
    if (
      round2 &&
      !window.confirm(
        `Replace "${round2.name}" with a copy of "${round1?.name}"? Round 2's current criteria will be replaced. Round 1 does not change.`
      )
    )
      return;
    onCloneRound1ToRound2();
  };

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [boothMessage, setBoothMessage] = useState('');
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);

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
    const name = newCategoryInput.trim();
    if (!name || !activeRound.boothCategories || !onUpdateBoothCategories) return;
    if (activeRound.boothCategories.some((b) => b.toLowerCase() === name.toLowerCase())) {
      setBoothMessage(`There is already a booth called ${name}.`);
      return;
    }
    onUpdateBoothCategories(activeRound.id, [...activeRound.boothCategories, name]);
    setNewCategoryInput('');
    setBoothMessage('');
  };

  // MSP-47: a booth that still has judges or teams is kept, and staff see who.
  const handleRemoveCategory = (cat: string) => {
    if (!activeRound.boothCategories || !onUpdateBoothCategories) return;
    const inUse = competition ? boothInUseMessage(cat, boothUsage(competition, cat)) : null;
    if (inUse) {
      setBoothMessage(inUse);
      return;
    }
    onUpdateBoothCategories(activeRound.id, activeRound.boothCategories.filter((c) => c !== cat));
    setBoothMessage('');
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renaming || !onRenameBooth || !activeRound.boothCategories) return;
    const to = renaming.to.trim();
    if (!to || to === renaming.from) {
      setRenaming(null);
      return;
    }
    if (activeRound.boothCategories.some((b) => b !== renaming.from && b.toLowerCase() === to.toLowerCase())) {
      setBoothMessage(`There is already a booth called ${to}.`);
      return;
    }
    onRenameBooth(renaming.from, to);
    setRenaming(null);
    setBoothMessage('');
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
            Manage stage progression, booths, and live scoring windows.
          </p>
        </div>

        {/* Round 1 -> Round 2 Cloner (MSP-33) */}
        {round1 && round1 !== round2 && (
          <div className="flex flex-col items-start sm:items-end gap-1">
          <button
            onClick={handleCopyRound1}
            disabled={round2Locked}
            className="flex items-center space-x-2 px-3.5 py-2 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-semibold text-xs rounded-xs shadow-tac-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title={round2 ? 'Replace Round 2 with an independent copy of Round 1' : 'Create Round 2 as an independent copy of Round 1'}
          >
            <Copy className="w-4 h-4 text-tac-gold-300" />
            <span>{round2 ? 'Replace Round 2 with a copy of Round 1' : 'Create Round 2 from Round 1'}</span>
          </button>
          {round2Locked && (
            <span className="text-[11px] text-tac-stone-400">Round 2 has been opened, so it cannot be replaced.</span>
          )}
          </div>
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
                {/* MSP-57 */}
                {!hasScores && ' No scores yet, so Set Draft unlocks the rubric again if the round was opened by mistake.'}
              </span>
            </div>
          )}
          {activeRound.status !== 'live' && activeRound.isLocked && hasScores && (
            <div className="text-xs bg-tac-ink-950 border border-tac-ink-700 text-tac-stone-300 p-2.5 rounded-xs flex items-center space-x-2">
              <Lock className="w-4 h-4 text-tac-stone-400 shrink-0" />
              <span>Scores have been saved for this round, so its rubric stays locked.</span>
            </div>
          )}

          {/* Booth Categories if Round 1 (Morning Pitch Booths) */}
          {activeRound.roundType === 'booth' && activeRound.boothCategories && (
            <div className="pt-3 border-t border-tac-ink-800">
              <div className="flex items-center space-x-1.5 text-xs text-tac-gold-400 font-semibold mb-2">
                <Tag className="w-3.5 h-3.5 text-tac-gold-500" />
                <span>Booths (Round 1):</span>
              </div>
              <div className="space-y-2">
                {activeRound.boothCategories.map((category) => (
                  <div key={category} className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[9rem]">
                    {renaming?.from === category ? (
                      <form key={category} onSubmit={handleRename} className="inline-flex items-center space-x-1">
                        <input
                          autoFocus
                          aria-label={`New name for ${category}`}
                          value={renaming.to}
                          onChange={(e) => setRenaming({ from: category, to: e.target.value })}
                          className="bg-tac-ink-950 border border-tac-gold-700 rounded-xs px-2 py-0.5 text-xs text-tac-stone-200 focus:outline-none w-40"
                        />
                        <button type="submit" className="px-2 py-0.5 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-semibold text-xs rounded-xs">
                          Save
                        </button>
                        <button type="button" onClick={() => setRenaming(null)} className="px-1 text-xs text-tac-stone-400 hover:text-white">
                          Cancel
                        </button>
                      </form>
                    ) : (
                    <span
                      key={category}
                      className="inline-flex items-center space-x-1.5 bg-tac-ink-950 border border-tac-ink-700 text-tac-stone-200 text-xs px-2.5 py-1 rounded-xs"
                    >
                      <span>{category}</span>
                      {activeRound.status !== 'live' && onRenameBooth && (
                        <button
                          onClick={() => setRenaming({ from: category, to: category })}
                          className="text-tac-stone-500 hover:text-tac-gold-400 ml-1"
                          title={`Rename ${category}`}
                          aria-label={`Rename ${category}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {activeRound.status !== 'live' && onUpdateBoothCategories && (
                        <button
                          onClick={() => handleRemoveCategory(category)}
                          className="text-tac-stone-500 hover:text-red-400 ml-1"
                          title={`Remove ${category}`}
                          aria-label={`Remove ${category}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                    )}
                    </div>
                    {/* Steph, Oct 20: category and location are separate fields */}
                    {onBoothDetails && competition && (
                      <BoothDetailInputs
                        booth={category}
                        details={boothDetails(competition, category)}
                        onSave={(d) => onBoothDetails(category, d)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center mt-2">

                {activeRound.status !== 'live' && onUpdateBoothCategories && (
                  <form onSubmit={handleAddCategory} className="inline-flex items-center space-x-1">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      placeholder="+ Add booth"
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
              {boothMessage && (
                <p role="status" className="mt-2 text-xs text-amber-300">
                  {boothMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
