import type { Competition, JudgeScoreSubmission, Round, Team, TeamScoreSummary } from '../types';

// Steph's story A (Oct 14): when staff confirm Round 1, the top team in each
// booth (its score with the Give Classic bonus) is that booth's winner and goes
// to the finale automatically. Ties are flagged and staff pick. If a winner
// cannot compete, staff swap in that booth's runner-up. Staff never upload
// finalists by hand.

export const finaleRound = (comp: Competition): Round | undefined => comp.rounds.find((r) => r.roundType === 'finale');

// Booth name -> finalist team id, kept on the finale round.
export const finalistsByBooth = (comp: Competition): Record<string, string> => finaleRound(comp)?.finalists ?? {};

export const finalistTeams = (comp: Competition): Team[] => {
  const ids = new Set(Object.values(finalistsByBooth(comp)));
  return comp.teams.filter((t) => ids.has(t.id));
};

// The teams scored in a round: Round 1 has every team, the finale only its finalists.
export const teamsInRound = (comp: Competition, round: Round | undefined): Team[] =>
  round?.roundType === 'finale' ? finalistTeams(comp) : comp.teams;

export interface BoothStanding {
  booth: string;
  ranked: TeamScoreSummary[]; // best first
  leaders: TeamScoreSummary[]; // everyone tied for first (one when there is no tie)
  tied: boolean;
}

// Each booth's ranking, from the Round 1 summaries. Teams with no booth are left out.
export const boothStandings = (summaries: TeamScoreSummary[]): BoothStanding[] => {
  const byBooth = new Map<string, TeamScoreSummary[]>();
  summaries.forEach((s) => {
    const b = s.team.boothCategory;
    if (!b) return;
    byBooth.set(b, [...(byBooth.get(b) || []), s]);
  });
  return [...byBooth.entries()].map(([booth, list]) => {
    const ranked = [...list].sort((a, b) => b.finalScore - a.finalScore);
    const top = ranked[0]?.finalScore ?? 0;
    const leaders = ranked.filter((s) => s.finalScore === top);
    return { booth, ranked, leaders, tied: leaders.length > 1 };
  });
};

// How many expected scores are still missing for a round (the confirm guard).
export const missingScores = (summaries: TeamScoreSummary[]): number =>
  summaries.reduce((acc, s) => acc + Math.max(0, s.totalSubmissionsRequired - s.submissionCount), 0);

export const teamHasRoundScores = (subs: JudgeScoreSubmission[], roundId: string, teamId: string): boolean =>
  subs.some((s) => s.roundId === roundId && s.teamId === teamId);
