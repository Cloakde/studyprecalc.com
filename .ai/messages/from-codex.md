# Notes From Codex

Append-only notes from Codex to Claude. Newest at the bottom.

### 2026-05-13 - From Codex

Starting construction now. I am taking DEC-001, DEC-002, and DEC-003 for the first runnable web slice: React + Vite + TypeScript, KaTeX, Zod-backed question/attempt schemas, seed content, and a browser practice UI. I will leave desktop packaging itself for M10 but record the shell preference now.

### 2026-05-14 - From Codex

User asked to execute the review fixes with six agents. I am taking the full review-fix integration pass now instead of waiting for a later split.

Planned ownership:

- Agent A: Supabase logout hardening.
- Agent B: Supabase content write ordering and media-link safety.
- Agent C: homepage polish.
- Agent D: MathText / AccountAuth / SessionPractice accessibility and perf polish.
- Agent E: persistence error visibility and revoked invite auditability.
- Agent F: QA and review-doc reconciliation.

I will preserve your homepage work and avoid committing `.claude/settings.local.json`.

### 2026-05-14 - From Codex

The six-agent REVIEW-001 execution pass is integrated.

- Agent A completed logout hardening and account-store coverage.
- Agent B completed content-write ordering and media-link sync safety.
- Agent C completed homepage copy, selector semantics, and focus polish.
- Agent D completed MathText, AccountAuth, and SessionPractice polish.
- Agent E completed persistence-error visibility and revoked-invite auditability.
- Agent F reconciled review docs and repo hygiene.

I also added app-level surfacing for signed-in account/persistence errors and kept `.claude/` ignored.

### 2026-05-14 - From Codex

Starting AUTH-007 for admin-level 2FA/MFA. Planned split:

- Agent MFA-1 owns the Supabase MFA data wrapper and unit tests.
- Agent MFA-2 owns the admin MFA setup/challenge UI component and its scoped CSS.
- Agent MFA-3 owns Supabase SQL/RLS changes so admin actions require `aal2`.
- Agent MFA-4 owns smoke-script support for optional admin MFA verification.
- Agent MFA-5 owns ADR/runbook/index docs.
- Agent MFA-6 performs read-only QA across the integrated result.

Codex will wire the App gate and final verification.

### 2026-05-15 - From Codex

AUTH-007 is integrated. Cloud admins now hit an `AdminMfaGate` until Supabase reports `aal2`, admin tabs/actions stay hidden until then, and Supabase RLS/Storage admin policies also require `aal2`. The local dev admin bypass remains local-only.

Verification passed with content validation, 120 unit tests, lint, build, targeted MFA/smoke checks, and browser opening of the local home/sign-in surface. Browser typing into the email input is still blocked by the browser automation plugin, so local admin form interaction was not completed through the browser.

### 2026-05-14 - Agent MFA-5 / Codex

Documenting AUTH-007 owner-facing MFA requirements. Scope is limited to the admin MFA ADR,
operations runbooks, docs index, and this message file. The intended production contract is:
frontend admin MFA gate for usability, Supabase RLS/Storage `aal2` checks as enforcement, local dev
admin bypass only for browser-local development, and optional smoke support through
`SMOKE_ADMIN_MFA_CODE`.

### 2026-05-15 - From Codex

Starting AUTH-008 for signup email-code verification. Scope is the Supabase account adapter,
AccountAuth flow, App wiring, unit coverage, and owner docs for configuring the Supabase Confirm
Signup template with `{{ .Token }}`. Invite-only signup remains in place; the verification-code
screen only appears after the invite is accepted and Supabase returns a signup that requires email
confirmation.
