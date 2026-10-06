import React from 'react';
import { Competition } from '../types';
import { Award, CheckCircle2, ShieldCheck } from 'lucide-react';

interface RegionalBonusPanelProps {
  competition: Competition;
  onSelectWinningRegion: (region: string | undefined) => void;
}

export const RegionalBonusPanel: React.FC<RegionalBonusPanelProps> = ({
  competition,
  onSelectWinningRegion,
}) => {
  const { regions, winningRegion, teams, bonusPointsApplied } = competition;

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onSelectWinningRegion(val === '' ? undefined : val);
  };

  return (
    <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-tac-ink-700">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-tac-gold-500" />
            <h2 className="font-display font-bold text-base sm:text-lg text-tac-stone-100 uppercase tracking-wide">
              Gift Classic Regional Bonus (MSP-35)
            </h2>
          </div>
          <p className="text-xs text-tac-stone-400 mt-1">
            Designate the winning region from Gift Classic. Automatically applies a <strong>+5 bonus point award</strong> to
            Round 1 scores for all competing teams from that region.
          </p>
        </div>

        {bonusPointsApplied && winningRegion && (
          <div className="flex items-center space-x-2 bg-tac-gold-900/40 border border-tac-gold-700 px-3 py-1.5 rounded-xs text-tac-gold-300 text-xs">
            <ShieldCheck className="w-4 h-4 text-tac-gold-500" />
            <span>Bonus Active: <strong>+5 Pts to {winningRegion}</strong></span>
          </div>
        )}
      </div>

      {/* Selector Control */}
      <div className="bg-tac-ink-900 p-4 rounded-sm border border-tac-ink-700 space-y-3">
        <label className="text-xs text-tac-stone-300 font-semibold block">
          Select Gift Classic Winning Region:
        </label>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <select
            value={winningRegion || ''}
            onChange={handleRegionChange}
            className="bg-tac-ink-950 border border-tac-ink-700 text-tac-stone-100 text-xs rounded-xs px-3 py-2 focus:outline-none focus:border-tac-gold-700 flex-1"
          >
            <option value="">-- No Winning Region Designated (0 bonus points) --</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>

          {winningRegion && (
            <button
              onClick={() => onSelectWinningRegion(undefined)}
              className="px-3 py-2 bg-tac-ink-800 hover:bg-tac-ink-700 text-tac-stone-400 hover:text-white text-xs rounded-xs border border-tac-ink-700 transition-colors"
            >
              Clear Bonus
            </button>
          )}
        </div>
      </div>

      {/* Impacted Teams Table (MSP-35) */}
      <div className="space-y-2">
        <h4 className="text-xs font-display font-semibold text-tac-stone-300 uppercase tracking-wide">
          Compromising Teams & Bonus Point Allocation (Round 1)
        </h4>

        <div className="border border-tac-ink-700 rounded-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-tac-ink-900 text-tac-stone-400 uppercase text-[10px] tracking-wider border-b border-tac-ink-700">
              <tr>
                <th className="py-2.5 px-3">Team Name</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3">Booth Category</th>
                <th className="py-2.5 px-3 text-right">Round 1 Bonus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tac-ink-700 bg-tac-ink-900/60">
              {teams.map((team) => {
                const isWinner = winningRegion && team.region.toLowerCase() === winningRegion.toLowerCase();
                return (
                  <tr
                    key={team.id}
                    className={`transition-colors ${
                      isWinner ? 'bg-tac-gold-950/20' : 'hover:bg-tac-ink-900'
                    }`}
                  >
                    <td className="py-2 px-3 font-semibold text-tac-stone-200">
                      {team.name}
                    </td>
                    <td className="py-2 px-3 text-tac-stone-300">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-[11px] ${
                        isWinner
                          ? 'bg-tac-gold-900/60 text-tac-gold-300 font-semibold border border-tac-gold-700/60'
                          : 'bg-tac-ink-800 text-tac-stone-400'
                      }`}>
                        {team.region}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-tac-stone-400">
                      {team.boothCategory}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {isWinner ? (
                        <span className="inline-flex items-center space-x-1 text-tac-gold-400 font-bold bg-tac-gold-950 px-2 py-0.5 rounded-xs border border-tac-gold-800">
                          <CheckCircle2 className="w-3 h-3 text-tac-gold-500" />
                          <span>+5 pts</span>
                        </span>
                      ) : (
                        <span className="text-tac-stone-500 font-mono">0 pts</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
