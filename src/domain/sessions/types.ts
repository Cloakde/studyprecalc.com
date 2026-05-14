import type { CalculatorPolicy, Difficulty, McqChoice, QuestionType } from '../questions/types';

export type SessionFilterSummary = {
  type: 'mixed' | QuestionType;
  unit: string;
  difficulty: 'all' | Difficulty;
  calculator: 'all' | CalculatorPolicy;
};

export type SessionResponseSnapshot = {
  startedAt: string | Date;
  submittedAt?: string | Date;
  selectedChoiceId?: McqChoice['id'];
  partResponses: Record<string, string>;
  earnedPointsByCriterion: Record<string, boolean>;
  frqReviewed?: boolean;
  attemptId?: string;
};

export type SessionQuestionResult = {
  questionId: string;
  questionType: QuestionType;
  unit: string;
  topic: string;
  skill: string;
  difficulty: Difficulty;
  calculator: CalculatorPolicy;
  score: number;
  maxScore: number;
  answered: boolean;
  markedForReview: boolean;
  needsManualScore?: boolean;
  isCorrect?: boolean;
  attemptId?: string;
  timeSpentSeconds?: number;
};

export type SessionResult = {
  id: string;
  questionSetVersion: string;
  startedAt: string;
  submittedAt: string;
  updatedAt: string;
  durationSeconds: number;
  timeLimitSeconds?: number;
  filters: SessionFilterSummary;
  plannedQuestionCount: number;
  answeredQuestionCount: number;
  score: number;
  maxScore: number;
  percent: number;
  pendingManualScoreCount: number;
  missedQuestionIds: string[];
  markedQuestionIds: string[];
  questionResults: SessionQuestionResult[];
};
