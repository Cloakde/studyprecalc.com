import type { Question } from '../questions/types';
import { scoreFrqChecklist } from '../scoring/scoreFrq';
import { scoreMcq } from '../scoring/scoreMcq';
import type {
  SessionFilterSummary,
  SessionQuestionResult,
  SessionResponseSnapshot,
  SessionResult,
} from './types';

export type CreateSessionResultInput = {
  id: string;
  questionSetVersion: string;
  questions: Question[];
  responses: Record<string, SessionResponseSnapshot>;
  markedQuestionIds: string[];
  startedAt: Date | string;
  submittedAt: Date | string;
  updatedAt?: Date | string;
  timeLimitSeconds?: number;
  filters: SessionFilterSummary;
};

function toIsoTimestamp(timestamp: Date | string): string {
  return timestamp instanceof Date ? timestamp.toISOString() : timestamp;
}

function deriveDurationSeconds(startedAt: string, submittedAt: string): number {
  const startedAtMs = Date.parse(startedAt);
  const submittedAtMs = Date.parse(submittedAt);

  if (Number.isNaN(startedAtMs) || Number.isNaN(submittedAtMs)) {
    return 0;
  }

  return Math.max(0, Math.round((submittedAtMs - startedAtMs) / 1000));
}

function hasFrqResponse(response: SessionResponseSnapshot | undefined): boolean {
  return Object.values(response?.partResponses ?? {}).some((partResponse) => partResponse.trim());
}

export function createSessionResult(input: CreateSessionResultInput): SessionResult {
  const startedAt = toIsoTimestamp(input.startedAt);
  const submittedAt = toIsoTimestamp(input.submittedAt);
  const updatedAt = toIsoTimestamp(input.updatedAt ?? input.submittedAt);
  const markedQuestionIds = [...input.markedQuestionIds];

  const questionResults: SessionQuestionResult[] = input.questions.map((question) => {
    const response = input.responses[question.id];
    const responseStartedAt = response ? toIsoTimestamp(response.startedAt) : startedAt;
    const responseSubmittedAt = response?.submittedAt
      ? toIsoTimestamp(response.submittedAt)
      : submittedAt;

    if (question.type === 'mcq') {
      const score = response?.selectedChoiceId
        ? scoreMcq(question, response.selectedChoiceId)
        : { score: 0, maxScore: 1, isCorrect: false };

      return {
        questionId: question.id,
        questionType: question.type,
        unit: question.unit,
        topic: question.topic,
        skill: question.skill,
        difficulty: question.difficulty,
        calculator: question.calculator,
        score: score.score,
        maxScore: score.maxScore,
        answered: Boolean(response?.selectedChoiceId),
        markedForReview: markedQuestionIds.includes(question.id),
        isCorrect: score.isCorrect,
        ...(response?.attemptId ? { attemptId: response.attemptId } : {}),
        timeSpentSeconds: deriveDurationSeconds(responseStartedAt, responseSubmittedAt),
      };
    }

    const answered = hasFrqResponse(response);
    const score = scoreFrqChecklist(question, response?.earnedPointsByCriterion ?? {});

    return {
      questionId: question.id,
      questionType: question.type,
      unit: question.unit,
      topic: question.topic,
      skill: question.skill,
      difficulty: question.difficulty,
      calculator: question.calculator,
      score: score.score,
      maxScore: score.maxScore,
      answered,
      markedForReview: markedQuestionIds.includes(question.id),
      needsManualScore: answered && response?.frqReviewed !== true,
      isCorrect: score.score === score.maxScore,
      ...(response?.attemptId ? { attemptId: response.attemptId } : {}),
      timeSpentSeconds: deriveDurationSeconds(responseStartedAt, responseSubmittedAt),
    };
  });

  const score = questionResults.reduce((total, questionResult) => total + questionResult.score, 0);
  const maxScore = questionResults.reduce(
    (total, questionResult) => total + questionResult.maxScore,
    0,
  );
  const pendingManualScoreCount = questionResults.filter(
    (questionResult) => questionResult.needsManualScore,
  ).length;

  return {
    id: input.id,
    questionSetVersion: input.questionSetVersion,
    startedAt,
    submittedAt,
    updatedAt,
    durationSeconds: deriveDurationSeconds(startedAt, submittedAt),
    ...(input.timeLimitSeconds === undefined ? {} : { timeLimitSeconds: input.timeLimitSeconds }),
    filters: input.filters,
    plannedQuestionCount: input.questions.length,
    answeredQuestionCount: questionResults.filter((questionResult) => questionResult.answered)
      .length,
    score,
    maxScore,
    percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    pendingManualScoreCount,
    missedQuestionIds: questionResults
      .filter(
        (questionResult) =>
          !questionResult.needsManualScore && questionResult.score < questionResult.maxScore,
      )
      .map((questionResult) => questionResult.questionId),
    markedQuestionIds,
    questionResults,
  };
}
