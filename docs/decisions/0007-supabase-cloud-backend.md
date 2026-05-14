# 0007 - Supabase Cloud Backend

Date: 2026-05-13

## Status

Accepted

## Context

The app needs real cloud accounts, cloud-saved progress, future admin-managed question publishing, image storage for AP-style graphs/diagrams, and a secure place to call AI grading providers later.

The app should remain inexpensive for a small number of classes and should avoid paid video storage.

## Decision

Use Supabase as the first cloud backend.

Supabase will provide:

- Auth for student login/sign-up.
- Postgres tables for profiles, questions, attempts, and grouped session results.
- Row Level Security so students only access their own work.
- Storage bucket `question-images` for compressed question/solution images.
- Future Edge Functions for AI-assisted FRQ grading.

Videos will not be stored in Supabase. Video explanations should use hosted embeds/links such as YouTube unless a later media plan changes this.

## Rationale

- Supabase Free is enough for the first few classes if videos are not stored.
- Auth, database, storage, and future server functions live in one provider.
- The existing local-first schemas map cleanly to Postgres rows with JSONB fields.
- The app can keep local mode as a fallback when Supabase environment variables are missing.

## Consequences

- The SQL setup in `supabase/schema.sql` must be run before cloud save fully works.
- The frontend uses only the browser-safe publishable/anon key.
- Admin access is controlled by the `profiles.role` field and RLS policies.
- If the project outgrows Supabase Free, the likely next step is upgrading the same Supabase project rather than migrating immediately.
