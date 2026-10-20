import React, { useState, useEffect } from 'react';
import { Competition, Round, JudgeScoreSubmission } from '../types';
import { useCloudState } from '../services/cloud';
import { storageService } from '../services/storageService';
import { JudgeBandStrip } from './JudgeBandStrip';
import { JudgeFinaleTimer } from './FinaleTimer';
import { judgesForRound, teamsForJudge, isFinaleJudge } from '../services/booths';
import { isInRegion, teamRegion } from '../services/regions';
import {
  CheckCircle2,
  Award,
  UserCheck,
  Send,
  MessageSquare,
  History,
  ArrowRight,
  AlertTriangle,
  Plus,
  Minus,
} from 'lucide-react';

interface JudgeScoringPortalProps {
  competition: Competition;
  activeRound: Round;
  onScoreSubmitted?: () => void;
  // MSP-46: set when the judge picked their name on the start screen flow.
  // The name then shows in the judge header, not as a dropdown here.
  lockedJudgeId?: string;
}

export const JudgeScoringPortal: React.FC<JudgeScoringPortalProps> = ({
  competition,
  activeRound,
  onScoreSubmitted,
  lockedJudgeId,
}) => {
  // Steph's story D: the Round 1 judge list for Round 1, the finale list for the finale.
  const judges = judgesForRound(competition, activeRound);

  // Active Judge state
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>(() => {
    return localStorage.getItem('tac_current_judge_id') || judges[0]?.id || '';
  });

  const effectiveJudgeId = lockedJudgeId ?? selectedJudgeId;
  const currentJudge = judges.find((j) => j.id === effectiveJudgeId) || judges[0];

  // MSP-48 and story C: a Round 1 judge sees only the teams at their booth.
  const teams = teamsForJudge(competition, activeRound, currentJudge);

  // Active Team state (MSP-21)
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const currentTeamIndex = teams.findIndex((t) => t.id === selectedTeam?.id);
  const nextTeam = currentTeamIndex >= 0 && currentTeamIndex < teams.length - 1 ? teams[currentTeamIndex + 1] : null;

  // Scoring Form State
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbackWorked, setFeedbackWorked] = useState('');
  const [feedbackImprove, setFeedbackImprove] = useState('');
  const [submissionReceipt, setSubmissionReceipt] = useState<JudgeScoreSubmission | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingHistory, setViewingHistory] = useState(false);
  // The scores as last submitted for this team, so the bottom bar can tell
  // "sent" apart from "changed since you sent it".
  const [submittedScores, setSubmittedScores] = useState<Record<string, number> | null>(null);

  // Load existing submission if judge already scored this team (MSP-24)
  useEffect(() => {
    if (!currentJudge || !selectedTeam || !activeRound) return;

    const allSubs = storageService.getAllSubmissions();
    const existing = allSubs.find(
      (s) =>
        s.judgeId === currentJudge.id &&
        s.teamId === selectedTeam.id &&
        s.roundId === activeRound.id
    );

    if (existing) {
      setScores(existing.scores);
      setFeedbackWorked(existing.feedbackWorkedWell || '');
      setFeedbackImprove(existing.feedbackCouldImprove || '');
      setSubmissionReceipt(existing);
      setSubmittedScores(existing.scores);
      setIsEditing(true);
    } else {
      setScores({});
      setFeedbackWorked('');
      setFeedbackImprove('');
      setSubmissionReceipt(null);
      setSubmittedScores(null);
      setIsEditing(false);
    }
  }, [selectedTeamId, effectiveJudgeId, activeRound.id]);

  const handleJudgeChange = (id: string) => {
    setSelectedJudgeId(id);
    localStorage.setItem('tac_current_judge_id', id);
  };

  const handleScoreAdjust = (criterionId: string, delta: number, maxPoints: number) => {
    setScores((prev) => {
      const current = prev[criterionId] ?? 0;
      const next = Math.max(0, Math.min(maxPoints, current + delta));
      return { ...prev, [criterionId]: next };
    });
  };

  const handleScoreDirect = (criterionId: string, val: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: val }));
  };

  // Typed entry: keep digits only and hold the score within 0..maxPoints
  const handleScoreTyped = (criterionId: string, raw: string, maxPoints: number) => {
    const digits = raw.replace(/\D/g, '');
    const val = digits === '' ? 0 : Math.min(maxPoints, parseInt(digits, 10));
    handleScoreDirect(criterionId, val);
  };

  const rawTotal = activeRound.rubric.criteria.reduce(
    (acc, c) => acc + (scores[c.id] ?? 0),
    0
  );

  const maxPossible = activeRound.rubric.criteria.reduce((acc, c) => acc + c.maxPoints, 0);

  const isWinningRegion =
    activeRound.roundType === 'booth' &&
    !!selectedTeam &&
    isInRegion(selectedTeam, competition.winningRegion);

  // MSP-42: the judge's total is their own score only. The Give Classic bonus
  // is added once per team by the app, not by each judge.
  const finalTally = rawTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJudge || !selectedTeam) return;

    const receipt = storageService.submitJudgeScore({
      judgeId: currentJudge.id,
      judgeName: currentJudge.name,
      teamId: selectedTeam.id,
      roundId: activeRound.id,
      scores,
      feedbackWorkedWell: feedbackWorked.trim(),
      feedbackCouldImprove: feedbackImprove.trim(),
    });

    setSubmissionReceipt(receipt);
    setSubmittedScores(scores);
    setIsEditing(true);
    if (onScoreSubmitted) onScoreSubmitted();
  };

  // MSP-45: whether this phone's last saved score has reached the shared database.
  const cloud = useCloudState();
  const sendState = submissionReceipt ? cloud.sends[submissionReceipt.id] : undefined;
  // Approved by Steph (Oct 13): a refused score must never look like a success.
  const refused = cloud.enabled && sendState === 'failed';
  const changedSinceSubmit =
    !!submittedScores &&
    activeRound.rubric.criteria.some((c) => (scores[c.id] ?? 0) !== (submittedScores[c.id] ?? 0));
  // MSP-23: what the bottom bar says, right where the judge just tapped.
  const barStatus: { tone: 'ok' | 'wait' | 'bad'; text: string } | null = !submissionReceipt
    ? null
    : changedSinceSubmit
    ? { tone: 'wait', text: 'Changed. Tap Update Score to send the change.' }
    : refused
    ? { tone: 'bad', text: 'Not saved. Show this screen to staff.' }
    : cloud.enabled && sendState === 'sending'
    ? { tone: 'wait', text: 'Saved on this phone, sending...' }
    : { tone: 'ok', text: `${cloud.enabled ? 'Sent to staff' : 'Saved'}: ${submissionReceipt.rawTotal}/${maxPossible}` };

  // MSP-22: jump from the scorecard to a criterion
  const jumpTo = (criterionId: string) =>
    document.getElementById(`criterion-${criterionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const mySubmissions = storageService
    .getAllSubmissions()
    .filter((s) => s.judgeId === currentJudge?.id && s.roundId === activeRound.id);

  if (!selectedTeam) {
    const noBooth = activeRound.roundType === 'booth' && !!currentJudge && !isFinaleJudge(currentJudge) && !currentJudge.boothAssigned;
    return (
      <div className="max-w-xl mx-auto bg-tac-ink-800 border border-tac-ink-700 rounded-sm p-6 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-tac-gold-500 mx-auto" />
        <h2 className="font-display font-bold text-lg text-white">
          {!currentJudge
            ? 'No judges have been added for this round yet'
            : noBooth
            ? 'Ask staff to assign you a booth'
            : activeRound.roundType === 'booth'
            ? `No teams are in ${currentJudge.boothAssigned} yet`
            : 'No teams are in the finale yet'}
        </h2>
        <p className="text-sm text-tac-stone-300">
          This screen updates by itself as soon as staff make the change. You can leave it open.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-3.5 pb-20">
      {/* Top Bar: Judge Identity Selector & Submissions Pill (MSP-29) */}
      <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-3 flex flex-wrap items-center justify-between gap-2 shadow-tac-xs">
        {lockedJudgeId === undefined && (
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <UserCheck className="w-4 h-4 shrink-0 text-tac-gold-500" />
          <span className="text-xs text-tac-stone-400">Judge:</span>
          <select
            value={currentJudge?.id}
            onChange={(e) => handleJudgeChange(e.target.value)}
            className="min-w-0 max-w-full bg-tac-ink-950 border border-tac-ink-600 text-tac-gold-400 font-semibold text-xs rounded-xs px-2 py-1 focus:outline-none focus:border-tac-gold-700"
          >
            {judges.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name} {j.boothAssigned ? `(${j.boothAssigned})` : ''}
              </option>
            ))}
          </select>
        </div>
        )}

        {/* My Submissions Counter button (MSP-24) */}
        <button
          onClick={() => setViewingHistory(!viewingHistory)}
          className="flex shrink-0 items-center space-x-1 px-2.5 py-1 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-300 text-xs rounded-xs border border-tac-ink-700 transition-colors"
          title="See and change the scores you have sent"
        >
          <History className="w-3.5 h-3.5 text-tac-gold-400" />
          <span>
            My scores ({mySubmissions.length}/{teams.length})
          </span>
        </button>
      </div>

      {/* History Drawer if open (MSP-24: Low-stakes score correction) */}
      {viewingHistory && (
        <div className="bg-tac-ink-800 p-4 rounded-sm border border-tac-gold-700/60 space-y-2 animate-fade-in shadow-tac-md">
          <div className="flex items-center justify-between pb-2 border-b border-tac-ink-700">
            <h4 className="text-xs font-display font-bold uppercase tracking-wider text-tac-gold-400">
              My scores: tap a team to change its score
            </h4>
            <button
              onClick={() => setViewingHistory(false)}
              className="text-xs text-tac-stone-400 hover:text-white px-1.5 py-0.5 rounded-xs"
            >
              ✕ Close
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {teams.map((team) => {
              const sub = mySubmissions.find((s) => s.teamId === team.id);
              return (
                <div
                  key={team.id}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setViewingHistory(false);
                  }}
                  className={`p-2 rounded-xs border flex items-center justify-between cursor-pointer transition-colors ${
                    team.id === selectedTeamId
                      ? 'bg-tac-ink-950 border-tac-gold-600'
                      : 'bg-tac-ink-900 border-tac-ink-700 hover:bg-tac-ink-950'
                  }`}
                >
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {team.name}
                    </span>
                    <span className="text-[10px] text-tac-stone-400">
                      {team.boothCategory} • {teamRegion(team) || 'School needed'}
                    </span>
                  </div>
                  {sub ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-tac-gold-400">
                        {sub.rawTotal} pts
                      </span>
                      <span className="px-1.5 py-0.5 bg-green-950 text-green-400 border border-green-800 text-[10px] rounded-xs font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Submitted</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-amber-400/80 italic">Pending score</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky Team Header (MSP-21: Large Type Visible Without Scrolling).
          Offset = app header height: 4px gold bar + h-16/h-20 + 1px border. */}
      <div className="sticky top-[69px] sm:top-[85px] z-40 bg-tac-ink-950 border-2 border-tac-gold-700/80 rounded-sm p-3.5 shadow-tac-lg text-center space-y-1">
        <div className="flex items-center justify-between text-[11px] text-tac-stone-400">
          <span className="uppercase tracking-widest text-tac-gold-500 font-bold">
            {activeRound.name}
          </span>
          {activeRound.status === 'live' ? (
            <span className="inline-flex items-center space-x-1 text-green-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              <span>LIVE</span>
            </span>
          ) : (
            <span className="text-tac-stone-500 uppercase">{activeRound.status}</span>
          )}
        </div>

        {/* TEAM NAME IN LARGE DISPLAY TYPOGRAPHY (MSP-21) */}
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide uppercase pt-0.5">
          {selectedTeam?.name}
        </h1>

        <div className="flex items-center justify-center space-x-2 text-xs text-tac-stone-300 font-light">
          <span>{selectedTeam?.boothCategory}</span>
          <span>•</span>
          <span className="font-semibold text-tac-gold-400">{teamRegion(selectedTeam) || 'School needed'}</span>
        </div>

        {/* Regional Bonus Banner if applied (MSP-35) */}
        {isWinningRegion && (
          <div className="mt-1 inline-flex items-center space-x-1 bg-tac-gold-950 text-tac-gold-300 border border-tac-gold-700/60 px-2.5 py-0.5 rounded-xs text-[11px]">
            <Award className="w-3 h-3 text-tac-gold-500" />
            <span>Give Classic bonus ({competition.winningRegion}): <strong>+5 points added once by staff</strong></span>
          </div>
        )}

        {/* Story F: the staff-controlled finale timer. Round 1 has none. */}
        {activeRound.roundType === 'finale' && activeRound.status === 'live' && (
          <JudgeFinaleTimer submitted={!!submissionReceipt} />
        )}

        {/* Horizontal Quick-Select Team Strip with Submission Status */}
        <div className="pt-2 flex items-center justify-start sm:justify-center space-x-1 overflow-x-auto pb-1">
          {teams.map((t, idx) => {
            const hasScored = mySubmissions.some((s) => s.teamId === t.id);
            const isSelected = t.id === selectedTeam.id;

            return (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                className={`px-2.5 py-1 text-xs rounded-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 shrink-0 ${
                  isSelected
                    ? 'bg-tac-gold-700 text-tac-ink-900 shadow-tac-xs'
                    : hasScored
                    ? 'bg-tac-ink-900 text-green-400 border border-green-800/60'
                    : 'bg-tac-ink-900 text-tac-stone-400 hover:text-white'
                }`}
              >
                <span>#{idx + 1} {t.name.split(' ')[0]}</span>
                {hasScored && <CheckCircle2 className="w-3 h-3 text-green-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scorecard (MSP-22): every criterion and its point range at a glance.
          Tap a row to jump to it. Point definitions stay on each criterion below. */}
      <nav aria-label="Scorecard" className="bg-tac-ink-900 border border-tac-ink-700 rounded-sm divide-y divide-tac-ink-800">
        {activeRound.rubric.criteria.map((c, i) => {
          const val = scores[c.id];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => jumpTo(c.id)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-tac-ink-800 transition-colors"
            >
              <span className="text-[10px] font-mono font-bold text-tac-gold-500 w-4 shrink-0">{i + 1}</span>
              <span className="flex-1 min-w-0 truncate text-xs text-tac-stone-200">{c.title}</span>
              <span className="text-[10px] text-tac-stone-500 shrink-0">0 to {c.maxPoints}</span>
              <span
                className={`w-9 text-right text-xs font-display font-black shrink-0 ${
                  val === undefined ? 'text-tac-stone-600' : 'text-tac-gold-400'
                }`}
              >
                {val === undefined ? '-' : val}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Confirmation Receipt Banner (MSP-23) */}
      {submissionReceipt && (
        <div
          className={`p-3.5 rounded-sm text-xs space-y-1 shadow-tac-md animate-fade-in border ${
            refused ? 'bg-red-950/90 border-red-600 text-red-200' : 'bg-green-950/90 border-green-700 text-green-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {refused ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              )}
              <span className="font-bold text-white text-sm">
                {refused ? 'Not saved' : 'Score saved'}
              </span>
            </div>
            <span className="text-[10px] text-green-300 font-mono">
              {new Date(submissionReceipt.updatedAt || submissionReceipt.submittedAt).toLocaleTimeString()}
            </span>
          </div>
          {!refused && (
            <p className="text-green-300">
              Recorded <strong>{submissionReceipt.rawTotal} / {maxPossible} points</strong> for{' '}
              <strong>{selectedTeam.name}</strong>.
            </p>
          )}
          {cloud.enabled && sendState && (
            <p role="status" className={sendState === 'failed' ? 'text-red-300 font-semibold' : 'text-green-300'}>
              {sendState === 'sending' && 'Saved on this phone, sending to staff. It sends by itself when there is signal.'}
              {sendState === 'sent' && 'Sent to staff.'}
              {sendState === 'failed' && `Your score for ${selectedTeam.name} was not saved. Show this screen to staff.`}
            </p>
          )}

          {/* One-Tap Auto Advance to Next Team */}
          {nextTeam && !refused && (
            <div className="pt-2 border-t border-green-800/80 flex items-center justify-between">
              <span className="text-[11px] text-green-300">Ready for the next pitch?</span>
              <button
                type="button"
                onClick={() => setSelectedTeamId(nextTeam.id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-bold text-xs rounded-xs shadow-tac-xs transition-colors"
              >
                <span>Score Next: {nextTeam.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scoring Form with Thumb-Friendly Controls (MSP-10, MSP-12, MSP-22) */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {activeRound.rubric.criteria.map((criterion, index) => {
          const currentScore = scores[criterion.id] ?? 0;

          // Quick preset buttons (e.g. 10, 8, 6, 4, 2 for a 10-point scale)
          const presets = [
            criterion.maxPoints,
            Math.round(criterion.maxPoints * 0.8),
            Math.round(criterion.maxPoints * 0.6),
            Math.round(criterion.maxPoints * 0.4),
            Math.round(criterion.maxPoints * 0.2),
          ];

          return (
            <div
              key={criterion.id}
              id={`criterion-${criterion.id}`}
              className="scroll-mt-[230px] sm:scroll-mt-[260px] bg-tac-ink-900 rounded-sm border border-tac-ink-700 p-4 space-y-3 hover:border-tac-gold-700/60 transition-colors shadow-tac-xs"
            >
              {/* Category Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-tac-gold-500 block">
                    CATEGORY 0{index + 1}
                  </span>
                  <h3 className="font-display font-bold text-sm text-tac-stone-100">
                    {criterion.title}
                  </h3>
                </div>

                {/* Tactile Thumb Stepper Controls (MSP-10: supports >10 pts) */}
                <div className="flex items-center space-x-1.5 bg-tac-ink-950 p-1 rounded-xs border border-tac-ink-700">
                  <button
                    type="button"
                    onClick={() => handleScoreAdjust(criterion.id, -1, criterion.maxPoints)}
                    disabled={currentScore <= 0}
                    className="w-8 h-8 rounded-xs bg-tac-ink-800 hover:bg-tac-ink-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors active:scale-95"
                    aria-label="Decrease score"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="w-12 text-center">
                    {/* Typed entry (MSP-10). Text + numeric keypad rather than type="number",
                        which changes value on scroll-wheel and shows spinners. */}
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={currentScore}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleScoreTyped(criterion.id, e.target.value, criterion.maxPoints)}
                      onKeyDown={(e) => {
                        // Enter (phone "Go") must not submit the whole score sheet
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      aria-label={`Score for ${criterion.title}, 0 to ${criterion.maxPoints}`}
                      className="w-full font-display font-black text-base text-tac-gold-400 text-center bg-transparent border-b border-tac-ink-600 hover:border-tac-gold-700 focus:border-tac-gold-500 focus:outline-none rounded-none p-0 leading-tight"
                    />
                    <span className="text-[9px] text-tac-stone-500 uppercase block -mt-0.5">
                      /{criterion.maxPoints}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleScoreAdjust(criterion.id, 1, criterion.maxPoints)}
                    disabled={currentScore >= criterion.maxPoints}
                    className="w-8 h-8 rounded-xs bg-tac-gold-700 hover:bg-tac-gold-600 disabled:opacity-30 disabled:cursor-not-allowed text-tac-ink-900 flex items-center justify-center transition-colors active:scale-95 shadow-tac-xs"
                    aria-label="Increase score"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick-Tap Presets Strip */}
              <div className="flex items-center space-x-1 pt-1">
                <span className="text-[10px] text-tac-stone-500 uppercase mr-1">Quick:</span>
                {presets.map((pt, pIdx) => (
                  <button
                    key={`${pt}-${pIdx}`}
                    type="button"
                    onClick={() => handleScoreDirect(criterion.id, pt)}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-xs border transition-colors ${
                      currentScore === pt
                        ? 'bg-tac-gold-700 border-tac-gold-600 text-tac-ink-900'
                        : 'bg-tac-ink-950 border-tac-ink-800 text-tac-stone-400 hover:text-white'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>

              {/* Inline Rubric Guidance ("What You're Listening For" - MSP-12) */}
              <div className="bg-tac-ink-950/80 p-2.5 rounded-xs border-l-2 border-tac-gold-600 text-xs text-tac-stone-300">
                <span className="text-[10px] text-tac-gold-400 uppercase font-semibold block mb-0.5">
                  What You're Listening For:
                </span>
                <p className="italic text-tac-stone-300 leading-relaxed">{criterion.description}</p>
              </div>

              {/* Point definitions, always visible (MSP-12) */}
              <JudgeBandStrip bands={criterion.scaleAnchors} score={currentScore} />
            </div>
          );
        })}

        {/* Constructive Founder Feedback Section */}
        <div className="bg-tac-ink-900 rounded-sm border border-tac-ink-700 p-4 space-y-3">
          <div className="flex items-center space-x-1.5 text-xs text-tac-gold-400 font-semibold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Feedback for the founders (optional)</span>
          </div>

          <div>
            <label className="text-[11px] text-tac-stone-400 block mb-1">
              One thing that worked well:
            </label>
            <input
              type="text"
              value={feedbackWorked}
              onChange={(e) => setFeedbackWorked(e.target.value)}
              placeholder="Specific strength, persuasive market data, confident delivery..."
              className="w-full bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-3 py-2 text-xs text-white focus:outline-none focus:border-tac-gold-700"
            />
          </div>

          <div>
            <label className="text-[11px] text-tac-stone-400 block mb-1">
              One thing that would make it stronger:
            </label>
            <input
              type="text"
              value={feedbackImprove}
              onChange={(e) => setFeedbackImprove(e.target.value)}
              placeholder="Competitive differentiation, clearer customer persona, traction..."
              className="w-full bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-3 py-2 text-xs text-white focus:outline-none focus:border-tac-gold-700"
            />
          </div>
        </div>

        {/* Sticky Mobile Submit Bar with Next Team Action (MSP-23, MSP-24) */}
        <div className="sticky bottom-2 z-40 bg-tac-ink-950 border-2 border-tac-gold-700/80 rounded-sm shadow-tac-lg">
          {barStatus && (
            <div
              role="status"
              className={`flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-semibold border-b ${
                barStatus.tone === 'ok'
                  ? 'bg-green-950 text-green-300 border-green-800'
                  : barStatus.tone === 'bad'
                  ? 'bg-red-950 text-red-200 border-red-700'
                  : 'bg-tac-gold-950 text-tac-gold-300 border-tac-gold-800'
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {barStatus.tone === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                {barStatus.tone === 'bad' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span className="truncate">{barStatus.text}</span>
              </span>
              {barStatus.tone === 'ok' && nextTeam && (
                <button
                  type="button"
                  onClick={() => setSelectedTeamId(nextTeam.id)}
                  className="shrink-0 flex items-center gap-1 text-tac-gold-300 hover:text-white underline underline-offset-2"
                >
                  Next: {nextTeam.name.split(' ')[0]}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-tac-stone-400 uppercase tracking-wider block">
              Total Score
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-display font-black text-2xl text-tac-gold-400">
                {finalTally}
              </span>
              <span className="text-xs text-tac-stone-400 font-medium">
                / {maxPossible} pts
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-3 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-display font-bold text-xs uppercase tracking-wider rounded-xs shadow-tac-md transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Update Score' : 'Submit Score'}</span>
          </button>
          </div>
        </div>
      </form>
    </div>
  );
};
