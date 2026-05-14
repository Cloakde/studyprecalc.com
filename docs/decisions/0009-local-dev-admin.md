# 0009 - Local Development Admin

## Status

Accepted

## Context

Public sign-ups are blocked during the invite-only beta, but local development still needs a reliable admin account for content-management work. Supabase already models account roles with `profiles.role`, but the frontend did not yet use roles to gate admin UI.

## Decision

Add a Vite-development-only local admin login:

- Email: `admin@studyprecalc.local`
- Password: `localadmin`

This account is created in memory/session state by the frontend only when `import.meta.env.DEV` is true. It uses browser-local attempt and session stores, even when Supabase environment variables are present.

Add role awareness to frontend account models and show `Manage Content` only to accounts with `role = 'admin'`.

## Consequences

- Local development has a predictable admin account without public signup.
- Production builds do not expose the local admin login path.
- Student accounts no longer see the content-management tab.
- Supabase remains the production source of truth for admin roles.
