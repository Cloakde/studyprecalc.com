# PrecalcApp

Web AP Precalculus practice app. The app supports multiple-choice questions, free-response questions, answer explanations, step-by-step solutions, images/graphs, and video explanations.

## Current Status

This repository now contains the project architecture, collaboration workflow, and a runnable web app with local accounts, a student dashboard, practice, session, review, and content management modes.

## Local Development

Install dependencies:

```sh
npm install
```

Run the web app:

```sh
npm run dev
```

Local-only admin login for development:

```txt
Email: admin@studyprecalc.local
Password: localadmin
```

This development admin is available only while running the Vite dev server and is not included in production builds.
It is not valid for cloud Storage, production RLS, or student visibility smoke tests; use a real
Supabase admin for those checks.

Run verification:

```sh
npm run validate:content
npm test
npm run lint
npm run build
```

After `supabase/schema.sql` has been run in the production Supabase project, run the Supabase smoke
check:

```sh
npm run smoke:supabase
```

## Deployment

The first public deployment target is Vercel. See:

- `docs/operations/production-activation.md` for the owner-facing M8 activation checklist.
- `docs/operations/deployment.md` for Vercel deploys, environment variables, domains, and deploy checks.
- `docs/operations/supabase-setup.md` for Supabase SQL, Auth, Storage, first admin bootstrap, invites, and publishing smoke tests.

Use these hosted build settings:

- Build command: `npm run build`
- Output directory: `dist`
- Domain: `studyprecalc.com`

Optional Desmos setup:

- Copy `.env.example` to `.env`.
- Add a valid `VITE_DESMOS_API_KEY`.
- Graphing-calculator questions will load Desmos in the calculator panel.

Optional Supabase setup:

- Add `VITE_SUPABASE_URL`.
- Add a browser-safe `VITE_SUPABASE_ANON_KEY` value using a Supabase publishable key or legacy anon public key.
- Run `supabase/schema.sql` in the Supabase SQL Editor.
- Bootstrap the first admin with an invite as described in `docs/operations/supabase-setup.md`.
- Use `docs/operations/production-activation.md` as the full M8 deployment checklist.

## No-Code Content Management

Use the `Manage Content` tab in the app to create, edit, delete, import, and export authored questions without coding.

The bundled starter question bank is intentionally empty. Use the local development admin account to add your own original questions.

When Supabase is configured and an admin is signed in, authored questions are saved to the Supabase content library and published questions become visible to students. Without Supabase, the manager falls back to browser-local content for development.

## Accounts And Progress

The login/sign-up flow uses Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured. Production sign-up is invite-only and collects email plus password after the invite code is accepted. If Supabase email confirmation is enabled and the Confirm Signup email template includes `{{ .Token }}`, the app asks the user for the emailed verification code before signing them in. Attempts and grouped session results are scoped to the active account and power the Dashboard tab. If Supabase is not configured, the app falls back to browser-local profiles for development.

Run `supabase/schema.sql` in the Supabase SQL Editor before relying on cloud accounts, invites, classes, content publishing, or progress sync.

## Read First

1. `AGENTS.md` - shared rules for Codex, Claude, and any other coding agent.
2. `.ai/status.md` - current project state and active ownership.
3. `docs/architecture/overview.md` - intended technical shape of the app.
4. `docs/workflow/agent-workflow.md` - synchronized workflow for multi-agent work.
5. `docs/product/app-vision.md` - product scope and feature goals.

## Top-Level Layout

- `.ai/` - coordination files for agent handoffs, task ownership, and status.
- `docs/` - product, architecture, workflow, and decision records.
- `src/` - application source code.
- `content/` - question, explanation, and media content.
- `assets/` - static app assets such as icons, images, and videos.
- `tests/` - unit, integration, and fixture files.
- `scripts/` - project automation scripts.

## Collaboration Rule

Before changing files, read `AGENTS.md` and update `.ai/status.md` with the task and file scope you intend to touch.
