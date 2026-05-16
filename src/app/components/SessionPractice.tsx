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
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

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
  setupPreset?: {
    eyebrow?: string;
    title?: string;
    introTitle?: string;
    description?: string;
    lockQuestionSet?: boolean;
    defaultRequestedCount?: number;
    defaultTimeLimitMinutes?: number;
  };
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
type SessionReviewFilter = 'all' | 'needs-review';
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
export type SessionReviewQuestion = QuestionScore & {
  question: Question;
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

function formatQuestionCount(count: number): string {
  return `${count} question${count === 1 ? '' : 's'}`;
}

function countQuestionTypes(questions: Question[]): { mcq: number; frq: number } {
  return questions.reduce(
    (counts, question) => ({
      mcq: counts.mcq + (question.type === 'mcq' ? 1 : 0),
      frq: counts.frq + (question.type === 'frq' ? 1 : 0),
    }),
    { mcq: 0, frq: 0 },
  );
}

function questionNeedsReview(questionScore: SessionReviewQuestion): boolean {
  return questionScore.needsManualScore === true || questionScore.score < questionScore.maxScore;
}

function getSessionReviewItems(
  questionScores: SessionReviewQuestion[],
  filter: SessionReviewFilter,
): SessionReviewQuestion[] {
  return filter === 'needs-review' ? questionScores.filter(questionNeedsReview) : questionScores;
}

function getMistakePracticeAction({
  missedQuestionCount,
  pendingManualScoreCount,
}: {
  missedQuestionCount: number;
  pendingManualScoreCount: number;
}): { disabled: boolean; label: string; detail: string } {
  if (pendingManualScoreCount > 0) {
    return {
      disabled: true,
      label: 'Practice Mistakes',
      detail: `Self-score ${formatQuestionCount(pendingManualScoreCount)} before starting a mistakes-only session.`,
    };
  }

  if (missedQuestionCount === 0) {
    return {
      disabled: true,
      label: 'Practice Mistakes',
      detail: 'No scored mistakes are ready for a follow-up session.',
    };
  }

  return {
    disabled: false,
    label: `Practice ${missedQuestionCount} Mistake${missedQuestionCount === 1 ? '' : 's'}`,
    detail: `Start a new session with only the ${formatQuestionCount(missedQuestionCount)} that need another attempt.`,
  };
}

const sessionPracticeViewModel = {
  getMistakePracticeAction,
  getSessionReviewItems,
} as const;

// eslint-disable-next-line react-refresh/only-export-components
export { sessionPracticeViewModel };

export function SessionPractice({
  questions,
  questionSetVersion,
  setupPreset,
  onSaveMcqAttempt,
  onSaveFrqAttempt,
  onSaveSessionResult,
}: SessionPracticeProps) {
  const setupStatusId = useId();
  const summaryActionStatusId = useId();
  const [phase, setPhase] = useState<SessionPhase>('setup');
  const [typeFilter, setTypeFilter] = useState<SessionTypeFilter>('mixed');
  const [unitFilter, setUnitFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Question['difficulty']>('all');
  const [calculatorFilter, setCalculatorFilter] = useState<'all' | Question['calculator']>('all');
  const [requestedCount, setRequestedCount] = useState(
    () => setupPreset?.defaultRequestedCount ?? 5,
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    () => setupPreset?.defaultTimeLimitMinutes ?? 0,
  );
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, SessionResponse>>({});
  const [markedQuestionIds, setMarkedQuestionIds] = useState<Set<string>>(() => new Set());
  const [sessionRunId, setSessionRunId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [sessionSubmittedAt, setSessionSubmittedAt] = useState<Date | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [summaryReviewFilter, setSummaryReviewFilter] = useState<SessionReviewFilter>('all');
  const submitSessionRef = useRef<() => void>(() => undefined);
  const isQuestionSetLocked = setupPreset?.lockQuestionSet === true;

  const questionTypeCounts = useMemo(() => countQuestionTypes(questions), [questions]);
  const setupEyebrow = setupPreset?.eyebrow ?? 'AP-Style Practice';
  const setupTitle = setupPreset?.title ?? 'Session Mode';
  const setupIntroTitle = setupPreset?.introTitle ?? 'Build a Practice Set';

  const filterOptions = useMemo(
    () => ({
      units: [...new Set(questions.map((question) => question.unit))].sort(),
      difficulties: [...new Set(questions.map((question) => question.difficulty))].sort(),
      calculators: [...new Set(questions.map((question) => question.calculator))].sort(),
    }),
    [questions],
  );

  const matchingQuestions = useMemo(() => {
    if (isQuestionSetLocked) {
      return questions;
    }

    return questions.filter((question) => {
      const matchesType = typeFilter === 'mixed' || question.type === typeFilter;
      const matchesUnit = unitFilter === 'all' || question.unit === unitFilter;
      const matchesDifficulty =
        difficultyFilter === 'all' || question.difficulty === difficultyFilter;
      const matchesCalculator =
        calculatorFilter === 'all' || question.calculator === calculatorFilter;

      return matchesType && matchesUnit && matchesDifficulty && matchesCalculator;
    });
  }, [calculatorFilter, difficultyFilter, isQuestionSetLocked, questions, typeFilter, unitFilter]);
  const matchingTypeCounts = useMemo(
    () => countQuestionTypes(matchingQuestions),
    [matchingQuestions],
  );
  const countSelectOptions = useMemo(
    () =>
      [...new Set([...countOptions, requestedCount])]
        .filter((count) => count > 0 && count <= Math.max(1, questions.length, requestedCount))
        .sort((first, second) => first - second),
    [questions.length, requestedCount],
  );
  const timerSelectOptions = useMemo(
    () =>
      [...timerOptions, { label: `${timeLimitMinutes} min`, value: timeLimitMinutes }]
        .filter((option) => option.value >= 0)
        .filter(
          (option, index, options) =>
            options.findIndex((candidate) => candidate.value === option.value) === index,
        )
        .sort((first, second) => first.value - second.value),
    [timeLimitMinutes],
  );

  const plannedQuestionCount =
    matchingQuestions.length === 0
      ? 0
      : isQuestionSetLocked
        ? matchingQuestions.length
        : Math.min(Math.max(1, requestedCount), matchingQuestions.length);

  const currentQuestion = sessionQuestions[currentIndex];
  const elapsedSeconds = sessionStartedAt
    ? Math.floor((clockNow - sessionStartedAt.getTime()) / 1000)
    : 0;
  const timeLimitSeconds = timeLimitMinutes * 60;
  const remainingSeconds =
    timeLimitSeconds > 0 ? Math.max(0, timeLimitSeconds - elapsedSeconds) : null;

  const summary = useMemo(() => {
    const questionScores: SessionReviewQuestion[] = sessionQuestions.map((question) => ({
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

  const summaryReviewItems = useMemo(
    () => getSessionReviewItems(summary.questionScores, summaryReviewFilter),
    [summary.questionScores, summaryReviewFilter],
  );
  const mistakePracticeAction = getMistakePracticeAction({
    missedQuestionCount: summary.missedQuestions.length,
    pendingManualScoreCount: summary.pendingManualScoreCount,
  });

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
    questionsForSession = isQuestionSetLocked
      ? matchingQuestions
      : shuffleQuestions(matchingQuestions).slice(0, plannedQuestionCount),
  ) {
    if (questionsForSession.length === 0) {
      return;
    }

    const startedAt = new Date();
    const firstQuestion = questionsForSession[0];

    setSessionRunId(createBrowserSessionId());
    setSessionQuestions(questionsForSession);
    setCurrentIndex(0);
    setResponses(firstQuestion ? { [firstQuestion.id]: createSessionResponse(startedAt) } : {});
    setMarkedQuestionIds(new Set());
    setSessionStartedAt(startedAt);
    setSessionSubmittedAt(null);
    setSummaryReviewFilter('all');
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
    setSummaryReviewFilter('all');
  }

  function resetFilters() {
    setTypeFilter('mixed');
    setUnitFilter('all');
    setDifficultyFilter('all');
    setCalculatorFilter('all');
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
            unit: isQuestionSetLocked ? setupTitle : unitFilter,
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
      isQuestionSetLocked,
      setupTitle,
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
    setSummaryReviewFilter('all');
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
    if (questions.length === 0) {
      return (
        <main className="empty-shell" aria-labelledby="session-empty-heading">
          <p className="eyebrow">{setupEyebrow}</p>
          <h1 id="session-empty-heading">{setupTitle}</h1>
          <p>No published questions are available for sessions.</p>
          <p>Questions need to be published before students can build timed MCQ or FRQ sets.</p>
        </main>
      );
    }

    const setupStatusText =
      matchingQuestions.length === 0
        ? 'No questions match the current filters.'
        : isQuestionSetLocked
          ? `${formatQuestionCount(plannedQuestionCount)} are included in this set.`
          : `${formatQuestionCount(plannedQuestionCount)} will be selected from ${formatQuestionCount(
              matchingQuestions.length,
            )}.`;

    return (
      <main className="session-shell">
        <header className="session-header">
          <div>
            <p className="eyebrow">{setupEyebrow}</p>
            <h1>{setupTitle}</h1>
            {setupPreset?.description ? <p>{setupPreset.description}</p> : null}
          </div>
          <div className="summary-strip" aria-label="Question bank summary">
            <span>{questions.length} questions</span>
            <span>{questionTypeCounts.mcq} MCQ</span>
            <span>{questionTypeCounts.frq} FRQ</span>
            <span>{matchingQuestions.length} match filters</span>
            <span>v{questionSetVersion}</span>
          </div>
        </header>

        <section className="session-setup">
          <div className="session-setup__intro">
            <ListChecks aria-hidden="true" />
            <div>
              <h2>{setupIntroTitle}</h2>
              <p>{setupStatusText}</p>
            </div>
          </div>
          <div className="summary-strip" aria-label="Current session setup">
            <span>{matchingTypeCounts.mcq} matching MCQ</span>
            <span>{matchingTypeCounts.frq} matching FRQ</span>
            <span>{timeLimitMinutes === 0 ? 'Untimed' : `${timeLimitMinutes} min timer`}</span>
            <span>{formatQuestionCount(plannedQuestionCount)} planned</span>
          </div>

          {!isQuestionSetLocked ? (
            <div className="form-grid form-grid--four">
              <label>
                Question Type
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
          ) : null}

          <div className="form-grid form-grid--two">
            {!isQuestionSetLocked ? (
              <label>
                Questions
                <select
                  onChange={(event) => setRequestedCount(Number(event.target.value))}
                  value={requestedCount}
                >
                  {countSelectOptions.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              Timer
              <select
                onChange={(event) => setTimeLimitMinutes(Number(event.target.value))}
                value={timeLimitMinutes}
              >
                {timerSelectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {matchingQuestions.length === 0 ? (
            <p className="session-review-note" id={setupStatusId} role="status">
              No questions match these filters.
            </p>
          ) : (
            <p className="visually-hidden" id={setupStatusId} aria-live="polite">
              {setupStatusText}
            </p>
          )}

          <div className="session-setup__footer">
            <div>
              <strong>{plannedQuestionCount}</strong>
              <span>
                {matchingQuestions.length === 0
                  ? 'No questions are available with the selected filters.'
                  : `${formatQuestionCount(plannedQuestionCount)} will be used from ${formatQuestionCount(
                      matchingQuestions.length,
                    )} that match.`}
              </span>
            </div>
            <div className="manager-actions">
              {matchingQuestions.length === 0 ? (
                <button className="ghost-button" onClick={resetFilters} type="button">
                  Reset filters
                </button>
              ) : null}
              <button
                aria-describedby={setupStatusId}
                className="primary-button"
                disabled={plannedQuestionCount === 0}
                onClick={() => startSession()}
                type="button"
              >
                <Play aria-hidden="true" />
                Start Session
              </button>
            </div>
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
              aria-describedby={summaryActionStatusId}
              disabled={mistakePracticeAction.disabled}
              onClick={retryMissedQuestions}
              type="button"
            >
              <Play aria-hidden="true" />
              {mistakePracticeAction.label}
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
          <p className="session-review-note" id={summaryActionStatusId} role="status">
            Self-score {summary.pendingManualScoreCount} FRQ response
            {summary.pendingManualScoreCount === 1 ? '' : 's'} before retrying missed questions.
          </p>
        ) : (
          <p className="session-review-note" id={summaryActionStatusId}>
            {mistakePracticeAction.detail}
          </p>
        )}

        <div className="manager-actions" aria-label="Review filter">
          <button
            aria-pressed={summaryReviewFilter === 'all'}
            className="ghost-button"
            data-active={summaryReviewFilter === 'all'}
            onClick={() => setSummaryReviewFilter('all')}
            type="button"
          >
            All Questions
          </button>
          <button
            aria-pressed={summaryReviewFilter === 'needs-review'}
            className="ghost-button"
            data-active={summaryReviewFilter === 'needs-review'}
            onClick={() => setSummaryReviewFilter('needs-review')}
            type="button"
          >
            Needs Review ({getSessionReviewItems(summary.questionScores, 'needs-review').length})
          </button>
        </div>

        <section className="session-review-list" aria-label="Session question review">
          {summaryReviewItems.length === 0 ? (
            <section className="review-empty" role="status">
              <h2>No mistakes to review</h2>
              <p>All scored questions are complete.</p>
            </section>
          ) : null}
          {summaryReviewItems.map((questionScore) => {
            const originalIndex = sessionQuestions.findIndex(
              (question) => question.id === questionScore.question.id,
            );

            return renderQuestionReview(questionScore.question, Math.max(0, originalIndex));
          })}
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
              aria-current={index === currentIndex ? 'step' : undefined}
              aria-label={`Question ${index + 1}: ${question.type.toUpperCase()}, ${
                answered ? 'answered' : 'not answered'
              }${markedQuestionIds.has(question.id) ? ', marked for review' : ''}`}
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

      {!currentQuestion ? (
        <section className="review-empty" role="status">
          <h2>No questions in this session</h2>
          <p>Return to setup to build a new practice set.</p>
          <button className="ghost-button" onClick={resetToSetup} type="button">
            <RotateCcw aria-hidden="true" />
            Back to Setup
          </button>
        </section>
      ) : null}

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
