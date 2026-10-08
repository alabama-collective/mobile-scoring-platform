import React from 'react';
import { ScoringScaleAnchor } from '../types';
import { bandForScore } from '../services/scoringBands';

interface JudgeBandStripProps {
  bands: ScoringScaleAnchor[] | undefined;
  score: number;
}

// MSP-12: the round's point definitions inline on the scoring screen. Every
// band's meaning is always visible (no tapping), and the band the current
// score falls in is highlighted.
export const JudgeBandStrip: React.FC<JudgeBandStripProps> = ({ bands, score }) => {
  if (!bands || bands.length === 0) return null;

  const scoreBand = score > 0 ? bandForScore(bands, score) : undefined;

  return (
    <ul aria-label="Point definitions" className="grid grid-cols-[auto_1fr] gap-y-0.5 text-[11px] leading-snug pt-0.5">
      {bands.map((band, i) => {
        const isScoreBand = band === scoreBand;
        return (
          <li
            key={`${band.range}-${i}`}
            aria-current={isScoreBand ? 'true' : undefined}
            className={`col-span-2 grid grid-cols-subgrid gap-x-2 items-baseline px-2 py-1 rounded-xs border transition-colors ${
              isScoreBand
                ? 'bg-tac-gold-950/80 border-tac-gold-700 text-tac-gold-300'
                : 'border-transparent text-tac-stone-400'
            }`}
          >
            <span className={`font-bold whitespace-nowrap ${isScoreBand ? 'text-tac-gold-300' : 'text-tac-stone-300'}`}>
              {band.range} {band.label}
            </span>
            <span>{band.description || 'No meaning written yet'}</span>
          </li>
        );
      })}
    </ul>
  );
};
