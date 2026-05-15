# Agent Status

Last updated: 2026-05-15

## Current Phase

M11-M16 repo-side execution is complete. M12-M16 are implemented and verified. M11 production
activation is still blocked on owner-side Supabase SQL/bucket/account setup and optional `www` DNS
configuration.

## Active Ownership

| Agent | Task | File Scope | Status |
| ----- | ---- | ---------- | ------ |
| None  | -    | -          | Idle   |

## Notes

- The workspace started empty.
- Worker C completed the standalone `VideoExplanation` component and unit tests, scoped to `src/app/components/VideoExplanation.*` and `tests/unit/*video*`.
- Worker B/Codex completed no-code content authoring docs and metadata validation, scoped to `docs/product/*author*`, `docs/product/*taxonomy*`, `scripts/validate-content.ts`, and `tests/unit/*content*`.
- Worker A/Codex completed the attempt persistence data layer only, scoped to `src/data/localAttemptStore.ts`, `src/domain/attempts/*`, and `tests/unit/*attempt*`.
- App target is **web-first/web-only for now**. Desktop is deferred indefinitely and should not drive current architecture.
- Web stack is React + Vite + TypeScript.
- Desktop packaging is a possible far-future revisit, not an active milestone.
- Math rendering uses KaTeX.
- No-code content management is local-first for now. Public website-wide publishing still needs a future backend/CMS.
- Uploaded video explanations are local-first through IndexedDB and use `local-video:<id>` references in question data.
- Uploaded question and solution images are local-first through IndexedDB and use `local-image:<id>` references in asset data.
- Live agent-to-agent notes go in `.ai/messages/`; completed-work entries still go in `.ai/handoff-log.md`.
- Git has been initialized for change tracking.
- Latest bug hunt fixed session state loss across tab switches, timer auto-submit, blank FRQ scoring, FRQ review timestamp drift, stale attempt imports, unsafe attempt imports, custom content overwrite risk, async media attachment races, and invalid media/path schema acceptance.
- Remaining larger follow-ups: richer media library cleanup/export bundles, attempt snapshots for edited questions, clearer review display for skipped FRQ parts, and production backend auth/sync.
- Browser-local accounts now gate the app, scope attempt/session storage by account, and feed the Dashboard tab.
- Grouped session records are separate from individual question attempts and update after FRQ self-scoring.
- Production auth, cloud sync, password reset, and backend account storage remain future work.
- Supabase env vars are configured locally in `.env`; `.env` is ignored by Git.
- Supabase Auth/client adapters are wired into the app with browser-local fallback when env vars are missing.
- `supabase/schema.sql` must be run in the Supabase SQL Editor before cloud attempts/sessions and image storage are fully usable.
- Vercel is the first public deployment target for `studyprecalc.com`; see `vercel.json` and `docs/operations/deployment.md`.
- Public sign-up is currently blocked in the UI for an invite-only beta, but the signup implementation is preserved for later.
- Local development has a dev-only admin login: `admin@studyprecalc.local` / `localadmin`.
- The `Manage Content` tab is now admin-only.
- The bundled starter question bank is intentionally empty. Owner-authored questions should be added through admin content management or future Supabase publishing.
- Agent 4 completed the backend-neutral question content store with local fallback, Supabase mapping, and publication metadata. Agent 7 has since resolved the class-store build blocker.
- Invite-only signup now uses invite codes in local fallback and Supabase signup metadata; production SQL enforces invite consumption server-side.
- Admins can manage classes, create/revoke invites, and enroll students through invite signup.
- Content management supports draft, publish, and archive states, with students seeing published questions only.
- Supabase setup and deployment runbooks are updated for `studyprecalc.com`, including first-admin bootstrap through an owner-created admin invite.
- M6 adds `npm run smoke:supabase`, a production activation checklist, GitHub Actions CI, safer high-entropy admin bootstrap docs, and a fix for Supabase invite inserts omitting browser-local IDs.
- Running `npm run smoke:supabase` against the current configured Supabase project fails because `public.validate_invite` and `public.questions` are not in the schema cache yet; run `supabase/schema.sql` in the Supabase dashboard before expecting that smoke check to pass.
- M7 adds Supabase cloud image uploads for admin-authored question/explanation assets. Cloud images are stored in the private `question-images` bucket, question JSON stores stable `supabase-image:<storage_path>` references, and rendering resolves short-lived signed URLs.
- Cloud publishing now rejects browser-local images/videos so published Supabase content does not point at media that only exists in one browser profile.
- M8 expands `npm run smoke:supabase` with Storage bucket checks, media schema checks, and an opt-in `SMOKE_WRITE=1` cloud image write smoke.
- The write smoke requires real Supabase admin credentials. Add student smoke credentials to verify fresh student signed URL access after publish and denial after archive.
- Supabase image uploads now remove the uploaded Storage object if `media_records` metadata insert fails, reducing orphaned file risk.
- Running `npm run smoke:supabase` against the current configured Supabase project still fails live activation checks because `public.validate_invite`, `public.questions`, and the `question-images` bucket are not all installed yet. Apply `supabase/schema.sql` before expecting those checks to pass.
- Codex documented its agree/disagree response to Claude's homepage work and codebase audit in `docs/reviews/2026-05-14-codex-response-to-claude-review.md`.
- Codex and six agents completed the REVIEW-001 execution pass. `.claude/` local settings are ignored and should not be committed.
- AUTH-007 adds production admin TOTP MFA. Supabase RLS/Storage admin policies now require `public.is_admin()`, which checks both admin role and `auth.jwt()->>'aal' = 'aal2'`; `public.has_admin_role()` is retained for role-only diagnostics.
- Cloud admin tabs/actions stay hidden behind `AdminMfaGate` until the Supabase session reaches `aal2`. The local dev admin bypass is limited to browser-local stores and remains unavailable in production builds.
- AUTH-008 adds Supabase email-code verification after invite-based email/password signup. To send a
  visible code, configure the Supabase Confirm Signup email template with `{{ .Token }}`.
- AUTH-009 validates invite code and email before opening the account creation form. Supabase
  pre-validation uses the public `validate_invite` RPC, while final signup remains enforced by the
  database trigger.
- M9/M10 repo-side execution added an owner handoff, content lifecycle/media coverage, and a
  lifecycle timestamp persistence fix. Production activation cannot fully pass until Supabase has
  `validate_invite`, `questions`, and the `question-images` bucket installed.
- M11-M16 repo-side execution improved Supabase smoke owner guidance, admin content search/filter/
  duplicate/preview workflow, student practice accessibility, class roster/invite management,
  dashboard recommendations, and a disabled-by-default AI FRQ grading foundation.
- AI FRQ grading remains a prototype foundation only. It does not call Gemini or any external API,
  does not expose provider keys in browser code, and remains unavailable unless explicitly
  configured with `VITE_AI_FRQ_GRADING_ENABLED=true`, `VITE_AI_FRQ_PROVIDER=gemini`, and
  `VITE_AI_FRQ_GEMINI_MODEL`.

## Last Verification

2026-05-13: Worker A ran `npm run lint`, `npm test`, and `npm run build`. All passed after adding the local attempt store and attempt helper tests.
2026-05-13: Worker B ran `npm run validate:content`, `npm test`, `npm run lint`, `npm run build`, scoped `npx tsc --noEmit ... scripts/validate-content.ts tests/unit/contentValidation.test.ts`, and scoped `npx prettier --check` for Worker B files. All passed.
2026-05-13: Worker C ran `npm test -- videoExplanation`, `npm test`, `npm run lint`, and targeted `npx tsc --noEmit ... src/app/components/VideoExplanation.tsx tests/unit/videoExplanation.test.ts`.
2026-05-13: Integrated all worker outputs, then ran `npm run validate:content`, `npm test` (20 tests), `npm run build`, and `npm run lint`. All passed. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
2026-05-13: Codex ran `npm run validate:content`, `npm test` (24 tests), `npm run lint`, and `npm run build`. All passed. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
2026-05-13: Codex ran `npm run validate:content`, `npm test` (27 tests), `npm run lint`, and `npm run build`. All passed. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
2026-05-13: Codex ran `npm run build`, `npm run lint`, `npm run validate:content`, and `npm test` (27 tests). All passed.
2026-05-13: Codex ran `npm run validate:content`, `npm test` (30 tests), `npm run lint`, and `npm run build`. All passed. Confirmed Vite dev server at `http://127.0.0.1:5173` returns HTTP 200.
2026-05-13: Codex ran `npm run validate:content`, `npm test` (40 tests), `npm run lint`, and `npm run build`. All passed. Browser QA created a local account, submitted a grouped session, and confirmed the dashboard updated.
2026-05-13: Codex ran `npm run validate:content`, `npm test` (42 tests), `npm run lint`, and `npm run build`. All passed. Browser QA confirmed the app boots in cloud account mode.
2026-05-13: Codex ran `npm run build`, `npm run lint`, `npx prettier --check README.md docs/operations/deployment.md docs/decisions/0008-vercel-first-web-deploy.md docs/INDEX.md docs/planning/milestones.md .ai/status.md .ai/task-board.md vercel.json`, and `git diff --check`. All passed.
2026-05-13: Codex ran `npm run build`, `npm run lint`, and `npm test` (42 tests). All passed. Browser QA confirmed the Sign Up control shows the invite-only alert and keeps the login form visible.
2026-05-13: Codex ran `npm test` (43 tests), `npm run lint`, `npm run build`, and `npm run validate:content`. All passed. Browser QA confirmed local dev admin login shows the Admin badge and Manage Content tab.
2026-05-13: Codex ran `npm run validate:content` (0 questions), `npm test` (43 tests), `npm run lint`, `npm run build`, `npx prettier --check ...`, and `git diff --check`. All passed. Browser QA confirmed Dashboard shows 0 questions, Practice shows the empty state, and Session setup disables start with 0 questions.
2026-05-14: Agent 6 ran `npm test -- publication`, `npm run validate:content`, `npm test` (62 tests), targeted `npx eslint src/domain/questions/publication.ts src/domain/questions/visibility.ts src/data/schemas/questionSchema.ts tests/unit/publication.test.ts`, and targeted `npx prettier --check ...`. All passed. Full `npm run lint` and `npm run build` were attempted but are currently blocked by concurrent App/class/content-store integration errors outside Agent 6 scope.
2026-05-14: Agent 5 ran `npx tsc --noEmit --pretty false --strict --jsx react-jsx --target ES2020 --module ESNext --moduleResolution Bundler --allowSyntheticDefaultImports --esModuleInterop --skipLibCheck --lib DOM,DOM.Iterable,ES2020 --types vite/client,node src/app/components/ContentManager.tsx`, `npm run lint`, `npm test` (62 tests), `npm run validate:content`, and `git diff --check`. All passed. Full `npm run build` is blocked by concurrent integration errors in `src/app/App.tsx` and `src/data/localClassStore.ts` outside Agent 5 scope.
2026-05-14: Agent 3 ran `npx eslint src/app/components/AccountAuth.tsx`, scoped `npx tsc --noEmit ... src/app/components/AccountAuth.tsx`, `npx prettier --check src/app/components/AccountAuth.tsx src/app/styles/app.css`, `npm test` (70 tests), `npm run lint`, and scoped `git diff --check`. All passed. `npm run build` is currently blocked by unrelated active work in `src/app/App.tsx`, `src/data/localClassStore.ts`, and `src/data/supabase/questionContentStore.ts`.
2026-05-14: Agent 2 ran `npm test -- invite` (10 tests), `npm test` (70 tests), `npm run lint`, and scoped `npx prettier --check ...` for invite files. All passed. `npm run build` is currently blocked by `src/data/localClassStore.ts(119,3)` returning a widened `version: string` outside Agent 2 scope.
2026-05-14: Agent 4 ran `npm test -- questionContentStore`, `npx tsc --noEmit --pretty false`, `npm run lint`, `npm test` (70 tests), `npm run build`, and `git diff --check`. Content store tests, lint, full tests, and diff check passed. TypeScript/build are now blocked only by concurrent class-store work in `src/data/localClassStore.ts(119,3)`.
2026-05-14: Wave 2 Agent 11 ran `npx prettier --check README.md docs/operations/deployment.md docs/operations/supabase-setup.md docs/INDEX.md` and `git diff --check -- README.md docs/operations/deployment.md docs/operations/supabase-setup.md docs/INDEX.md .ai/status.md .ai/task-board.md .ai/handoff-log.md`. Formatting and whitespace checks passed; the diff check reported only existing CRLF warnings for `.ai/*` coordination files.
2026-05-14: Agent 7 ran `npm test -- class` (5 tests), `npx tsc --noEmit --pretty false`, scoped `npx prettier --check ...`, `npm test` (80 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported existing CRLF warnings only.
2026-05-14: Agent 8 ran scoped `npx eslint src/app/components/AdminClassManager.tsx`, scoped `npx tsc --noEmit ... src/app/components/AdminClassManager.tsx`, `npx prettier --check src/app/components/AdminClassManager.tsx src/app/styles/app.css`, scoped `git diff --check`, `npm run lint`, `npm test` (80 tests), `npm run build`, and `npm run validate:content`. All passed. Confirmed the Vite dev server at `http://127.0.0.1:5173` returns HTTP 200; in-app browser automation was unavailable because no browser targets were registered.
2026-05-14: Wave 2 Agent 10 ran `npm test -- integrationHarness` (5 tests), `npm test` (80 tests), `npx prettier --check tests/fixtures/integrationHarness.ts tests/unit/integrationHarness.test.ts`, `npx eslint tests/fixtures/integrationHarness.ts tests/unit/integrationHarness.test.ts`, `npm run lint`, `npm run validate:content`, `npm run build`, and scoped `git diff --check`. All passed; diff check reported existing CRLF warnings only.
2026-05-14: Codex integrated milestones 1-5 and ran `npm run validate:content`, `npm test` (80 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported CRLF warnings only. Browser smoke confirmed local admin sees Manage Content and Classes, class/invite creation works, Content Manager draft/publish controls render, and invite code input has a unique accessible label. QA found and Codex fixed Manage Content horizontal overflow hardening and missing Content Manager validation `role="alert"`; final QA confirmed no document-level horizontal overflow at 1440px or 390px.
2026-05-14: Codex completed M6 production activation tooling and ran `npm run validate:content`, `npm test` (87 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported a CRLF warning for `supabase/schema.sql` only. `npm run smoke:supabase` executed and correctly failed live checks because the configured Supabase project has not yet applied `supabase/schema.sql`.
2026-05-14: Codex + agents completed M7 cloud image storage and ran targeted media/content/schema tests, `npm test` (101 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported CRLF warnings only. Browser check confirmed the local app sign-in surface renders at `http://127.0.0.1:5173`; automated admin login was blocked by the in-app browser email input automation issue.
2026-05-14: Codex + agents completed M8 live cloud activation preflight and ran `npm test -- supabaseSmoke supabaseMediaStore`, targeted ESLint for the smoke/media files, `npm run validate:content`, `npm test` (104 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported CRLF warnings only. `npm run smoke:supabase` executed and correctly failed live activation checks because the configured Supabase project has not yet applied the required SQL/bucket setup.
2026-05-14: Codex documented its review of Claude's homepage and codebase audit findings, then ran `npx prettier --write` on the touched docs/coordination files and `git diff --check`.
2026-05-14: Agent E ran `npm test -- invite`, `npm test -- supabaseInviteMapping supabaseMapping`, `npx tsc --noEmit --pretty false`, scoped ESLint for invite/persistence files, `npm test` (110 tests), `npm run lint`, `npm run build`, and `git diff --check`. All passed; diff check reported existing CRLF warnings only.
2026-05-14: Codex integrated all six REVIEW-001 agents, ran `npm run validate:content`, `npm test` (110 tests), `npm run lint`, `npm run build`, confirmed `http://127.0.0.1:5173/` returns HTTP 200, and ran `git diff --check`. All passed; diff check reported existing CRLF warnings only.
2026-05-15: Codex integrated AUTH-007 and ran targeted `npm test -- supabaseAdminMfaStore supabaseSmoke`, targeted ESLint and TypeScript, `npm run validate:content`, `npm test` (120 tests), `npm run lint`, and `npm run build`. All passed. Browser automation opened `http://127.0.0.1:5173/` and confirmed the home/sign-in surface; local admin form entry remains blocked by the browser plugin email-input automation issue, not by app tests/build.
2026-05-15: Codex completed AUTH-008 and ran `npm test -- supabaseAccountStore`, targeted ESLint for the auth files, `npx tsc --noEmit --pretty false`, `npm run validate:content`, `npm test` (124 tests), `npm run lint`, and `npm run build`. All passed.
2026-05-15: Codex completed AUTH-009 and ran `npm test -- supabaseInviteMapping localInviteStore`, targeted ESLint for auth/invite files, `npx tsc --noEmit --pretty false`, `npm run validate:content`, `npm test` (127 tests), `npm run lint`, and `npm run build`. All passed. Browser DOM smoke confirmed the invite screen now contains Email and Invite Code before unlock; form submission could not be completed through the browser plugin because of the existing `type=email` input automation issue.
2026-05-14: Agent MFA-3 ran scoped `rg` checks for Supabase admin/MFA helpers and `git diff --check -- supabase/schema.sql supabase/README.md`. Checks passed; diff check reported CRLF warnings only for the touched Supabase files.
2026-05-14: Agent MFA-5 ran `npx prettier --write` and scoped `npx prettier --check` for the admin MFA ADR/runbook/index/message/status docs, plus scoped `git diff --check`. All passed.
2026-05-14: Agent MFA-4 ran `npm test -- supabaseSmoke`, `npx prettier --check scripts/smoke-supabase.ts tests/unit/supabaseSmoke.test.ts`, scoped `npx eslint scripts/smoke-supabase.ts tests/unit/supabaseSmoke.test.ts`, and scoped `npx tsc --noEmit --pretty false ... scripts/smoke-supabase.ts tests/unit/supabaseSmoke.test.ts`. All passed. Repo-wide `npx tsc --noEmit --pretty false` is currently blocked by concurrent `tests/unit/supabaseAdminMfaStore.test.ts` typing work outside MFA-4 scope.
2026-05-15: Agent M10-4 added the concise M9/M10 owner handoff docs and ran scoped Prettier and diff checks for the touched docs/coordination files. All passed. Live Supabase/Vercel/registrar checks remain owner-dashboard work outside this docs-only scope.
2026-05-15: Agent M10-2 inspected media/image workflow test coverage and added focused coverage
for browser-local prompt/explanation image and local-video publish rejection, missing cloud media
metadata before `question_media` linkage, and signed URL rejection/error paths. Ran
`npm test -- questionContentStore supabaseMediaStore`, `npm test` (134 tests), scoped
Prettier/ESLint for the touched tests, and `npx tsc --noEmit --pretty false`. All passed.
2026-05-15: Agent M10-1 added focused content lifecycle coverage and a lifecycle timestamp persistence fix, then ran `npm test -- questionContentStore`, `npx vitest run tests/unit/questionContentStore.test.ts tests/unit/publication.test.ts`, targeted ESLint/Prettier checks, `npm test` (134 tests), `npm run lint`, and `npm run build`. All passed.
2026-05-15: Agent M10-3 ran a headless Chrome local-admin browser smoke for Manage Content: original MCQ and FRQ creation, local image uploads, Save Draft, Publish, Archive, and archived-question hiding from Practice all passed. Also ran `npx eslint src/app/components/ContentManager.tsx`, `npm test -- publication questionContentStore` (28 tests), `npm run validate:content`, and `npm run build`. All passed. No source fix was needed.
2026-05-15: Codex integrated M9/M10 and ran `npm test -- questionContentStore supabaseMediaStore supabaseSmoke` (40 tests), `npx tsc --noEmit --pretty false`, `npm run validate:content`, `npm test` (134 tests), `npm run lint`, `npm run build`, and `git diff --check`. All repo checks passed. Live `npm run smoke:supabase` is blocked by missing `public.validate_invite`, `public.questions`, and `question-images` bucket in the configured Supabase project; `studyprecalc.com` returns HTTP 200 and `www.studyprecalc.com` is not configured.
2026-05-15: Codex integrated M11-M16 and ran `npm test` (151 tests), `npm run lint`, `npm run build`, `npm run validate:content`, `git diff --check`, `npm test -- aiGrading` (9 tests), and `npm run smoke:supabase`. Repo checks passed. Live `npm run smoke:supabase` still fails as expected until the owner applies `supabase/schema.sql`, confirms the `question-images` bucket, and creates real admin/student smoke accounts. Local dev server returned HTTP 200 at `http://127.0.0.1:5173/`; bundled Playwright browser automation was unavailable because the runtime package is missing `playwright-core`.
