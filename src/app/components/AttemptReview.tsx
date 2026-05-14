import { Download, FileUp, RotateCcw, Trash2 } from 'lucide-react';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';

import type { Attempt } from '../../domain/attempts/types';
import type { Question } from '../../domain/questions/types';
import { MathText } from './MathText';

type AttemptReviewProps = {
  attempts: Attempt[];
  questions: Question[];
  onRemoveAttempt: (attemptId: string) => void;
  onClearAttempts: () => void;
  onExportAttempts: () => string;
  onImportAttempts: (payload: string) => {
    imported: number;
    rejectedCount: number;
    added: number;
    updated: number;
    unchanged: number;
    errors: string[];
  };
};

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPercent(score: number, maxScore: number): string {
  if (maxScore <= 0) {
    return '0%';
  }

  return `${Math.round((score / maxScore) * 100)}%`;
}

function formatFrqResponse(attempt: Attempt): string[] {
  if (attempt.response.type !== 'frq') {
    return [];
  }

  return Object.entries(attempt.response.partResponses).map(
    ([partId, response]) => `Part ${partId}: ${response}`,
  );
}

export function AttemptReview({
  attempts,
  questions,
  onRemoveAttempt,
  onClearAttempts,
  onExportAttempts,
  onImportAttempts,
}: AttemptReviewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const questionsById = useMemo(() => {
    return new Map(questions.map((question) => [question.id, question]));
  }, [questions]);

  const stats = useMemo(() => {
    const totalScore = attempts.reduce((total, attempt) => total + attempt.score, 0);
    const totalMaxScore = attempts.reduce((total, attempt) => total + attempt.maxScore, 0);
    const correctMcq = attempts.filter((attempt) => attempt.questionType === 'mcq' && attempt.isCorrect).length;
    const mcqAttempts = attempts.filter((attempt) => attempt.questionType === 'mcq').length;

    return {
      attempts: attempts.length,
      average: formatPercent(totalScore, totalMaxScore),
      mcqAccuracy: mcqAttempts > 0 ? formatPercent(correctMcq, mcqAttempts) : '0%',
    };
  }, [attempts]);

  function exportAttempts() {
    const data = onExportAttempts();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'precalcapp-attempts.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importAttempts(event: ChangeEvent<HTMLInputElement>) {
    setNotice('');
    setError('');

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const result = onImportAttempts(await file.text());
      setNotice(
        `Imported ${result.imported} attempts. Added ${result.added}, updated ${result.updated}, unchanged ${result.unchanged}, rejected ${result.rejectedCount}.`,
      );

      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 3).join(' '));
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Unable to import attempts.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <main className="review-shell">
      <header className="review-header">
        <div>
          <p className="eyebrow">Attempt History</p>
          <h1>Review Practice</h1>
        </div>
        <div className="manager-actions">
          <button
            className="ghost-button"
            disabled={attempts.length === 0}
            onClick={exportAttempts}
            type="button"
          >
            <Download aria-hidden="true" />
            Export
          </button>
          <button className="ghost-button" onClick={() => fileInputRef.current?.click()} type="button">
            <FileUp aria-hidden="true" />
            Import
          </button>
          <button
            className="danger-button"
            disabled={attempts.length === 0}
            onClick={() => {
              if (window.confirm('Clear all saved attempts? This cannot be undone.')) {
                onClearAttempts();
              }
            }}
            type="button"
          >
            <RotateCcw aria-hidden="true" />
            Clear
          </button>
          <input
            accept="application/json"
            className="visually-hidden"
            onChange={importAttempts}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </header>

      {notice ? <div className="form-notice">{notice}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      <section className="review-stats" aria-label="Attempt summary">
        <div>
          <strong>{stats.attempts}</strong>
          <span>Attempts</span>
        </div>
        <div>
          <strong>{stats.average}</strong>
          <span>Average Score</span>
        </div>
        <div>
          <strong>{stats.mcqAccuracy}</strong>
          <span>MCQ Accuracy</span>
        </div>
      </section>

      {attempts.length === 0 ? (
        <section className="review-empty">
          <p className="eyebrow">No attempts yet</p>
          <h2>Submit an MCQ or FRQ to start building history.</h2>
        </section>
      ) : (
        <section className="attempt-list" aria-label="Saved attempts">
          {attempts.map((attempt) => {
            const question = questionsById.get(attempt.questionId);

            return (
              <article className="attempt-card" key={attempt.id}>
                <header className="attempt-card__header">
                  <div>
                    <p className="eyebrow">{attempt.questionType.toUpperCase()}</p>
                    <h2>{question?.skill ?? attempt.questionId}</h2>
                  </div>
                  <strong>
                    {attempt.score}/{attempt.maxScore} ({formatPercent(attempt.score, attempt.maxScore)})
                  </strong>
                </header>
                {question ? (
                  <div className="attempt-card__prompt">
                    <MathText block text={question.prompt} />
                  </div>
                ) : null}
                <dl className="attempt-card__meta">
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(attempt.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt>Response</dt>
                    <dd>
                      {attempt.response.type === 'mcq'
                        ? `Selected ${attempt.response.selectedChoiceId}`
                        : `${Object.keys(attempt.response.partResponses).length} FRQ part(s)`}
                    </dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>
                      {attempt.timeSpentSeconds === undefined
                        ? 'Not tracked'
                        : `${attempt.timeSpentSeconds}s`}
                    </dd>
                  </div>
                </dl>
                <section className="attempt-card__response">
                  <h3>Student Response</h3>
                  {attempt.response.type === 'mcq' ? (
                    <p>Selected choice {attempt.response.selectedChoiceId}</p>
                  ) : (
                    <div className="attempt-card__frq-responses">
                      {formatFrqResponse(attempt).map((response) => (
                        <p key={response}>{response}</p>
                      ))}
                    </div>
                  )}
                </section>
                <button
                  className="ghost-button"
                  onClick={() => onRemoveAttempt(attempt.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" />
                  Remove
                </button>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
