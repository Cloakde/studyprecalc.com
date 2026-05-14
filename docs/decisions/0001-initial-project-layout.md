# 0001 - Initial Project Layout

Date: 2026-05-13

## Status

Accepted

## Context

The project needs a clear architecture before implementation so Codex and Claude can work in the same folder without losing track of ownership, decisions, or active tasks.

## Decision

Create a layered project structure with:

- `.ai/` for agent coordination.
- `docs/` for product, architecture, workflow, and decisions.
- `src/` for future application source code.
- `content/` for educational content.
- `assets/` for static media and visual assets.
- `tests/` for verification.
- `scripts/` for automation.

## Consequences

- Agents have a shared operating contract before source code exists.
- The application stack can be selected later without moving product and workflow documentation.
- Educational content is separated from app logic from the start.
