import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';

// Charisse walkthrough check, Oct 23: the Round 1 Verification Summary names no
// winner for a tied booth until staff pick one. Made-up names only.
const comp = () => storageService.getCompetition();
const id = (name: string) => comp().teams.find((t) => t.name === name)!.id;
const score = (judge: string, team: string, pts: number) => {
  const j = comp().judges.find((x) => x.name === judge)!;
  storageService.submitJudgeScore({ judgeId: j.id, judgeName: j.name, teamId: id(team), roundId: comp().rounds[0].id, scores: { 'crit-clarity': pts } });
};

describe('Round 1 Verification Summary with a tie', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('says the booth is tied, then names the team staff pick', () => {
    storageService.setRoundStatus(comp().rounds[0].id, 'live');
    for (const judge of ['Jordan Lake', 'Sam Ellis']) {
      score(judge, 'AgroPulse Sensors', 5);
      score(judge, 'Bham Solar Grid', 5);
    }
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
    fireEvent.click(screen.getByRole('button', { name: /Review & Confirm Results/ }));
    const box = () => screen.getByText('Verification Summary:').parentElement!.textContent!;
    expect(box()).toContain('Booth 3: tie for first between AgroPulse Sensors and Bham Solar Grid. Pick the winner below.');
    expect(box()).not.toMatch(/Booth 3 winner/);

    fireEvent.click(screen.getByLabelText('Bham Solar Grid'));
    expect(box()).toMatch(/Booth 3 winner: Bham Solar Grid \(\d+ pts\), picked from a tie/);
  });
});
