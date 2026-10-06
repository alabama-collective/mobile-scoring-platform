import React, { useState, useEffect } from 'react';
import { Competition, Rubric, RoundStatus, RubricTemplate } from './types';
import { storageService } from './services/storageService';
import { Header } from './components/Header';
import { RoundManager } from './components/RoundManager';
import { RubricBuilder } from './components/RubricBuilder';
import { RegionalBonusPanel } from './components/RegionalBonusPanel';
import { TemplateManager } from './components/TemplateManager';
import { JudgeScoringPortal } from './components/JudgeScoringPortal';
import { LiveSubmissionBoard } from './components/LiveSubmissionBoard';
import { JudgeRosterManager } from './components/JudgeRosterManager';
import { RotateCcw, Calendar, MapPin, User } from 'lucide-react';

export const App: React.FC = () => {
  const [competition, setCompetition] = useState<Competition>(() => storageService.getCompetition());
  const [templates, setTemplates] = useState<RubricTemplate[]>(() => storageService.getTemplates());
  const [activeTab, setActiveTab] = useState<'admin' | 'live' | 'judge' | 'templates'>('admin');
  const [activeRoundId, setActiveRoundId] = useState<string>(() => {
    const comp = storageService.getCompetition();
    const liveRound = comp.rounds.find((r) => r.status === 'live');
    return liveRound ? liveRound.id : comp.rounds[0]?.id || 'round-1';
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Direct QR Code URL routing (MSP-03, MSP-29)
  useEffect(() => {
    if (window.location.hash === '#/judge' || window.location.search.includes('mode=judge')) {
      setActiveTab('judge');
    }
  }, []);

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
    const cloned = storageService.duplicateRound('round-1', 'Round 2: Pitch Finale (Clone)');
    if (cloned) {
      const refreshed = storageService.getCompetition();
      setCompetition(refreshed);
      setActiveRoundId(cloned.id);
    }
  };

  const handleUpdateBoothCategories = (roundId: string, categories: string[]) => {
    const updatedRounds = competition.rounds.map((r) =>
      r.id === roundId ? { ...r, boothCategories: categories } : r
    );
    updateCompetition({ ...competition, rounds: updatedRounds });
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

  const handleFinalizeRound = (signedBy: string) => {
    const finalized = storageService.finalizeResults(activeRound.id, signedBy);
    if (finalized) {
      setCompetition(storageService.getCompetition());
      setRefreshTrigger((prev) => prev + 1);
    }
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
          <div className="flex items-center space-x-2 self-start md:self-auto">
            <button
              onClick={handleResetDefaults}
              className="flex items-center space-x-1 px-3 py-1.5 bg-tac-ink-900 hover:bg-tac-ink-700 text-tac-stone-400 hover:text-tac-stone-200 text-xs rounded-xs border border-tac-ink-700 transition-colors"
              title="Reset all data to official Topgolf Birmingham defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Coordinator Admin (Epic 1 + Roster Management) */}
        {activeTab === 'admin' && (
          <div className="space-y-6 animate-fade-in">
            {/* Round Management & Cloner */}
            <RoundManager
              rounds={competition.rounds}
              activeRoundId={activeRoundId}
              onSelectRound={(id) => setActiveRoundId(id)}
              onUpdateRoundStatus={handleUpdateRoundStatus}
              onCloneRound1ToRound2={handleCloneRound1}
              onUpdateBoothCategories={handleUpdateBoothCategories}
            />

            {/* Rubric Builder with Custom Scales & Inline Prompts */}
            {activeRound && (
              <RubricBuilder
                round={activeRound}
                onUpdateRubric={handleUpdateRubric}
              />
            )}

            {/* Judge Roster & Single Event QR Code (MSP-03, MSP-29) */}
            <JudgeRosterManager
              competition={competition}
              onUpdateCompetition={setCompetition}
              onSwitchToJudgeView={() => setActiveTab('judge')}
            />

            {/* Gift Classic Regional Bonus Panel (MSP-35) */}
            <RegionalBonusPanel
              competition={competition}
              onSelectWinningRegion={handleSelectWinningRegion}
            />
          </div>
        )}

        {/* Tab 2: Live Submission & Results Board (Epic 3: MSP-05, MSP-06, MSP-19, MSP-34) */}
        {activeTab === 'live' && activeRound && (
          <div className="animate-fade-in">
            <LiveSubmissionBoard
              key={refreshTrigger}
              competition={competition}
              activeRound={activeRound}
              onRefreshData={() => setRefreshTrigger((prev) => prev + 1)}
              onFinalizeRound={handleFinalizeRound}
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
        {activeTab === 'templates' && (
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
