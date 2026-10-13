import { Competition, RubricTemplate, ScoringScaleAnchor, Criterion, Judge } from '../types';

export const OFFICIAL_SCALE_ANCHORS: ScoringScaleAnchor[] = [
  { range: '9–10', label: 'Exceptional', description: 'Clear, specific, convincing.' },
  { range: '7–8', label: 'Strong', description: 'Solid, with a gap or two.' },
  { range: '5–6', label: 'Developing', description: 'The idea is there; the articulation is not yet.' },
  { range: '3–4', label: 'Unclear', description: 'Unclear or barely addressed.' },
  { range: '1–2', label: 'Not Addressed', description: 'Not addressed.' },
];

export const OFFICIAL_CRITERIA: Criterion[] = [
  {
    id: 'crit-clarity',
    title: 'Clarity of Business Idea',
    description: 'How clearly did they explain what the venture does and the problem it solves?',
    maxPoints: 10,
    scaleAnchors: OFFICIAL_SCALE_ANCHORS,
  },
  {
    id: 'crit-market',
    title: 'Market Need and Fit',
    description: 'Do they understand their target audience and demonstrate a real market need?',
    maxPoints: 10,
    scaleAnchors: OFFICIAL_SCALE_ANCHORS,
  },
  {
    id: 'crit-feasibility',
    title: 'Product or Service Feasibility',
    description: 'Can this idea realistically work in the real world and scale over time?',
    maxPoints: 10,
    scaleAnchors: OFFICIAL_SCALE_ANCHORS,
  },
  {
    id: 'crit-differentiation',
    title: 'Differentiation and Competition Awareness',
    description: 'Do they understand competitors and what makes their solution unique?',
    maxPoints: 10,
    scaleAnchors: OFFICIAL_SCALE_ANCHORS,
  },
  {
    id: 'crit-delivery',
    title: 'Delivery and Engagement',
    description: 'Was the pitch confident, persuasive, and within the time limit? Did they respond well to questions?',
    maxPoints: 10,
    scaleAnchors: OFFICIAL_SCALE_ANCHORS,
  },
];

export const INITIAL_JUDGES: Judge[] = [
  { id: 'judge-1', name: 'Jordan Lake', email: 'jordan.lake@example.com', boothAssigned: 'CleanTech & Urban' },
  { id: 'judge-2', name: 'Morgan Hill', email: 'morgan.hill@example.com', boothAssigned: 'HealthTech & Bio' },
  { id: 'judge-3', name: 'Casey Brooks', email: 'casey.brooks@example.com', boothAssigned: 'FinTech & EdTech' },
  { id: 'judge-4', name: 'Dr. Riley Stone', email: 'riley.stone@example.com', boothAssigned: 'Consumer & Lifestyle' },
];

export const INITIAL_COMPETITION: Competition = {
  id: 'comp-mcc-bp-2026',
  name: 'HBCU Business Pitch Competition (MCC-BP 2026)',
  date: 'Thursday, October 29, 2026',
  location: 'Topgolf Birmingham, Signature Room',
  programDirector: 'Avery Quinn',
  regions: ['North Alabama', 'Central Alabama', 'Black Belt', 'Gulf Coast'],
  winningRegion: undefined,
  bonusPointsApplied: false,
  judges: INITIAL_JUDGES,
  rounds: [
    {
      id: 'round-1',
      name: 'Round 1: Pitch Booths',
      roundType: 'booth',
      status: 'draft',
      isLocked: false,
      boothCategories: ['HealthTech & Bio', 'FinTech & EdTech', 'CleanTech & Urban', 'Consumer & Lifestyle'],
      rubric: {
        id: 'rubric-r1',
        name: 'Pitch Booths Rubric (50 Points Total)',
        criteria: [...OFFICIAL_CRITERIA],
      },
    },
    {
      id: 'round-2',
      name: 'Round 2: Pitch Finale',
      roundType: 'finale',
      status: 'draft',
      isLocked: false,
      rubric: {
        id: 'rubric-r2',
        name: 'Pitch Finale Stage Rubric (50 Points Total)',
        criteria: [...OFFICIAL_CRITERIA],
      },
    },
  ],
  teams: [
    {
      id: 'team-1',
      name: 'AgroPulse Sensors',
      region: 'Black Belt',
      boothCategory: 'CleanTech & Urban',
      founderNames: 'Marcus Vance & Jada Hayes',
      bonusPoints: 0,
    },
    {
      id: 'team-2',
      name: 'HealthConnect Mobile',
      region: 'Central Alabama',
      boothCategory: 'HealthTech & Bio',
      founderNames: 'Alana Robinson',
      bonusPoints: 0,
    },
    {
      id: 'team-3',
      name: 'EduPath Pathways',
      region: 'North Alabama',
      boothCategory: 'FinTech & EdTech',
      founderNames: 'Darius Washington',
      bonusPoints: 0,
    },
    {
      id: 'team-4',
      name: 'Gulf Coast Cold Chain',
      region: 'Gulf Coast',
      boothCategory: 'Consumer & Lifestyle',
      founderNames: 'Serena Davis',
      bonusPoints: 0,
    },
    {
      id: 'team-5',
      name: 'Bham Solar Grid',
      region: 'Central Alabama',
      boothCategory: 'CleanTech & Urban',
      founderNames: 'Kobe Bryant Jr.',
      bonusPoints: 0,
    },
  ],
};

export const BUILT_IN_TEMPLATES: RubricTemplate[] = [
  {
    id: 'template-mcc-bp-official',
    name: 'Official MCC-BP 5-Category Template',
    description: 'Standard 50-point rubric used for HBCU Business Pitch (10 pts per category with 5-tier anchors).',
    createdAt: '2026-09-29T10:00:00Z',
    isBuiltIn: true,
    rounds: JSON.parse(JSON.stringify(INITIAL_COMPETITION.rounds)),
  },
  {
    id: 'template-ia-eh-weighted',
    name: 'IA-EH 100-Point Weighted Template',
    description: 'Advanced rubric with expanded criteria weights (up to 30 points per category for feasibility & tech innovation).',
    createdAt: '2026-09-29T11:00:00Z',
    isBuiltIn: true,
    rounds: [
      {
        id: 'round-ia-1',
        name: 'Technical Assessment Round',
        roundType: 'booth',
        status: 'draft',
        isLocked: false,
        boothCategories: ['AI & Robotics', 'Hardware & Sensors'],
        rubric: {
          id: 'rubric-ia-1',
          name: '100-Point Scaled Rubric',
          criteria: [
            {
              id: 'crit-tech-arch',
              title: 'Technical Architecture & Feasibility',
              description: 'Demonstration of working code, architecture design, and scalability.',
              maxPoints: 30, // MSP-10: > 10 points
              scaleAnchors: [
                { range: '25–30', label: 'Exceptional', description: 'Production-ready architecture with clear scalability.' },
                { range: '18–24', label: 'Strong', description: 'Well-structured with minor edge-case oversights.' },
                { range: '10–17', label: 'Developing', description: 'Basic prototype exists; scalability unaddressed.' },
                { range: '1–9', label: 'Nascent', description: 'Concept only.' },
              ],
            },
            {
              id: 'crit-market-viability',
              title: 'Market Validation & Revenue Model',
              description: 'Customer discovery evidence, pilot customers, and revenue strategy.',
              maxPoints: 25, // MSP-10: > 10 points
            },
            {
              id: 'crit-team-exec',
              title: 'Team Execution & Competence',
              description: 'Team domain expertise and delivery capability.',
              maxPoints: 25, // MSP-10: > 10 points
            },
            {
              id: 'crit-presentation',
              title: 'Presentation & Q&A Response',
              description: 'Clarity, conciseness, and defense of technical decisions.',
              maxPoints: 20, // MSP-10: > 10 points
            },
          ],
        },
      },
    ],
  },
];
