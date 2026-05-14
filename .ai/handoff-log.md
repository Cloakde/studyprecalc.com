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
