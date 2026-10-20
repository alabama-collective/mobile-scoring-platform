import React, { useState } from 'react';
import { Round, Team } from '../types';
import { Smartphone, CheckCircle, Info, Award, UserCheck, MessageSquare } from 'lucide-react';
import { isInRegion, teamRegion } from '../services/regions';

interface JudgeScoringPreviewProps {
  round: Round;
  teams: Team[];
  winningRegion?: string;
}

export const JudgeScoringPreview: React.FC<JudgeScoringPreviewProps> = ({
  round,
  teams,
  winningRegion,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [judgeName, setJudgeName] = useState<string>('Jordan Lake');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbackWorked, setFeedbackWorked] = useState('');
  const [feedbackImprove, setFeedbackImprove] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const isWinningRegion =
    round.roundType === 'booth' &&
    !!selectedTeam &&
    isInRegion(selectedTeam, winningRegion);

  const handleScoreChange = (criterionId: string, val: number) => {
    setScores((prev) => ({
      ...prev,
      [criterionId]: val,
    }));
    setSubmitted(false);
  };

  const rawScore = round.rubric.criteria.reduce((acc, c) => acc + (scores[c.id] || 0), 0);
  const bonus = isWinningRegion ? 5 : 0;
  const totalScore = rawScore + bonus;
  const maxPossible = round.rubric.criteria.reduce((acc, c) => acc + c.maxPoints, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Mobile Simulator Frame Header */}
      <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-tac-circuit-cyan" />
          <div>
            <h2 className="font-display font-bold text-sm text-tac-stone-100 uppercase tracking-wider">
              Judge Mobile View Simulator
            </h2>
            <p className="text-[11px] text-tac-stone-400">
              Live preview of inline rubric guidelines (MSP-12) and custom point ranges (MSP-10).
            </p>
          </div>
        </div>

        {/* Team Selector for Simulation */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-tac-stone-400">Team:</label>
          <select
            value={selectedTeamId}
            onChange={(e) => {
              setSelectedTeamId(e.target.value);
              setScores({});
              setSubmitted(false);
            }}
            className="bg-tac-ink-950 border border-tac-ink-600 text-xs text-white rounded-xs px-2.5 py-1 focus:outline-none focus:border-tac-gold-700"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({teamRegion(t) || 'School needed'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Simulated Mobile Scoring Sheet Screen */}
      <div className="bg-tac-ink-900 border-2 border-tac-ink-700 rounded-md p-4 sm:p-6 shadow-tac-lg space-y-5">
        {/* Judge Identification Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-tac-ink-800 text-xs">
          <div className="flex items-center space-x-1.5 text-tac-stone-300">
            <UserCheck className="w-4 h-4 text-tac-gold-500" />
            <span>Judge:</span>
            <input
              type="text"
              value={judgeName}
              onChange={(e) => setJudgeName(e.target.value)}
              className="bg-transparent border-b border-tac-ink-700 px-1 text-white font-semibold focus:outline-none focus:border-tac-gold-700"
            />
          </div>
          <span className="text-tac-gold-400 font-medium">{round.name}</span>
        </div>

        {/* Team Header (MSP-21 preview) */}
        <div className="bg-tac-ink-950 p-4 rounded-sm border border-tac-ink-800 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-tac-gold-500 font-bold block">
            Now Pitching
          </span>
          <h1 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide">
            {selectedTeam?.name}
          </h1>
          <div className="flex items-center justify-center space-x-2 text-xs text-tac-stone-400 pt-1">
            <span>{selectedTeam?.boothCategory}</span>
            <span>•</span>
            <span className="text-tac-stone-300 font-medium">{selectedTeam ? teamRegion(selectedTeam) || 'School needed' : ''}</span>
          </div>

          {/* Regional Bonus indicator if applicable (MSP-35) */}
          {isWinningRegion && (
            <div className="mt-2 inline-flex items-center space-x-1.5 bg-tac-gold-950 border border-tac-gold-700 text-tac-gold-300 text-xs px-3 py-1 rounded-xs">
              <Award className="w-3.5 h-3.5 text-tac-gold-500" />
              <span>Gift Classic Winning Region Bonus: <strong>+5 Points Applied</strong></span>
            </div>
          )}
        </div>

        {/* Submission Confirmation Banner (MSP-23 preview) */}
        {submitted && (
          <div className="p-3 bg-green-950 border border-green-700 text-green-300 text-xs rounded-xs flex items-center space-x-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            <span>
              <strong>Score Confirmed!</strong> Your score of {totalScore}/{maxPossible + bonus} for{' '}
              {selectedTeam?.name} has been recorded.
            </span>
          </div>
        )}

        {/* Rubric Criteria Cards with Inline Guidance (MSP-12) & Point Ranges (MSP-10) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {round.rubric.criteria.map((criterion, index) => {
            const currentScore = scores[criterion.id] ?? 0;
            const pointsOptions = Array.from({ length: criterion.maxPoints + 1 }, (_, i) => i);

            return (
              <div
                key={criterion.id}
                className="bg-tac-ink-950/70 rounded-sm border border-tac-ink-800 hover:border-tac-ink-700 p-4 space-y-3"
              >
                {/* Criterion Title & Score Selector (MSP-10) */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-tac-gold-500 font-bold block mb-0.5">
                      CATEGORY 0{index + 1}
                    </span>
                    <h3 className="font-display font-bold text-sm text-tac-stone-100">
                      {criterion.title}
                    </h3>
                  </div>

                  {/* Range Selector supporting >10 points (MSP-10) */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <select
                      value={currentScore}
                      onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value))}
                      className="bg-tac-ink-900 border-2 border-tac-gold-700 text-tac-gold-400 font-bold text-sm rounded-xs px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-tac-gold-500"
                    >
                      {pointsOptions.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt} / {criterion.maxPoints} pts
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Inline Rubric Guidance (MSP-12) */}
                <div className="bg-tac-ink-900/80 p-2.5 rounded-xs border-l-2 border-tac-gold-600 text-xs text-tac-stone-300">
                  <div className="flex items-center space-x-1.5 text-tac-gold-400 text-[11px] font-semibold mb-0.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>What You're Listening For:</span>
                  </div>
                  <p className="italic text-tac-stone-300">{criterion.description}</p>
                </div>

                {/* Inline Scale Anchors if present (MSP-12) */}
                {criterion.scaleAnchors && criterion.scaleAnchors.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 pt-1 text-[10px]">
                    {criterion.scaleAnchors.map((anchor) => (
                      <div
                        key={anchor.range}
                        className={`p-1 rounded-xs border text-center ${
                          currentScore >= parseInt(anchor.range.split('–')[0])
                            ? 'bg-tac-gold-950/40 border-tac-gold-800 text-tac-gold-300'
                            : 'bg-tac-ink-900/40 border-tac-ink-800 text-tac-stone-500'
                        }`}
                      >
                        <div className="font-bold">{anchor.range}</div>
                        <div className="text-[9px] truncate">{anchor.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Qualitative Written Feedback Section */}
          <div className="bg-tac-ink-950/70 rounded-sm border border-tac-ink-800 p-4 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs text-tac-gold-400 font-semibold">
              <MessageSquare className="w-4 h-4 text-tac-gold-500" />
              <span>Judge Feedback for Founders (Printed Packet Requirement)</span>
            </div>
            <div>
              <label className="text-[11px] text-tac-stone-400 block mb-1">
                One thing that worked well:
              </label>
              <textarea
                rows={2}
                value={feedbackWorked}
                onChange={(e) => setFeedbackWorked(e.target.value)}
                placeholder="Specific strength, persuasive market data, confident delivery..."
                className="w-full bg-tac-ink-900 border border-tac-ink-700 rounded-xs p-2 text-xs text-tac-stone-200 focus:outline-none focus:border-tac-gold-700"
              />
            </div>
            <div>
              <label className="text-[11px] text-tac-stone-400 block mb-1">
                One thing that would make it stronger:
              </label>
              <textarea
                rows={2}
                value={feedbackImprove}
                onChange={(e) => setFeedbackImprove(e.target.value)}
                placeholder="Competitive differentiation, clearer customer persona, traction..."
                className="w-full bg-tac-ink-900 border border-tac-ink-700 rounded-xs p-2 text-xs text-tac-stone-200 focus:outline-none focus:border-tac-gold-700"
              />
            </div>
          </div>

          {/* Scoring Summary & Submit */}
          <div className="bg-tac-ink-950 p-4 rounded-sm border border-tac-gold-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-tac-stone-400 uppercase tracking-wider block">
                Total Score
              </span>
              <div className="flex items-baseline space-x-1.5">
                <span className="font-display font-black text-2xl text-tac-gold-400">
                  {totalScore}
                </span>
                <span className="text-xs text-tac-stone-400 font-medium">
                  / {maxPossible + bonus} pts
                </span>
                {isWinningRegion && (
                  <span className="text-[10px] text-tac-gold-300 font-semibold bg-tac-gold-900/60 px-1.5 py-0.5 rounded-xs ml-1">
                    (+5 bonus)
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-display font-bold text-xs uppercase tracking-wider rounded-xs shadow-tac-md transition-all"
            >
              Submit Score
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
