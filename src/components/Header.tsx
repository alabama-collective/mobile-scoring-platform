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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xs bg-tac-ink-800 border border-tac-gold-700/60 flex items-center justify-center text-tac-gold-500 shadow-inner">
              <Sparkles className="w-5 h-5 text-tac-gold-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-sm sm:text-base tracking-widest text-tac-stone-100 uppercase">
                  The Alabama Collective
                </span>
                <span className="bg-tac-gold-800/30 text-tac-gold-400 border border-tac-gold-700/50 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-xs tracking-wider">
                  Full Platform
                </span>
              </div>
              <p className="text-xs text-tac-stone-400 font-light truncate max-w-[180px] sm:max-w-md">
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
          <nav className="flex space-x-1 sm:space-x-1.5">
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xs text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'bg-tac-gold-800 text-white font-semibold shadow-tac-sm'
                  : 'text-tac-stone-300 hover:text-white hover:bg-tac-ink-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-tac-gold-400" />
              <span className="hidden sm:inline">Coordinator</span> Admin
            </button>

            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xs text-xs sm:text-sm font-medium transition-colors relative ${
                activeTab === 'live'
                  ? 'bg-tac-gold-800 text-white font-semibold shadow-tac-sm'
                  : 'text-tac-stone-300 hover:text-white hover:bg-tac-ink-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-tac-gold-400" />
              <span>Live Results</span>
              {liveSubmissionsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-green-500 text-black text-[10px] font-black rounded-full">
                  {liveSubmissionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('judge')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xs text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'judge'
                  ? 'bg-tac-gold-800 text-white font-semibold shadow-tac-sm'
                  : 'text-tac-stone-300 hover:text-white hover:bg-tac-ink-800'
              }`}
            >
              <Smartphone className="w-4 h-4 text-tac-circuit-cyan" />
              <span>Judge <span className="hidden sm:inline">Scoring</span></span>
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xs text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'bg-tac-gold-800 text-white font-semibold shadow-tac-sm'
                  : 'text-tac-stone-300 hover:text-white hover:bg-tac-ink-800'
              }`}
            >
              <FolderGit2 className="w-4 h-4 text-tac-gold-500" />
              <span className="hidden md:inline">Templates</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
