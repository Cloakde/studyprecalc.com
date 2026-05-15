# 0011 - AI FRQ Grading Prototype Foundation

## Status

Accepted

## Context

M16 needs an AI-assisted FRQ grading prototype without making the app depend on a paid AI service or
calling external AI APIs from the current codebase. The design needs to stay provider-neutral while
leaving a clear path for Gemini configuration later.

## Decision

Add a disabled-by-default AI grading foundation in the domain and data layers.

- Configuration resolves from explicit `VITE_AI_FRQ_*` values and remains unavailable unless
  `VITE_AI_FRQ_GRADING_ENABLED=true`, `VITE_AI_FRQ_PROVIDER=gemini`, and
  `VITE_AI_FRQ_GEMINI_MODEL` are all present.
- Gemini is represented as a provider config with model, optional future key env-var name, and
  optional future proxy endpoint, but no API client is implemented.
- FRQ grading request and result shapes are provider-neutral and include rubric-level feedback,
  part-level feedback, score metadata, and safety metadata that records `externalApiCalled: false`.
- Daily usage limits are pure domain logic keyed by account and UTC date.
- Browser-local storage persists prototype feedback and usage records behind a dedicated
  `precalcapp.aiGrading.v1` key.

## Consequences

- The shipped app remains off by default and does not require Gemini credentials or paid services.
- Future UI work can check `isAiGradingAvailable` before showing AI grading controls.
- Future provider adapters should sit behind the request/result contract and should prefer a server
  proxy over browser-exposed secret keys.
- Stored AI feedback is prototype assistance only and should remain clearly secondary to rubric and
  teacher/admin review.
