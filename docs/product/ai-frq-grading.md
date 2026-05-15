# AI FRQ Grading

## Prototype Scope

AI FRQ grading is a prototype foundation for rubric-aligned feedback on free-response work. It is
off by default and has no UI entry point in this milestone.

The prototype supports:

- Provider-neutral FRQ grading request shapes.
- Gemini-ready configuration metadata.
- Rubric criterion feedback, part summaries, score totals, and review flags.
- Per-account daily usage counting.
- Browser-local storage for feedback results and usage records.

The prototype does not:

- Call Gemini or any other external AI API.
- Require a paid service.
- Replace rubric scoring, teacher review, or student self-review.
- Add authored College Board questions, rubrics, images, or assets.

## Configuration

The feature is available only when explicitly configured:

- `VITE_AI_FRQ_GRADING_ENABLED=true`
- `VITE_AI_FRQ_PROVIDER=gemini`
- `VITE_AI_FRQ_GEMINI_MODEL`

Optional prototype settings:

- `VITE_AI_FRQ_DAILY_LIMIT`
- `VITE_AI_FRQ_FEEDBACK_RETENTION_DAYS`
- `VITE_AI_FRQ_PROXY_ENDPOINT`
- `VITE_AI_FRQ_GEMINI_API_KEY_ENV`

Provider calls should be added later through a backend/proxy boundary. Browser code should not
expose secret provider API keys.
