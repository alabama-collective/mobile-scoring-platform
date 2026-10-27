import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';
import { finalistTeams } from '../services/finalists';
import { teamsForJudge } from '../services/booths';

// Steph's story A: booth winners advance to the finale, plus the confirm guard.
// All team and judge names are made up.
const comp = () => storageService.getCompetition();
const id = (name: string) => comp().teams.find((t) => t.name === name)!.id;
const score = (judge: string, team: string, pts: number, roundIndex = 0) => {
  const j = comp().judges.find((x) => x.name === judge)!;
  storageService.submitJudgeScore({
    judgeId: j.id,
    judgeName: j.name,
    teamId: id(team),
    roundId: comp().rounds[roundIndex].id,
    scores: { 'crit-clarity': pts },
  });
};
// Every Round 1 judge scores every team in their booth.
const scoreEveryone = (agro: number, bham: number) => {
  score('Jordan Lake', 'AgroPulse Sensors', agro);
  score('Sam Ellis', 'AgroPulse Sensors', agro);
  score('Jordan Lake', 'Bham Solar Grid', bham);
  score('Sam Ellis', 'Bham Solar Grid', bham);
  score('Morgan Hill', 'HealthConnect Mobile', 6);
  score('Casey Brooks', 'EduPath Pathways', 7);
  score('Dr. Riley Stone', 'Gulf Coast Cold Chain', 8);
};
const r1 = () => comp().rounds[0];

describe('Story A: booth winners advance to the finale', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('confirming Round 1 sends the top team of each booth to the finale', () => {
    scoreEveryone(9, 7);
    expect(storageService.confirmResults(r1().id, 'Avery Quinn')).toEqual({ ok: true });
    const names = finalistTeams(comp()).map((t) => t.name).sort();
    expect(names).toEqual(['AgroPulse Sensors', 'EduPath Pathways', 'Gulf Coast Cold Chain', 'HealthConnect Mobile']);
    expect(r1().boothWinners!['Booth 3']).toBe(id('AgroPulse Sensors'));
  });

  it('the Give Classic bonus counts when picking the booth winner', () => {
    scoreEveryone(7, 7); // a tie on the judges' scores; AgroPulse is in the South Region
    storageService.setWinningRegionBonus('South Region');
    expect(storageService.confirmResults(r1().id, 'Avery Quinn')).toEqual({ ok: true });
    expect(r1().boothWinners!['Booth 3']).toBe(id('AgroPulse Sensors'));
  });

  it('finale judges see only the finalists', () => {
    scoreEveryone(9, 7);
    storageService.confirmResults(r1().id, 'Avery Quinn');
    const c = comp();
    const jamie = c.judges.find((j) => j.name === 'Jamie Cole')!;
    const seen = teamsForJudge(c, c.rounds[1], jamie).map((t) => t.name);
    expect(seen).toHaveLength(4);
    expect(seen).not.toContain('Bham Solar Grid');
  });

  it('a tie for first is flagged, and staff pick the winner before finalists are set', () => {
    scoreEveryone(8, 8);
    const result = storageService.confirmResults(r1().id, 'Avery Quinn');
    expect(result).toEqual({ ok: false, error: 'tie', booths: ['Booth 3'] });
    expect(finalistTeams(comp())).toHaveLength(0);
    expect(
      storageService.confirmResults(r1().id, 'Avery Quinn', { tieWinners: { 'Booth 3': id('Bham Solar Grid') } })
    ).toEqual({ ok: true });
    expect(finalistTeams(comp()).map((t) => t.name)).toContain('Bham Solar Grid');
  });

  it('staff can swap in the runner-up when a winner cannot compete, until the finale scores that winner', () => {
    scoreEveryone(9, 7);
    storageService.confirmResults(r1().id, 'Avery Quinn');
    expect(storageService.swapFinalist('Booth 3', id('Bham Solar Grid'))).toBe(true);
    let names = finalistTeams(comp()).map((t) => t.name);
    expect(names).toContain('Bham Solar Grid');
    expect(names).not.toContain('AgroPulse Sensors');
    // The booth winner on record stays the same
    expect(r1().boothWinners!['Booth 3']).toBe(id('AgroPulse Sensors'));

    // A team from another booth can never be swapped in
    expect(storageService.swapFinalist('Booth 3', id('EduPath Pathways'))).toBe(false);

    // Once the finale has scored the finalist, no swap
    score('Jamie Cole', 'Bham Solar Grid', 5, 1);
    expect(storageService.swapFinalist('Booth 3', id('AgroPulse Sensors'))).toBe(false);
    names = finalistTeams(comp()).map((t) => t.name);
    expect(names).toContain('Bham Solar Grid');
  });
});

describe('Confirm guard (approved by Steph, Oct 14)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('missing scores block confirming unless staff give a reason', () => {
    score('Morgan Hill', 'HealthConnect Mobile', 6);
    const tie = { 'Booth 3': id('AgroPulse Sensors') };
    expect(storageService.confirmResults(r1().id, 'Avery Quinn', { tieWinners: tie })).toEqual({ ok: false, error: 'missing' });
    expect(r1().isResultsFinalized).toBeFalsy();
    expect(storageService.confirmResults(r1().id, 'Avery Quinn', { reason: 'A judge left early', tieWinners: tie })).toEqual({ ok: true });
    expect(r1().confirmReason).toBe('A judge left early');
  });

  it('on screen: Confirm is locked with scores missing, and a tie asks staff to pick', () => {
    storageService.setRoundStatus(r1().id, 'live');
    score('Morgan Hill', 'HealthConnect Mobile', 6);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
    expect(screen.getAllByText('Tie for first: staff pick').length).toBe(2); // both CleanTech teams at 0
    fireEvent.click(screen.getByRole('button', { name: /Review & Confirm Results/ }));
    expect(screen.getByText(/6 scores are still missing/)).toBeInTheDocument();
    expect(screen.getByText(/Tie for first in Booth 3/)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Confirm anyway, with this reason/ });
    expect(btn).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reason for confirming with scores missing'), { target: { value: 'Practice' } });
    expect(btn).toBeDisabled(); // the tie is still open
    fireEvent.click(screen.getByLabelText('AgroPulse Sensors'));
    expect(btn).toBeDisabled(); // no sign-off name yet
    fireEvent.change(screen.getByLabelText('Sign-off staff name'), { target: { value: 'Test Staff Signer' } });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(screen.getByText(/Confirmed Final by/)).toBeInTheDocument();
    expect(screen.getByText('Finalists')).toBeInTheDocument();
  });

  it('the finale says there are no finalists until Round 1 is confirmed', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Round 2: Pitch Finale/ }));
    fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
    expect(screen.getByText('No finalists yet.')).toBeInTheDocument();
  });
});
