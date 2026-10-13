import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { staffSignIn } from '../services/cloud';

// MSP-45: staff screens need the staff passcode once the shared database is on.
// MSP-46 moves this behind the "Staff" button on the start screen.
export const StaffSignIn: React.FC = () => {
  const [passcode, setPasscode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;
    setBusy(true);
    setMessage('');
    const result = await staffSignIn(passcode);
    setBusy(false);
    if (!result.ok) setMessage(result.message);
  };

  return (
    <form
      onSubmit={submit}
      className="max-w-sm mx-auto bg-tac-ink-800 border border-tac-ink-700 rounded-sm p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-tac-gold-500" />
        <h2 className="font-display font-bold text-base text-white">Staff sign in</h2>
      </div>
      <p className="text-xs text-tac-stone-400">
        Enter the staff passcode to set up the competition and see results. Judges do not need it.
      </p>
      <label className="block text-xs text-tac-stone-300">
        Staff passcode
        <input
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="mt-1 w-full bg-tac-ink-900 border border-tac-ink-600 rounded-xs px-3 py-2 text-sm text-white focus:outline-none focus:border-tac-gold-600"
        />
      </label>
      {message && (
        <p role="alert" className="text-xs text-red-300">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !passcode}
        className="w-full px-4 py-2 bg-tac-gold-700 hover:bg-tac-gold-600 disabled:opacity-50 text-tac-ink-900 font-bold text-sm rounded-xs"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
};
