// Floor support status board (Steph, Oct 20): approved people sign in with
// their own Google account and see which scores are in, never the scores.
// Runs against the test database only (npm run test:rules). All names and
// emails are made up.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';

const COMP = 'competitions/main';
const STAFF = { email: 'staff@example.com', firebase: { sign_in_provider: 'password' } };
const google = (email: string, verified = true) => ({ email, email_verified: verified, firebase: { sign_in_provider: 'google.com' } });

let env: RulesTestEnvironment;
const staffDb = () => env.authenticatedContext('staff-uid', STAFF).firestore();
const judgeDb = (uid = 'judge-phone-a') => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const viewerDb = (email: string, verified = true) => env.authenticatedContext(`g-${email}`, google(email, verified)).firestore();

const ROUND1 = 'round-1';
const FINALE = 'round-2';
const score = (over: Record<string, unknown> = {}) => {
  const s = {
    judgeId: 'judge-1', judgeName: 'Jordan Lake', teamId: 'team-1', roundId: ROUND1,
    scores: { c1: 8 }, rawTotal: 8, submittedAt: '2026-10-21T16:00:00.000Z', uid: 'judge-phone-a', ...over,
  } as Record<string, unknown>;
  s.id = `${s.roundId}__${s.teamId}__${s.judgeId}`;
  return s;
};
const statusOf = (s: Record<string, unknown>) => ({ roundId: s.roundId, teamId: s.teamId, judgeId: s.judgeId, uid: s.uid });
const statusPath = (s: Record<string, unknown>) => `${COMP}/rounds/${s.roundId}/status/${s.id}`;

// A judge's phone saves the score and its status record together.
const saveWithStatus = async (db: ReturnType<typeof judgeDb>, s: Record<string, unknown>) => {
  const b = writeBatch(db);
  b.set(doc(db, `${COMP}/submissions/${s.id}`), s);
  b.set(doc(db, statusPath(s)), statusOf(s));
  return b.commit();
};

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8180').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-tac-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, COMP), {
      competition: { name: 'Sample Pitch Day' },
      liveRounds: { [ROUND1]: true, [FINALE]: true },
      roundTypes: { [ROUND1]: 'booth', [FINALE]: 'finale' },
    });
    await setDoc(doc(db, `${COMP}/viewers/floor.one@example.com`), { scope: 'round1' });
    await setDoc(doc(db, `${COMP}/viewers/lead.one@example.com`), { scope: 'all' });
  });
});

describe('The approved list', () => {
  it('staff can add, change and remove people', async () => {
    const ref = doc(staffDb(), `${COMP}/viewers/new.person@example.com`);
    await assertSucceeds(setDoc(ref, { scope: 'round1' }));
    await assertSucceeds(setDoc(ref, { scope: 'all' }));
    await assertSucceeds(getDocs(collection(staffDb(), `${COMP}/viewers`)));
    await assertSucceeds(deleteDoc(ref));
  });

  it('staff cannot save a made-up access level or extra fields', async () => {
    await assertFails(setDoc(doc(staffDb(), `${COMP}/viewers/new.person@example.com`), { scope: 'scores' }));
    await assertFails(setDoc(doc(staffDb(), `${COMP}/viewers/new.person@example.com`), { scope: 'all', note: 'x' }));
    await assertFails(setDoc(doc(staffDb(), `${COMP}/viewers/New.Person@example.com`), { scope: 'all' }));
  });

  it('a viewer can read only their own entry, and cannot change it', async () => {
    const db = viewerDb('floor.one@example.com');
    await assertSucceeds(getDoc(doc(db, `${COMP}/viewers/floor.one@example.com`)));
    await assertFails(getDoc(doc(db, `${COMP}/viewers/lead.one@example.com`)));
    await assertFails(getDocs(collection(db, `${COMP}/viewers`)));
    await assertFails(setDoc(doc(db, `${COMP}/viewers/floor.one@example.com`), { scope: 'all' }));
  });

  it('a judge cannot read or change the list', async () => {
    await assertFails(getDocs(collection(judgeDb(), `${COMP}/viewers`)));
    await assertFails(setDoc(doc(judgeDb(), `${COMP}/viewers/someone@example.com`), { scope: 'all' }));
  });
});

describe('Status records', () => {
  it('a judge saves the status record together with the score', async () => {
    await assertSucceeds(saveWithStatus(judgeDb(), score()));
  });

  it('a judge cannot mark a score as in without saving it', async () => {
    const s = score();
    await assertFails(setDoc(doc(judgeDb(), statusPath(s)), statusOf(s)));
  });

  it("a judge cannot mark another phone's score", async () => {
    const s = score({ uid: 'judge-phone-b' });
    await assertSucceeds(saveWithStatus(judgeDb('judge-phone-b'), s));
    await assertFails(setDoc(doc(judgeDb('judge-phone-a'), statusPath(s)), { ...statusOf(s), uid: 'judge-phone-a' }));
  });

  it('a status record cannot carry the score', async () => {
    const s = score();
    const db = judgeDb();
    const b = writeBatch(db);
    b.set(doc(db, `${COMP}/submissions/${s.id}`), s);
    b.set(doc(db, statusPath(s)), { ...statusOf(s), rawTotal: 8 });
    await assertFails(b.commit());
  });

  it('staff can write and delete status records', async () => {
    const s = score();
    await assertSucceeds(setDoc(doc(staffDb(), statusPath(s)), statusOf(s)));
    await assertSucceeds(deleteDoc(doc(staffDb(), statusPath(s))));
  });
});

describe('What viewers can see', () => {
  beforeEach(async () => {
    await saveWithStatus(judgeDb(), score());
    await saveWithStatus(judgeDb(), score({ roundId: FINALE, judgeId: 'judge-9' }));
  });

  it('a Round 1 viewer sees Round 1 status, not the finale', async () => {
    const db = viewerDb('floor.one@example.com');
    await assertSucceeds(getDocs(collection(db, `${COMP}/rounds/${ROUND1}/status`)));
    await assertFails(getDocs(collection(db, `${COMP}/rounds/${FINALE}/status`)));
  });

  it('a Round 1 and finale viewer sees both', async () => {
    const db = viewerDb('lead.one@example.com');
    await assertSucceeds(getDocs(collection(db, `${COMP}/rounds/${ROUND1}/status`)));
    await assertSucceeds(getDocs(collection(db, `${COMP}/rounds/${FINALE}/status`)));
  });

  it('a viewer reads the competition, but never the scores or judge emails', async () => {
    const db = viewerDb('lead.one@example.com');
    await assertSucceeds(getDoc(doc(db, COMP)));
    await assertFails(getDocs(collection(db, `${COMP}/submissions`)));
    await assertFails(getDoc(doc(db, `${COMP}/submissions/${score().id}`)));
    await assertFails(getDoc(doc(db, `${COMP}/private/contacts`)));
  });

  it('a viewer cannot change anything', async () => {
    const db = viewerDb('lead.one@example.com');
    await assertFails(setDoc(doc(db, COMP), { competition: {}, liveRounds: {} }));
    const s = score({ uid: 'g-lead.one@example.com', judgeId: 'judge-3' });
    await assertFails(setDoc(doc(db, `${COMP}/submissions/${s.id}`), s));
    await assertFails(setDoc(doc(db, statusPath(s)), statusOf(s)));
    await assertFails(deleteDoc(doc(db, statusPath(score()))));
  });

  it('a Google account not on the list sees nothing', async () => {
    const db = viewerDb('not.listed@example.com');
    await assertFails(getDocs(collection(db, `${COMP}/rounds/${ROUND1}/status`)));
    await assertFails(getDoc(doc(db, `${COMP}/viewers/not.listed@example.com`)));
  });

  it('an unverified Google email is refused', async () => {
    await assertFails(getDocs(collection(viewerDb('floor.one@example.com', false), `${COMP}/rounds/${ROUND1}/status`)));
  });

  it('the email check ignores capital letters', async () => {
    await assertSucceeds(getDocs(collection(viewerDb('Floor.One@Example.com'), `${COMP}/rounds/${ROUND1}/status`)));
  });

  it('a judge phone cannot read the status board', async () => {
    await assertFails(getDocs(collection(judgeDb(), `${COMP}/rounds/${ROUND1}/status`)));
  });

  it('a round the competition does not list counts as the finale for Round 1 viewers', async () => {
    await assertFails(getDocs(collection(viewerDb('floor.one@example.com'), `${COMP}/rounds/round-x/status`)));
  });
});
