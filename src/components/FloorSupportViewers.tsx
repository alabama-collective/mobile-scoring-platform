import React, { useState } from 'react';
import { Eye, Trash2, UserPlus } from 'lucide-react';
import { isEmailLike, normalizeEmail, VIEWER_SCOPE_LABEL, type ViewerScope } from '../services/floorStatus';

// Floor support access (Steph, Oct 20). Staff keep the list of Google accounts
// that may open the status board. The list lives only in the database, never
// in the code. "Round 1 only" people see the pitch booths; "Round 1 and
// finale" people also see the finale.

export interface FloorViewer {
  email: string;
  scope: ViewerScope;
}

export const FloorSupportViewers: React.FC<{
  enabled: boolean;
  viewers: FloorViewer[];
  onSave: (email: string, scope: ViewerScope) => Promise<boolean> | boolean;
  onRemove: (email: string) => Promise<boolean> | boolean;
}> = ({ enabled, viewers, onSave, onRemove }) => {
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState<ViewerScope>('round1');
  const [message, setMessage] = useState('');
  const link = `${window.location.origin}${window.location.pathname}#/status`;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailLike(email)) {
      setMessage('Type a full email address, for example name@gmail.com.');
      return;
    }
    const clean = normalizeEmail(email);
    const existing = viewers.find((v) => v.email === clean);
    if (await onSave(clean, scope)) {
      setMessage(existing ? `${clean} now has ${VIEWER_SCOPE_LABEL[scope]}.` : `${clean} added, ${VIEWER_SCOPE_LABEL[scope]}.`);
      setEmail('');
    } else {
      setMessage('The database did not save that. Check the connection and try again.');
    }
  };

  return (
    <section className="bg-tac-ink-800 rounded-sm border border-tac-ink-700 p-5 space-y-4" aria-label="Floor support access">
      <div>
        <h3 className="font-display font-bold text-sm text-tac-stone-100 uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4 text-tac-gold-500" /> Floor support access
        </h3>
        <p className="text-xs text-tac-stone-400 mt-1">
          People on this list sign in with their own Google account at the status page and see which scores are in, never the
          scores. They cannot change anything. Status page: <span className="font-mono text-tac-stone-300 break-all">{link}</span>
        </p>
      </div>

      {!enabled ? (
        <p className="text-xs text-amber-200">This needs the shared database. It works on the live site, not on a single device.</p>
      ) : (
        <>
          <form onSubmit={add} className="flex flex-wrap gap-2 items-end">
            <label className="flex-1 min-w-[12rem] text-xs text-tac-stone-300">
              Google email
              <input
                type="text"
                inputMode="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                aria-label="Floor support email"
                className="mt-1 w-full bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-3 py-2 text-xs text-white"
              />
            </label>
            <label className="text-xs text-tac-stone-300">
              Can see
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ViewerScope)}
                aria-label="Floor support access level"
                className="mt-1 block bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-2 py-2 text-xs text-white"
              >
                <option value="round1">{VIEWER_SCOPE_LABEL.round1}</option>
                <option value="all">{VIEWER_SCOPE_LABEL.all}</option>
              </select>
            </label>
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-2 bg-tac-gold-500 hover:bg-tac-gold-400 text-tac-ink-950 font-bold text-xs rounded-xs"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add
            </button>
          </form>
          {message && (
            <p role="status" className="text-xs text-tac-gold-300">
              {message}
            </p>
          )}

          {viewers.length === 0 ? (
            <p className="text-xs text-tac-stone-400">Nobody is on the list yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {viewers.map((v) => (
                <li
                  key={v.email}
                  className="bg-tac-ink-900 border border-tac-ink-700 rounded-xs px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <span className="text-white break-all">{v.email}</span>
                  <span className="flex items-center gap-2">
                    <select
                      value={v.scope}
                      onChange={async (e) => {
                        const next = e.target.value as ViewerScope;
                        setMessage((await onSave(v.email, next)) ? `${v.email} now has ${VIEWER_SCOPE_LABEL[next]}.` : 'The database did not save that.');
                      }}
                      aria-label={`Access for ${v.email}`}
                      className="bg-tac-ink-950 border border-tac-ink-700 rounded-xs px-2 py-1 text-xs text-white"
                    >
                      <option value="round1">{VIEWER_SCOPE_LABEL.round1}</option>
                      <option value="all">{VIEWER_SCOPE_LABEL.all}</option>
                    </select>
                    <button
                      onClick={async () => setMessage((await onRemove(v.email)) ? `${v.email} removed.` : 'The database did not save that.')}
                      aria-label={`Remove ${v.email}`}
                      className="text-tac-stone-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
