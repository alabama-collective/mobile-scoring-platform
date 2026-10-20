import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';
import {
  FINALE_TIMER_MS,
  applyFinaleTimer,
  getFinaleTimer,
  remainingAt,
  resetFinaleTimer,
  startFinaleTimer,
  stopFinaleTimer,
} from '../services/finaleTimer';
import { allTeamsInFinale } from './helpers';

// Steph's story F: a 3-minute finale timer that only staff control.
describe('Story F: finale timer', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
    applyFinaleTimer(null);
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is a fixed 3 minutes, with Start, Stop (pause) and Reset', () => {
    expect(FINALE_TIMER_MS).toBe(180000);
    startFinaleTimer();
    vi.advanceTimersByTime(60000);
    expect(remainingAt(getFinaleTimer(), Date.now())).toBe(120000);
    stopFinaleTimer();
    vi.advanceTimersByTime(30000);
    expect(remainingAt(getFinaleTimer(), Date.now())).toBe(120000); // paused
    startFinaleTimer();
    vi.advanceTimersByTime(20000);
    expect(remainingAt(getFinaleTimer(), Date.now())).toBe(100000);
    resetFinaleTimer();
    expect(getFinaleTimer()).toEqual({ status: 'idle', remainingMs: 180000 });
  });

  it('a finale judge sees the countdown, then "Time is up. Submit your score." and can still submit', () => {
    allTeamsInFinale();
    const finale = storageService.getCompetition().rounds[1];
    storageService.setRoundStatus(finale.id, 'live');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Jamie Cole' }));
    expect(screen.queryByRole('timer')).toBeNull(); // no timer until staff start it

    act(() => startFinaleTimer());
    expect(screen.getByRole('timer').textContent).toContain('3:00');
    act(() => vi.advanceTimersByTime(65000));
    expect(screen.getByRole('timer').textContent).toContain('1:55');
    act(() => vi.advanceTimersByTime(120000));
    expect(screen.getByRole('timer').textContent).toBe('Time is up. Submit your score.');

    fireEvent.click(screen.getAllByRole('button', { name: '8' })[0]);
    fireEvent.click(screen.getByRole('button', { name: /Submit Score/ }));
    expect(storageService.getAllSubmissions().filter((s) => s.roundId === finale.id)).toHaveLength(1);
    expect(screen.getByRole('timer').textContent).toBe('Time is up.');
  });

  it('judges cannot control it: the judge screen has no Start, Stop or Reset', () => {
    allTeamsInFinale();
    storageService.setRoundStatus(storageService.getCompetition().rounds[1].id, 'live');
    act(() => startFinaleTimer());
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Jamie Cole' }));
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Start|Stop|Reset|Resume)$/ })).toBeNull();
  });

  it('Round 1 judges never see a timer, even if one is running', () => {
    storageService.setRoundStatus(storageService.getCompetition().rounds[0].id, 'live');
    act(() => startFinaleTimer());
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Morgan Hill' }));
    expect(screen.getByRole('button', { name: /Submit Score/ })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('staff get the controls only while the finale is live', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Staff$/ }));
    expect(screen.queryByText('Finale timer (3 minutes)')).toBeNull();
    window.confirm = () => true;
    fireEvent.click(screen.getByRole('button', { name: /Round 2: Pitch Finale/ }));
    fireEvent.click(screen.getByRole('button', { name: /Open Round \(LIVE\)/ }));
    expect(screen.getByText('Finale timer (3 minutes)')).toBeInTheDocument(); // on Admin
    fireEvent.click(screen.getByRole('button', { name: /Live Results/ }));
    expect(screen.getByText('Finale timer (3 minutes)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^\s*Start$/ }));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByLabelText('Finale time left').textContent).toBe('2:50');
    fireEvent.click(screen.getByRole('button', { name: /^\s*Stop$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^\s*Reset$/ }));
    expect(screen.getByLabelText('Finale time left').textContent).toBe('3:00');
  });
});
