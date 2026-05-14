# 0004 - Question And Attempt Schemas

Date: 2026-05-13

## Status

Accepted

## Context

The project needs a portable content format before question rendering, scoring, and review flows can be reliable.

## Decision

Use JSON question sets validated by Zod schemas in `src/data/schemas/`.

Question content lives in `content/questions/`. Runtime code imports the content, validates it, and exposes typed question objects to the app.

Attempt records are also validated by Zod and stored through a future persistence layer.

## Rationale

- JSON is easy for non-engineer collaborators to inspect and edit.
- Zod provides runtime validation and TypeScript types.
- Keeping schemas separate from UI lets content validation run in scripts and tests.

## Consequences

- Every question must include metadata, prompt text, answer data, explanations, and steps.
- MCQ and FRQ use a shared base shape with type-specific fields.
- Video explanations are represented as optional references.
- Persistence can evolve from browser-local storage to backend storage without changing the attempt contract.
