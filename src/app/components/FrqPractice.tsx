import { CheckSquare, Eye, EyeOff, ListChecks, RotateCcw } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import type { Attempt } from '../../domain/attempts/types';
import type { FrqQuestion } from '../../domain/questions/types';
import { scoreFrqChecklist } from '../../domain/scoring/scoreFrq';
import { MathText } from './MathText';

type FrqPracticeProps = {
  question: FrqQuestion;
  onSubmitAttempt?: (
    partResponses: Record<string, string>,
    earnedPointsByCriterion: Record<string, boolean>,
    startedAt: Date,
    attemptId?: string,
    submittedAt?: Date,
  ) => Attempt | undefined;
};

export function FrqPractice({ question, onSubmitAttempt }: FrqPracticeProps) {
  const reviewPanelRef = useRef<HTMLElement | null>(null);
  const controlIdPrefix = useId();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [earnedCriteria, setEarnedCriteria] = useState<Record<string, boolean>>({});
  const [revealedPartIds, setRevealedPartIds] = useState<Record<string, boolean>>({});
  const [attemptId, setAttemptId] = useState<string | undefined>();
  const [startedAt, setStartedAt] = useState(() => new Date());
  const [submittedAt, setSubmittedAt] = useState<Date | undefined>();

  const criterionOrder = useMemo(
    () =>
      question.parts.flatMap((part) =>
        part.rubric.map((criterion) => ({
          criterionId: criterion.id,
          partId: part.id,
        })),
      ),
    [question.parts],
  );
  const criterionIndexById = useMemo(
    () =>
      new Map(criterionOrder.map((criterion, index) => [criterion.criterionId, index] as const)),
    [criterionOrder],
  );
  const score = useMemo(
    () => scoreFrqChecklist(question, earnedCriteria),
    [earnedCriteria, question],
  );
  const earnedPointCount = Object.values(earnedCriteria).filter(Boolean).length;
  const revealedPartCount = question.parts.filter((part) => revealedPartIds[part.id]).length;
  const allGuidesRevealed = revealedPartCount === question.parts.length;
  const totalCriterionCount = criterionOrder.length;

  useEffect(() => {
    if (submitted) {
      reviewPanelRef.current?.focus();
    }
  }, [submitted]);

  function reset() {
    setResponses({});
    setSubmitted(false);
    setEarnedCriteria({});
    setRevealedPartIds({});
    setAttemptId(undefined);
    setStartedAt(new Date());
    setSubmittedAt(undefined);
  }

  function submitAttempt(nextEarnedCriteria = earnedCriteria, nextSubmittedAt = submittedAt) {
    const savedAttempt = onSubmitAttempt?.(
      responses,
      nextEarnedCriteria,
      startedAt,
      attemptId,
      nextSubmittedAt,
    );

    if (savedAttempt?.id && savedAttempt.id !== attemptId) {
      setAttemptId(savedAttempt.id);
    }
  }

  function submitForReview() {
    if (submitted) {
      return;
    }

    const nextSubmittedAt = new Date();
    setSubmitted(true);
    setSubmittedAt(nextSubmittedAt);
    submitAttempt(earnedCriteria, nextSubmittedAt);
  }

  function updateCriterion(criterionId: string, earned: boolean) {
    const nextEarnedCriteria = {
      ...earnedCriteria,
      [criterionId]: earned,
    };
    setEarnedCriteria(nextEarnedCriteria);
    submitAttempt(nextEarnedCriteria);
  }

  function getCriterionInputId(criterionId: string) {
    return `${controlIdPrefix}-${criterionId}-criterion`;
  }

  function focusCriterionAt(index: number) {
    const nextCriterion = criterionOrder[Math.min(Math.max(index, 0), criterionOrder.length - 1)];

    if (!nextCriterion) {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(getCriterionInputId(nextCriterion.criterionId))?.focus();
    });
  }

  function handleRubricKeyDown(event: KeyboardEvent<HTMLElement>, criterionId: string) {
    const currentIndex = criterionIndexById.get(criterionId);

    if (currentIndex === undefined) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusCriterionAt(currentIndex + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusCriterionAt(currentIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusCriterionAt(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusCriterionAt(criterionOrder.length - 1);
    }
  }

  function focusGuide(partId: string) {
    window.requestAnimationFrame(() => {
      document.getElementById(`${controlIdPrefix}-${partId}-guide`)?.focus();
    });
  }

  function toggleGuide(partId: string) {
    const willReveal = !revealedPartIds[partId];

    setRevealedPartIds((current) => ({
      ...current,
      [partId]: willReveal,
    }));

    if (willReveal) {
      focusGuide(partId);
    }
  }

  function revealAllGuides() {
    setRevealedPartIds(
      Object.fromEntries(question.parts.map((part) => [part.id, true])) as Record<string, boolean>,
    );

    if (question.parts[0]) {
      focusGuide(question.parts[0].id);
    }
  }

  function handleResponseKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      submitForReview();
    }
  }

  return (
    <div className="response-area">
      <p className="visually-hidden" id={`${controlIdPrefix}-response-keyboard-help`}>
        Press Ctrl+Enter or Command+Enter from a response box to submit the FRQ for self scoring.
      </p>
      <div className="frq-parts">
        {question.parts.map((part) => (
          <section
            className="frq-part"
            key={part.id}
            aria-labelledby={`${controlIdPrefix}-${part.id}-heading`}
          >
            <h2 id={`${controlIdPrefix}-${part.id}-heading`}>Part {part.id}</h2>
            <MathText block text={part.prompt} />
            <label className="response-box" htmlFor={`${controlIdPrefix}-${part.id}-response`}>
              <span>Your response for part {part.id}</span>
              <textarea
                id={`${controlIdPrefix}-${part.id}-response`}
                disabled={submitted}
                aria-describedby={`${controlIdPrefix}-response-keyboard-help`}
                onKeyDown={handleResponseKeyDown}
                onChange={(event) =>
                  setResponses((current) => ({
                    ...current,
                    [part.id]: event.target.value,
                  }))
                }
                rows={6}
                value={responses[part.id] ?? ''}
              />
            </label>
          </section>
        ))}
      </div>

      <div className="action-row">
        <button
          className="primary-button"
          disabled={submitted}
          onClick={submitForReview}
          type="button"
        >
          <CheckSquare aria-hidden="true" />
          Submit
        </button>
        <button className="ghost-button" disabled={!submitted} onClick={reset} type="button">
          <RotateCcw aria-hidden="true" />
          Reset
        </button>
      </div>

      {submitted ? (
        <section
          className="review-panel"
          ref={reviewPanelRef}
          aria-labelledby={`${controlIdPrefix}-self-score-heading`}
          tabIndex={-1}
        >
          <div
            className="result-banner"
            data-correct="pending"
            aria-live="polite"
            aria-atomic="true"
          >
            <ListChecks aria-hidden="true" />
            <strong id={`${controlIdPrefix}-self-score-heading`}>Self Score</strong>
            <span>
              Score: {score.score}/{score.maxScore} points
            </span>
            <span>
              {earnedPointCount} of {totalCriterionCount} rubric items selected
            </span>
            <span>
              {revealedPartCount} of {question.parts.length} scoring guides revealed
            </span>
          </div>

          <div className="action-row" aria-label="FRQ review actions">
            <button
              className="ghost-button"
              disabled={allGuidesRevealed}
              onClick={revealAllGuides}
              type="button"
            >
              <Eye aria-hidden="true" />
              Reveal All Scoring Guides
            </button>
          </div>

          <p className="visually-hidden" id={`${controlIdPrefix}-rubric-keyboard-help`}>
            In a revealed rubric, use arrow keys to move between criteria. Press Space to toggle the
            focused criterion.
          </p>

          <div className="frq-parts">
            {question.parts.map((part) => {
              const guideVisible = revealedPartIds[part.id] ?? false;

              return (
                <section
                  className="frq-part"
                  key={part.id}
                  aria-labelledby={`${controlIdPrefix}-${part.id}-review-heading`}
                >
                  <h2 id={`${controlIdPrefix}-${part.id}-review-heading`}>Part {part.id} Review</h2>
                  <p className="student-response-copy">
                    {responses[part.id]?.trim() || 'No response entered.'}
                  </p>
                  <button
                    className="ghost-button"
                    aria-controls={`${controlIdPrefix}-${part.id}-guide`}
                    aria-expanded={guideVisible}
                    onClick={() => toggleGuide(part.id)}
                    type="button"
                  >
                    {guideVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    {guideVisible
                      ? 'Hide Sample Response and Expected Work'
                      : 'Show Sample Response and Expected Work'}
                  </button>

                  {guideVisible ? (
                    <div
                      className="frq-review"
                      id={`${controlIdPrefix}-${part.id}-guide`}
                      tabIndex={-1}
                    >
                      <h4>Sample Response</h4>
                      <MathText block text={part.sampleResponse} />

                      {part.expectedWork.length > 0 ? (
                        <>
                          <h4>Expected Work</h4>
                          <ol>
                            {part.expectedWork.map((step) => (
                              <li key={step}>
                                <MathText text={step} />
                              </li>
                            ))}
                          </ol>
                        </>
                      ) : null}

                      <h4 id={`${controlIdPrefix}-${part.id}-rubric-heading`}>Rubric</h4>
                      <div
                        className="rubric-list"
                        aria-describedby={`${controlIdPrefix}-rubric-keyboard-help`}
                        aria-labelledby={`${controlIdPrefix}-${part.id}-rubric-heading`}
                      >
                        {part.rubric.map((criterion) => {
                          const criterionIndex = criterionIndexById.get(criterion.id) ?? 0;

                          return (
                            <label
                              className="rubric-item"
                              htmlFor={getCriterionInputId(criterion.id)}
                              key={criterion.id}
                            >
                              <input
                                id={getCriterionInputId(criterion.id)}
                                checked={earnedCriteria[criterion.id] ?? false}
                                onChange={(event) =>
                                  updateCriterion(criterion.id, event.target.checked)
                                }
                                onKeyDown={(event) => handleRubricKeyDown(event, criterion.id)}
                                type="checkbox"
                              />
                              <span>
                                <MathText text={criterion.description} />
                                <small>
                                  Criterion {criterionIndex + 1}: {criterion.points}{' '}
                                  {criterion.points === 1 ? 'point' : 'points'}
                                </small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
