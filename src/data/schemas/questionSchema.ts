import { z } from 'zod';

const difficultySchema = z.enum(['intro', 'medium', 'advanced']);
const calculatorPolicySchema = z.enum(['none', 'graphing']);
const questionSectionSchema = z.enum(['practice', 'mcq-a', 'mcq-b', 'frq-a', 'frq-b']);

const localImageReferenceSchema = z
  .string()
  .regex(/^local-image:[a-zA-Z0-9_-]+$/, 'Local image references must use local-image:<id>.');

const safeResourcePathSchema = z.string().min(1).refine((path) => {
  if (localImageReferenceSchema.safeParse(path).success) {
    return true;
  }

  try {
    const url = new URL(path, 'https://precalc.local');
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Resource paths must be relative/static, HTTP(S), or a valid local image reference.');

const assetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'graph', 'table']),
  path: safeResourcePathSchema,
  alt: z.string().min(1),
  caption: z.string().min(1).optional(),
});

const localVideoReferenceSchema = z
  .string()
  .regex(/^local-video:[a-zA-Z0-9_-]+$/, 'Local video references must use local-video:<id>.');

const httpUrlSchema = z.string().url().refine((rawUrl) => {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, 'URLs must use HTTP(S).');

const videoExplanationSchema = z.object({
  url: z.union([httpUrlSchema, localVideoReferenceSchema]),
  thumbnailPath: safeResourcePathSchema.optional(),
  transcriptPath: safeResourcePathSchema.optional(),
  durationSeconds: z.number().int().positive().optional(),
});

const explanationSchema = z.object({
  summary: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  commonMistakes: z.array(z.string().min(1)).optional(),
  video: videoExplanationSchema.optional(),
  assets: z.array(assetSchema).optional(),
});

const baseQuestionSchema = z.object({
  id: z.string().min(1),
  unit: z.string().min(1),
  topic: z.string().min(1),
  skill: z.string().min(1),
  difficulty: difficultySchema,
  calculator: calculatorPolicySchema,
  section: questionSectionSchema,
  tags: z.array(z.string().min(1)).min(1),
  prompt: z.string().min(1),
  assets: z.array(assetSchema).optional(),
  explanation: explanationSchema,
});

const choiceSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1),
  explanation: z.string().min(1),
});

export const McqQuestionSchema = baseQuestionSchema
  .extend({
    type: z.literal('mcq'),
    choices: z.array(choiceSchema).length(4),
    correctChoiceId: z.enum(['A', 'B', 'C', 'D']),
  })
  .superRefine((question, context) => {
    const ids = question.choices.map((choice) => choice.id);
    const uniqueIds = new Set(ids);

    if (uniqueIds.size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['choices'],
        message: 'MCQ choice IDs must be unique.',
      });
    }

    if (!uniqueIds.has(question.correctChoiceId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctChoiceId'],
        message: 'Correct choice ID must match one of the choices.',
      });
    }
  });

const rubricCriterionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  points: z.number().int().positive(),
});

const frqPartSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  sampleResponse: z.string().min(1),
  expectedWork: z.array(z.string().min(1)).min(1),
  rubric: z.array(rubricCriterionSchema).min(1),
});

export const FrqQuestionSchema = baseQuestionSchema
  .extend({
    type: z.literal('frq'),
    parts: z.array(frqPartSchema).min(1),
  })
  .superRefine((question, context) => {
    const partIds = new Set<string>();
    const rubricIds = new Set<string>();

    question.parts.forEach((part, partIndex) => {
      if (partIds.has(part.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['parts', partIndex, 'id'],
          message: `Duplicate FRQ part ID: ${part.id}`,
        });
      }

      partIds.add(part.id);

      part.rubric.forEach((criterion, criterionIndex) => {
        if (rubricIds.has(criterion.id)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['parts', partIndex, 'rubric', criterionIndex, 'id'],
            message: `Duplicate FRQ rubric criterion ID: ${criterion.id}`,
          });
        }

        rubricIds.add(criterion.id);
      });
    });
  });

export const QuestionSchema = z.union([McqQuestionSchema, FrqQuestionSchema]);

export const QuestionSetSchema = z
  .object({
    version: z.string().min(1),
    questions: z.array(QuestionSchema).min(1),
  })
  .superRefine((questionSet, context) => {
    const seenIds = new Set<string>();

    questionSet.questions.forEach((question, index) => {
      if (seenIds.has(question.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions', index, 'id'],
          message: `Duplicate question ID: ${question.id}`,
        });
      }

      seenIds.add(question.id);
    });
  });

export type ValidatedQuestion = z.infer<typeof QuestionSchema>;
export type ValidatedQuestionSet = z.infer<typeof QuestionSetSchema>;
