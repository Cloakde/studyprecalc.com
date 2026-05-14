# Architecture Overview

PrecalcApp is a **web app** for AP Precalculus practice. Desktop packaging is no longer an active target and should not shape current implementation decisions. It can be reconsidered much later if there is a real distribution or offline-use need.

## Target

### Web

- Runs in a browser.
- Built as a static bundle backed by Supabase when cloud environment variables are configured.
- Uses Supabase Auth/Postgres/Storage for cloud accounts, progress, and question images.
- Falls back to browser-side storage for local account profiles, local question packs, uploaded media, attempt history, and grouped session history when Supabase is not configured.
- Uses user-initiated import/export for portable question packs and attempt data.
- Future centralized publishing should use a backend/CMS rather than a desktop shell.

### Deferred Desktop Option

Desktop is deferred indefinitely. Do not scaffold `src/desktop/`, pick a shell, or add desktop-specific storage until the web app is mature and the project explicitly reopens that target.

## Layers

### App UI

Located in `src/app/`.

Responsible for:

- Practice flows.
- Session and quiz flows.
- Question display.
- Answer entry.
- Review screens.
- Attempt history screens.
- Student dashboard screens.
- Local account profile screens.
- Content management screens.
- Settings and navigation.

### Domain Logic

Located in `src/domain/`.

Responsible for:

- Question models.
- Attempt models.
- Session result models.
- Scoring behavior.
- Explanation selection.
- Media references.

### Data and Content

Located in `src/data/` and `content/`.

Responsible for:

- Data schemas.
- Import/export helpers.
- Seed content.
- Authored questions and explanations.
- Supabase persistence adapters.
- Browser-local persistence adapters.

### Shared Utilities

Located in `src/shared/`.

Responsible for small reusable helpers that are not tied to UI APIs.

## Early Design Principles

- Keep question content portable so it can be validated and migrated to a future backend.
- Treat MCQ and FRQ as different question types under one shared question contract.
- Store large media as references so question data remains small and portable.
- Make scoring explainable. Students should be able to see why an answer is correct or incomplete.
- Keep implementation decisions documented in `docs/decisions/`.
