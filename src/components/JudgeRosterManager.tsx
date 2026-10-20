import React, { useState } from 'react';
import { Competition, Judge, JudgeRoster } from '../types';
import { storageService } from '../services/storageService';
import { boothList, isFinaleJudge, NO_BOOTH } from '../services/booths';
import { Users, UserPlus, Trash2, Smartphone, Copy, Check } from 'lucide-react';

interface JudgeRosterManagerProps {
  competition: Competition;
  onUpdateCompetition: (comp: Competition) => void;
  onSwitchToJudgeView: () => void;
}

const inputClass =
  'w-full bg-tac-ink-950 border border-tac-ink-700 text-xs text-white rounded-xs px-2.5 py-1.5 focus:outline-none focus:border-tac-gold-700';

// One roster list: Round 1 judges (with a booth from the booth list, MSP-38
// and story B) or finale judges (no booth, story D).
const RosterList: React.FC<{
  roster: JudgeRoster;
  competition: Competition;
  onUpdateCompetition: (comp: Competition) => void;
}> = ({ roster, competition, onUpdateCompetition }) => {
  const [judgeName, setJudgeName] = useState('');
  const [judgeEmail, setJudgeEmail] = useState('');
  const [booth, setBooth] = useState(NO_BOOTH);
  const booths = boothList(competition);
  const isFinale = roster === 'finale';
  const judges = competition.judges.filter((j) => isFinaleJudge(j) === isFinale);
  const refresh = () => onUpdateCompetition(storageService.getCompetition());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgeName.trim()) return;
    storageService.addJudge({
      name: judgeName.trim(),
      email: judgeEmail.trim() || undefined,
      ...(isFinale ? { roster: 'finale' as const } : { boothAssigned: booth || undefined }),
    });
    refresh();
    setJudgeName('');
    setJudgeEmail('');
    setBooth(NO_BOOTH);
  };

  const handleMove = (judge: Judge, to: string) => {
    storageService.updateJudge(judge.id, { boothAssigned: to || undefined });
    refresh();
  };

  const boothSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value={NO_BOOTH}>No booth</option>
      {booths.map((b) => (
        <option key={b} value={b}>
          {b}
        </option>
      ))}
      {/* A booth that was removed from the list still shows until the judge is moved. */}
      {value && !booths.includes(value) && <option value={value}>{value}</option>}
    </select>
  );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display font-semibold text-xs text-tac-stone-200 uppercase tracking-wide">
          {isFinale ? 'Finale judges' : 'Round 1 judges'} ({judges.length})
        </h3>
        <p className="text-[11px] text-tac-stone-400 mt-0.5">
          {isFinale
            ? 'They score every finalist in the finale. No booth.'
            : 'Each judge scores only the teams at their booth. Booths come from the Booths list in Competition Rounds.'}
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className={`grid grid-cols-1 gap-2 bg-tac-ink-900 p-3 rounded-xs border border-tac-ink-700 ${isFinale ? 'sm:grid-cols-[1fr_1fr_auto]' : 'sm:grid-cols-[1fr_1fr_1fr_auto]'}`}
      >
        <input
          type="text"
          required
          aria-label={isFinale ? 'Finale judge name' : 'Round 1 judge name'}
          placeholder="Judge full name"
          value={judgeName}
          onChange={(e) => setJudgeName(e.target.value)}
          className={inputClass}
        />
        <input
          type="email"
          aria-label={isFinale ? 'Finale judge email' : 'Round 1 judge email'}
          placeholder="Email (optional)"
          value={judgeEmail}
          onChange={(e) => setJudgeEmail(e.target.value)}
          className={inputClass}
        />
        {!isFinale && boothSelect(booth, setBooth, 'Assigned booth')}
        <button
          type="submit"
          className="px-3 py-1.5 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-bold text-xs rounded-xs shrink-0 flex items-center justify-center space-x-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {judges.map((judge) => (
          <div
            key={judge.id}
            className="bg-tac-ink-900 p-2.5 rounded-xs border border-tac-ink-700 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <span className="font-bold text-xs text-white block">{judge.name}</span>
              <span className="text-[11px] text-tac-stone-400">{judge.email || 'No email'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {!isFinale && (
                <div className="w-44">
                  {boothSelect(judge.boothAssigned || NO_BOOTH, (v) => handleMove(judge, v), `Booth for ${judge.name}`)}
                </div>
              )}
              <button
                onClick={() => {
                  storageService.removeJudge(judge.id);
                  refresh();
                }}
                className="text-tac-stone-500 hover:text-red-400 p-1 transition-colors"
                title={`Remove ${judge.name}`}
                aria-label={`Remove ${judge.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {judges.length === 0 && <p className="text-xs text-tac-stone-500">No {isFinale ? 'finale' : 'Round 1'} judges yet.</p>}
      </div>
    </div>
  );
};

export const JudgeRosterManager: React.FC<JudgeRosterManagerProps> = ({
  competition,
  onUpdateCompetition,
  onSwitchToJudgeView,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const scoringUrl = `${window.location.origin}${window.location.pathname}#/judge`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(scoringUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-tac-ink-700">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-tac-gold-500" />
            <h2 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wide">
              Judge Roster
            </h2>
          </div>
          <p className="text-xs text-tac-stone-400 mt-1">
            Copy the judge link to share it. It opens the scoring screen in any browser.
          </p>
        </div>

        {/* Copy Shareable Link */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-3 py-2 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-200 text-xs rounded-xs border border-tac-ink-700 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-tac-gold-400" />}
            <span>{copiedLink ? 'Copied Link!' : 'Copy Judge Link'}</span>
          </button>

          <button
            onClick={onSwitchToJudgeView}
            className="flex items-center space-x-1.5 px-3 py-2 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-semibold text-xs rounded-xs shadow-tac-sm transition-all"
          >
            <Smartphone className="w-3.5 h-3.5 text-tac-gold-300" />
            <span>Launch Judge View</span>
          </button>
        </div>
      </div>

      {/* No QR code here: TAC makes its own from the app address (Steph, Oct 12). */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RosterList roster="booth" competition={competition} onUpdateCompetition={onUpdateCompetition} />
        <RosterList roster="finale" competition={competition} onUpdateCompetition={onUpdateCompetition} />
      </div>
    </div>
  );
};
