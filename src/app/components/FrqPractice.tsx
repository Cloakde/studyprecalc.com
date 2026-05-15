import { CheckSquare, RotateCcw } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

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
  const [attemptId, setAttemptId] = useState<string | undefined>();
  const [startedAt, setStartedAt] = useState(() => new Date());
  const [submittedAt, setSubmittedAt] = useState<Date | undefined>();

  const score = useMemo(
    () => scoreFrqChecklist(question, earnedCriteria),
    [earnedCriteria, question],
  );
  const earnedPointCount = Object.values(earnedCriteria).filter(Boolean).length;

  useEffect(() => {
    if (submitted) {
      reviewPanelRef.current?.focus();
    }
  }, [submitted]);

  function reset() {
    setResponses({});
    setSubmitted(false);
    setEarnedCriteria({});
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

  return (
    <div className="response-area">
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

            {submitted ? (
              <div
                className="frq-review"
                aria-labelledby={`${controlIdPrefix}-${part.id}-review-heading`}
              >
                <h3 id={`${controlIdPrefix}-${part.id}-review-heading`}>Sample Response</h3>
                <MathText block text={part.sampleResponse} />

                <h3 id={`${controlIdPrefix}-${part.id}-rubric-heading`}>Rubric</h3>
                <div
                  className="rubric-list"
                  aria-labelledby={`${controlIdPrefix}-${part.id}-rubric-heading`}
                >
                  {part.rubric.map((criterion) => (
                    <label className="rubric-item" key={criterion.id}>
                      <input
                        checked={earnedCriteria[criterion.id] ?? false}
                        onChange={(event) => {
                          const nextEarnedCriteria = {
                            ...earnedCriteria,
                            [criterion.id]: event.target.checked,
                          };
                          setEarnedCriteria(nextEarnedCriteria);
                          submitAttempt(nextEarnedCriteria);
                        }}
                        type="checkbox"
                      />
                      <span>
                        <MathText text={criterion.description} />
                        <small>
                          {criterion.points} {criterion.points === 1 ? 'point' : 'points'}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <div className="action-row">
        <button
          className="primary-button"
          disabled={submitted}
          onClick={() => {
            const nextSubmittedAt = new Date();
            setSubmitted(true);
            setSubmittedAt(nextSubmittedAt);
            submitAttempt(earnedCriteria, nextSubmittedAt);
          }}
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
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
        >
          <div className="result-banner" data-correct="pending">
            <strong>Self Score</strong>
            <span>
              {score.score}/{score.maxScore} points
            </span>
            <span>{earnedPointCount} rubric item(s) selected</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
