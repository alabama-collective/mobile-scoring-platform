# Staff laptop sheet: reset, export, clear

One page for the TAC staff laptop. Full details: [SCORES_EXPORT_AND_CLEAR.md](SCORES_EXPORT_AND_CLEAR.md).

**Every time:** open the project folder, right-click an empty space, choose **Open in Terminal**. Type the command, press Enter, then type the **staff passcode** when asked. Nothing shows while you type the passcode. That is normal. Never write the passcode down or type it where others can see.

Save to the TAC shared drive only. In the commands below, the folder is `G:\Shared drives\TAC\Pilot results`. Change it if yours is different.

| I want to | Type this | It asks you to type | You should see |
|---|---|---|---|
| **Save the scores** (safe any time) | `npm run scores:export -- --out "G:\Shared drives\TAC\Pilot results"` | nothing more | `Saved ... score(s)`, three file names, `Done.` |
| **Delete the scores**, keep booths, teams and judges | `npm run scores:clear -- --out "G:\Shared drives\TAC\Pilot results"` | `CLEAR` | `Cleared. 0 scores left` |
| **Empty the competition**: no booths, teams, judges or scores | `npm run competition:reset -- --out "G:\Shared drives\TAC\Pilot results"` | `RESET` | `Reset. The competition is empty` |
| Add teams from a file | Coming Monday, Oct 26 | | |

**Before clear or reset:** close every live round in the app (Coordinator Admin, select the round, **Close Round**). Both save an export first, with file names starting `before-clear_` or `before-reset_`. Type the word in capitals. Anything else stops it, and nothing is deleted.

**Reset keeps** the rubrics and the floor support viewer list. **Clear keeps** booths, teams, judges and rubrics.

**After:** check the app. After clear, Live Results shows no scores and each round shows **Draft**. After reset, there are no booths, teams or judges, and the rubric is still there.

**If it says "Stopped":** read the line after it. It says what to do, for example "Close the round first" or "you did not type RESET". Nothing was changed. Fix it and run the command again. Wrong passcode or no Wi-Fi: check both and run it again.

**Files it saves:** `results_...csv` (one row per team: judges' total, Give Classic bonus and total, shown separately), `scores-by-judge_...csv` (every judge's points and feedback), `full-backup_...json` (everything, for a developer).
