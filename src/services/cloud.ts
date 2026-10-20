// MSP-45: shared database. Keeps every phone and laptop on the same
// competition through Firebase (Cloud Firestore on the free Spark plan).
//
// How it fits together:
// - storageService stays the app's local copy, so screens read data the same
//   way as before and keep working without signal.
// - This file copies local saves up to Firestore (through storageService's
//   hooks) and copies changes from other devices down into the local copy.
// - Judges get an automatic anonymous sign in. Staff sign in with the staff
//   passcode. firestore.rules decides what each may read and change, so a
//   hidden button is never the only protection.
import { useSyncExternalStore } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { cloudSettings, isCloudConfigured, COMPETITION_DOC_ID, STAFF_EMAIL } from '../config/firebase';
import { storageService } from './storageService';
import { INITIAL_COMPETITION } from '../data/seedData';
import type { Competition, JudgeScoreSubmission } from '../types';

export type SendState = 'sending' | 'sent' | 'failed';

export interface CloudState {
  enabled: boolean;        // false: no Firebase settings, this device only
  signedIn: boolean;
  isStaff: boolean;
  connected: boolean;      // last news from the database came from the server, not the phone's copy
  error?: string;
  sends: Record<string, SendState>; // submission id -> send state on this device
}

let state: CloudState = { enabled: false, signedIn: false, isStaff: false, connected: false, sends: {} };
const listeners = new Set<() => void>();
const setState = (patch: Partial<CloudState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const getCloudState = () => state;
export const subscribeCloud = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useCloudState = () => useSyncExternalStore(subscribeCloud, getCloudState);

let auth: Auth | null = null;
let db: Firestore | null = null;
let user: User | null = null;
let unsubs: Unsubscribe[] = [];

// Judge emails are kept in a staff-only document, so judges' phones never
// receive other judges' addresses.
let judgeEmails: Record<string, string> = {};
let remoteCompetition: Competition | null = null;

const compRef = () => doc(db!, 'competitions', COMPETITION_DOC_ID);
const contactsRef = () => doc(db!, 'competitions', COMPETITION_DOC_ID, 'private', 'contacts');
const submissionsCol = () => collection(db!, 'competitions', COMPETITION_DOC_ID, 'submissions');

const liveRoundsOf = (comp: Competition): Record<string, boolean> =>
  Object.fromEntries(comp.rounds.filter((r) => r.status === 'live').map((r) => [r.id, true]));

const withEmails = (comp: Competition): Competition => ({
  ...comp,
  judges: comp.judges.map((j) => (judgeEmails[j.id] ? { ...j, email: judgeEmails[j.id] } : j)),
});

const plainMessage = (e: unknown): string => {
  const code = (e as { code?: string })?.code || '';
  if (code.includes('permission-denied')) return 'The database refused this change.';
  if (code.includes('unavailable')) return 'No connection to the database.';
  return 'Something went wrong talking to the database.';
};

// --- Sending local changes up ---------------------------------------------

// Typing in the rubric builder saves on every key. Wait until typing pauses
// so a long edit is one write, not hundreds (the free plan allows 20,000 a day).
let pendingCompetition: Competition | null = null;
let pushesInFlight = 0;
let competitionTimer: ReturnType<typeof setTimeout> | null = null;
const COMPETITION_SAVE_DELAY_MS = 800;

const pushCompetition = async (comp: Competition) => {
  if (!db || !state.isStaff) return;
  const emails: Record<string, string> = {};
  const judges = comp.judges.map(({ email, ...rest }) => {
    if (email) emails[rest.id] = email;
    return rest;
  });
  pushesInFlight++;
  try {
    await setDoc(contactsRef(), { judgeEmails: emails, updatedAt: serverTimestamp() });
    await setDoc(compRef(), {
      competition: { ...comp, judges },
      liveRounds: liveRoundsOf(comp),
      updatedAt: serverTimestamp(),
    });
    setState({ error: undefined });
  } catch (e) {
    setState({ error: plainMessage(e) });
  } finally {
    pushesInFlight--;
  }
};

const flushCompetition = () => {
  if (competitionTimer) clearTimeout(competitionTimer);
  competitionTimer = null;
  const comp = pendingCompetition;
  pendingCompetition = null;
  if (comp) void pushCompetition(comp);
};

const queueCompetition = (comp: Competition) => {
  // Only staff may change the competition; on a judge's phone this is a no-op
  // (and the database would refuse it anyway).
  if (!state.isStaff) return;
  pendingCompetition = comp;
  if (competitionTimer) clearTimeout(competitionTimer);
  competitionTimer = setTimeout(flushCompetition, COMPETITION_SAVE_DELAY_MS);
};

// Scores saved before the sign in finished (for example, first launch with no
// signal) wait here and are sent once the phone is signed in.
const UNSENT_KEY = 'tac_unsent_submissions_v1';
const readUnsent = (): JudgeScoreSubmission[] => {
  try {
    return JSON.parse(localStorage.getItem(UNSENT_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeUnsent = (subs: JudgeScoreSubmission[]) => {
  try {
    localStorage.setItem(UNSENT_KEY, JSON.stringify(subs));
  } catch {
    /* storage full or blocked: the score is still in the local copy */
  }
};

const pushSubmission = (sub: JudgeScoreSubmission) => {
  if (!db || !user) {
    writeUnsent([...readUnsent().filter((s) => s.id !== sub.id), sub]);
    setState({ sends: { ...state.sends, [sub.id]: 'sending' } });
    return;
  }
  // Keep the judge's own sign in on the record when staff correct a score.
  const uid = sub.uid || user.uid;
  setState({ sends: { ...state.sends, [sub.id]: 'sending' } });
  // With the offline cache the write is kept on the phone straight away;
  // the promise settles when the database has accepted or refused it.
  setDoc(doc(submissionsCol(), sub.id), { ...sub, uid, savedAt: serverTimestamp() })
    .then(() => setState({ sends: { ...state.sends, [sub.id]: 'sent' } }))
    .catch((e) => setState({ sends: { ...state.sends, [sub.id]: 'failed' }, error: plainMessage(e) }));
};

const flushUnsent = () => {
  const unsent = readUnsent();
  if (!unsent.length) return;
  writeUnsent([]);
  unsent.forEach(pushSubmission);
};

// --- Receiving changes from other devices ---------------------------------

const applyCompetition = () => {
  // Staff edits not yet sent are newer than anything the database has, so
  // never let an older copy overwrite them mid-typing.
  if (pendingCompetition || pushesInFlight > 0) return;
  if (remoteCompetition) storageService.applyRemoteCompetition(withEmails(remoteCompetition));
};

const listen = (u: User) => {
  unsubs.forEach((f) => f());
  unsubs = [];
  const staff = u.email === STAFF_EMAIL;

  unsubs.push(
    onSnapshot(
      compRef(),
      { includeMetadataChanges: true },
      (snap) => {
        setState({ connected: !snap.metadata.fromCache });
        if (snap.metadata.hasPendingWrites) return; // our own change, already in the local copy
        if (snap.exists()) {
          remoteCompetition = snap.data().competition as Competition;
          applyCompetition();
        } else if (staff && !snap.metadata.fromCache) {
          // First staff sign in on an empty database: start from the app's
          // clean defaults, never from whatever an old browser still holds
          // (it could be out of date, or hold details since removed).
          const fresh: Competition = JSON.parse(JSON.stringify(INITIAL_COMPETITION));
          storageService.applyRemoteCompetition(fresh);
          void pushCompetition(fresh);
        }
      },
      (e) => setState({ error: plainMessage(e) })
    )
  );

  if (staff) {
    unsubs.push(
      onSnapshot(
        contactsRef(),
        (snap) => {
          judgeEmails = (snap.data()?.judgeEmails as Record<string, string>) || {};
          applyCompetition();
        },
        (e) => setState({ error: plainMessage(e) })
      )
    );
  }

  // Staff see every score. A judge's phone only asks for that judge's own.
  const subsQuery = staff ? submissionsCol() : query(submissionsCol(), where('uid', '==', u.uid));
  unsubs.push(
    onSnapshot(
      subsQuery,
      (snap) => {
        const remote = snap.docs.map((d) => {
          const { savedAt: _savedAt, ...rest } = d.data();
          return rest as JudgeScoreSubmission;
        });
        storageService.applyRemoteSubmissions(remote);
      },
      (e) => setState({ error: plainMessage(e) })
    )
  );
};

// --- Start up and staff sign in -------------------------------------------

export const startCloud = (): void => {
  if (db || !isCloudConfigured()) return;
  const app = initializeApp(cloudSettings.config);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  });
  if (cloudSettings.useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  storageService.setCloudHooks({ onCompetitionSaved: queueCompetition, onSubmissionSaved: pushSubmission });
  setState({ enabled: true });

  onAuthStateChanged(auth, (u) => {
    user = u;
    if (!u) {
      unsubs.forEach((f) => f());
      unsubs = [];
      setState({ signedIn: false, isStaff: false });
      signInAnonymously(auth!).catch((e) => setState({ error: plainMessage(e) }));
      return;
    }
    setState({ signedIn: true, isStaff: u.email === STAFF_EMAIL, error: undefined });
    listen(u);
    flushUnsent();
  });

  window.addEventListener('beforeunload', flushCompetition);
};

export const staffSignIn = async (passcode: string): Promise<{ ok: true } | { ok: false; message: string }> => {
  if (!auth) return { ok: false, message: 'The shared database is not set up on this device.' };
  try {
    await signInWithEmailAndPassword(auth, STAFF_EMAIL, passcode);
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: string })?.code || '';
    if (code.includes('network')) return { ok: false, message: 'No connection. Try again when the phone has signal.' };
    if (code.includes('too-many-requests')) return { ok: false, message: 'Too many tries. Wait a minute, then try again.' };
    return { ok: false, message: 'That passcode is not right.' };
  }
};

export const staffSignOut = async (): Promise<void> => {
  flushCompetition();
  if (auth) await signOut(auth);
};
