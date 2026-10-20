import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';

// MSP-57: undo opening a round before anyone has scored. Made-up names only.
describe('MSP-57: unlock a round opened by mistake', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('a live round with no scores goes back to an editable draft', () => {
    const round = storageService.getCompetition().rounds[0];
    storageService.setRoundStatus(round.id, 'live');
    expect(storageService.getCompetition().rounds[0].isLocked).toBe(true);

    storageService.setRoundStatus(round.id, 'draft');
    const after = storageService.getCompetition().rounds[0];
    expect(after.status).toBe('draft');
    expect(after.isLocked).toBe(false);
  });

  it('once a score is saved, the rubric stays locked and staff see why', () => {
    const comp = storageService.getCompetition();
    const round = comp.rounds[0];
    storageService.setRoundStatus(round.id, 'live');
    storageService.submitJudgeScore({
      judgeId: comp.judges[0].id,
      judgeName: comp.judges[0].name,
      teamId: comp.teams[0].id,
      roundId: round.id,
      scores: { 'crit-clarity': 7 },
    });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
    fireEvent.click(screen.getByRole('button', { name: /Set Draft/ }));

    const after = storageService.getCompetition().rounds[0];
    expect(after.status).toBe('draft');
    expect(after.isLocked).toBe(true);
    expect(screen.getByText('Scores have been saved for this round, so its rubric stays locked.')).toBeInTheDocument();
  });

  it('the judge screen stops accepting scores when the round goes back to draft', () => {
    const round = storageService.getCompetition().rounds[0];
    storageService.setRoundStatus(round.id, 'live');
    storageService.setRoundStatus(round.id, 'draft');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Morgan Hill' }));
    expect(screen.getByText('Judging has not started yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Submit Score/ })).toBeNull();
  });
});
