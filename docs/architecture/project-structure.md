# Project Structure

```text
PrecalcApp/
  .ai/
    status.md
    task-board.md
    handoff-log.md
    handoff-template.md
  docs/
    product/
      app-vision.md
      question-model.md
    architecture/
      overview.md
      project-structure.md
    workflow/
      agent-workflow.md
      task-template.md
    decisions/
      0001-initial-project-layout.md
  src/
    app/
      components/
      routes/
      styles/
    domain/
      questions/
      attempts/
      sessions/
      scoring/
      explanations/
      media/
    data/
      schemas/
      seed/
      supabase/
    shared/
  supabase/
    schema.sql
  content/
    questions/
    explanations/
    media/
  assets/
    icons/
    images/
    videos/
  tests/
    unit/
    integration/
    fixtures/
  scripts/
```

## Purpose

This structure allows Codex and Claude to work in parallel without touching the same files unnecessarily.

- Product thinking goes in `docs/product/`.
- Technical planning goes in `docs/architecture/`.
- Multi-agent workflow goes in `docs/workflow/`.
- Source code goes in `src/`.
- Educational content goes in `content/`.
- Static files go in `assets/`.
- Verification goes in `tests/`.
