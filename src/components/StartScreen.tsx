import React from 'react';
import { Smartphone, Lock } from 'lucide-react';

const BRAND = `${import.meta.env.BASE_URL}brand/`;

interface StartScreenProps {
  competitionName: string;
  onJudge: () => void;
  onStaff: () => void;
}

// MSP-46: the first screen anyone sees. Judges never see the staff passcode box.
export const StartScreen: React.FC<StartScreenProps> = ({ competitionName, onJudge, onStaff }) => (
  <div className="min-h-screen bg-tac-ink-900 text-tac-stone-100 flex flex-col font-body">
    <div className="h-1 bg-gradient-to-r from-tac-gold-500 via-tac-gold-800 to-tac-gold-600 w-full" />
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-8 text-center">
        <img src={`${BRAND}tac-logo-light.png`} alt="The Alabama Collective" className="h-14 w-auto mx-auto" />
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-tac-gold-500 font-bold">Scoring</p>
          <h1 className="font-display font-black text-xl text-white">{competitionName}</h1>
        </div>
        <div className="space-y-3">
          <button
            onClick={onJudge}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-display font-bold text-base rounded-sm shadow-tac-md transition-colors"
          >
            <Smartphone className="w-5 h-5" />
            I'm a judge
          </button>
          <button
            onClick={onStaff}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-tac-ink-800 hover:bg-tac-ink-700 text-tac-stone-200 font-semibold text-sm rounded-sm border border-tac-ink-600 transition-colors"
          >
            <Lock className="w-4 h-4 text-tac-gold-500" />
            Staff
          </button>
        </div>
      </div>
    </main>
  </div>
);
