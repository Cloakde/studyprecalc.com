# First-Pack Launch Checklist

Use this checklist before an owner-authored first question pack is shown to students. The command is
local-only: it reads JSON question sets, validates schema and authoring metadata, and runs the
existing content readiness checks. It does not connect to Supabase and does not need live Supabase
credentials.

## Command

Run against an exported pack file:

```sh
npm run check:first-pack -- path/to/owner-first-pack.json
```

Run against all JSON files in the default checked-in content folder:

```sh
npm run check:first-pack
```

Run a final export check after publishing the pack in Manage Content:

```sh
npm run check:first-pack -- path/to/owner-first-pack.json --require-published
```

The command exits with code `0` only when every required launch gate passes. Warnings print in the
report but do not fail the command unless `--fail-on-warnings` is passed.

## What It Checks

- Question-set JSON parses and matches the app question schema.
- At least one non-archived question exists by default.
- Archived questions are not included unless `--allow-archived` is passed.
- Existing authoring metadata checks pass: duplicate IDs, duplicate tags, common mistakes, and video
  transcript metadata.
- Existing content readiness blockers are clear: prompts, explanations, MCQ feedback, FRQ expected
  work/rubrics, image alt text, and publish blockers.
- Browser-local image or video references are blocked by default because they are not portable for
  students. Use `--allow-local-media` only for a local dry run before cloud upload.
- With `--require-published`, every active question must be marked `publicationStatus:
"published"` in the checked export.

## Recommended Owner Flow

1. Author only original questions, explanations, rubrics, and media. Do not use College Board or
   third-party copyrighted prompts, images, or rubrics unless rights are confirmed.
2. Export the draft pack from Manage Content or save the JSON file under `content/questions/`.
3. Run:

   ```sh
   npm run check:first-pack -- path/to/owner-first-pack.json
   ```

4. Fix every `[FAIL]` item and review `[WARN]` items for weak metadata or weak alt text.
5. Import or confirm the pack in Manage Content, publish the intended student-visible questions, and
   export the pack again.
6. Run:

   ```sh
   npm run check:first-pack -- path/to/owner-first-pack.json --require-published
   ```

7. After this local check passes and production Supabase is configured, run the live admin/student
   smoke checklist from `docs/operations/production-activation.md`.

## Useful Options

- `--min-questions <n>`: require at least `n` non-archived questions.
- `--require-published`: require every active question to be marked published in the export.
- `--fail-on-warnings`: fail if readiness warnings remain.
- `--allow-local-media`: allow `local-image:` and `local-video:` references for a local-only dry
  run.
- `--allow-archived`: warn instead of fail when archived questions are included.
