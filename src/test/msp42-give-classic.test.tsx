import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';
import { allTeamsInFinale } from './helpers';

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

  it('Round 1 results show "+5 Give Classic bonus (South Region)" for every South team, and the audit shows it as its own line', () => {
    storageService.setWinningRegionBonus('South Region');
    scoreTeam('AgroPulse Sensors', 0, 'Jordan Lake');
    openStaff();
    fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
    // AgroPulse, HealthConnect and Gulf Coast are South: all three get it, scored or not.
    expect(screen.getAllByText('+5 Give Classic bonus (South Region)').length).toBe(3);
    expect(screen.getByRole('columnheader', { name: 'Booth Total' })).toBeInTheDocument();
    const row = screen.getAllByRole('button', { name: /Audit/ }).find((b) => b.closest('tr')?.textContent?.includes('AgroPulse Sensors'))!;
    fireEvent.click(row);
    expect(screen.getByText(/Give Classic bonus \(South Region\): added once to the booth total/)).toBeInTheDocument();
  });

  it('Steph, Oct 20: the bonus is 5 once per team, from the start, whatever the number of judges', () => {
    storageService.setWinningRegionBonus('South Region');
    const r1 = () => storageService.getCompetition().rounds[0];
    const sum = (name: string) => storageService.getTeamScoreSummaries(r1().id).find((s) => s.team.name === name)!;
    // Before any score
    expect(sum('HealthConnect Mobile')).toMatchObject({ regionalBonus: 5, finalScore: 5 });
    // Two judges in Booth 3: still 5, not 10
    scoreTeam('AgroPulse Sensors', 0, 'Jordan Lake');
    scoreTeam('AgroPulse Sensors', 0, 'Sam Ellis');
    expect(sum('AgroPulse Sensors')).toMatchObject({ judgesTotal: 16, regionalBonus: 5, finalScore: 21 });
    // The other region gets nothing
    expect(sum('Bham Solar Grid').regionalBonus).toBe(0);
    // Changing the region moves it; None removes it
    storageService.setWinningRegionBonus('North Region');
    expect(sum('AgroPulse Sensors').regionalBonus).toBe(0);
    expect(sum('Bham Solar Grid').regionalBonus).toBe(5);
    storageService.setWinningRegionBonus(undefined);
    expect(storageService.getTeamScoreSummaries(r1().id).every((s) => s.regionalBonus === 0)).toBe(true);
  });

  it('Steph, Oct 20: judges never see the bonus, a school or a region', () => {
    storageService.setWinningRegionBonus('South Region');
    storageService.setRoundStatus(storageService.getCompetition().rounds[0].id, 'live');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Morgan Hill' })); // HealthConnect, South
    expect(screen.getByText('/ 50 pts')).toBeInTheDocument();
    const text = document.body.textContent || '';
    expect(text).not.toMatch(/Give Classic|bonus|Region|Alabama State|School needed/i);
  });

  it('E: in the finale the bonus appears nowhere and is not applied', () => {
    allTeamsInFinale();
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
