// Scores export, clear and reset, for TAC staff (no developer needed).
//
//   npm run scores:export -- --out "G:\Shared drives\TAC\Pilot results"
//   npm run scores:clear  -- --out "G:\Shared drives\TAC\Pilot results"
//   npm run competition:reset -- --out "G:\Shared drives\TAC\Pilot results"
//
// Clear deletes the scores and keeps booths, teams and judges. Reset (Steph,
// Oct 20) empties the competition: no booths, teams, judges or scores. It keeps
// the rubric and the floor support viewer list. Both export first.
//
// All three ask for the staff passcode each time and never save it. They sign
// in with the staff sign in, so they work for anyone who has the passcode.
// Add --emulator to practise against the test database on this computer.
// Step-by-step instructions: docs/SCORES_EXPORT_AND_CLEAR.md
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setLogLevel,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { COMPETITION_DOC_ID, STAFF_EMAIL, firebaseConfig } from '../src/config/firebase';
import { computeTeamSummaries } from '../src/services/scoring';
import { teamRegion } from '../src/services/regions';
import type { Competition, JudgeScoreSubmission } from '../src/types';

const args = process.argv.slice(2);
const command = args[0];
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const fail = (message: string): never => {
  console.error(`\nStopped: ${message}\n`);
  process.exit(1);
};

// ---- Ask questions in the terminal ----------------------------------------

// One reader for the whole run, so answers arrive in order whether they are
// typed or piped in.
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

// ---- Files -----------------------------------------------------------------

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

// ---- Main ------------------------------------------------------------------

const main = async () => {
  if (command !== 'export' && command !== 'clear' && command !== 'reset') {
    fail('use "npm run scores:export", "npm run scores:clear" or "npm run competition:reset". See docs/SCORES_EXPORT_AND_CLEAR.md');
  }
  const title = { export: 'Export scores', clear: 'Clear scores', reset: 'Reset the competition' }[command];
  const emulator = flag('--emulator');
  const outArg = option('--out');
  if (!outArg) fail('say where to save the files, for example: --out "G:\\Shared drives\\TAC\\Pilot results"');
  const outDir = resolve(outArg!);

  const config = emulator ? { ...firebaseConfig, apiKey: 'demo-key', projectId: 'demo-tac-scoring' } : firebaseConfig;
  if (!config.projectId) fail('the Firebase settings are not in src/config/firebase.ts yet.');

  console.log(`\n${title}${emulator ? ' (TEST DATABASE on this computer)' : ''}`);
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  // Firestore prints harmless internal warnings (for example "BloomFilter error"
  // after a collection is emptied) that look alarming to staff. Show errors only.
  setLogLevel('error');
  if (emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  const passcode = await ask('Staff passcode: ', true);
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
    const subsSnap = await getDocs(collection(db, 'competitions', COMPETITION_DOC_ID, 'submissions'));
    const subs = subsSnap.docs.map((d) => d.data() as JudgeScoreSubmission);

    // ---- Export (always runs, also before a clear) ----
    mkdirSync(outDir, { recursive: true });
    const base = `${command === 'export' ? '' : `before-${command}_`}${stamp()}`;
    const teamName = (id: string) => comp.teams.find((t) => t.id === id)?.name ?? id;

    const resultsRows: unknown[][] = [[
      'Round', 'Round status', 'Rank', 'Team', 'School', 'Region', 'Booth', 'Scores in', 'Judges',
      'Judges total', 'Give Classic bonus', 'Total (booth total in Round 1)', 'Results confirmed by', 'Confirmed at',
    ]];
    const scoreRows: unknown[][] = [[
      'Round', 'Team', 'Judge', 'Criterion', 'Points', 'Max points', 'Judge total', 'Worked well', 'Could improve', 'Submitted at', 'Updated at',
    ]];
    for (const round of comp.rounds) {
      const roundSubs = subs.filter((s) => s.roundId === round.id);
      for (const s of computeTeamSummaries(comp, round, roundSubs)) {
        resultsRows.push([
          round.name, round.status, s.rank, s.team.name, s.team.school ?? '', teamRegion(s.team), s.team.boothCategory,
          s.submissionCount, s.totalSubmissionsRequired, s.judgesTotal, s.regionalBonus, s.finalScore,
          round.finalizedBy ?? '', round.finalizedAt ?? '',
        ]);
      }
      for (const sub of roundSubs) {
        for (const c of round.rubric.criteria) {
          scoreRows.push([
            round.name, teamName(sub.teamId), sub.judgeName, c.title, sub.scores[c.id] ?? '', c.maxPoints,
            sub.rawTotal, sub.feedbackWorkedWell ?? '', sub.feedbackCouldImprove ?? '', sub.submittedAt, sub.updatedAt ?? '',
          ]);
        }
      }
    }
    const files = {
      results: join(outDir, `results_${base}.csv`),
      scores: join(outDir, `scores-by-judge_${base}.csv`),
      backup: join(outDir, `full-backup_${base}.json`),
    };
    writeFileSync(files.results, '\ufeff' + csv(resultsRows), 'utf8');
    writeFileSync(files.scores, '\ufeff' + csv(scoreRows), 'utf8');
    writeFileSync(files.backup, JSON.stringify({ exportedAt: new Date().toISOString(), competition: comp, submissions: subs }, null, 2), 'utf8');
    for (const f of Object.values(files)) if (!existsSync(f)) fail(`could not save ${f}`);
    console.log(`\nSaved ${subs.length} score(s) across ${comp.rounds.length} round(s):`);
    console.log(`  ${files.results}\n  ${files.scores}\n  ${files.backup}`);

    if (command === 'export') return;

    // ---- Clear or reset ----
    const word = command === 'reset' ? 'RESET' : 'CLEAR';
    const done = command === 'reset' ? 'reset' : 'cleared';
    const live = comp.rounds.filter((r) => r.status === 'live');
    if (live.length) fail(`${live.map((r) => r.name).join(', ')} is live. Close the round first. Nothing was ${done}.`);

    if (command === 'reset') {
      console.log(`\nThis empties the competition: it deletes all ${subs.length} score(s), ${comp.teams.length} team(s),`);
      console.log(`${comp.judges.length} judge(s) and every booth, puts every round back to draft and unlocks it, and clears`);
      console.log('the Give Classic region. The rubric and the floor support viewer list stay. The export above is your copy.');
    } else {
      console.log(`\nThis deletes all ${subs.length} score(s), puts every round back to draft and unlocks it,`);
      console.log('and un-confirms results. Rubrics, judges and teams stay. The export above is your copy.');
    }
    const typed = await ask(`Type ${word} to continue, or anything else to stop: `);
    if (typed !== word) fail(`you did not type ${word}. Nothing was ${done}.`);

    // The floor support board's status records go with the scores. Before the
    // board's database rules are loaded there are none to read, so skip them.
    const statusDocs = (
      await Promise.all(
        comp.rounds.map((r) =>
          getDocs(collection(db, 'competitions', COMPETITION_DOC_ID, 'rounds', r.id, 'status'))
            .then((snap) => snap.docs)
            .catch(() => [])
        )
      )
    ).flat();
    const docs = [...subsSnap.docs, ...statusDocs];
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    // Story A: confirming Round 1 sets booth winners and finalists, so clearing removes them too.
    const rounds = comp.rounds.map(({ finalizedAt: _a, finalizedBy: _b, isResultsFinalized: _c, confirmReason: _d, boothWinners: _e, finalists: _f, ...r }) => ({
      ...r,
      status: 'draft' as const,
      isLocked: false,
      // Reset also removes every booth; the rubric stays.
      ...(command === 'reset' ? { boothCategories: [], boothDetails: {} } : {}),
    }));
    if (command === 'reset') {
      await updateDoc(compRef, {
        'competition.rounds': rounds,
        'competition.teams': [],
        'competition.judges': [],
        'competition.winningRegion': deleteField(),
        'competition.bonusPointsApplied': false,
        liveRounds: {},
        // The floor support rules read this to keep the finale from Round 1-only viewers.
        roundTypes: Object.fromEntries(comp.rounds.map((r) => [r.id, r.roundType])),
      });
      // Judge email addresses go with the judges. The viewer list is not touched.
      await updateDoc(doc(db, 'competitions', COMPETITION_DOC_ID, 'private', 'contacts'), { judgeEmails: {} }).catch(() => undefined);
    } else {
      await updateDoc(compRef, { 'competition.rounds': rounds, liveRounds: {} });
    }

    const left = (await getDocs(collection(db, 'competitions', COMPETITION_DOC_ID, 'submissions'))).size;
    if (left) fail(`${left} score(s) are still there. Run the ${command} again, or ask for help.`);
    if (command === 'reset') {
      const after = (await getDoc(compRef)).data()!.competition as Competition;
      if (after.teams.length || after.judges.length || after.rounds.some((r) => (r.boothCategories ?? []).length))
        fail('some booths, teams or judges are still there. Run the reset again, or ask for help.');
      console.log(`\nReset. The competition is empty: 0 booths, 0 teams, 0 judges, 0 scores.`);
      console.log(`All ${rounds.length} round(s) are back to draft with their rubrics. The floor support viewer list is unchanged.`);
    } else {
      console.log(`\nCleared. 0 scores left, and all ${rounds.length} round(s) are back to draft.`);
    }
  } finally {
    await signOut(auth).catch(() => undefined);
  }
};

main()
  .then(() => {
    console.log('\nDone. Remember: these files are the record. Keep them on the TAC shared drive.\n');
    process.exit(0);
  })
  .catch((e) => fail(e instanceof Error ? e.message : String(e)));
