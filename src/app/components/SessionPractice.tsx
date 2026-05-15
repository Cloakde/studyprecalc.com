import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  ListChecks,
  Play,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Attempt } from '../../domain/attempts/types';
import type { FrqQuestion, McqChoice, McqQuestion, Question } from '../../domain/questions/types';
import { scoreFrqChecklist } from '../../domain/scoring/scoreFrq';
import { scoreMcq } from '../../domain/scoring/scoreMcq';
import { createSessionResult, type SessionResult } from '../../domain/sessions';
import { MathText } from './MathText';
import { QuestionAssetGallery } from './QuestionAssetGallery';
import { QuestionMeta } from './QuestionMeta';

type SessionPracticeProps = {
  questions: Question[];
  questionSetVersion: string;
  onSaveMcqAttempt?: (
    question: McqQuestion,
    selectedChoiceId: McqChoice['id'],
    startedAt: Date,
    submittedAt: Date,
  ) => Attempt | undefined;
  onSaveFrqAttempt?: (
    question: FrqQuestion,
    partResponses: Record<string, string>,
    earnedPointsByCriterion: Record<string, boolean>,
    startedAt: Date,
    attemptId: string | undefined,
    submittedAt: Date,
  ) => Attempt | undefined;
  onSaveSessionResult?: (sessionResult: SessionResult) => SessionResult | undefined;
};

type SessionPhase = 'setup' | 'running' | 'summary';
type SessionTypeFilter = 'mixed' | Question['type'];
type SessionResponse = {
  startedAt: Date;
  submittedAt?: Date;
  selectedChoiceId?: McqChoice['id'];
  partResponses: Record<string, string>;
  earnedPointsByCriterion: Record<string, boolean>;
  frqReviewed?: boolean;
  attemptId?: string;
};

type QuestionScore = {
  score: number;
  maxScore: number;
  answered: boolean;
  needsManualScore?: boolean;
  isCorrect?: boolean;
};

const countOptions = [3, 5, 10, 15, 20];
const timerOptions = [
  { label: 'Untimed', value: 0 },
  { label: '10 min', value: 10 },
  { label: '20 min', value: 20 },
  { label: '40 min', value: 40 },
  { label: '60 min', value: 60 },
];

function createSessionResponse(startedAt = new Date()): SessionResponse {
  return {
    startedAt,
    partResponses: {},
    earnedPointsByCriterion: {},
  };
}

function createBrowserSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `session-${crypto.randomUUID()}`;
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function hasFrqResponse(response: SessionResponse | undefined): boolean {
  return Object.values(response?.partResponses ?? {}).some((partResponse) => partResponse.trim());
}

function hasFrqSelfReview(response: SessionResponse | undefined): boolean {
  return response?.frqReviewed === true;
}

function scoreSessionQuestion(
  question: Question,
  response: SessionResponse | undefined,
): QuestionScore {
  if (question.type === 'mcq') {
    if (!response?.selectedChoiceId) {
      return {
        score: 0,
        maxScore: 1,
        answered: false,
        isCorrect: false,
      };
    }

    return {
      ...scoreMcq(question, response.selectedChoiceId),
      answered: true,
    };
  }

  const answered = hasFrqResponse(response);
  const score = scoreFrqChecklist(question, response?.earnedPointsByCriterion ?? {});

  return {
    ...score,
    answered,
    needsManualScore: answered && !hasFrqSelfReview(response),
  };
}

function getQuestionLabel(question: Question, index: number): string {
  return `${index + 1}. ${question.type.toUpperCase()} - ${question.topic}`;
}

export function SessionPractice({
  questions,
  questionSetVersion,
  onSaveMcqAttempt,
  onSaveFrqAttempt,
  onSaveSessionResult,
}: SessionPracticeProps) {
  const [phase, setPhase] = useState<SessionPhase>('setup');
  const [typeFilter, setTypeFilter] = useState<SessionTypeFilter>('mixed');
  const [unitFilter, setUnitFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Question['difficulty']>('all');
  const [calculatorFilter, setCalculatorFilter] = useState<'all' | Question['calculator']>('all');
  const [requestedCount, setRequestedCount] = useState(5);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, SessionResponse>>({});
  const [markedQuestionIds, setMarkedQuestionIds] = useState<Set<string>>(() => new Set());
  const [sessionRunId, setSessionRunId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [sessionSubmittedAt, setSessionSubmittedAt] = useState<Date | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const submitSessionRef = useRef<() => void>(() => undefined);

  const filterOptions = useMemo(
    () => ({
      units: [...new Set(questions.map((question) => question.unit))].sort(),
      difficulties: [...new Set(questions.map((question) => question.difficulty))].sort(),
      calculators: [...new Set(questions.map((question) => question.calculator))].sort(),
    }),
    [questions],
  );

  const matchingQuestions = useMemo(() => {
    return questions.filter((question) => {
      const matchesType = typeFilter === 'mixed' || question.type === typeFilter;
      const matchesUnit = unitFilter === 'all' || question.unit === unitFilter;
      const matchesDifficulty =
        difficultyFilter === 'all' || question.difficulty === difficultyFilter;
      const matchesCalculator =
        calculatorFilter === 'all' || question.calculator === calculatorFilter;

      return matchesType && matchesUnit && matchesDifficulty && matchesCalculator;
    });
  }, [calculatorFilter, difficultyFilter, questions, typeFilter, unitFilter]);

  const plannedQuestionCount =
    matchingQuestions.length === 0
      ? 0
      : Math.min(Math.max(1, requestedCount), matchingQuestions.length);

  const currentQuestion = sessionQuestions[currentIndex];
  const elapsedSeconds = sessionStartedAt
    ? Math.floor((clockNow - sessionStartedAt.getTime()) / 1000)
    : 0;
  const timeLimitSeconds = timeLimitMinutes * 60;
  const remainingSeconds =
    timeLimitSeconds > 0 ? Math.max(0, timeLimitSeconds - elapsedSeconds) : null;

  const summary = useMemo(() => {
    const questionScores = sessionQuestions.map((question) => ({
      question,
      ...scoreSessionQuestion(question, responses[question.id]),
    }));
    const score = questionScores.reduce((total, questionScore) => total + questionScore.score, 0);
    const maxScore = questionScores.reduce(
      (total, questionScore) => total + questionScore.maxScore,
      0,
    );
    const answered = questionScores.filter((questionScore) => questionScore.answered).length;
    const pendingManualScoreCount = questionScores.filter(
      (questionScore) => questionScore.needsManualScore,
    ).length;
    const missedQuestions = questionScores
      .filter(
        (questionScore) =>
          !questionScore.needsManualScore && questionScore.score < questionScore.maxScore,
      )
      .map((questionScore) => questionScore.question);

    return {
      answered,
      maxScore,
      missedQuestions,
      pendingManualScoreCount,
      percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      questionScores,
      score,
    };
  }, [responses, sessionQuestions]);

  useEffect(() => {
    if (phase !== 'running') {
      return undefined;
    }

    const timerId = window.setInterval(() => setClockNow(Date.now()), 1000);

    return () => window.clearInterval(timerId);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running' || !currentQuestion) {
      return;
    }

    setResponses((current) => {
      if (current[currentQuestion.id]) {
        return current;
      }

      return {
        ...current,
        [currentQuestion.id]: createSessionResponse(),
      };
    });
  }, [currentQuestion, phase]);

  useEffect(() => {
    if (phase !== 'running' || timeLimitSeconds <= 0 || !sessionStartedAt) {
      return;
    }

    if (elapsedSeconds >= timeLimitSeconds) {
      submitSessionRef.current();
    }
  }, [elapsedSeconds, phase, sessionStartedAt, timeLimitSeconds]);

  function startSession(
    questionsForSession = shuffleQuestions(matchingQuestions).slice(0, plannedQuestionCount),
  ) {
    const startedAt = new Date();
    const firstQuestion = questionsForSession[0];

    setSessionRunId(createBrowserSessionId());
    setSessionQuestions(questionsForSession);
    setCurrentIndex(0);
    setResponses(firstQuestion ? { [firstQuestion.id]: createSessionResponse(startedAt) } : {});
    setMarkedQuestionIds(new Set());
    setSessionStartedAt(startedAt);
    setSessionSubmittedAt(null);
    setClockNow(startedAt.getTime());
    setPhase('running');
  }

  function resetToSetup() {
    setPhase('setup');
    setSessionQuestions([]);
    setCurrentIndex(0);
    setResponses({});
    setMarkedQuestionIds(new Set());
    setSessionRunId(null);
    setSessionStartedAt(null);
    setSessionSubmittedAt(null);
  }

  function updateMcqResponse(questionId: string, selectedChoiceId: McqChoice['id']) {
    setResponses((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] ?? createSessionResponse()),
        selectedChoiceId,
      },
    }));
  }

  function updateFrqResponse(questionId: string, partId: string, response: string) {
    setResponses((current) => {
      const currentResponse = current[questionId] ?? createSessionResponse();

      return {
        ...current,
        [questionId]: {
          ...currentResponse,
          partResponses: {
            ...currentResponse.partResponses,
            [partId]: response,
          },
        },
      };
    });
  }

  function toggleMarkedQuestion(questionId: string) {
    setMarkedQuestionIds((current) => {
      const next = new Set(current);

      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }

      return next;
    });
  }

  const saveSessionAttempts = useCallback(
    (submittedAt: Date) => {
      const nextResponses = { ...responses };

      sessionQuestions.forEach((question) => {
        const response = nextResponses[question.id] ?? createSessionResponse();
        const submittedResponse = {
          ...response,
          submittedAt,
        };

        if (question.type === 'mcq') {
          const savedAttempt = response.selectedChoiceId
            ? onSaveMcqAttempt?.(
                question,
                response.selectedChoiceId,
                response.startedAt,
                submittedAt,
              )
            : undefined;

          nextResponses[question.id] = {
            ...submittedResponse,
            ...(savedAttempt?.id ? { attemptId: savedAttempt.id } : {}),
          };
          return;
        }

        if (!hasFrqResponse(response)) {
          nextResponses[question.id] = submittedResponse;
          return;
        }

        const savedAttempt = onSaveFrqAttempt?.(
          question,
          response.partResponses,
          response.earnedPointsByCriterion,
          response.startedAt,
          response.attemptId,
          submittedAt,
        );

        nextResponses[question.id] = {
          ...submittedResponse,
          ...(savedAttempt?.id ? { attemptId: savedAttempt.id } : {}),
        };
      });

      setResponses(nextResponses);
      return nextResponses;
    },
    [onSaveFrqAttempt, onSaveMcqAttempt, responses, sessionQuestions],
  );

  const saveGroupedSessionResult = useCallback(
    (
      nextResponses: Record<string, SessionResponse>,
      submittedAt: Date,
      updatedAt: Date = submittedAt,
    ) => {
      if (!sessionStartedAt || !sessionRunId) {
        return undefined;
      }

      return onSaveSessionResult?.(
        createSessionResult({
          id: sessionRunId,
          questionSetVersion,
          questions: sessionQuestions,
          responses: nextResponses,
          markedQuestionIds: [...markedQuestionIds],
          startedAt: sessionStartedAt,
          submittedAt,
          updatedAt,
          ...(timeLimitSeconds > 0 ? { timeLimitSeconds } : {}),
          filters: {
            type: typeFilter,
            unit: unitFilter,
            difficulty: difficultyFilter,
            calculator: calculatorFilter,
          },
        }),
      );
    },
    [
      calculatorFilter,
      difficultyFilter,
      markedQuestionIds,
      onSaveSessionResult,
      questionSetVersion,
      sessionQuestions,
      sessionRunId,
      sessionStartedAt,
      timeLimitSeconds,
      typeFilter,
      unitFilter,
    ],
  );

  const submitSession = useCallback(() => {
    const submittedAt = new Date();
    const nextResponses = saveSessionAttempts(submittedAt);
    saveGroupedSessionResult(nextResponses, submittedAt);
    setSessionSubmittedAt(submittedAt);
    setClockNow(submittedAt.getTime());
    setPhase('summary');
  }, [saveGroupedSessionResult, saveSessionAttempts]);

  useEffect(() => {
    submitSessionRef.current = submitSession;
  }, [submitSession]);

  function updateFrqCriterion(question: FrqQuestion, criterionId: string, checked: boolean) {
    const currentResponse = responses[question.id] ?? createSessionResponse();

    if (!hasFrqResponse(currentResponse)) {
      return;
    }

    const submittedAt = currentResponse.submittedAt ?? sessionSubmittedAt ?? new Date();
    const nextResponse = {
      ...currentResponse,
      submittedAt,
      frqReviewed: true,
      earnedPointsByCriterion: {
        ...currentResponse.earnedPointsByCriterion,
        [criterionId]: checked,
      },
    };
    const savedAttempt = onSaveFrqAttempt?.(
      question,
      nextResponse.partResponses,
      nextResponse.earnedPointsByCriterion,
      nextResponse.startedAt,
      nextResponse.attemptId,
      submittedAt,
    );
    const nextResponses = {
      ...responses,
      [question.id]: {
        ...nextResponse,
        ...(savedAttempt?.id ? { attemptId: savedAttempt.id } : {}),
      },
    };

    saveGroupedSessionResult(nextResponses, submittedAt, new Date());

    setResponses(nextResponses);
  }

  function retryMissedQuestions() {
    if (summary.pendingManualScoreCount > 0 || summary.missedQuestions.length === 0) {
      return;
    }

    startSession(summary.missedQuestions);
  }

  function renderSessionResponse(question: Question) {
    const response = responses[question.id];

    if (question.type === 'mcq') {
      return (
        <fieldset className="choice-list">
          <legend>Choices</legend>
          {question.choices.map((choice) => {
            const checked = response?.selectedChoiceId === choice.id;

            return (
              <label className="choice-option" data-checked={checked} key={choice.id}>
                <input
                  checked={checked}
                  name={`session-${question.id}`}
                  onChange={() => updateMcqResponse(question.id, choice.id)}
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
      );
    }

    return (
      <div className="frq-parts">
        {question.parts.map((part) => (
          <section className="frq-part" key={part.id}>
            <h2>Part {part.id}</h2>
            <MathText block text={part.prompt} />
            <label className="response-box">
              <span>Your response</span>
              <textarea
                onChange={(event) => updateFrqResponse(question.id, part.id, event.target.value)}
                rows={6}
                value={response?.partResponses[part.id] ?? ''}
              />
            </label>
          </section>
        ))}
      </div>
    );
  }

  function renderQuestionReview(question: Question, index: number) {
    const response = responses[question.id];
    const questionScore = scoreSessionQuestion(question, response);
    const hasResponse = hasFrqResponse(response);

    return (
      <article className="session-review-card" key={question.id}>
        <header className="attempt-card__header">
          <div>
            <p className="eyebrow">{getQuestionLabel(question, index)}</p>
            <h2>{question.skill}</h2>
          </div>
          <strong>
            {questionScore.score}/{questionScore.maxScore}
          </strong>
        </header>

        <div className="attempt-card__prompt">
          <MathText block text={question.prompt} />
          <QuestionAssetGallery ariaLabel="Question images and graphs" assets={question.assets} />
        </div>

        {question.type === 'mcq' ? (
          <section className="session-review-section">
            <div className="result-banner" data-correct={questionScore.isCorrect}>
              {questionScore.isCorrect ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
              <strong>{questionScore.isCorrect ? 'Correct' : 'Needs Review'}</strong>
              <span>
                Selected {response?.selectedChoiceId ?? 'none'}; correct answer{' '}
                {question.correctChoiceId}
              </span>
            </div>
            <div className="choice-explanations">
              <h3>Choice Review</h3>
              {question.choices.map((choice) => (
                <div className="choice-explanation" key={choice.id}>
                  <h4>
                    {choice.id}
                    {choice.id === question.correctChoiceId ? ' - Correct answer' : ''}
                  </h4>
                  <MathText block text={choice.explanation} />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="session-review-section">
            <div className="result-banner" data-correct="pending">
              <strong>{questionScore.needsManualScore ? 'Self Score Needed' : 'Self Score'}</strong>
              <span>
                {questionScore.score}/{questionScore.maxScore} points
              </span>
            </div>
            {question.parts.map((part) => (
              <div className="frq-review" key={part.id}>
                <h3>Part {part.id}</h3>
                <p className="student-response-copy">
                  {response?.partResponses[part.id]?.trim() || 'No response entered.'}
                </p>
                <h4>Sample Response</h4>
                <MathText block text={part.sampleResponse} />
                <h4>Rubric</h4>
                <div className="rubric-list">
                  {part.rubric.map((criterion) => (
                    <label className="rubric-item" key={criterion.id}>
                      <input
                        disabled={!hasResponse}
                        checked={response?.earnedPointsByCriterion[criterion.id] ?? false}
                        onChange={(event) =>
                          updateFrqCriterion(question, criterion.id, event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span>
                        <MathText text={criterion.description} />
                        <small>{criterion.points} point</small>
                      </span>
                    </label>
                  ))}
                </div>
                {!hasResponse ? (
                  <p className="session-review-note">
                    Rubric scoring is disabled because no FRQ response was entered.
                  </p>
                ) : null}
              </div>
            ))}
          </section>
        )}

        <section className="session-review-section">
          <h3>Explanation</h3>
          <MathText block text={question.explanation.summary} />
          <ol>
            {question.explanation.steps.map((step) => (
              <li key={step}>
                <MathText text={step} />
              </li>
            ))}
          </ol>
          <QuestionAssetGallery
            ariaLabel="Solution images and graphs"
            assets={question.explanation.assets}
          />
        </section>
      </article>
    );
  }

  if (phase === 'setup') {
    return (
      <main className="session-shell">
        <header className="session-header">
          <div>
            <p className="eyebrow">AP-Style Practice</p>
            <h1>Session Mode</h1>
          </div>
          <div className="summary-strip" aria-label="Question bank summary">
            <span>{questions.length} questions</span>
            <span>{matchingQuestions.length} match filters</span>
            <span>v{questionSetVersion}</span>
          </div>
        </header>

        <section className="session-setup">
          <div className="session-setup__intro">
            <ListChecks aria-hidden="true" />
            <div>
              <h2>Build a Practice Set</h2>
              <p>Choose a section style, filters, length, and optional timer.</p>
            </div>
          </div>

          <div className="form-grid form-grid--four">
            <label>
              Session Type
              <select
                onChange={(event) => setTypeFilter(event.target.value as SessionTypeFilter)}
                value={typeFilter}
              >
                <option value="mixed">Mixed</option>
                <option value="mcq">MCQ only</option>
                <option value="frq">FRQ only</option>
              </select>
            </label>
            <label>
              Unit
              <select onChange={(event) => setUnitFilter(event.target.value)} value={unitFilter}>
                <option value="all">All units</option>
                {filterOptions.units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Difficulty
              <select
                onChange={(event) =>
                  setDifficultyFilter(event.target.value as typeof difficultyFilter)
                }
                value={difficultyFilter}
              >
                <option value="all">All</option>
                {filterOptions.difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Calculator
              <select
                onChange={(event) =>
                  setCalculatorFilter(event.target.value as typeof calculatorFilter)
                }
                value={calculatorFilter}
              >
                <option value="all">All</option>
                {filterOptions.calculators.map((calculator) => (
                  <option key={calculator} value={calculator}>
                    {calculator === 'graphing' ? 'Graphing' : 'None'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-grid form-grid--two">
            <label>
              Questions
              <select
                onChange={(event) => setRequestedCount(Number(event.target.value))}
                value={requestedCount}
              >
                {countOptions.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Timer
              <select
                onChange={(event) => setTimeLimitMinutes(Number(event.target.value))}
                value={timeLimitMinutes}
              >
                {timerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="session-setup__footer">
            <div>
              <strong>{plannedQuestionCount}</strong>
              <span>
                question{plannedQuestionCount === 1 ? '' : 's'} will be used from{' '}
                {matchingQuestions.length} matching question
                {matchingQuestions.length === 1 ? '' : 's'}.
              </span>
            </div>
            <button
              className="primary-button"
              disabled={plannedQuestionCount === 0}
              onClick={() => startSession()}
              type="button"
            >
              <Play aria-hidden="true" />
              Start Session
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (phase === 'summary') {
    return (
      <main className="session-shell">
        <header className="session-header">
          <div>
            <p className="eyebrow">Session Complete</p>
            <h1>Review Results</h1>
          </div>
          <div className="manager-actions">
            <button className="ghost-button" onClick={resetToSetup} type="button">
              <RotateCcw aria-hidden="true" />
              New Session
            </button>
            <button
              className="primary-button"
              disabled={summary.missedQuestions.length === 0 || summary.pendingManualScoreCount > 0}
              onClick={retryMissedQuestions}
              type="button"
            >
              Review Missed Only
            </button>
          </div>
        </header>

        <section className="review-stats" aria-label="Session summary">
          <div>
            <strong>{summary.percent}%</strong>
            <span>Score</span>
          </div>
          <div>
            <strong>
              {summary.score}/{summary.maxScore}
            </strong>
            <span>Points</span>
          </div>
          <div>
            <strong>
              {summary.answered}/{sessionQuestions.length}
            </strong>
            <span>Answered</span>
          </div>
          <div>
            <strong>{formatDuration(elapsedSeconds)}</strong>
            <span>{sessionSubmittedAt ? 'Time Used' : 'Elapsed'}</span>
          </div>
        </section>

        {summary.pendingManualScoreCount > 0 ? (
          <p className="session-review-note">
            Self-score {summary.pendingManualScoreCount} FRQ response
            {summary.pendingManualScoreCount === 1 ? '' : 's'} before retrying missed questions.
          </p>
        ) : null}

        <section className="session-review-list" aria-label="Session question review">
          {sessionQuestions.map((question, index) => renderQuestionReview(question, index))}
        </section>
      </main>
    );
  }

  return (
    <main className="session-shell">
      <header className="session-header">
        <div>
          <p className="eyebrow">
            Question {currentIndex + 1} of {sessionQuestions.length}
          </p>
          <h1>{currentQuestion?.skill ?? 'Session'}</h1>
        </div>
        <div className="session-timer" aria-label="Session timer">
          <Clock3 aria-hidden="true" />
          <span>{formatDuration(elapsedSeconds)}</span>
          {remainingSeconds !== null ? (
            <strong>{formatDuration(remainingSeconds)} left</strong>
          ) : null}
        </div>
      </header>

      <nav className="session-progress" aria-label="Session question navigation">
        {sessionQuestions.map((question, index) => {
          const response = responses[question.id];
          const answered =
            question.type === 'mcq'
              ? Boolean(response?.selectedChoiceId)
              : hasFrqResponse(response);

          return (
            <button
              className="session-progress__item"
              data-active={index === currentIndex}
              data-answered={answered}
              data-marked={markedQuestionIds.has(question.id)}
              key={question.id}
              onClick={() => setCurrentIndex(index)}
              type="button"
            >
              {index + 1}
            </button>
          );
        })}
      </nav>

      {currentQuestion ? (
        <>
          <section className="question-header">
            <div>
              <p className="eyebrow">{currentQuestion.type.toUpperCase()}</p>
              <h2>{currentQuestion.topic}</h2>
            </div>
            <QuestionMeta question={currentQuestion} />
          </section>

          <section className="prompt-panel">
            <MathText block text={currentQuestion.prompt} />
            <QuestionAssetGallery
              ariaLabel="Question images and graphs"
              assets={currentQuestion.assets}
            />
          </section>

          <section className="response-area">{renderSessionResponse(currentQuestion)}</section>

          <nav className="question-nav" aria-label="Session actions">
            <button
              className="ghost-button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
              Previous
            </button>
            <button
              className="ghost-button"
              onClick={() => toggleMarkedQuestion(currentQuestion.id)}
              type="button"
            >
              <Flag aria-hidden="true" />
              {markedQuestionIds.has(currentQuestion.id) ? 'Unmark' : 'Mark'}
            </button>
            <button
              className="ghost-button"
              disabled={currentIndex === sessionQuestions.length - 1}
              onClick={() =>
                setCurrentIndex((index) => Math.min(sessionQuestions.length - 1, index + 1))
              }
              type="button"
            >
              Next
              <ChevronRight aria-hidden="true" />
            </button>
            <button className="primary-button" onClick={submitSession} type="button">
              Submit Session
            </button>
          </nav>
        </>
      ) : null}
    </main>
  );
}
