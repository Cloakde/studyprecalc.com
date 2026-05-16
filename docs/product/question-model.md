# Question Model

This document describes the intended educational content model. It is not final implementation code.

## Shared Fields

Every question should have:

- `id` - stable unique identifier.
- `type` - `mcq` or `frq`.
- `unit` - AP Precalculus unit or topic grouping.
- `skill` - specific skill being practiced.
- `difficulty` - approximate difficulty level.
- `prompt` - student-facing question prompt.
- `assets` - optional images, graphs, tables, or media references.
- `answer` - correct answer data.
- `explanation` - conceptual explanation.
- `steps` - ordered solution steps.
- `tags` - search and filtering tags.

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
