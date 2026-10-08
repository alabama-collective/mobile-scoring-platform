import React, { useState } from 'react';
import { ScoringScaleAnchor } from '../types';
import { bandForScore } from '../services/scoringBands';

interface JudgeBandStripProps {
  criterionId: string;
  bands: ScoringScaleAnchor[] | undefined;
  score: number;
}

// MSP-12: the round's point definitions inline on the scoring screen. The band
// the current score falls in is lit; tapping any band shows what it means.
export const JudgeBandStrip: React.FC<JudgeBandStripProps> = ({ criterionId, bands, score }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (!bands || bands.length === 0) return null;

  const scoreBand = score > 0 ? bandForScore(bands, score) : undefined;
  const openBand = openIndex !== null ? bands[openIndex] : undefined;
  const panelId = `band-meaning-${criterionId}`;

  return (
    <div className="space-y-1 pt-0.5">
      <div
        className="grid gap-1 text-[10px]"
        style={{ gridTemplateColumns: `repeat(${bands.length}, minmax(0, 1fr))` }}
      >
        {bands.map((band, i) => {
          const isScoreBand = band === scoreBand;
          const isOpen = openIndex === i;
          return (
            <button
              type="button"
              key={`${band.range}-${i}`}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-label={`${band.range} ${band.label}${isScoreBand ? ' (current score)' : ''}: show what this band means`}
              className={`px-0.5 py-1 rounded-xs border text-center leading-tight transition-colors ${
                isScoreBand
                  ? 'bg-tac-gold-950/80 border-tac-gold-700 text-tac-gold-300 font-bold'
                  : 'bg-tac-ink-950/40 border-tac-ink-800 text-tac-stone-400 hover:text-tac-stone-200'
              } ${isOpen ? 'ring-1 ring-tac-gold-500' : ''}`}
            >
              <span className="block">{band.range}</span>
              <span className="block break-words">{band.label}</span>
            </button>
          );
        })}
      </div>

      <p id={panelId} aria-live="polite" className="text-[11px] leading-snug px-0.5 min-h-[1.25rem]">
        {openBand ? (
          <>
            <span className="font-bold text-tac-gold-400">
              {openBand.range} {openBand.label}:
            </span>{' '}
            <span className="text-tac-stone-200">{openBand.description || 'No meaning written for this band yet.'}</span>
          </>
        ) : (
          <span className="text-tac-stone-500">Tap a band to see what it means.</span>
        )}
      </p>
    </div>
  );
};
