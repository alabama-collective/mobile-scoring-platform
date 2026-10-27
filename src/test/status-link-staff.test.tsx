import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { storageService } from '../services/storageService';

// Steph, Oct 21: a phone already signed in as staff opens the status link and
// should see the board, not a Google sign in.
const staffWatchStatus = vi.fn();
vi.mock('../services/cloud', () => ({
  useCloudState: () => ({ enabled: true, isStaff: true, connected: true, statusMarks: [] }),
  staffWatchStatus: (on: boolean) => staffWatchStatus(on),
  viewerSignIn: vi.fn(),
  viewerSignOut: vi.fn(),
}));

import { FloorStatusPage } from '../components/FloorStatusBoard';

describe('The status link on a device signed in as staff', () => {
  it('shows the board for every round, with no Google sign in', () => {
    storageService.resetToDefaults();
    const { unmount } = render(<FloorStatusPage competition={storageService.getCompetition()} />);
    expect(screen.getByText(/signed in as staff on this device/)).toBeInTheDocument();
    expect(screen.queryByText(/Sign in with Google/)).not.toBeInTheDocument();
    expect(screen.getByText(/scores in\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the staff screen' })).toHaveAttribute('href', '#/staff');
    expect(staffWatchStatus).toHaveBeenCalledWith(true);
    unmount();
    expect(staffWatchStatus).toHaveBeenLastCalledWith(false);
  });
});
