# 0002 - Web App Stack

Date: 2026-05-13

## Status

Accepted. Updated 2026-05-13 to defer desktop indefinitely.

## Context

PrecalcApp should be a browser-based AP Precalculus practice app. The user no longer wants a desktop app in the active roadmap, though a desktop package may be reconsidered much later.

## Decision

Use React, Vite, and TypeScript for the web app.

Do not scaffold or plan a desktop shell for current construction.

## Rationale

- React and TypeScript give the app a maintainable component model and strongly typed content contracts.
- Vite keeps local development and static web builds simple.
- The near-term product need is a manageable website, not native packaging.
- Avoiding a desktop target keeps storage, deployment, and content management decisions focused on the web.

## Consequences

- The first and only active target is a static browser app.
- UI lives in `src/app/`.
- Business logic lives in `src/domain/`.
- Desktop packaging is not part of M0-M10 construction anymore.
- A future desktop ADR can be created if the target is reopened later.
