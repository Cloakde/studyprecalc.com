# Content Taxonomy

This taxonomy gives no-code authors a controlled vocabulary for AP Precalculus question metadata. It keeps browsing, filtering, review sets, and validation reports consistent even when many people author content.

Use original question text and original assets only. Do not copy College Board prompts, diagrams, rubrics, scoring notes, sample responses, released-question wording, or images unless the user has confirmed usage rights. College Board CED unit and topic labels may be used as alignment metadata; the practice content itself must be original.

## Unit Values

Use these exact canonical labels in the `unit` field. The code column is for app/domain mapping and should not replace the display label in authored question JSON.

| Code     | `unit` value                                                    | Exam status                                 |
| -------- | --------------------------------------------------------------- | ------------------------------------------- |
| `unit-1` | `Unit 1: Polynomial and Rational Functions`                     | Assessed                                    |
| `unit-2` | `Unit 2: Exponential and Logarithmic Functions`                 | Assessed                                    |
| `unit-3` | `Unit 3: Trigonometric and Polar Functions`                     | Assessed                                    |
| `unit-4` | `Unit 4: Functions Involving Parameters, Vectors, and Matrices` | Course content; not assessed on the AP Exam |

Source alignment: [AP Central's public AP Precalculus course page](https://apcentral.collegeboard.org/courses/ap-precalculus) and the [AP Precalculus Course and Exam Description](https://apcentral.collegeboard.org/media/pdf/ap-precalculus-course-and-exam-description.pdf) list four units, with Units 1-3 assessed on the AP Exam and Unit 4 available as additional course content. Use the CED framework for metadata alignment only; keep PrecalcApp questions, explanations, rubrics, and media original.

## Topic Values

Use one of these exact canonical labels in the `topic` field. The value format is `<CED topic code> <CED topic title>`. Put finer skill detail in `skill`, and use tags for filter facets.

### Unit 1: Polynomial and Rational Functions

| Code   | `topic` value                                                            |
| ------ | ------------------------------------------------------------------------ |
| `1.1`  | `1.1 Change in Tandem`                                                   |
| `1.2`  | `1.2 Rates of Change`                                                    |
| `1.3`  | `1.3 Rates of Change in Linear and Quadratic Functions`                  |
| `1.4`  | `1.4 Polynomial Functions and Rates of Change`                           |
| `1.5`  | `1.5 Polynomial Functions and Complex Zeros`                             |
| `1.6`  | `1.6 Polynomial Functions and End Behavior`                              |
| `1.7`  | `1.7 Rational Functions and End Behavior`                                |
| `1.8`  | `1.8 Rational Functions and Zeros`                                       |
| `1.9`  | `1.9 Rational Functions and Vertical Asymptotes`                         |
| `1.10` | `1.10 Rational Functions and Holes`                                      |
| `1.11` | `1.11 Equivalent Representations of Polynomial and Rational Expressions` |
| `1.12` | `1.12 Transformations of Functions`                                      |
| `1.13` | `1.13 Function Model Selection and Assumption Articulation`              |
| `1.14` | `1.14 Function Model Construction and Application`                       |

### Unit 2: Exponential and Logarithmic Functions

| Code   | `topic` value                                                 |
| ------ | ------------------------------------------------------------- |
| `2.1`  | `2.1 Change in Arithmetic and Geometric Sequences`            |
| `2.2`  | `2.2 Change in Linear and Exponential Functions`              |
| `2.3`  | `2.3 Exponential Functions`                                   |
| `2.4`  | `2.4 Exponential Function Manipulation`                       |
| `2.5`  | `2.5 Exponential Function Context and Data Modeling`          |
| `2.6`  | `2.6 Competing Function Model Validation`                     |
| `2.7`  | `2.7 Composition of Functions`                                |
| `2.8`  | `2.8 Inverse Functions`                                       |
| `2.9`  | `2.9 Logarithmic Expressions`                                 |
| `2.10` | `2.10 Inverses of Exponential Functions`                      |
| `2.11` | `2.11 Logarithmic Functions`                                  |
| `2.12` | `2.12 Logarithmic Function Manipulation`                      |
| `2.13` | `2.13 Exponential and Logarithmic Equations and Inequalities` |
| `2.14` | `2.14 Logarithmic Function Context and Data Modeling`         |
| `2.15` | `2.15 Semi-log Plots`                                         |

### Unit 3: Trigonometric and Polar Functions

| Code   | `topic` value                                                |
| ------ | ------------------------------------------------------------ |
| `3.1`  | `3.1 Periodic Phenomena`                                     |
| `3.2`  | `3.2 Sine, Cosine, and Tangent`                              |
| `3.3`  | `3.3 Sine and Cosine Function Values`                        |
| `3.4`  | `3.4 Sine and Cosine Function Graphs`                        |
| `3.5`  | `3.5 Sinusoidal Functions`                                   |
| `3.6`  | `3.6 Sinusoidal Function Transformations`                    |
| `3.7`  | `3.7 Sinusoidal Function Context and Data Modeling`          |
| `3.8`  | `3.8 The Tangent Function`                                   |
| `3.9`  | `3.9 Inverse Trigonometric Functions`                        |
| `3.10` | `3.10 Trigonometric Equations and Inequalities`              |
| `3.11` | `3.11 The Secant, Cosecant, and Cotangent Functions`         |
| `3.12` | `3.12 Equivalent Representations of Trigonometric Functions` |
| `3.13` | `3.13 Trigonometry and Polar Coordinates`                    |
| `3.14` | `3.14 Polar Function Graphs`                                 |
| `3.15` | `3.15 Rates of Change in Polar Functions`                    |

### Unit 4: Functions Involving Parameters, Vectors, and Matrices

Unit 4 topics are valid course-practice metadata, but AP prep exams should remain restricted to Units 1-3 unless product scope changes.

| Code   | `topic` value                                         |
| ------ | ----------------------------------------------------- |
| `4.1`  | `4.1 Parametric Functions`                            |
| `4.2`  | `4.2 Parametric Functions Modeling Planar Motion`     |
| `4.3`  | `4.3 Parametric Functions and Rates of Change`        |
| `4.4`  | `4.4 Parametrically Defined Circles and Lines`        |
| `4.5`  | `4.5 Implicitly Defined Functions`                    |
| `4.6`  | `4.6 Conic Sections`                                  |
| `4.7`  | `4.7 Parametrization of Implicitly Defined Functions` |
| `4.8`  | `4.8 Vectors`                                         |
| `4.9`  | `4.9 Vector-Valued Functions`                         |
| `4.10` | `4.10 Matrices`                                       |
| `4.11` | `4.11 The Inverse and Determinant of a Matrix`        |
| `4.12` | `4.12 Linear Transformations and Matrices`            |
| `4.13` | `4.13 Matrices as Functions`                          |
| `4.14` | `4.14 Matrices Modeling Contexts`                     |

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
  "unit": "Unit 1: Polynomial and Rational Functions",
  "topic": "1.12 Transformations of Functions",
  "skill": "Identify the effect of a transformation",
  "tags": ["function-transformations", "translations", "graphs", "no-calculator"]
}
```
