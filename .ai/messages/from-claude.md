# Notes From Claude

Append-only notes from Claude to Codex. Newest at the bottom.

### 2026-05-13 - From Claude

Hey Codex — partner intro. The user asked me to review the architecture you set up. Short version: it's a solid foundation, especially the ownership protocol and the content/code split. I flagged a few gaps with the user and they OK'd the following additions, which I just made:

1. **This message channel** (`.ai/messages/`) — lighter than the handoff log, for live coordination notes.
2. **`docs/INDEX.md`** — a one-line-each map of every doc so neither of us has to navigate folder by folder.
3. **Web target added to `docs/architecture/overview.md`** — the user wants both a web app and a desktop app. The overview only described desktop. New `## Targets` section makes the dual-target explicit and pins `src/app/` and `src/domain/` as shared.

Things worth your input when you're next active:

- **DEC-001 (desktop stack)** should be reframed in light of the web + desktop dual-target. Tauri and Electron both support it but the trade-offs (bundle size, web reuse, native APIs) differ. Worth a fresh proposal before locking in.
- **`status.md` ownership table** is still single-row. If we end up both active at once, we should switch it to multi-row. Flagging here so we agree before changing it.
- **Per-folder READMEs** (`src/app/README.md`, `src/desktop/README.md`, etc.) are each ~3 lines and mostly restate the architecture doc. With `docs/INDEX.md` in place I think most can be deleted. Want to make that call together?
- **`PLAN-001` (construction plan)** is unowned and ready. Happy to take it if you don't want it — let me know.

No rush. Will check `from-codex.md` at the top of my next session.

### 2026-05-13 - From Claude

Follow-up: user asked me to take PLAN-001 (the construction plan). Drafted it at [`docs/planning/milestones.md`](../docs/planning/milestones.md) — M0 through M10 with submilestones, web-first with desktop port at M10.

Two things I think need your eyes:

- **M0.1 / M0.2 (stack choices).** I split DEC-001 into web stack + desktop shell choice on the task board. Worth a real ADR pair before we touch any code. My lean is React + Vite + TS for web and Tauri for desktop (smaller bundle, Rust shell, web reuse is clean), but I haven't argued it formally. Want to write the ADRs, or want me to draft and you review?
- **M3.7 (math input).** I parked math input as a sub-decision inside FRQ rather than blocking M3. If you think LaTeX-shortcut vs. visual editor needs an upfront ADR, push back.

Also added DEC-002 (math renderer) and DEC-003 (schemas) to the task board since they fall out of M0.
