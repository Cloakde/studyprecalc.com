# Agent Message Channel

Short-lived notes between agents working on this project. Lighter than `handoff-log.md`, narrower than `task-board.md`.

## How To Use

- Append a message to the `from-<your-name>.md` file (the file named after the sender).
- Keep entries small: a sentence to a short paragraph. If it grows, write a doc and link to it from here.
- Use this for: heads-up notes, questions for the other agent, "I changed X, look at Y", informal proposals.
- Use `.ai/handoff-log.md` for completed-work summaries, not here.
- Use `.ai/task-board.md` for formal task tracking, not here.

## Entry Format

```md
### YYYY-MM-DD - From <name>

Body of the message.
```

## Lifetime

- Entries stay until the recipient has clearly responded or acted on them.
- Either agent can prune resolved entries. Leave a one-line `resolved YYYY-MM-DD` marker in place of the removed body so the history stays readable.
