import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../services/storageService';
import { allTeamsInFinale } from './helpers';

// Story H (Steph, Oct 16): booth totals combine both judges' scores, plus the
// Give Classic bonus once, and each booth is ranked on its own. Made-up names.
const score = (judgeName: string, teamName: string, roundIndex: number, points: number[]) => {
  const comp = storageService.getCompetition();
  const round = comp.rounds[roundIndex];
  const judge = comp.judges.find((j) => j.name === judgeName)!;
  const team = comp.teams.find((t) => t.name === teamName)!;
  const ids = round.rubric.criteria.map((c) => c.id);
  storageService.submitJudgeScore({
    judgeId: judge.id,
    judgeName: judge.name,
    teamId: team.id,
    roundId: round.id,
    scores: Object.fromEntries(points.map((p, i) => [ids[i], p])),
  });
};
const summary = (roundIndex: number, teamName: string) =>
  storageService
    .getTeamScoreSummaries(storageService.getCompetition().rounds[roundIndex].id)
    .find((s) => s.team.name === teamName)!;

describe('Story H: booth totals', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetToDefaults();
  });

  it('2 judges: the total is the sum of both scores, plus 5 per judge for the winning region (+10)', () => {
    storageService.setWinningRegionBonus('South Region'); // AgroPulse Sensors: Tuskegee University, South
    score('Jordan Lake', 'AgroPulse Sensors', 0, [8, 8, 8, 8, 8]); // 40
    score('Sam Ellis', 'AgroPulse Sensors', 0, [9, 9, 9, 9, 9]); // 45
    const s = summary(0, 'AgroPulse Sensors');
    expect(s.judgesTotal).toBe(85);
    expect(s.regionalBonus).toBe(10);
    expect(s.finalScore).toBe(95);
    expect(s.allJudgesSubmitted).toBe(true);
  });

  it('1 judge: the total is that judge\'s score plus any bonus', () => {
    score('Morgan Hill', 'HealthConnect Mobile', 0, [7, 7, 7, 7, 7]);
    let s = summary(0, 'HealthConnect Mobile');
    expect(s.totalSubmissionsRequired).toBe(1);
    expect(s.finalScore).toBe(35);
    storageService.setWinningRegionBonus('South Region'); // Alabama State University
    s = summary(0, 'HealthConnect Mobile');
    expect(s.regionalBonus).toBe(5);
    expect(s.finalScore).toBe(40);
  });

  it('each booth is ranked on its own, so every booth has a number 1', () => {
    score('Jordan Lake', 'AgroPulse Sensors', 0, [5, 5, 5, 5, 5]);
    score('Jordan Lake', 'Bham Solar Grid', 0, [9, 9, 9, 9, 9]);
    score('Morgan Hill', 'HealthConnect Mobile', 0, [2, 2, 2, 2, 2]);
    const all = storageService.getTeamScoreSummaries(storageService.getCompetition().rounds[0].id);
    const winners = all.filter((s) => s.rank === 1).map((s) => s.team.name);
    expect(winners).toContain('Bham Solar Grid');
    expect(winners).toContain('HealthConnect Mobile');
    expect(winners).not.toContain('AgroPulse Sensors');
    expect(summary(0, 'AgroPulse Sensors').rank).toBe(2);
  });

  it('the finale sums its judges too, ranks all teams together, and has no bonus', () => {
    allTeamsInFinale();
    storageService.setWinningRegionBonus('South Region');
    score('Jamie Cole', 'AgroPulse Sensors', 1, [6, 6, 6, 6, 6]);
    score('Quinn Harper', 'AgroPulse Sensors', 1, [6, 6, 6, 6, 6]);
    score('Jamie Cole', 'EduPath Pathways', 1, [10, 10, 10, 10, 10]);
    const agro = summary(1, 'AgroPulse Sensors');
    expect(agro.finalScore).toBe(60);
    expect(agro.regionalBonus).toBe(0);
    expect(summary(1, 'AgroPulse Sensors').rank).toBe(1);
    expect(summary(1, 'EduPath Pathways').rank).toBe(2);
  });
});
