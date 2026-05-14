import type { McqChoice, QuestionType } from '../questions/types';

export type McqResponse = {
  type: 'mcq';
  selectedChoiceId: McqChoice['id'];
};

export type FrqResponse = {
  type: 'frq';
  partResponses: Record<string, string>;
  earnedPointsByCriterion?: Record<string, boolean>;
};

export type AttemptResponse = McqResponse | FrqResponse;

export type Attempt = {
  id: string;
  questionId: string;
  questionType: QuestionType;
  startedAt: string;
  submittedAt: string;
  updatedAt?: string;
  response: AttemptResponse;
  score: number;
  maxScore: number;
  isCorrect?: boolean;
  timeSpentSeconds?: number;
};

export type AttemptTimestamp = string | Date;

export type CreateAttemptMetadata = {
  id: string;
  startedAt: AttemptTimestamp;
  submittedAt: AttemptTimestamp;
  updatedAt?: AttemptTimestamp;
  timeSpentSeconds?: number;
};

export type AttemptScore = {
  score: number;
  maxScore: number;
  isCorrect?: boolean;
};
