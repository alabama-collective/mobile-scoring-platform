import { describe, expect, it } from 'vitest';
import { readXlsx } from '../../scripts/xlsx';
import { applyUpload, planUpload } from '../services/bulkUpload';
import { boothDetails, boothList } from '../services/booths';
import { INITIAL_COMPETITION } from '../data/seedData';
import { buildXlsx, type FixtureSheet } from './xlsxFixture';

// Steph, Oct 26: the bulk upload sheet. Synthetic names and example.com emails only.

const ok = { value: 'OK', formula: 'IF(TRUE,"OK","")' };
const region = (value: string) => ({ value, formula: 'VLOOKUP(D2,Schools!A:B,2,FALSE)' });

const booths = (): FixtureSheet => [
  ['Booth name', 'Track', 'Category', 'Location', 'Check'],
  ['Booth 1', 'START', 'Health and Wellness', 'Level 1, Bays 1-2', ok],
  ['Booth 2', 'Track 2', 'STEM and Innovation', 'Level 2, Bays 14-15', ok],
];
const teams = (): FixtureSheet => [
  ['Teams: one row per team, in pitch order'],
  ['Team name', 'Track', 'Booth', 'Team lead’s school', 'Region', 'Check'],
  ['Test Alpha', 'START', 'Booth 1', 'Alabama A&M University', region('North Region'), ok],
  ['Test Bravo', 'START', 'Booth 1', 'Alabama State University', region('South Region'), ok],
  ['Test Delta', 'Track 2', 'Booth 2', 'Tuskegee University', region('South Region'), ok],
  ['Test Echo', 'Track 2', 'Booth 2', 'Talladega College', region('North Region'), ok],
  ['', '', '', '', region(''), { value: '', formula: 'IF(A7="","","OK")' }],
];
const judges = (): FixtureSheet => [
  ['Judge name', 'Email', 'Booth', 'Check'],
  ['Test Judge A1', 'judge-a1@example.com', 'Booth 1', ok],
  ['Test Judge A2', 'judge-a2@example.com', 'Booth 1', ok],
  ['Test Judge B1', '', 'Booth 2', ok],
];
const file = (over: Record<string, FixtureSheet | null> = {}) =>
  readXlsx(
    buildXlsx(withoutNull({
      'Read Me': [['How to fill in this sheet']],
      Booths: booths(),
      Teams: teams(),
      'Round 1 Judges': judges(),
      Schools: [['School', 'Region'], ['Alabama A&M University', 'North Region']],
      ...over,
    }))
  );
const withoutNull = (tabs: Record<string, FixtureSheet | null>) =>
  Object.fromEntries(Object.entries(tabs).filter((e): e is [string, FixtureSheet] => e[1] !== null));
const hasEmptyField = (v: unknown): boolean =>
  v === undefined || (typeof v === 'object' && v !== null && Object.values(v).some(hasEmptyField));

describe('reading the .xlsx file', () => {
  it('reads every tab, typed text and formula values', () => {
    const book = file();
    expect(Object.keys(book)).toEqual(['Read Me', 'Booths', 'Teams', 'Round 1 Judges', 'Schools']);
    expect(book.Teams[2]).toEqual(['Test Alpha', 'START', 'Booth 1', 'Alabama A&M University', 'North Region', 'OK']);
    expect(book['Round 1 Judges'][3]).toEqual(['Test Judge B1', '', 'Booth 2', 'OK']);
  });
});

describe('checking the sheet', () => {
  it('a clean sheet has no problems, in sheet order', () => {
    const plan = planUpload(file(), 1);
    expect(plan.problems).toEqual([]);
    expect(plan.booths.map((b) => b.name)).toEqual(['Booth 1', 'Booth 2']);
    expect(plan.teams.map((t) => `${t.name}|${t.boothCategory}|${t.school}`)).toEqual([
      'Test Alpha|Booth 1|Alabama A&M University',
      'Test Bravo|Booth 1|Alabama State University',
      'Test Delta|Booth 2|Tuskegee University',
      'Test Echo|Booth 2|Talladega College',
    ]);
    expect(plan.judges.map((j) => `${j.name}|${j.boothAssigned}|${j.email ?? ''}`)).toEqual([
      'Test Judge A1|Booth 1|judge-a1@example.com',
      'Test Judge A2|Booth 1|judge-a2@example.com',
      'Test Judge B1|Booth 2|',
    ]);
    // Not a problem, but worth a look.
    expect(plan.notes).toEqual(['Booth 2 has 1 judge.']);
  });

  it('lists every problem at once, with the tab and row', () => {
    const t = teams();
    t[2][2] = 'Booth 9'; // no such booth
    t[3][1] = 'Track 2'; // Booth 1 is a START booth
    t[4][3] = 'Test Made-up College'; // not on the school list
    t[5][4] = region('South Region'); // Talladega is North
    t.splice(6, 0, ['test alpha', 'START', 'Booth 1', 'Alabama A&M University', region('North Region'), ok]);
    const j = judges();
    j.push(['Test Judge A3', 'not-an-email', 'booth 1', ok]);
    j.push(['Test Judge A1', '', 'Booth 2', ok]);
    const b = booths();
    b.push(['Booth 3', 'Track 3', 'Test Category', '', ok]);

    const plan = planUpload(file({ Teams: t, 'Round 1 Judges': j, Booths: b }));
    expect(plan.problems).toEqual([
      'Booths, row 4: the track is "Track 3". Use START or Track 2.',
      'Teams, row 3: Booth 9 is not on the Booths tab.',
      'Teams, row 4: the team is Track 2, but Booth 1 is a START booth.',
      'Teams, row 5: "Test Made-up College" is not on the app\'s school list.',
      'Teams, row 6: the Region column says South Region, but Talladega College is in the North Region.',
      'Teams, row 7: test alpha is also on row 3.',
      'Round 1 Judges, row 5: "not-an-email" is not an email address.',
      'Round 1 Judges, row 6: Test Judge A1 is also on row 2.',
      'Booth 1 has 3 judges. The most is 2.',
    ]);
  });

  it('says when a tab or a column is missing', () => {
    const plan = planUpload(file({ Booths: [['Booth name', 'Category'], ['Booth 1', 'Test Category']], 'Round 1 Judges': null }));
    expect(plan.problems).toContain('There is no "Round 1 Judges" tab in the file.');
    expect(plan.problems).toContain('The "Booths" tab needs a header row with these columns: "Booth name", "Track", "Category".');
  });

  // Steph, Oct 27: what the check caught in the real sheet.
  it('accepts "Track 1" for START and headers with words in brackets', () => {
    const b = booths();
    b[0][3] = 'Location (level and bay)';
    b[1][1] = 'Track 1';
    const t = teams();
    t[2][1] = 'Track 1';
    const j = judges();
    j[0][0] = 'Judge name (as shown in the app)';
    const plan = planUpload(file({ Booths: b, Teams: t, 'Round 1 Judges': j }), 1);
    expect(plan.problems).toEqual([]);
    expect(plan.booths[0]).toMatchObject({ track: 'START', details: { location: 'Level 1, Bays 1-2' } });
    expect(plan.judges.map((x) => x.name)).toEqual(['Test Judge A1', 'Test Judge A2', 'Test Judge B1']);
  });

  it('warns when the Location or Email column is not found, instead of skipping it silently', () => {
    const b = booths();
    b[0][3] = 'Where';
    const j = judges();
    j[0][1] = 'Contact';
    const plan = planUpload(file({ Booths: b, 'Round 1 Judges': j }), 1);
    expect(plan.problems).toEqual([]);
    expect(plan.notes).toContain('The "Booths" tab has no Location column, so no locations (bay numbers) will be uploaded.');
    expect(plan.notes).toContain('The "Round 1 Judges" tab has no Email column, so no judge emails will be uploaded.');
  });
});

describe('putting it in the competition', () => {
  it('sets the booths with category and location, the teams and the Round 1 judges, and keeps finale judges', () => {
    const plan = planUpload(file(), 1);
    const before = {
      ...INITIAL_COMPETITION,
      teams: [],
      judges: [{ id: 'f1', name: 'Test Finale Judge F1', roster: 'finale' as const }],
    };
    const comp = applyUpload(before, plan);
    expect(boothList(comp)).toEqual(['Booth 1', 'Booth 2']);
    expect(boothDetails(comp, 'Booth 2')).toEqual({ category: 'STEM and Innovation', location: 'Level 2, Bays 14-15' });
    expect(comp.teams).toHaveLength(4);
    expect(comp.judges.map((j) => j.name)).toEqual(['Test Finale Judge F1', 'Test Judge A1', 'Test Judge A2', 'Test Judge B1']);
    // The database refuses fields with no value.
    const booth1 = comp.rounds.find((r) => r.roundType === 'booth')!;
    expect(hasEmptyField([booth1.boothCategories, booth1.boothDetails, comp.teams, comp.judges])).toBe(false);
    expect(comp.judges.find((j) => j.name === 'Test Judge B1')).not.toHaveProperty('email');
  });
});
