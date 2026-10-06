import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../services/storageService';
import { OFFICIAL_CRITERIA } from '../data/seedData';
import { Criterion } from '../types';

describe('Epic 1 Acceptance Criteria Verification Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    storageService.resetToDefaults();
  });

  // MSP-01: Reusable Judging Templates
  it('MSP-01: Saves a judging form as a reusable template and applies it without retyping', () => {
    const comp = storageService.getCompetition();
    expect(comp.rounds.length).toBeGreaterThan(0);

    // Save current setup as a template
    const template = storageService.saveTemplate({
      name: 'Custom Spring Hackathon Template',
      description: 'Customized criteria for spring collegiate challenge',
      rounds: comp.rounds,
    });

    expect(template.id).toBeDefined();
    expect(template.name).toBe('Custom Spring Hackathon Template');

    // Retrieve templates
    const templates = storageService.getTemplates();
    const found = templates.find((t) => t.id === template.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Custom Spring Hackathon Template');

    // Apply template to active competition
    const updatedComp = storageService.applyTemplateToCompetition(template.id);
    expect(updatedComp).not.toBeNull();
    expect(updatedComp?.rounds.length).toBe(comp.rounds.length);
  });

  // MSP-10: Score entry fields support point ranges > 10
  it('MSP-10: Allows criteria point ranges greater than 10 (e.g. 15, 25, 30 points)', () => {
    const comp = storageService.getCompetition();
    const round = comp.rounds[0];

    const customCriterion: Criterion = {
      id: 'crit-advanced-tech',
      title: 'Advanced AI Architecture',
      description: 'Production readiness and technical depth',
      maxPoints: 30, // Point range > 10
    };

    round.rubric.criteria.push(customCriterion);
    storageService.saveCompetition(comp);

    const savedComp = storageService.getCompetition();
    const savedCrit = savedComp.rounds[0].rubric.criteria.find(
      (c) => c.id === 'crit-advanced-tech'
    );

    expect(savedCrit).toBeDefined();
    expect(savedCrit?.maxPoints).toBe(30);
    expect(savedCrit?.maxPoints).toBeGreaterThan(10);
  });

  // MSP-12: Round criteria and rubric visible inside scoring tool itself
  it('MSP-12: Embeds inline rubric guidance and scoring scale definitions inside criteria', () => {
    const comp = storageService.getCompetition();
    const round1 = comp.rounds.find((r) => r.id === 'round-1');
    expect(round1).toBeDefined();

    // Verify all official criteria contain inline descriptions ("What You're Listening For")
    round1?.rubric.criteria.forEach((crit) => {
      expect(crit.description).toBeDefined();
      expect(crit.description.length).toBeGreaterThan(10);
    });

    // Check specific official criterion
    const clarityCrit = round1?.rubric.criteria.find(
      (c) => c.title === 'Clarity of Business Idea'
    );
    expect(clarityCrit?.description).toContain(
      'How clearly did they explain what the venture does and the problem it solves?'
    );

    // Verify scale anchors exist (9-10 Exceptional, 7-8 Strong, etc.)
    expect(clarityCrit?.scaleAnchors).toBeDefined();
    expect(clarityCrit?.scaleAnchors?.length).toBe(5);
    expect(clarityCrit?.scaleAnchors?.[0].label).toBe('Exceptional');
  });

  // MSP-31: Platform configurable without a developer
  it('MSP-31: Allows coordinators to add/remove rounds, criteria, and pitch booth categories without code', () => {
    const comp = storageService.getCompetition();
    const initialRoundCount = comp.rounds.length;

    // Add a new round through service
    comp.rounds.push({
      id: 'round-breakout-1',
      name: 'Breakout Session Pitches',
      roundType: 'booth',
      status: 'draft',
      isLocked: false,
      boothCategories: ['Biotech', 'Cybersecurity'],
      rubric: {
        id: 'rubric-breakout',
        name: 'Breakout Rubric',
        criteria: [...OFFICIAL_CRITERIA],
      },
    });
    storageService.saveCompetition(comp);

    const reloaded = storageService.getCompetition();
    expect(reloaded.rounds.length).toBe(initialRoundCount + 1);
    expect(reloaded.rounds.some((r) => r.id === 'round-breakout-1')).toBe(true);
  });

  // MSP-32: Publish rubric and lock it when the round opens
  it('MSP-32: Locks the rubric when round status transitions to LIVE', () => {
    const comp = storageService.getCompetition();
    const targetRound = comp.rounds[0];
    expect(targetRound.status).toBe('draft');
    expect(targetRound.isLocked).toBe(false);

    // Set status to 'live'
    const liveComp = storageService.setRoundStatus(targetRound.id, 'live');
    const updatedRound = liveComp.rounds.find((r) => r.id === targetRound.id);

    expect(updatedRound?.status).toBe('live');
    expect(updatedRound?.isLocked).toBe(true); // Locked upon opening
  });

  // MSP-33: Set up Round 2 from Round 1 without retyping (independent clone)
  it('MSP-33: Creates an independent duplicate of Round 1 for Round 2 without mutating Round 1', () => {
    const initialComp = storageService.getCompetition();
    const round1 = initialComp.rounds[0];
    const initialRound1CriteriaCount = round1.rubric.criteria.length;

    // Clone Round 1 to create Round 2
    const clonedRound = storageService.duplicateRound(round1.id, 'Round 2: Stage Finale');
    expect(clonedRound).not.toBeNull();
    expect(clonedRound?.id).not.toBe(round1.id);
    expect(clonedRound?.rubric.criteria.length).toBe(initialRound1CriteriaCount);

    // Mutate the cloned Round 2
    const currentComp = storageService.getCompetition();
    const round2 = currentComp.rounds.find((r) => r.id === clonedRound?.id);
    expect(round2).toBeDefined();

    if (round2) {
      round2.rubric.criteria.push({
        id: 'crit-finale-stage-presence',
        title: 'Stage Presence & Audience Response',
        description: 'Command of stage and live audience engagement',
        maxPoints: 10,
      });
      storageService.saveCompetition(currentComp);
    }

    // Verify Round 1 was unaffected (independent copy)
    const refreshed = storageService.getCompetition();
    const freshRound1 = refreshed.rounds.find((r) => r.id === round1.id);
    const freshRound2 = refreshed.rounds.find((r) => r.id === clonedRound?.id);

    expect(freshRound1?.rubric.criteria.length).toBe(initialRound1CriteriaCount);
    expect(freshRound2?.rubric.criteria.length).toBe(initialRound1CriteriaCount + 1);
  });

  // MSP-35: 5 bonus points for teams from the winning region in Gift Classic
  it('MSP-35: Adds exactly 5 bonus points to Round 1 teams from the winning region', () => {
    const comp = storageService.getCompetition();
    expect(comp.teams.length).toBeGreaterThan(0);

    // Pick 'Central Alabama' as winning region
    const winningRegion = 'Central Alabama';
    const updatedComp = storageService.setWinningRegionBonus(winningRegion);

    expect(updatedComp.winningRegion).toBe(winningRegion);
    expect(updatedComp.bonusPointsApplied).toBe(true);

    // Check each team
    updatedComp.teams.forEach((team) => {
      if (team.region.toLowerCase() === winningRegion.toLowerCase()) {
        expect(team.bonusPoints).toBe(5);
      } else {
        expect(team.bonusPoints).toBe(0);
      }
    });

    // Verify clearing the bonus
    const clearedComp = storageService.setWinningRegionBonus(undefined);
    expect(clearedComp.bonusPointsApplied).toBe(false);
    expect(clearedComp.winningRegion).toBeUndefined();
    clearedComp.teams.forEach((team) => {
      expect(team.bonusPoints).toBe(0);
    });
  });
});
