import { describe, it, expect } from 'vitest';
import {
  bandForScore,
  bandIssues,
  defaultBands,
  formatBandRange,
  parseBandRange,
  splitBandRange,
} from '../services/scoringBands';
import { OFFICIAL_SCALE_ANCHORS } from '../data/seedData';

// MSP-12: point definitions shown inline on the scoring screen
describe('MSP-12 point definition bands', () => {
  it('reads ranges written with an en dash, hyphen or em dash, and single scores', () => {
    expect(parseBandRange('7–8')).toEqual({ min: 7, max: 8 });
    expect(parseBandRange('7-8')).toEqual({ min: 7, max: 8 });
    expect(parseBandRange('25 — 30')).toEqual({ min: 25, max: 30 });
    expect(parseBandRange('5')).toEqual({ min: 5, max: 5 });
  });

  it('treats half-typed ranges as incomplete rather than guessing', () => {
    expect(parseBandRange('–8')).toBeNull();
    expect(parseBandRange('7–')).toBeNull();
    expect(parseBandRange('')).toBeNull();
    expect(parseBandRange('a–b')).toBeNull();
  });

  it('round-trips the two sides of a range', () => {
    expect(splitBandRange('7–8')).toEqual(['7', '8']);
    expect(splitBandRange('5')).toEqual(['5', '5']);
    expect(formatBandRange(7, 8)).toBe('7–8');
    expect(formatBandRange(5, 5)).toBe('5');
    expect(formatBandRange('', '')).toBe('');
  });

  it('finds only the band a score falls in', () => {
    expect(bandForScore(OFFICIAL_SCALE_ANCHORS, 8)?.label).toBe('Strong');
    expect(bandForScore(OFFICIAL_SCALE_ANCHORS, 10)?.label).toBe('Exceptional');
    expect(bandForScore(OFFICIAL_SCALE_ANCHORS, 1)?.label).toBe('Not Addressed');
    expect(bandForScore(OFFICIAL_SCALE_ANCHORS, 0)).toBeUndefined();
  });

  it('splits a 10-point criterion into the official TAC bands', () => {
    expect(defaultBands(10).map((b) => `${b.range} ${b.label}`)).toEqual(
      OFFICIAL_SCALE_ANCHORS.map((b) => `${b.range} ${b.label}`)
    );
  });

  it('splits ranges above 10 evenly with every score covered once', () => {
    expect(defaultBands(30).map((b) => b.range)).toEqual(['25–30', '19–24', '13–18', '7–12', '1–6']);
    expect(defaultBands(15).map((b) => b.range)).toEqual(['13–15', '10–12', '7–9', '4–6', '1–3']);
    for (const max of [3, 7, 10, 15, 20, 25, 30, 100]) {
      expect(bandIssues(defaultBands(max), max)).toEqual([]);
    }
  });

  it('explains gaps, overlaps and out-of-range bands in plain language', () => {
    const bands = [
      { range: '9–12', label: 'Exceptional', description: 'Clear.' },
      { range: '5–9', label: 'Strong', description: 'Solid.' },
      { range: '1–2', label: 'Weak', description: '' },
    ];
    expect(bandIssues(bands, 10)).toEqual([
      "Exceptional goes up to 12, but this criterion's maximum is 10.",
      'Weak has no meaning written yet, so judges will see only its name.',
      'No band covers scores 3–4.',
      'More than one band covers score 9.',
    ]);
  });
});
