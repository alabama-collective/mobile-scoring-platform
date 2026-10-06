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
  region: string;               // MSP-35: Winning region bonus tracking
  boothCategory: string;        // Round 1 booth classification
  founderNames?: string;
  bonusPoints: number;          // MSP-35: 5 bonus points when region wins
}

export interface Judge {
  id: string;
  name: string;
  email?: string;
  boothAssigned?: string;       // For Round 1 booth grouping
}

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
}

export interface TeamScoreSummary {
  team: Team;
  roundId: string;
  judgeScores: JudgeScoreSubmission[];
  submissionCount: number;
  totalSubmissionsRequired: number;
  allJudgesSubmitted: boolean;
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
  boothCategories?: string[];   // Specific categories for pitch booths
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
  regions: string[];
  winningRegion?: string;       // MSP-35: Gift Classic winning region
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
