import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JudgeRosterManager } from '../components/JudgeRosterManager';
import { storageService } from '../services/storageService';
import type { Competition } from '../types';

// Wednesday test, Oct 21: staff cannot add the same judge name twice to one list. Made-up names only.
const finaleNames = () => storageService.getCompetition().judges.filter((j) => j.roster === 'finale').map((j) => j.name);

const setup = () => {
  let comp: Competition = storageService.getCompetition();
  const view = render(<JudgeRosterManager competition={comp} onUpdateCompetition={(c) => (comp = c)} onSwitchToJudgeView={() => {}} />);
  const add = (name: string) => {
    fireEvent.change(screen.getByLabelText('Finale judge name'), { target: { value: name } });
    fireEvent.submit(screen.getByLabelText('Finale judge name').closest('form')!);
    view.rerender(<JudgeRosterManager competition={comp} onUpdateCompetition={(c) => (comp = c)} onSwitchToJudgeView={() => {}} />);
  };
  return { add };
};

describe('Judge names are not repeated on a list', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetToDefaults();
  });

  it('refuses a finale judge name that is already on the finale list', () => {
    const { add } = setup();
    const before = finaleNames().length;
    add('Test Finale Judge F1');
    expect(finaleNames()).toHaveLength(before + 1);

    add('  test finale   judge f1 ');
    expect(finaleNames()).toHaveLength(before + 1);
    expect(screen.getByRole('alert')).toHaveTextContent('Test Finale Judge F1 is already on this list.');

    // Typing again clears the message, and a new name is added
    add('Test Finale Judge F2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(finaleNames()).toContain('Test Finale Judge F2');
  });
});
