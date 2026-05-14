# 0005 - Local-First Content Management

Date: 2026-05-13

## Status

Accepted

## Context

The app owner needs to manage questions, solutions, and video explanation references without editing code or JSON files directly.

The current app is a static web app. A static app cannot update a deployed global question bank by itself without a backend, database, authentication, and an admin publishing workflow.

## Decision

Build a no-code content manager into the app with local-first storage for v1.

The content manager can:

- Create MCQ and FRQ questions.
- Edit authored questions.
- Delete authored questions.
- Add solution summaries and step-by-step solutions.
- Add per-choice MCQ explanations.
- Add FRQ sample responses and rubric criteria.
- Add optional video explanation references.
- Import and export question packs as JSON.

## Rationale

- The app owner can author and test content without coding.
- Authored content uses the same Zod schemas as built-in content.
- Import/export keeps content portable before a backend exists.
- The student practice app immediately consumes locally authored content.

## Consequences

- Locally authored content is stored in browser `localStorage`.
- Content is device/browser-specific until backend storage is added.
- A future CMS/backend should preserve the same question schema so content can migrate cleanly.
- Public website-wide publishing still needs a later server or hosted CMS milestone.
