# Question Model

This document describes the intended educational content model. It is not final implementation code.

## Shared Fields

Every question should have:

- `id` - stable unique identifier.
- `type` - `mcq` or `frq`.
- `unit` - canonical AP Precalculus CED unit label from `docs/product/content-taxonomy.md`, such as `Unit 1: Polynomial and Rational Functions`.
- `topic` - canonical CED topic label from the taxonomy, such as `1.12 Transformations of Functions`.
- `skill` - original author-defined skill being practiced.
- `difficulty` - approximate difficulty level.
- `prompt` - original student-facing question prompt.
- `assets` - optional original images, graphs, tables, or media references.
- `answer` - correct answer data for the original question.
- `explanation` - original conceptual explanation.
- `steps` - ordered original solution steps.
- `tags` - search and filtering tags.

## Content Rights And CED Metadata

The app uses AP Precalculus CED unit and topic labels as metadata only. Question prompts, answer choices, FRQ parts, explanations, scoring criteria, sample responses, images, graphs, tables, and videos must be owner-authored or otherwise rights-cleared. Do not import real College Board released questions, diagrams, rubrics, scoring notes, or sample responses into app content unless the user explicitly confirms usage rights.

The `unit` and `topic` fields should follow the canonical labels in `docs/product/content-taxonomy.md`. Use `skill` and `tags` for local instructional detail rather than changing CED topic names.

## Multiple Choice

Multiple-choice questions should add:

- `choices` - answer choices with stable IDs.
- `correctChoiceId` - correct answer choice ID.
- `choiceExplanations` - optional explanation for each answer choice.

## Free Response

Free-response questions should add:

- `parts` - one or more sub-parts.
- `scoringGuidelines` - rubric points and criteria.
- `sampleResponses` - optional example responses.
- `expectedWork` - key math steps or reasoning patterns.

## Exam Mode Readiness

Exam modes use owner-authored `Question` objects rather than bundled proprietary content.

- Unit practice exams are available for Units 1-4.
- AP prep exams intentionally use Units 1-3 only; Unit 4 remains available for course practice but is excluded from AP prep readiness and selection.
- Student-facing exam readiness counts published questions by default.
- Admin tooling may opt into draft questions for preview/readiness planning.
- Each exam blueprint declares question-type counts and timed/untimed duration metadata.
- Score summaries should keep pending FRQ manual/self-scoring separate from scored misses.

## Future Video Support

Questions can later include:

- `videoExplanationId`
- `videoUrl`
- `transcriptPath`
- `thumbnailPath`

Keep videos as references, not embedded blobs in question data.
