# The Alabama Collective (TAC) — Mobile Scoring Platform (MSP)
## Development Transcript, Reference Document Mapping & Agent Handoff Guide

---

## 1. Executive Summary & Mission
The **Mobile Scoring Platform (MSP)** is a mobile-first Progressive Web Application (PWA) engineered for **The Alabama Collective (TAC)** to replace error-prone manual spreadsheets and Google Forms during live collegiate pitch competitions.

* **Primary Launch Event:** Magic City Classic Business Pitch (MCC-BP 2026) on **Thursday, October 29, 2026** at Topgolf Birmingham (Signature Room).
* **Core Value Proposition:**
  1. Volunteer judges score pitches independently on any device (phone, tablet, laptop) without installing an app, receiving instant submission confirmation.
  2. Event coordinators (Tally Marks / Avery Quinn) track live submissions in real time, immediately seeing which judges have or haven't submitted without calling out across the room.
  3. Automatic tabulations and audit trails eliminate manual recount delays and ensure the announced winners are 100% accurate.

---

## 2. Source Document Mapping

Every component and rule in this codebase directly traces to one of four authoritative project sources:

| Source Document | Summary of Content | Applied Components & Code Areas |
| :--- | :--- | :--- |
| **1. Sprint Review Deck**<br>*(Rhonoya Anderson, Fall 2026 Technical Internship)* | User discovery, operational pain points, persona profiles (Tally Marks, Jordan Lake), and the MVP Canvas. Defined the critical gap: *"knowing which judge has NOT submitted."* | • Roles & user journeys<br>• Coordinator vs. Judge separation<br>• Event metadata and timeline constraints |
| **2. Product Backlog & Epic Breakdown**<br>*(TAC Fall 2026 Technical Internship CSV)* | Master backlog of 34 scoring stories, sprint calendar, Given-When-Then acceptance criteria, and epic boundaries: E1 (Rubric setup), E2 (Judge scoring), E3 (Live results). | • Story ID traceability (`MSP-01` through `MSP-35`)<br>• Gate conditions and validation test suites ([`src/test/epic1-acceptance.test.ts`](src/test/epic1-acceptance.test.ts) & [`src/test/epic2-epic3-acceptance.test.ts`](src/test/epic2-epic3-acceptance.test.ts)) |
| **3. Official Judges Instruction Packet**<br>*(Printed packet for MCC-BP Oct 29, 2026)* | Format (3 min pitch, 3 min Q&A), five official categories (10 pts each, 50 pts total), 5-tier scoring scale anchors (9–10 Exceptional, 7–8 Strong, etc.), qualitative feedback prompts, and event director info. | • Default competition seed ([`src/data/seedData.ts`](src/data/seedData.ts))<br>• Inline listening prompts in [`RubricBuilder.tsx`](src/components/RubricBuilder.tsx)<br>• Qualitative feedback capture in [`JudgeScoringPortal.tsx`](src/components/JudgeScoringPortal.tsx) |
| **4. The Alabama Collective Design System**<br>*(Foundations, Tokens & Assets in `the-alabama-collective-design-system`)* | Official brand rules: Ink ground (`#171717`), Action gold (`#AA721A`), Brand accent (`#AD8D40`), Stone hairlines (`#EBE7E3`), 4px gold rules, squared-off controls (0–6px radii), Montserrat & Open Sans typography. | • Tailwind theme ([`tailwind.config.js`](tailwind.config.js))<br>• Webfonts bundled in [`public/fonts/`](public/fonts/)<br>• Base styling in [`src/index.css`](src/index.css) and component UI |

---

## 3. Transcript of Development Process & Key Decisions

### Step 1: Strict Acceptance Criteria Gate
* **Working Agreement:** Zero implementation permitted for any epic or task without complete, testable, Given-When-Then acceptance criteria.
* **Gate Check:** Upon initial review of the CSV backlog, `MSP-35` (regional bonus points) was completely missing acceptance criteria, `MSP-31` was underspecified regarding "no-code", and "Open" lifecycle status in `MSP-32` required operational definition. Implementation was paused until clarified.

### Step 2: PO Clarifications & Resolved Requirements
1. **`MSP-35` Regional Bonus:** When a region wins the Gift Classic competition, +5 bonus points are automatically applied to their Round 1 scores for all competing teams from that region.
2. **`MSP-31` No-Code Administration:** The PWA must provide an in-app Coordinator UI allowing staff (Tally Marks / Avery Quinn) to create/edit competitions, categories, point scales, and save/load reusable templates without touching code or calling a developer.
3. **`MSP-32` Lifecycle & Locking:** "Open" means "Live" (the active pitch window). Transitioning a round to `Live` locks the rubric into read-only mode to prevent altering the scoring basis while judges are scoring.
4. **Round 1 vs. Round 2 Format:** Round 1 consists of morning Pitch Booths divided by booth categories; Round 2 is the stage finale for booth winners.

### Step 3: Technology Stack Selection
* **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS.
* **PWA / Offline:** `vite-plugin-pwa` with service worker precaching and web app manifest, ensuring zero score loss during venue Wi-Fi drops.
* **Storage & Architecture:** Local-first storage abstraction with Firestore sync readiness.
* **Hosting & CI/CD:** GitHub Pages with automated build-and-deploy pipeline ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

---

## 4. Master Feature Review Log (All Epics Delivered)

### Epic 1: Platform Chosen, Rubric & Round Setup
| Feature / Story ID | Acceptance Criteria Summary | Implementation Artifacts | Verification Status |
| :--- | :--- | :--- | :---: |
| **`MSP-01`<br>Reusable Templates** | Given criteria and rounds configured, coordinator can save setup as a reusable named template and load it for future events without retyping. | [`src/components/TemplateManager.tsx`](src/components/TemplateManager.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |
| **`MSP-10`<br>Scales $>10$ Points** | System supports arbitrary maximum points beyond 10 (15, 20, 25, 30+) without forcing a standard 10-star cap. | [`src/components/RubricBuilder.tsx`](src/components/RubricBuilder.tsx)<br>[`src/components/JudgeScoringPortal.tsx`](src/components/JudgeScoringPortal.tsx) | **PASSED** |
| **`MSP-12`<br>Inline Rubric Guidelines** | Evaluation criteria, listening prompts ("What You're Listening For"), and 5-tier scoring anchors appear inline inside the scoring interface. | [`src/data/seedData.ts`](src/data/seedData.ts)<br>[`src/components/JudgeScoringPortal.tsx`](src/components/JudgeScoringPortal.tsx) | **PASSED** |
| **`MSP-31`<br>No-Code Coordinator Portal** | Staff can create/edit rounds, rubrics, and booth categories entirely through web forms with zero developer intervention. | [`src/components/RoundManager.tsx`](src/components/RoundManager.tsx)<br>[`src/components/RubricBuilder.tsx`](src/components/RubricBuilder.tsx) | **PASSED** |
| **`MSP-32`<br>Rubric Locking on Live Round** | Setting round status to `Live` locks rubric schema against modification and displays a "Live — Locked" badge. | [`src/components/RoundManager.tsx`](src/components/RoundManager.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |
| **`MSP-33`<br>Clone Round 1 to Round 2** | One-click duplication creates an independent Round 2 copy without altering or corrupting Round 1's rubric. | [`src/components/RoundManager.tsx`](src/components/RoundManager.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |
| **`MSP-35`<br>Winning Region 5-Pt Bonus** | Designating the Gift Classic winning region dynamically awards +5 bonus points to Round 1 teams from that region with an audit log. | [`src/components/RegionalBonusPanel.tsx`](src/components/RegionalBonusPanel.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |

### Epic 2: Judge Scoring on Any Device
| Feature / Story ID | Acceptance Criteria Summary | Implementation Artifacts | Verification Status |
| :--- | :--- | :--- | :---: |
| **`MSP-03`<br>Single QR Code Routing** | Dedicated event QR code routes volunteer judges directly to the active live round in their mobile browser. | [`src/components/JudgeRosterManager.tsx`](src/components/JudgeRosterManager.tsx) | **PASSED** |
| **`MSP-21`<br>Team Name at Top** | Pitching team name is displayed in large, prominent typography at the top of the mobile screen without scrolling. | [`src/components/JudgeScoringPortal.tsx`](src/components/JudgeScoringPortal.tsx) | **PASSED** |
| **`MSP-22`<br>Compact Rubric View** | Scoring criteria and inputs are compactly structured to remain accessible without hunting or excessive scrolling. | [`src/components/JudgeScoringPortal.tsx`](src/components/JudgeScoringPortal.tsx) | **PASSED** |
| **`MSP-23`<br>Confirmation Receipt** | Explicit on-screen confirmation receipt verifies score transmission with points total and timestamp. | [`src/components/JudgeScoringPortal.tsx`](src/components/JudgeScoringPortal.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |
| **`MSP-24`<br>Low-Stakes Score Revisions** | "My Submissions" history drawer allows judges to find and revise already submitted scores without intimidating warnings. | [`src/components/JudgeScoringPortal.tsx`](src/components/JudgeScoringPortal.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |
| **`MSP-27` & `MSP-29`<br>Sight-Usable PWA** | Zero-install browser experience, usable on sight without requiring onboarding or downloads. | [`src/components/JudgeScoringPortal.tsx`](src/components/JudgeScoringPortal.tsx) | **PASSED** |

### Epic 3: Live Results & Submission Tracking
| Feature / Story ID | Acceptance Criteria Summary | Implementation Artifacts | Verification Status |
| :--- | :--- | :--- | :---: |
| **`MSP-05`<br>Live Submission Matrix** | Real-time matrix displays every judge's status by team, highlighting who has submitted and who is pending in amber. | [`src/components/LiveSubmissionBoard.tsx`](src/components/LiveSubmissionBoard.tsx) | **PASSED** |
| **`MSP-06`<br>Auto Tally & Audit Trail** | Automatic tabulations, team rankings, and transparent audit logs of every contributing judge score. | [`src/components/LiveSubmissionBoard.tsx`](src/components/LiveSubmissionBoard.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |
| **`MSP-19`<br>Named Judge Attribution** | Every recorded score is attributed to a named judge from the roster rather than anonymous counts. | [`src/components/LiveSubmissionBoard.tsx`](src/components/LiveSubmissionBoard.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |
| **`MSP-34`<br>Staff Review & Confirm** | Staff review checkpoint modal to verify numbers and lock final stage results with a staff signature. | [`src/components/LiveSubmissionBoard.tsx`](src/components/LiveSubmissionBoard.tsx)<br>[`src/services/storageService.ts`](src/services/storageService.ts) | **PASSED** |

---

## 5. Claude Code Agent Onboarding & Installation Guide

> **Notice for Claude Code / Autonomous Agents:**  
> When a teammate runs Claude Code on their machine to clone or extend this repository, provide this section as the initial instruction set.

### 5.1 Environment Prerequisites
* **Runtime:** Node.js version 20+ and npm 10+.
* **Operating Systems Supported:** macOS, Linux, Windows (WSL recommended).
* **Network Permissions:** Claude Code must run with network enabled (`--dangerously-skip-permissions` or standard CLI approval) during `npm install`.

### 5.2 Step-by-Step Installation Commands
```bash
# 1. Clone repository from GitHub
git clone <YOUR_GITHUB_REPO_URL> mobile-scoring-platform
cd mobile-scoring-platform

# 2. Install all dependencies (React, Vite, Tailwind, Lucide, PWA, Vitest)
npm install

# 3. Run the automated acceptance verification suite (Verifies Epics 1, 2, and 3)
npm test

# 4. Verify production PWA compilation and service worker generation
npm run build

# 5. Start the local development server
npm run dev
```

### 5.3 Architectural & Design System Rules for Agents
When authoring or modifying code in this repository, Claude Code agents **must** enforce the following rules:

1. **Strict Acceptance Criteria Gate:** Never implement any user story from the backlog without explicit, testable Given-When-Then acceptance criteria. Push back and clarify edge cases first.
2. **The Alabama Collective Design System:**
   * **Colors:** Dark background (`#171717`), Dark cards (`#212329`, `#2A2B44`), Primary Action Gold (`#AA721A`, hover `#8A5C12`), Brand Accent Gold (`#AD8D40`), Resting Stone (`#D3CDC6`, `#EBE7E3`).
   * **Typography:** Display/Eyebrows/Buttons: `font-display` (Montserrat, 600–800, uppercase letterspaced). Headings/Body: `font-body` (Open Sans, 300 light body, 600 headings).
   * **Squared-off Geometry:** Border radius strictly `0–6px` (`rounded-xs`, `rounded-sm`). **Never use pill-shaped buttons in core UI.**
   * **Visual Signature:** A 4px horizontal gold rule under section eyebrows and headers.
   * **Iconography:** Use line icons from `lucide-react` (1.5–2px stroke). No emojis in product UI.
3. **Local-First & Offline Resilience:** Always write mutations through [`src/services/storageService.ts`](src/services/storageService.ts) so scoring data survives venue connectivity drops.
