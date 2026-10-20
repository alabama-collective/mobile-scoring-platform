import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';

// MSP-42 and story E: the Give Classic bonus. Made-up team names only.
const scoreTeam = (teamName: string, roundIndex: number, judgeName: string) => {
  const comp = storageService.getCompetition();
  const judge = comp.judges.find((j) => j.name === judgeName)!;
  storageService.submitJudgeScore({
    judgeId: judge.id,
    judgeName: judge.name,
    teamId: comp.teams.find((t) => t.name === teamName)!.id,
    roundId: comp.rounds[roundIndex].id,
    scores: { 'crit-clarity': 8 },
  });
};
const openStaff = () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
};

describe('MSP-42 and E: Give Classic bonus', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('the winning region dropdown offers None, North Region and South Region', () => {
    openStaff();
    const select = screen.getByDisplayValue(/^None$/) as HTMLSelectElement;
    expect([...select.options].map((o) => o.text)).toEqual(['None', 'North Region', 'South Region']);
  });

  it('changing the region moves the bonus; None removes it from everyone', () => {
    storageService.setWinningRegionBonus('South Region');
    const south = storageService.getCompetition().teams.filter((t) => t.bonusPoints === 5).map((t) => t.name);
    expect(south).toContain('AgroPulse Sensors');
    expect(south).not.toContain('Bham Solar Grid');
    storageService.setWinningRegionBonus('North Region');
    const north = storageService.getCompetition().teams.filter((t) => t.bonusPoints === 5).map((t) => t.name);
    expect(north).toEqual(['EduPath Pathways', 'Bham Solar Grid']);
    storageService.setWinningRegionBonus(undefined);
    expect(storageService.getCompetition().teams.every((t) => t.bonusPoints === 0)).toBe(true);
  });

  it('Round 1 results show "+5 Give Classic bonus (South Region)" and the audit shows it as its own line', () => {
    storageService.setWinningRegionBonus('South Region');
    scoreTeam('AgroPulse Sensors', 0, 'Jordan Lake');
    openStaff();
    fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
    expect(screen.getAllByText('+5 Give Classic bonus (South Region)').length).toBe(3); // AgroPulse, HealthConnect, Gulf Coast
    const row = screen.getAllByRole('button', { name: /Audit/ }).find((b) => b.closest('tr')?.textContent?.includes('AgroPulse Sensors'))!;
    fireEvent.click(row);
    expect(screen.getByText('Give Classic bonus (South Region)')).toBeInTheDocument();
  });

  it('E: in the finale the bonus appears nowhere and is not applied', () => {
    storageService.setWinningRegionBonus('South Region');
    const finale = storageService.getCompetition().rounds[1];
    scoreTeam('AgroPulse Sensors', 1, 'Jamie Cole');
    const agro = storageService.getTeamScoreSummaries(finale.id).find((s) => s.team.name === 'AgroPulse Sensors')!;
    expect(agro.regionalBonus).toBe(0);
    expect(agro.finalScore).toBe(8);

    openStaff();
    fireEvent.click(screen.getByRole('button', { name: /Round 2: Pitch Finale/ }));
    fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
    const board = screen.getByText(/Automated Results/).closest('div')!.parentElement!.parentElement!;
    expect(within(board).queryByText(/Give Classic/)).toBeNull();
  });
});
