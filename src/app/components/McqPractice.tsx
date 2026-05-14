import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { McqChoice, McqQuestion } from '../../domain/questions/types';
import { scoreMcq } from '../../domain/scoring/scoreMcq';
import { MathText } from './MathText';

type McqPracticeProps = {
  question: McqQuestion;
  onSubmitAttempt?: (selectedChoiceId: McqChoice['id'], startedAt: Date) => void;
};

export function McqPractice({ question, onSubmitAttempt }: McqPracticeProps) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<McqChoice['id'] | null>(null);
  const [submittedChoiceId, setSubmittedChoiceId] = useState<McqChoice['id'] | null>(null);
  const [startedAt, setStartedAt] = useState(() => new Date());

  const score = useMemo(() => {
    if (!submittedChoiceId) {
      return null;
    }

    return scoreMcq(question, submittedChoiceId);
  }, [question, submittedChoiceId]);

  const submitted = submittedChoiceId !== null;

  function reset() {
    setSelectedChoiceId(null);
    setSubmittedChoiceId(null);
    setStartedAt(new Date());
  }

  return (
    <div className="response-area">
      <fieldset className="choice-list" disabled={submitted}>
        <legend>Choices</legend>
        {question.choices.map((choice) => {
          const checked = selectedChoiceId === choice.id;
          const correct = submitted && question.correctChoiceId === choice.id;
          const incorrectSelection = submittedChoiceId === choice.id && !correct;

          return (
            <label
              className="choice-option"
              data-checked={checked}
              data-correct={correct}
              data-incorrect={incorrectSelection}
              key={choice.id}
            >
              <input
                checked={checked}
                name={question.id}
                onChange={() => setSelectedChoiceId(choice.id)}
                type="radio"
                value={choice.id}
              />
              <span className="choice-option__letter">{choice.id}</span>
              <span className="choice-option__text">
                <MathText text={choice.text} />
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="action-row">
        <button
          className="primary-button"
          disabled={!selectedChoiceId || submitted}
          onClick={() => {
            if (!selectedChoiceId) {
              return;
            }

            setSubmittedChoiceId(selectedChoiceId);
            onSubmitAttempt?.(selectedChoiceId, startedAt);
          }}
          type="button"
        >
          Submit
        </button>
        <button className="ghost-button" disabled={!submitted} onClick={reset} type="button">
          <RotateCcw aria-hidden="true" />
          Reset
        </button>
      </div>

      {score ? (
        <section className="review-panel" aria-live="polite">
          <div className="result-banner" data-correct={score.isCorrect}>
            {score.isCorrect ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            <strong>{score.isCorrect ? 'Correct' : 'Incorrect'}</strong>
            <span>
              Score: {score.score}/{score.maxScore}
            </span>
          </div>

          <div className="choice-explanations">
            <h2>Choice Review</h2>
            {question.choices.map((choice) => (
              <div className="choice-explanation" key={choice.id}>
                <h3>
                  {choice.id}
                  {choice.id === question.correctChoiceId ? ' - Correct answer' : ''}
                </h3>
                <MathText block text={choice.explanation} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
