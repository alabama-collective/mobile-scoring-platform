import { REGIONS } from '../config/regions';
import type { Team } from '../types';

// MSP-41: a team's region is worked out from its team lead's school, using
// the one list in src/config/regions.ts. It is never typed by hand.

export const REGION_NAMES = Object.keys(REGIONS);

export const ALL_SCHOOLS = REGION_NAMES.flatMap((r) => REGIONS[r]);

const norm = (s: string) => s.trim().toLowerCase();

export const regionForSchool = (school: string | undefined): string | undefined => {
  if (!school) return undefined;
  return REGION_NAMES.find((r) => REGIONS[r].some((s) => norm(s) === norm(school)));
};

// The team's region, or '' when it has no school from the list yet.
export const teamRegion = (team: Team): string => regionForSchool(team.school) ?? '';

export const isInRegion = (team: Team, region: string | undefined): boolean =>
  !!region && norm(teamRegion(team)) === norm(region);
