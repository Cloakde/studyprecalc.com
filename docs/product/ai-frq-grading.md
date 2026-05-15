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

## Future Gemini Proxy Product Boundary

Gemini-backed feedback is a future backend feature, not a browser feature. The product experience
should treat AI output as rubric-aligned coaching that helps students revise work and helps
teachers/admins triage responses. It should not be presented as an official grade.

Student-facing behavior:

- Show AI feedback only when the server-side proxy is enabled and the student is authenticated.
- Keep rubric self-review and authored sample work visible as the primary scoring reference.
- Label AI feedback as AI-assisted and subject to review.
- Show clear daily-limit and unavailable-state messages without naming internal provider errors.
- Do not expose provider settings, model parameters, keys, quota overrides, or raw provider output.

Teacher/admin behavior:

- Give admins/teachers a future review queue for low-confidence, safety-flagged, off-topic, or
  score-discrepant feedback.
- Allow reviewers to accept, edit, dismiss, hide, or mark AI feedback as a provider error.
- Keep reviewer actions auditable with reviewer id, timestamp, action, and reason.
- Use admin preview quotas for authoring QA, not for bulk automatic grading.

## Future Proxy Contract

The browser should send a provider-neutral request to a server-side proxy. The proxy should validate
auth, derive the user and role from Supabase claims, enforce limits, assemble the Gemini prompt, and
return a normalized app response.

Required request concepts:

- `requestId`, `questionId`, and `attemptId`.
- FRQ prompt and parts.
- Rubric criteria, point values, and expected work.
- Student response by part.
- Browser-safe client context such as app version and feedback mode.

Required response concepts:

- Per-criterion suggested points, rationale, evidence, and confidence.
- Per-part summary, missing work, and next-step feedback.
- Overall summary suitable for student display.
- Safety, uncertainty, prompt-injection, and teacher/admin review flags.
- Quota usage metadata.
- Review status.

The app should store only the normalized response shape. Raw Gemini responses should not become the
product contract.

## Quotas And Retention

Initial product defaults for future provider-backed grading:

- Students: 5 successful AI feedback requests per UTC day.
- Admins/teachers: 50 preview requests per UTC day.
- Burst limits: 10 requests per account per hour and 30 requests per IP per hour.
- One active grading request per account by default.
- Operational logs: 14 days.
- Normalized feedback retention: 30 days by default, unless a future server-side setting changes it.

The proxy should reject unauthenticated requests, inaccessible questions, archived/unpublished
questions, malformed payloads, oversized payloads, quota exhaustion, and attempts to override
server-owned fields.

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

`VITE_AI_FRQ_GEMINI_API_KEY_ENV` may name a future server-side secret, but it must never contain the
actual key. Provider calls should be added later through the backend/proxy boundary described in
[Gemini FRQ Grading Proxy Runbook](../operations/gemini-frq-grading-proxy.md). Browser code must not
expose secret provider API keys.
