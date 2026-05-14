import { z } from 'zod';

const mcqResponseSchema = z.object({
  type: z.literal('mcq'),
  selectedChoiceId: z.enum(['A', 'B', 'C', 'D']),
});

const frqResponseSchema = z.object({
  type: z.literal('frq'),
  partResponses: z.record(z.string().min(1)),
  earnedPointsByCriterion: z.record(z.boolean()).optional(),
});

export const AttemptSchema = z
  .object({
    id: z.string().min(1),
    questionId: z.string().min(1),
    questionType: z.enum(['mcq', 'frq']),
    startedAt: z.string().datetime(),
    submittedAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    response: z.discriminatedUnion('type', [mcqResponseSchema, frqResponseSchema]),
    score: z.number().min(0),
    maxScore: z.number().positive(),
    isCorrect: z.boolean().optional(),
    timeSpentSeconds: z.number().min(0).optional(),
  })
  .superRefine((attempt, context) => {
    if (attempt.questionType !== attempt.response.type) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['response', 'type'],
        message: 'Attempt response type must match questionType.',
      });
    }

    if (attempt.score > attempt.maxScore) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['score'],
        message: 'Attempt score cannot exceed maxScore.',
      });
    }

    if (attempt.questionType === 'mcq' && attempt.isCorrect === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['isCorrect'],
        message: 'MCQ attempts must include isCorrect.',
      });
    }
  });

export type ValidatedAttempt = z.infer<typeof AttemptSchema>;
