import type { BoothDetails, Competition, Judge, Round, Team } from '../types';
import { finalistTeams } from './finalists';

// MSP-47, MSP-38, MSP-48 and Steph's stories B, C and D: who judges what.
// Round 1 has booths. Each Round 1 judge has one booth and scores only the
// teams in it. The finale has its own judge list, with no booth.

export const NO_BOOTH = '';

// The booth list lives on the Round 1 (booth) round, in the "Booths" section
// of Competition Rounds.
export const boothList = (comp: Competition): string[] =>
  comp.rounds.find((r) => r.roundType === 'booth')?.boothCategories ?? [];

export const isFinaleJudge = (judge: Judge): boolean => judge.roster === 'finale';

// Steph, Oct 20: booths are named "Booth 1" to "Booth 10", with the category
// and the location (for example "Level 2, Bay 14") as separate fields.
export const boothDetails = (comp: Competition, booth: string): BoothDetails =>
  comp.rounds.find((r) => r.roundType === 'booth')?.boothDetails?.[booth] ?? {};

// "Booth 1 · HealthTech & Bio", or just "Booth 1" when it has no category.
export const boothLabel = (comp: Competition, booth: string): string => {
  const { category } = boothDetails(comp, booth);
  return category ? `${booth} · ${category}` : booth;
};

export const setBoothDetails = (comp: Competition, booth: string, details: BoothDetails): Competition => ({
  ...comp,
  rounds: comp.rounds.map((r) =>
    r.roundType === 'booth' ? { ...r, boothDetails: { ...(r.boothDetails ?? {}), [booth]: details } } : r
  ),
});

// The judges who score a round: Round 1 judges for the booth round, the
// finale judge list for the finale.
export const judgesForRound = (comp: Competition, round: Round | undefined): Judge[] =>
  comp.judges.filter((j) => (round?.roundType === 'finale' ? isFinaleJudge(j) : !isFinaleJudge(j)));

// The teams a judge scores in a round. Round 1: only their booth (none if
// they have no booth). Finale: every team in the finale.
export const teamsForJudge = (comp: Competition, round: Round, judge: Judge | undefined): Team[] => {
  if (!judge) return [];
  // Story A: the finale has only the booth winners (the finalists).
  if (round.roundType === 'finale') return isFinaleJudge(judge) ? finalistTeams(comp) : [];
  if (isFinaleJudge(judge) || !judge.boothAssigned) return [];
  return comp.teams.filter((t) => t.boothCategory === judge.boothAssigned);
};

// The judges expected to score a team in a round. Live Results counts a
// score as missing only for these judges.
export const judgesForTeam = (comp: Competition, round: Round | undefined, team: Team): Judge[] =>
  judgesForRound(comp, round).filter(
    (j) => round?.roundType === 'finale' || (!!j.boothAssigned && j.boothAssigned === team.boothCategory)
  );

export const isJudgeExpected = (comp: Competition, round: Round | undefined, team: Team, judge: Judge): boolean =>
  judgesForTeam(comp, round, team).some((j) => j.id === judge.id);

export interface BoothUsage {
  judges: string[];
  teams: string[];
}

export const boothUsage = (comp: Competition, booth: string): BoothUsage => ({
  judges: comp.judges.filter((j) => !isFinaleJudge(j) && j.boothAssigned === booth).map((j) => j.name),
  teams: comp.teams.filter((t) => t.boothCategory === booth).map((t) => t.name),
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// "Booth 1 still has 1 judge (Morgan Hill) and 2 teams (A, B). Move them first."
export const boothInUseMessage = (booth: string, usage: BoothUsage): string | null => {
  const parts: string[] = [];
  if (usage.judges.length) parts.push(`${plural(usage.judges.length, 'judge', 'judges')} (${usage.judges.join(', ')})`);
  if (usage.teams.length) parts.push(`${plural(usage.teams.length, 'team', 'teams')} (${usage.teams.join(', ')})`);
  return parts.length ? `${booth} still has ${parts.join(' and ')}. Move them first.` : null;
};

// Rename a booth everywhere at once: the booth list, its judges and its teams.
export const renameBooth = (comp: Competition, from: string, to: string): Competition => ({
  ...comp,
  rounds: comp.rounds.map((r) =>
    r.roundType === 'booth' && r.boothCategories
      ? {
          ...r,
          boothCategories: r.boothCategories.map((b) => (b === from ? to : b)),
          // The category and location move with the booth.
          ...(r.boothDetails
            ? {
                boothDetails: Object.fromEntries(
                  Object.entries(r.boothDetails).map(([b, d]) => [b === from ? to : b, d])
                ),
              }
            : {}),
        }
      : r
  ),
  judges: comp.judges.map((j) => (!isFinaleJudge(j) && j.boothAssigned === from ? { ...j, boothAssigned: to } : j)),
  teams: comp.teams.map((t) => (t.boothCategory === from ? { ...t, boothCategory: to } : t)),
});
