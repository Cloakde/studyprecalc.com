import seedQuestionSet from '../../content/questions/seed-ap-precalc.json';
import { QuestionSetSchema } from '../../src/data/schemas/questionSchema';

describe('QuestionSetSchema', () => {
  it('validates the seed AP Precalculus content', () => {
    const parsed = QuestionSetSchema.parse(seedQuestionSet);

    expect(parsed.questions).toHaveLength(4);
    expect(parsed.questions.some((question) => question.type === 'mcq')).toBe(true);
    expect(parsed.questions.some((question) => question.type === 'frq')).toBe(true);
  });

  it('rejects duplicate question IDs', () => {
    const parsed = QuestionSetSchema.parse(seedQuestionSet);
    const duplicated = {
      version: parsed.version,
      questions: [parsed.questions[0], parsed.questions[0]],
    };

    expect(() => QuestionSetSchema.parse(duplicated)).toThrow();
  });

  it('accepts local uploaded video references', () => {
    const parsed = QuestionSetSchema.parse(seedQuestionSet);
    const questionWithLocalVideo = {
      ...parsed.questions[0],
      id: 'pc-mcq-local-video-001',
      explanation: {
        ...parsed.questions[0].explanation,
        video: {
          url: 'local-video:video-123_abc',
        },
      },
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: parsed.version,
        questions: [questionWithLocalVideo],
      }),
    ).not.toThrow();
  });

  it('accepts prompt and explanation image assets', () => {
    const parsed = QuestionSetSchema.parse(seedQuestionSet);
    const questionWithAssets = {
      ...parsed.questions[0],
      id: 'pc-mcq-assets-001',
      assets: [
        {
          id: 'residual-plot',
          type: 'graph',
          path: 'local-image:image-123_abc',
          alt: 'Residual plot for a quadratic regression.',
          caption: 'Residual plot',
        },
      ],
      explanation: {
        ...parsed.questions[0].explanation,
        assets: [
          {
            id: 'solution-graph',
            type: 'graph',
            path: '/assets/images/solution-graph.png',
            alt: 'Annotated solution graph showing a removable discontinuity.',
          },
        ],
      },
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: parsed.version,
        questions: [questionWithAssets],
      }),
    ).not.toThrow();
  });

  it('rejects duplicate FRQ part and rubric criterion IDs', () => {
    const parsed = QuestionSetSchema.parse(seedQuestionSet);
    const frqQuestion = parsed.questions.find((question) => question.type === 'frq');

    expect(frqQuestion?.type).toBe('frq');

    if (!frqQuestion || frqQuestion.type !== 'frq') {
      throw new Error('Expected seed FRQ question.');
    }

    const invalidFrq = {
      ...frqQuestion,
      parts: [
        frqQuestion.parts[0],
        {
          ...frqQuestion.parts[1],
          id: frqQuestion.parts[0].id,
          rubric: [
            {
              ...frqQuestion.parts[1].rubric[0],
              id: frqQuestion.parts[0].rubric[0].id,
            },
          ],
        },
      ],
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: parsed.version,
        questions: [invalidFrq],
      }),
    ).toThrow();
  });

  it('rejects unsafe asset and video paths', () => {
    const parsed = QuestionSetSchema.parse(seedQuestionSet);
    const questionWithUnsafeMedia = {
      ...parsed.questions[0],
      id: 'pc-mcq-unsafe-media-001',
      assets: [
        {
          id: 'unsafe-asset',
          type: 'image',
          path: 'javascript:alert(1)',
          alt: 'Unsafe image path.',
        },
      ],
      explanation: {
        ...parsed.questions[0].explanation,
        video: {
          url: 'ftp://example.com/video.mp4',
        },
      },
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: parsed.version,
        questions: [questionWithUnsafeMedia],
      }),
    ).toThrow();
  });
});
