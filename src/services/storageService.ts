import {
  Competition,
  RubricTemplate,
  Round,
  Criterion,
  Judge,
  JudgeScoreSubmission,
  TeamScoreSummary,
} from '../types';
import { INITIAL_COMPETITION, BUILT_IN_TEMPLATES } from '../data/seedData';

const STORAGE_KEYS = {
  COMPETITION: 'tac_competition_v2',
  TEMPLATES: 'tac_templates_v2',
  SUBMISSIONS: 'tac_submissions_v2',
  ACTIVE_JUDGE: 'tac_active_judge_v2',
};

class StorageService {
  private isBrowser = typeof window !== 'undefined';

  getCompetition(): Competition {
    if (!this.isBrowser) return INITIAL_COMPETITION;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPETITION);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load competition from storage', e);
    }
    this.saveCompetition(INITIAL_COMPETITION);
    return INITIAL_COMPETITION;
  }

  saveCompetition(comp: Competition): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEYS.COMPETITION, JSON.stringify(comp));
    } catch (e) {
      console.error('Failed to save competition to storage', e);
    }
  }

  getTemplates(): RubricTemplate[] {
    if (!this.isBrowser) return BUILT_IN_TEMPLATES;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (saved) {
        const userTemplates: RubricTemplate[] = JSON.parse(saved);
        const userIds = new Set(userTemplates.map((t) => t.id));
        return [...userTemplates, ...BUILT_IN_TEMPLATES.filter((b) => !userIds.has(b.id))];
      }
    } catch (e) {
      console.error('Failed to load templates from storage', e);
    }
    return BUILT_IN_TEMPLATES;
  }

  saveTemplate(template: Omit<RubricTemplate, 'id' | 'createdAt'>): RubricTemplate {
    const templates = this.getTemplates();
    const newTemplate: RubricTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isBuiltIn: false,
    };
    const updated = [newTemplate, ...templates.filter((t) => !t.isBuiltIn)];
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
    }
    return newTemplate;
  }

  deleteTemplate(templateId: string): boolean {
    const templates = this.getTemplates();
    const target = templates.find((t) => t.id === templateId);
    if (!target || target.isBuiltIn) return false;

    const filtered = templates.filter((t) => t.id !== templateId && !t.isBuiltIn);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(filtered));
    }
    return true;
  }

  duplicateRound(sourceRoundId: string, newRoundName: string): Round | null {
    const comp = this.getCompetition();
    const sourceRound = comp.rounds.find((r) => r.id === sourceRoundId);
    if (!sourceRound) return null;

    const newRoundId = `round-${Date.now()}`;
    const clonedCriteria: Criterion[] = sourceRound.rubric.criteria.map((c) => ({
      ...c,
      id: `crit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      scaleAnchors: c.scaleAnchors ? JSON.parse(JSON.stringify(c.scaleAnchors)) : undefined,
    }));

    const clonedRound: Round = {
      id: newRoundId,
      name: newRoundName,
      roundType: 'finale',
      status: 'draft',
      isLocked: false,
      rubric: {
        id: `rubric-${newRoundId}`,
        name: `${newRoundName} Rubric`,
        criteria: clonedCriteria,
      },
    };

    comp.rounds.push(clonedRound);
    this.saveCompetition(comp);
    return clonedRound;
  }

  setRoundStatus(roundId: string, status: 'draft' | 'live' | 'completed'): Competition {
    const comp = this.getCompetition();
    const round = comp.rounds.find((r) => r.id === roundId);
    if (round) {
      round.status = status;
      if (status === 'live') {
        round.isLocked = true;
      }
      this.saveCompetition(comp);
    }
    return comp;
  }

  setWinningRegionBonus(regionName: string | undefined): Competition {
    const comp = this.getCompetition();
    comp.winningRegion = regionName;
    comp.bonusPointsApplied = !!regionName;

    comp.teams.forEach((team) => {
      if (regionName && team.region.toLowerCase() === regionName.toLowerCase()) {
        team.bonusPoints = 5;
      } else {
        team.bonusPoints = 0;
      }
    });

    this.saveCompetition(comp);
    return comp;
  }

  applyTemplateToCompetition(templateId: string): Competition | null {
    const templates = this.getTemplates();
    const template = templates.find((t) => t.id === templateId);
    if (!template) return null;

    const comp = this.getCompetition();
    comp.rounds = JSON.parse(JSON.stringify(template.rounds));
    this.saveCompetition(comp);
    return comp;
  }

  // --- JUDGE ROSTER MANAGEMENT ---
  addJudge(judge: Omit<Judge, 'id'>): Judge {
    const comp = this.getCompetition();
    const newJudge: Judge = {
      ...judge,
      id: `judge-${Date.now()}`,
    };
    comp.judges.push(newJudge);
    this.saveCompetition(comp);
    return newJudge;
  }

  removeJudge(judgeId: string): boolean {
    const comp = this.getCompetition();
    const beforeCount = comp.judges.length;
    comp.judges = comp.judges.filter((j) => j.id !== judgeId);
    if (comp.judges.length !== beforeCount) {
      this.saveCompetition(comp);
      return true;
    }
    return false;
  }

  // --- SUBMISSIONS & SCORING (Epic 2 & Epic 3) ---
  getAllSubmissions(): JudgeScoreSubmission[] {
    if (!this.isBrowser) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load submissions', e);
      return [];
    }
  }

  private saveSubmissions(subs: JudgeScoreSubmission[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
    } catch (e) {
      console.error('Failed to save submissions', e);
    }
  }

  // MSP-23: Save score submission
  submitJudgeScore(
    payload: Omit<JudgeScoreSubmission, 'id' | 'submittedAt' | 'rawTotal'>
  ): JudgeScoreSubmission {
    const subs = this.getAllSubmissions();
    const rawTotal = Object.values(payload.scores).reduce((acc, val) => acc + (val || 0), 0);

    // Check if an existing submission exists for this judge + team + round
    const existingIndex = subs.findIndex(
      (s) =>
        s.judgeId === payload.judgeId &&
        s.teamId === payload.teamId &&
        s.roundId === payload.roundId
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      // Update existing (MSP-24)
      const updated: JudgeScoreSubmission = {
        ...subs[existingIndex],
        scores: payload.scores,
        rawTotal,
        feedbackWorkedWell: payload.feedbackWorkedWell,
        feedbackCouldImprove: payload.feedbackCouldImprove,
        updatedAt: now,
      };
      subs[existingIndex] = updated;
      this.saveSubmissions(subs);
      return updated;
    }

    const newSubmission: JudgeScoreSubmission = {
      ...payload,
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rawTotal,
      submittedAt: now,
    };

    subs.push(newSubmission);
    this.saveSubmissions(subs);
    return newSubmission;
  }

  // MSP-24: Low-stakes score revision
  updateJudgeScore(
    submissionId: string,
    updates: Partial<JudgeScoreSubmission>
  ): JudgeScoreSubmission | null {
    const subs = this.getAllSubmissions();
    const index = subs.findIndex((s) => s.id === submissionId);
    if (index === -1) return null;

    const current = subs[index];
    const newScores = updates.scores || current.scores;
    const rawTotal = Object.values(newScores).reduce((acc, v) => acc + (v || 0), 0);

    const updated: JudgeScoreSubmission = {
      ...current,
      ...updates,
      scores: newScores,
      rawTotal,
      updatedAt: new Date().toISOString(),
    };

    subs[index] = updated;
    this.saveSubmissions(subs);
    return updated;
  }

  // MSP-05, MSP-06, MSP-19: Real-time submission matrix & automatic tabulations
  getTeamScoreSummaries(roundId: string): TeamScoreSummary[] {
    const comp = this.getCompetition();
    const round = comp.rounds.find((r) => r.id === roundId) || comp.rounds[0];
    const allSubs = this.getAllSubmissions().filter((s) => s.roundId === round?.id);

    const activeJudges = comp.judges;
    const totalRequired = activeJudges.length;

    const summaries: TeamScoreSummary[] = comp.teams.map((team) => {
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
  }

  // MSP-34: Review and confirm final results
  finalizeResults(roundId: string, finalizedBy: string): Round | null {
    const comp = this.getCompetition();
    const round = comp.rounds.find((r) => r.id === roundId);
    if (!round) return null;

    round.isResultsFinalized = true;
    round.finalizedAt = new Date().toISOString();
    round.finalizedBy = finalizedBy;
    round.status = 'completed';

    this.saveCompetition(comp);
    return round;
  }

  resetToDefaults(): Competition {
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEYS.COMPETITION);
      localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
      localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
    }
    return this.getCompetition();
  }
}

export const storageService = new StorageService();
