import React from 'react';
import { AlertTriangle, CheckCircle2, LogOut, MapPin, Radio } from 'lucide-react';
import type { Competition } from '../types';
import { useCloudState, viewerSignIn, viewerSignOut } from '../services/cloud';
import { boardRound, roundStatus, VIEWER_SCOPE_LABEL, type StatusMark, type ViewerScope } from '../services/floorStatus';

const BRAND = `${import.meta.env.BASE_URL}brand/`;

// Floor support status board (Steph, Oct 20). The floor team signs in with
// their own Google account and sees which scores are in, never the scores.
// Booths still waiting on a score come first, with where they are and which
// judge still owes a score.

export const FloorHeader: React.FC<{ email?: string; onSignOut?: () => void }> = ({ email, onSignOut }) => (
  <header className="bg-tac-ink-900 border-b border-tac-ink-700 sticky top-0 z-50 shadow-tac-md">
    <div className="h-1 bg-gradient-to-r from-tac-gold-500 via-tac-gold-800 to-tac-gold-600 w-full" />
    <div className="max-w-xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
      <img src={`${BRAND}tac-submark.png`} alt="The Alabama Collective" className="h-9 w-9 shrink-0" />
      <span className="text-sm font-semibold text-tac-stone-300">Floor support</span>
      {email && onSignOut ? (
        <button
          onClick={onSignOut}
          className="flex items-center gap-1 text-xs text-tac-gold-400 underline underline-offset-2 shrink-0"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      ) : (
        <span className="w-9" />
      )}
    </div>
  </header>
);

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="max-w-xl mx-auto bg-tac-ink-800 border border-tac-ink-700 rounded-sm p-6 text-center space-y-3">{children}</div>
);

export const FloorSignIn: React.FC<{ onSignIn: () => void; message?: string; busy?: boolean }> = ({ onSignIn, message, busy }) => (
  <Card>
    <h2 className="font-display font-bold text-lg text-white">Floor support status</h2>
    <p className="text-sm text-tac-stone-300">Sign in with the Google account Steph approved. You will see which scores are in, booth by booth.</p>
    <button
      onClick={onSignIn}
      disabled={busy}
      className="w-full px-4 py-3 bg-tac-gold-500 hover:bg-tac-gold-400 disabled:opacity-60 text-tac-ink-950 font-bold text-sm rounded-sm"
    >
      {busy ? 'Signing in...' : 'Sign in with Google'}
    </button>
    {message && (
      <p role="alert" className="text-sm text-red-300">
        {message}
      </p>
    )}
  </Card>
);

export const FloorNotApproved: React.FC<{ email: string; onSignOut: () => void }> = ({ email, onSignOut }) => (
  <Card>
    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
    <h2 className="font-display font-bold text-lg text-white">This account is not on the floor support list</h2>
    <p className="text-sm text-tac-stone-300">
      You are signed in as <strong className="text-white break-all">{email}</strong>. Ask Steph or Damian to add this address, then
      this page opens by itself. If you have another Google account, sign out and use that one.
    </p>
    <button onClick={onSignOut} className="text-sm text-tac-gold-400 underline underline-offset-2">
      Sign out
    </button>
  </Card>
);

export const FloorChecking: React.FC = () => (
  <Card>
    <p className="text-sm text-tac-stone-300">Checking your access...</p>
  </Card>
);

export const FloorStatusBoard: React.FC<{
  competition: Competition;
  scope: ViewerScope;
  marks: StatusMark[];
  connected?: boolean;
}> = ({ competition, scope, marks, connected = true }) => {
  const { round, finaleHidden } = boardRound(competition, scope);

  if (finaleHidden || !round) {
    return (
      <Card>
        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
        <h2 className="font-display font-bold text-lg text-white">Pitch booth judging is complete.</h2>
        <p className="text-sm text-tac-stone-300">The finale is under way. Thank you for your help on the floor.</p>
      </Card>
    );
  }

  const status = roundStatus(competition, round, marks);
  const waiting = status.booths.filter((b) => !b.complete).length;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-tac-ink-800 border border-tac-ink-700 rounded-sm p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display font-bold text-base text-white">{round.name}</h2>
          {round.status === 'live' ? (
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-green-300">
              <Radio className="w-3.5 h-3.5" /> Live
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wider text-tac-stone-400">Not live</span>
          )}
        </div>
        <p className="text-sm text-tac-stone-200">
          <strong className="text-white">
            {status.done} of {status.expected}
          </strong>{' '}
          scores in.{' '}
          {status.expected > 0 && waiting === 0
            ? 'Every booth is done.'
            : `${waiting} ${waiting === 1 ? 'booth is' : 'booths are'} still waiting.`}
        </p>
        <p className="text-xs text-tac-stone-500">
          Updates by itself. No scores are shown here. Access: {VIEWER_SCOPE_LABEL[scope]}.
          {!connected && ' No connection right now: showing the last news.'}
        </p>
      </div>

      {status.booths.length === 0 && (
        <Card>
          <p className="text-sm text-tac-stone-300">No teams in this round yet.</p>
        </Card>
      )}

      <ul className="space-y-3" aria-label="Booths">
        {status.booths.map((b) => (
          <li
            key={b.key}
            className={`bg-tac-ink-800 rounded-sm border p-4 space-y-2 ${b.complete ? 'border-tac-ink-700' : 'border-amber-600/70'}`}
            aria-label={b.label}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-white">{b.label}</h3>
                {b.location && (
                  <p className="flex items-center gap-1 text-xs text-tac-gold-300">
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {b.location}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 text-xs font-bold px-2 py-1 rounded-xs ${
                  b.complete ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/50 text-amber-200'
                }`}
              >
                {b.complete ? 'Done' : `${b.done} of ${b.expected} in`}
              </span>
            </div>
            {b.judges.length === 0 ? (
              <p className="text-xs text-amber-200">No judge is assigned to this booth. Tell staff.</p>
            ) : (
              <ul className="space-y-1">
                {b.judges.map((j) => (
                  <li key={j.judge.id} className="text-xs flex flex-wrap gap-x-2">
                    {j.done === j.expected ? (
                      <span className="text-tac-stone-400">
                        <CheckCircle2 className="inline w-3.5 h-3.5 text-green-400 mr-1" />
                        {j.judge.name}: done
                      </span>
                    ) : (
                      <span className="text-amber-100">
                        <AlertTriangle className="inline w-3.5 h-3.5 text-amber-400 mr-1" />
                        <strong>{j.judge.name}</strong> still to score: {j.missingTeams.map((t) => t.name).join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

// The #/status page: sign in, check the approved list, then the board.
export const FloorStatusPage: React.FC<{ competition: Competition }> = ({ competition }) => {
  const cloud = useCloudState();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const signIn = async () => {
    setBusy(true);
    setMessage('');
    const r = await viewerSignIn();
    setBusy(false);
    if (!r.ok) setMessage(r.message);
  };
  const signOut = () => void viewerSignOut();

  let body: React.ReactNode;
  if (!cloud.enabled)
    body = (
      <Card>
        <p className="text-sm text-tac-stone-300">The status board needs the shared database. Open it on the live site.</p>
      </Card>
    );
  else if (!cloud.viewerEmail) body = <FloorSignIn onSignIn={signIn} message={message} busy={busy} />;
  else if (cloud.viewerScope === undefined) body = <FloorChecking />;
  else if (cloud.viewerScope === null) body = <FloorNotApproved email={cloud.viewerEmail} onSignOut={signOut} />;
  else body = <FloorStatusBoard competition={competition} scope={cloud.viewerScope} marks={cloud.statusMarks} connected={cloud.connected} />;

  return (
    <div className="min-h-screen bg-tac-ink-950 text-tac-stone-100">
      <FloorHeader email={cloud.viewerEmail} onSignOut={signOut} />
      <main className="px-3 sm:px-6 py-5">{body}</main>
    </div>
  );
};
