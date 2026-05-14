# Task Board

## Ready

| ID          | Task                                         | Owner            | Status | Notes                                                                                                                            |
| ----------- | -------------------------------------------- | ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-001    | Create synchronized project architecture     | Codex            | Done   | Initial folder and workflow setup.                                                                                               |
| ARCH-002    | Add messages channel, docs index, web target | Claude           | Done   | See `docs/INDEX.md`, `.ai/messages/`, `docs/architecture/overview.md`.                                                           |
| PLAN-001    | Create AP Precalculus app construction plan  | Claude           | Done   | See `docs/planning/milestones.md` (M0–M10 with submilestones).                                                                   |
| DEC-001     | Choose web stack                             | Codex            | Done   | See `docs/decisions/0002-web-and-desktop-stack.md`.                                                                              |
| DEC-002     | Choose math renderer                         | Codex            | Done   | See `docs/decisions/0003-math-renderer.md`.                                                                                      |
| DEC-003     | Define question and attempt schemas          | Codex            | Done   | See `docs/decisions/0004-question-and-attempt-schemas.md`.                                                                       |
| APP-001     | Build first runnable question practice UI    | Codex            | Done   | React/Vite app with seed content, math rendering, MCQ review, FRQ self-score, and calculator panel.                              |
| CONTENT-002 | Build no-code content manager                | Codex            | Done   | Browser authoring UI for adding, editing, deleting, importing, and exporting questions with solutions/video links. See ADR 0005. |
| APP-002     | Persistent attempt tracking and review       | Codex + Worker A | Done   | Local saved attempts, review display, import/export, remove, clear confirmation, and question badges.                            |
| APP-003     | Question bank navigation and filters         | Codex            | Done   | Browse/filter by type, unit, difficulty, calculator, tags/search, and random question.                                           |
| CONTENT-003 | Strengthen no-code authoring validation      | Worker B         | Done   | Added controlled vocabulary docs, author guidance, metadata validation, and unit coverage.                                       |
| VIDEO-001   | Render video explanation references          | Worker C         | Done   | Added standalone component for embeds, safe links, thumbnails, transcripts, and duration metadata.                               |
| VIDEO-002   | Upload and reveal video explanations         | Codex            | Done   | Added local video upload storage, in-app playback, explanation reveal button, and video reveal button.                           |
| ASSET-001   | Add question and solution image assets       | Codex            | Done   | Added local image upload storage, asset authoring controls, and rendering for prompt/explanation graphs and plots.               |
| DEC-004     | Defer desktop app target                     | Codex            | Done   | Updated docs and planning so the website is the only active target.                                                              |
| SESSION-001 | Build first AP-style session mode            | Codex            | Done   | Added session setup, generated question queue, no early answers, mark-for-review, summary, and missed-question retry flow.       |
| BUG-001     | Multi-agent bug hunt and hardening           | Codex + Agents   | Done   | Fixed high-impact session, attempt persistence, content overwrite, async media, and schema validation bugs.                      |
| ACCOUNT-001 | Add local account login/signup shell         | Codex            | Done   | Browser-local accounts for now; replaceable with backend auth later.                                                             |
| SESSION-002 | Persist grouped session results              | Codex            | Done   | Added session result schema/store and saved completed session summaries.                                                         |
| DASH-001    | Build first student dashboard                | Codex            | Done   | Shows recent sessions, accuracy, weak units, and recommended next practice.                                                      |
| AUTH-002    | Add production backend auth and sync         | Codex            | Done   | Supabase Free setup with Auth, Postgres tables, RLS policies, and local fallback.                                                |
| DEPLOY-001  | Add first public web deployment setup        | Codex            | Done   | Added Vercel static deployment config and domain connection instructions for `studyprecalc.com`.                                 |
| AUTH-004    | Block public sign-ups for invite-only beta   | Codex            | Done   | Kept signup implementation but now show an invite-only error from the sign-up UI.                                                |

## Later

| ID          | Task                                      | Owner      | Status  | Notes                                                                                       |
| ----------- | ----------------------------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------- |
| CONTENT-001 | Define original question authoring format | Unassigned | Backlog | Must support MCQ, FRQ, explanations, and future video links.                                |
| UI-001      | Design College Board-style practice flow  | Unassigned | Backlog | Avoid copying proprietary College Board visual assets.                                      |
| SCORE-001   | Define attempt, scoring, and review model | Unassigned | Backlog | Needed before first app prototype.                                                          |
| MEDIA-001   | Build publishable media library/export    | Unassigned | Backlog | Needed so uploaded images/videos can travel across browsers and public deployments.         |
| DASH-002    | Expand dashboard analytics                | Unassigned | Backlog | Add trends over time, skill-level recommendations, and session detail drill-down.           |
| AUTH-003    | Run Supabase setup and smoke-test cloud   | Unassigned | Backlog | Run `supabase/schema.sql`, create first account, promote admin, and verify cloud saves.     |
| DEPLOY-002  | Deploy hosted build and connect domain    | Unassigned | Backlog | Requires Vercel account/GitHub import or Vercel CLI login, then connect `studyprecalc.com`. |
