import React, { useState } from 'react';
import { Competition, Team } from '../types';
import { storageService } from '../services/storageService';
import { boothList, NO_BOOTH } from '../services/booths';
import { REGION_NAMES, regionForSchool } from '../services/regions';
import { REGIONS } from '../config/regions';
import { Building2, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

// MSP-43: staff add and fix teams themselves, also after the freeze:
// rename, set the team lead and school, move to another booth, remove a no-show.
// The region is never typed: it comes from the school (MSP-41).

interface TeamEditorProps {
  competition: Competition;
  onUpdateCompetition: (comp: Competition) => void;
}

const inputClass =
  'w-full bg-tac-ink-950 border border-tac-ink-700 text-xs text-white rounded-xs px-2.5 py-1.5 focus:outline-none focus:border-tac-gold-700';

interface Draft {
  name: string;
  founderNames: string;
  school: string;
  boothCategory: string;
}

const emptyDraft: Draft = { name: '', founderNames: '', school: '', boothCategory: NO_BOOTH };

const SchoolSelect: React.FC<{ value: string; onChange: (v: string) => void; label: string }> = ({ value, onChange, label }) => (
  <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
    <option value="">School needed</option>
    {REGION_NAMES.map((region) => (
      <optgroup key={region} label={region}>
        {REGIONS[region].map((school) => (
          <option key={school} value={school}>
            {school}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
);

const BoothSelect: React.FC<{ value: string; booths: string[]; onChange: (v: string) => void; label: string }> = ({
  value,
  booths,
  onChange,
  label,
}) => (
  <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
    <option value={NO_BOOTH}>No booth</option>
    {booths.map((b) => (
      <option key={b} value={b}>
        {b}
      </option>
    ))}
    {value && !booths.includes(value) && <option value={value}>{value}</option>}
  </select>
);

const RegionTag: React.FC<{ school?: string }> = ({ school }) => {
  const region = regionForSchool(school);
  return region ? (
    <span className="text-[11px] text-tac-stone-300">{region}</span>
  ) : (
    <span className="text-[11px] font-semibold text-amber-400">School needed</span>
  );
};

export const TeamEditor: React.FC<TeamEditorProps> = ({ competition, onUpdateCompetition }) => {
  const booths = boothList(competition);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState('');
  const refresh = () => onUpdateCompetition(storageService.getCompetition());

  // Wednesday test, step 1.5: a team needs a booth, or no judge will ever score it.
  const boothMissing = (name: string, booth: string): string | null => {
    if (booth) return null;
    return booths.length
      ? `Pick a booth for ${name}. A team needs a booth so its judges can score it.`
      : `Add a booth first (Booths, in Competition Rounds), then add ${name}.`;
  };

  const nameTaken = (name: string, exceptId?: string) =>
    competition.teams.some((t) => t.id !== exceptId && t.name.trim().toLowerCase() === name.trim().toLowerCase());

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    if (nameTaken(name)) {
      setMessage(`There is already a team called ${name}.`);
      return;
    }
    const noBooth = boothMissing(name, draft.boothCategory);
    if (noBooth) {
      setMessage(noBooth);
      return;
    }
    storageService.addTeam({
      name,
      founderNames: draft.founderNames.trim() || undefined,
      school: draft.school || undefined,
      boothCategory: draft.boothCategory,
    });
    setDraft(emptyDraft);
    setMessage(`${name} added.`);
    refresh();
  };

  const startEdit = (team: Team) => {
    setEditingId(team.id);
    setEdit({
      name: team.name,
      founderNames: team.founderNames || '',
      school: team.school || '',
      boothCategory: team.boothCategory || NO_BOOTH,
    });
    setMessage('');
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const name = edit.name.trim();
    if (!name) return;
    if (nameTaken(name, editingId)) {
      setMessage(`There is already a team called ${name}.`);
      return;
    }
    const noBooth = boothMissing(name, edit.boothCategory);
    if (noBooth) {
      setMessage(noBooth);
      return;
    }
    storageService.updateTeam(editingId, {
      name,
      founderNames: edit.founderNames.trim() || undefined,
      school: edit.school || undefined,
      boothCategory: edit.boothCategory,
    });
    setEditingId(null);
    setMessage(`${name} saved.`);
    refresh();
  };

  // Moving booth straight from the list, without opening the edit form.
  const moveBooth = (team: Team, booth: string) => {
    storageService.updateTeam(team.id, { boothCategory: booth });
    setMessage(`${team.name} moved to ${booth || 'No booth'}.`);
    refresh();
  };

  const remove = (team: Team) => {
    if (!storageService.removeTeam(team.id)) {
      setMessage(`${team.name} already has scores, so it can't be removed.`);
      return;
    }
    setMessage(`${team.name} removed.`);
    refresh();
  };

  const needSchool = competition.teams.filter((t) => !regionForSchool(t.school)).length;

  return (
    <div className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-6 space-y-5">
      <div className="pb-4 border-b border-tac-ink-700">
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-tac-gold-500" />
          <h2 className="font-display font-bold text-base sm:text-lg text-white uppercase tracking-wide">
            Teams ({competition.teams.length})
          </h2>
        </div>
        <p className="text-xs text-tac-stone-400 mt-1">
          Add a team, fix a name, move a team to another booth, or remove a no-show. The region comes from the team lead's school.
          {needSchool > 0 && (
            <span className="text-amber-400 font-semibold">
              {' '}
              {needSchool} {needSchool === 1 ? 'team needs' : 'teams need'} a school before the Give Classic bonus can apply.
            </span>
          )}
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1.4fr_1fr_auto] gap-2 bg-tac-ink-900 p-3 rounded-xs border border-tac-ink-700"
      >
        <input
          required
          aria-label="Team name"
          placeholder="Team name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className={inputClass}
        />
        <input
          aria-label="Team lead"
          placeholder="Team lead (optional)"
          value={draft.founderNames}
          onChange={(e) => setDraft({ ...draft, founderNames: e.target.value })}
          className={inputClass}
        />
        <SchoolSelect value={draft.school} onChange={(v) => setDraft({ ...draft, school: v })} label="Team lead's school" />
        <BoothSelect value={draft.boothCategory} booths={booths} onChange={(v) => setDraft({ ...draft, boothCategory: v })} label="Team booth" />
        <button
          type="submit"
          className="px-3 py-1.5 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-bold text-xs rounded-xs flex items-center justify-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add team</span>
        </button>
      </form>

      {message && (
        <p role="status" className="text-xs text-tac-gold-300">
          {message}
        </p>
      )}

      <div className="space-y-2">
        {competition.teams.map((team) =>
          editingId === team.id ? (
            <form
              key={team.id}
              onSubmit={saveEdit}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1.4fr_1fr_auto] gap-2 bg-tac-ink-900 p-3 rounded-xs border border-tac-gold-700"
            >
              <input
                required
                aria-label={`New name for ${team.name}`}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                className={inputClass}
              />
              <input
                aria-label={`Team lead for ${team.name}`}
                placeholder="Team lead (optional)"
                value={edit.founderNames}
                onChange={(e) => setEdit({ ...edit, founderNames: e.target.value })}
                className={inputClass}
              />
              <SchoolSelect value={edit.school} onChange={(v) => setEdit({ ...edit, school: v })} label={`School for ${team.name}`} />
              <BoothSelect value={edit.boothCategory} booths={booths} onChange={(v) => setEdit({ ...edit, boothCategory: v })} label={`Booth for ${team.name}`} />
              <div className="flex gap-1">
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 bg-tac-gold-700 hover:bg-tac-gold-600 text-tac-ink-900 font-bold text-xs rounded-xs flex items-center justify-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-2 py-1.5 text-tac-stone-400 hover:text-white text-xs rounded-xs border border-tac-ink-700"
                  aria-label="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div
              key={team.id}
              className="bg-tac-ink-900 p-2.5 rounded-xs border border-tac-ink-700 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block">{team.name}</span>
                <span className="text-[11px] text-tac-stone-400">
                  {team.founderNames ? `${team.founderNames} • ` : ''}
                  {team.school ? `${team.school} • ` : ''}
                </span>
                <RegionTag school={team.school} />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-44">
                  <BoothSelect
                    value={team.boothCategory || NO_BOOTH}
                    booths={booths}
                    onChange={(v) => moveBooth(team, v)}
                    label={`Move ${team.name} to booth`}
                  />
                </div>
                <button
                  onClick={() => startEdit(team)}
                  className="text-tac-stone-500 hover:text-tac-gold-400 p-1"
                  title={`Edit ${team.name}`}
                  aria-label={`Edit ${team.name}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => remove(team)}
                  className="text-tac-stone-500 hover:text-red-400 p-1"
                  title={`Remove ${team.name}`}
                  aria-label={`Remove ${team.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        )}
        {competition.teams.length === 0 && <p className="text-xs text-tac-stone-500">No teams yet.</p>}
      </div>
    </div>
  );
};
