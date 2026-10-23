import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';
import { finalistTeams } from '../services/finalists';

// Meeting, Oct 23: the finale's Verification Summary lists 1st, 2nd and 3rd. Made-up names only.
const comp = () => storageService.getCompetition();
const score = (judge: string, teamId: string, roundIndex: number, pts: number) => {
  const j = comp().judges.find((x) => x.name === judge)!;
  const round = comp().rounds[roundIndex];
  storageService.submitJudgeScore({ judgeId: j.id, judgeName: j.name, teamId, roundId: round.id, scores: { [round.rubric.criteria[0].id]: pts } });
};

describe('Finale verification summary', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('lists the top three places, not only the winner', () => {
    // Round 1: every judge scores their booth, then staff confirm with a reason and pick the tie
    const r1 = comp().rounds[0];
    const tieWinners: Record<string, string> = {};
    for (const t of comp().teams) tieWinners[t.boothCategory] ??= t.id;
    storageService.confirmResults(r1.id, 'Avery Quinn', { reason: 'Practice', tieWinners });

    const finalists = finalistTeams(comp());
    expect(finalists.length).toBeGreaterThanOrEqual(3);
    const points = [9, 7, 5, 3];
    finalists.forEach((t, i) => {
      score('Jamie Cole', t.id, 1, points[i] ?? 1);
      score('Quinn Harper', t.id, 1, points[i] ?? 1);
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Round 2: Pitch Finale/ }));
    fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
    fireEvent.click(screen.getByRole('button', { name: /Review & Confirm Results/ }));
    const box = screen.getByText('Verification Summary:').parentElement!;
    expect(box.textContent).toContain(`1st: ${finalists[0].name} (18 pts)`);
    expect(box.textContent).toContain(`2nd: ${finalists[1].name} (14 pts)`);
    expect(box.textContent).toContain(`3rd: ${finalists[2].name} (10 pts)`);
    expect(within(box).queryByText(/Winner:/)).toBeNull();
  });
});
