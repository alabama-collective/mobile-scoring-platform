import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { storageService } from '../services/storageService';

// Wednesday internal test, step 2.3: a judge types 11, -1, a letter, or
// leaves a category blank. Each is refused with a clear message, and nothing
// is sent. Made-up names only.
const openAsMorgan = () => {
  storageService.setRoundStatus(storageService.getCompetition().rounds[0].id, 'live');
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /I'm a judge/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Morgan Hill' }));
};
const boxes = () => screen.getAllByRole('textbox', { name: /^Score for / }) as HTMLInputElement[];
const sent = () => storageService.getAllSubmissions().length;

describe('Judge score entry (Wednesday test 2.3)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    storageService.resetToDefaults();
  });

  it('11, -1 and a letter are refused with a message, and the score stays as it was', () => {
    openAsMorgan();
    const first = boxes()[0];
    fireEvent.change(first, { target: { value: '7' } });
    expect(first.value).toBe('7');
    for (const bad of ['11', '-1', 'a']) {
      fireEvent.change(first, { target: { value: bad } });
      expect(screen.getByRole('alert')).toHaveTextContent(`${bad} is not a score. Use a whole number from 0 to 10.`);
      expect(first.value).toBe('7');
    }
    fireEvent.change(first, { target: { value: '10' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(first.value).toBe('10');
  });

  it('a blank category stops the score from being sent, and says which', () => {
    openAsMorgan();
    const [a, b, c, d] = boxes();
    [a, b, c, d].forEach((box) => fireEvent.change(box, { target: { value: '8' } }));
    fireEvent.click(screen.getByRole('button', { name: /Submit Score/ }));
    expect(sent()).toBe(0);
    expect(screen.getByRole('alert')).toHaveTextContent(/^Not sent\. Give a score for every category first: /);

    fireEvent.change(boxes()[4], { target: { value: '0' } }); // 0 is a real score, not blank
    fireEvent.click(screen.getByRole('button', { name: /Submit Score/ }));
    expect(sent()).toBe(1);
    expect(storageService.getAllSubmissions()[0].rawTotal).toBe(32);
  });

  it('a new team starts blank, not at 0', () => {
    openAsMorgan();
    expect(boxes().every((b) => b.value === '')).toBe(true);
  });
});
