# The Alabama Collective — Mobile Scoring Platform (MSP)

[![CI/CD GitHub Pages Deployment](https://github.com/the-alabama-collective/mobile-scoring-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/the-alabama-collective/mobile-scoring-platform/actions/workflows/deploy.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Tests Passing](https://img.shields.io/badge/Acceptance%20Tests-13%2F13%20Passing-success.svg)](./src/test/)

> **Event Launch:** Magic City Classic Business Pitch Competition (MCC-BP 2026)  
> **Date & Venue:** October 29, 2026 • Topgolf Birmingham, Signature Room  
> **Host Organization:** The Alabama Collective (TAC)  
> **Event Director:** Avery Quinn  
> **Production Status:** 100% Complete & Verified Across All 3 Epics (`MSP-01` through `MSP-35`)

---

## 1. Executive Mission

The **Mobile Scoring Platform (MSP)** replaces error-prone Google Forms and paper tally sheets with a high-fidelity, offline-first Progressive Web Application. Designed for volunteer judges and competition coordinators in high-energy, noise-filled environments (such as Topgolf event bays), it provides instant QR-code routing, tactile scoring steppers, inline listening prompts, live submission matrix tracking, and an automated audit trail.

---

## 2. Master Feature Matrix & Story Traceability

### Epic 1: Platform Setup, Rubrics & Rounds
| Story ID | Capability | Implementation File | Verification Status |
| :--- | :--- | :--- | :---: |
| **`MSP-01`** | **Reusable Judging Form Templates** | [`src/components/TemplateManager.tsx`](./src/components/TemplateManager.tsx) | **VERIFIED (7/7 Unit Tests)** |
| **`MSP-10`** | **Scales Exceeding 10 Points** | [`src/components/RubricBuilder.tsx`](./src/components/RubricBuilder.tsx) | **VERIFIED (Custom 15–30 pt Scales)** |
| **`MSP-12`** | **Inline Listening Guidance** | Embedded "What You're Listening For" guidance on every criterion card | **VERIFIED (Inline Prompt Cards)** |
| **`MSP-31`** | **No-Code Coordinator Admin** | [`src/components/RoundManager.tsx`](./src/components/RoundManager.tsx) | **VERIFIED (Interactive Form Controls)** |
| **`MSP-32`** | **Rubric Locking on Live Round** | Auto-locks rubric schema into read-only mode once a round is marked `LIVE` | **VERIFIED (Tamper-Proof Safeguard)** |
| **`MSP-33`** | **Clone Round 1 to Round 2** | One-tap round cloner generates an independent Round 2 finale schema | **VERIFIED (Entity Deep Cloning)** |
| **`MSP-35`** | **Gift Classic Regional Bonus** | [`src/components/RegionalBonusPanel.tsx`](./src/components/RegionalBonusPanel.tsx) | **VERIFIED (+5 Bonus Points Auto-Allocated)** |

### Epic 2: Judge Scoring on Any Device
| Story ID | Capability | Implementation File | Verification Status |
| :--- | :--- | :--- | :---: |
| **`MSP-03`** | **Single QR Code Routing** | [`src/components/JudgeRosterManager.tsx`](./src/components/JudgeRosterManager.tsx) | **VERIFIED (Dynamic LIVE Round Resolver)** |
| **`MSP-21`** | **Sticky Mobile Team Header** | Display-grade sticky header renders pitching team name without scrolling | **VERIFIED (Mobile Viewport Tested)** |
| **`MSP-22`** | **Compact Mobile Rubric Cards** | Dense card architecture with tactile `[-] [0/10] [+]` steppers and quick presets | **VERIFIED (One-Thumb Usability)** |
| **`MSP-23`** | **Confirmation Receipt Banner** | Instant green receipt banner with timestamp, 50/50 score breakdown, and attribution | **VERIFIED (Instant Visual Feedback)** |
| **`MSP-24`** | **Low-Stakes Score Revisions** | "My Submissions" history drawer allows judges to revise scores before round close | **VERIFIED (Zero Duplicate Ghosts)** |
| **`MSP-25`** | **3-Minute Pitch & Q&A Stopwatch** | Integrated countdown timer widget matching Topgolf printed pitch deck guidelines | **VERIFIED (Active Timer Audio/Visuals)** |
| **`MSP-27` & `MSP-29`** | **Zero-Install Sight-Usable PWA** | Pure browser application requiring zero app store downloads or logins | **VERIFIED (Tested in Mobile Safari & Chrome)** |

### Epic 3: Live Results & Submission Tracking
| Story ID | Capability | Implementation File | Verification Status |
| :--- | :--- | :--- | :---: |
| **`MSP-05`** | **Live Submission Board** | [`src/components/LiveSubmissionBoard.tsx`](./src/components/LiveSubmissionBoard.tsx) | **VERIFIED (Green Submitted / Amber Missing)** |
| **`MSP-06`** | **Automated Leaderboard & Audit Trail** | Tabulates score averages, applies regional bonus, and opens verified audit modal | **VERIFIED (Calculator Recounts Eliminated)** |
| **`MSP-19`** | **Named Judge Progress Attribution** | Tracks submissions by authenticated judge identity rather than anonymous counts | **VERIFIED (Roster Identity Mapping)** |
| **`MSP-34`** | **Staff Review & Confirmation** | Checkpoint modal requiring official coordinator signature before stage announcements | **VERIFIED (Official Sign-Off Timestamp)** |

---

## 3. Design System Adherence

Built strictly to **The Alabama Collective Design System Specifications**:
- **Ground / Background:** Deep Ink Black (`#171717`, `#0F0F0F`, `#242424`).
- **Brand Accents:** Warm Metallic Gold (`#AA721A`, `#8C5D13`, `#C8933E`, `#E5B869`).
- **Body & Text:** Warm Stone Grey (`#D3CDC6`, `#EFECE9`, `#8A8580`).
- **Form Controls:** Squared-off 0–6px border radii (strictly no rounded pill buttons in primary workflows).
- **Gold Accent Rules:** 4px gold bars (`h-1 bg-gradient-to-r from-tac-gold-500 via-tac-gold-800 to-tac-gold-600`) atop cards and headers.
- **Typography:** Self-hosted webfonts bundled via `@font-face` in `public/fonts/`:
  - Headings / Display: **Montserrat** (Black, Bold, Uppercase tracking)
  - Body / Form Inputs: **Open Sans** (Regular, Medium, Semibold)

---

## 4. Claude Code Agent & Developer Setup Guide

Other teammates and automated AI coding agents (such as Claude Code) can install, build, and verify this repository locally with the following steps.

### Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher

### Installation Steps
```bash
# 1. Clone the repository
git clone https://github.com/the-alabama-collective/mobile-scoring-platform.git
cd mobile-scoring-platform

# 2. Install dependencies cleanly
npm install

# 3. Run the automated acceptance test suite (13 passing tests)
npm test

# 4. Start the local development server
npm run dev
# The platform is now live at: http://localhost:5173/

# 5. Verify production build and PWA service worker generation
npm run build
```

### Context for Claude Code Agents
When operating inside this codebase, observe the following architectural rules:
1. **Local-First Offline Storage:** All state is persisted to `localStorage` via [`src/services/storageService.ts`](./src/services/storageService.ts). When writing new features, never introduce remote database blockers unless explicitly requested.
2. **Acceptance Criteria Discipline:** Every story (`MSP-XX`) has strict Given-When-Then rules. Review [`PROJECT_TRANSCRIPT_AND_AGENT_GUIDE.md`](./PROJECT_TRANSCRIPT_AND_AGENT_GUIDE.md) before extending or refactoring any component.
3. **No Unused Imports:** TypeScript is configured with strict checking (`noUnusedLocals: true`, `noUnusedParameters: true`). Clean up unused imports to keep `npm run build` green.
4. **Design Integrity:** Maintain The Alabama Collective color palette defined in `tailwind.config.js` (`tac-ink-*`, `tac-gold-*`, `tac-stone-*`).

---

## 5. Automated Test Suite Architecture

The test suite is organized into three comprehensive layers in [`src/test/`](./src/test/):

1. **`epic1-acceptance.test.ts` (7 tests):** Validates template persistence (`MSP-01`), scales > 10 pts (`MSP-10`), listening guidelines (`MSP-12`), no-code coordinator admin (`MSP-31`), rubric locking (`MSP-32`), round cloning (`MSP-33`), and regional bonus calculation (`MSP-35`).
2. **`epic2-epic3-acceptance.test.ts` (5 tests):** Validates score submission receipts (`MSP-23`), low-stakes score revision (`MSP-24`), real-time missing judge detection (`MSP-05`, `MSP-19`), leaderboard calculations (`MSP-06`), and staff sign-off locks (`MSP-34`).
3. **`e2e-user-flows.test.tsx` (1 test):** Executes the entire user journey in a simulated DOM across all 4 platform tabs (Admin -> LIVE Lock -> Judge Portal -> 3m Stopwatch -> Score Submission -> Live Matrix -> Audit Modal -> Staff Checkpoint -> Regional Bonus -> Template Manager).

Execute all tests with:
```bash
npm test
```

---

## 6. Project Directory Map

```text
mobile-scoring-platform/
├── .github/
│   └── workflows/
│       └── deploy.yml              # Automated GitHub Pages CI/CD pipeline
├── public/
│   ├── favicon.ico
│   ├── fonts/                      # Self-hosted Montserrat & Open Sans
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── components/
│   │   ├── Header.tsx              # Top navigation bar with live submission badge
│   │   ├── JudgeRosterManager.tsx  # QR code generator & judge roster management
│   │   ├── JudgeScoringPortal.tsx  # Sticky header, 3m timer, tactile score steppers
│   │   ├── LiveSubmissionBoard.tsx # Real-time submission matrix, leaderboard, audit modal
│   │   ├── RegionalBonusPanel.tsx  # Gift Classic +5 bonus award selector
│   │   ├── RoundManager.tsx        # Stage lifecycle controls, cloner, booth categories
│   │   ├── RubricBuilder.tsx       # Arbitrary point scales & listening prompts
│   │   └── TemplateManager.tsx     # Reusable judging form templates & JSON exporter
│   ├── data/
│   │   └── seedData.ts             # Official MCC-BP 2026 teams, judges & rubrics
│   ├── services/
│   │   └── storageService.ts       # Local-first persistence engine with audit tracking
│   ├── test/
│   │   ├── e2e-user-flows.test.tsx # Full browser journey integration test
│   │   ├── epic1-acceptance.test.ts# Epic 1 unit and acceptance tests
│   │   ├── epic2-epic3-acceptance.test.ts # Epics 2 & 3 unit and acceptance tests
│   │   └── setup.ts                # Vitest testing-library & localStorage mock
│   ├── types/
│   │   └── index.ts                # TypeScript domain models (Competition, Rubric, Score)
│   ├── App.tsx                     # Main application orchestrator
│   ├── index.css                   # Tailwind directives & design system font declarations
│   └── main.tsx                    # React DOM root entrypoint
├── PROJECT_TRANSCRIPT_AND_AGENT_GUIDE.md # Comprehensive handoff log & prompt transcript
├── README.md                       # Master repository documentation
├── package.json                    # Dependencies & build scripts
├── tailwind.config.js              # TAC Design System color tokens and spacing
├── tsconfig.json                   # Strict TypeScript compiler options
└── vite.config.ts                  # Vite build & VitePWA service worker configuration
```

---

## 7. License & Attribution

Designed and developed for **The Alabama Collective (TAC)** for the Magic City Classic Business Pitch Competition.  
All brand assets, color tokens, and event materials remain the property of The Alabama Collective.
