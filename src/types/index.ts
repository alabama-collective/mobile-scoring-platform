export type RoundStatus = 'draft' | 'live' | 'completed';
export type RoundType = 'booth' | 'finale';

export interface ScoringScaleAnchor {
  range: string;
  label: string;
  description: string;
}

export interface Criterion {
  id: string;
  title: string;
  description: string;          // MSP-12: Inline rubric guidance / "What You're Listening For"
  maxPoints: number;            // MSP-10: Point ranges supporting > 10 (15, 20, 25, 30+)
  category?: string;            // Round 1 pitch booth category
  scaleAnchors?: ScoringScaleAnchor[]; // MSP-12: Inline scoring breakdown anchors
}

export interface Rubric {
  id: string;
  name: string;
  criteria: Criterion[];
}

export interface Team {
  id: string;
  name: string;
  school?: string;              // MSP-41/43: team lead's school, from src/config/regions.ts
  region?: string;              // Before MSP-41 regions were typed by hand. Unused now: the region comes from the school.
  boothCategory: string;        // Round 1 booth classification
  founderNames?: string;
  bonusPoints: number;          // MSP-35: 5 bonus points when region wins
}

export interface Judge {
  id: string;
  name: string;
  email?: string;
  boothAssigned?: string;       // MSP-38: Round 1 booth, picked from the booth list
  roster?: JudgeRoster;         // Steph's story D: Round 1 judge (default) or finale judge
}

export type JudgeRoster = 'booth' | 'finale';

export interface JudgeScoreSubmission {
  id: string;
  judgeId: string;
  judgeName: string;
  teamId: string;
  roundId: string;
  scores: Record<string, number>; // criterionId -> points
  rawTotal: number;
  feedbackWorkedWell?: string;
  feedbackCouldImprove?: string;
  submittedAt: string;
  updatedAt?: string;
  uid?: string;                 // MSP-45: the sign in that saved it, so a judge can only change their own
}

export interface TeamScoreSummary {
  team: Team;
  roundId: string;
  judgeScores: JudgeScoreSubmission[];
  submissionCount: number;
  totalSubmissionsRequired: number;
  allJudgesSubmitted: boolean;
  judgesTotal: number;          // Story H: the sum of the judges' scores
  averageScore: number;
  regionalBonus: number;
  finalScore: number;
  rank?: number;
}

export interface Round {
  id: string;
  name: string;                 // "Round 1: Pitch Booths", "Round 2: Pitch Finale"
  roundType: RoundType;
  status: RoundStatus;          // MSP-32: 'draft' | 'live' | 'completed'
  rubric: Rubric;
  isLocked: boolean;            // MSP-32: Locked when status is 'live'
  boothCategories?: string[];   // MSP-47: the booth list for Round 1 (staff add, rename, remove)
  isResultsFinalized?: boolean; // MSP-34: Results confirmed by staff
  finalizedAt?: string;
  finalizedBy?: string;
}

export interface Competition {
  id: string;
  name: string;
  date: string;
  location: string;
  programDirector: string;
  rounds: Round[];
  teams: Team[];
  judges: Judge[];              // MSP-05, MSP-19: Official judge roster
  regions: string[];            // MSP-41: the region names (from src/config/regions.ts)
  winningRegion?: string;       // MSP-35: Give Classic winning region
  bonusPointsApplied: boolean;
}

export interface RubricTemplate {
  id: string;
  name: string;
  description: string;
  rounds: Round[];
  teams?: Team[];
  judges?: Judge[];
  createdAt: string;
  isBuiltIn?: boolean;
}
