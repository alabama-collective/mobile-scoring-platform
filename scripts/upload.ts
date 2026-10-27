// Load booths, teams and Round 1 judges from the bulk upload sheet, for TAC
// staff (no developer needed). Steph, Oct 26.
//
//   npm run competition:upload -- --check --file "<the .xlsx file>"   (only checks)
//   npm run competition:upload -- --file "<the .xlsx file>"
//
// The sheet is the Google Sheet downloaded with File, Download, Microsoft
// Excel (.xlsx). It is checked first, and every problem is listed. Nothing is
// uploaded unless the whole sheet is clean, and only into an empty
// competition (run the reset first). Finale judges, floor support viewers,
// rubrics and the Give Classic region are not touched.
//
// Asks for the staff passcode each time and never saves it. Add --emulator to
// practise against the test database on this computer.
// Step-by-step instructions: docs/SCORES_EXPORT_AND_CLEAR.md
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
} from 'firebase/firestore';
import { COMPETITION_DOC_ID, STAFF_EMAIL, firebaseConfig } from '../src/config/firebase';
import { applyUpload, planUpload } from '../src/services/bulkUpload';
import { boothList, isFinaleJudge } from '../src/services/booths';
import type { Competition } from '../src/types';
import { readXlsx } from './xlsx';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const fail = (message: string): never => {
  console.error(`\nStopped: ${message}\n`);
  process.exit(1);
};

// ---- Ask questions in the terminal (same as scripts/scores.ts) -------------

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
const pending: string[] = [];
const waiting: ((line: string) => void)[] = [];
rl.on('line', (line) => (waiting.length ? waiting.shift()!(line) : pending.push(line)));
let hideTyping = false;
(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
  if (!hideTyping) process.stdout.write(s); // show nothing while the passcode is typed
};

const ask = async (question: string, hidden = false): Promise<string> => {
  process.stdout.write(question);
  hideTyping = hidden;
  const line = pending.length ? pending.shift()! : await new Promise<string>((done) => waiting.push(done));
  hideTyping = false;
  if (hidden) process.stdout.write('\n');
  return line.trim();
};

// ---- Main ------------------------------------------------------------------

const main = async () => {
  const emulator = flag('--emulator');
  const checkOnly = flag('--check');
  const fileArg = option('--file');
  if (!fileArg) fail('say which sheet to upload: type --file and a space, then drag the .xlsx file into this window.');
  const file = resolve(fileArg!);
  if (!existsSync(file)) fail(`there is no file at ${file}`);
  if (!file.toLowerCase().endsWith('.xlsx'))
    fail('that is not an .xlsx file. In the Google Sheet, use File, Download, Microsoft Excel (.xlsx).');

  console.log(`\nUpload booths, teams and judges${emulator ? ' (TEST DATABASE on this computer)' : ''}`);
  console.log(`Sheet: ${basename(file)}`);

  // ---- 1. Check the sheet. No passcode needed. ----
  let book;
  try {
    book = readXlsx(readFileSync(file));
  } catch {
    fail('could not read that file. In the Google Sheet, use File, Download, Microsoft Excel (.xlsx), and try again.');
  }
  const plan = planUpload(book!);
  if (plan.problems.length) {
    console.log(`\nFound ${plan.problems.length} problem(s):`);
    plan.problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    console.log('\nFix them in the Google Sheet, download it again as .xlsx, and run this again.');
    fail('the sheet has problems. Nothing was uploaded.');
  }
  if (plan.notes.length) {
    console.log('\nWorth a look (these do not stop the upload):');
    plan.notes.forEach((n) => console.log(`  - ${n}`));
  }
  console.log(`\nThe sheet has no problems: ${plan.booths.length} booths, ${plan.teams.length} teams and ${plan.judges.length} Round 1 judges.`);
  if (checkOnly) {
    console.log('Nothing was uploaded, because you used --check. Run it again without --check to upload.');
    return;
  }

  // ---- 2. Sign in and look at the competition. ----
  const config = emulator ? { ...firebaseConfig, apiKey: 'demo-key', projectId: 'demo-tac-scoring' } : firebaseConfig;
  if (!config.projectId) fail('the Firebase settings are not in src/config/firebase.ts yet.');
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  setLogLevel('error');
  if (emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  const passcode = await ask('\nStaff passcode: ', true);
  try {
    await signInWithEmailAndPassword(auth, STAFF_EMAIL, passcode);
  } catch {
    fail('that passcode is not right, or there is no internet connection.');
  }

  try {
    const compRef = doc(db, 'competitions', COMPETITION_DOC_ID);
    const snap = await getDoc(compRef);
    if (!snap.exists()) fail('there is no competition in the database yet.');
    const comp = snap.data()!.competition as Competition;

    const live = comp.rounds.filter((r) => r.status === 'live');
    if (live.length) fail(`${live.map((r) => r.name).join(', ')} is live. Close the round first. Nothing was uploaded.`);
    if (!comp.rounds.some((r) => r.roundType === 'booth')) fail('the competition has no Round 1 (booth round). Nothing was uploaded.');
    const roundOneJudges = comp.judges.filter((j) => !isFinaleJudge(j));
    if (boothList(comp).length || comp.teams.length || roundOneJudges.length)
      fail(
        `the app already has ${boothList(comp).length} booth(s), ${comp.teams.length} team(s) and ${roundOneJudges.length} Round 1 judge(s). ` +
          'Run the reset first, then run this again. Nothing was uploaded.'
      );

    // ---- 3. Show what will be added, and ask. ----
    console.log('\nThis adds:');
    for (const b of plan.booths) {
      const teams = plan.teams.filter((t) => t.boothCategory === b.name).length;
      const judges = plan.judges.filter((j) => j.boothAssigned === b.name).length;
      const about = [b.track, b.details.category, b.details.location].filter(Boolean).join(', ');
      console.log(`  ${b.name} (${about}): ${teams} team(s), ${judges} judge(s)`);
    }
    const finale = comp.judges.length - roundOneJudges.length;
    console.log(`\nFinale judges (${finale}), the floor support list, the rubrics and the Give Classic region stay as they are.`);
    const typed = await ask('Type UPLOAD to continue, or anything else to stop: ');
    if (typed !== 'UPLOAD') fail('you did not type UPLOAD. Nothing was uploaded.');

    // ---- 4. Save. Judge emails go in the staff-only contacts record, as in the app. ----
    const updated = applyUpload(comp, plan);
    const emails: Record<string, string> = {};
    const judges = updated.judges.map(({ email, ...rest }) => {
      if (email) emails[rest.id] = email;
      return rest;
    });
    const contactsRef = doc(db, 'competitions', COMPETITION_DOC_ID, 'private', 'contacts');
    const oldEmails = ((await getDoc(contactsRef)).data()?.judgeEmails ?? {}) as Record<string, string>;
    // Keep the finale judges' emails that are already there.
    const kept = Object.fromEntries(Object.entries(oldEmails).filter(([id]) => judges.some((j) => j.id === id)));
    await setDoc(contactsRef, { judgeEmails: { ...kept, ...emails }, updatedAt: serverTimestamp() });
    await updateDoc(compRef, {
      'competition.rounds': updated.rounds,
      'competition.teams': updated.teams,
      'competition.judges': judges,
    });

    // ---- 5. Read it back. ----
    const after = (await getDoc(compRef)).data()!.competition as Competition;
    const afterJudges = after.judges.filter((j) => !isFinaleJudge(j)).length;
    if (boothList(after).length !== plan.booths.length || after.teams.length !== plan.teams.length || afterJudges !== plan.judges.length)
      fail('the app does not show everything from the sheet. Run the reset, then this again, or ask for help.');
    console.log(`\nUploaded. The app now has ${plan.booths.length} booths, ${plan.teams.length} teams and ${plan.judges.length} Round 1 judges.`);
    console.log('Refresh the app to see them.');
  } finally {
    await signOut(auth).catch(() => undefined);
  }
};

main()
  .then(() => {
    // The sheet has judge emails, so it should not stay in Downloads.
    console.log(flag('--check') ? '\nDone.\n' : '\nDone. The sheet has judge emails: delete the downloaded .xlsx file now.\n');
    process.exit(0);
  })
  .catch((e) => fail(e instanceof Error ? e.message : String(e)));
