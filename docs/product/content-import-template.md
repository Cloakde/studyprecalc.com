# Original Question Pack Import Template

This guide is for owners preparing original MCQ and FRQ packs for the no-code Content Manager. It
does not require source-code edits. Use it with
`content/templates/original-question-pack-template.json`.

Do not copy AP, College Board, textbook, test-prep, or third-party prompts, diagrams, rubrics,
scoring notes, images, or videos unless usage rights are confirmed. Write original questions,
solutions, rubrics, and media.

## Pack Checklist

Before importing a pack, confirm:

- Every question is original and has a stable lowercase `id`.
- `publicationStatus` is `draft` until the owner has reviewed the imported question in the app.
- `unit`, `topic`, `difficulty`, `calculator`, `section`, and `tags` match
  `docs/product/content-taxonomy.md`.
- Each prompt includes all information needed to answer the question.
- Every image, graph, or table has meaningful `alt` text that describes what the student needs from
  the visual.
- Every video explanation has a `transcriptPath`; omit the `video` object until the transcript is
  ready.
- Each explanation includes a `summary`, ordered `steps`, and at least one `commonMistakes` entry.
- MCQs have exactly four choices, IDs `A` through `D`, one correct answer, and feedback for every
  choice.
- FRQs have one or more parts, complete `sampleResponse` text, `expectedWork`, and point-bearing
  rubric criteria.

## Template Files

- `content/templates/original-question-pack-template.json`: Draft import file with one MCQ shell and
  one FRQ shell.
- `content/templates/README.md`: Short owner notes for copying and filling the template.

Make a copy of the JSON template for each pack. Replace every `OWNER_TODO` value and every
`example.com` media URL before publishing. Leave unused optional sections out of the finished JSON,
especially unused `assets`, `explanation.assets`, or `explanation.video` blocks.

## Media Placeholders

Use `assets` for prompt-side visuals and `explanation.assets` for solution-side visuals. Each visual
needs:

- `id`: Short stable label, such as `mcq-001-prompt-graph`.
- `type`: `image`, `graph`, or `table`.
- `path`: One of:
  - an HTTPS image URL,
  - a static/public app path,
  - `supabase-image:<storage_path>` after cloud upload,
  - `local-image:<id>` for browser-local drafts only.
- `alt`: A sentence naming the important visual information, not just `graph` or `image`.
- `caption`: Optional short visible label.

For production publishing, do not rely on `local-image:<id>` or `local-video:<id>` references. Those
exist only in the browser profile that created them. Use cloud-uploaded images or approved public
URLs, and use an approved external video link with a transcript.

## Publication Status

Use these statuses:

- `draft`: Safe default for imports; visible to admins for review.
- `published`: Visible to students after readiness review.
- `archived`: Hidden from students and kept for audit/history.

New packs should import as `draft`. Publish from the Content Manager only after previewing the
question and clearing readiness blockers.

## Validate And Import

1. Copy `content/templates/original-question-pack-template.json` to a new pack file.
2. Fill every placeholder with original content and remove unused optional media blocks.
3. To validate with the repo command, place the completed pack under `content/questions/`.
4. Run `npm run validate:content`.
5. Start the app with `npm run dev`.
6. Sign in as an admin.
7. Open `Manage Content`, choose `Import`, and select the completed JSON file.
8. Review the Content Readiness Report.
9. Preview each imported question, fix blockers, then publish only the questions that are ready.
10. Export a backup JSON after import so the owner has a copy of the admin workspace state.

If `npm run validate:content` passes but the Content Readiness Report still shows warnings, treat
the report as the launch-quality checklist. The CLI command confirms schema and authoring metadata;
the admin report catches readiness details such as weak alt text, missing FRQ work, and local media
publish blockers.
