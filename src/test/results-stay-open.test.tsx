import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';

// Found in the Oct 20 walkthrough: the results screen was rebuilt on every data
// change, so a message or an open window vanished the moment anything saved.
// All team and judge names are made up.
const comp = () => storageService.getCompetition();
const id = (name: string) => comp().teams.find((t) => t.name === name)!.id;
const score = (judge: string, team: string, pts: number) => {
  const j = comp().judges.find((x) => x.name === judge)!;
  storageService.submitJudgeScore({
    judgeId: j.id,
    judgeName: j.name,
    teamId: id(team),
    roundId: comp().rounds[0].id,
    scores: { 'crit-clarity': pts },
  });
};

const openResults = () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
  fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
};

describe('The results screen keeps what staff are doing when data changes', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('the swap message stays on screen after the swap is saved', () => {
    score('Jordan Lake', 'AgroPulse Sensors', 9);
    score('Sam Ellis', 'AgroPulse Sensors', 9);
    score('Jordan Lake', 'Bham Solar Grid', 7);
    score('Sam Ellis', 'Bham Solar Grid', 7);
    storageService.confirmResults(comp().rounds[0].id, 'Avery Quinn', { reason: 'Practice' });
    openResults();
    fireEvent.change(screen.getByLabelText('Swap finalist for Booth 3'), { target: { value: id('Bham Solar Grid') } });
    expect(screen.getByText('Bham Solar Grid now goes to the finale for Booth 3.')).toBeInTheDocument();
    expect(screen.getByText(/swapped in for AgroPulse Sensors/)).toBeInTheDocument();
  });

  it('an open audit stays open when a save redraws the screen', () => {
    score('Jordan Lake', 'AgroPulse Sensors', 9);
    score('Sam Ellis', 'AgroPulse Sensors', 9);
    score('Jordan Lake', 'Bham Solar Grid', 7);
    score('Sam Ellis', 'Bham Solar Grid', 7);
    storageService.confirmResults(comp().rounds[0].id, 'Avery Quinn', { reason: 'Practice' });
    openResults();
    fireEvent.click(screen.getAllByRole('button', { name: /Audit \(2\)/ })[0]);
    expect(screen.getByRole('button', { name: /Close Audit View/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Swap finalist for Booth 3'), { target: { value: id('Bham Solar Grid') } });
    expect(screen.getByRole('button', { name: /Close Audit View/ })).toBeInTheDocument();
  });
});
