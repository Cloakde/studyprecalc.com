import {
  CheckCircle2,
  CircleDashed,
  Download,
  FileUp,
  Filter,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';

import type { Attempt } from '../../domain/attempts/types';
import type { McqQuestion, Question } from '../../domain/questions/types';
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

type ReviewFilter = 'all' | 'missed' | 'mcq' | 'frq';
type AttemptTone = 'correct' | 'partial' | 'missed';

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

function formatDuration(totalSeconds: number | undefined): string {
  if (totalSeconds === undefined) {
    return 'Not tracked';
  }

  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatFrqResponse(attempt: Attempt): string[] {
  if (attempt.response.type !== 'frq') {
    return [];
  }

  return Object.entries(attempt.response.partResponses).map(
    ([partId, response]) => `Part ${partId}: ${response}`,
  );
}

function getAttemptTone(attempt: Attempt): AttemptTone {
  if (attempt.maxScore > 0 && attempt.score >= attempt.maxScore) {
    return 'correct';
  }

  if (attempt.score > 0) {
    return 'partial';
  }

  return 'missed';
}

function getAttemptIcon(tone: AttemptTone) {
  if (tone === 'correct') {
    return <CheckCircle2 aria-hidden="true" />;
  }

  if (tone === 'partial') {
    return <CircleDashed aria-hidden="true" />;
  }

  return <XCircle aria-hidden="true" />;
}

function getMcqChoice(question: Question | undefined, choiceId: string): string | undefined {
  if (!question || question.type !== 'mcq') {
    return undefined;
  }

  return (question as McqQuestion).choices.find((choice) => choice.id === choiceId)?.text;
}

function getAttemptSearchText(attempt: Attempt, question: Question | undefined): string {
  const responseText =
    attempt.response.type === 'mcq'
      ? attempt.response.selectedChoiceId
      : formatFrqResponse(attempt).join(' ');

  return [
    attempt.questionId,
    attempt.questionType,
    responseText,
    question?.unit,
    question?.topic,
    question?.skill,
    question?.prompt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
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
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const questionsById = useMemo(() => {
    return new Map(questions.map((question) => [question.id, question]));
  }, [questions]);

  const stats = useMemo(() => {
    const totalScore = attempts.reduce((total, attempt) => total + attempt.score, 0);
    const totalMaxScore = attempts.reduce((total, attempt) => total + attempt.maxScore, 0);
    const correctMcq = attempts.filter(
      (attempt) => attempt.questionType === 'mcq' && attempt.isCorrect,
    ).length;
    const mcqAttempts = attempts.filter((attempt) => attempt.questionType === 'mcq').length;
    const needsReview = attempts.filter((attempt) => attempt.score < attempt.maxScore).length;

    return {
      attempts: attempts.length,
      average: formatPercent(totalScore, totalMaxScore),
      mcqAccuracy: mcqAttempts > 0 ? formatPercent(correctMcq, mcqAttempts) : '0%',
      needsReview,
    };
  }, [attempts]);

  const unitOptions = useMemo(() => {
    return [...new Set(questions.map((question) => question.unit))].sort((first, second) =>
      first.localeCompare(second),
    );
  }, [questions]);

  const filteredAttempts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return [...attempts]
      .sort((first, second) => Date.parse(second.submittedAt) - Date.parse(first.submittedAt))
      .filter((attempt) => {
        const question = questionsById.get(attempt.questionId);

        if (reviewFilter === 'missed' && attempt.score >= attempt.maxScore) {
          return false;
        }

        if (reviewFilter === 'mcq' && attempt.questionType !== 'mcq') {
          return false;
        }

        if (reviewFilter === 'frq' && attempt.questionType !== 'frq') {
          return false;
        }

        if (unitFilter !== 'all' && question?.unit !== unitFilter) {
          return false;
        }

        if (normalizedSearch.length > 0) {
          return getAttemptSearchText(attempt, question).includes(normalizedSearch);
        }

        return true;
      });
  }, [attempts, questionsById, reviewFilter, searchQuery, unitFilter]);

  function exportAttempts() {
    const data = onExportAttempts();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'studyprecalc-attempts.json';
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
    <main className="review-shell review-shell--visual">
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
          <button
            className="ghost-button"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
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

      <section className="review-stats review-stats--visual" aria-label="Attempt summary">
        <div className="review-stat-card">
          <strong>{stats.attempts}</strong>
          <span>Attempts</span>
        </div>
        <div className="review-stat-card">
          <strong>{stats.average}</strong>
          <span>Average Score</span>
        </div>
        <div className="review-stat-card">
          <strong>{stats.mcqAccuracy}</strong>
          <span>MCQ Accuracy</span>
        </div>
        <div className="review-stat-card">
          <strong>{stats.needsReview}</strong>
          <span>Needs Review</span>
        </div>
      </section>

      <section className="review-filters" aria-label="Attempt filters">
        <div className="review-filter-group" role="group" aria-label="Filter attempts">
          <Filter aria-hidden="true" />
          {(['all', 'missed', 'mcq', 'frq'] satisfies ReviewFilter[]).map((filter) => (
            <button
              aria-pressed={reviewFilter === filter}
              className="review-chip"
              data-active={reviewFilter === filter}
              key={filter}
              onClick={() => setReviewFilter(filter)}
              type="button"
            >
              {filter === 'all' ? 'All' : filter === 'missed' ? 'Missed' : filter.toUpperCase()}
            </button>
          ))}
        </div>
        <label className="review-unit-filter">
          <span>Unit</span>
          <select onChange={(event) => setUnitFilter(event.target.value)} value={unitFilter}>
            <option value="all">All units</option>
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="review-search">
          <Search aria-hidden="true" />
          <span className="visually-hidden">Search attempts</span>
          <input
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search skill, topic, or response"
            type="search"
            value={searchQuery}
          />
        </label>
      </section>

      {attempts.length === 0 ? (
        <section className="review-empty">
          <p className="eyebrow">No attempts yet</p>
          <h2>Submit an MCQ or FRQ to start building history.</h2>
        </section>
      ) : filteredAttempts.length === 0 ? (
        <section className="review-empty">
          <p className="eyebrow">No matches</p>
          <h2>Try a different unit, type, or search term.</h2>
        </section>
      ) : (
        <section className="attempt-list attempt-list--compact" aria-label="Saved attempts">
          {filteredAttempts.map((attempt) => {
            const question = questionsById.get(attempt.questionId);
            const tone = getAttemptTone(attempt);
            const selectedChoice =
              attempt.response.type === 'mcq'
                ? getMcqChoice(question, attempt.response.selectedChoiceId)
                : undefined;

            return (
              <article className="attempt-row" data-tone={tone} key={attempt.id}>
                <div className="attempt-row__mark">{getAttemptIcon(tone)}</div>
                <div className="attempt-row__main">
                  <header className="attempt-row__header">
                    <div>
                      <p className="eyebrow">
                        {question?.unit ?? 'Unknown unit'} | {attempt.questionType.toUpperCase()}
                      </p>
                      <h2>{question?.skill ?? attempt.questionId}</h2>
                    </div>
                    <strong>
                      {attempt.score}/{attempt.maxScore} (
                      {formatPercent(attempt.score, attempt.maxScore)})
                    </strong>
                  </header>
                  {question ? (
                    <div className="attempt-row__prompt">
                      <MathText block text={question.prompt} />
                    </div>
                  ) : null}
                  <dl className="attempt-row__meta">
                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatDate(attempt.submittedAt)}</dd>
                    </div>
                    <div>
                      <dt>Topic</dt>
                      <dd>{question?.topic ?? 'Question not found'}</dd>
                    </div>
                    <div>
                      <dt>Time</dt>
                      <dd>{formatDuration(attempt.timeSpentSeconds)}</dd>
                    </div>
                  </dl>
                  <section className="attempt-row__response">
                    <h3>Student Response</h3>
                    {attempt.response.type === 'mcq' ? (
                      <div>
                        <strong>Selected {attempt.response.selectedChoiceId}</strong>
                        {selectedChoice ? <MathText text={selectedChoice} /> : null}
                      </div>
                    ) : (
                      <div className="attempt-card__frq-responses">
                        {formatFrqResponse(attempt).map((response) => (
                          <p key={response}>{response}</p>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
                <button
                  aria-label={`Remove attempt for ${question?.skill ?? attempt.questionId}`}
                  className="ghost-button attempt-row__remove"
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
