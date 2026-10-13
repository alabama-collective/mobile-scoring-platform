// MSP-45 acceptance criterion 3: anyone who is not signed in as staff is
// refused when they try to change the competition, and judges can only save
// their own scores while the round is live. Runs against the Firebase
// emulator (npm run test:rules), never the real project. All names are made up.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, query, setDoc, updateDoc, where } from 'firebase/firestore';

const STAFF = { email: 'staff@example.com', firebase: { sign_in_provider: 'password' } };
const COMP = 'competitions/main';

let env: RulesTestEnvironment;

const staffDb = () => env.authenticatedContext('staff-uid', STAFF).firestore();
const judgeDb = (uid = 'judge-phone-a') =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const strangerDb = () => env.unauthenticatedContext().firestore();

const score = (overrides: Record<string, unknown> = {}) => {
  const base = {
    judgeId: 'judge-1',
    judgeName: 'Jordan Lake',
    teamId: 'team-1',
    roundId: 'round-1',
    scores: { c1: 8, c2: 7 },
    rawTotal: 15,
    submittedAt: '2026-10-29T15:00:00.000Z',
    uid: 'judge-phone-a',
    ...overrides,
  } as Record<string, unknown>;
  base.id = `${base.roundId}__${base.teamId}__${base.judgeId}`;
  return base;
};
const scorePath = (s: Record<string, unknown>) => `${COMP}/submissions/${s.id}`;

const seed = async (liveRounds: Record<string, boolean>) => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, COMP), { competition: { name: 'Sample Pitch Day', judges: [], teams: [], rounds: [] }, liveRounds });
    await setDoc(doc(db, `${COMP}/private/contacts`), { judgeEmails: { 'judge-1': 'jordan.lake@example.com' } });
  });
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tac-scoring',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed({ 'round-1': true });
});

describe('The competition (rounds, rubrics, judges, teams, booths, timers)', () => {
  it('staff can read and change it', async () => {
    await assertSucceeds(getDoc(doc(staffDb(), COMP)));
    await assertSucceeds(setDoc(doc(staffDb(), COMP), { competition: { name: 'Changed' }, liveRounds: {} }));
  });

  it('a judge can read it but not change it', async () => {
    await assertSucceeds(getDoc(doc(judgeDb(), COMP)));
    await assertFails(setDoc(doc(judgeDb(), COMP), { competition: { name: 'Hacked' }, liveRounds: {} }));
    await assertFails(updateDoc(doc(judgeDb(), COMP), { 'liveRounds.round-2': true }));
    await assertFails(deleteDoc(doc(judgeDb(), COMP)));
  });

  it('someone not signed in can neither read nor change it', async () => {
    await assertFails(getDoc(doc(strangerDb(), COMP)));
    await assertFails(setDoc(doc(strangerDb(), COMP), { competition: {}, liveRounds: {} }));
  });

  it('a made-up email sign in that is not the staff sign in is treated as a judge', async () => {
    const fake = env.authenticatedContext('x', { email: 'someone@example.com', firebase: { sign_in_provider: 'password' } }).firestore();
    await assertFails(setDoc(doc(fake, COMP), { competition: {}, liveRounds: {} }));
  });

  it('judge email addresses are staff only', async () => {
    await assertSucceeds(getDoc(doc(staffDb(), `${COMP}/private/contacts`)));
    await assertFails(getDoc(doc(judgeDb(), `${COMP}/private/contacts`)));
    await assertFails(setDoc(doc(judgeDb(), `${COMP}/private/contacts`), { judgeEmails: {} }));
  });

  it('nothing outside the competition can be read or written', async () => {
    await assertFails(setDoc(doc(staffDb(), 'other/thing'), { a: 1 }));
    await assertFails(getDoc(doc(judgeDb(), 'other/thing')));
  });
});

describe('Scores', () => {
  it('a judge can save their own score while the round is live, and change it', async () => {
    const s = score();
    await assertSucceeds(setDoc(doc(judgeDb(), scorePath(s)), s));
    await assertSucceeds(setDoc(doc(judgeDb(), scorePath(s)), { ...s, scores: { c1: 9, c2: 7 }, rawTotal: 16 }));
  });

  it('a judge cannot save a score when the round is not live', async () => {
    await seed({});
    const s = score();
    await assertFails(setDoc(doc(judgeDb(), scorePath(s)), s));
  });

  it("a judge cannot save a score under another phone's sign in", async () => {
    const s = score({ uid: 'judge-phone-b' });
    await assertFails(setDoc(doc(judgeDb('judge-phone-a'), scorePath(s)), s));
  });

  it("a judge cannot overwrite a score another phone saved", async () => {
    const s = score({ uid: 'judge-phone-b' });
    await assertSucceeds(setDoc(doc(judgeDb('judge-phone-b'), scorePath(s)), s));
    await assertFails(setDoc(doc(judgeDb('judge-phone-a'), scorePath(s)), { ...s, uid: 'judge-phone-a' }));
  });

  it("a record's ID must match its round, team and judge", async () => {
    const s = score();
    await assertFails(setDoc(doc(judgeDb(), `${COMP}/submissions/round-1__team-2__judge-1`), s));
  });

  it('a score with extra or missing fields is refused', async () => {
    const s = score();
    await assertFails(setDoc(doc(judgeDb(), scorePath(s)), { ...s, bonus: 5 }));
    const { rawTotal: _drop, ...missing } = s;
    await assertFails(setDoc(doc(judgeDb(), scorePath(s)), missing));
  });

  it('a judge cannot delete a score, staff can', async () => {
    const s = score();
    await assertSucceeds(setDoc(doc(judgeDb(), scorePath(s)), s));
    await assertFails(deleteDoc(doc(judgeDb(), scorePath(s))));
    await assertSucceeds(deleteDoc(doc(staffDb(), scorePath(s))));
  });

  it("a judge can read only their own scores, staff can read all", async () => {
    const mine = score();
    const theirs = score({ judgeId: 'judge-2', uid: 'judge-phone-b' });
    await assertSucceeds(setDoc(doc(judgeDb('judge-phone-a'), scorePath(mine)), mine));
    await assertSucceeds(setDoc(doc(judgeDb('judge-phone-b'), scorePath(theirs)), theirs));

    const subs = collection(judgeDb('judge-phone-a'), `${COMP}/submissions`);
    await assertSucceeds(getDocs(query(subs, where('uid', '==', 'judge-phone-a'))));
    await assertFails(getDocs(subs));
    await assertFails(getDoc(doc(judgeDb('judge-phone-a'), scorePath(theirs))));
    await assertSucceeds(getDocs(collection(staffDb(), `${COMP}/submissions`)));
  });

  it('someone not signed in cannot save or read scores', async () => {
    const s = score();
    await assertFails(setDoc(doc(strangerDb(), scorePath(s)), s));
    await assertFails(getDocs(collection(strangerDb(), `${COMP}/submissions`)));
  });
});
