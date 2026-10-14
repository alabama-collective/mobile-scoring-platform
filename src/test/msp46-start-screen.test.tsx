import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { storageService, DATA_CHANGED_EVENT } from '../services/storageService';

// MSP-46 and MSP-03: judges start from a start screen, pick their own name,
// never see a draft form, and always land on whichever round is live.
const goLive = (roundId: string) =>
  act(() => {
    storageService.setRoundStatus(roundId, 'live');
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  });
const close = (roundId: string) =>
  act(() => {
    storageService.setRoundStatus(roundId, 'completed');
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  });

describe('MSP-46: start screen and judge flow', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('opens on a start screen with "I\'m a judge" and "Staff", and no staff tools', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /I'm a judge/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Staff$/ })).toBeInTheDocument();
    expect(screen.queryByText('Open Round (LIVE)')).toBeNull();
  });

  it('a judge picks their own name, and never sees a draft form before the round opens', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    expect(screen.getByText('Who are you?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Morgan Hill' }));
    expect(screen.getByText('Judging has not started yet')).toBeInTheDocument();
    expect(screen.queryByText('DRAFT')).toBeNull();
    expect(screen.queryByRole('button', { name: /Submit Score/ })).toBeNull();
    // No staff tabs on a judge's phone
    expect(screen.queryByRole('button', { name: /Coordinator Admin/ })).toBeNull();
  });

  it('switches to the live round by itself, including when the finale opens later', () => {
    const [r1, r2] = storageService.getCompetition().rounds;
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Morgan Hill' }));

    goLive(r1.id);
    expect(screen.getByText(r1.name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Score/ })).toBeInTheDocument();
    expect(screen.getByText('Morgan Hill')).toBeInTheDocument();

    close(r1.id);
    expect(screen.getByText('No round is open for scoring right now')).toBeInTheDocument();

    goLive(r2.id);
    expect(screen.getByText(r2.name)).toBeInTheDocument();
  });

  it('remembers the judge after a refresh, and "Not you?" lets them choose again', () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Casey Brooks' }));
    unmount();
    render(<App />);
    expect(screen.getByText('Casey Brooks')).toBeInTheDocument();
    expect(screen.queryByText('Who are you?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Not you?' }));
    expect(screen.getByText('Who are you?')).toBeInTheDocument();
  });

  it('the #/judge link goes straight to the judge flow', () => {
    window.location.hash = '#/judge';
    render(<App />);
    expect(screen.getByText('Who are you?')).toBeInTheDocument();
  });
});
