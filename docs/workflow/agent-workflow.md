# Agent Workflow

This workflow keeps Codex and Claude synchronized when both are working in the same project folder.

## Start Of Work

1. Read `AGENTS.md`.
2. Run `git status --short` if Git is available.
3. Read `.ai/status.md` and `.ai/task-board.md`.
4. Claim a narrow file scope in `.ai/status.md`.
5. Move the task status in `.ai/task-board.md` to `In progress`.

## During Work

- Keep edits focused on the claimed scope.
- If a new decision is made, record it in `docs/decisions/`.
- If content format changes, update `docs/product/question-model.md`.
- If structure changes, update `docs/architecture/project-structure.md`.
- If another agent's active scope is needed, stop and coordinate.

## End Of Work

1. Run the most relevant verification command.
2. Update `.ai/status.md`.
3. Update `.ai/task-board.md`.
4. Append to `.ai/handoff-log.md`.
5. Summarize changed files and verification for the user.

## Recommended Branch Naming

When Git is initialized, use short branches:

- `codex/arch-setup`
- `codex/question-runner`
- `claude/domain-model`
- `claude/content-schema`

## Conflict Policy

- Do not revert another agent's changes.
- Do not rewrite shared docs without preserving useful context.
- Prefer appending handoff notes over replacing historical notes.
- If two agents need the same file, split the work by section or ask the user to choose ownership.
