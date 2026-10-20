import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';
import { teamRegion } from '../services/regions';

// MSP-43: staff add and fix teams. All team and person names are made up.
const openAdmin = () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
};
const team = (name: string) => storageService.getCompetition().teams.find((t) => t.name === name);

describe('MSP-43: team editor', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('adds a team with a team lead, a school from the list and a booth; the region follows the school', () => {
    openAdmin();
    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: 'Riverbend Robotics' } });
    fireEvent.change(screen.getByLabelText('Team lead'), { target: { value: 'Jordan Example' } });
    fireEvent.change(screen.getByLabelText("Team lead's school"), { target: { value: 'Talladega College' } });
    fireEvent.change(screen.getByLabelText('Team booth'), { target: { value: 'Booth 2' } });
    fireEvent.click(screen.getByRole('button', { name: /Add team/ }));

    const t = team('Riverbend Robotics')!;
    expect(t.school).toBe('Talladega College');
    expect(t.boothCategory).toBe('Booth 2');
    expect(teamRegion(t)).toBe('North Region');
  });

  it('school is a dropdown of the 14 schools only, with no free text', () => {
    openAdmin();
    const select = screen.getByLabelText("Team lead's school") as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect([...select.options].filter((o) => o.value).length).toBe(14);
  });

  it('a team with no school shows "School needed" and gets no bonus', () => {
    storageService.addTeam({ name: 'No School Yet', boothCategory: 'Booth 2' });
    storageService.setWinningRegionBonus('North Region');
    openAdmin();
    expect(screen.getAllByText('School needed').length).toBeGreaterThan(0);
    expect(team('No School Yet')!.bonusPoints).toBe(0);
  });

  it('renames a team and moves it to another booth', () => {
    openAdmin();
    fireEvent.click(screen.getByRole('button', { name: 'Edit EduPath Pathways' }));
    fireEvent.change(screen.getByLabelText('New name for EduPath Pathways'), { target: { value: 'EduPath Labs' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    expect(team('EduPath Labs')).toBeDefined();

    fireEvent.change(screen.getByLabelText('Move EduPath Labs to booth'), { target: { value: 'Booth 1' } });
    expect(team('EduPath Labs')!.boothCategory).toBe('Booth 1');
  });

  it('removes a no-show, but never a team that already has scores', () => {
    const comp = storageService.getCompetition();
    const scored = comp.teams[0];
    storageService.submitJudgeScore({
      judgeId: comp.judges[0].id,
      judgeName: comp.judges[0].name,
      teamId: scored.id,
      roundId: comp.rounds[0].id,
      scores: {},
    });
    openAdmin();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Gulf Coast Cold Chain' }));
    expect(team('Gulf Coast Cold Chain')).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: `Remove ${scored.name}` }));
    expect(team(scored.name)).toBeDefined();
    expect(screen.getByText(`${scored.name} already has scores, so it can't be removed.`)).toBeInTheDocument();
  });
});
