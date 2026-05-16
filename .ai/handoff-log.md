# Handoff Log

Use this file as an append-only record whenever an agent finishes, pauses, or hands off work.

## Entry Template

### YYYY-MM-DD - Agent - Task ID

- Status:
- Files changed:
- Verification:
- Decisions made:
- Next recommended step:

### 2026-05-13 - Codex - ARCH-001

- Status: Complete.
- Files changed: Added project structure, shared agent instructions, workflow docs, product docs, architecture docs, placeholders, `.gitignore`, and `.editorconfig`.
- Verification: Ran `rg --files --hidden -g '!node_modules' -g '!.git'` and `git status --short`. Project scaffold is present and uncommitted in Git.
- Decisions made: Use `.ai/` for synchronization, `docs/` for plans and decisions, `src/` for implementation, `content/` for authored questions, and `assets/` for static media.
- Next recommended step: Create the AP Precalculus app construction plan and choose the desktop app stack.

### 2026-05-13 - Claude - Coordination polish

- Status: Complete.
- Files changed:
  - Added `.ai/messages/README.md`, `.ai/messages/from-claude.md`, `.ai/messages/from-codex.md` (new agent-to-agent message channel).
  - Added `docs/INDEX.md` (one-line map of every doc and folder).
  - Updated `docs/architecture/overview.md` to add a `## Targets` section reframing the app as web + desktop, with `src/app/` and `src/domain/` shared across both targets.
  - Updated `.ai/status.md` to reflect the new phase and note dual-target.
- Verification: Ran `git status --short` before and after edits. Glob-confirmed new files exist at expected paths.
- Decisions made: App is web + desktop, not desktop-only. Same UI and domain layers in both targets; only the host shell differs. Introduced `.ai/messages/` as a lightweight channel distinct from the handoff log.
- Blockers: None.
- Next recommended step: Codex to respond in `.ai/messages/from-codex.md`. DEC-001 (stack choice) should be revisited under the dual-target framing. PLAN-001 still unowned.

### 2026-05-15 - Claude - HOME-002 hotfix (regression)

- Status: Fixed + pushed (`3a89b0e`, `0bf88bf..3a89b0e`).
- Regression: `0bf88bf` deleted the `.home-band*` CSS based on a wrong, unverified assumption that the stats band had been removed from the JSX. It had not — `Home.tsx:444-462` still renders it (content rebuilt as Author/Units/MCQ/Review during the H3 honesty fix). Result: the band rendered as unstyled jammed text on the live homepage. User caught it via screenshot.
- Fix: restored the full `.home-band*` block plus the 1080px and 720px media-query rules in `home.css`, exactly as before. `npm run build` green, `npm run lint` clean. Corrected the wrong "dead CSS" claim in `.ai/messages/from-claude.md`.
- Root cause: assumed instead of verifying JSX usage before deleting CSS — the exact failure mode previously flagged on the `aal` finding. Lesson: never delete a selector without grepping the JSX/TSX for the class first.
- Remaining HOME-002 changes (teal focus, reduced-motion, skip link, nav inner wrapper, unit-plot opacity, redundant "Unit N" removal, qpanel heading) are unaffected and verified. Available to fully revert HOME-002 if the user prefers.

### 2026-05-15 - Claude - HOME-002 (homepage polish)

- Status: Complete. Committed + pushed to `origin/main`.
- Files changed: `src/app/components/Home.tsx`, `src/app/styles/home.css`.
- What changed:
  - Focus rings recolored from off-vocabulary orange to brand teal (`#0f766e`) on the difficulty selector + sample-card choices; added a homepage-wide teal `:focus-visible` base. Matches `--sp-border-focus`/the app the user enters after sign-in.
  - Added `@media (prefers-reduced-motion: reduce)` disabling hover lifts/transitions; removed the infinitely-pulsing qpanel dot + its `@keyframes` entirely.
  - Added a keyboard skip link (`.home-skip-link`, off-screen until focused).
  - Nav content wrapped in `.home-nav__inner` (max-width 1280, centered) so the bar aligns with the rest of the page on wide monitors; moved the 720px flex-wrap onto the inner wrapper.
  - Removed dead `.home-band*` CSS (~60 lines + 2 media-query refs) — the stats band was removed from JSX in the H3 honesty fix but the CSS lingered.
  - Unit-card decorative plot opacity 0.95 → 0.5 for text legibility (WCAG).
  - Removed the redundant "Unit N" label from unit cards (the "0N" badge already conveys it) — the user flagged it as text serving no purpose over the unit graphs.
  - qpanel "End behavior" `<h3>` → non-heading `<p class="home-hero__qpanel-title">` (fixes h1→h3 outline skip); "Live preview" + dot → static "Sample" chip (it is not interactive).
- Verification: `npm run lint` clean, `npm test` 196/196 across 36 files, `npm run build` green (pre-existing 500 kB chunk warning only).
- Decisions made: Left the editorial 12–16px radii and the multi-accent feature stripe as-is — those are deliberate "bolder marketing" choices from the design-iteration history, not bugs; flagged as judgment calls rather than silently reverting.
- Blockers: None.
- Next recommended step: Codex's REVIEW-002 clusters (F new-auth, G data integrity, H storage migration) are still open and unaffected by this UI pass.

### 2026-05-15 - Claude - REVIEW-002 fix spec

- Status: Complete (spec only; no source edits).
- Files changed:
  - Rewrote `docs/reviews/2026-05-15-bug-hunt.md` so every bug (V1–V4, A1–A4, A5.1–A5.6) carries a concrete apply-as-is fix (code/SQL), not a one-line direction. Read the actual source for A1–A4 before writing their fixes (`questionContentStore.ts:285-329,690-705`, `inviteStore.ts:526-561`, `scoreFrq.ts`, `createSessionResult.ts:70-129`).
  - Updated `docs/INDEX.md`, `.ai/task-board.md` (REVIEW-002 note), `.ai/messages/from-claude.md` (heads-up on V1 SQL, V2 two-part, A2 migration, V4 one-liner).
- Verification: Read-only. Fixes written against current source; line numbers approximate, snippet-anchored.
- Decisions made:
  - V1 fix splits invite consumption into a new `handle_user_email_confirmed()` trigger; documented the insert→confirm race as an accepted beta trade-off with a `reserved_at` alternative deferred.
  - A2 explicitly scoped as a schema migration (nullable `asset_id` → `''` sentinel + matching unique index) + optional RPC for atomicity — not a blind one-liner; assigned to Cluster H (Codex, migration ownership).
  - The doc now doubles as the implementation spec; clusters F–I unchanged.
- Blockers: None.
- Next recommended step: Land V4 (one line) immediately. Codex takes Cluster F + H, Claude takes G, I flexible. Codex to confirm/counter in `from-codex.md`.

### 2026-05-15 - Claude - REVIEW-002 (bug hunt)

- Status: Complete (findings only; no source edits).
- Files changed:
  - Added `docs/reviews/2026-05-15-bug-hunt.md` — post-REVIEW-001/AUTH-007/AUTH-008 hunt. 4 verified findings (V1–V4), 4 agent-reported (A1–A4), a minor batch (A5), and an explicit rejection of the `aal` false-positive (V5). Clusters F–I + coordination proposal.
  - Updated `docs/INDEX.md`, `.ai/task-board.md` (REVIEW-002 Done), `.ai/messages/from-claude.md` (heads-up + cluster proposal).
- Verification: Read-only. Ran 3 parallel hunting agents (auth/MFA, Supabase/async, UI/domain). Personally verified the highest-stakes items in source: `supabase/schema.sql:280-345,449-458`, `src/data/supabase/accountStore.ts:272-389`, `src/app/components/SessionPractice.tsx:543-555`, and the `aal` claim against Supabase's MFA docs.
- Decisions made:
  - Rejected the agent-reported "critical" `is_admin()` `aal` finding — `auth.jwt()->>'aal'` is Supabase's documented MFA RLS pattern; `schema.sql:457` is correct. Logged the rejection in the doc so it isn't re-raised.
  - Confirmed REVIEW-001D fixes held (ref-sync dep array, MathText trust/MathML, AccountAuth semantics).
  - Confidence tiers labelled per finding: [verified] vs [agent].
- Blockers: None.
- Next recommended step: V4 (`SessionPractice.submitSession` phase guard) is a one-line fix — land independently and immediately. Codex takes Cluster F (new-auth: V1/V2/V3), Claude takes Cluster G (data integrity). Codex to confirm/counter in `from-codex.md`.

### 2026-05-14 - Claude - REVIEW-001 reply

- Status: Complete.
- Files changed:
  - Added `docs/reviews/2026-05-14-claude-reply-to-codex-response.md` — concessions on findings #4, #8, #11; adoption of Codex's three homepage findings (H1 focus state, H2 incomplete tab pattern, H3 misleading marketing copy); severity recalibration table; reshuffled work clusters (A–E); coordination proposal for who takes which cluster.
  - Updated `docs/INDEX.md` to list the reply doc under Reviews.
  - Appended a heads-up to `.ai/messages/from-claude.md` summarizing the concessions, recalibration, and proposed cluster split.
- Verification: Read-only this turn. Verified the three contested findings before conceding: `supabase/schema.sql:508-509` column grants (#8), `node_modules/katex/dist/katex.mjs:149,6502` output enum (#11), `src/data/localAttemptStore.ts:335-346` synchronous read-merge-write path (#4).
- Decisions made:
  - All three Codex pushbacks (findings #4, #8, #11) verified and conceded.
  - Three new homepage findings (H1/H2/H3) adopted from Codex's response.
  - Final severity distribution: 1 Critical, 4 Important, 7 Medium, 5 Low, 1 WONTFIX.
  - Work clusters renamed and reshuffled: A (security/data integrity, unchanged), B (homepage polish — new), C (persistence error visibility), D (lower-priority polish), E (deferred refactors).
  - In-place edits to the main review doc are held until Codex confirms the recalibration in `from-codex.md`.
- Blockers: None. Awaiting Codex's read of the reply and confirmation on the cluster split proposal (Claude takes B, Codex takes A).
- Next recommended step: Codex reads the reply, confirms or counters the cluster proposal in `.ai/messages/from-codex.md`. Once confirmed, whichever agent landed first ticks REVIEW-001 items off in the main review doc.

### 2026-05-14 - Claude - REVIEW-001

- Status: Complete.
- Files changed:
  - Added `docs/reviews/2026-05-14-codebase-review.md` — 16 findings (4 critical, 6 important, 6 a11y/quality) plus 3 non-issues for context. Grouped into four shippable clusters: A (security/data integrity), B (silent failures), C (a11y/perf), D (refactor). Each finding has file:line, severity, root cause, and starting fix direction.
  - Updated `docs/INDEX.md` to add a `Reviews` section between Planning and Decisions.
  - Updated `.ai/task-board.md` — REVIEW-001 Done, with pointer to the review doc and instructions to split into REVIEW-001A…D when picked up.
  - Appended a heads-up to `.ai/messages/from-claude.md` summarizing the four clusters and the four critical items.
- Verification: None — read-only audit. No source files were modified. Two general-purpose review agents ran in parallel (one for bugs/security, one for code-quality/a11y); their findings were consolidated, deduplicated, and prioritized after manual verification on the highest-impact items (`MathText.tsx`, `accountStore.ts`, `SessionPractice.tsx`, `App.tsx`).
- Decisions made:
  - Audit deliverable lives in `docs/reviews/` (new folder) keyed by date — chronological and discoverable.
  - Findings doc is mutable: as items land, mark the heading `— DONE (PR #N)`; if a finding turns out wrong, mark `WONTFIX` with a reason rather than silently dropping it.
  - The four findings tagged Critical are the cluster I'd ship first; Group A in the doc.
- Blockers: None.
- Next recommended step: Codex (or any agent) picks a group, claims scope in `.ai/status.md`, drops a note in `.ai/messages/from-codex.md` identifying which group, and ticks items off in the review doc as PRs land. Groups A and C are parallel-safe with each other.

### 2026-05-14 - Claude - HOME-001

- Status: Complete.
- Files changed:
  - Added `src/app/components/Home.tsx` — TypeScript port of the Home.jsx from the design bundle (`api.anthropic.com/v1/design/h/qnHx86OHTu0lQR5w6jZoRg`). Uses real `lucide-react` icons, typed props, interactive sample question with three difficulty levels.
  - Added `src/app/styles/home.css` — homepage-only styles (nav, hero with dashboard preview + sparkline, stats band, feature grid, sample question card with College Board serif treatment, units, dark CTA, footer). Also added `.auth-back-home` for the new back affordance.
  - Added `src/app/styles/tokens.css` — design tokens (`--sp-brand-*`, ink scale, status colors, type roles, spacing, radii) extracted from the design bundle's `colors_and_type.css`. Additive — `src/app/styles/app.css` remains the source of truth for current component styles.
  - Added `public/favicon.svg` — teal `SP` monogram placeholder favicon from the design bundle.
  - Updated `src/app/main.tsx` to import `tokens.css` (before app.css) and `home.css` (after).
  - Updated `index.html` — title to "Study Precalc · AP Precalculus practice", favicon link, Google Fonts preconnect + Inter (400–900) + Source Serif 4 (italic + roman) for the AP-exam-styled sample question.
  - Updated `src/app/App.tsx` — added `unauthView` state (`'home' | 'auth'`, defaults to `'home'`). When unauthenticated, shows `Home` by default and `AccountAuth` only after "Sign in" / "Get started"; resets to `'home'` on logout.
  - Updated `src/app/components/AccountAuth.tsx` — added optional `onBackToHome` prop that renders a "Back to home" affordance at the top of the auth panel.
- Verification: `npm run lint` (clean), `npm run build` (tsc + Vite build, 10.13s, 438 KB main / 120 KB gzip), `npm test` (104/104 passing across 22 files), `npm run validate:content` (0 questions, no errors — bank is intentionally empty per CONTENT-004).
- Decisions made:
  - The design bundle's primary new contribution is the **public marketing homepage**; Auth/Dashboard/Practice/Session/Review screens in the bundle are reconstructions of what already ships, so we did not regenerate them.
  - Adopted the design tokens (`tokens.css`) as additive — no migration of `app.css` in this task. New components should prefer `--sp-*` tokens.
  - College Board serif treatment for the sample question is scoped to `.home-sample__card` only — the authed Practice screen stays faithful to the upstream visual.
  - Inter is loaded from Google Fonts in `index.html` for cross-machine fidelity; the upstream stylesheet still falls through to system fonts if the import fails.
- Blockers: None.
- Next recommended step: Owner activation of Supabase + Vercel (apply `supabase/schema.sql`, deploy, run write smoke). Visual QA pass on the homepage at deploy time (the sparkline, stats band, and CTA section haven't been exercised against the real production layout yet).

### 2026-05-13 - Claude - PLAN-001

- Status: Complete.
- Files changed:
  - Added `docs/planning/milestones.md` — construction roadmap covering M0 (foundation) through M10 (desktop port), with submilestones, exit criteria, principles, out-of-scope list, and maintenance rules.
  - Updated `docs/INDEX.md` to include the new `docs/planning/` section.
  - Updated `.ai/task-board.md`: marked PLAN-001 and ARCH-002 Done, split DEC-001 into web + desktop ADRs, added DEC-002 (math renderer) and DEC-003 (schemas).
  - Appended a follow-up note in `.ai/messages/from-claude.md` for Codex about stack ADRs and math input.
  - Updated `.ai/status.md` to reflect the new phase.
- Verification: Glob-confirmed `docs/planning/milestones.md` exists; reviewed all edits in context.
- Decisions made: Web first, desktop port at M10. Same `src/app/` and `src/domain/` across both targets. Content authoring (M7) is a parallel track to M2–M6. Self-graded rubric for FRQs in v1 (no auto-grading). KaTeX/MathJax, web stack, and desktop shell each get their own ADR before M1.
- Blockers: None, but M0 cannot start until DEC-001/002/003 are owned and decided.
- Next recommended step: Assign DEC-001 (web + desktop stacks). Codex to respond in `.ai/messages/from-codex.md` on the ADR-drafting split.

### 2026-05-13 - Codex - APP-001

- Status: Complete.
- Files changed: Added React/Vite/TypeScript tooling, ADRs for stack/math/schema decisions, Zod schemas, seed AP Precalc-style content, content validator, scoring helpers, unit tests, and the first question practice UI.
- Verification: Ran `npm run validate:content`, `npm test`, `npm run lint`, and `npm run build`. Started Vite dev server at `http://127.0.0.1:5173` and confirmed HTTP 200.
- Decisions made: Web stack is React + Vite + TypeScript; desktop preference is Tauri later; math rendering is KaTeX; content is JSON validated by Zod.
- Blockers: Desmos graphing calculator panel requires a valid `VITE_DESMOS_API_KEY` before it can load the official Desmos API.
- Next recommended step: Implement persistent attempt tracking in browser storage, then expand question-bank navigation and AP-style session mode.

### 2026-05-13 - Codex - CONTENT-002

- Status: Complete.
- Files changed: Added local-first content storage, Manage Content tab, no-code MCQ/FRQ editor, import/export, delete/edit workflows, video reference fields, ADR 0005, and roadmap updates.
- Verification: Ran `npm run validate:content`, `npm test`, `npm run build`, and `npm run lint`. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
- Decisions made: No-code content management is local-first for the static web app. A server-backed CMS/admin publishing workflow remains a future milestone for centralized website management.
- Blockers: Browser-local content is specific to the current browser/device until backend or desktop file storage is added.
- Next recommended step: Add persistent attempt tracking, then design the future CMS publishing workflow once deployment target is chosen.

### 2026-05-13 - Codex - APP-002/APP-003/CONTENT-003/VIDEO-001

- Status: Complete.
- Files changed: Integrated attempt persistence into practice, added Review history with import/export/remove/clear, added question bank filters/search/random, integrated video explanation display, and updated authoring docs, validation, roadmap, and coordination files.
- Verification: Ran `npm run validate:content`, `npm test` (20 tests), `npm run build`, and `npm run lint`. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
- Decisions made: Attempts remain local-first in browser storage for now; Review is the student-facing history surface. Question bank navigation lives in Practice until a fuller dashboard/session mode is built.
- Blockers: No backend/CMS yet, so public website-wide publishing and cross-device sync remain future work.
- Next recommended step: Build M6 session/quiz mode, including AP-style section presets and summary/review flows.

### 2026-05-13 - Worker C - VIDEO-001

- Status: Complete.
- Files changed: Added `src/app/components/VideoExplanation.tsx`, `src/app/components/VideoExplanation.css`, and `tests/unit/videoExplanation.test.ts`.
- Verification: Ran `npm test -- videoExplanation`, `npm test`, `npm run lint`, and targeted `npx tsc --noEmit ... src/app/components/VideoExplanation.tsx tests/unit/videoExplanation.test.ts`. `npm run build` is currently blocked by an unrelated `src/domain/attempts/createAttempt.ts` type error in the attempt-tracking scope.
- Decisions made: The component accepts the domain `VideoExplanation` object, embeds YouTube/Vimeo/direct video files, and falls back to safe HTTP(S) external links with optional thumbnail, transcript, and duration metadata.
- Next recommended step: Integrate the component from the parent practice/review surface once the owning agent is ready to touch that UI.

### 2026-05-13 - Worker B - CONTENT-003

- Status: Complete.
- Files changed: Added `docs/product/content-authoring-guide.md`, added `docs/product/content-taxonomy.md`, updated `scripts/validate-content.ts`, and added `tests/unit/contentValidation.test.ts`.
- Verification: Ran `npm run validate:content`, `npm test`, `npm run lint`, `npm run build`, scoped `npx tsc --noEmit ... scripts/validate-content.ts tests/unit/contentValidation.test.ts`, and scoped `npx prettier --check` for Worker B files. All passed.
- Decisions made: Content linting now treats duplicate IDs, duplicate normalized tags, missing/empty common mistakes, and video URLs without transcripts as authoring metadata failures beyond schema validity.
- Next recommended step: Use the taxonomy in future content authoring and consider a later migration to align existing seed `unit` strings to the canonical display values once content files are in scope.

### 2026-05-13 - Worker A - APP-002 attempt data layer

- Status: Complete for the data-layer slice; APP-002 remains in progress for UI integration and review display.
- Files changed: Added `src/data/localAttemptStore.ts`, added `src/domain/attempts/createAttempt.ts`, added `src/domain/attempts/index.ts`, updated `src/domain/attempts/types.ts`, and added `tests/unit/attemptHelpers.test.ts` plus `tests/unit/localAttemptStore.test.ts`.
- Verification: Ran `npm run lint`, `npm test`, and `npm run build`. All passed.
- Decisions made: Attempt storage uses localStorage key `precalcapp.attempts.v1`, a JSON export payload with `version`, `exportedAt`, and `attempts`, and Zod validation on import/load/save boundaries.
- Next recommended step: Integrate `useLocalAttemptStore` into the parent practice UI and add review/history controls without changing the domain data contract.

### 2026-05-13 - Codex - VIDEO-002

- Status: Complete.
- Files changed: Added `src/data/localVideoStore.ts`, updated content authoring video upload controls, updated practice explanation reveal controls, extended `VideoExplanation` for uploaded local videos, allowed `local-video:<id>` schema values, and added local video tests.
- Verification: Ran `npm run validate:content`, `npm test` (24 tests), `npm run lint`, and `npm run build`. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
- Decisions made: Uploaded videos are stored in browser IndexedDB and referenced from questions as `local-video:<id>`. The explanation and video player are learner-revealed instead of always visible.
- Blockers: Uploaded video files do not travel inside exported JSON. Public/cross-device video management still needs a backend media library or desktop file packaging later.
- Next recommended step: Build AP-style session/quiz mode or design the future server-backed content/media publishing workflow.

### 2026-05-13 - Codex - ASSET-001

- Status: Complete.
- Files changed: Added `src/data/localImageStore.ts`, added `src/app/components/QuestionAssetGallery.tsx`, expanded question/explanation asset schemas, updated Content Manager with question and solution image controls, rendered prompt/solution assets in practice, updated docs, and added local image/schema tests.
- Verification: Ran `npm run validate:content`, `npm test` (27 tests), `npm run lint`, and `npm run build`. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
- Decisions made: Prompt visuals live in `question.assets`; solution-only visuals live in `question.explanation.assets`. Uploaded images are stored in browser IndexedDB and referenced as `local-image:<id>`.
- Blockers: Uploaded image files do not travel inside exported JSON. Public/cross-device image management still needs backend media storage or a desktop packaging strategy.
- Next recommended step: Build AP-style session/quiz mode or design the future server-backed media library so uploaded images/videos can publish beyond one browser profile.

### 2026-05-13 - Codex - DEC-004/SESSION-001

- Status: Complete.
- Files changed: Updated web-only direction in `README.md`, architecture docs, roadmap, and ADR 0002. Added `src/app/components/SessionPractice.tsx`, wired the `Session` tab in `src/app/App.tsx`, and added session UI styles.
- Verification: Ran `npm run build`, `npm run lint`, `npm run validate:content`, and `npm test` (27 tests). All passed.
- Decisions made: Desktop is no longer an active target. Session mode is browser-first, with generated filtered queues, optional timer display, progress navigation, in-session mark-for-review, no early answers, final review, and missed-question retry.
- Blockers: Session results are saved as normal per-question attempts. A true grouped session record still needs a dedicated session result schema.
- Next recommended step: Build grouped session persistence and a richer dashboard for session history and weak-skill review.

### 2026-05-13 - Codex - BUG-001

- Status: Complete.
- Files changed: Updated session persistence/review behavior, FRQ attempt timestamp handling, attempt schema/store safeguards, no-code content manager save/export/media handling, question/media schema validation, related tests, and coordination files.
- Verification: Ran `npm run validate:content`, `npm test` (30 tests), `npm run lint`, and `npm run build`. All passed. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
- Decisions made: Session state stays mounted across tab switches; blank FRQs are not saved or self-scored; timed sessions auto-submit; attempt imports prefer the newest `updatedAt`/`submittedAt` version; no-code authoring blocks accidental custom question ID overwrites and warns before exporting local-only media references.
- Blockers: Full uploaded media portability still needs a media library/export bundle or backend storage.
- Next recommended step: Build grouped session result persistence, then add a publishable media library so uploaded images/videos can be managed beyond one browser profile.

### 2026-05-13 - Codex - ACCOUNT-001/SESSION-002/DASH-001

- Status: Complete.
- Files changed: Added local account storage and auth UI, grouped session domain/schema/store, dashboard UI, session-result saving from Session mode, account-scoped attempt/session storage keys, ADR 0006, documentation updates, and unit tests for account/session helpers.
- Verification: Ran `npm run validate:content`, `npm test` (40 tests), `npm run lint`, and `npm run build`. All passed. Browser QA created a local account, submitted a grouped session, and confirmed Dashboard session/weak-unit summaries updated.
- Decisions made: Accounts are browser-local profiles only, with salted local password hashes. Real hosted login still requires backend auth and server storage. Grouped session records are stored separately from individual attempts and update after FRQ self-scoring.
- Blockers: No production backend auth, password reset, cloud sync, or server-side persistence yet.
- Next recommended step: Add a session detail drill-down and then design backend auth/CMS storage for public deployment.

### 2026-05-13 - Codex - AUTH-002/MEDIA-001 setup

- Status: Complete for code scaffolding; Supabase SQL still needs to be run in the dashboard.
- Files changed: Added `@supabase/supabase-js`, Supabase client/account/attempt/session adapters, cloud-mode app wiring with local fallback, Supabase row mapping tests, `supabase/schema.sql`, `supabase/README.md`, ADR 0007, env example updates, Vite Supabase chunking, and documentation/coordination updates.
- Verification: Ran `npm run validate:content`, `npm test` (42 tests), `npm run lint`, and `npm run build`. All passed. Browser QA confirmed the app boots in Cloud account mode.
- Decisions made: Use Supabase Auth/Postgres/Storage as the first cloud backend. Store question images in the `question-images` bucket with a 1 MB per-file limit. Do not store videos in Supabase.
- Blockers: `supabase/schema.sql` must be run in Supabase SQL Editor before cloud attempts/sessions and image storage are fully usable. The first admin must be promoted manually in `profiles`.
- Next recommended step: Run `supabase/schema.sql`, create a test account, promote the owner account to `admin`, then smoke-test sign-up, session save, and dashboard persistence.

### 2026-05-13 - Codex - DEPLOY-001

- Status: Complete for deployment setup; the actual hosted deployment requires Vercel account/GitHub import or CLI login.
- Files changed: Added `vercel.json`, added `docs/operations/deployment.md`, added ADR `docs/decisions/0008-vercel-first-web-deploy.md`, and updated `README.md`, `docs/INDEX.md`, `docs/planning/milestones.md`, `.ai/status.md`, and `.ai/task-board.md`.
- Verification: Ran `npm run build`, `npm run lint`, `npx prettier --check README.md docs/operations/deployment.md docs/decisions/0008-vercel-first-web-deploy.md docs/INDEX.md docs/planning/milestones.md .ai/status.md .ai/task-board.md vercel.json`, and `git diff --check`. All passed.
- Decisions made: Use Vercel as the first public static deployment target for `studyprecalc.com`; keep Supabase as the backend and configure browser-safe Vite env vars in Vercel.
- Blockers: No `VERCEL_TOKEN` is present and the Vercel CLI is not installed/logged in locally, so Codex cannot create the hosted project or assign the domain without user account access.
- Next recommended step: Import the repo into Vercel or run `npx vercel login` then `npx vercel --prod`, add the Supabase env vars, and connect `studyprecalc.com` from the Vercel Domains screen.

### 2026-05-13 - Codex - AUTH-004

- Status: Complete.
- Files changed: Updated `src/app/components/AccountAuth.tsx` and coordination files.
- Verification: Ran `npm run build`, `npm run lint`, and `npm test` (42 tests). All passed. Browser QA confirmed the Sign Up control shows the red invite-only alert and keeps the login form visible.
- Decisions made: Preserve the existing signup prop/store implementation, but default the UI to `allowSignup = false` so public users cannot reach the create-account form.
- Blockers: This is a UI-level block. For stricter production enforcement, Supabase public signups should also be disabled or replaced with an invite/admin-created account flow.
- Next recommended step: Disable public signups in Supabase Auth settings or build a real invite-code/admin account creation flow before inviting students.

### 2026-05-13 - Codex - AUTH-005

- Status: Complete.
- Files changed: Updated `src/data/localAccountStore.ts`, `src/data/supabase/accountStore.ts`, `src/app/App.tsx`, `src/app/components/AccountAuth.tsx`, `src/app/styles/app.css`, `tests/unit/localAccountStore.test.ts`, `README.md`, `docs/INDEX.md`, added `docs/decisions/0009-local-dev-admin.md`, and updated coordination files.
- Verification: Ran `npm test` (43 tests), `npm run lint`, `npm run build`, and `npm run validate:content`. All passed. Browser QA confirmed `admin@studyprecalc.local` / `localadmin` signs into the local app with an Admin badge and the Manage Content tab.
- Decisions made: Add a Vite-development-only local admin login and role-gate Manage Content to admin accounts. Supabase `profiles.role` remains the production source of truth.
- Blockers: Local dev admin is not a production invite system; it is intentionally available only in Vite dev builds.
- Next recommended step: Build real production invites/admin-created accounts, then move content publishing from local browser storage to Supabase-backed admin publishing.

### 2026-05-13 - Codex - CONTENT-004

- Status: Complete.
- Files changed: Emptied `content/questions/seed-ap-precalc.json`, allowed empty question sets, moved tests to neutral fixtures, and updated docs/coordination files.
- Verification: Ran `npm run validate:content` (0 questions), `npm test` (43 tests), `npm run lint`, `npm run build`, `npx prettier --check ...`, and `git diff --check`. All passed. Browser QA with local admin confirmed Dashboard 0 questions, Practice empty state, and Session start disabled.
- Decisions made: Shipped app starts with no bundled questions; schema allows empty sets; test-only fixtures are neutral and isolated under `tests/fixtures`.
- Blockers: Production Supabase smoke test still requires running `supabase/schema.sql` and creating/promoting the owner account in the dashboard.
- Next recommended step: Run Supabase SQL, then build the server-backed content publishing and invite account flow.

### 2026-05-14 - Agent 6 / Codex - CONTENT-006

- Status: Domain publishing rules complete; broader CONTENT-006 remains active for UI/backend integration.
- Files changed: Added `src/domain/questions/publication.ts`, added `src/domain/questions/visibility.ts`, updated `src/data/schemas/questionSchema.ts`, and added `tests/unit/publication.test.ts`.
- Verification: Ran `npm test -- publication`, `npm run validate:content`, `npm test` (62 tests), targeted `npx eslint src/domain/questions/publication.ts src/domain/questions/visibility.ts src/data/schemas/questionSchema.ts tests/unit/publication.test.ts`, and targeted `npx prettier --check ...`. All passed.
- Decisions made: Missing publication status is treated as `draft` to avoid accidental student exposure; students see only `published`; admins can preview drafts by default; archived questions stay hidden unless an admin caller explicitly includes them.
- Blockers: Full `npm run lint` currently fails on unused imports in `src/app/App.tsx`; full `npm run build` currently fails in `src/app/App.tsx` and `src/data/localClassStore.ts` due concurrent integration work outside Agent 6 scope.
- Next recommended step: Integrate the publishing helpers into the App/content-store UI path once Agent 3/4/5 changes settle, then rerun full lint/build.

### 2026-05-14 - Agent 5 / Codex - CONTENT-005/CONTENT-006

- Status: Complete for Content Manager UI scope; broader server-backed content and publishing integration remains active.
- Files changed: Updated `src/app/components/ContentManager.tsx` and content-manager styles in `src/app/styles/app.css`; updated coordination status/handoff files.
- Verification: Ran targeted strict TypeScript for `src/app/components/ContentManager.tsx`, `npm run lint`, `npm test` (62 tests), `npm run validate:content`, and `git diff --check`. All passed. Full `npm run build` is currently blocked by concurrent integration errors in `src/app/App.tsx` and `src/data/localClassStore.ts` outside Agent 5 scope.
- Decisions made: The manager now surfaces server/local library status, refresh affordance when provided, draft/publish/archive lifecycle controls, publish-readiness checks, and a richer student vs answer-key preview without changing backend stores or schemas from this scope.
- Blockers: Build blockers are `src/app/App.tsx(22,10)` missing `useSupabaseQuestionContentStore` export and `src/data/localClassStore.ts(119,3)` returning a widened `version: string` instead of the class payload literal.
- Next recommended step: Resolve the concurrent App/content-store and class-store integration blockers, then rerun the full build and browser-check the Manage Content flow with the backend store wired.

### 2026-05-14 - Agent 3 / Codex - AUTH-006

- Status: Complete for the Invite/Auth UI scope; broader AUTH-006 remains active for backend/admin invite work.
- Files changed: Updated `src/app/components/AccountAuth.tsx`, AccountAuth-specific styles in `src/app/styles/app.css`, and coordination files.
- Verification: Ran `npx eslint src/app/components/AccountAuth.tsx`, scoped `npx tsc --noEmit ... src/app/components/AccountAuth.tsx`, `npx prettier --check src/app/components/AccountAuth.tsx src/app/styles/app.css`, `npm test` (70 tests), `npm run lint`, and scoped `git diff --check`. All passed. Attempted `npm run build`; it is currently blocked by unrelated active work in `src/app/App.tsx`, `src/data/localClassStore.ts`, and `src/data/supabase/questionContentStore.ts`.
- Decisions made: The Sign Up tab now opens an invite-code step while public signup remains blocked. Entering an invite code reveals the account-creation form and forwards the normalized code through `onSignup`; local dev admin remains on the login path.
- Blockers: Full build is waiting on active App/class/content-store integration outside this scope. In-app browser automation was unavailable, so verification is command-line only.
- Next recommended step: Finish backend invite validation/admin invite creation, then run full build and browser QA for accepted and rejected invite codes.

### 2026-05-14 - Agent 2 / Codex - AUTH-006

- Status: Complete for the invite/auth backend scope; broader AUTH-006 remains active for final app/schema integration and smoke testing.
- Files changed: Added `src/domain/invites/*`, `src/data/localInviteStore.ts`, `src/data/supabase/inviteStore.ts`, `tests/unit/inviteDomain.test.ts`, `tests/unit/localInviteStore.test.ts`, and `tests/unit/supabaseInviteMapping.test.ts`.
- Verification: Ran `npm test -- invite` (10 tests), `npm test` (70 tests), `npm run lint`, and scoped `npx prettier --check ...` for invite files. All passed. Attempted `npm run build`; it is currently blocked by `src/data/localClassStore.ts(119,3)` returning a widened `version: string` outside Agent 2 scope.
- Decisions made: Invite codes are normalized to uppercase, single-use after consumption, optionally email/class scoped, and rejected when invalid, expired, or already used. Local fallback stores invite records in browser storage; Supabase adapter targets an `invites` table surface with create, validate, consume, revoke, row mapping, and hook methods.
- Blockers: Full build requires the class-store worker/integrator to fix the `ClassPayload.version` literal type issue.
- Next recommended step: Resolve the class-store build blocker, then run full build and browser QA for local invite creation, invite signup, class enrollment, and rejected expired/used codes.

### 2026-05-14 - Agent 4 / Codex - CONTENT-005/CONTENT-006

- Status: Complete for content storage backend scope; broader server-backed content manager and publishing integration remains active.
- Files changed: Added `src/domain/questions/contentRecords.ts`, `src/data/questionContentStore.ts`, `src/data/localQuestionContentStore.ts`, `src/data/supabase/questionContentStore.ts`, and `tests/unit/questionContentStore.test.ts`. Updated coordination status/handoff files.
- Verification: Ran `npm test -- questionContentStore`, `npx tsc --noEmit --pretty false`, `npm run lint`, `npm test` (70 tests), `npm run build`, and `git diff --check`. Content-store tests, lint, full tests, and diff check passed. TypeScript/build are blocked only by concurrent class-store work in `src/data/localClassStore.ts(119,3)`.
- Decisions made: Question storage records keep publication metadata outside the question body. Supabase uses the existing `questions` table, with `is_published` as the student-visible flag and a JSON content envelope for lifecycle metadata. Local storage reads the new record payload and can migrate the legacy local question-pack payload.
- Blockers: Full build cannot complete until the class-store payload version type is fixed outside Agent 4 scope.
- Next recommended step: Resolve the class-store build blocker, then smoke-test the Manage Content flow against local fallback and Supabase-backed content records.

### 2026-05-14 - Wave 2 Agent 11 / Codex - AUTH-003/DEPLOY-002

- Status: Complete for deployment/operations runbook scope; actual Supabase dashboard setup and Vercel deployment remain owner/action tasks.
- Files changed: Added `docs/operations/supabase-setup.md`; updated `docs/operations/deployment.md`, `README.md`, `docs/INDEX.md`, `.ai/status.md`, `.ai/task-board.md`, and `.ai/handoff-log.md`.
- Verification: Ran `npx prettier --check README.md docs/operations/deployment.md docs/operations/supabase-setup.md docs/INDEX.md` and `git diff --check -- README.md docs/operations/deployment.md docs/operations/supabase-setup.md docs/INDEX.md .ai/status.md .ai/task-board.md .ai/handoff-log.md`. Formatting and whitespace checks passed; the diff check reported only existing CRLF warnings for `.ai/*` coordination files.
- Decisions made: Documented first admin bootstrap through a one-time SQL-created admin invite because the current production UI requires an invite before signup. Documented that the `question-images` bucket is provisioned by SQL, but current app-side production content smoke tests should use text-only or HTTPS-image content until Supabase Storage image upload is wired.
- Blockers: I did not run live Supabase SQL, Vercel deploy, DNS checks, or browser smoke tests because those require owner dashboard/project access and production credentials.
- Next recommended step: Owner runs `supabase/schema.sql`, bootstraps the admin invite, configures Vercel env vars, deploys, connects `studyprecalc.com`, then follows the runbook smoke tests.

### 2026-05-14 - Wave 2 Agent 7 / Codex - CLASS-001

- Status: Complete for class backend worker scope; broader class management remains active for UI/final smoke testing.
- Files changed: Updated `src/domain/classes/types.ts`, `src/data/localClassStore.ts`, and `src/data/supabase/classStore.ts`; added `tests/unit/localClassStore.test.ts` and `tests/unit/supabaseClassMapping.test.ts`; updated coordination files.
- Verification: Ran `npm test -- class` (5 tests), `npx tsc --noEmit --pretty false`, scoped `npx prettier --check ...`, `npm test` (80 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported only existing CRLF warnings.
- Decisions made: Kept class/enrollment roles owned by the class domain instead of importing account data-layer types. Local and Supabase enrollment paths now normalize roster rows and upsert duplicates by `(classId, accountId)` while preserving the original enrollment id/createdAt.
- Blockers: None in the class backend scope.
- Next recommended step: Final integrator should smoke-test invite signup into a class after the admin class UI and Supabase schema setup are available.

### 2026-05-14 - Wave 2 Agent 8 / Codex - CLASS-001

- Status: Complete for Admin Class UI scope; broader CLASS-001 remains active for final smoke testing with signup/enrollment.
- Files changed: Updated `src/app/components/AdminClassManager.tsx`, admin-class-specific CSS in `src/app/styles/app.css`, and coordination files.
- Verification: Ran scoped `npx eslint src/app/components/AdminClassManager.tsx`, scoped `npx tsc --noEmit ... src/app/components/AdminClassManager.tsx`, `npx prettier --check src/app/components/AdminClassManager.tsx src/app/styles/app.css`, scoped `git diff --check`, `npm run lint`, `npm test` (80 tests), `npm run build`, and `npm run validate:content`. All passed. Confirmed the Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
- Decisions made: Kept the existing props/backend contract. The screen now has admin summary metrics, selected-class metrics, sorted roster/invite lists, trimmed form submissions, end-of-day invite expiration dates, async refresh/revoke feedback, and clipboard failure handling.
- Blockers: In-app browser automation could not run because no browser targets were registered in the Browser plugin.
- Next recommended step: Final integrator should run browser QA for local admin class creation, invite copy/revoke, invite signup, and automatic roster enrollment once a browser target is available.

### 2026-05-14 - Wave 2 Agent 10 / Codex - AUTH-006/CONTENT-005/CONTENT-006/CLASS-001

- Status: Complete for integration test harness scope; broader final smoke testing remains active.
- Files changed: Added `tests/fixtures/integrationHarness.ts` and `tests/unit/integrationHarness.test.ts`; updated `.ai/status.md`, `.ai/task-board.md`, and `.ai/handoff-log.md`.
- Verification: Ran `npm test -- integrationHarness` (5 tests), `npm test` (80 tests), `npx prettier --check tests/fixtures/integrationHarness.ts tests/unit/integrationHarness.test.ts`, `npx eslint tests/fixtures/integrationHarness.ts tests/unit/integrationHarness.test.ts`, `npm run lint`, `npm run validate:content`, `npm run build`, and scoped `git diff --check`. All passed; diff check reported existing CRLF warnings only.
- Decisions made: Kept integration coverage in a test-only harness that composes existing local invite/account/class/content stores instead of editing app source. Covered invite validation/signup/consume/enrollment, invalid invite rejection before account creation, admin/student role gating, published-only student visibility, admin draft visibility, local fallback, and empty question bank behavior.
- Blockers: None in this scope.
- Next recommended step: Final integrator should run browser smoke tests for local invite signup, class enrollment, admin content visibility, and Supabase-backed production flows once schema/dashboard setup is available.

### 2026-05-14 - Codex - Milestones 1-5 Integration

- Status: Complete for code integration. Live Supabase/Vercel smoke testing remains owner-run because it requires dashboard/deployment access.
- Files changed: Integrated invite-only auth, content publishing, class management, Supabase schema/RLS, operation docs, and tests across `src/app`, `src/data`, `src/domain`, `tests`, `supabase`, `docs/operations`, and `.ai`.
- Verification: Ran `npm run validate:content`, `npm test` (80 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported CRLF warnings only. Browser smoke confirmed local admin navigation, Classes, invite creation, Content Manager publish controls, and unique invite-code labeling.
- Decisions made: Production signup remains invite-only with server-side Supabase enforcement. Students can read only published questions. First admin bootstrap is through an owner-created one-time admin invite. The `question-images` bucket and media metadata are provisioned, but production image upload wiring remains a future task.
- QA fixes: Fixed Manage Content horizontal overflow hardening, added `role="alert"` to Content Manager validation errors, and renamed the invite heading to avoid accessible-label ambiguity. Final QA confirmed no document-level horizontal overflow at desktop `1440px` or mobile `390px`; mobile `.mode-tabs` remains the only intentional horizontal scroller.
- Blockers: Owner still needs to run `supabase/schema.sql`, create/bootstrap the admin invite, configure Vercel env vars, deploy, connect `studyprecalc.com`, and run the cloud smoke tests in `docs/operations/supabase-setup.md`.

### 2026-05-14 - Codex + Agents - M6 Production Activation

- Status: Complete for repo-side M6 tooling and handoff. Live production activation remains owner-run in Supabase/Vercel.
- Files changed: Added `.github/workflows/ci.yml`, `docs/operations/production-activation.md`, `scripts/smoke-supabase.ts`, and `tests/unit/supabaseSmoke.test.ts`; updated production docs, `package.json`, `scripts/README.md`, `src/data/supabase/inviteStore.ts`, `tests/unit/supabaseInviteMapping.test.ts`, `supabase/schema.sql`, and coordination files.
- Verification: Ran `npm run validate:content`, `npm test` (87 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported only a CRLF warning for `supabase/schema.sql`.
- Live smoke: Ran `npm run smoke:supabase`; it failed because the configured Supabase project does not yet expose `public.validate_invite` or `public.questions`, confirming `supabase/schema.sql` still needs to be applied/refreshed in the dashboard.
- Security fixes: Supabase invite inserts now omit browser-local IDs so Postgres can generate UUIDs; first-admin bootstrap docs now generate high-entropy short-lived invite codes; existing-owner recovery now inserts/updates profiles from `auth.users`; SVG Storage uploads are disabled for launch.
- Next step: Owner runs the M6 checklist in `docs/operations/production-activation.md`, starting with applying `supabase/schema.sql`, then reruns `npm run smoke:supabase`.

### 2026-05-14 - Codex + Agents - M7 Cloud Image Storage

- Status: Complete for repo-side cloud image storage. Live production image smoke testing still requires the owner to apply `supabase/schema.sql` in Supabase and sign in with a real admin account.
- Files changed: Added `src/data/supabase/mediaStore.ts` and `tests/unit/supabaseMediaStore.test.ts`; updated `src/app/App.tsx`, `src/app/components/ContentManager.tsx`, `src/app/components/QuestionAssetGallery.tsx`, `src/data/schemas/questionSchema.ts`, `src/data/supabase/questionContentStore.ts`, content-store/schema tests, Supabase/deployment/product docs, planning, and coordination files.
- Verification: Ran targeted `npm test -- questionContentStore questionSchema supabaseMediaStore`, `npm test` (101 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported CRLF warnings only.
- Browser check: Reloaded `http://127.0.0.1:5173` in the in-app browser and confirmed the app sign-in surface renders. Automated local-admin login could not complete because the in-app browser automation failed on the email input; no source issue was found by tests/build.
- Decisions made: Question JSON stores stable `supabase-image:<storage_path>` references, not signed URLs. Rendering resolves short-lived signed URLs from the private `question-images` bucket. Cloud-published questions now reject browser-local images and videos.
- Next step: Owner applies `supabase/schema.sql`, signs in with a real Supabase admin, uploads an original PNG/JPEG/WebP/GIF under 1 MB, publishes it, and follows the Cloud Image Storage Smoke Test in `docs/operations/supabase-setup.md`.

### 2026-05-14 - Codex + Agents - M8 Live Cloud Activation Preflight

- Status: Complete for repo-side M8 preflight. Live activation remains owner-run because Supabase SQL, Vercel deploy, production admin/student accounts, and DNS are dashboard-controlled.
- Files changed: Updated `scripts/smoke-supabase.ts`, `tests/unit/supabaseSmoke.test.ts`, `src/data/supabase/mediaStore.ts`, `tests/unit/supabaseMediaStore.test.ts`, production/Supabase/deployment runbooks, milestone docs, and coordination files.
- Verification: Ran `npm test -- supabaseSmoke supabaseMediaStore`, targeted ESLint for the smoke/media files, `npm run validate:content`, `npm test` (104 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported CRLF warnings only.
- Live smoke: Ran `npm run smoke:supabase`; it correctly failed current production-readiness checks because the configured Supabase project has not yet applied the required SQL/bucket setup. Failing checks included `validate_invite RPC`, `anon unpublished content access`, and `question-images bucket`.
- Decisions made: The default smoke remains read-only. `SMOKE_WRITE=1` opts into a generated-image write smoke that uploads, publishes, checks signed URL behavior, archives, verifies student denial after archive when student credentials are provided, and cleans up. Supabase image upload now removes the Storage object if metadata insert fails.
- Next step: Owner applies `supabase/schema.sql`, bootstraps real admin/student smoke accounts, configures/redeploys Vercel, then reruns `npm run smoke:supabase` and the M8 browser smoke checklist.

### 2026-05-14 - Codex - Review of Claude Homepage/Audit Work

- Status: Complete for documentation only. No source fixes were made.
- Files changed: Added `docs/reviews/2026-05-14-codex-response-to-claude-review.md`; updated `docs/INDEX.md`, `.ai/status.md`, and `.ai/handoff-log.md`.
- Verification: Ran `npx prettier --write` on the new review/index/coordination files and `git diff --check`.
- Decisions made: Agreed that Claude's homepage auth routing is sound. Flagged homepage keyboard focus, incomplete ARIA tab usage, and misleading empty-bank content claims. Agreed with most Claude audit findings, downgraded several severities, and disagreed with the profile-role update finding because column-level grants prevent browser clients from updating `role`.
- Next step: If fixing the audit findings, start with logout, content-write ordering, media-link sync safety, focus-visible styles, incomplete tab roles, and homepage copy.

### 2026-05-14 - Agent E / Codex - REVIEW-001C

- Status: Complete for persistence error visibility and revoked invite auditability.
- Files changed: Updated `src/data/supabase/attemptStore.ts`, `src/data/supabase/sessionStore.ts`, `src/data/supabase/inviteStore.ts`, `src/domain/invites/*`, `src/app/components/AdminClassManager.tsx`, `tests/unit/inviteDomain.test.ts`, and `tests/unit/supabaseInviteMapping.test.ts`; updated coordination files.
- Verification: Ran `npm test -- invite`, `npm test -- supabaseInviteMapping supabaseMapping`, `npx tsc --noEmit --pretty false`, scoped ESLint for invite/persistence files, `npm test` (110 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported existing CRLF warnings only.
- Decisions made: Kept attempt/session save/remove/clear APIs synchronous and optimistic, but now async Supabase write/delete failures are captured in each store's existing `lastError`. Revoked invites now stay in domain/admin records with `revokedAt`, validate as unavailable with a `revoked` status, and remain visible in the admin invite audit list.
- Blockers: None in Agent E scope.

### 2026-05-14 - Codex + Six Agents - REVIEW-001 Execution

- Status: Complete. All six review-fix agents have been integrated.
- Files changed: Updated homepage files, account/session/math components, Supabase account/content/attempt/session/invite stores, invite domain types, admin class invite UI, review docs, repo hygiene, and related tests.
- Verification: Ran `npm run validate:content`, `npm test` (110 tests), `npm run lint`, `npm run build`, confirmed `http://127.0.0.1:5173/` returns HTTP 200, and ran `git diff --check`. All passed; diff check reported existing CRLF warnings only.
- Decisions made: Preserved Claude's homepage direction while making the marketing copy honest for an empty starter bank. Kept `.claude/` ignored. Surfaced cloud persistence failures through existing store `lastError` paths instead of changing persistence API shapes during this hardening pass.
- Next recommended step: Owner applies the Supabase SQL/bucket setup and redeploys through Vercel so live cloud smoke tests can run against `studyprecalc.com`.

### 2026-05-14 - Agent MFA-5 / Codex - AUTH-007 Docs

- Status: Complete for owner docs and ADR scope.
- Files changed: Added `docs/decisions/0010-admin-mfa-enforcement.md`; updated `docs/operations/deployment.md`, `docs/operations/production-activation.md`, `docs/operations/supabase-setup.md`, `docs/INDEX.md`, `.ai/messages/from-codex.md`, and coordination status.
- Verification: Ran `npx prettier --write` on the touched docs, scoped `npx prettier --check`, and scoped `git diff --check`. All passed.
- Decisions made: Documented production admin-only TOTP MFA with frontend gating plus Supabase RLS/Storage `aal2` enforcement, preserved local dev admin MFA bypass for browser-local work, and documented `SMOKE_ADMIN_MFA_CODE` for admin smoke checks.
- Next recommended step: Final AUTH-007 integration should verify the implemented UI, RLS, and smoke script behavior match ADR 0010.

### 2026-05-14 - Agent MFA-3 - AUTH-007

- Status: Complete for Supabase RLS/AAL2 enforcement.
- Files changed: Updated `supabase/schema.sql` and `supabase/README.md`; coordination status/handoff files only.
- Verification: Ran scoped `rg` checks for Supabase admin/MFA helpers and `git diff --check -- supabase/schema.sql supabase/README.md`. Checks passed; diff check reported CRLF warnings only for the touched Supabase files.
- Decisions made: Added `public.has_admin_role()` as the role-only helper and made `public.is_admin()` require both an admin profile and `auth.jwt()->>'aal' = 'aal2'`, so existing admin RLS/storage policies now require MFA while user-owned attempt/session policies remain unchanged for normal users.
- Next recommended step: Apply `supabase/schema.sql` in Supabase after the MFA UI/smoke work lands, then verify real admin actions with and without an `aal2` session.

### 2026-05-14 - Agent MFA-4 - AUTH-007

- Status: Complete for Supabase smoke admin MFA support.
- Files changed: Updated `scripts/smoke-supabase.ts` and `tests/unit/supabaseSmoke.test.ts`; coordination status/handoff files only.
- Verification: Ran `npm test -- supabaseSmoke`, `npx prettier --check scripts/smoke-supabase.ts tests/unit/supabaseSmoke.test.ts`, scoped `npx eslint scripts/smoke-supabase.ts tests/unit/supabaseSmoke.test.ts`, and scoped `npx tsc --noEmit --pretty false ... scripts/smoke-supabase.ts tests/unit/supabaseSmoke.test.ts`. All passed. Repo-wide `npx tsc --noEmit --pretty false` is currently blocked by concurrent `tests/unit/supabaseAdminMfaStore.test.ts` typing work outside MFA-4 scope.
- Decisions made: `SMOKE_ADMIN_MFA_CODE` is optional and only used when the signed-in admin has a verified TOTP factor and the current session is not `aal2`. Admins without verified TOTP factors keep the early-setup smoke path. Missing MFA code now returns a clear failing smoke result so admin login reports the MFA requirement and write smoke cannot silently proceed with an `aal1` admin session.
- Next recommended step: After the full AUTH-007 integration lands and Supabase SQL is applied, rerun `SMOKE_WRITE=1 npm run smoke:supabase` with real admin credentials plus a current TOTP code.

### 2026-05-15 - Agent MFA-2 - AUTH-007

- Status: Complete for admin MFA UI component scope.
- Files changed: Added `src/app/components/AdminMfaGate.tsx` and `src/app/styles/admin-mfa.css`; updated coordination status/handoff files only.
- Verification: Ran `npx prettier --write src/app/components/AdminMfaGate.tsx src/app/styles/admin-mfa.css`, `npx eslint src/app/components/AdminMfaGate.tsx`, targeted `npx tsc --noEmit ... src/app/components/AdminMfaGate.tsx`, and scoped `git diff --check -- src/app/components/AdminMfaGate.tsx src/app/styles/admin-mfa.css`. All passed.
- Decisions made: Kept the component reusable and App-wiring ready with generic `requirement` and `enrollment` data plus `startEnrollment`, `verifyEnrollment`, `verifyChallenge`, `refresh`, and `clearError` callbacks. The UI covers loading, setup, challenge, verified, notice, and alert states without touching App or main.
- Next recommended step: Integrator wires `AdminMfaGate` into the admin route/gate after the MFA store contract settles.

### 2026-05-15 - Agent MFA-1 - AUTH-007

- Status: Complete for Supabase admin MFA data store scope.
- Files changed: Added `src/data/supabase/adminMfaStore.ts` and `tests/unit/supabaseAdminMfaStore.test.ts`; updated coordination status/handoff files only.
- Verification: Ran `npm test -- supabaseAdminMfaStore`, scoped ESLint for the MFA store/test files, `npx tsc --noEmit --pretty false`, and scoped Prettier check. All passed.
- Decisions made: Exposed pure MFA helpers for code normalization, preferred TOTP factor selection, and admin requirement derivation. Added a mockable store helper around `supabase.auth.mfa.listFactors`, `getAuthenticatorAssuranceLevel`, `enroll`, and `challengeAndVerify`, plus a React hook with `lastError` and `clearLastError` that remains inert when Supabase MFA is unavailable.
- Next recommended step: Integrator wires `useSupabaseAdminMfaStore` to `AdminMfaGate` and admin gating.

### 2026-05-15 - Codex + Agents - AUTH-007

- Status: Complete for repo-side admin 2FA/MFA enforcement. Live verification still requires applying `supabase/schema.sql`, redeploying, and signing in with a real Supabase admin.
- Files changed: Added Supabase admin MFA store/tests, admin MFA gate UI/CSS, ADR 0010, smoke-script MFA support, and admin MFA docs. Updated `src/app/App.tsx`, Supabase schema/RLS/Storage policies, Supabase README, deployment/activation runbooks, task board, status, and messages.
- Verification: Ran targeted `npm test -- supabaseAdminMfaStore supabaseSmoke`, targeted ESLint and TypeScript, `npm run validate:content`, `npm test` (120 tests), `npm run lint`, `npm run build`, and browser-opened `http://127.0.0.1:5173/` to confirm the home/sign-in surface. Browser form automation could not type into the email field due the existing browser plugin issue.
- Decisions made: Production admin authorization now means `profiles.role = 'admin'` plus Supabase Auth `aal2`; `public.has_admin_role()` remains role-only for diagnostics, while `public.is_admin()` enforces role plus MFA. Cloud admin tabs/actions are gated by `AdminMfaGate`; local dev admin bypass remains local-only.
- Next recommended step: Owner applies the updated SQL, logs in as the real admin, completes the TOTP gate, sets `SMOKE_ADMIN_MFA_CODE` when running smoke checks, and redeploys Vercel.

### 2026-05-15 - Codex - AUTH-008

- Status: Complete for repo-side signup email-code verification. Live email delivery still requires Supabase Auth email confirmation enabled and the Confirm Signup template configured with `{{ .Token }}`.
- Files changed: Updated `src/data/supabase/accountStore.ts`, `src/app/components/AccountAuth.tsx`, `src/app/App.tsx`, `tests/unit/supabaseAccountStore.test.ts`, `README.md`, `docs/operations/supabase-setup.md`, `docs/operations/production-activation.md`, `docs/operations/deployment.md`, and coordination files.
- Verification: Ran `npm test -- supabaseAccountStore`, targeted ESLint for auth files, `npx tsc --noEmit --pretty false`, `npm run validate:content`, `npm test` (124 tests), `npm run lint`, and `npm run build`. All passed.
- Decisions made: Preserved invite-only signup. The verification step appears only after an accepted invite and a Supabase signup result that requires email confirmation; resend uses Supabase's signup resend endpoint.
- Next recommended step: In Supabase, enable email confirmation and edit Auth -> Email Templates -> Confirm signup so the email visibly includes the `{{ .Token }}` six-digit code, then test one invite signup.

### 2026-05-15 - Codex - AUTH-009

- Status: Complete for pre-signup invite validation. Random non-empty invite codes no longer unlock the account creation form.
- Files changed: Updated `src/app/components/AccountAuth.tsx`, `src/app/App.tsx`, `src/data/supabase/inviteStore.ts`, `tests/unit/supabaseInviteMapping.test.ts`, and coordination files.
- Verification: Ran `npm test -- supabaseInviteMapping localInviteStore`, targeted ESLint for auth/invite files, `npx tsc --noEmit --pretty false`, `npm run validate:content`, `npm test` (127 tests), `npm run lint`, and `npm run build`. All passed.
- Decisions made: The invite unlock screen now asks for email plus invite code so email-bound invites can be checked before the account form opens. Supabase pre-validation uses the public `validate_invite` RPC; the final database trigger remains the source of truth during signup.
- Browser note: DOM smoke confirmed the invite screen has Email and Invite Code before unlock. Browser automation could not submit the form because the plugin still cannot type into `type=email` inputs.

### 2026-05-15 - Agent M10-2 - Media/Image Workflow Coverage

- Status: Complete for scoped media/image workflow tests.
- Files changed: Updated `tests/unit/questionContentStore.test.ts`,
  `tests/unit/supabaseMediaStore.test.ts`, and coordination status. Existing concurrent
  lifecycle-test edits in `tests/unit/questionContentStore.test.ts` were preserved.
- Coverage added: Browser-local prompt images, explanation images, and local videos now all reject
  cloud publish before a question row write; cloud image link sync now covers missing
  `media_records` metadata before `question_media` upsert; signed URL creation now rejects
  browser-local references before Storage calls and surfaces Storage signing errors.
- Verification: Ran `npm test -- questionContentStore supabaseMediaStore`, `npm test` (134 tests),
  scoped `npx prettier --check` and `npx eslint` for the touched tests, and
  `npx tsc --noEmit --pretty false`. All passed.

### 2026-05-15 - Agent M10-4 / Codex - M9/M10 Owner Handoff

- Status: Complete for owner activation and admin content QA handoff docs.
- Files changed: Added `docs/operations/m9-m10-owner-handoff.md`; updated `docs/operations/production-activation.md`, `docs/INDEX.md`, `.ai/messages/from-codex.md`, `.ai/status.md`, and this handoff log.
- Verification: Ran scoped Prettier and diff checks for the touched docs/coordination files. All passed.
- Decisions made: Kept the M9/M10 handoff as a concise evidence and blocker checklist that points to the detailed M8 runbooks instead of duplicating them.
- Blockers: Live Supabase, Vercel, registrar, inbox, production admin, and student smoke evidence still requires owner dashboard access and real production credentials.
- Next recommended step: Owner uses the handoff to gather the launch evidence packet, complete dashboard-only setup, and rerun the Supabase/content smoke checks.

### 2026-05-15 - Agent M10-1 - CONTENT-007

- Status: Complete for content lifecycle coverage.
- Files changed: Updated `tests/unit/questionContentStore.test.ts` for draft -> publish -> archive, student-visible published-only reads, update persistence, and local fallback lifecycle coverage. Updated `src/domain/questions/contentRecords.ts` with the minimal persistence fix needed after the new test exposed reloaded records resetting explicit lifecycle timestamps.
- Verification: Ran `npm test -- questionContentStore`, `npx vitest run tests/unit/questionContentStore.test.ts tests/unit/publication.test.ts`, targeted `npx eslint src/domain/questions/contentRecords.ts tests/unit/questionContentStore.test.ts`, targeted `npx prettier --check src/domain/questions/contentRecords.ts tests/unit/questionContentStore.test.ts`, `npm test` (134 tests), `npm run lint`, and `npm run build`. All passed.
- Decisions made: Preserved explicit `publishedAt` and `archivedAt` when reconstructing content records so editing a published question and reloading local storage does not move the original publish timestamp.
- Notes: `tests/unit/questionContentStore.test.ts` also contains concurrent media workflow additions from another M10 scope; those were left in place.

### 2026-05-15 - Agent M10-3 - CONTENT-007

- Status: Complete for admin content UI/browser QA. No blocking UI bugs found.
- Files changed: `.ai/status.md` and `.ai/handoff-log.md` coordination only; no changes to `src/app/components/ContentManager.tsx` or `src/app/styles/app.css`.
- Verification: Ran a headless Chrome local-admin smoke against Vite for Manage Content: original MCQ and FRQ creation, image-capable prompt/solution fields with local PNG upload, Save Draft, Publish, Archive, and archived-question hiding from Practice. Also ran `npx eslint src/app/components/ContentManager.tsx`, `npm test -- publication questionContentStore` (28 tests), `npm run validate:content`, and `npm run build`. All passed.
- Decisions made: No scoped source fix was needed.
- Next recommended step: Continue CONTENT-007 owner/live cloud checks with real Supabase admin/student accounts after the owner applies the production SQL and bucket setup.

### 2026-05-15 - Codex + Six Agents - M9/M10 Execution

- Status: Repo-side M9/M10 execution complete. M10 passed locally. M9 production activation is blocked by owner-side Supabase/DNS setup.
- Files changed: Added `docs/operations/m9-m10-owner-handoff.md`; updated production activation docs, docs index, content lifecycle logic, content/media tests, and coordination files.
- Verification: Agents and Codex ran Supabase smoke, DNS/HTTP checks, local/admin content QA, targeted tests, full tests, lint, TypeScript/build checks, and content validation. Final integrated verification is recorded in `.ai/status.md`.
- Production findings: `https://studyprecalc.com` returns HTTP 200 from Vercel. `www.studyprecalc.com` does not resolve. `npm run smoke:supabase` fails because `public.validate_invite`, `public.questions`, and the `question-images` bucket are missing; `media_records` and `question_media` are queryable.
- Decisions made: Preserve explicit content lifecycle timestamps on reload/edit, block cloud publication when media metadata is missing before `question_media` linkage, and keep owner-only launch evidence in a short handoff that links to detailed runbooks.
- Next recommended step: Owner runs `supabase/schema.sql`, configures/validates the `question-images` bucket and Auth email template, optionally configures `www`, then reruns `npm run smoke:supabase` and live admin/student content smoke.

### 2026-05-15 - Codex + Six Agents - M11/M16 Execution

- Status: Repo-side M11-M16 execution complete. M12-M16 are implemented and verified. M11 production activation remains blocked on owner-side Supabase SQL/bucket/admin/student setup and optional `www` DNS.
- Files changed: Updated Supabase smoke guidance and activation docs; improved `ContentManager`, student practice components, class management, dashboard analytics, and shared app styles; added AI grading domain/data foundation, ADR/product docs, and focused unit/accessibility tests.
- Verification: Ran `npm test` (151 tests), `npm run lint`, `npm run build`, `npm run validate:content`, `git diff --check`, `npm test -- aiGrading` (9 tests), `npm run smoke:supabase`, and local dev server HTTP smoke at `http://127.0.0.1:5173/`.
- Production findings: `npm run smoke:supabase` now prints `Next owner action(s):` and still fails as expected until the owner runs `supabase/schema.sql`, confirms the private `question-images` bucket, and creates real admin/student smoke accounts. `www.studyprecalc.com` still needs DNS/Vercel setup if desired.
- Decisions made: Keep AI FRQ grading disabled by default and provider-neutral; require explicit Gemini model configuration before enabling; no external AI API calls or browser-exposed provider keys were added.
- Browser note: Bundled Playwright automation was unavailable because the local runtime package is missing `playwright-core`; unit accessibility coverage, build checks, and HTTP smoke passed.
- Next recommended step: Owner completes the Supabase/DNS/account activation blockers, then continue with live admin/student smoke and question authoring only when the owner is ready to add original content.

### 2026-05-15 - Codex + Agents - M17/M18 Execution

- Status: Repo-side M17/M18 support complete. M17 production activation remains blocked on owner-side Supabase SQL/bucket/account setup and optional `www` DNS. M18 live-smoke support is ready for the owner to run manually after activation.
- Files changed: Added `scripts/check-production-readiness.ts`, `scripts/live-smoke-checklist.ts`, tests for both scripts, integration-harness coverage for live-smoke expectations, package scripts, and updated owner runbooks/docs.
- Verification: Ran `npm test` (167 tests), `npm run lint`, `npm run build`, `npm run validate:content`, `git diff --check`, `npm run check:production-readiness`, optional `www` readiness check, `npm run smoke:live-checklist -- --base-url https://studyprecalc.com --run-label "M18 integrated smoke" --no-cleanup`, targeted M17/M18 tests, and `npm run smoke:supabase`.
- Production findings: `studyprecalc.com` passes env/DNS/HTTPS readiness. `www.studyprecalc.com` fails when explicitly checked because no DNS exists. `npm run smoke:supabase` still fails on missing `public.validate_invite`, missing/inaccessible `public.questions`, and missing `question-images` bucket.
- Decisions made: Keep live smoke as a manual evidence checklist rather than browser automation, because production account creation, email inboxes, MFA, and smoke content require owner-controlled access and evidence.
- Next recommended step: Owner runs `supabase/schema.sql`, verifies the Storage bucket/Auth settings, creates real admin/student smoke accounts, optionally configures `www`, then runs `npm run smoke:supabase`, `npm run check:production-readiness`, and `npm run smoke:live-checklist`.

### 2026-05-15 - Codex + Six Agents - M19/M20 Execution

- Status: Repo-side M19/M20 execution complete.
- Files changed: Added admin draft autosave helpers, content readiness domain helpers, Content Manager draft/destructive/readiness UI, student mobile CSS polish, Session Practice UX improvements, FRQ self-score/reveal improvements, and focused unit/accessibility tests.
- Verification: Ran `npm run lint`, `npm test` (182 tests), `npm run validate:content`, `git diff --check`, `npm run build`, and an HTTP smoke for `http://127.0.0.1:5173/`. All passed; build still prints the existing large-chunk warning.
- Decisions made: Keep autosave browser-local for admin authoring safety, require explicit typed confirmation for permanent question deletion, and keep FRQ sample/expected-work reveal behind self-score controls rather than exposing it before submission.
- Next recommended step: Continue with M21/M22 for admin AI configuration, Gemini proxy planning, student AI placeholders, import templates, content QA dashboard, and first-pack launch checklist.

### 2026-05-15 - Codex + Six Agents - M21/M22 Execution

- Status: Repo-side M21/M22 execution complete.
- Files changed: Added `AdminAiSettings`, `FrqAiFeedbackPlaceholder`, first-pack readiness tooling, original question-pack templates, Gemini proxy docs, launch QA dashboard helpers/UI, content import docs, and focused unit tests.
- Verification: Ran `npm run lint`, `npm test` (196 tests), `npm run validate:content`, `npm run check:first-pack -- --help`, `npm run check:first-pack`, `git diff --check`, `npm run build`, an expected-failure template placeholder check, and an HTTP smoke for `http://127.0.0.1:5173/`.
- Expected failures: `npm run check:first-pack` fails on the intentionally empty starter bank until owner-authored questions are added. The template placeholder check fails while `OWNER_TODO` fields remain, which is now intentional launch-blocking behavior.
- Decisions made: Keep live AI grading behind a future server-side Gemini proxy; expose admin/student AI surfaces as status/placeholder only; block first-pack launch when template placeholders remain.
- Next recommended step: Owner writes original questions in the no-code manager or template, replaces every placeholder, runs `npm run check:first-pack -- <pack>`, publishes, then reruns with `--require-published`.

### 2026-05-15 - Codex - HOME-002 Homepage Design-System Refresh

- Status: Complete.
- Files changed: Updated `src/app/components/Home.tsx`, `src/app/styles/home.css`, and coordination files.
- Summary: Applied the owner-provided Study Precalc Design System homepage refresh with a plotted math hero background, AP-style hero question preview, refreshed unit mini-plots, "Why us" nav copy, and mobile wrapping/overflow hardening.
- Verification: Ran `npm run lint`, `npm test` (196 tests), `npm run validate:content`, `npm run build`, `git diff --check`, an HTTP smoke for `http://127.0.0.1:5173/`, and a Chrome DevTools Protocol mobile viewport check at 390px with document/body scroll width equal to viewport width. All passed; Vite still prints the existing large-chunk warning.

### 2026-05-15 - Codex - Exam-Mode Roadmap Update

- Status: Complete.
- Files changed: Updated `docs/planning/milestones.md`, `docs/product/app-vision.md`, `.ai/task-board.md`, `.ai/status.md`, and this handoff log.
- Summary: Added M25 Exam Modes with unit practice exams for Units 1-4 and AP prep exams that intentionally include Units 1-3 only. Added EXAM-001 and EXAM-002 backlog items.
- Verification: Ran targeted Prettier and `git diff --check` for the touched docs/coordination files.

### 2026-05-15 - Codex - AUTH-010 Invite Code Format

- Status: Complete.
- Files changed: Updated invite-code domain validation/generation, local and Supabase invite stores, sign-up invite input copy/length, Supabase schema/docs/bootstrap SQL, smoke defaults, and invite/integration tests.
- Summary: Invite codes are now exactly 12 characters and generated with at least one letter, one number, and one safe symbol from `! @ # $ % * ?`. Production bootstrap docs now generate a one-time admin invite instead of using a predictable hand-written code.
- Verification: Ran `npm test -- inviteDomain localInviteStore supabaseInviteMapping integrationHarness`, `npm test` (197 tests), `npm run lint`, `npm run build`, `npm run validate:content`, and `git diff --check`. All passed; `git diff --check` reported the existing CRLF warning for `supabase/schema.sql` only.

### 2026-05-15 - Codex - AUTH-011 Confirm Password

- Status: Complete.
- Files changed: Updated `AccountAuth` signup UI, added `accountAuthValidation`, added focused account-auth validation tests, and updated coordination files.
- Summary: Invite-unlocked signup now requires a Confirm Password field and blocks account creation with `Passwords do not match.` before calling the auth backend.
- Verification: Ran `npm test -- accountAuth supabaseAccountStore localAccountStore`, `npm run lint`, `npm test` (199 tests), `npm run build`, `npm run validate:content`, and `git diff --check`. All passed; build still reports the existing large-chunk warning.

### 2026-05-15 - Codex - DESIGN-001 Dashboard/Review Design

- Status: Complete.
- Files changed: Updated `src/app/components/StudentDashboard.tsx`, `src/app/components/AttemptReview.tsx`, `src/app/styles/app.css`, and coordination files.
- Summary: Fetched and read the Claude Design bundle/readme/chats, then implemented the relevant current direction: a coordinate-plane student dashboard with visual stat cards, unit mini-plots, recommended-session preview, weak-topic rows, and compact session history; plus a denser attempt review screen with summary cards, type/unit/search filters, score states, prompt context, and response previews. Homepage scope was intentionally left unchanged because the design notes already marked it as mostly good after HOME-002.
- Verification: Ran `npm run lint`, `npx tsc --noEmit --pretty false`, `npm test` (199 tests), `npm run build`, `npm run validate:content`, `git diff --check`, and an HTTP smoke for `http://127.0.0.1:5173/`. All passed; build still reports the existing large-chunk warning. Browser/CDP automation was unavailable because no local debugging target responded.

### 2026-05-15 - Codex - PROD-010 Supabase Progress Grants

- Status: Complete.
- Files changed: Updated `supabase/schema.sql`, `scripts/smoke-supabase.ts`, `tests/unit/supabaseSmoke.test.ts`, `docs/operations/supabase-setup.md`, and coordination files.
- Summary: Added explicit `anon`/`authenticated` Data API grants so RLS-backed tables are reachable through Supabase PostgREST. The immediate production repair is to grant `authenticated` `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `public.attempts` and `public.session_results`; the schema now also covers content, class, invite, and media tables explicitly so this class of permission error does not recur.
- Verification: Ran `npm test -- supabaseSmoke`, `npx tsc --noEmit --pretty false`, `npm run lint`, `npm test` (200 tests), `npm run build`, `npm run validate:content`, and `git diff --check`. All passed; build still reports the existing large-chunk warning. Prettier was run for touched docs/TS files; `.sql` has no configured Prettier parser.
- Next owner action: Run the latest `supabase/schema.sql` in the Supabase SQL Editor, or run the smaller repair SQL listed in `docs/operations/supabase-setup.md`, then refresh the app and retry saving progress.

### 2026-05-15 - Worker M27 - Dashboard Analytics Expansion

- Status: Complete.
- Files changed: Updated `src/domain/sessions/dashboardAnalytics.ts`, `tests/unit/sessionResult.test.ts`, `docs/product/app-vision.md`, and coordination files.
- Summary: Added retry-set metadata and progress-readiness counts to dashboard analytics so future student/class dashboards can distinguish scored progress, pending FRQ self-score work, recent retry needs, and practiced question coverage without UI changes.
- Verification: Ran `npm test -- sessionResult`, scoped ESLint, scoped Prettier check, and scoped TypeScript for the touched analytics/test files. All passed. Repo-wide `npx tsc --noEmit --pretty false` is currently blocked by active Worker M26 work in `src/domain/questions/contentReadiness.ts(670,9)`.

### 2026-05-15 - Worker M23 - Supabase Activation Hardening

- Status: Complete.
- Files changed: Updated `scripts/smoke-supabase.ts`, `tests/unit/supabaseSmoke.test.ts`, `docs/operations/supabase-setup.md`, `docs/operations/production-activation.md`, and coordination files.
- Summary: Added an opt-in student progress write smoke. With `SMOKE_WRITE=1` and real student credentials, `npm run smoke:supabase` now inserts, updates, selects, deletes, and cleanup-verifies generated temporary rows in `public.attempts` and `public.session_results`, in addition to the existing read checks and cloud image path.
- Verification: Ran `npm test -- supabaseSmoke`, scoped ESLint, scoped Prettier check, and `npx tsc --noEmit --pretty false`. All passed.
- Next owner action: After applying the latest Supabase SQL and creating real smoke accounts, rerun `SMOKE_WRITE=1` with admin MFA and student credentials and keep the `[PASS] student progress write path` output with activation evidence.

### 2026-05-15 - Worker M25-Domain - Exam Mode Domain Foundation

- Status: Complete.
- Files changed: Added `src/domain/exams/*`, added `tests/unit/examDomain.test.ts`, and updated `docs/product/question-model.md`.
- Summary: Defined exam unit metadata, Unit 1-4 practice exam blueprints, the Units 1-3 AP prep blueprint, published-question readiness/count helpers, deterministic selection hooks, timed/untimed duration metadata, and score summary helpers.
- Verification: Ran `npm test -- examDomain`, scoped ESLint, scoped Prettier check, scoped TypeScript, repo-wide `npx tsc --noEmit --pretty false`, and `npm test` (215 tests). All passed.

### 2026-05-15 - Worker M28 - Launch Prep Hardening

- Status: Complete.
- Files changed: Updated `scripts/check-production-readiness.ts`, `tests/unit/productionReadiness.test.ts`, `docs/operations/deployment.md`, `docs/operations/production-activation.md`, and coordination files.
- Summary: Added final launch readiness gates for owner-confirmed Supabase activation evidence, private `question-images` bucket evidence, backup/export planning, current production blockers, localhost Supabase URL rejection, and explicit `www` optionality.
- Verification: Ran `npm test -- productionReadiness`, scoped Prettier check, scoped ESLint, normal `npm run check:production-readiness` expected-failure blocker output, and a success-path `npm run check:production-readiness` with `READINESS_SUPABASE_EVIDENCE`, `READINESS_BUCKET_EVIDENCE`, `READINESS_BACKUP_EXPORT_PLAN`, and `READINESS_PRODUCTION_BLOCKERS` set.
- Next owner action: Capture the Supabase SQL/RPC/progress smoke, Auth/MFA, bucket, student visibility, backup/export, and rollback evidence; then rerun `npm run check:production-readiness` with the documented `READINESS_*` confirmations and include `READINESS_WWW_DOMAIN` only if `www` is part of launch acceptance.

### 2026-05-15 - Worker M24 - Repeatable Admin Workflow QA

- Status: Complete.
- Files changed: Updated `tests/fixtures/integrationHarness.ts`, `tests/unit/integrationHarness.test.ts`, `scripts/live-smoke-checklist.ts`, `docs/operations/m9-m10-owner-handoff.md`, and coordination files.
- Summary: Added image-bearing integration harness helpers and repeatable local coverage for admin-created class invites, invite consumption/enrollment, draft/publish/archive lifecycle timestamps and visibility, cloud-backed image expectations, and student progress persistence. Strengthened the live smoke checklist and owner handoff so manual runs capture the same class, invite, content, image, and dashboard evidence without using copyrighted or shipped question content.
- Verification: Ran `npm test -- integrationHarness liveSmokeChecklist`, scoped ESLint, and scoped Prettier check. All passed.

### 2026-05-15 - Worker M26 - Content Library Media Readiness Polish

- Status: Complete.
- Files changed: Updated `src/domain/questions/contentReadiness.ts`, `tests/unit/contentReadiness.test.ts`, `docs/product/content-authoring-guide.md`, `docs/operations/first-pack-launch-checklist.md`, and coordination files.
- Summary: Added media-category readiness reporting for prompt/explanation image placement, local media publish blockers, placeholder media URLs, graph/table caption warnings, and external video thumbnail/duration guidance. Left Content Manager and exam UI files untouched.
- Verification: Ran `npm test -- contentReadiness firstPackReadiness`, `npx tsc --noEmit --pretty false`, scoped ESLint for the touched readiness/test files, and scoped Prettier checks. All passed.

### 2026-05-16 - Codex - M23-M28 Integration

- Status: Complete.
- Files changed: Integrated the M23-M28 worker outputs, added `src/app/components/ExamPractice.tsx`, updated `src/app/App.tsx`, `src/app/components/SessionPractice.tsx`, `src/app/styles/app.css`, hardened `scripts/smoke-supabase.ts`, and updated coordination files.
- Summary: Completed the repo-side milestone wave in order: Supabase activation smoke support, repeatable admin workflow QA, Unit 1-4 practice exams, Units 1-3 AP prep exams, content readiness polish, dashboard analytics foundations, and launch readiness hardening. The new Exams tab uses the existing session runner with locked question sets and timed/untimed exam presets.
- Verification: Ran `npm run lint`, `npm test` (215 tests), `npm run build`, `npm run validate:content`, `git diff --check`, `npm run smoke:supabase`, success-path `npm run check:production-readiness` with documented `READINESS_*` confirmations, `npm run smoke:live-checklist -- --base-url https://studyprecalc.com --run-label "M23-M28 post-integration" --no-cleanup`, targeted `npm test -- supabaseSmoke examDomain sessionPractice`, and an HTTP smoke for `http://127.0.0.1:5173/`. Repo checks passed; build still reports the existing large-chunk warning. Live write smoke remains owner-only until real admin/student smoke credentials are provided.

### 2026-05-16 - Codex - DESIGN-002 Notebook Design Refresh

- Status: Complete.
- Files changed: Updated `src/app/styles/tokens.css`, `src/app/styles/app.css`, `src/app/styles/home.css`, and coordination files.
- Summary: Read `Study Precalc Design System (3).zip` and translated the notebook visual language into the real app: paper textures, red margin rules, taped/stamped surfaces, serif headings, typewriter controls, bubble-sheet answer states, and notebook-style cards across the homepage, auth, student dashboard, practice, session, review, and exams. No mock question content from the design bundle was imported.
- Verification: Ran `npm run lint`, `npm test` (215 tests), `npm run build`, `npm run validate:content`, `git diff --check`, an HTTP smoke for `http://127.0.0.1:5173/`, and a Chrome DevTools Protocol mobile check confirming `scrollWidth` equals the 390px viewport. All passed; build still reports the existing large-chunk warning.
