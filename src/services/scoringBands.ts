import { ScoringScaleAnchor } from '../types';

// MSP-12: point definitions ("bands") for a criterion, e.g. 7–8 Strong:
// "Solid, with a gap or two." Ranges are stored as text ("7–8", or "5" for a
// single score) so existing rubrics and templates keep working.

export interface BandRange {
  min: number;
  max: number;
}

const DASH = /[–—-]/;
const WHOLE_NUMBER = /^\d+$/;

// The two sides of a range as typed, e.g. "7–8" → ["7", "8"], "5" → ["5", "5"].
export const splitBandRange = (range: string): [string, string] => {
  const parts = range.split(DASH).map((p) => p.trim());
  return parts.length === 1 ? [parts[0], parts[0]] : [parts[0] ?? '', parts[1] ?? ''];
};

// Accepts en dash, hyphen or em dash between the numbers ("7–8", "7-8", "7 — 8").
// Returns null for anything incomplete, such as "–8" while staff are typing.
export const parseBandRange = (range: string): BandRange | null => {
  const parts = range.split(DASH).map((p) => p.trim());
  if (parts.length > 2 || !parts.every((p) => WHOLE_NUMBER.test(p))) return null;
  const min = parseInt(parts[0], 10);
  const max = parseInt(parts[parts.length - 1], 10);
  return { min, max };
};

export const formatBandRange = (min: number | string, max: number | string): string => {
  const lo = String(min).trim();
  const hi = String(max).trim();
  if (lo === '' && hi === '') return '';
  return lo === hi ? lo : `${lo}–${hi}`;
};

// The band a score falls in, or undefined (e.g. a score of 0, or a gap).
export const bandForScore = (
  bands: ScoringScaleAnchor[] | undefined,
  score: number
): ScoringScaleAnchor | undefined =>
  bands?.find((band) => {
    const r = parseBandRange(band.range);
    return r !== null && score >= r.min && score <= r.max;
  });

const DEFAULT_WORDING: Array<Pick<ScoringScaleAnchor, 'label' | 'description'>> = [
  { label: 'Exceptional', description: 'Clear, specific, convincing.' },
  { label: 'Strong', description: 'Solid, with a gap or two.' },
  { label: 'Developing', description: 'The idea is there; the articulation is not yet.' },
  { label: 'Unclear', description: 'Unclear or barely addressed.' },
  { label: 'Not Addressed', description: 'Not addressed.' },
];

// Five bands split evenly across 1..maxPoints, highest first, using the
// official TAC wording as a starting point for staff to reword.
// maxPoints 10 → 9–10, 7–8, 5–6, 3–4, 1–2; maxPoints 30 → 25–30, 19–24, …, 1–6.
export const defaultBands = (maxPoints: number): ScoringScaleAnchor[] => {
  const bands: ScoringScaleAnchor[] = [];
  DEFAULT_WORDING.forEach((wording, i) => {
    const min = Math.floor((maxPoints * (4 - i)) / 5) + 1;
    const max = Math.floor((maxPoints * (5 - i)) / 5);
    if (min <= max) bands.push({ ...wording, range: formatBandRange(min, max) });
  });
  return bands;
};

// Move bands to a new maximum, keeping names and meanings. Bands that are the
// standard even split stay an even split (10 → 15: 9–10 … 1–2 becomes
// 13–15 … 1–3); any other bands scale in proportion, so bands that touched
// stay touching (IA-EH 30 → 20: 25–30, 18–24, 10–17, 1–9 becomes
// 17–20, 12–16, 7–11, 1–6). Incomplete ranges are left as they are.
export const rescaleBands = (
  bands: ScoringScaleAnchor[],
  oldMax: number,
  newMax: number
): ScoringScaleAnchor[] => {
  if (oldMax === newMax || oldMax < 1 || newMax < 1 || bands.length === 0) return bands;
  const ranges = bands.map((b) => parseBandRange(b.range));
  if (ranges.some((r) => r === null)) return bands;

  const even = defaultBands(oldMax).map((b) => parseBandRange(b.range));
  const isEvenSplit =
    even.length === ranges.length && ranges.every((r, i) => r!.min === even[i]!.min && r!.max === even[i]!.max);
  if (isEvenSplit) {
    const next = defaultBands(newMax);
    if (next.length === bands.length) return bands.map((b, i) => ({ ...b, range: next[i].range }));
  }

  // A boundary between k and k+1 moves to between scale(k) and scale(k)+1
  const scale = (score: number) => Math.round((score * newMax) / oldMax);
  return bands.map((band, i) => {
    const r = ranges[i]!;
    const min = r.min <= 1 ? r.min : scale(r.min - 1) + 1;
    const max = r.max >= oldMax ? newMax : scale(r.max);
    return { ...band, range: formatBandRange(min, max) };
  });
};

const describeScores = (scores: number[]): string => {
  const parts: string[] = [];
  let start = scores[0];
  for (let i = 1; i <= scores.length; i++) {
    if (scores[i] !== scores[i - 1] + 1) {
      parts.push(formatBandRange(start, scores[i - 1]));
      start = scores[i];
    }
  }
  return parts.join(', ');
};

// Plain-language problems with a set of bands, for staff to fix.
export const bandIssues = (bands: ScoringScaleAnchor[], maxPoints: number): string[] => {
  const issues: string[] = [];
  const covered = new Map<number, number>();

  bands.forEach((band) => {
    const r = parseBandRange(band.range);
    const name = band.label || band.range || 'A band';
    if (!r) {
      issues.push(`${name} needs a score range.`);
      return;
    }
    if (r.min > r.max) {
      issues.push(`${name}: the lowest score is higher than the highest score.`);
      return;
    }
    if (r.max > maxPoints) {
      issues.push(`${name} goes up to ${r.max}, but this criterion's maximum is ${maxPoints}.`);
    }
    if (!band.description.trim()) {
      issues.push(`${name} has no meaning written yet, so judges will see only its name.`);
    }
    for (let s = Math.max(1, r.min); s <= Math.min(maxPoints, r.max); s++) {
      covered.set(s, (covered.get(s) ?? 0) + 1);
    }
  });

  const all = Array.from({ length: maxPoints }, (_, i) => i + 1);
  const missing = all.filter((s) => !covered.has(s));
  const doubled = all.filter((s) => (covered.get(s) ?? 0) > 1);
  if (missing.length > 0) {
    issues.push(`No band covers ${missing.length === 1 ? 'score' : 'scores'} ${describeScores(missing)}.`);
  }
  if (doubled.length > 0) {
    issues.push(`More than one band covers ${doubled.length === 1 ? 'score' : 'scores'} ${describeScores(doubled)}.`);
  }
  return issues;
};
