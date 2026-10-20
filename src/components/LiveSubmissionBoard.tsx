import React, { useState } from 'react';
import { Competition, Round, TeamScoreSummary } from '../types';
import { storageService } from '../services/storageService';
import { judgesForRound, judgesForTeam, isJudgeExpected } from '../services/booths';
import { teamRegion } from '../services/regions';
import {
  Users,
  CheckCircle2,
  Clock,
  Award,
  ShieldCheck,
  TrendingUp,
  Eye,
  CheckCheck,
  Printer,
} from 'lucide-react';

interface LiveSubmissionBoardProps {
  competition: Competition;
  activeRound: Round;
  onRefreshData?: () => void;
  onFinalizeRound?: (finalizedBy: string) => void;
}

export const LiveSubmissionBoard: React.FC<LiveSubmissionBoardProps> = ({
  competition,
  activeRound,
  onFinalizeRound,
}) => {
  // Story E: the Give Classic bonus is Round 1 only. In the finale it appears nowhere.
  const isBooth = activeRound.roundType === 'booth';
  // MSP-48: Round 1 judges for Round 1, the finale judge list for the finale.
  const judges = judgesForRound(competition, activeRound);
  const summaries = storageService.getTeamScoreSummaries(activeRound.id);
  const allSubmissions = storageService.getAllSubmissions().filter((s) => s.roundId === activeRound.id);

  const [selectedAuditTeam, setSelectedAuditTeam] = useState<TeamScoreSummary | null>(null);
  const [signerName, setSignerName] = useState('Avery Quinn');
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  // Calculate high-level progress (MSP-05)
  // Only the judges at a team's booth are expected to score it (MSP-48).
  const expectedFor = (teamId: string) => {
    const team = competition.teams.find((t) => t.id === teamId);
    return team ? judgesForTeam(competition, activeRound, team) : [];
  };
  const totalSubmissionsNeeded = competition.teams.reduce(
    (acc, t) => acc + judgesForTeam(competition, activeRound, t).length,
    0
  );
  const actualSubmissionsCount = allSubmissions.filter((s) =>
    expectedFor(s.teamId).some((j) => j.id === s.judgeId)
  ).length;
  const completionPercentage =
    totalSubmissionsNeeded > 0
      ? Math.round((actualSubmissionsCount / totalSubmissionsNeeded) * 100)
      : 0;

  // Identify judges who have not submitted yet for each team (MSP-05)
  const pendingSubmissionsCount = totalSubmissionsNeeded - actualSubmissionsCount;

  const handleFinalize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !onFinalizeRound) return;
    onFinalizeRound(signerName.trim());
    setShowFinalizeModal(false);
  };

  const handlePrintResults = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats Bar (MSP-05) */}
      <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-tac-ink-700">
          <div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-tac-gold-500" />
              <h2 className="font-display font-bold text-lg text-white uppercase tracking-wide">
                Live Submission & Tabulation Board (MSP-05, MSP-06)
              </h2>
            </div>
            <p className="text-xs text-tac-stone-400 mt-1">
              Real-time submission status by judge and team. Eliminates room guesswork before announcing winners on stage.
            </p>
          </div>

          {/* Finalize Button / Finalized Badge (MSP-34) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintResults}
              className="flex items-center space-x-1.5 px-3 py-2 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-300 text-xs rounded-xs border border-tac-ink-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-tac-stone-400" />
              <span>Print Sheet</span>
            </button>

            {activeRound.isResultsFinalized ? (
              <div className="flex items-center space-x-2 bg-green-950/80 border border-green-700 px-3.5 py-1.5 rounded-xs text-green-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span>
                  Confirmed Final by <strong>{activeRound.finalizedBy}</strong>
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowFinalizeModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-bold text-xs rounded-xs shadow-tac-sm transition-all"
              >
                <CheckCheck className="w-4 h-4 text-tac-gold-300" />
                <span>Review & Confirm Results (MSP-34)</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-tac-ink-900 p-3 rounded-xs border border-tac-ink-700">
            <span className="text-[10px] text-tac-stone-400 uppercase tracking-wider block">
              Submissions In
            </span>
            <span className="font-display font-black text-xl text-tac-gold-400">
              {actualSubmissionsCount} / {totalSubmissionsNeeded}
            </span>
            <span className="text-[10px] text-tac-stone-400 block mt-0.5">
              ({completionPercentage}% complete)
            </span>
          </div>

          <div className="bg-tac-ink-900 p-3 rounded-xs border border-tac-ink-700">
            <span className="text-[10px] text-tac-stone-400 uppercase tracking-wider block">
              Missing Scores
            </span>
            <span className={`font-display font-black text-xl ${
              pendingSubmissionsCount === 0 ? 'text-green-400' : 'text-amber-400'
            }`}>
              {pendingSubmissionsCount} pending
            </span>
            <span className="text-[10px] text-tac-stone-400 block mt-0.5">
              Across all judges
            </span>
          </div>

          <div className="bg-tac-ink-900 p-3 rounded-xs border border-tac-ink-700">
            <span className="text-[10px] text-tac-stone-400 uppercase tracking-wider block">
              Active Judges
            </span>
            <span className="font-display font-black text-xl text-white">
              {judges.length}
            </span>
            <span className="text-[10px] text-tac-stone-400 block mt-0.5">
              Roster authenticated
            </span>
          </div>

          <div className="bg-tac-ink-900 p-3 rounded-xs border border-tac-ink-700">
            <span className="text-[10px] text-tac-stone-400 uppercase tracking-wider block">
              Round Status
            </span>
            <span className="font-display font-black text-xl text-tac-circuit-cyan uppercase">
              {activeRound.status}
            </span>
            <span className="text-[10px] text-tac-stone-400 block mt-0.5">
              {activeRound.name}
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Judge Submission Matrix (MSP-05 & MSP-19: Exactly who has/hasn't submitted) */}
      <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-tac-stone-100 uppercase tracking-wider">
              Judge Submission Matrix by Team (MSP-05)
            </h3>
            <p className="text-xs text-tac-stone-400">
              Identifies which specific judges have recorded scores versus pending stragglers.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-tac-ink-700 rounded-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-tac-ink-900 text-tac-stone-400 uppercase text-[10px] tracking-wider border-b border-tac-ink-700">
              <tr>
                <th className="py-3 px-3 min-w-[160px]">Team</th>
                <th className="py-3 px-2">Booth</th>
                {judges.map((judge) => (
                  <th key={judge.id} className="py-3 px-2 text-center min-w-[110px]">
                    <span className="block truncate max-w-[100px] font-semibold text-white">
                      {judge.name}
                    </span>
                    <span className="text-[9px] text-tac-stone-400 font-mono">
                      {activeRound.roundType === 'finale' ? 'Finale judge' : judge.boothAssigned || 'No booth'}
                    </span>
                  </th>
                ))}
                <th className="py-3 px-3 text-right">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tac-ink-700 bg-tac-ink-900/60">
              {competition.teams.map((team) => {
                const expected = judgesForTeam(competition, activeRound, team);
                const teamSubs = allSubmissions.filter(
                  (s) => s.teamId === team.id && expected.some((j) => j.id === s.judgeId)
                );
                const allDone = expected.length > 0 && teamSubs.length >= expected.length;

                return (
                  <tr key={team.id} className="hover:bg-tac-ink-900 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {team.name}
                      <span className="block text-[10px] text-tac-stone-400 font-normal">
                        {teamRegion(team) || 'School needed'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-tac-stone-300">
                      {team.boothCategory}
                    </td>

                    {/* Judge Submission Status Cells (MSP-05, MSP-19) */}
                    {judges.map((judge) => {
                      const sub = teamSubs.find((s) => s.judgeId === judge.id);
                      if (!isJudgeExpected(competition, activeRound, team, judge)) {
                        return (
                          <td key={judge.id} className="py-2.5 px-2 text-center text-tac-stone-600" title="Not this judge's booth">
                            –
                          </td>
                        );
                      }
                      return (
                        <td key={judge.id} className="py-2.5 px-2 text-center">
                          {sub ? (
                            <span
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-950 text-green-300 border border-green-800 text-[11px] font-bold rounded-xs cursor-pointer hover:bg-green-900"
                              title={`Submitted: ${sub.rawTotal} pts. Click to view audit.`}
                              onClick={() => {
                                const summary = summaries.find((s) => s.team.id === team.id);
                                if (summary) setSelectedAuditTeam(summary);
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                              <span>{sub.rawTotal} pts</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-950/60 text-amber-400 border border-amber-800/80 text-[10px] rounded-xs font-medium">
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              <span>Missing</span>
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Team Total Submissions Ratio */}
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-xs text-[11px] font-bold ${
                        allDone
                          ? 'bg-green-950 text-green-400 border border-green-800'
                          : 'bg-tac-ink-800 text-tac-stone-400 border border-tac-ink-700'
                      }`}>
                        {teamSubs.length} / {expected.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-Tabulated Leaderboard & Audit Trail (MSP-06) */}
      <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-tac-ink-700">
          <div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-tac-gold-500" />
              <h3 className="font-display font-bold text-sm text-tac-stone-100 uppercase tracking-wider">
                Automated Results & Audit Leaderboard (MSP-06)
              </h3>
            </div>
            <p className="text-xs text-tac-stone-400">
              Rankings calculated automatically with a verified audit trail. No manual calculator recounts needed.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-tac-ink-700 rounded-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-tac-ink-900 text-tac-stone-400 uppercase text-[10px] tracking-wider border-b border-tac-ink-700">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">Rank</th>
                <th className="py-2.5 px-3">Team Name</th>
                <th className="py-2.5 px-2">Booth / Track</th>
                <th className="py-2.5 px-2 text-center">Judges' total</th>
                {isBooth && <th className="py-2.5 px-2 text-center">Give Classic bonus</th>}
                <th className="py-2.5 px-3 text-right">Final Score</th>
                <th className="py-2.5 px-3 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tac-ink-700 bg-tac-ink-900/60">
              {summaries.map((summary, idx) => {
                // No winner label until the team has at least one score.
                const isLeader = summary.rank === 1 && summary.submissionCount > 0;
                // Story H: in Round 1 each booth is ranked on its own, under its own heading.
                const newBooth =
                  activeRound.roundType === 'booth' &&
                  (idx === 0 || summaries[idx - 1].team.boothCategory !== summary.team.boothCategory);

                return (
                  <React.Fragment key={summary.team.id}>
                  {newBooth && (
                    <tr className="bg-tac-ink-950">
                      <td colSpan={isBooth ? 7 : 6} className="py-2 px-3 text-[11px] font-bold uppercase tracking-widest text-tac-gold-500">
                        {summary.team.boothCategory || 'No booth'}
                      </td>
                    </tr>
                  )}
                  <tr
                      className={`transition-colors ${
                      isLeader ? 'bg-tac-gold-950/20' : 'hover:bg-tac-ink-900'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-display font-black text-sm">
                      {isLeader ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-xs bg-tac-gold-700 text-tac-ink-900 shadow-tac-sm">
                          1
                        </span>
                      ) : (
                        <span className="text-tac-stone-400">{summary.rank}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      <div className="flex items-center space-x-2">
                        <span>{summary.team.name}</span>
                        {isLeader && (
                          <span className="bg-tac-gold-900/80 text-tac-gold-300 border border-tac-gold-700 text-[10px] px-1.5 py-0.2 rounded-xs font-semibold">
                            {activeRound.roundType === 'booth' ? 'Booth Winner ($1k)' : '1st Place ($4k)'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-tac-stone-400 font-normal block">
                        Founders: {summary.team.founderNames || 'N/A'} • {teamRegion(summary.team) || 'School needed'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-tac-stone-300">
                      {summary.team.boothCategory}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-semibold text-tac-stone-200">
                      {summary.judgesTotal} pts
                      <span className="block text-[10px] text-tac-stone-500 font-normal">
                        {summary.submissionCount} of {summary.totalSubmissionsRequired} judges
                      </span>
                    </td>
                    {isBooth && (
                    <td className="py-2.5 px-2 text-center">
                      {summary.regionalBonus > 0 ? (
                        <span
                          className="inline-flex items-center space-x-1 text-tac-gold-400 font-bold bg-tac-gold-950 px-2 py-0.5 rounded-xs border border-tac-gold-800 text-[11px]"
                          title={`+${summary.regionalBonus} Give Classic bonus (${competition.winningRegion})`}
                        >
                          <Award className="w-3 h-3 text-tac-gold-500" />
                          <span>+{summary.regionalBonus} pts</span>
                        </span>
                      ) : (
                        <span className="text-tac-stone-500 font-mono">0 pts</span>
                      )}
                    </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-display font-black text-base text-tac-gold-400">
                      {summary.finalScore}
                      {/* MSP-42: the bonus shows on the score, with its region */}
                      {summary.regionalBonus > 0 && (
                        <span className="block text-[10px] font-body font-semibold text-tac-gold-500">
                          +{summary.regionalBonus} Give Classic bonus ({competition.winningRegion})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedAuditTeam(summary)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-tac-ink-950 hover:bg-tac-ink-800 text-tac-stone-300 rounded-xs border border-tac-ink-700 text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-tac-gold-400" />
                        <span>Audit ({summary.judgeScores.length})</span>
                      </button>
                    </td>
                  </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Modal (MSP-06: Defensible log of every contributing score) */}
      {selectedAuditTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-tac-ink-900 border border-tac-gold-700/80 rounded-sm max-w-2xl w-full p-6 shadow-tac-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-tac-ink-700">
              <div>
                <span className="text-[10px] uppercase font-bold text-tac-gold-500 tracking-wider">
                  Audit Trail & Score Breakdown (MSP-06)
                </span>
                <h3 className="font-display font-black text-lg text-white uppercase">
                  {selectedAuditTeam.team.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditTeam(null)}
                className="text-tac-stone-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Score Formula Summary */}
            <div className="bg-tac-ink-950 p-3 rounded-xs border border-tac-ink-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-tac-stone-400 block">Calculation Method:</span>
                <span className="text-tac-stone-200">
                  Sum of {selectedAuditTeam.judgeScores.length} judges' scores ({selectedAuditTeam.judgesTotal} pts)
                  {isBooth && ` + ${selectedAuditTeam.regionalBonus} Give Classic bonus`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-tac-stone-400 block text-[10px] uppercase">Final Official Score</span>
                <span className="font-display font-black text-xl text-tac-gold-400">
                  {selectedAuditTeam.finalScore} pts
                </span>
              </div>
            </div>

            {/* MSP-42: the bonus is its own line, separate from the judges' scores */}
            {isBooth && selectedAuditTeam.regionalBonus > 0 && (
              <div className="bg-tac-gold-950/40 p-3 rounded-xs border border-tac-gold-800 text-xs flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-tac-gold-300 font-semibold">
                  <Award className="w-3.5 h-3.5 text-tac-gold-500" />
                  <span>Give Classic bonus ({competition.winningRegion})</span>
                </span>
                <span className="font-bold text-tac-gold-400">+{selectedAuditTeam.regionalBonus} pts</span>
              </div>
            )}

            {/* Individual Judge Scores breakdown (MSP-19) */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-tac-stone-300 uppercase tracking-wide">
                Judge Submissions Contributing to Total ({selectedAuditTeam.judgeScores.length})
              </h4>

              {selectedAuditTeam.judgeScores.length === 0 ? (
                <div className="p-4 text-center text-xs text-tac-stone-500 bg-tac-ink-950 rounded-xs">
                  No judges have submitted scores for this team yet.
                </div>
              ) : (
                selectedAuditTeam.judgeScores.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-tac-ink-950 p-3.5 rounded-xs border border-tac-ink-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 font-bold text-white">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        <span>Judge: {sub.judgeName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-tac-stone-400 font-mono">
                          {new Date(sub.submittedAt).toLocaleTimeString()}
                        </span>
                        <span className="font-bold text-tac-gold-400 bg-tac-ink-900 px-2 py-0.5 rounded-xs border border-tac-ink-700">
                          {sub.rawTotal} pts
                        </span>
                      </div>
                    </div>

                    {/* Criteria point breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1 text-[11px]">
                      {activeRound.rubric.criteria.map((c) => (
                        <div key={c.id} className="bg-tac-ink-900/80 p-1.5 rounded-xs border border-tac-ink-800">
                          <span className="text-[9px] text-tac-stone-400 block truncate">
                            {c.title}
                          </span>
                          <span className="font-bold text-tac-stone-200">
                            {sub.scores[c.id] ?? 0} / {c.maxPoints}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Judge qualitative feedback */}
                    {(sub.feedbackWorkedWell || sub.feedbackCouldImprove) && (
                      <div className="pt-2 border-t border-tac-ink-900 text-xs space-y-1 text-tac-stone-300">
                        {sub.feedbackWorkedWell && (
                          <p>
                            <strong className="text-green-400">Worked well:</strong>{' '}
                            {sub.feedbackWorkedWell}
                          </p>
                        )}
                        {sub.feedbackCouldImprove && (
                          <p>
                            <strong className="text-tac-gold-400">Could improve:</strong>{' '}
                            {sub.feedbackCouldImprove}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAuditTeam(null)}
                className="px-4 py-1.5 bg-tac-ink-800 hover:bg-tac-ink-700 text-white text-xs rounded-xs"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Confirm Results Checkpoint Modal (MSP-34) */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-tac-ink-900 border border-tac-gold-700 rounded-sm max-w-lg w-full p-6 shadow-tac-lg space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-tac-ink-700">
              <ShieldCheck className="w-5 h-5 text-tac-gold-500" />
              <h3 className="font-display font-bold text-base text-white uppercase tracking-wide">
                Confirm & Lock Final Results (MSP-34)
              </h3>
            </div>

            <p className="text-xs text-tac-stone-300">
              "No number reaches the stage before a person has checked it." Confirm that all judge submissions and regional bonuses
              have been verified before locking the official stage winners.
            </p>

            <form onSubmit={handleFinalize} className="space-y-4">
              <div>
                <label className="text-xs text-tac-stone-300 font-semibold block mb-1">
                  Sign-off Staff Name (Program Director / Coordinator)
                </label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-3 py-2 text-xs text-white focus:outline-none focus:border-tac-gold-700"
                />
              </div>

              <div className="bg-tac-ink-950 p-3 rounded-xs border border-tac-ink-800 text-xs text-tac-stone-400 space-y-1">
                <span className="font-bold text-tac-stone-200 block">Verification Summary:</span>
                <p>• {summaries.length} competing teams scored</p>
                {activeRound.roundType === 'booth' ? (
                  summaries
                    .filter((s) => s.rank === 1)
                    .map((s) => (
                      <p key={s.team.id}>
                        • {s.team.boothCategory || 'No booth'} winner: <strong>{s.team.name}</strong> ({s.finalScore} pts)
                      </p>
                    ))
                ) : (
                  <p>• Winner: <strong>{summaries[0]?.team.name}</strong> ({summaries[0]?.finalScore} pts)</p>
                )}
                {isBooth && (
                  <p>• Give Classic bonus: <strong>{competition.bonusPointsApplied ? competition.winningRegion : 'None'}</strong></p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(false)}
                  className="px-3 py-1.5 text-xs text-tac-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleFinalize}
                  className="px-4 py-2 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-bold text-xs rounded-xs shadow-tac-sm transition-colors"
                >
                  Confirm Official Results
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
