# 0010 - Admin MFA Enforcement

## Status

Accepted

## Context

Production admins can create classes, invites, published questions, and private image assets. A
stolen admin password would expose high-impact write paths, so admin authorization needs a second
factor in addition to the existing `profiles.role = 'admin'` check.

Local development still needs the Vite-only admin account to remain lightweight for browser-local
authoring work.

## Decision

Require Supabase TOTP MFA for production admin actions.

- Admin users must have `profiles.role = 'admin'` and an Auth session with assurance level `aal2`.
- The frontend shows an admin MFA gate before cloud admin tabs/actions when a real Supabase admin is
  signed in without `aal2`.
- Supabase RLS and Storage policies enforce the same `aal2` requirement for admin-managed rows and
  `question-images` writes, so the UI gate is not the security boundary.
- The local dev-only admin keeps its MFA bypass because it uses browser-local stores and is not a
  production Auth, RLS, or Storage test.
- Supabase smoke checks may use `SMOKE_ADMIN_MFA_CODE` when the admin account is MFA-protected.

## Consequences

- Production admin setup now includes enrolling a TOTP factor after the first admin login.
- Owner runbooks and smoke tests must verify MFA before content, class, invite, or cloud image
  checks.
- Student flows and published-content reads do not require MFA.
- Production evidence must distinguish local dev bypass from real Supabase `aal2` enforcement.
