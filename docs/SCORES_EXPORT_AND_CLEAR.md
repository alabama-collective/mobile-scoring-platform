# Exporting, clearing and resetting

Three commands for TAC staff. You do not need to be a developer. The one-page version is [STAFF_LAPTOP_SHEET.md](STAFF_LAPTOP_SHEET.md).

- **Export** saves every score and each round's results to files. It only reads, so it is safe to run at any time.
- **Clear** runs an export first, so nothing is lost, then deletes every score, puts every round back to draft and unlocks it, and un-confirms results. Booths, judges, teams and rubrics stay. It will not run while a round is live.
- **Reset** runs an export first, then empties the competition: no booths, teams, judges or scores. Every round goes back to draft and the Give Classic region is cleared. The rubrics and the floor support viewer list stay. It will not run while a round is live.

All three ask for the **staff passcode** every time and never save it. Anyone with the staff passcode can run them.

The files hold judges' names and feedback. **Save them only to the TAC shared drive**, never to a personal laptop folder.

---

## One-time setup on the laptop (about 15 minutes)

1. **Install Node.js.** Go to https://nodejs.org, download the version marked **LTS**, and install it with the default settings.
2. **Install Google Drive for desktop**, if it is not already there, and sign in with your TAC account. The TAC shared drive then appears as a folder, for example `G:\Shared drives\TAC` on Windows, or under "Google Drive" in Finder on a Mac.
3. **Get the project.** On https://github.com/alabama-collective/mobile-scoring-platform, click the green **Code** button, then **Download ZIP**. Unzip it somewhere easy to find, for example your Documents folder.
4. **Open a terminal in the project folder.**
   - Windows: open the unzipped folder, right-click an empty space, and choose **Open in Terminal**.
   - Mac: open Terminal, type `cd ` (with a space), drag the unzipped folder into the window, and press Enter.
5. **Install the project's tools.** Type this and press Enter. It takes a few minutes the first time:

   ```
   npm install
   ```

If the project has changed since you downloaded it, download the ZIP again and repeat steps 3 to 5.

---

## Export scores

1. Open a terminal in the project folder (setup step 4).
2. Type this, with your shared drive folder in the quotes, and press Enter:

   ```
   npm run scores:export -- --out "G:\Shared drives\TAC\Pilot results"
   ```

   On a Mac the folder looks like `"/Users/yourname/Google Drive/Shared drives/TAC/Pilot results"`.
3. When it asks for the **Staff passcode**, type it and press Enter. Nothing shows while you type. That is normal.
4. You should see `Saved ... score(s)` and three file names, then `Done.`

The three files:

| File | What is in it |
|---|---|
| `results_<date>.csv` | One row per team per round: rank, team, school, region, booth, scores in, judges total, Give Classic bonus, and the total (the booth total in Round 1), and who confirmed the results and when. Opens in Excel or Google Sheets. |
| `scores-by-judge_<date>.csv` | Every judge's points for every criterion, with their feedback. |
| `full-backup_<date>.json` | Everything, for a developer if something ever needs to be restored. |

The totals use the same calculation as the Live Results screen, so they match it exactly. The Give Classic bonus (+5 once per team in the winning region, Round 1 only) is its own column, apart from the judges' total.

## Clear scores

1. **Close every live round first**, in the app: Coordinator Admin, select the round, **Close Round**.
2. Open a terminal in the project folder and type:

   ```
   npm run scores:clear -- --out "G:\Shared drives\TAC\Pilot results"
   ```

3. Type the staff passcode when asked.
4. It saves an export first. Those files start with `before-clear_`.
5. It explains what will be deleted and asks you to type `CLEAR`. Type it in capitals and press Enter. Anything else stops it, and nothing is deleted.
6. You should see `Cleared. 0 scores left, and all rounds are back to draft.`
7. Check the app: Live Results shows no scores, and each round shows **Draft**.

## Reset the competition

Use this to start again from an empty competition, for example before a walkthrough.

1. **Close every live round first**, in the app: Coordinator Admin, select the round, **Close Round**.
2. Open a terminal in the project folder and type:

   ```
   npm run competition:reset -- --out "G:\Shared drives\TAC\Pilot results"
   ```

3. Type the staff passcode when asked.
4. It saves an export first. Those files start with `before-reset_`.
5. It says how many scores, teams and judges it will delete and asks you to type `RESET`. Type it in capitals and press Enter. Anything else stops it, and nothing is deleted.
6. You should see `Reset. The competition is empty: 0 booths, 0 teams, 0 judges, 0 scores.`
7. Check the app: no booths, teams or judges, each round shows **Draft**, and the rubric is still there.

---

## If it says "Stopped"

| Message | What to do |
|---|---|
| `that passcode is not right, or there is no internet connection` | Check the passcode and the Wi-Fi, then run it again. |
| `... is live. Close the round first. Nothing was cleared.` | Close the live round in the app, then run the clear again. |
| `you did not type CLEAR. Nothing was cleared.` | Run it again and type `CLEAR` in capitals. |
| `you did not type RESET. Nothing was reset.` | Run it again and type `RESET` in capitals. |
| `... is live. Close the round first. Nothing was reset.` | Close the live round in the app, then run the reset again. |
| `say where to save the files` | Add `--out "your shared drive folder"` to the end of the command. |
| `... score(s) are still there` or `some booths, teams or judges are still there` | Run it again. If it happens twice, contact the maintainers. |

---

## Pilot schedule (Oct 2026)

| When | What | Who |
|---|---|---|
| Between Oct 20 and Oct 23 | **Practice run** of export and clear on the scores from the Oct 19 phone test, so the first time is not the real time | Rhonoya with Steph or Damian |
| Mon Oct 26, after the rehearsal | Export the rehearsal scores and check the results file against Live Results, including the +5 Give Classic bonus | Rhonoya and Steph |
| Tue Oct 27, very last step | **Clear**, after all fixes and testing, so no test scores remain | Rhonoya, with Steph or Damian |
| Thu Oct 29, each round close | Screenshot Live Results as a backup | Staff on site |
| Thu Oct 29 evening, or Oct 30 morning | **Export** the real scores to the shared drive and send Steph the files. This is the official record for prizes and reporting. | Rhonoya, Steph or Damian |

## For developers

- The commands run `scripts/scores.ts` with `tsx`. The results calculation is `src/services/scoring.ts`, shared with the Live Results screen.
- Add `--emulator` to run against the Firebase emulator on your computer instead of the real project. The emulator must be running.
- The database rules allow only the staff sign in to read all scores, delete them, and change rounds.
