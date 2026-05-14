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

## Future Video Support

Questions can later include:

- `videoExplanationId`
- `videoUrl`
- `transcriptPath`
- `thumbnailPath`

Keep videos as references, not embedded blobs in question data.
