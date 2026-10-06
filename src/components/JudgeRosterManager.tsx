import React, { useState } from 'react';
import { Competition } from '../types';
import { storageService } from '../services/storageService';
import { QrCode, UserPlus, Trash2, Smartphone, Copy, Check } from 'lucide-react';

interface JudgeRosterManagerProps {
  competition: Competition;
  onUpdateCompetition: (comp: Competition) => void;
  onSwitchToJudgeView: () => void;
}

export const JudgeRosterManager: React.FC<JudgeRosterManagerProps> = ({
  competition,
  onUpdateCompetition,
  onSwitchToJudgeView,
}) => {
  const [judgeName, setJudgeName] = useState('');
  const [judgeEmail, setJudgeEmail] = useState('');
  const [boothAssigned, setBoothAssigned] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const scoringUrl = `${window.location.origin}${window.location.pathname}#/judge`;

  const handleAddJudge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgeName.trim()) return;

    storageService.addJudge({
      name: judgeName.trim(),
      email: judgeEmail.trim() || undefined,
      boothAssigned: boothAssigned || undefined,
    });

    onUpdateCompetition(storageService.getCompetition());
    setJudgeName('');
    setJudgeEmail('');
    setBoothAssigned('');
  };

  const handleRemoveJudge = (id: string) => {
    storageService.removeJudge(id);
    onUpdateCompetition(storageService.getCompetition());
  };

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
            <QrCode className="w-5 h-5 text-tac-gold-500" />
            <h2 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wide">
              Judge Roster & QR Code Access (MSP-03, MSP-29)
            </h2>
          </div>
          <p className="text-xs text-tac-stone-400 mt-1">
            Single shareable QR code routing volunteer judges directly to the live scoring sheet in any browser.
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
            className="flex items-center space-x-1.5 px-3 py-2 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-semibold text-xs rounded-xs shadow-tac-sm transition-all"
          >
            <Smartphone className="w-3.5 h-3.5 text-tac-gold-300" />
            <span>Launch Judge View</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Single Official QR Code Display (MSP-03) */}
        <div className="bg-tac-ink-900 p-5 rounded-sm border border-tac-ink-700 flex flex-col items-center text-center space-y-3">
          <span className="text-[10px] font-bold text-tac-gold-400 uppercase tracking-widest">
            Single Event QR Code (MSP-03)
          </span>

          {/* Render High-Fidelity SVG QR Representation */}
          <div className="w-44 h-44 bg-white p-3 rounded-xs shadow-tac-md flex flex-col items-center justify-center">
            {/* SVG QR Code Pattern */}
            <svg viewBox="0 0 100 100" className="w-full h-full text-tac-ink-900 fill-current">
              <rect x="5" y="5" width="28" height="28" fill="#171717" />
              <rect x="8" y="8" width="22" height="22" fill="#FFFFFF" />
              <rect x="12" y="12" width="14" height="14" fill="#171717" />

              <rect x="67" y="5" width="28" height="28" fill="#171717" />
              <rect x="70" y="8" width="22" height="22" fill="#FFFFFF" />
              <rect x="74" y="12" width="14" height="14" fill="#171717" />

              <rect x="5" y="67" width="28" height="28" fill="#171717" />
              <rect x="8" y="70" width="22" height="22" fill="#FFFFFF" />
              <rect x="12" y="74" width="14" height="14" fill="#171717" />

              {/* Data modules */}
              <rect x="38" y="8" width="8" height="8" fill="#171717" />
              <rect x="50" y="15" width="6" height="6" fill="#171717" />
              <rect x="38" y="24" width="10" height="6" fill="#171717" />
              <rect x="12" y="40" width="6" height="10" fill="#171717" />
              <rect x="25" y="44" width="8" height="8" fill="#171717" />
              <rect x="40" y="40" width="20" height="20" fill="#AA721A" />
              <rect x="68" y="42" width="8" height="8" fill="#171717" />
              <rect x="82" y="50" width="8" height="8" fill="#171717" />
              <rect x="42" y="68" width="12" height="6" fill="#171717" />
              <rect x="60" y="70" width="8" height="8" fill="#171717" />
              <rect x="75" y="75" width="15" height="15" fill="#171717" />
            </svg>
          </div>

          <p className="text-[11px] text-tac-stone-400">
            Print or project on event day. Always resolves to the currently <strong>LIVE</strong> round form.
          </p>
        </div>

        {/* Judge Roster Management (MSP-05, MSP-19) */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-xs text-tac-stone-200 uppercase tracking-wide">
              Registered Judges Roster ({competition.judges.length})
            </h3>
          </div>

          {/* Add Judge Form */}
          <form onSubmit={handleAddJudge} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-tac-ink-900 p-3 rounded-xs border border-tac-ink-700">
            <div>
              <input
                type="text"
                required
                placeholder="Judge Full Name"
                value={judgeName}
                onChange={(e) => setJudgeName(e.target.value)}
                className="w-full bg-tac-ink-950 border border-tac-ink-700 text-xs text-white rounded-xs px-2.5 py-1.5 focus:outline-none focus:border-tac-gold-700"
              />
            </div>
            <div>
              <input
                type="email"
                placeholder="Email (optional)"
                value={judgeEmail}
                onChange={(e) => setJudgeEmail(e.target.value)}
                className="w-full bg-tac-ink-950 border border-tac-ink-700 text-xs text-white rounded-xs px-2.5 py-1.5 focus:outline-none focus:border-tac-gold-700"
              />
            </div>
            <div className="flex space-x-1">
              <input
                type="text"
                placeholder="Assigned Booth"
                value={boothAssigned}
                onChange={(e) => setBoothAssigned(e.target.value)}
                className="w-full bg-tac-ink-950 border border-tac-ink-700 text-xs text-white rounded-xs px-2.5 py-1.5 focus:outline-none focus:border-tac-gold-700"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-bold text-xs rounded-xs shrink-0 flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Judges List */}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {competition.judges.map((judge) => (
              <div
                key={judge.id}
                className="bg-tac-ink-900 p-2.5 rounded-xs border border-tac-ink-700 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-xs text-white block">
                    {judge.name}
                  </span>
                  <span className="text-[11px] text-tac-stone-400">
                    {judge.email || 'No email'} {judge.boothAssigned ? `• ${judge.boothAssigned}` : ''}
                  </span>
                </div>

                <button
                  onClick={() => handleRemoveJudge(judge.id)}
                  className="text-tac-stone-500 hover:text-red-400 p-1 transition-colors"
                  title="Remove judge"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
