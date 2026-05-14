# 0006 - Local Accounts And Session Results

Date: 2026-05-13

## Status

Accepted

## Context

The website now needs a student dashboard, grouped session history, and a login/sign-up flow. The current app is still a static web app without a backend, database, hosted authentication provider, or server-side sessions.

## Decision

Add browser-local accounts for the current development phase.

Each local account gets scoped browser storage keys for attempts and grouped session results. The login/sign-up UI stores a salted password hash in local storage, but this is only a local profile gate, not production-grade authentication.

Grouped session results are stored separately from individual attempts. Individual attempts remain useful for question review, while session records power dashboard summaries, recent sessions, weak-unit analysis, and future AP-style analytics.

## Rationale

- The dashboard can be built now without waiting for a backend.
- Student data can be separated per local profile in one browser.
- The account/session store boundaries are replaceable when server auth and a database are added later.
- Session records avoid reconstructing whole test performance from isolated question attempts.

## Consequences

- Accounts, attempts, sessions, custom content, and uploaded media remain browser/device-specific.
- This is not secure shared-device authentication; anyone with browser access can inspect or clear local data.
- A public website with real accounts will need backend auth, server-side storage, password reset, account recovery, and authorization rules.
- Future migration should preserve the session result schema so local exports can be imported into a backend.
