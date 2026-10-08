import React from 'react';
import { ScoringScaleAnchor } from '../types';
import { HelpCircle, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useFitToContent } from './useFitToContent';
import { bandIssues, defaultBands, formatBandRange, splitBandRange } from '../services/scoringBands';

interface PointDefinitionsEditorProps {
  bands: ScoringScaleAnchor[] | undefined;
  maxPoints: number;
  isLocked: boolean;
  criterionTitle: string;
  onChange: (bands: ScoringScaleAnchor[]) => void;
}

const MeaningInput: React.FC<{ value: string; label: string; onChange: (v: string) => void }> = ({
  value,
  label,
  onChange,
}) => {
  const ref = useFitToContent(value);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      placeholder="What a score in this band means"
      className="w-full resize-none overflow-hidden leading-snug bg-tac-ink-950/60 border border-tac-ink-700 rounded-xs px-2 py-1 text-[11px] text-tac-stone-200 focus:border-tac-gold-700 focus:outline-none"
    />
  );
};

const digitsOnly = (v: string) => v.replace(/\D/g, '');

// MSP-12: staff define what each score band means; judges tap a band to read it.
export const PointDefinitionsEditor: React.FC<PointDefinitionsEditorProps> = ({
  bands,
  maxPoints,
  isLocked,
  criterionTitle,
  onChange,
}) => {
  const list = bands ?? [];
  const issues = list.length > 0 ? bandIssues(list, maxPoints) : [];

  const updateBand = (index: number, changes: Partial<ScoringScaleAnchor>) =>
    onChange(list.map((band, i) => (i === index ? { ...band, ...changes } : band)));

  const updateRange = (index: number, side: 'min' | 'max', value: string) => {
    const [lo, hi] = splitBandRange(list[index].range);
    const next = digitsOnly(value);
    updateBand(index, { range: side === 'min' ? formatBandRange(next, hi) : formatBandRange(lo, next) });
  };

  const header = (
    <span className="font-semibold text-tac-stone-300 flex items-center space-x-1">
      <HelpCircle className="w-3 h-3 text-tac-gold-500" />
      <span>Point Definitions (what each score band means):</span>
    </span>
  );

  if (isLocked) {
    if (list.length === 0) return null;
    return (
      <div className="mt-2 text-[11px] text-tac-stone-400 bg-tac-ink-950/40 p-2 rounded-xs border border-tac-ink-800 space-y-1">
        {header}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[10px]">
          {list.map((band, i) => (
            <div key={`${band.range}-${i}`} className="bg-tac-ink-900/80 p-1.5 rounded-xs border border-tac-ink-800">
              <span className="font-bold text-tac-gold-400">
                {band.range} ({band.label}):
              </span>{' '}
              <span className="text-tac-stone-400">{band.description}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => onChange(defaultBands(maxPoints))}
          className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 border border-dashed border-tac-gold-700/60 hover:border-tac-gold-500 text-tac-gold-400 text-[11px] font-semibold uppercase tracking-wider rounded-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Point Definitions</span>
        </button>
        <p className="text-[11px] text-tac-stone-500 mt-1">
          Judges see no point definitions for this criterion yet. This adds five bands split across 1–{maxPoints} that you
          can reword.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 text-[11px] text-tac-stone-400 bg-tac-ink-950/40 p-2 rounded-xs border border-tac-ink-800 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        {header}
        <span className="text-[10px] text-tac-stone-500">Judges tap a band to read its meaning.</span>
      </div>

      <div className="space-y-1.5">
        {list.map((band, i) => {
          const [lo, hi] = splitBandRange(band.range);
          const name = band.label || `band ${i + 1}`;
          return (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_8rem_1fr_auto] gap-1.5 items-start bg-tac-ink-900/80 p-1.5 rounded-xs border border-tac-ink-800"
            >
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={lo}
                  onChange={(e) => updateRange(i, 'min', e.target.value)}
                  aria-label={`${criterionTitle}: lowest score for ${name}`}
                  className="w-9 bg-tac-ink-950/60 border border-tac-ink-700 rounded-xs px-1 py-1 text-center text-[11px] font-bold text-tac-gold-400 focus:border-tac-gold-700 focus:outline-none"
                />
                <span className="text-tac-stone-500">–</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={hi}
                  onChange={(e) => updateRange(i, 'max', e.target.value)}
                  aria-label={`${criterionTitle}: highest score for ${name}`}
                  className="w-9 bg-tac-ink-950/60 border border-tac-ink-700 rounded-xs px-1 py-1 text-center text-[11px] font-bold text-tac-gold-400 focus:border-tac-gold-700 focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={band.label}
                onChange={(e) => updateBand(i, { label: e.target.value })}
                aria-label={`${criterionTitle}: name of band ${lo || '?'}–${hi || '?'}`}
                placeholder="Name, e.g. Strong"
                className="min-w-0 bg-tac-ink-950/60 border border-tac-ink-700 rounded-xs px-2 py-1 text-[11px] font-semibold text-tac-stone-100 focus:border-tac-gold-700 focus:outline-none"
              />
              <div className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto min-w-0">
                <MeaningInput
                  value={band.description}
                  label={`${criterionTitle}: meaning of ${name}`}
                  onChange={(description) => updateBand(i, { description })}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(list.filter((_, j) => j !== i))}
                className="col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto p-1 text-tac-stone-500 hover:text-red-400 rounded-xs transition-colors"
                title={`Remove ${name}`}
                aria-label={`Remove ${name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange([...list, { range: '', label: '', description: '' }])}
        className="flex items-center space-x-1 text-[11px] font-semibold text-tac-gold-400 hover:text-tac-gold-300"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Band</span>
      </button>

      {issues.length > 0 && (
        <div role="status" className="bg-tac-gold-950/60 border border-tac-gold-700/50 rounded-xs p-2 space-y-0.5 text-tac-gold-300">
          {issues.map((issue) => (
            <p key={issue} className="flex items-start space-x-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{issue}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
