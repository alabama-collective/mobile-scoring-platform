import React, { useState, useEffect, useRef } from 'react';
import { Competition, Round, JudgeScoreSubmission } from '../types';
import { storageService } from '../services/storageService';
import { JudgeBandStrip } from './JudgeBandStrip';
import {
  CheckCircle2,
  Award,
  UserCheck,
  Send,
  MessageSquare,
  History,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Plus,
  Minus,
} from 'lucide-react';

interface JudgeScoringPortalProps {
  competition: Competition;
  activeRound: Round;
  onScoreSubmitted?: () => void;
}

export const JudgeScoringPortal: React.FC<JudgeScoringPortalProps> = ({
  competition,
  activeRound,
  onScoreSubmitted,
}) => {
  const judges = competition.judges;
  const teams = competition.teams;

  // Active Judge state
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>(() => {
    return localStorage.getItem('tac_current_judge_id') || judges[0]?.id || '';
  });

  const currentJudge = judges.find((j) => j.id === selectedJudgeId) || judges[0];

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

  // Pitch & Q&A Timer State (Printed packet: 3 min pitch + 3 min Q&A)
  const [timerPhase, setTimerPhase] = useState<'pitch' | 'qa'>('pitch');
  const [timerSeconds, setTimerSeconds] = useState(180); // 3 minutes = 180s
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer Tick Effect
  useEffect(() => {
    if (isTimerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, timerSeconds]);

  const handleTimerToggle = () => {
    setIsTimerActive(!isTimerActive);
  };

  const handleTimerReset = (phase: 'pitch' | 'qa') => {
    setIsTimerActive(false);
    setTimerPhase(phase);
    setTimerSeconds(180);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
      setIsEditing(true);
    } else {
      setScores({});
      setFeedbackWorked('');
      setFeedbackImprove('');
      setSubmissionReceipt(null);
      setIsEditing(false);
    }
    // Reset timer when switching teams
    handleTimerReset('pitch');
  }, [selectedTeamId, selectedJudgeId, activeRound.id]);

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

  const rawTotal = activeRound.rubric.criteria.reduce(
    (acc, c) => acc + (scores[c.id] ?? 0),
    0
  );

  const maxPossible = activeRound.rubric.criteria.reduce((acc, c) => acc + c.maxPoints, 0);

  const isWinningRegion =
    activeRound.roundType === 'booth' &&
    competition.winningRegion &&
    selectedTeam?.region.toLowerCase() === competition.winningRegion.toLowerCase();

  const finalTally = rawTotal + (isWinningRegion ? 5 : 0);

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
    setIsEditing(true);
    if (onScoreSubmitted) onScoreSubmitted();
  };

  const mySubmissions = storageService
    .getAllSubmissions()
    .filter((s) => s.judgeId === currentJudge?.id && s.roundId === activeRound.id);

  return (
    <div className="max-w-xl mx-auto space-y-3.5 pb-20">
      {/* Top Bar: Judge Identity Selector & Submissions Pill (MSP-29) */}
      <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-3 flex items-center justify-between shadow-tac-xs">
        <div className="flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-tac-gold-500" />
          <span className="text-xs text-tac-stone-400">Judge:</span>
          <select
            value={currentJudge?.id}
            onChange={(e) => handleJudgeChange(e.target.value)}
            className="bg-tac-ink-950 border border-tac-ink-600 text-tac-gold-400 font-semibold text-xs rounded-xs px-2 py-1 focus:outline-none focus:border-tac-gold-700"
          >
            {judges.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name} {j.boothAssigned ? `(${j.boothAssigned})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* My Submissions Counter button (MSP-24) */}
        <button
          onClick={() => setViewingHistory(!viewingHistory)}
          className="flex items-center space-x-1 px-2.5 py-1 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-300 text-xs rounded-xs border border-tac-ink-700 transition-colors"
          title="View and revise past submissions (MSP-24)"
        >
          <History className="w-3.5 h-3.5 text-tac-gold-400" />
          <span>
            My Submissions ({mySubmissions.length}/{teams.length})
          </span>
        </button>
      </div>

      {/* History Drawer if open (MSP-24: Low-stakes score correction) */}
      {viewingHistory && (
        <div className="bg-tac-ink-800 p-4 rounded-sm border border-tac-gold-700/60 space-y-2 animate-fade-in shadow-tac-md">
          <div className="flex items-center justify-between pb-2 border-b border-tac-ink-700">
            <h4 className="text-xs font-display font-bold uppercase tracking-wider text-tac-gold-400">
              My Submissions (Tap to Revise Score - MSP-24)
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
                      {team.boothCategory} • {team.region}
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

      {/* Built-in Pitch & Q&A Stopwatch Widget (Printed packet format: 3 min pitch + 3 min Q&A) */}
      <div className="bg-tac-ink-950 border border-tac-ink-700 rounded-sm p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className={`w-4 h-4 ${isTimerActive ? 'text-tac-gold-400 animate-pulse' : 'text-tac-stone-400'}`} />
          <div className="flex items-center space-x-1 bg-tac-ink-900 px-2 py-0.5 rounded-xs border border-tac-ink-800">
            <button
              onClick={() => handleTimerReset('pitch')}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wider transition-colors ${
                timerPhase === 'pitch' ? 'bg-tac-gold-800 text-white' : 'text-tac-stone-400 hover:text-white'
              }`}
            >
              3m Pitch
            </button>
            <button
              onClick={() => handleTimerReset('qa')}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-xs uppercase tracking-wider transition-colors ${
                timerPhase === 'qa' ? 'bg-tac-gold-800 text-white' : 'text-tac-stone-400 hover:text-white'
              }`}
            >
              3m Q&amp;A
            </button>
          </div>
        </div>

        {/* Timer Digits and Controls */}
        <div className="flex items-center space-x-2">
          <span className={`font-mono font-bold text-sm tracking-widest ${
            timerSeconds < 30 ? 'text-red-400 animate-pulse' : 'text-tac-gold-400'
          }`}>
            {formatTime(timerSeconds)}
          </span>

          <button
            onClick={handleTimerToggle}
            className={`p-1.5 rounded-xs text-xs font-bold transition-colors ${
              isTimerActive
                ? 'bg-amber-950 border border-amber-700 text-amber-300'
                : 'bg-tac-gold-800 hover:bg-tac-gold-900 text-white shadow-tac-xs'
            }`}
            title={isTimerActive ? 'Pause' : 'Start'}
          >
            {isTimerActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          <button
            onClick={() => handleTimerReset(timerPhase)}
            className="p-1.5 bg-tac-ink-900 hover:bg-tac-ink-800 border border-tac-ink-700 text-tac-stone-400 hover:text-white rounded-xs"
            title="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sticky Team Header (MSP-21: Large Type Visible Without Scrolling) */}
      <div className="sticky top-16 sm:top-20 z-40 bg-tac-ink-950 border-2 border-tac-gold-700/80 rounded-sm p-3.5 shadow-tac-lg text-center space-y-1">
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
          <span className="font-semibold text-tac-gold-400">{selectedTeam?.region}</span>
        </div>

        {/* Regional Bonus Banner if applied (MSP-35) */}
        {isWinningRegion && (
          <div className="mt-1 inline-flex items-center space-x-1 bg-tac-gold-950 text-tac-gold-300 border border-tac-gold-700/60 px-2.5 py-0.5 rounded-xs text-[11px]">
            <Award className="w-3 h-3 text-tac-gold-500" />
            <span>Gift Classic Bonus: <strong>+5 points added to Round 1</strong></span>
          </div>
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
                    ? 'bg-tac-gold-800 text-white shadow-tac-xs'
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

      {/* Confirmation Receipt Banner (MSP-23) */}
      {submissionReceipt && (
        <div className="p-3.5 bg-green-950/90 border border-green-700 rounded-sm text-green-200 text-xs space-y-1 shadow-tac-md animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span className="font-bold text-white text-sm">
                Score Confirmed (MSP-23)
              </span>
            </div>
            <span className="text-[10px] text-green-300 font-mono">
              {new Date(submissionReceipt.updatedAt || submissionReceipt.submittedAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-green-300">
            Recorded <strong>{submissionReceipt.rawTotal} / {maxPossible} points</strong> for{' '}
            <strong>{selectedTeam.name}</strong>.
          </p>

          {/* One-Tap Auto Advance to Next Team */}
          {nextTeam && (
            <div className="pt-2 border-t border-green-800/80 flex items-center justify-between">
              <span className="text-[11px] text-green-300">Ready for the next pitch?</span>
              <button
                type="button"
                onClick={() => setSelectedTeamId(nextTeam.id)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-bold text-xs rounded-xs shadow-tac-xs transition-colors"
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
              className="bg-tac-ink-900 rounded-sm border border-tac-ink-700 p-4 space-y-3 hover:border-tac-gold-700/60 transition-colors shadow-tac-xs"
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
                    <span className="font-display font-black text-base text-tac-gold-400 block">
                      {currentScore}
                    </span>
                    <span className="text-[9px] text-tac-stone-500 uppercase block -mt-0.5">
                      /{criterion.maxPoints}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleScoreAdjust(criterion.id, 1, criterion.maxPoints)}
                    disabled={currentScore >= criterion.maxPoints}
                    className="w-8 h-8 rounded-xs bg-tac-gold-800 hover:bg-tac-gold-900 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors active:scale-95 shadow-tac-xs"
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
                        ? 'bg-tac-gold-800 border-tac-gold-600 text-white'
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
            <span>Constructive Founder Feedback (Printed Packet Requirement)</span>
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
        <div className="sticky bottom-2 z-40 bg-tac-ink-950 border-2 border-tac-gold-700/80 rounded-sm p-3.5 shadow-tac-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-tac-stone-400 uppercase tracking-wider block">
              Total Score
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-display font-black text-2xl text-tac-gold-400">
                {finalTally}
              </span>
              <span className="text-xs text-tac-stone-400 font-medium">
                / {maxPossible + (isWinningRegion ? 5 : 0)} pts
              </span>
              {isWinningRegion && (
                <span className="text-[10px] text-tac-gold-300 font-semibold bg-tac-gold-900/60 px-1 py-0.5 rounded-xs ml-1">
                  (+5 bonus)
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-3 bg-tac-gold-800 hover:bg-tac-gold-900 text-white font-display font-bold text-xs uppercase tracking-wider rounded-xs shadow-tac-md transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Update Score' : 'Submit Score'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
