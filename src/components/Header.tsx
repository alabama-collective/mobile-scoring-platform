import React from 'react';
import { ShieldCheck, Smartphone, FolderGit2, Sparkles, Award, BarChart3 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'admin' | 'live' | 'judge' | 'templates';
  setActiveTab: (tab: 'admin' | 'live' | 'judge' | 'templates') => void;
  competitionName: string;
  hasWinningRegion: boolean;
  winningRegionName?: string;
  liveSubmissionsCount?: number;
}

// Tabs stack icon over a short label on phones and tablets, sit inline from
// md, and show their full names from lg. The full name is always the
// accessible name (aria-label), so screen readers and tests are unaffected.
const tabClass = (active: boolean) =>
  `relative flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-1.5 min-w-[3.25rem] px-1.5 md:px-3 py-1 md:py-2 rounded-xs text-[10px] md:text-sm font-medium leading-tight transition-colors ${
    active
      ? 'bg-tac-gold-800 text-white font-semibold shadow-tac-sm'
      : 'text-tac-stone-300 hover:text-white hover:bg-tac-ink-800'
  }`;

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  competitionName,
  hasWinningRegion,
  winningRegionName,
  liveSubmissionsCount = 0,
}) => {
  return (
    <header className="bg-tac-ink-900 border-b border-tac-ink-700 sticky top-0 z-50 shadow-tac-md">
      {/* Top Gold Accent Bar */}
      <div className="h-1 bg-gradient-to-r from-tac-gold-500 via-tac-gold-800 to-tac-gold-600 w-full" />

      {/* Height stays h-16 / sm:h-20: the judge screen's sticky team banner sits directly below it */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16 sm:h-20">
          {/* Brand Identity: "TAC" on phones, full name from sm */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xs bg-tac-ink-800 border border-tac-gold-700/60 flex items-center justify-center text-tac-gold-500 shadow-inner">
              <Sparkles className="w-5 h-5 text-tac-gold-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="font-display font-bold text-sm sm:text-base tracking-widest text-tac-stone-100 uppercase whitespace-nowrap"
                  aria-label="The Alabama Collective"
                >
                  <span className="sm:hidden" aria-hidden="true">TAC</span>
                  <span className="hidden sm:inline" aria-hidden="true">The Alabama Collective</span>
                </span>
                <span className="hidden lg:inline bg-tac-gold-800/30 text-tac-gold-400 border border-tac-gold-700/50 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-xs tracking-wider whitespace-nowrap">
                  Full Platform
                </span>
              </div>
              <p className="hidden sm:block text-xs text-tac-stone-400 font-light truncate max-w-md">
                {competitionName}
              </p>
            </div>
          </div>

          {/* Regional Bonus Banner */}
          {hasWinningRegion && winningRegionName && (
            <div className="hidden xl:flex items-center space-x-2 bg-tac-gold-900/40 border border-tac-gold-700/60 text-tac-gold-300 px-3 py-1 rounded-xs text-xs">
              <Award className="w-4 h-4 text-tac-gold-500" />
              <span>Gift Classic: <strong>+5 pts to {winningRegionName}</strong></span>
            </div>
          )}

          {/* Navigation / Role Switcher */}
          <nav className="flex shrink-0 gap-0.5 sm:gap-1">
            <button
              onClick={() => setActiveTab('admin')}
              aria-label="Coordinator Admin"
              className={tabClass(activeTab === 'admin')}
            >
              <ShieldCheck className="w-4 h-4 text-tac-gold-400" />
              <span className="whitespace-nowrap">
                <span className="hidden lg:inline">Coordinator </span>Admin
              </span>
            </button>

            <button
              onClick={() => setActiveTab('live')}
              aria-label={liveSubmissionsCount > 0 ? `Live Results (${liveSubmissionsCount} submitted)` : 'Live Results'}
              className={tabClass(activeTab === 'live')}
            >
              <BarChart3 className="w-4 h-4 text-tac-gold-400" />
              <span className="whitespace-nowrap">
                <span className="hidden lg:inline">Live </span>Results
              </span>
              {liveSubmissionsCount > 0 && (
                <span className="absolute -top-1 -right-1 md:static md:ml-1 px-1.5 py-0.2 bg-green-500 text-black text-[10px] font-black rounded-full">
                  {liveSubmissionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('judge')}
              aria-label="Judge Scoring"
              className={tabClass(activeTab === 'judge')}
            >
              <Smartphone className="w-4 h-4 text-tac-circuit-cyan" />
              <span className="whitespace-nowrap">
                Judge<span className="hidden lg:inline"> Scoring</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              aria-label="Templates"
              className={tabClass(activeTab === 'templates')}
            >
              <FolderGit2 className="w-4 h-4 text-tac-gold-500" />
              <span className="whitespace-nowrap">Templates</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
