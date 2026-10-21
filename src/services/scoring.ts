import type { Competition, JudgeScoreSubmission, Round, TeamScoreSummary } from '../types';
import { judgesForTeam } from './booths';

// The results calculation used by Live Results AND by the scores export script
// (scripts/scores.ts), so the exported totals always match the screen exactly.
export const computeTeamSummaries = (
  comp: Competition,
  round: Round,
  allSubs: JudgeScoreSubmission[]
): TeamScoreSummary[] => {
  const summaries: TeamScoreSummary[] = comp.teams.map((team) => {
    // MSP-48: in Round 1 only the judges at the team's booth score it.
    const totalRequired = judgesForTeam(comp, round, team).length;
    const teamSubs = allSubs.filter((s) => s.teamId === team.id);
    const subCount = teamSubs.length;
    const allDone = subCount >= totalRequired && totalRequired > 0;

    // Average score across submitted judges
    const rawSum = teamSubs.reduce((acc, s) => acc + s.rawTotal, 0);
    const avg = subCount > 0 ? Number((rawSum / subCount).toFixed(2)) : 0;

    // MSP-35: 5 bonus points for Round 1 winning region
    const regionalBonus =
      round.roundType === 'booth' &&
      comp.winningRegion &&
      team.region.toLowerCase() === comp.winningRegion.toLowerCase()
        ? 5
        : 0;

    const finalScore = Number((avg + regionalBonus).toFixed(2));

    return {
      team,
      roundId: round.id,
      judgeScores: teamSubs,
      submissionCount: subCount,
      totalSubmissionsRequired: totalRequired,
      allJudgesSubmitted: allDone,
      averageScore: avg,
      regionalBonus,
      finalScore,
    };
  });

  // Sort by finalScore descending
  summaries.sort((a, b) => b.finalScore - a.finalScore);

  // Assign ranks
  summaries.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return summaries;
};
