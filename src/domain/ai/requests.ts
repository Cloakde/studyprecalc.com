import type { FrqQuestion } from '../questions/types';
import type { AiFrqGradingRequest } from './types';

export type CreateAiFrqGradingRequestInput = {
  id: string;
  accountId: string;
  question: FrqQuestion;
  partResponses: Record<string, string>;
  requestedAt: string | Date;
};

function toIsoTimestamp(timestamp: string | Date): string {
  return timestamp instanceof Date ? timestamp.toISOString() : timestamp;
}

export function createAiFrqGradingRequest(
  input: CreateAiFrqGradingRequestInput,
): AiFrqGradingRequest {
  return {
    id: input.id,
    accountId: input.accountId,
    questionId: input.question.id,
    questionMeta: {
      unit: input.question.unit,
      topic: input.question.topic,
      skill: input.question.skill,
      difficulty: input.question.difficulty,
      calculator: input.question.calculator,
    },
    prompt: input.question.prompt,
    parts: input.question.parts.map((part) => ({
      id: part.id,
      prompt: part.prompt,
      studentResponse: input.partResponses[part.id] ?? '',
      expectedWork: [...part.expectedWork],
      rubric: part.rubric.map((criterion) => ({
        ...criterion,
        partId: part.id,
      })),
    })),
    requestedAt: toIsoTimestamp(input.requestedAt),
  };
}
