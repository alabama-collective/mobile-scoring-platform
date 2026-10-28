import type { BoothDetails, Competition, Judge, Team } from '../types';
import { ALL_SCHOOLS, regionForSchool } from './regions';

// Steph, Oct 26: load the booths, teams and Round 1 judges from the bulk
// upload sheet (tabs Booths, Teams and Round 1 Judges). Every problem is
// listed, and nothing is created unless the sheet is clean. The Check and
// Schools tabs are for staff only and are not read. Finale judges and floor
// support viewers stay as hand entry.

export type Rows = string[][];

export interface UploadBooth {
  name: string;
  track: string;
  details: BoothDetails;
}

export interface UploadPlan {
  booths: UploadBooth[];
  teams: Team[];
  judges: Judge[];
  problems: string[];
  notes: string[];
}

export const MAX_JUDGES_PER_BOOTH = 2;

// Spacing, capitals and punctuation do not make two names different.
const key = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const headerKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// Words in brackets do not count, so "Judge name (as shown in the app)" is
// "Judge name" (Steph, Oct 27).
const columnKey = (s: string) => headerKey(s.replace(/\([^)]*\)/g, ''));

// Some sheets call START "Track 1" (Steph, Oct 27).
const TRACKS: Record<string, string> = { start: 'START', track1: 'START', track2: 'Track 2' };
const trackOf = (s: string) => TRACKS[headerKey(s)];

const findTab = (book: Record<string, Rows>, name: string): Rows | undefined =>
  Object.entries(book).find(([n]) => headerKey(n) === headerKey(name))?.[1];

interface Column {
  field: string;
  label: string;
  names: string[];
  optional?: boolean;
  // Said when an optional column is not found, so nothing is skipped silently.
  ifMissing?: string;
}

// The header row can be below a title, so look in the first few rows. Each
// field accepts a few header spellings.
const readTab = (
  book: Record<string, Rows>,
  tab: string,
  columns: Column[],
  problems: string[],
  notes: string[]
): { row: number; get: (field: string) => string }[] => {
  const rows = findTab(book, tab);
  if (!rows) {
    problems.push(`There is no "${tab}" tab in the file.`);
    return [];
  }
  const required = columns.filter((c) => !c.optional);
  for (let h = 0; h < Math.min(rows.length, 10); h++) {
    const headers = (rows[h] ?? []).map(columnKey);
    const at: Record<string, number> = {};
    for (const c of columns) {
      const i = headers.findIndex((x) => c.names.includes(x));
      if (i >= 0) at[c.field] = i;
    }
    if (!required.every((c) => c.field in at)) continue;
    for (const c of columns)
      if (c.ifMissing && !(c.field in at)) notes.push(`The "${tab}" tab has no ${c.label} column, so ${c.ifMissing}`);
    return rows
      .map((cells, i) => ({
        row: i + 1,
        get: (field: string) => (field in at ? (cells?.[at[field]] ?? '').trim() : ''),
      }))
      .slice(h + 1)
      .filter((r) => required.some((c) => r.get(c.field) !== ''));
  }
  const want = required.map((c) => `"${c.label}"`).join(', ');
  problems.push(`The "${tab}" tab needs a header row with these columns: ${want}.`);
  return [];
};

const BOOTH_COLUMNS: Column[] = [
  { field: 'name', label: 'Booth name', names: ['boothname', 'booth'] },
  { field: 'track', label: 'Track', names: ['track'] },
  { field: 'category', label: 'Category', names: ['category', 'boothcategory'] },
  {
    field: 'location',
    label: 'Location',
    names: ['location', 'golfbays', 'golfbay', 'bays', 'bay'],
    optional: true,
    ifMissing: 'no locations (bay numbers) will be uploaded.',
  },
];
const TEAM_COLUMNS: Column[] = [
  { field: 'name', label: 'Team name', names: ['teamname', 'team'] },
  { field: 'track', label: 'Track', names: ['track'] },
  { field: 'booth', label: 'Booth', names: ['booth', 'boothname'] },
  { field: 'school', label: "Team lead's school", names: ['teamleadsschool', 'teamleadschool', 'school'] },
  { field: 'region', label: 'Region', names: ['region'], optional: true },
];
const JUDGE_COLUMNS: Column[] = [
  { field: 'name', label: 'Judge name', names: ['judgename', 'name', 'judge'] },
  {
    field: 'email',
    label: 'Email',
    names: ['email', 'emailaddress', 'judgeemail'],
    optional: true,
    ifMissing: 'no judge emails will be uploaded.',
  },
  { field: 'booth', label: 'Booth', names: ['booth', 'boothname'] },
];

export const planUpload = (book: Record<string, Rows>, idStamp = Date.now()): UploadPlan => {
  const problems: string[] = [];
  const notes: string[] = [];

  // ---- Booths ----
  const booths: UploadBooth[] = [];
  const boothByKey = new Map<string, UploadBooth>();
  for (const r of readTab(book, 'Booths', BOOTH_COLUMNS, problems, notes)) {
    const at = `Booths, row ${r.row}`;
    const name = r.get('name').replace(/\s+/g, ' ');
    const track = trackOf(r.get('track'));
    if (!name) problems.push(`${at}: the booth name is empty.`);
    if (!track) problems.push(`${at}: the track is "${r.get('track')}". Use START or Track 2.`);
    if (!r.get('category')) problems.push(`${at}: the category is empty.`);
    if (!name) continue;
    if (boothByKey.has(key(name))) {
      problems.push(`${at}: ${name} is on the Booths tab twice.`);
      continue;
    }
    const booth: UploadBooth = {
      name,
      track: track ?? '',
      // No empty fields: the database refuses a field with no value.
      details: {
        ...(r.get('category') ? { category: r.get('category') } : {}),
        ...(r.get('location') ? { location: r.get('location') } : {}),
      },
    };
    booths.push(booth);
    boothByKey.set(key(name), booth);
  }
  if (!booths.length && findTab(book, 'Booths')) problems.push('The Booths tab has no booths.');

  // A booth name on another tab must be on the Booths tab.
  const boothFor = (at: string, typed: string): UploadBooth | undefined => {
    if (!typed) {
      problems.push(`${at}: the booth is empty.`);
      return undefined;
    }
    const booth = boothByKey.get(key(typed));
    if (!booth && booths.length) problems.push(`${at}: ${typed} is not on the Booths tab.`);
    return booth;
  };

  // ---- Teams ----
  const teams: Team[] = [];
  const teamNames = new Map<string, number>();
  for (const r of readTab(book, 'Teams', TEAM_COLUMNS, problems, notes)) {
    const at = `Teams, row ${r.row}`;
    const name = r.get('name').replace(/\s+/g, ' ');
    if (!name) problems.push(`${at}: the team name is empty.`);
    else if (teamNames.has(key(name))) problems.push(`${at}: ${name} is also on row ${teamNames.get(key(name))}.`);
    else teamNames.set(key(name), r.row);

    const booth = boothFor(at, r.get('booth'));
    const track = trackOf(r.get('track'));
    if (!track) problems.push(`${at}: the track is "${r.get('track')}". Use START or Track 2.`);
    else if (booth?.track && booth.track !== track)
      problems.push(`${at}: the team is ${track}, but ${booth.name} is a ${booth.track} booth.`);

    const typedSchool = r.get('school');
    const school = ALL_SCHOOLS.find((s) => key(s) === key(typedSchool));
    if (!typedSchool) problems.push(`${at}: the team lead's school is empty.`);
    else if (!school) problems.push(`${at}: "${typedSchool}" is not on the app's school list.`);
    const region = regionForSchool(school);
    const typedRegion = r.get('region');
    if (region && typedRegion && key(typedRegion) !== key(region))
      problems.push(`${at}: the Region column says ${typedRegion}, but ${school} is in the ${region}.`);

    if (name && booth && school)
      teams.push({ id: `team-${idStamp}-${teams.length + 1}`, name, school, boothCategory: booth.name, bonusPoints: 0 });
  }
  if (!teams.length && !problems.length) problems.push('The Teams tab has no teams.');

  // ---- Round 1 judges ----
  const judges: Judge[] = [];
  const judgeNames = new Map<string, number>();
  for (const r of readTab(book, 'Round 1 Judges', JUDGE_COLUMNS, problems, notes)) {
    const at = `Round 1 Judges, row ${r.row}`;
    const name = r.get('name').replace(/\s+/g, ' ');
    if (!name) problems.push(`${at}: the judge name is empty.`);
    else if (judgeNames.has(key(name))) problems.push(`${at}: ${name} is also on row ${judgeNames.get(key(name))}.`);
    else judgeNames.set(key(name), r.row);
    const email = r.get('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push(`${at}: "${email}" is not an email address.`);
    const booth = boothFor(at, r.get('booth'));
    if (name && booth)
      judges.push({ id: `judge-${idStamp}-${judges.length + 1}`, name, ...(email ? { email } : {}), boothAssigned: booth.name });
  }
  if (!judges.length && !problems.length) problems.push('The Round 1 Judges tab has no judges.');

  // ---- Each booth ----
  for (const b of booths) {
    const count = judges.filter((j) => j.boothAssigned === b.name).length;
    if (count > MAX_JUDGES_PER_BOOTH)
      problems.push(`${b.name} has ${count} judges. The most is ${MAX_JUDGES_PER_BOOTH}.`);
    else if (count < MAX_JUDGES_PER_BOOTH) notes.push(`${b.name} has ${count} judge${count === 1 ? '' : 's'}.`);
    if (!teams.some((t) => t.boothCategory === b.name)) notes.push(`${b.name} has no teams.`);
  }

  return { booths, teams, judges, problems, notes };
};

// The competition with the sheet's booths, teams and Round 1 judges in it.
// Finale judges already in the app stay.
export const applyUpload = (comp: Competition, plan: UploadPlan): Competition => ({
  ...comp,
  rounds: comp.rounds.map((r) =>
    r.roundType === 'booth'
      ? {
          ...r,
          boothCategories: plan.booths.map((b) => b.name),
          boothDetails: Object.fromEntries(plan.booths.map((b) => [b.name, b.details])),
        }
      : r
  ),
  teams: plan.teams,
  judges: [...comp.judges.filter((j) => j.roster === 'finale'), ...plan.judges],
});
