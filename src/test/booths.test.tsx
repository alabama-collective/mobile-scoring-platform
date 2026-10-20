import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { storageService, DATA_CHANGED_EVENT } from '../services/storageService';
import { allTeamsInFinale } from './helpers';
import {
  boothInUseMessage,
  boothUsage,
  judgesForRound,
  judgesForTeam,
  renameBooth,
  teamsForJudge,
} from '../services/booths';
import { computeTeamSummaries } from '../services/scoring';

// MSP-47, MSP-38, MSP-48 and Steph's stories B, C and D. All names are made up.
const comp = () => storageService.getCompetition();
const goLive = (roundId: string) =>
  act(() => {
    storageService.setRoundStatus(roundId, 'live');
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  });

describe('Booths and who judges what', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('C / MSP-48: a Round 1 judge sees only the teams at their booth', () => {
    const c = comp();
    const r1 = c.rounds[0];
    const jordan = c.judges.find((j) => j.name === 'Jordan Lake')!; // CleanTech & Urban
    expect(teamsForJudge(c, r1, jordan).map((t) => t.name)).toEqual(['AgroPulse Sensors', 'Bham Solar Grid']);
  });

  it('MSP-48: a Round 1 judge with no booth sees no teams and is told to ask staff', () => {
    const c = comp();
    storageService.updateJudge(c.judges[1].id, { boothAssigned: undefined }); // Morgan Hill
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Morgan Hill' }));
    goLive(c.rounds[0].id);
    expect(screen.getByText('Ask staff to assign you a booth')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit Score/ })).toBeNull();
  });

  it('C: the judge screen shows only the booth teams', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Morgan Hill' })); // HealthTech & Bio
    goLive(comp().rounds[0].id);
    expect(screen.getAllByText('HealthConnect Mobile').length).toBeGreaterThan(0);
    expect(screen.queryByText('AgroPulse Sensors')).toBeNull();
    expect(screen.getByText(/My scores \(0\/1\)/)).toBeInTheDocument();
  });

  it('D: Round 1 and the finale have separate judge lists', () => {
    const c = comp();
    expect(judgesForRound(c, c.rounds[0]).map((j) => j.name)).not.toContain('Jamie Cole');
    expect(judgesForRound(c, c.rounds[1]).map((j) => j.name)).toEqual(['Jamie Cole', 'Quinn Harper']);
  });

  it('MSP-48: Live Results expects only the booth judges for each team', () => {
    const c = comp();
    const agro = c.teams.find((t) => t.name === 'AgroPulse Sensors')!;
    expect(judgesForTeam(c, c.rounds[0], agro).map((j) => j.name)).toEqual(['Jordan Lake', 'Sam Ellis']);
    const sums = computeTeamSummaries(c, c.rounds[0], []);
    expect(sums.find((s) => s.team.id === agro.id)!.totalSubmissionsRequired).toBe(2);
    allTeamsInFinale();
    const withFinalists = comp();
    expect(computeTeamSummaries(withFinalists, withFinalists.rounds[1], [])[0].totalSubmissionsRequired).toBe(2);
  });

  it('MSP-47 / B: renaming a booth moves its judges and teams with it', () => {
    const renamed = renameBooth(comp(), 'CleanTech & Urban', 'Booth 3');
    expect(renamed.rounds[0].boothCategories).toContain('Booth 3');
    expect(renamed.rounds[0].boothCategories).not.toContain('CleanTech & Urban');
    expect(renamed.judges.filter((j) => j.boothAssigned === 'Booth 3').map((j) => j.name)).toEqual(['Jordan Lake', 'Sam Ellis']);
    expect(renamed.teams.filter((t) => t.boothCategory === 'Booth 3')).toHaveLength(2);
  });

  it('MSP-47: a booth still in use is not removed, and staff see who uses it', () => {
    const msg = boothInUseMessage('HealthTech & Bio', boothUsage(comp(), 'HealthTech & Bio'));
    expect(msg).toBe('HealthTech & Bio still has 1 judge (Morgan Hill) and 1 team (HealthConnect Mobile). Move them first.');
    expect(boothInUseMessage('Empty booth', boothUsage(comp(), 'Empty booth'))).toBeNull();
  });
});
