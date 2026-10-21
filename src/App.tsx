import React, { useState, useEffect } from 'react';
import { Competition, Rubric, RoundStatus, RubricTemplate } from './types';
import { storageService, DATA_CHANGED_EVENT } from './services/storageService';
import { useCloudState, staffSignOut } from './services/cloud';
import { StaffSignIn } from './components/StaffSignIn';
import { StartScreen } from './components/StartScreen';
import { JudgeHeader, JudgingNotStarted, JudgeNamePicker, RoundPicker } from './components/JudgeShell';
import { Header } from './components/Header';
import { RoundManager } from './components/RoundManager';
import { RubricBuilder } from './components/RubricBuilder';
import { RegionalBonusPanel } from './components/RegionalBonusPanel';
import { TemplateManager } from './components/TemplateManager';
import { JudgeScoringPortal } from './components/JudgeScoringPortal';
import { LiveSubmissionBoard } from './components/LiveSubmissionBoard';
import { JudgeRosterManager } from './components/JudgeRosterManager';
import { TeamEditor } from './components/TeamEditor';
import { renameBooth, isFinaleJudge, setBoothDetails, boothLabel } from './services/booths';
import { RotateCcw, Calendar, MapPin, User, LogOut } from 'lucide-react';

type Mode = 'start' | 'judge' | 'staff';
const MODE_KEY = 'tac_mode_v1';
const JUDGE_KEY = 'tac_current_judge_id';
const JUDGE_ROUND_KEY = 'tac_judge_round_v1';
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage blocked: the choice just is not remembered */
  }
};

// MSP-46: #/judge goes straight to the judge flow, #/staff to staff. Otherwise
// a phone comes back to where it was (a judge stays a judge after a refresh).
const initialMode = (): Mode => {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (hash === '#/judge' || (typeof window !== 'undefined' && window.location.search.includes('mode=judge'))) return 'judge';
  if (hash === '#/staff') return 'staff';
  const saved = read(MODE_KEY);
  return saved === 'judge' || saved === 'staff' ? saved : 'start';
};

export const App: React.FC = () => {
  const [mode, setModeState] = useState<Mode>(initialMode);
  const setMode = (m: Mode) => {
    setModeState(m);
    write(MODE_KEY, m === 'start' ? null : m);
  };
  const [judgeId, setJudgeIdState] = useState<string | null>(() => read(JUDGE_KEY));
  const setJudgeId = (id: string | null) => {
    setJudgeIdState(id);
    write(JUDGE_KEY, id);
  };
  const [judgeRoundId, setJudgeRoundIdState] = useState<string | null>(() => read(JUDGE_ROUND_KEY));
  const setJudgeRoundId = (id: string | null) => {
    setJudgeRoundIdState(id);
    write(JUDGE_ROUND_KEY, id);
  };
  const [competition, setCompetition] = useState<Competition>(() => storageService.getCompetition());
  const [templates, setTemplates] = useState<RubricTemplate[]>(() => storageService.getTemplates());
  const [activeTab, setActiveTab] = useState<'admin' | 'live' | 'judge' | 'templates'>('admin');
  const [activeRoundId, setActiveRoundId] = useState<string>(() => {
    const comp = storageService.getCompetition();
    const liveRound = comp.rounds.find((r) => r.status === 'live');
    return liveRound ? liveRound.id : comp.rounds[0]?.id || 'round-1';
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const cloud = useCloudState();

  // MSP-45: another device changed the shared data, so re-read the local copy.
  useEffect(() => {
    const onChanged = () => {
      setCompetition(storageService.getCompetition());
      setTemplates(storageService.getTemplates());
      setRefreshTrigger((prev) => prev + 1);
    };
    window.addEventListener(DATA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, onChanged);
  }, []);

  // Staff screens need the staff passcode once the shared database is on.
  const needsStaff = cloud.enabled && !cloud.isStaff;


  const updateCompetition = (updated: Competition) => {
    setCompetition(updated);
    storageService.saveCompetition(updated);
  };

  const activeRound =
    competition.rounds.find((r) => r.id === activeRoundId) || competition.rounds[0];

  const handleUpdateRubric = (newRubric: Rubric) => {
    const updatedRounds = competition.rounds.map((r) =>
      r.id === activeRoundId ? { ...r, rubric: newRubric } : r
    );
    updateCompetition({ ...competition, rounds: updatedRounds });
  };

  const handleUpdateRoundStatus = (roundId: string, status: RoundStatus) => {
    const updatedComp = storageService.setRoundStatus(roundId, status);
    setCompetition({ ...updatedComp });
  };

  const handleCloneRound1 = () => {
    const cloned = storageService.copyRound1ToRound2();
    if (cloned) {
      const refreshed = storageService.getCompetition();
      setCompetition(refreshed);
      setActiveRoundId(cloned.id);
    }
  };

  const handleUpdateBoothCategories = (roundId: string, categories: string[]) => {
    const updatedRounds = competition.rounds.map((r) =>
      r.id === roundId
        ? {
            ...r,
            boothCategories: categories,
            // A removed booth's category and location go with it.
            ...(r.boothDetails
              ? { boothDetails: Object.fromEntries(Object.entries(r.boothDetails).filter(([b]) => categories.includes(b))) }
              : {}),
          }
        : r
    );
    updateCompetition({ ...competition, rounds: updatedRounds });
  };

  const handleBoothDetails = (booth: string, details: { category?: string; location?: string }) => {
    updateCompetition(setBoothDetails(competition, booth, details));
  };

  const handleRenameBooth = (from: string, to: string) => {
    updateCompetition(renameBooth(competition, from, to));
  };

  const handleSelectWinningRegion = (regionName: string | undefined) => {
    const updated = storageService.setWinningRegionBonus(regionName);
    setCompetition({ ...updated });
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSaveAsTemplate = (name: string, description: string) => {
    storageService.saveTemplate({
      name,
      description,
      rounds: JSON.parse(JSON.stringify(competition.rounds)),
      teams: JSON.parse(JSON.stringify(competition.teams)),
      judges: JSON.parse(JSON.stringify(competition.judges)),
    });
    setTemplates(storageService.getTemplates());
  };

  const handleApplyTemplate = (templateId: string) => {
    const updated = storageService.applyTemplateToCompetition(templateId);
    if (updated) {
      setCompetition({ ...updated });
      if (updated.rounds[0]) {
        setActiveRoundId(updated.rounds[0].id);
      }
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    storageService.deleteTemplate(templateId);
    setTemplates(storageService.getTemplates());
  };

  // MSP-34 with story A: the confirm guard, booth winners and finalists.
  const handleFinalizeRound = (signedBy: string, opts: { reason?: string; tieWinners?: Record<string, string> }) => {
    const result = storageService.confirmResults(activeRound.id, signedBy, opts);
    if (result.ok) {
      setCompetition(storageService.getCompetition());
      setRefreshTrigger((prev) => prev + 1);
    }
    return result;
  };

  const handleSwapFinalist = (booth: string, teamId: string) => {
    const ok = storageService.swapFinalist(booth, teamId);
    if (ok) {
      setCompetition(storageService.getCompetition());
      setRefreshTrigger((prev) => prev + 1);
    }
    return ok;
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        'Reset all competition settings, rubrics, submissions, and judge rosters to official defaults?'
      )
    ) {
      const reset = storageService.resetToDefaults();
      setCompetition(reset);
      setTemplates(storageService.getTemplates());
      setActiveRoundId(reset.rounds[0]?.id || 'round-1');
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const allSubmissions = storageService
    .getAllSubmissions()
    .filter((s) => s.roundId === activeRound?.id);

  // ---- MSP-46: start screen -------------------------------------------------
  if (mode === 'start') {
    return <StartScreen competitionName={competition.name} onJudge={() => setMode('judge')} onStaff={() => setMode('staff')} />;
  }

  // ---- MSP-46 / MSP-03: judge flow. Always the live round, never a draft. ----
  if (mode === 'judge') {
    const judge = competition.judges.find((j) => j.id === judgeId);
    // Steph's story D: Round 1 judges only ever see Round 1, finale judges
    // only the finale. Before their round opens they see "not started yet".
    const liveRounds = competition.rounds.filter(
      (r) => r.status === 'live' && (!judge || (r.roundType === 'finale') === isFinaleJudge(judge))
    );
    const judgeRound =
      liveRounds.length === 1 ? liveRounds[0] : liveRounds.find((r) => r.id === judgeRoundId) || null;
    let body: React.ReactNode;
    if (!judge)
      body = (
        <JudgeNamePicker judges={competition.judges} onPick={(id) => setJudgeId(id)} labelFor={(b) => boothLabel(competition, b)} />
      );
    else if (liveRounds.length === 0) body = <JudgingNotStarted competition={competition} />;
    else if (!judgeRound) body = <RoundPicker rounds={liveRounds} onPick={(id) => setJudgeRoundId(id)} />;
    else
      body = (
        <JudgeScoringPortal
          key={`${judgeRound.id}-${judge.id}`}
          competition={competition}
          activeRound={judgeRound}
          lockedJudgeId={judge.id}
          onScoreSubmitted={() => setRefreshTrigger((prev) => prev + 1)}
        />
      );
    return (
      <div className="min-h-screen bg-tac-ink-900 text-tac-stone-100 flex flex-col font-body">
        <JudgeHeader judge={judge} onNotYou={judge ? () => setJudgeId(null) : undefined} />
        <main className="flex-1 w-full mx-auto px-4 py-5 space-y-4">{body}</main>
        <footer className="py-6 text-center">
          <button onClick={() => setMode('start')} className="text-xs text-tac-stone-500 hover:text-tac-stone-300 underline underline-offset-2">
            Staff? Go to the start screen
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tac-ink-900 text-tac-stone-100 flex flex-col font-body selection:bg-tac-gold-800 selection:text-white">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        competitionName={competition.name}
        hasWinningRegion={competition.bonusPointsApplied}
        winningRegionName={competition.winningRegion}
        liveSubmissionsCount={allSubmissions.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Event Context Header */}
        <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-tac-gold-500 bg-tac-gold-950/80 px-2 py-0.5 rounded-xs border border-tac-gold-800/80">
                Official Event Platform
              </span>
              <h1 className="font-display font-black text-base sm:text-xl text-white tracking-wide">
                {competition.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-tac-stone-400 mt-2 font-light">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-tac-gold-500" />
                <span>{competition.date}</span>
              </span>
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-tac-gold-500" />
                <span>{competition.location}</span>
              </span>
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-tac-gold-500" />
                <span>Director: {competition.programDirector}</span>
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {cloud.enabled && (
              <span
                role="status"
                className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold border ${
                  cloud.error
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : cloud.connected
                    ? 'bg-green-950/80 text-green-300 border-green-800'
                    : 'bg-tac-gold-950/80 text-tac-gold-300 border-tac-gold-800'
                }`}
              >
                {cloud.error
                  ? cloud.error
                  : cloud.connected
                  ? 'Shared: up to date'
                  : 'Offline: changes send when back online'}
              </span>
            )}
            {cloud.isStaff && (
              <button
                onClick={() => {
                  void staffSignOut();
                  setMode('start');
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-400 hover:text-tac-stone-200 text-xs rounded-xs border border-tac-ink-700 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Staff sign out</span>
              </button>
            )}
            {/* Resetting would overwrite the shared copy for every device, so only offer it on this-device-only mode. */}
            {!cloud.enabled && (
            <button
              onClick={handleResetDefaults}
              className="flex items-center space-x-1 px-3 py-1.5 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-400 hover:text-tac-stone-200 text-xs rounded-xs border border-tac-ink-700 transition-colors"
              title="Reset all data to official Topgolf Birmingham defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            )}
          </div>
        </div>

        {needsStaff && activeTab !== 'judge' && <StaffSignIn onBack={() => setMode('start')} />}

        {/* Tab 1: Coordinator Admin (Epic 1 + Roster Management) */}
        {activeTab === 'admin' && !needsStaff && (
          <div className="space-y-6 animate-fade-in">
            {/* Round Management & Cloner */}
            <RoundManager
              rounds={competition.rounds}
              activeRoundId={activeRoundId}
              onSelectRound={(id) => setActiveRoundId(id)}
              onUpdateRoundStatus={handleUpdateRoundStatus}
              onCloneRound1ToRound2={handleCloneRound1}
              onUpdateBoothCategories={handleUpdateBoothCategories}
              onRenameBooth={handleRenameBooth}
              onBoothDetails={handleBoothDetails}
              competition={competition}
            />

            {/* Rubric Builder with Custom Scales & Inline Prompts */}
            {activeRound && (
              <RubricBuilder
                round={activeRound}
                onUpdateRubric={handleUpdateRubric}
              />
            )}

            {/* Judge Roster (MSP-05, MSP-19) */}
            <JudgeRosterManager
              competition={competition}
              onUpdateCompetition={setCompetition}
              onSwitchToJudgeView={() => setActiveTab('judge')}
            />

            {/* Team editor (MSP-43) */}
            <TeamEditor competition={competition} onUpdateCompetition={setCompetition} />

            {/* Give Classic Regional Bonus Panel (MSP-35) */}
            <RegionalBonusPanel
              competition={competition}
              onSelectWinningRegion={handleSelectWinningRegion}
            />
          </div>
        )}

        {/* Tab 2: Live Submission & Results Board (Epic 3: MSP-05, MSP-06, MSP-19, MSP-34) */}
        {activeTab === 'live' && activeRound && !needsStaff && (
          <div className="animate-fade-in">
            <LiveSubmissionBoard
              key={refreshTrigger}
              competition={competition}
              activeRound={activeRound}
              onRefreshData={() => setRefreshTrigger((prev) => prev + 1)}
              onFinalizeRound={handleFinalizeRound}
              onSwapFinalist={handleSwapFinalist}
            />
          </div>
        )}

        {/* Tab 3: Dedicated Judge Scoring Portal (Epic 2: MSP-03, MSP-21, MSP-22, MSP-23, MSP-24, MSP-27, MSP-29) */}
        {activeTab === 'judge' && activeRound && (
          <div className="animate-fade-in">
            <JudgeScoringPortal
              competition={competition}
              activeRound={activeRound}
              onScoreSubmitted={() => setRefreshTrigger((prev) => prev + 1)}
            />
          </div>
        )}

        {/* Tab 4: Template Management Engine (MSP-01) */}
        {activeTab === 'templates' && !needsStaff && (
          <div className="animate-fade-in">
            <TemplateManager
              templates={templates}
              activeCompetition={competition}
              onSaveAsTemplate={handleSaveAsTemplate}
              onApplyTemplate={handleApplyTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          </div>
        )}
      </main>

      {/* Brand Footer */}
      <footer className="bg-tac-ink-950 border-t border-tac-ink-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-tac-stone-500 font-light">
          <div className="flex items-center space-x-2">
            <span className="font-display font-bold text-tac-gold-500 tracking-wider">TAC</span>
            <span>•</span>
            <span>Building Tomorrow's Tech Today</span>
          </div>
          <div>
            <span>The Alabama Collective · Mobile Scoring Platform (End-to-End System)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
