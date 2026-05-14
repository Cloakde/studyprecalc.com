# 0003 - Math Renderer

Date: 2026-05-13

## Status

Accepted

## Context

The app needs to render mathematical notation in prompts, choices, explanations, solution steps, and FRQ rubrics.

## Decision

Use KaTeX for math rendering.

## Rationale

- KaTeX is fast and works well in static web apps.
- It is suitable for AP Precalculus notation.
- It is easier to keep responsive than a heavier renderer.
- It can render inline and display math from LaTeX fragments in question content.

## Consequences

- Authored question content should use LaTeX between `$...$` or `$$...$$`.
- Accessibility work remains necessary for graph images, tables, and complex expressions.
- If later content requires MathJax-specific behavior, this decision should be revisited.
