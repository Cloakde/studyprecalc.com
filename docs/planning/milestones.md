# Construction Roadmap

PrecalcApp construction plan. The active target is the web app. Desktop packaging is deferred indefinitely and should not affect current implementation choices. Each milestone is a coherent unit of progress that produces a runnable build the user can actually try.

This doc is the high-level plan. Active work lives in `.ai/task-board.md`. Decisions get recorded in `docs/decisions/`.

## Conventions

- **Status legend:** `[ ]` not started, `[~]` in progress, `[x]` done, `[-]` deferred.
- Milestones are roughly ordered, but M7 (content authoring) can run in parallel with M2–M6.
- "Web app" means every active milestone must work in a browser.
- Concrete dates are not tracked here. Use `.ai/task-board.md` for in-flight work.
- If a milestone gets re-prioritized, do **not** delete it; mark it Deferred and add a one-line reason.

## Principles

1. **Content-first.** Ship a working pipeline from authored question → rendered question before piling on feature surface.
2. **Vertical slices.** Each milestone ends with something a student can actually do, not a library half-built.
3. **Web focus.** `src/app/` and `src/domain/` stay clean and portable, but current construction optimizes for the browser.
4. **No fake content.** Use original, intentionally written precalc questions. Five real questions beat fifty placeholders.
5. **Explain everything.** Every question must have an explanation and step-by-step solution before it ships in a build.
6. **No-code ownership.** The app owner should be able to add, edit, delete, import, and export questions without coding.

## Milestones

### M0 — Foundation

Goal: lock in the decisions and tooling that block everything else.

- [x] **M0.1** Resolve DEC-001: pick web stack (likely React + Vite + TypeScript, but worth a deliberate choice). Record as ADR.
- [-] **M0.2** Pick the desktop shell stack — deferred indefinitely because desktop is no longer an active target.
- [x] **M0.3** Define the question JSON schema in `src/data/schemas/` matching `docs/product/question-model.md`.
- [x] **M0.4** Define the attempt and scoring schema (new ADR).
- [x] **M0.5** Stand up build tooling: TypeScript, linter, formatter, test runner, dev server.
- [x] **M0.6** Choose the math renderer (KaTeX vs. MathJax) — needed for prompts, choices, and explanations. ADR.
- [x] **M0.7** Remove starter questions from `content/questions/` so the shipped app starts with no bundled questions.
- [ ] **M0.8** Wire a minimal CI check (lint + typecheck + tests) so future milestones cannot regress silently.

Exit criteria: schema validates starter content; the project builds; tests run; one ADR per major choice; CI green.

### M1 — Read-only Viewer

Goal: render a question on screen from JSON. No interaction yet.

- [x] **M1.1** Question loader that reads JSON from `content/questions/`.
- [x] **M1.2** Math-rendered question prompt component.
- [x] **M1.3** MCQ choice list rendering (display only, no selection).
- [x] **M1.4** FRQ part rendering (shared stimulus + per-part prompts).
- [x] **M1.5** Asset rendering hook for image and graph references in question data.
- [x] **M1.6** Router-level navigation: previous / next question by ID.
- [x] **M1.7** Empty-state and error-state UI for missing or malformed questions.

Exit criteria: a teacher can hand-drop a JSON question into `content/questions/` and see it render correctly.

### M2 — Interactive MCQ

Goal: a student can answer multiple-choice questions and learn from the result.

- [x] **M2.1** Choice selection state.
- [x] **M2.2** Submit and lock-in (no edits after submission for this attempt).
- [x] **M2.3** Correct / incorrect feedback.
- [x] **M2.4** Per-choice explanation reveal (why each distractor is wrong).
- [x] **M2.5** Overall explanation panel.
- [x] **M2.6** Step-by-step solution panel, collapsed by default.
- [x] **M2.7** "Try another" and "Next question" actions.
- [x] **M2.8** Mark-for-review flag (in-session only; persistence comes in M4).
- [ ] **M2.9** Optional: choice elimination affordance (strike-through distractors).

Exit criteria: a student can practice 10 MCQs end-to-end with no page reloads.

### M3 — Free Response

Goal: FRQ practice with a transparent, self-graded rubric.

- [x] **M3.1** Multi-part rendering with a shared stimulus and per-part response areas.
- [x] **M3.2** Typed response entry per part (plain text first; math input is M3.7).
- [ ] **M3.3** Decide and record: submit per part vs. submit all at once.
- [x] **M3.4** Reveal the sample response after submit.
- [x] **M3.5** Rubric checklist UI — the student self-grades against the rubric criteria.
- [x] **M3.6** Computed score from the checklist.
- [ ] **M3.7** Math input experiment (LaTeX shortcut or visual editor). Spin out as its own ADR if it bloats the milestone.
- [ ] **M3.8** "Expected work" hints — collapsible patterns of correct reasoning.

Exit criteria: a student can attempt a multi-part FRQ and self-grade against a clear, fair rubric.

### M4 — Attempt Tracking

Goal: progress persists between sessions.

- [x] **M4.1** Persistence layer abstraction in `src/data/` for browser-local storage.
- [x] **M4.2** Attempt record schema: question ID, response, score, timestamps, time-on-task.
- [x] **M4.3** Save-on-submit hook from the question runner.
- [x] **M4.4** Attempt history list screen.
- [x] **M4.5** Attempt detail screen — re-renders the question with the student's response and score.
- [x] **M4.6** Per-question history badge on browse views ("attempted 3x, correct 2x").
- [x] **M4.7** Export attempts to JSON (download).
- [x] **M4.8** Settings: clear-all-data confirmation flow.
- [x] **M4.9** Browser-local account profiles for separating local student progress.
- [x] **M4.10** Supabase Auth/Postgres adapters for cloud account progress sync.

Exit criteria: closing and reopening the tab preserves attempts; a student can see what they got wrong last week.

### M5 — Question Bank Navigation

Goal: students find questions by topic instead of going linearly.

- [x] **M5.1** Surface the unit / topic taxonomy from question metadata in the UI.
- [x] **M5.2** Browse-by-unit screen.
- [ ] **M5.3** Browse-by-skill screen.
- [x] **M5.4** Difficulty filter.
- [x] **M5.5** Tag-based search.
- [x] **M5.6** "Random question" entry point.
- [ ] **M5.7** "Practice this skill" entry point that queues N questions of one skill.

Exit criteria: a student can choose what to practice rather than being fed a fixed sequence.

### M6 — Session and Quiz Mode

Goal: timed, curated practice sets that resemble exam pacing.

- [x] **M6.1** Session generator: pick N questions matching filter criteria.
- [x] **M6.2** Session run UI with progress indicator and question counter; no early reveal of correct answers.
- [x] **M6.3** Optional per-question and per-session timers.
- [x] **M6.4** End-of-session summary screen.
- [x] **M6.5** "Review mistakes only" follow-up flow from the summary.
- [x] **M6.6** Save session result as a grouped attempt record.
- [x] **M6.7** Dashboard summaries from grouped session history.

Exit criteria: a student can run a "10-question mixed practice, timed" session and see a meaningful summary.

### M7 — Content Authoring (parallel track)

Goal: adding the 100th question should be as easy as adding the 10th.

- [x] **M7.1** Schema-validation CLI under `scripts/` (`validate-content`).
- [ ] **M7.2** Author-facing preview route that renders a draft question without polluting the live bank.
- [x] **M7.3** Content linter: missing explanations, missing rubric, duplicate IDs, untagged skill, unresolved asset refs.
- [x] **M7.4** Controlled vocabulary doc for tags, units, and skills (lives in `docs/product/`).
- [x] **M7.5** Author guide: how to write a good question, distractor design notes, rubric design notes.
- [x] **M7.6** Optional: lightweight in-app authoring editor (low priority; raw JSON + preview may be enough).
- [x] **M7.7** Local-first import/export for authored question packs.
- [x] **M7.8** Server-backed CMS/admin publishing workflow for managing the public website question bank.
- [x] **M7.9** Supabase question image storage bucket and RLS policy setup.

Exit criteria: a non-engineer collaborator can author a new question, validate it, and preview it without engineer help.

### M8 — Live Cloud Activation

Goal: prove the hosted Supabase/Vercel deployment is ready for real admin and student use.

- [x] **M8.1** Repo-side Supabase smoke script checks invite RPC, unpublished-content denial, media schema readiness, and Storage bucket readiness.
- [x] **M8.2** Optional write smoke uploads a generated image, links media metadata, publishes a smoke question, checks signed URL behavior, and cleans up.
- [x] **M8.3** Owner-facing production activation runbook names required evidence after each setup step.
- [ ] **M8.4** Owner applies `supabase/schema.sql` in the production Supabase dashboard.
- [ ] **M8.5** Owner bootstraps and signs in with a real Supabase admin account.
- [ ] **M8.6** Owner deploys or redeploys Vercel with production Supabase env vars.
- [ ] **M8.7** Owner runs live read-only and write Supabase smoke checks with real admin/student smoke credentials.
- [ ] **M8.8** Owner confirms browser QA for admin publish, cloud image render, student visibility, archive denial, and dashboard persistence.

Exit criteria: `studyprecalc.com` runs in cloud mode and one real admin/student smoke cycle passes end to end.

### M9 — Video Explanations

Goal: video as an optional layer over the existing text explanation.

- [x] **M9.1** Video player component.
- [x] **M9.2** Per-question video reference resolution (URL, transcript path, thumbnail).
- [ ] **M9.3** Transcript display under the player, with timestamp navigation.
- [x] **M9.4** Graceful fallback to text steps when a question has no video.
- [ ] **M9.5** Loading and bandwidth affordances for slow connections.
- [x] **M9.6** Author guidance: target length, structure, recording standards, in `docs/product/`.

Exit criteria: at least one question has a real video explanation and the player works in the web app.

### M10 — Polish and Web Deploy

Goal: a public, usable v1 of the web app.

- [ ] **M10.1** Responsive layout: phone, tablet, desktop browser.
- [ ] **M10.2** Keyboard navigation for MCQ choices and submit.
- [ ] **M10.3** Screen-reader semantics audit on every interactive component.
- [ ] **M10.4** Math accessibility: alt text for graphs, screen-reader-friendly equation output where possible.
- [ ] **M10.5** Performance budget: page weight, time-to-interactive, math-render time.
- [~] **M10.6** Static deploy pipeline (Vercel first). See `docs/decisions/0008-vercel-first-web-deploy.md` and `docs/operations/deployment.md`.
- [ ] **M10.7** Versioned content bundle so users know what's current.
- [ ] **M10.8** Privacy notes: what stays local, what (if anything) leaves the device.

Exit criteria: a stranger can open the site and complete a practice session with no bugs or accessibility blockers.

## Current Forward Milestones

These milestones continue the active web-first roadmap after the repo-side M21/M22 work. The
numbers stay aligned with the current task-board history.

### M23 - Production Activation

Goal: make `studyprecalc.com` usable with the real Supabase backend.

- [ ] **M23.1** Owner applies `supabase/schema.sql` in Supabase.
- [ ] **M23.2** Owner confirms the private `question-images` bucket and Storage policies.
- [ ] **M23.3** Owner configures invite-only email verification with visible signup codes.
- [ ] **M23.4** Owner creates the first production admin and one student smoke account.
- [ ] **M23.5** Run live Supabase smoke checks and capture launch evidence.

Exit criteria: one real admin/student cloud smoke cycle passes end to end.

### M24 - Live Admin/Student Smoke

Goal: prove the live class, invite, publish, archive, media, and dashboard workflows.

- [ ] **M24.1** Admin signs in with MFA and creates a class.
- [ ] **M24.2** Admin creates a student invite; student signs up with email code.
- [ ] **M24.3** Student enrolls through the invite and sees the correct class context.
- [ ] **M24.4** Admin publishes original smoke content with at least one image.
- [ ] **M24.5** Student sees published content only; archived content disappears.
- [ ] **M24.6** Student completes practice; dashboard progress persists.

Exit criteria: the hosted app passes a manual live smoke checklist with production accounts.

### M25 - Exam Modes

Goal: add structured exams on top of the question/session engine without adding copyrighted
question content.

- [ ] **M25.1** Define an exam blueprint model for fixed question pools, timing, section labels,
      calculator policy, scoring, and review settings.
- [ ] **M25.2** Add **unit practice exams** for each course unit: Unit 1, Unit 2, Unit 3, and Unit 4.
- [ ] **M25.3** Add **AP prep exams** that intentionally pull from Units 1-3 only.
- [ ] **M25.4** Add admin controls to assemble exam blueprints from owner-authored/published
      questions without coding.
- [ ] **M25.5** Add student exam-taking UI with no answer reveal until submit.
- [ ] **M25.6** Save exam attempts separately from ordinary practice sessions.
- [ ] **M25.7** Add exam review screens with section score, time, missed topics, and FRQ rubric
      self-score summaries.

Exit criteria: a student can take a Unit 1 practice exam and an AP prep exam using authored
questions, then review performance without seeing answer explanations early.

### M26 - Assignments

Goal: let admins assign question sets, unit exams, or AP prep exams to classes.

- [ ] **M26.1** Assignment model: title, description, class, due date, content type, and completion
      rules.
- [ ] **M26.2** Admin can assign a practice set, unit practice exam, or AP prep exam.
- [ ] **M26.3** Student dashboard shows assigned work and due dates.
- [ ] **M26.4** Assignment completion persists and appears in class progress.
- [ ] **M26.5** Admin can filter assignment progress by class, student, unit, and status.

Exit criteria: a teacher can assign a Unit 2 practice exam to a class and see who completed it.

### M27 - Media Library

Goal: make images reusable and manageable across authored questions and exams.

- [ ] **M27.1** Reusable image library with search, tags, unit labels, and alt text.
- [ ] **M27.2** Safe replace/delete flows that detect published question usage.
- [ ] **M27.3** Import/export bundles that preserve image references.
- [ ] **M27.4** Readiness checks for missing alt text and orphaned media.

Exit criteria: content authors can manage graphs and plots without re-uploading or breaking
published questions.

### M28 - Reporting

Goal: give admins useful class-level and student-level insight.

- [ ] **M28.1** Class progress table.
- [ ] **M28.2** Per-student weak units and weak skills.
- [ ] **M28.3** Per-question accuracy and time-on-task.
- [ ] **M28.4** Exam-specific reporting for unit practice exams and AP prep exams.
- [ ] **M28.5** CSV export for progress and grades.

Exit criteria: a teacher can identify weak topics and export a class progress snapshot.

### M29 - AI FRQ Grading Backend

Goal: connect the existing disabled AI foundation to a server-side grading proxy.

- [ ] **M29.1** Server-side Gemini proxy with secrets stored outside browser code.
- [ ] **M29.2** Daily limits, likely starting at 4 FRQ grading requests per student per day.
- [ ] **M29.3** Store compact feedback summaries and usage records.
- [ ] **M29.4** Admin settings for enablement and limits.
- [ ] **M29.5** Teacher review/override path.

Exit criteria: AI feedback can be enabled safely for a small class without exposing provider keys.

### M30 - Launch Hardening

Goal: reduce operational and accessibility risk before inviting students broadly.

- [ ] **M30.1** RLS/security review.
- [ ] **M30.2** Backup/export plan.
- [ ] **M30.3** Accessibility pass across homepage, auth, practice, exams, admin, and dashboard.
- [ ] **M30.4** Mobile QA pass.
- [ ] **M30.5** Privacy/terms pages.
- [ ] **M30.6** First-pack launch checklist against owner-authored questions and exams.

Exit criteria: the app is ready for a small classroom beta.

### M11 — Desktop Port

Goal: deferred indefinitely. Reconsider only if there is a strong future need for offline distribution outside the browser.

- [-] **M11.1** Scaffold desktop shell.
- [-] **M11.2** Desktop persistence.
- [-] **M11.3** Native menus and window management.
- [-] **M11.4** Bundle content for offline desktop use.
- [-] **M11.5** Desktop update mechanism.
- [-] **M11.6** Cross-platform desktop packaging.
- [-] **M11.7** Desktop smoke-test plan.

Exit criteria: none while deferred.

## Out of Scope For Now

These are real future features or hardening passes, intentionally deferred:

- Full production hardening beyond the current Supabase beta setup.
- Organization-level account administration beyond basic classes and invites.
- Server-backed grading.
- Adaptive difficulty / spaced repetition.
- AI tutoring or AI-generated hints.
- Mobile-native apps (iOS / Android).
- Licensing or use of College Board content.

## Maintenance

- Tick checkboxes as submilestones land.
- When a full milestone closes, append a one-line summary to `.ai/handoff-log.md`.
- Cross-link milestones to ADRs as decisions get made (M0.1 → `docs/decisions/0002-*.md`, etc.).
- If the plan changes shape, edit this file; do not duplicate plans elsewhere.
