# Content Taxonomy

This taxonomy gives no-code authors a controlled vocabulary for AP Precalculus question metadata. It keeps browsing, filtering, review sets, and validation reports consistent even when many people author content.

Use original question text and original assets only. Do not copy College Board prompts, diagrams, rubrics, scoring notes, or released-question wording unless the user has confirmed usage rights.

## Unit Values

Use these exact display strings in the `unit` field.

| Code     | `unit` value                                            | Exam status                                                    |
| -------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `unit-1` | `Polynomial and Rational Functions`                     | Assessed                                                       |
| `unit-2` | `Exponential and Logarithmic Functions`                 | Assessed                                                       |
| `unit-3` | `Trigonometric and Polar Functions`                     | Assessed                                                       |
| `unit-4` | `Functions Involving Parameters, Vectors, and Matrices` | Course content, not assessed on the AP Exam as of May 13, 2026 |

Source alignment: [AP Central's public AP Precalculus course page](https://apcentral.collegeboard.org/courses/ap-precalculus) lists four commonly taught units, with Unit 4 not assessed on the AP Exam. Use the College Board framework for alignment, but keep PrecalcApp questions, explanations, and rubrics original.

## Topic Values

Use one of these `topic` values when authoring. Put finer skill detail in `skill`, and use tags for filter facets.

### Polynomial and Rational Functions

- `Change in tandem`
- `Rates of change`
- `Polynomial function behavior`
- `Polynomial zeros and complex zeros`
- `Polynomial end behavior`
- `Rational function behavior`
- `Rational zeros, asymptotes, and holes`
- `Polynomial and rational expressions`
- `Function transformations`
- `Function model selection`
- `Function model construction`

### Exponential and Logarithmic Functions

- `Arithmetic and geometric sequences`
- `Linear and exponential change`
- `Exponential functions`
- `Exponential models`
- `Function composition`
- `Inverse functions`
- `Logarithmic expressions`
- `Logarithmic functions`
- `Exponential and logarithmic equations`
- `Logarithmic equations in context`
- `Exponential and logarithmic data modeling`
- `Semi-log plots`

### Trigonometric and Polar Functions

- `Periodic phenomena`
- `Sine, cosine, and tangent`
- `Sine and cosine graphs`
- `Sinusoidal functions`
- `Sinusoidal models`
- `Tangent function`
- `Inverse trigonometric functions`
- `Trigonometric equations`
- `Reciprocal trigonometric functions`
- `Equivalent trigonometric representations`
- `Polar coordinates`
- `Polar function graphs`
- `Rates of change in polar functions`

### Functions Involving Parameters, Vectors, and Matrices

- `Parametric functions`
- `Parametric motion`
- `Parametric rates of change`
- `Parametric circles and lines`
- `Implicitly defined functions`
- `Conic sections`
- `Parametrization`
- `Vectors`
- `Vector-valued functions`
- `Matrices`
- `Inverse and determinant of a matrix`
- `Linear transformations and matrices`
- `Matrices as functions`
- `Matrices in context`

## Tag Rules

- Use lowercase kebab-case: `rational-functions`, not `Rational Functions`.
- Use 3 to 6 tags for most questions.
- Do not duplicate tags within a question. The validator treats `models` and `Models` as duplicates.
- Prefer specific tags over broad repeats of the `unit` value.
- Include one calculator tag that matches `calculator`: `no-calculator` or `graphing-calculator`.
- Include `mcq` or `frq` only when it helps authors assemble mixed packs; the `type` field remains the source of truth.

## Controlled Tags

Use these tags first. Add a new tag only when it names a reusable search facet that is not already covered here.

| Category                      | Tags                                                                                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Question format               | `mcq`, `frq`, `multi-part`, `rubric`, `self-score`                                                                                                                                                 |
| Calculator                    | `no-calculator`, `graphing-calculator`                                                                                                                                                             |
| Representation                | `symbolic`, `graph`, `table`, `numeric`, `verbal`, `context`, `data`, `residuals`                                                                                                                  |
| Modeling                      | `models`, `modeling`, `growth`, `decay`, `regression`, `assumptions`, `interpretation`                                                                                                             |
| Function skills               | `rate-of-change`, `transformations`, `composition`, `inverse-functions`, `equations`, `inequalities`                                                                                               |
| Polynomial and rational       | `polynomial-functions`, `rational-functions`, `zeros`, `complex-zeros`, `end-behavior`, `asymptotes`, `holes`, `intercepts`, `expressions`                                                         |
| Exponential and logarithmic   | `exponential-functions`, `logarithmic-functions`, `logarithms`, `sequences`, `semi-log-plots`                                                                                                      |
| Trigonometric and polar       | `trigonometric-functions`, `sinusoidal-functions`, `sinusoidal-models`, `tangent-functions`, `inverse-trigonometric-functions`, `trigonometric-identities`, `polar-functions`, `polar-coordinates` |
| Parameters, vectors, matrices | `parametric-functions`, `implicit-functions`, `conics`, `vectors`, `vector-functions`, `matrices`, `linear-transformations`                                                                        |

## Examples

```json
{
  "unit": "Function Concepts",
  "topic": "Function transformations",
  "skill": "Identify the effect of a transformation",
  "tags": ["function-transformations", "translations", "graphs", "no-calculator"]
}
```
