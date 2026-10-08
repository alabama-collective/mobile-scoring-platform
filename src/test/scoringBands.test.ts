import { describe, it, expect } from 'vitest';
import {
  bandForScore,
  bandIssues,
  defaultBands,
  formatBandRange,
  parseBandRange,
  rescaleBands,
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

  it('keeps an even split even when the maximum changes, keeping names and meanings', () => {
    const at15 = rescaleBands(OFFICIAL_SCALE_ANCHORS, 10, 15);
    expect(at15.map((b) => b.range)).toEqual(['13–15', '10–12', '7–9', '4–6', '1–3']);
    expect(at15.map((b) => b.label)).toEqual(OFFICIAL_SCALE_ANCHORS.map((b) => b.label));
    expect(at15[1].description).toBe('Solid, with a gap or two.');
    expect(rescaleBands(at15, 15, 10).map((b) => b.range)).toEqual(OFFICIAL_SCALE_ANCHORS.map((b) => b.range));
  });

  it('scales custom bands in proportion and keeps them touching', () => {
    const iaeh = [
      { range: '25–30', label: 'Exceptional', description: '' },
      { range: '18–24', label: 'Strong', description: '' },
      { range: '10–17', label: 'Developing', description: '' },
      { range: '1–9', label: 'Nascent', description: '' },
    ];
    const at20 = rescaleBands(iaeh, 30, 20);
    expect(at20.map((b) => b.range)).toEqual(['17–20', '12–16', '7–11', '1–6']);
    expect(bandIssues(at20, 20).filter((i) => !i.includes('no meaning'))).toEqual([]);
    expect(rescaleBands(iaeh, 30, 60).map((b) => b.range)).toEqual(['49–60', '35–48', '19–34', '1–18']);
  });

  it('every maximum from 5 to 100 rescales an even split with no gaps or overlaps', () => {
    for (let max = 5; max <= 100; max++) {
      const issues = bandIssues(rescaleBands(OFFICIAL_SCALE_ANCHORS, 10, max), max);
      expect(issues, `max ${max}`).toEqual([]);
    }
  });

  it('leaves bands alone when the maximum is unchanged or a range is half-typed', () => {
    expect(rescaleBands(OFFICIAL_SCALE_ANCHORS, 10, 10)).toBe(OFFICIAL_SCALE_ANCHORS);
    const halfTyped = [{ range: '–8', label: 'Strong', description: '' }];
    expect(rescaleBands(halfTyped, 10, 20)).toBe(halfTyped);
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
