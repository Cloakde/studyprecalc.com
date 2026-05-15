import type { CalculatorPolicy, Difficulty } from '../questions/types';

export type AiGradingProviderId = 'gemini';

export type AiGradingProviderConfig = {
  provider: 'gemini';
  model: string;
  apiKeyEnvVar?: string;
  proxyEndpoint?: string;
};

export type AiGradingFeatureConfig = {
  enabled: boolean;
  provider?: AiGradingProviderConfig;
  dailyRequestLimit: number;
  feedbackRetentionDays?: number;
};

export type AiFrqRubricCriterion = {
  id: string;
  partId: string;
  description: string;
  points: number;
};

export type AiFrqGradingRequestPart = {
  id: string;
  prompt: string;
  studentResponse: string;
  expectedWork: string[];
  rubric: AiFrqRubricCriterion[];
};

export type AiFrqGradingRequest = {
  id: string;
  accountId: string;
  questionId: string;
  questionMeta: {
    unit: string;
    topic: string;
    skill: string;
    difficulty: Difficulty;
    calculator: CalculatorPolicy;
  };
  prompt: string;
  parts: AiFrqGradingRequestPart[];
  requestedAt: string;
};

export type AiCriterionFeedback = {
  criterionId: string;
  partId: string;
  earned: boolean;
  points: number;
  confidence: number;
  rationale: string;
};

export type AiPartFeedback = {
  partId: string;
  summary: string;
  nextStep?: string;
};

export type AiFrqGradingResultStatus = 'completed' | 'needs_review' | 'rejected';

export type AiFrqGradingResult = {
  id: string;
  requestId: string;
  accountId: string;
  questionId: string;
  provider: AiGradingProviderId;
  model: string;
  status: AiFrqGradingResultStatus;
  createdAt: string;
  score: number;
  maxScore: number;
  criterionFeedback: AiCriterionFeedback[];
  partFeedback: AiPartFeedback[];
  overallFeedback: string;
  safety: {
    externalApiCalled: false;
    humanReviewRecommended: boolean;
    blockedReason?: string;
  };
};

export type AiUsageRecordStatus = 'accepted' | 'rejected' | 'failed';

export type AiUsageRecord = {
  id: string;
  accountId: string;
  provider: AiGradingProviderId;
  requestId: string;
  dateKey: string;
  createdAt: string;
  status: AiUsageRecordStatus;
};

export type AiDailyUsageSnapshot = {
  accountId: string;
  dateKey: string;
  used: number;
  limit: number;
  remaining: number;
  allowed: boolean;
};
