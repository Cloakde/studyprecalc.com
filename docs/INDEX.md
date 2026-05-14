# Documentation Index

One-line map of every doc and folder in this repo. Update this when you add, remove, or rename a file under `docs/`, `.ai/`, or a top-level directory.

## Root

- [README.md](../README.md) — project overview and read-first list.
- [AGENTS.md](../AGENTS.md) — authoritative collaboration contract for all coding agents.
- [CLAUDE.md](../CLAUDE.md) — Claude-specific pointer to `AGENTS.md`.
- [package.json](../package.json) - npm scripts, runtime dependencies, and development dependencies.
- [vite.config.ts](../vite.config.ts) - Vite build, dev server, and test configuration.
- [vercel.json](../vercel.json) - Vercel static deployment configuration.
- [tsconfig.json](../tsconfig.json) - TypeScript configuration.
- [supabase/schema.sql](../supabase/schema.sql) - Supabase tables, RLS policies, triggers, and question image bucket setup.
- [supabase/README.md](../supabase/README.md) - Supabase setup notes.

## Agent Coordination (`.ai/`)

- [.ai/status.md](../.ai/status.md) — current active ownership and last verification.
- [.ai/task-board.md](../.ai/task-board.md) — Ready / In progress / Later task list.
- [.ai/handoff-log.md](../.ai/handoff-log.md) — append-only log of finished or paused work.
- [.ai/handoff-template.md](../.ai/handoff-template.md) — copy-paste block for handoff entries.
- [.ai/messages/README.md](../.ai/messages/README.md) — how the agent-to-agent message channel works.
- [.ai/messages/from-claude.md](../.ai/messages/from-claude.md) — Claude's live notes to Codex.
- [.ai/messages/from-codex.md](../.ai/messages/from-codex.md) — Codex's live notes to Claude.

## Product (`docs/product/`)

- [docs/product/app-vision.md](product/app-vision.md) — goals, user types, first-version scope.
- [docs/product/question-model.md](product/question-model.md) — MCQ/FRQ shape, fields, future video references.
- [docs/product/content-authoring-guide.md](product/content-authoring-guide.md) - no-code authoring guidance for MCQ, FRQ, explanations, videos, and metadata.
- [docs/product/content-taxonomy.md](product/content-taxonomy.md) - controlled vocabulary for AP Precalculus units, topics, skills, and tags.

## Architecture (`docs/architecture/`)

- [docs/architecture/overview.md](architecture/overview.md) — web target, layers, design principles.
- [docs/architecture/project-structure.md](architecture/project-structure.md) — directory tree and purpose.

## Workflow (`docs/workflow/`)

- [docs/workflow/agent-workflow.md](workflow/agent-workflow.md) — start/during/end-of-work checklist.
- [docs/workflow/task-template.md](workflow/task-template.md) — template for new tasks.

## Operations (`docs/operations/`)

- [docs/operations/deployment.md](operations/deployment.md) - Vercel deployment, environment variables, `studyprecalc.com` domain setup, deploy checks, and rollback.
- [docs/operations/supabase-setup.md](operations/supabase-setup.md) - Supabase SQL, environment variables, Auth, Storage, first admin bootstrap, invite setup, and content publishing smoke tests.

## Planning (`docs/planning/`)

- [docs/planning/milestones.md](planning/milestones.md) — M0–M10 construction roadmap with submilestones.

## Decisions (`docs/decisions/`)

- [docs/decisions/0001-initial-project-layout.md](decisions/0001-initial-project-layout.md) — initial layout ADR.
- [docs/decisions/0002-web-and-desktop-stack.md](decisions/0002-web-and-desktop-stack.md) - React/Vite/TypeScript web stack and desktop deferral.
- [docs/decisions/0003-math-renderer.md](decisions/0003-math-renderer.md) - KaTeX as the math renderer.
- [docs/decisions/0004-question-and-attempt-schemas.md](decisions/0004-question-and-attempt-schemas.md) - JSON content with Zod validation.
- [docs/decisions/0005-local-first-content-management.md](decisions/0005-local-first-content-management.md) - No-code local authoring before a backend CMS.
- [docs/decisions/0006-local-accounts-and-session-results.md](decisions/0006-local-accounts-and-session-results.md) - Browser-local accounts and grouped session records before backend auth.
- [docs/decisions/0007-supabase-cloud-backend.md](decisions/0007-supabase-cloud-backend.md) - Supabase Auth/Postgres/Storage as the first cloud backend.
- [docs/decisions/0008-vercel-first-web-deploy.md](decisions/0008-vercel-first-web-deploy.md) - Vercel as the first public deployment target for `studyprecalc.com`.
- [docs/decisions/0009-local-dev-admin.md](decisions/0009-local-dev-admin.md) - Local-only development admin login and admin-gated content management.

## Source Tree (`src/`)

- `src/app/` — web UI for accounts, dashboard, practice, sessions, review, and content management.
- `src/domain/` — question, attempt, session, scoring, explanation, and media-reference logic.
- `src/data/` — schemas, seed data, import/export adapters, browser-local stores, and Supabase stores.
- `src/shared/` — small cross-layer utilities.

## Content & Assets

- `content/questions/` — authored MCQ and FRQ source.
- `content/explanations/` — explanation and step content.
- `content/media/` — content-side media references and metadata.
- `assets/icons/` — app icons.
- `assets/images/` — UI images.
- `assets/videos/` — video explanations (large files; keep references in question data, not blobs).

## Tests & Scripts

- `tests/unit/` — unit tests.
- `tests/integration/` — integration tests.
- `tests/fixtures/` — shared test fixtures.
- `scripts/` — project automation scripts.
