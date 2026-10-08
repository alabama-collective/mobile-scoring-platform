import React, { useLayoutEffect, useRef, useState } from 'react';
import { Criterion, Rubric, Round } from '../types';
import { Plus, Trash2, Lock, ShieldAlert, Sliders, Info, HelpCircle } from 'lucide-react';

// Grows a textarea to fit its text so nothing is hidden, whatever the
// font size, zoom level or window width.
const useFitToContent = (value: string) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const border = el.offsetHeight - el.clientHeight;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight + border}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [value]);

  return ref;
};

// Single-line-style title field that wraps long titles instead of clipping them.
const CriterionTitleInput: React.FC<{
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}> = ({ value, disabled, onChange }) => {
  const ref = useFitToContent(value);

  return (
    <textarea
      ref={ref}
      rows={1}
      disabled={disabled}
      value={value}
      // Titles are one line of text; strip newlines from typing or pasting
      onChange={(e) => onChange(e.target.value.replace(/[\r\n]+/g, ' '))}
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      className="flex-1 min-w-0 resize-none overflow-hidden leading-snug font-display font-semibold text-sm sm:text-base text-tac-stone-100 bg-transparent border-b border-transparent hover:border-tac-ink-600 focus:border-tac-gold-700 focus:outline-none transition-colors px-1"
      placeholder="Criterion title"
    />
  );
};

// Judge guidance ("What You're Listening For") box that always shows all of its text.
const GuidanceInput: React.FC<{
  value: string;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ value, disabled, placeholder, onChange }) => {
  const ref = useFitToContent(value);

  return (
    <textarea
      ref={ref}
      rows={2}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none overflow-hidden text-xs leading-relaxed text-tac-stone-300 bg-tac-ink-950/60 border border-tac-ink-700 rounded-xs p-2 focus:border-tac-gold-700 focus:outline-none transition-colors"
      placeholder={placeholder}
    />
  );
};

interface RubricBuilderProps {
  round: Round;
  onUpdateRubric: (rubric: Rubric) => void;
}

export const RubricBuilder: React.FC<RubricBuilderProps> = ({ round, onUpdateRubric }) => {
  const isLocked = round.isLocked || round.status === 'live';
  const rubric = round.rubric;

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMaxPoints, setNewMaxPoints] = useState<number>(10);
  const [showAddForm, setShowAddForm] = useState(false);

  const totalPoints = rubric.criteria.reduce((acc, c) => acc + (Number(c.maxPoints) || 0), 0);

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newCriterion: Criterion = {
      id: `crit-${Date.now()}`,
      title: newTitle.trim(),
      description: newDescription.trim() || "Evaluate pitch clarity and delivery quality.",
      maxPoints: Number(newMaxPoints) > 0 ? Number(newMaxPoints) : 10,
    };

    onUpdateRubric({
      ...rubric,
      criteria: [...rubric.criteria, newCriterion],
    });

    setNewTitle('');
    setNewDescription('');
    setNewMaxPoints(10);
    setShowAddForm(false);
  };

  const handleUpdateCriterion = (id: string, updates: Partial<Criterion>) => {
    if (isLocked) return;
    const updated = rubric.criteria.map((c) => (c.id === id ? { ...c, ...updates } : c));
    onUpdateRubric({ ...rubric, criteria: updated });
  };

  const handleDeleteCriterion = (id: string) => {
    if (isLocked) return;
    const updated = rubric.criteria.filter((c) => c.id !== id);
    onUpdateRubric({ ...rubric, criteria: updated });
  };

  return (
    <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-6 space-y-6">
      {/* Rubric Header & Lock Indicator (MSP-32) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-tac-ink-700">
        <div>
          <div className="flex items-center space-x-3">
            <h3 className="font-display font-bold text-lg text-tac-stone-100 tracking-wide uppercase">
              {rubric.name}
            </h3>
            {isLocked ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xs text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800/80">
                <Lock className="w-3.5 h-3.5" />
                <span>Live — Locked (Read Only)</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xs text-xs font-medium bg-tac-ink-700 text-tac-stone-300 border border-tac-ink-600">
                <span>Editable Draft</span>
              </span>
            )}
          </div>
          <p className="text-xs text-tac-stone-400 mt-1">
            Configure evaluation categories, inline listening prompts, and point scales for judges.
          </p>
        </div>

        {/* Total Points Badge */}
        <div className="flex items-center space-x-3">
          <div className="bg-tac-ink-900 border border-tac-gold-700/50 px-4 py-2 rounded-xs text-right">
            <span className="text-[10px] uppercase tracking-wider text-tac-gold-400 block font-semibold">
              Total Points Available
            </span>
            <span className="font-display font-black text-xl text-tac-gold-500">
              {totalPoints} pts
            </span>
          </div>
        </div>
      </div>

      {/* Lock Notice banner if locked */}
      {isLocked && (
        <div className="p-3 bg-red-950/40 border-l-4 border-red-600 rounded-xs text-red-200 text-xs flex items-start space-x-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>
            <strong>Rubric is permanently locked:</strong> This round is currently active or live.
            Criteria and point definitions cannot be altered while judges are actively scoring (MSP-32).
          </span>
        </div>
      )}

      {/* Criteria List */}
      <div className="space-y-4">
        {rubric.criteria.length === 0 ? (
          <div className="text-center py-8 text-tac-stone-500 text-sm border border-dashed border-tac-ink-600 rounded-sm">
            No criteria configured for this round. Add your first criterion below.
          </div>
        ) : (
          rubric.criteria.map((criterion, index) => (
            <div
              key={criterion.id}
              className="bg-tac-ink-900/90 rounded-sm border border-tac-ink-700/80 hover:border-tac-gold-700/50 p-4 transition-all duration-150"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start space-x-2 flex-1 min-w-0">
                  <span className="w-6 h-6 shrink-0 rounded-xs bg-tac-ink-800 text-tac-gold-400 font-mono text-xs flex items-center justify-center font-bold">
                    0{index + 1}
                  </span>
                  <CriterionTitleInput
                    disabled={isLocked}
                    value={criterion.title}
                    onChange={(title) => handleUpdateCriterion(criterion.id, { title })}
                  />
                </div>

                {/* Point Range Control supporting > 10 points (MSP-10) */}
                <div className="flex items-center space-x-2 shrink-0">
                  <div className="flex items-center space-x-1.5 bg-tac-ink-800 px-2.5 py-1 rounded-xs border border-tac-ink-700">
                    <Sliders className="w-3.5 h-3.5 text-tac-gold-500" />
                    <label className="text-xs text-tac-stone-400">Max:</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      disabled={isLocked}
                      value={criterion.maxPoints}
                      onChange={(e) =>
                        handleUpdateCriterion(criterion.id, {
                          maxPoints: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                      className="w-14 bg-tac-ink-900 border border-tac-ink-600 text-tac-gold-400 text-center text-xs font-bold py-0.5 rounded-xs focus:border-tac-gold-700 focus:outline-none"
                    />
                    <span className="text-xs text-tac-stone-400">pts</span>
                  </div>

                  {!isLocked && (
                    <button
                      onClick={() => handleDeleteCriterion(criterion.id)}
                      className="p-1.5 text-tac-stone-500 hover:text-red-400 hover:bg-tac-ink-800 rounded-xs transition-colors"
                      title="Delete criterion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Rubric Guidance ("What You're Listening For" - MSP-12) */}
              <div className="mt-3 pt-3 border-t border-tac-ink-800">
                <div className="flex items-center space-x-1.5 text-xs text-tac-gold-400/90 font-medium mb-1">
                  <Info className="w-3.5 h-3.5 text-tac-gold-500" />
                  <span>Inline Guidance ("What You're Listening For"):</span>
                </div>
                <GuidanceInput
                  disabled={isLocked}
                  value={criterion.description}
                  onChange={(description) => handleUpdateCriterion(criterion.id, { description })}
                  placeholder="Guidance for judges on what to listen for and evaluate..."
                />
              </div>

              {/* Anchor guide preview if present */}
              {criterion.scaleAnchors && criterion.scaleAnchors.length > 0 && (
                <div className="mt-2 text-[11px] text-tac-stone-400 bg-tac-ink-950/40 p-2 rounded-xs border border-tac-ink-800">
                  <span className="font-semibold text-tac-stone-300 flex items-center space-x-1 mb-1">
                    <HelpCircle className="w-3 h-3 text-tac-gold-500" />
                    <span>Official Scoring Anchor Scale:</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[10px]">
                    {criterion.scaleAnchors.map((anchor) => (
                      <div key={anchor.range} className="bg-tac-ink-900/80 p-1.5 rounded-xs border border-tac-ink-800">
                        <span className="font-bold text-tac-gold-400">{anchor.range} ({anchor.label}):</span>{' '}
                        <span className="text-tac-stone-400">{anchor.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add New Criterion Button / Form */}
      {!isLocked && (
        <div className="pt-2">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2.5 border border-dashed border-tac-gold-700/60 hover:border-tac-gold-500 bg-tac-ink-900/60 hover:bg-tac-ink-900 text-tac-gold-400 text-xs font-semibold uppercase tracking-wider rounded-xs w-full justify-center transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Scoring Criterion</span>
            </button>
          ) : (
            <form onSubmit={handleAddCriterion} className="bg-tac-ink-900 p-4 rounded-sm border border-tac-gold-700/40 space-y-3">
              <h4 className="font-display font-semibold text-xs text-tac-gold-400 uppercase tracking-wide">
                New Scoring Criterion
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="text-[11px] text-tac-stone-400 uppercase tracking-wider block mb-1">
                    Criterion Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Technology Differentiation & IP"
                    className="w-full bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-3 py-1.5 text-xs text-tac-stone-100 focus:border-tac-gold-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-tac-stone-400 uppercase tracking-wider block mb-1">
                    Max Points (&gt;10 Supported)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newMaxPoints}
                    onChange={(e) => setNewMaxPoints(parseInt(e.target.value) || 10)}
                    className="w-full bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-3 py-1.5 text-xs text-tac-gold-400 font-bold focus:border-tac-gold-700 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-tac-stone-400 uppercase tracking-wider block mb-1">
                  Inline Guidance ("What You're Listening For")
                </label>
                <GuidanceInput
                  value={newDescription}
                  onChange={setNewDescription}
                  placeholder="Explain what judges should evaluate (e.g. Can this idea realistically work and scale over time?)"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-tac-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-semibold text-xs rounded-xs shadow-tac-sm transition-colors"
                >
                  Save Criterion
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
