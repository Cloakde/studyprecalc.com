# 0012 - Gemini FRQ Grading Proxy Boundary

## Status

Accepted

## Context

M21 needs a safe design for future Gemini-backed FRQ grading. The current app is still a static
Vite frontend with Supabase-backed auth, content, progress, and media when cloud configuration is
available. The existing M16 AI grading foundation intentionally does not call Gemini or any other
external provider.

The next design step is a backend/proxy boundary that can protect provider credentials, enforce
quotas, and keep AI feedback secondary to rubric and teacher/admin review.

## Decision

Future Gemini FRQ grading calls must go through a server-side proxy. The browser must never receive
or embed a Gemini API key, service-role key, or other provider secret.

The proxy may be a Supabase Edge Function or another server runtime, but it must preserve these
boundaries:

- Store the Gemini API key only in backend secret storage, such as an Edge Function secret or server
  environment variable named outside the `VITE_` namespace.
- Expose only browser-safe frontend configuration, such as a feature flag, a public proxy endpoint,
  and non-secret model display metadata.
- Authenticate every grading request with the user's Supabase session and derive account identity
  from server-verified auth claims, not from a browser-supplied user id.
- Build the provider prompt on the server from canonical question, rubric, and student response
  fields. The client can send the structured grading request, but the server owns prompt assembly,
  provider parameters, safety instructions, and response validation.
- Return a normalized app-level grading response instead of raw Gemini output.
- Enforce rate limits, daily quotas, payload limits, moderation/safety checks, and an emergency
  kill switch before calling the provider.
- Persist only the minimum operational data needed for quota enforcement, abuse review, debugging,
  and teacher/admin review.

## Request Boundary

The browser-to-proxy request should use the existing provider-neutral domain shape and include only
the fields needed for rubric feedback:

- `requestId`: client-generated idempotency key.
- `questionId` and `attemptId`: app identifiers for traceability.
- `question`: prompt text, FRQ parts, public-facing directions, and relevant metadata.
- `rubric`: criterion ids, point values, descriptions, and expected work.
- `studentResponse`: per-part student text and optional student-uploaded work references if future
  image ingestion is approved.
- `clientContext`: app version, locale, and requested feedback mode.

The proxy should ignore any browser-supplied role, quota, score override, provider key, provider
URL, or model value. Those values must come from server configuration and server-side authorization.

## Response Boundary

The proxy should return a normalized response shaped for the app, not a provider-native payload:

- `requestId`, `attemptId`, `questionId`, `provider`, `model`, and `createdAt`.
- `criteria`: per-rubric suggested score, max score, rationale, evidence, and confidence.
- `parts`: per-part summary, missing work, next-step feedback, and confidence.
- `summary`: concise feedback suitable for student display.
- `flags`: safety, uncertainty, possible off-topic work, possible prompt injection, and
  teacher/admin review indicators.
- `usage`: quota bucket, request count for the day, and optional token/cost metadata.
- `review`: `required`, `reason`, and reviewer workflow status.

The response must not become an official grade by itself. Any score returned by the proxy is a
suggestion that remains subordinate to the authored rubric, student self-review flow, and future
teacher/admin review.

## Limits And Abuse Controls

Initial production defaults should be conservative and adjustable only on the server:

- Require an authenticated account for all AI grading requests.
- Default student quota: 5 successful grading requests per UTC day.
- Default admin/teacher preview quota: 50 successful grading requests per UTC day.
- Default account burst limit: 10 requests per hour.
- Default IP burst limit: 30 requests per hour, with stricter limits for repeated failures.
- Allow only one active grading request per account by default.
- Reject requests over a configured payload size limit before provider calls.
- Deny requests for archived, unpublished, or inaccessible questions.
- Deny requests if the attempt does not belong to the authenticated user unless the requester is an
  authorized admin/teacher reviewing student work.
- Run server-side content safety checks before provider calls and set review flags on questionable
  responses.
- Add a server-side kill switch that makes the proxy return a disabled response without contacting
  Gemini.

## Storage And Retention

The proxy should separate durable product data from short-lived operations logs:

- Store quota counters by account, UTC date, and provider without raw prompt text.
- Store normalized AI feedback with the attempt only when the user requests grading and the feature
  is enabled.
- Keep provider request/response debug logs off by default. If temporarily enabled, redact provider
  keys, auth tokens, IP addresses where possible, and any unrelated personal data.
- Default operational log retention: 14 days.
- Default AI feedback retention: use the product setting, currently represented by
  `VITE_AI_FRQ_FEEDBACK_RETENTION_DAYS` in the prototype, until a server-side setting replaces it.
- Never store raw Gemini responses as the canonical app result. Validate and store the normalized
  response shape.
- Do not include secrets, full provider prompts, invite codes, passwords, TOTP seeds/codes, or
  service-role keys in screenshots, docs, commits, or saved evidence.

## Teacher/Admin Review

AI feedback should support review, not bypass it.

- Mark low-confidence, safety-flagged, off-topic, quota-abuse, or score-discrepant feedback as
  requiring teacher/admin review.
- Give admins/teachers a future workflow to accept, edit, dismiss, or hide AI feedback.
- Keep a reviewer audit trail with reviewer id, action, timestamp, and reason.
- Label student-visible feedback as AI-assisted and rubric-aligned, not authoritative.
- Do not use AI feedback to unlock, withhold, or permanently score student progress without human
  review and a separate product decision.

## Consequences

- A future Gemini integration requires backend work before any provider call is made.
- Vercel/static frontend environment variables cannot hold provider secrets because `VITE_` values
  are embedded into browser code.
- The existing M16 provider-neutral request and result types remain useful, but provider execution,
  quotas, retention, and audit controls must move server-side before launch.
- Testing can validate request/response normalization and quota behavior without contacting Gemini.
