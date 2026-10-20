import { describe, it, expect } from 'vitest';
import { REGIONS } from '../config/regions';
import { ALL_SCHOOLS, REGION_NAMES, regionForSchool, teamRegion } from '../services/regions';
import { INITIAL_COMPETITION } from '../data/seedData';

// MSP-41: the North and South regions and their schools live in one file.
describe('MSP-41: Give Classic regions', () => {
  it('has the North Region and South Region with 7 schools each', () => {
    expect(REGION_NAMES).toEqual(['North Region', 'South Region']);
    expect(REGIONS['North Region']).toHaveLength(7);
    expect(REGIONS['South Region']).toHaveLength(7);
    expect(new Set(ALL_SCHOOLS).size).toBe(14);
  });

  it('works out a region from a school, ignoring capitals and extra spaces', () => {
    expect(regionForSchool('Talladega College')).toBe('North Region');
    expect(regionForSchool('  tuskegee university ')).toBe('South Region');
    expect(regionForSchool('Not A Listed School')).toBeUndefined();
    expect(regionForSchool(undefined)).toBeUndefined();
  });

  it('a team with no school has no region, so it cannot get the bonus', () => {
    const team = { ...INITIAL_COMPETITION.teams[0], school: undefined, region: 'Black Belt' };
    expect(teamRegion(team)).toBe('');
  });

  it('the old typed regions are gone from the app', () => {
    expect(INITIAL_COMPETITION.regions).toEqual(['North Region', 'South Region']);
    INITIAL_COMPETITION.teams.forEach((t) => expect(t.region).toBeUndefined());
  });
});
