import { storageService } from '../services/storageService';

// Story A: the finale has only finalists. Older tests that score the finale
// put every sample team in it directly, as if each had won its booth.
export const allTeamsInFinale = () => {
  const comp = storageService.getCompetition();
  const finale = comp.rounds.find((r) => r.roundType === 'finale')!;
  finale.finalists = Object.fromEntries(comp.teams.map((t) => [t.id, t.id]));
  storageService.saveCompetition(comp);
};
