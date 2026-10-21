import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../services/storageService';

describe('Epic 2 & Epic 3 Acceptance Criteria Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetToDefaults();
  });

  // --- EPIC 2: JUDGE SCORING ON ANY DEVICE ---

  it('MSP-23: Issues an on-screen confirmation receipt when a score is submitted', () => {
    const comp = storageService.getCompetition();
    const judge = comp.judges[0];
    const team = comp.teams[0];
    const round = comp.rounds[0];

    const submission = storageService.submitJudgeScore({
      judgeId: judge.id,
      judgeName: judge.name,
      teamId: team.id,
      roundId: round.id,
      scores: {
        'crit-clarity': 9,
        'crit-market': 8,
        'crit-feasibility': 9,
        'crit-differentiation': 8,
        'crit-delivery': 10,
      },
      feedbackWorkedWell: 'Clear pitch and compelling data.',
      feedbackCouldImprove: 'Add details on cost per user.',
    });

    expect(submission.id).toBeDefined();
    expect(submission.rawTotal).toBe(44);
    expect(submission.submittedAt).toBeDefined();
    expect(submission.judgeName).toBe(judge.name);

    // Verify stored
    const allSubs = storageService.getAllSubmissions();
    const stored = allSubs.find((s) => s.id === submission.id);
    expect(stored).toBeDefined();
    expect(stored?.rawTotal).toBe(44);
  });

  it('MSP-24: Allows low-stakes score revision for an already submitted score', () => {
    const comp = storageService.getCompetition();
    const judge = comp.judges[0];
    const team = comp.teams[0];
    const round = comp.rounds[0];

    // Initial submission
    const initial = storageService.submitJudgeScore({
      judgeId: judge.id,
      judgeName: judge.name,
      teamId: team.id,
      roundId: round.id,
      scores: {
        'crit-clarity': 7,
      },
    });
    expect(initial.rawTotal).toBe(7);

    // Revised submission (judge changes score from 7 to 10)
    const revised = storageService.submitJudgeScore({
      judgeId: judge.id,
      judgeName: judge.name,
      teamId: team.id,
      roundId: round.id,
      scores: {
        'crit-clarity': 10,
      },
      feedbackWorkedWell: 'Re-evaluated based on strong Q&A answers.',
    });

    expect(revised.rawTotal).toBe(10);
    expect(revised.updatedAt).toBeDefined();

    // Verify only ONE submission exists for this judge+team combination (no duplicate ghosts)
    const allSubs = storageService
      .getAllSubmissions()
      .filter((s) => s.judgeId === judge.id && s.teamId === team.id && s.roundId === round.id);
    expect(allSubs.length).toBe(1);
    expect(allSubs[0].rawTotal).toBe(10);
  });

  // --- EPIC 3: LIVE RESULTS AND SUBMISSION TRACKING ---

  it('MSP-05 & MSP-19: Displays real-time submission status identifying which judges have and have NOT submitted', () => {
    const comp = storageService.getCompetition();
    const team1 = comp.teams[0];
    const team2 = comp.teams[1];
    const round = comp.rounds[0];
    const judge1 = comp.judges[0];
    const judge2 = comp.judges[1];

    // Judge 1 scores Team 1
    storageService.submitJudgeScore({
      judgeId: judge1.id,
      judgeName: judge1.name,
      teamId: team1.id,
      roundId: round.id,
      scores: { 'crit-clarity': 10 },
    });

    const summaries = storageService.getTeamScoreSummaries(round.id);
    const team1Summary = summaries.find((s) => s.team.id === team1.id);
    const team2Summary = summaries.find((s) => s.team.id === team2.id);

    // Team 1 has 1 submission from Judge 1, Judge 2 is missing
    expect(team1Summary).toBeDefined();
    expect(team1Summary?.submissionCount).toBe(1);
    expect(team1Summary?.judgeScores[0].judgeId).toBe(judge1.id);
    expect(team1Summary?.allJudgesSubmitted).toBe(false);

    // Team 2 has 0 submissions
    expect(team2Summary).toBeDefined();
    expect(team2Summary?.submissionCount).toBe(0);
    expect(team2Summary?.allJudgesSubmitted).toBe(false);

    // Now Judge 2 scores Team 1 as well
    storageService.submitJudgeScore({
      judgeId: judge2.id,
      judgeName: judge2.name,
      teamId: team1.id,
      roundId: round.id,
      scores: { 'crit-clarity': 8 },
    });

    const updatedSummaries = storageService.getTeamScoreSummaries(round.id);
    const updatedTeam1 = updatedSummaries.find((s) => s.team.id === team1.id);
    expect(updatedTeam1?.submissionCount).toBe(2);
  });

  it('MSP-06 and story H: tallies each booth automatically, sums the judges, and keeps an audit trail', () => {
    const comp = storageService.getCompetition();
    const round = comp.rounds[0];
    // Both teams are in Booth 3, judged by Jordan Lake and Sam Ellis.
    const teamA = comp.teams.find((t) => t.name === 'AgroPulse Sensors')!;
    const teamB = comp.teams.find((t) => t.name === 'Bham Solar Grid')!;
    const judge1 = comp.judges.find((j) => j.name === 'Jordan Lake')!;
    const judge2 = comp.judges.find((j) => j.name === 'Sam Ellis')!;

    // Team A gets 40 and 50: a judges' total of 90
    storageService.submitJudgeScore({
      judgeId: judge1.id,
      judgeName: judge1.name,
      teamId: teamA.id,
      roundId: round.id,
      scores: { 'crit-clarity': 10, 'crit-market': 10, 'crit-feasibility': 10, 'crit-differentiation': 10 },
    });
    storageService.submitJudgeScore({
      judgeId: judge2.id,
      judgeName: judge2.name,
      teamId: teamA.id,
      roundId: round.id,
      scores: { 'crit-clarity': 10, 'crit-market': 10, 'crit-feasibility': 10, 'crit-differentiation': 10, 'crit-delivery': 10 },
    });

    // Team B gets 30 from judge 1 only
    storageService.submitJudgeScore({
      judgeId: judge1.id,
      judgeName: judge1.name,
      teamId: teamB.id,
      roundId: round.id,
      scores: { 'crit-clarity': 10, 'crit-market': 10, 'crit-feasibility': 10 },
    });

    const booth = storageService
      .getTeamScoreSummaries(round.id)
      .filter((s) => s.team.boothCategory === 'Booth 3');
    const [rank1, rank2] = booth;

    expect(rank1.team.id).toBe(teamA.id);
    expect(rank1.judgesTotal).toBe(90);
    expect(rank1.finalScore).toBe(90);
    expect(rank1.judgeScores.length).toBe(2); // Audit trail contains 2 entries
    expect(rank1.rank).toBe(1);

    expect(rank2.team.id).toBe(teamB.id);
    expect(rank2.judgesTotal).toBe(30);
    expect(rank2.judgeScores.length).toBe(1);
    expect(rank2.rank).toBe(2);
  });

  it('MSP-34: Reviews and confirms results before marked final', () => {
    const comp = storageService.getCompetition();
    const round = comp.rounds[0];
    expect(round.isResultsFinalized).toBeFalsy();

    const finalizedRound = storageService.finalizeResults(round.id, 'Avery Quinn');
    expect(finalizedRound).not.toBeNull();
    expect(finalizedRound?.isResultsFinalized).toBe(true);
    expect(finalizedRound?.finalizedBy).toBe('Avery Quinn');
    expect(finalizedRound?.finalizedAt).toBeDefined();
    expect(finalizedRound?.status).toBe('completed');

    // Confirm persisted
    const updatedComp = storageService.getCompetition();
    const savedRound = updatedComp.rounds.find((r) => r.id === round.id);
    expect(savedRound?.isResultsFinalized).toBe(true);
    expect(savedRound?.finalizedBy).toBe('Avery Quinn');
  });
});
