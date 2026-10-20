import {
  Competition,
  RubricTemplate,
  Round,
  Criterion,
  Judge,
  JudgeScoreSubmission,
  Team,
  TeamScoreSummary,
} from '../types';
import { INITIAL_COMPETITION, BUILT_IN_TEMPLATES } from '../data/seedData';
import { computeTeamSummaries } from './scoring';
import { isInRegion } from './regions';

// MSP-45: the shared database layer (services/cloud.ts) registers these hooks
// so that local saves are also sent to Firebase. Without them (tests, or no
// Firebase settings yet) the app works on this device only, as before.
export interface CloudHooks {
  onCompetitionSaved: (comp: Competition) => void;
  onSubmissionSaved: (sub: JudgeScoreSubmission) => void;
}

// Fired on window whenever data changes because another device changed it.
export const DATA_CHANGED_EVENT = 'tac-data-changed';

// One record per judge, team and round, so a score saved twice (for example
// once offline and once again later) can never become two scores.
export const submissionId = (roundId: string, teamId: string, judgeId: string): string =>
  `${roundId}__${teamId}__${judgeId}`;

const STORAGE_KEYS = {
  COMPETITION: 'tac_competition_v2',
  TEMPLATES: 'tac_templates_v2',
  SUBMISSIONS: 'tac_submissions_v2',
  ACTIVE_JUDGE: 'tac_active_judge_v2',
};

class StorageService {
  private isBrowser = typeof window !== 'undefined';
  private hooks: CloudHooks | null = null;

  setCloudHooks(hooks: CloudHooks | null): void {
    this.hooks = hooks;
  }

  // Store data that came from the shared database. Does not send it back.
  applyRemoteCompetition(comp: Competition): void {
    this.writeLocal(STORAGE_KEYS.COMPETITION, comp);
    this.notifyChanged();
  }

  applyRemoteSubmissions(subs: JudgeScoreSubmission[]): void {
    this.writeLocal(STORAGE_KEYS.SUBMISSIONS, subs);
    this.notifyChanged();
  }

  private notifyChanged(): void {
    if (this.isBrowser) window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }

  private writeLocal(key: string, value: unknown): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save to storage', e);
    }
  }

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
    this.writeLocal(STORAGE_KEYS.COMPETITION, INITIAL_COMPETITION);
    return INITIAL_COMPETITION;
  }

  saveCompetition(comp: Competition): void {
    this.writeLocal(STORAGE_KEYS.COMPETITION, comp);
    this.hooks?.onCompetitionSaved(comp);
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

  // A fully independent copy: new criterion IDs and deep-copied point
  // definitions, so editing either round never changes the other.
  private cloneRound(source: Round, id: string, name: string): Round {
    const criteria: Criterion[] = source.rubric.criteria.map((c) => ({
      ...c,
      id: `crit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      scaleAnchors: c.scaleAnchors ? JSON.parse(JSON.stringify(c.scaleAnchors)) : undefined,
    }));
    return {
      id,
      name,
      roundType: 'finale',
      status: 'draft',
      isLocked: false,
      rubric: { id: `rubric-${id}`, name: `${name} Rubric`, criteria },
    };
  }

  duplicateRound(sourceRoundId: string, newRoundName: string): Round | null {
    const comp = this.getCompetition();
    const sourceRound = comp.rounds.find((r) => r.id === sourceRoundId);
    if (!sourceRound) return null;

    const clonedRound = this.cloneRound(sourceRound, `round-${Date.now()}`, newRoundName);
    comp.rounds.push(clonedRound);
    this.saveCompetition(comp);
    return clonedRound;
  }

  // MSP-33: Round 1 is the booth round (or the first round); Round 2 is any
  // other finale round.
  findRound1And2(rounds: Round[]): { round1?: Round; round2?: Round } {
    const round1 = rounds.find((r) => r.roundType === 'booth') || rounds[0];
    const round2 = rounds.find((r) => r.roundType === 'finale' && r.id !== round1?.id);
    return { round1, round2 };
  }

  // MSP-33: create Round 2 as a copy of Round 1, or replace an existing
  // Round 2 that is still an editable draft. A Round 2 that has been opened
  // is never overwritten.
  copyRound1ToRound2(): Round | null {
    const comp = this.getCompetition();
    const { round1, round2 } = this.findRound1And2(comp.rounds);
    if (!round1) return null;
    if (round2 && (round2.status !== 'draft' || round2.isLocked)) return null;

    if (round2) {
      const replacement = this.cloneRound(round1, round2.id, round2.name);
      comp.rounds = comp.rounds.map((r) => (r.id === round2.id ? replacement : r));
      this.saveCompetition(comp);
      return replacement;
    }
    const created = this.cloneRound(round1, `round-${Date.now()}`, 'Round 2: Pitch Finale');
    comp.rounds.push(created);
    this.saveCompetition(comp);
    return created;
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
      if (isInRegion(team, regionName)) {
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
    // MSP-32: a live round's rubric is locked, so a template cannot replace it.
    if (comp.rounds.some((r) => r.status === 'live')) return null;
    // Loaded rounds start fresh: new IDs (scores are filed by round ID, so a
    // past competition's scores never appear in the new setup), editable
    // drafts, and no finalized results carried over from the past.
    const stamp = Date.now();
    comp.rounds = (JSON.parse(JSON.stringify(template.rounds)) as Round[]).map((r, i) => {
      const id = `round-${stamp}-${i + 1}`;
      return {
        id,
        name: r.name,
        roundType: r.roundType,
        status: 'draft',
        isLocked: false,
        rubric: { ...r.rubric, id: `rubric-${id}` },
        ...(r.boothCategories ? { boothCategories: r.boothCategories } : {}),
      };
    });
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

  // MSP-38: move a Round 1 judge to another booth (or to no booth).
  updateJudge(judgeId: string, changes: Partial<Omit<Judge, 'id'>>): Judge | null {
    const comp = this.getCompetition();
    const judge = comp.judges.find((j) => j.id === judgeId);
    if (!judge) return null;
    Object.assign(judge, changes);
    this.saveCompetition(comp);
    return judge;
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

  // --- TEAM EDITOR (MSP-43) ---
  addTeam(team: { name: string; founderNames?: string; school?: string; boothCategory: string }): Team {
    const comp = this.getCompetition();
    const newTeam: Team = { ...team, id: `team-${Date.now()}`, bonusPoints: 0 };
    comp.teams.push(newTeam);
    this.saveCompetition(comp);
    return newTeam;
  }

  updateTeam(teamId: string, changes: Partial<Omit<Team, 'id'>>): Team | null {
    const comp = this.getCompetition();
    const team = comp.teams.find((t) => t.id === teamId);
    if (!team) return null;
    Object.assign(team, changes);
    this.saveCompetition(comp);
    return team;
  }

  teamHasScores(teamId: string): boolean {
    return this.getAllSubmissions().some((s) => s.teamId === teamId);
  }

  // A team with scores is never removed, so no score silently disappears.
  removeTeam(teamId: string): boolean {
    if (this.teamHasScores(teamId)) return false;
    const comp = this.getCompetition();
    const before = comp.teams.length;
    comp.teams = comp.teams.filter((t) => t.id !== teamId);
    if (comp.teams.length === before) return false;
    this.saveCompetition(comp);
    return true;
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
      this.hooks?.onSubmissionSaved(updated);
      return updated;
    }

    const newSubmission: JudgeScoreSubmission = {
      ...payload,
      id: submissionId(payload.roundId, payload.teamId, payload.judgeId),
      rawTotal,
      submittedAt: now,
    };

    subs.push(newSubmission);
    this.saveSubmissions(subs);
    this.hooks?.onSubmissionSaved(newSubmission);
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
    this.hooks?.onSubmissionSaved(updated);
    return updated;
  }

  // MSP-05, MSP-06, MSP-19: Real-time submission matrix & automatic tabulations
  getTeamScoreSummaries(roundId: string): TeamScoreSummary[] {
    const comp = this.getCompetition();
    const round = comp.rounds.find((r) => r.id === roundId) || comp.rounds[0];
    const allSubs = this.getAllSubmissions().filter((s) => s.roundId === round?.id);

    return computeTeamSummaries(comp, round, allSubs);
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
