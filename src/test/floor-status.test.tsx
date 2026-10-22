import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';
import { boardRound, roundStatus, type StatusMark } from '../services/floorStatus';
import { FloorStatusBoard } from '../components/FloorStatusBoard';
import { FloorSupportViewers } from '../components/FloorSupportViewers';
import type { Competition } from '../types';

// Floor support status board (Steph, Oct 20). All names and emails are made up.
const comp = () => storageService.getCompetition();
const id = (name: string) => comp().teams.find((t) => t.name === name)!.id;
const judgeId = (name: string) => comp().judges.find((j) => j.name === name)!.id;
const r1 = () => comp().rounds[0];
const mark = (judge: string, team: string, roundId = r1().id): StatusMark => ({ roundId, teamId: id(team), judgeId: judgeId(judge) });
const withLive = (c: Competition, roundIndex: number): Competition => ({
  ...c,
  rounds: c.rounds.map((r, i) => ({ ...r, status: i === roundIndex ? 'live' : r.status === 'live' ? 'completed' : r.status })),
});

describe('Which scores are in, booth by booth', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('counts each booth and lists who still owes a score', () => {
    const s = roundStatus(comp(), r1(), [mark('Jordan Lake', 'AgroPulse Sensors'), mark('Sam Ellis', 'AgroPulse Sensors')]);
    expect(s.expected).toBe(7); // Booth 3: 2 judges x 2 teams, Booths 1, 2 and 4: 1 each
    expect(s.done).toBe(2);
    const b3 = s.booths.find((b) => b.key === 'Booth 3')!;
    expect(b3).toMatchObject({ done: 2, expected: 4, complete: false, label: 'Booth 3 · CleanTech & Urban', location: 'Level 2, Bay 14' });
    expect(b3.judges.find((j) => j.judge.name === 'Jordan Lake')!.missingTeams.map((t) => t.name)).toEqual(['Bham Solar Grid']);
  });

  it('puts booths still waiting first, finished booths last', () => {
    const s = roundStatus(comp(), r1(), [mark('Morgan Hill', 'HealthConnect Mobile')]);
    expect(s.booths.map((b) => b.key)).toEqual(['Booth 2', 'Booth 3', 'Booth 4', 'Booth 1']);
    expect(s.booths.at(-1)!.complete).toBe(true);
  });

  it('ignores marks from another round', () => {
    const finaleId = comp().rounds[1].id;
    const s = roundStatus(comp(), r1(), [mark('Morgan Hill', 'HealthConnect Mobile', finaleId)]);
    expect(s.done).toBe(0);
  });

  it('the finale shows the finalists and the finale judges', () => {
    storageService.confirmResults(r1().id, 'Avery Quinn', { reason: 'Practice', tieWinners: { 'Booth 3': id('AgroPulse Sensors') } });
    const finale = comp().rounds[1];
    const s = roundStatus(comp(), finale, []);
    expect(s.booths).toHaveLength(1);
    expect(s.booths[0].label).toBe('Finale');
    expect(s.booths[0].teams).toHaveLength(4);
    expect(s.booths[0].judges.map((j) => j.judge.name).sort()).toEqual(['Jamie Cole', 'Quinn Harper']);
  });

  it('a Round 1-only viewer never gets the finale', () => {
    const live = withLive(comp(), 1);
    expect(boardRound(live, 'round1')).toEqual({ finaleHidden: true });
    expect(boardRound(live, 'all').round?.roundType).toBe('finale');
    expect(boardRound(withLive(comp(), 0), 'round1').round?.roundType).toBe('booth');
  });

  it('a Round 1-only viewer is done once Round 1 closes, before the finale opens', () => {
    const c = comp();
    const closed = { ...c, rounds: c.rounds.map((r, i) => (i === 0 ? { ...r, status: 'completed' as const } : r)) };
    expect(boardRound(closed, 'round1')).toEqual({ finaleHidden: true });
    expect(boardRound(closed, 'all').round?.roundType).toBe('booth');
    render(<FloorStatusBoard competition={closed} scope="round1" marks={[]} />);
    expect(screen.getByText('Pitch booth judging is complete.')).toBeInTheDocument();
    expect(screen.queryByText(/finale is under way/)).not.toBeInTheDocument();
  });
});

describe('The status board screen', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('shows location and who still owes a score, and never a score', () => {
    render(<FloorStatusBoard competition={withLive(comp(), 0)} scope="round1" marks={[mark('Jordan Lake', 'AgroPulse Sensors')]} />);
    expect(screen.getByText(/1 of 7/)).toBeInTheDocument();
    const b3 = screen.getByRole('listitem', { name: 'Booth 3 · CleanTech & Urban' });
    expect(within(b3).getByText('Level 2, Bay 14')).toBeInTheDocument();
    expect(within(b3).getByText('1 of 4 in')).toBeInTheDocument();
    expect(b3.textContent).toMatch(/Jordan Lake still to score: Bham Solar Grid/);
    expect(document.body.textContent).not.toMatch(/\bpts\b|points/i);
    // Booths still waiting come first
    expect(screen.getAllByRole('listitem').filter((li) => li.getAttribute('aria-label')?.startsWith('Booth'))[0]).toHaveAttribute(
      'aria-label',
      'Booth 1 · HealthTech & Bio'
    );
  });

  it('a Round 1-only viewer sees "Pitch booth judging is complete." during the finale', () => {
    render(<FloorStatusBoard competition={withLive(comp(), 1)} scope="round1" marks={[]} />);
    expect(screen.getByText('Pitch booth judging is complete.')).toBeInTheDocument();
    expect(screen.queryByText(/Jamie Cole/)).not.toBeInTheDocument();
  });

  it('says when every booth is done', () => {
    const all = comp().teams.flatMap((t) =>
      comp().judges.filter((j) => j.boothAssigned === t.boothCategory && j.roster !== 'finale').map((j) => ({ roundId: r1().id, teamId: t.id, judgeId: j.id }))
    );
    render(<FloorStatusBoard competition={withLive(comp(), 0)} scope="all" marks={all} />);
    expect(screen.getByText(/Every booth is done\./)).toBeInTheDocument();
  });

  it('#/status opens the floor support page, not the start screen', () => {
    window.location.hash = '#/status';
    render(<App />);
    expect(screen.getByText('Floor support')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Staff$/ })).not.toBeInTheDocument();
  });
});

describe('Floor support access, the staff panel', () => {
  it('adds a person in lower case with the chosen access, and checks the address', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<FloorSupportViewers enabled viewers={[]} onSave={onSave} onRemove={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Floor support email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    expect(await screen.findByText(/Type a full email address/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Floor support email'), { target: { value: ' Floor.Helper@Example.com ' } });
    fireEvent.change(screen.getByLabelText('Floor support access level'), { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('floor.helper@example.com', 'all'));
    expect(await screen.findByText('floor.helper@example.com added, Round 1 and finale.')).toBeInTheDocument();
  });

  it('changes access and removes a person', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const onRemove = vi.fn().mockResolvedValue(true);
    render(<FloorSupportViewers enabled viewers={[{ email: 'floor.one@example.com', scope: 'round1' }]} onSave={onSave} onRemove={onRemove} />);
    // The list starts closed, so no address shows until staff open it
    expect(screen.queryByText('floor.one@example.com')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show the list (1 person)' }));
    fireEvent.change(screen.getByLabelText('Access for floor.one@example.com'), { target: { value: 'all' } });
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('floor.one@example.com', 'all'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove floor.one@example.com' }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('floor.one@example.com'));
    expect(await screen.findByText('floor.one@example.com removed.')).toBeInTheDocument();
  });

  it('without the shared database it says so and offers no form', () => {
    render(<FloorSupportViewers enabled={false} viewers={[]} onSave={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText(/needs the shared database/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Floor support email')).not.toBeInTheDocument();
  });
});
