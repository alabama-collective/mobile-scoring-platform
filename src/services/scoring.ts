import type { Competition, JudgeScoreSubmission, Round, TeamScoreSummary } from '../types';
import { boothList, judgesForTeam } from './booths';
import { isInRegion } from './regions';
import { teamsInRound } from './finalists';

// The Give Classic bonus (MSP-35). Steph, Oct 20: competitors were told each
// round is out of 50 with a 5-point bonus, so 5 points are added to EACH
// judge's score for a team from the winning region. A two-judge booth gets
// +10 on its combined total, a one-judge booth +5. Round 1 only.
export const GIVE_CLASSIC_BONUS = 5;

// The results calculation used by Live Results AND by the scores export script
// (scripts/scores.ts), so the exported totals always match the screen exactly.
//
// Story H (Steph, Oct 16): a team's total is the SUM of its judges' scores,
// plus the Give Classic bonus once. In Round 1 each booth has its own winner,
// so teams are ranked within their booth. The finale ranks every team together.
export const computeTeamSummaries = (
  comp: Competition,
  round: Round,
  allSubs: JudgeScoreSubmission[]
): TeamScoreSummary[] => {
  // Story A: the finale scores only its finalists.
  const summaries: TeamScoreSummary[] = teamsInRound(comp, round).map((team) => {
    // MSP-48: in Round 1 only the judges at the team's booth score it.
    const totalRequired = judgesForTeam(comp, round, team).length;
    const teamSubs = allSubs.filter((s) => s.teamId === team.id);
    const subCount = teamSubs.length;
    const allDone = subCount >= totalRequired && totalRequired > 0;

    const judgesTotal = teamSubs.reduce((acc, s) => acc + s.rawTotal, 0);
    const avg = subCount > 0 ? Number((judgesTotal / subCount).toFixed(2)) : 0;

    // MSP-35: 5 per judge who has scored the team, for the winning region,
    // Round 1 only (an unscored team shows 0, not just the bonus).
    const regionalBonus =
      round.roundType === 'booth' && isInRegion(team, comp.winningRegion) ? GIVE_CLASSIC_BONUS * subCount : 0;

    const finalScore = judgesTotal + regionalBonus;

    return {
      team,
      roundId: round.id,
      judgeScores: teamSubs,
      submissionCount: subCount,
      totalSubmissionsRequired: totalRequired,
      allJudgesSubmitted: allDone,
      judgesTotal,
      averageScore: avg,
      regionalBonus,
      finalScore,
    };
  });

  if (round.roundType === 'booth') {
    // Booths in the order of the booth list, teams with no booth last.
    const order = boothList(comp);
    const boothIndex = (b: string) => {
      const i = order.indexOf(b);
      return i === -1 ? order.length : i;
    };
    summaries.sort(
      (a, b) =>
        boothIndex(a.team.boothCategory) - boothIndex(b.team.boothCategory) ||
        a.team.boothCategory.localeCompare(b.team.boothCategory) ||
        b.finalScore - a.finalScore
    );
    let booth: string | null = null;
    let rank = 0;
    summaries.forEach((s) => {
      if (s.team.boothCategory !== booth) {
        booth = s.team.boothCategory;
        rank = 0;
      }
      s.rank = ++rank;
    });
  } else {
    summaries.sort((a, b) => b.finalScore - a.finalScore);
    summaries.forEach((s, idx) => {
      s.rank = idx + 1;
    });
  }

  return summaries;
};
