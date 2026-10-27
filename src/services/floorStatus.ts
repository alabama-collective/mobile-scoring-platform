import type { Competition, Judge, Round, Team } from '../types';
import { boothDetails, boothLabel, boothList, judgesForTeam } from './booths';
import { teamsInRound } from './finalists';

// Floor support status board (Steph, Oct 20): which scores are in, booth by
// booth, without any score. Booths still waiting on a score come first, so the
// floor team knows where to walk.

// One "this judge has scored this team" mark. Never holds the score.
export interface StatusMark {
  roundId: string;
  teamId: string;
  judgeId: string;
}

export const statusId = (m: StatusMark): string => `${m.roundId}__${m.teamId}__${m.judgeId}`;

export interface JudgeStatus {
  judge: Judge;
  done: number;
  expected: number;
  missingTeams: Team[];
}

export interface BoothStatus {
  key: string; // the booth name, or 'finale'
  label: string; // "Booth 3 · CleanTech & Urban", or "Finale"
  location?: string;
  teams: Team[];
  judges: JudgeStatus[];
  done: number;
  expected: number;
  complete: boolean;
}

export interface RoundStatus {
  booths: BoothStatus[];
  done: number;
  expected: number;
}

const groupStatus = (
  comp: Competition,
  round: Round,
  key: string,
  label: string,
  teams: Team[],
  isIn: (teamId: string, judgeId: string) => boolean,
  location?: string
): BoothStatus => {
  const byJudge = new Map<string, JudgeStatus>();
  teams.forEach((team) =>
    judgesForTeam(comp, round, team).forEach((judge) => {
      const js = byJudge.get(judge.id) ?? { judge, done: 0, expected: 0, missingTeams: [] };
      js.expected++;
      if (isIn(team.id, judge.id)) js.done++;
      else js.missingTeams.push(team);
      byJudge.set(judge.id, js);
    })
  );
  const judges = [...byJudge.values()];
  const done = judges.reduce((a, j) => a + j.done, 0);
  const expected = judges.reduce((a, j) => a + j.expected, 0);
  return { key, label, location, teams, judges, done, expected, complete: expected > 0 && done === expected };
};

export const roundStatus = (comp: Competition, round: Round, marks: StatusMark[]): RoundStatus => {
  const done = new Set(marks.filter((m) => m.roundId === round.id).map((m) => `${m.teamId}__${m.judgeId}`));
  const isIn = (teamId: string, judgeId: string) => done.has(`${teamId}__${judgeId}`);
  const teams = teamsInRound(comp, round);

  let booths: BoothStatus[];
  if (round.roundType === 'finale') {
    booths = teams.length ? [groupStatus(comp, round, 'finale', 'Finale', teams, isIn)] : [];
  } else {
    const order = boothList(comp);
    const names = [...new Set([...order, ...teams.map((t) => t.boothCategory).filter(Boolean)])];
    booths = names
      .map((b) => groupStatus(comp, round, b, boothLabel(comp, b), teams.filter((t) => t.boothCategory === b), isIn, boothDetails(comp, b).location))
      .filter((b) => b.teams.length > 0);
    // Booths still waiting on a score first, then the finished ones, each in booth order.
    booths = [...booths.filter((b) => !b.complete), ...booths.filter((b) => b.complete)];
  }
  return {
    booths,
    done: booths.reduce((a, b) => a + b.done, 0),
    expected: booths.reduce((a, b) => a + b.expected, 0),
  };
};

export type ViewerScope = 'round1' | 'all';

export const VIEWER_SCOPE_LABEL: Record<ViewerScope, string> = {
  round1: 'Round 1 only',
  all: 'Round 1 and finale',
};

// The round the board shows: the live round this person may see. With nothing
// live, Round 1, so the board is useful before and after judging.
export const boardRound = (
  comp: Competition,
  scope: ViewerScope
): { round?: Round; finaleHidden: boolean } => {
  const allowed = (r: Round) => scope === 'all' || r.roundType === 'booth';
  const live = comp.rounds.filter((r) => r.status === 'live');
  const liveAllowed = live.find(allowed);
  if (liveAllowed) return { round: liveAllowed, finaleHidden: false };
  const finaleLive = live.some((r) => r.roundType === 'finale');
  if (finaleLive) return { finaleHidden: true }; // a Round 1 viewer during the finale
  // Thursday test, step 3.8: once Round 1 is closed, a Round 1 viewer is done
  // too, before the finale opens.
  const booth = comp.rounds.find((r) => r.roundType === 'booth');
  if (scope === 'round1' && booth?.status === 'completed') return { finaleHidden: true };
  return { round: comp.rounds.find((r) => r.roundType === 'booth') ?? comp.rounds[0], finaleHidden: false };
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isEmailLike = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
