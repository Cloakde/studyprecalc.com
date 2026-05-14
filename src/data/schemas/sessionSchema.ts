import { z } from 'zod';

const sessionFilterSummarySchema = z.object({
  type: z.enum(['mixed', 'mcq', 'frq']),
  unit: z.string().min(1),
  difficulty: z.enum(['all', 'intro', 'medium', 'advanced']),
  calculator: z.enum(['all', 'none', 'graphing']),
});

const sessionQuestionResultSchema = z
  .object({
    questionId: z.string().min(1),
    questionType: z.enum(['mcq', 'frq']),
    unit: z.string().min(1),
    topic: z.string().min(1),
    skill: z.string().min(1),
    difficulty: z.enum(['intro', 'medium', 'advanced']),
    calculator: z.enum(['none', 'graphing']),
    score: z.number().min(0),
    maxScore: z.number().positive(),
    answered: z.boolean(),
    markedForReview: z.boolean(),
    needsManualScore: z.boolean().optional(),
    isCorrect: z.boolean().optional(),
    attemptId: z.string().min(1).optional(),
    timeSpentSeconds: z.number().min(0).optional(),
  })
  .superRefine((questionResult, context) => {
    if (questionResult.score > questionResult.maxScore) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['score'],
        message: 'Question score cannot exceed maxScore.',
      });
    }
  });

export const SessionResultSchema = z
  .object({
    id: z.string().min(1),
    questionSetVersion: z.string().min(1),
    startedAt: z.string().datetime(),
    submittedAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    durationSeconds: z.number().min(0),
    timeLimitSeconds: z.number().min(0).optional(),
    filters: sessionFilterSummarySchema,
    plannedQuestionCount: z.number().int().min(0),
    answeredQuestionCount: z.number().int().min(0),
    score: z.number().min(0),
    maxScore: z.number().min(0),
    percent: z.number().min(0).max(100),
    pendingManualScoreCount: z.number().int().min(0),
    missedQuestionIds: z.array(z.string().min(1)),
    markedQuestionIds: z.array(z.string().min(1)),
    questionResults: z.array(sessionQuestionResultSchema),
  })
  .superRefine((sessionResult, context) => {
    if (sessionResult.score > sessionResult.maxScore) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['score'],
        message: 'Session score cannot exceed maxScore.',
      });
    }

    if (sessionResult.answeredQuestionCount > sessionResult.plannedQuestionCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answeredQuestionCount'],
        message: 'Answered count cannot exceed planned question count.',
      });
    }

    if (sessionResult.questionResults.length !== sessionResult.plannedQuestionCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['questionResults'],
        message: 'Question result count must match planned question count.',
      });
    }
  });

export type ValidatedSessionResult = z.infer<typeof SessionResultSchema>;
