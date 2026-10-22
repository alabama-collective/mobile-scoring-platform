import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';
import { judgesToSignIn } from '../services/booths';
import type { Competition, Round } from '../types';

// Wednesday test, Oct 21: once Round 1 is over, the judge sign-in list shows finale judges only.
const withStatus = (c: Competition, booth: Round['status'], finale: Round['status']): Competition => ({
  ...c,
  rounds: c.rounds.map((r) => ({ ...r, status: r.roundType === 'finale' ? finale : booth })),
});
const names = (c: Competition) => judgesToSignIn(c).map((j) => j.name);

describe('Who can sign in as a judge', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('before and during Round 1, both lists show', () => {
    const c = storageService.getCompetition();
    expect(names(withStatus(c, 'draft', 'draft'))).toContain('Morgan Hill');
    expect(names(withStatus(c, 'live', 'draft'))).toEqual(expect.arrayContaining(['Morgan Hill', 'Jamie Cole']));
  });

  it('after Round 1 closes and during the finale, only finale judges show', () => {
    const c = storageService.getCompetition();
    expect(names(withStatus(c, 'completed', 'draft')).sort()).toEqual(['Jamie Cole', 'Quinn Harper']);
    expect(names(withStatus(c, 'completed', 'live')).sort()).toEqual(['Jamie Cole', 'Quinn Harper']);
  });

  it('the sign-in screen during the finale lists no Round 1 judge', () => {
    storageService.saveCompetition(withStatus(storageService.getCompetition(), 'completed', 'live'));
    window.location.hash = '#/judge';
    render(<App />);
    expect(screen.getByText('Who are you?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jamie Cole' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Morgan Hill' })).not.toBeInTheDocument();
  });
});
