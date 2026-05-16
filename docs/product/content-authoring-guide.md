# Content Authoring Guide

This guide is for authors creating AP Precalculus practice content through JSON imports, exports, or the no-code content manager. Keep every question original and use the taxonomy in `docs/product/content-taxonomy.md` for units, topics, and tags.

For an owner-friendly pack shell and import checklist, start with
`docs/product/content-import-template.md` and
`content/templates/original-question-pack-template.json`.

## Authoring Workflow

1. Choose `type`, `unit`, `topic`, `skill`, `difficulty`, `calculator`, and `section` before writing the prompt.
2. Draft the prompt and answer model.
3. Add a complete explanation with ordered steps and common mistakes.
4. Add video metadata only after a transcript file exists, or upload a local draft video through the no-code manager.
5. Run `npm run validate:content` before handoff.

## Shared Metadata

- `id`: Stable, unique, lowercase identifier. Recommended pattern: `pc-{type}-{topic-slug}-{###}`.
- `unit`: Use the exact unit value from the taxonomy.
- `topic`: Use the closest controlled topic value from the taxonomy.
- `skill`: Write the specific student action, such as `Interpret exponential growth parameters`.
- `difficulty`: Use `intro`, `medium`, or `advanced`.
- `calculator`: Use `none` for no calculator and `graphing` for graphing calculator.
- `section`: Use `practice`, `mcq-a`, `mcq-b`, `frq-a`, or `frq-b`.
- `tags`: Use 3 to 6 unique kebab-case tags from the taxonomy. Include one calculator tag.

## Multiple Choice Questions

MCQs should contain exactly four choices with IDs `A`, `B`, `C`, and `D`.

- Make one choice unambiguously correct.
- Make distractors plausible and tied to a real misconception.
- Put a concise explanation on every choice, not only the correct one.
- Avoid answer choices like `All of the above`, `None of the above`, or choices that differ only by formatting.
- Keep calculator expectations aligned with `calculator` and `section`.

Minimum MCQ review checklist:

- The correct choice ID appears in `choices`.
- Each incorrect choice explanation names the error or misconception.
- The prompt can be answered from the provided information and assets.
- Any graph, table, or image has descriptive alt text.

## Free Response Questions

FRQs should use `parts` for each sub-question and include enough scoring detail for self-review.

- Use short part IDs such as `a`, `b`, and `c`.
- Each part needs a student-facing `prompt`.
- `sampleResponse` should model a complete, mathematically valid response.
- `expectedWork` should list the key reasoning steps, not every algebraic micro-step.
- `rubric` criteria should be point-bearing and independently checkable.
- Total rubric points should match the intended scoring scale for the question.

Minimum FRQ review checklist:

- Each part can be scored from the rubric without outside notes.
- Expected work covers setup, computation, and interpretation when relevant.
- Sample responses include units and contextual meaning when the prompt is contextual.
- Rubric criteria avoid vague language like `good explanation`.

## Explanations

Every question needs an `explanation` object.

- `summary`: One or two sentences naming the central idea.
- `steps`: Ordered solution steps in student-readable language.
- `commonMistakes`: At least one non-empty misconception or error pattern.
- Use LaTeX math inside `$...$` for inline math.
- Keep explanations conceptual first, then procedural.

The content validator now flags missing, empty, or blank common mistakes because those entries are authoring metadata used for review and future remediation features.

## Images, Graphs, and Tables

Use image assets for prompt visuals and solution visuals such as graphs, residual plots, tables, annotated screenshots, or diagrams.

- `assets`: Prompt-side images shown before the student answers.
- `explanation.assets`: Solution-side images shown only after the answer explanation is revealed.
- `asset.type`: Use `image`, `graph`, or `table`.
- `asset.path`: Public/static path, remote HTTP(S) image URL, or uploaded `local-image:<id>` reference.
- `asset.alt`: Required accessible description of the visual.
- `asset.caption`: Short label shown under the visual. Treat captions as required for graphs and
  tables even though the JSON field is optional.

Prompt and explanation images are reviewed separately in readiness reports. Before publishing:

- Prompt images should include all information needed to attempt the question without seeing the
  answer.
- Explanation images should clarify solution reasoning, not introduce a new unscored requirement.
- Graph/table alt text should name the mathematical feature students need, such as intercepts,
  asymptotes, finite differences, or interval behavior. Avoid generic alt text such as `graph`,
  `image`, or the file name.
- Do not leave placeholder media hosts such as `example.com` or `OWNER_TODO` paths in image,
  thumbnail, transcript, or video URLs.

For cloud-published content, uploaded images are stored in the private Supabase `question-images`
bucket and linked through stable app media references. Do not paste short-lived signed URLs into
question JSON; the app resolves stable references to signed URLs only when rendering for an
authorized user.

Cloud image upload rules:

- Maximum size: 1 MB per image.
- Allowed formats: PNG, JPEG, WebP, and GIF.
- SVG is not allowed for launch.
- Do not upload AP, College Board, or third-party copyrighted prompts, diagrams, rubrics, or images
  unless usage rights are confirmed.

In local fallback mode, uploaded images are stored in browser/app storage. Exported JSON keeps the
`local-image:<id>` reference, not the image file, so local packs are not portable across browsers
unless the images use public URLs or are reuploaded in the cloud manager.

## Video Explanations

Use video references for checked-in content.

- `video.url`: Approved external HTTP(S) video URL for publishable content, or a `local-video:<id>`
  reference for local draft review only.
- `video.transcriptPath`: Required whenever `video.url` exists.
- `video.thumbnailPath`: Optional thumbnail asset.
- `video.durationSeconds`: Optional positive integer duration.

Transcript files should be plain text or markdown and should include the spoken explanation, important equations, and descriptions of visual actions. If a video is not ready for transcript review, leave the entire `video` object out instead of adding a URL alone.

Video files are not stored in Supabase app storage for now. YouTube, Vimeo, or another approved
embed/link source is the expected production approach. Local draft video uploads may exist only in
the browser profile that created them and should not be treated as production-ready content.

For launch readiness, external videos should also include a thumbnail and duration. Missing
thumbnail or duration metadata is a warning, while a missing transcript or placeholder media URL is
a blocker. Browser-local videos are blocked by the first-pack check unless you explicitly run a
local dry run with `--allow-local-media`.

## Validation Issues

`npm run validate:content` checks schema validity and authoring metadata. Current metadata checks include:

- `duplicate-question-id`: The same question ID appears more than once across validated content files.
- `duplicate-tag`: A question repeats a tag after trimming and case normalization.
- `empty-common-mistakes`: `commonMistakes` is missing, empty, or contains a blank entry.
- `missing-video-transcript`: A video URL exists without a non-empty transcript path.

Fix validation issues before content handoff so no-code authors can rely on consistent metadata in exported packs.
