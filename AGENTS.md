# Agent Collaboration Guide

This file is the shared operating contract for Codex, Claude, and any other coding agent working in this project.

## Required Read Order

Before making changes, read:

1. `README.md`
2. `AGENTS.md`
3. `.ai/status.md`
4. `.ai/task-board.md`
5. `docs/workflow/agent-workflow.md`
6. `docs/architecture/overview.md`

## Core Rules

- Keep changes scoped to the active task.
- Do not overwrite or revert another agent's work unless the user explicitly asks.
- Check `git status --short` before and after editing when Git is available.
- Update `.ai/status.md` before starting meaningful edits.
- Append a handoff entry to `.ai/handoff-log.md` when finishing or pausing work.
- Record meaningful technical decisions in `docs/decisions/`.
- Put product decisions in `docs/product/`, not scattered comments.
- Keep question content separate from app logic.
- Do not commit copyrighted College Board questions, images, rubrics, or assets unless the user confirms they have usage rights. Prefer original practice questions modeled around the same skills.

## Ownership Protocol

Before editing, claim a clear file scope in `.ai/status.md`.

Good examples:

- `Codex owns docs/workflow/* for workflow setup.`
- `Claude owns src/domain/questions/* for question model implementation.`
- `Codex owns src/app/components/QuestionRunner* for the current UI task.`

Avoid broad claims such as:

- `Claude owns src/*`
- `Codex owns all docs`

If a task requires touching a file another agent has claimed, add a note to `.ai/handoff-log.md` or ask the user before proceeding.

## File Placement Rules

- `src/app/` - UI screens, components, state, and app-facing behavior.
- `src/desktop/` - desktop shell, app lifecycle, file system access, packaging.
- `src/domain/` - question logic, attempts, scoring, explanations, and media references.
- `src/data/` - schemas, seed data, import/export adapters.
- `src/shared/` - utilities shared across app layers.
- `content/` - authored educational content.
- `assets/` - static visual and media assets.
- `tests/` - test files and fixtures.
- `docs/` - planning, architecture, workflow, and decisions.

## Completion Checklist

At the end of a task:

1. Run the most relevant verification command available.
2. Update `.ai/status.md`.
3. Update `.ai/task-board.md` if task state changed.
4. Append a concise entry to `.ai/handoff-log.md`.
5. Tell the user what changed and what was verified.
