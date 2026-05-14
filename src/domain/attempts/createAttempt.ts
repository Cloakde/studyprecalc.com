import { scoreFrqChecklist } from '../scoring/scoreFrq';
import { scoreMcq, type McqScoreResult } from '../scoring/scoreMcq';
import type { FrqQuestion, McqChoice, McqQuestion } from '../questions/types';
import type { Attempt, AttemptScore, AttemptTimestamp, CreateAttemptMetadata } from './types';

export type CreateMcqAttemptInput = CreateAttemptMetadata & {
  question: McqQuestion;
  selectedChoiceId: McqChoice['id'];
  score?: AttemptScore | McqScoreResult;
};

export type CreateFrqAttemptInput = CreateAttemptMetadata & {
  question: FrqQuestion;
  partResponses: Record<string, string>;
  earnedPointsByCriterion?: Record<string, boolean>;
  score?: AttemptScore;
};

function toIsoTimestamp(timestamp: AttemptTimestamp): string {
  return timestamp instanceof Date ? timestamp.toISOString() : timestamp;
}

function deriveTimeSpentSeconds(startedAt: string, submittedAt: string): number | undefined {
  const startedAtMs = Date.parse(startedAt);
  const submittedAtMs = Date.parse(submittedAt);

  if (Number.isNaN(startedAtMs) || Number.isNaN(submittedAtMs)) {
    return undefined;
  }

  return Math.max(0, Math.round((submittedAtMs - startedAtMs) / 1000));
}

function createAttemptCore(
  metadata: CreateAttemptMetadata,
  rest: Omit<Attempt, keyof CreateAttemptMetadata | 'timeSpentSeconds' | 'updatedAt'>,
): Attempt {
  const startedAt = toIsoTimestamp(metadata.startedAt);
  const submittedAt = toIsoTimestamp(metadata.submittedAt);
  const updatedAt = toIsoTimestamp(metadata.updatedAt ?? metadata.submittedAt);
  const timeSpentSeconds =
    metadata.timeSpentSeconds ?? deriveTimeSpentSeconds(startedAt, submittedAt);

  return {
    ...rest,
    id: metadata.id,
    startedAt,
    submittedAt,
    updatedAt,
    ...(timeSpentSeconds === undefined ? {} : { timeSpentSeconds }),
  };
}

function removeEmptyResponses(partResponses: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(partResponses).filter(([, response]) => response.length > 0),
  );
}

export function createMcqAttempt(input: CreateMcqAttemptInput): Attempt {
  const score = input.score ?? scoreMcq(input.question, input.selectedChoiceId);
  const isCorrect = score.isCorrect ?? input.question.correctChoiceId === input.selectedChoiceId;

  return createAttemptCore(input, {
    questionId: input.question.id,
    questionType: 'mcq',
    response: {
      type: 'mcq',
      selectedChoiceId: input.selectedChoiceId,
    },
    score: score.score,
    maxScore: score.maxScore,
    isCorrect,
  });
}

export function createFrqAttempt(input: CreateFrqAttemptInput): Attempt {
  const score: AttemptScore =
    input.score ?? scoreFrqChecklist(input.question, input.earnedPointsByCriterion ?? {});

  return createAttemptCore(input, {
    questionId: input.question.id,
    questionType: 'frq',
    response: {
      type: 'frq',
      partResponses: removeEmptyResponses(input.partResponses),
      ...(input.earnedPointsByCriterion
        ? { earnedPointsByCriterion: { ...input.earnedPointsByCriterion } }
        : {}),
    },
    score: score.score,
    maxScore: score.maxScore,
    isCorrect: score.isCorrect ?? score.score === score.maxScore,
  });
}
