# Gemini FRQ Grading Proxy Runbook

This runbook defines the future backend boundary for Gemini-assisted FRQ feedback. It is a design
and operations guide only. The current app must not call Gemini or any other external AI provider.

## Launch Gate

Do not enable provider-backed grading until all of these are complete:

- A server-side proxy exists and has been reviewed.
- Gemini credentials are stored only in backend secret storage.
- No provider secret uses a `VITE_` environment variable.
- Supabase auth is verified before every request.
- Server-side quotas, rate limits, payload limits, and a kill switch are active.
- AI feedback storage, log retention, and reviewer audit behavior are implemented.
- Teacher/admin review rules are available for flagged feedback.
- Tests prove disabled mode, quota exhaustion, unauthorized access, malformed payloads, and provider
  error handling without making live Gemini calls.

## Server-Side Key Handling

Frontend builds must never contain provider secrets.

Allowed frontend values:

```txt
VITE_AI_FRQ_GRADING_ENABLED=true
VITE_AI_FRQ_PROVIDER=gemini
VITE_AI_FRQ_GEMINI_MODEL=<public model display/config value>
VITE_AI_FRQ_PROXY_ENDPOINT=<public proxy route>
```

Forbidden frontend values:

```txt
VITE_GEMINI_API_KEY=<secret>
VITE_AI_FRQ_GEMINI_API_KEY=<secret>
VITE_AI_FRQ_PROVIDER_SECRET=<secret>
```

Server-only values should be configured in the proxy runtime, not in the Vite app:

```txt
GEMINI_API_KEY=<secret>
AI_FRQ_PROXY_ENABLED=false
AI_FRQ_STUDENT_DAILY_QUOTA=5
AI_FRQ_ADMIN_DAILY_QUOTA=50
AI_FRQ_ACCOUNT_HOURLY_LIMIT=10
AI_FRQ_IP_HOURLY_LIMIT=30
AI_FRQ_LOG_RETENTION_DAYS=14
AI_FRQ_FEEDBACK_RETENTION_DAYS=30
```

Use the provider key only inside the proxy process. Do not return it to the browser, write it to
logs, include it in error messages, or place it in screenshots/evidence.

## Request Shape

The browser should send a provider-neutral request. The proxy validates it, checks authorization,
loads any required canonical server-side data, and assembles the provider prompt itself.

```json
{
  "requestId": "uuid-or-stable-idempotency-key",
  "questionId": "frq-unit-1-rate-001",
  "attemptId": "attempt-uuid",
  "question": {
    "type": "frq",
    "prompt": "Original app-authored prompt text.",
    "parts": [
      {
        "id": "a",
        "prompt": "Part A prompt text."
      }
    ],
    "unit": "Polynomial and rational functions",
    "topic": "Rates of change"
  },
  "rubric": {
    "criteria": [
      {
        "id": "a-rate",
        "partId": "a",
        "maxPoints": 1,
        "description": "Identifies and computes the requested rate."
      }
    ],
    "expectedWork": [
      "Uses the change in output divided by change in input for the requested interval."
    ]
  },
  "studentResponse": {
    "parts": [
      {
        "partId": "a",
        "text": "Student-entered work."
      }
    ]
  },
  "clientContext": {
    "appVersion": "0.1.0",
    "feedbackMode": "rubric-feedback"
  }
}
```

The proxy must ignore any client-supplied provider API key, provider URL, model override, user role,
quota override, official score, or reviewer status.

## Response Shape

The proxy should return a normalized app response. Do not return raw Gemini JSON as the app
contract.

```json
{
  "requestId": "uuid-or-stable-idempotency-key",
  "questionId": "frq-unit-1-rate-001",
  "attemptId": "attempt-uuid",
  "provider": "gemini",
  "model": "server-configured-model",
  "createdAt": "2026-05-15T12:00:00.000Z",
  "criteria": [
    {
      "criterionId": "a-rate",
      "partId": "a",
      "suggestedPoints": 1,
      "maxPoints": 1,
      "confidence": "medium",
      "rationale": "The response uses the correct rate setup.",
      "evidence": ["change in output divided by change in input"]
    }
  ],
  "parts": [
    {
      "partId": "a",
      "summary": "The setup is aligned with the rubric.",
      "missingWork": [],
      "nextStep": "State the interval clearly."
    }
  ],
  "summary": "Rubric-aligned feedback for the student's current response.",
  "flags": {
    "reviewRequired": true,
    "reviewReasons": ["medium-confidence"],
    "safety": [],
    "possiblePromptInjection": false
  },
  "usage": {
    "quotaDate": "2026-05-15",
    "requestsUsedToday": 2,
    "requestsRemainingToday": 3
  },
  "review": {
    "status": "pending",
    "required": true,
    "reason": "medium-confidence"
  }
}
```

Errors should also be normalized:

```json
{
  "error": {
    "code": "quota_exceeded",
    "message": "Daily AI feedback limit reached.",
    "retryAfterSeconds": 3600
  }
}
```

Do not expose provider stack traces, raw provider responses, auth tokens, or secrets in errors.

## Rate Limits And Quotas

Recommended first production limits:

| Limit                          |               Default | Notes                                                            |
| ------------------------------ | --------------------: | ---------------------------------------------------------------- |
| Student successful requests    |         5 per UTC day | Count only completed provider attempts unless abuse is detected. |
| Admin/teacher preview requests |        50 per UTC day | For authoring QA and review, not bulk grading.                   |
| Account burst                  |           10 per hour | Applies before provider calls.                                   |
| IP burst                       |           30 per hour | Tighten on repeated auth, validation, or safety failures.        |
| Active account requests        |           1 at a time | Prevents accidental duplicate submissions.                       |
| Payload size                   | Server-configured cap | Reject before prompt assembly or provider calls.                 |

Quota counters should key by authenticated account id, role, provider, and UTC date. IP limits should
use a privacy-conscious hash or provider platform rate-limit primitive where possible.

## Abuse Controls

The proxy should reject or flag requests when:

- The user is not authenticated.
- The question is not an FRQ.
- The question is archived, unpublished, or inaccessible to the requester.
- The attempt belongs to a different student and the requester is not an authorized admin/teacher.
- The payload is too large, malformed, or missing rubric criteria.
- The request tries to override provider, model, role, quota, score, or reviewer fields.
- The student response appears to include prompt-injection instructions aimed at the grader.
- The account or IP has repeated validation, safety, or quota failures.

Operational controls:

- A server-side `AI_FRQ_PROXY_ENABLED=false` kill switch.
- Provider timeout and retry limits with no infinite retries.
- Idempotency by `requestId` and `attemptId` to avoid duplicate billing.
- Structured audit events for allowed, denied, quota-exceeded, safety-flagged, provider-failed, and
  reviewer-action outcomes.
- Admin-visible status showing disabled, limited, degraded, or enabled state without exposing
  secrets.

## Storage And Log Retention

Store as little as possible.

Durable app data:

- Normalized AI feedback linked to the attempt when the user requests it.
- Review status, reviewer id, reviewer action, reviewer notes, and timestamps.
- Quota counters by account, role, provider, and UTC date.

Short-lived operations data:

- Request id, account id, provider, server-configured model, status, latency, quota bucket, and
  normalized error code.
- Token/cost metadata if available and safe to store.
- Redacted safety and validation flags.

Retention defaults:

- Operational logs: 14 days.
- Normalized AI feedback: 30 days by default unless the product retention setting says otherwise.
- Provider debug traces: off by default; if temporarily enabled, keep for no more than 7 days and
  redact raw provider keys, auth tokens, unrelated personal data, and full provider prompts where
  possible.

Do not store raw Gemini responses as canonical data. Validate and transform provider output into the
normalized response shape first.

## Teacher/Admin Review

AI feedback is advisory. It must not become the official score without a separate product decision
and human-review workflow.

Require teacher/admin review when:

- Confidence is low or medium for any scored criterion.
- The response is safety-flagged, off-topic, incomplete, or appears manipulated.
- Suggested points differ sharply from student self-score or rubric expectations.
- The request is part of authoring QA before publishing a new FRQ pack.
- Abuse controls flagged the account, IP, or request pattern.

Future reviewer actions:

- Accept feedback as visible guidance.
- Edit feedback before student display.
- Dismiss feedback.
- Hide feedback from the student.
- Mark feedback as provider error.

Every reviewer action should store reviewer id, action, reason, timestamp, and previous status.

## Verification Before Enablement

Before turning on provider-backed grading, run or add checks that cover:

- No `VITE_` variable contains a Gemini/provider secret.
- Disabled mode returns without contacting Gemini.
- Missing/invalid auth returns `401` or equivalent.
- Student cannot grade another student's attempt.
- Student cannot grade archived or unpublished questions.
- Quota exceeded returns a normalized error before provider calls.
- Payload limit returns a normalized error before provider calls.
- Provider timeout/failure returns a normalized retry-safe error.
- Idempotent retry returns the existing result or a clear in-progress response.
- Logs redact secrets and do not include raw provider keys.
- Teacher/admin review flags are set for low-confidence or safety-flagged responses.

Use mocks or fixtures for provider behavior in automated tests. Live Gemini calls require a separate
owner-approved smoke plan and must not run in default CI.
