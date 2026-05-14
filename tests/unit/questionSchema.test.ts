import seedQuestionSet from '../../content/questions/seed-ap-precalc.json';
import { QuestionSetSchema } from '../../src/data/schemas/questionSchema';
import { testFrqQuestion, testMcqQuestion, testQuestionSet } from '../fixtures/testQuestions';

describe('QuestionSetSchema', () => {
  it('validates the empty starter question set', () => {
    const parsed = QuestionSetSchema.parse(seedQuestionSet);

    expect(parsed.questions).toHaveLength(0);
  });

  it('rejects duplicate question IDs', () => {
    const duplicated = {
      version: testQuestionSet.version,
      questions: [testMcqQuestion, testMcqQuestion],
    };

    expect(() => QuestionSetSchema.parse(duplicated)).toThrow();
  });

  it('accepts local uploaded video references', () => {
    const questionWithLocalVideo = {
      ...testMcqQuestion,
      id: 'test-mcq-local-video-001',
      explanation: {
        ...testMcqQuestion.explanation,
        video: {
          url: 'local-video:video-123_abc',
        },
      },
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: testQuestionSet.version,
        questions: [questionWithLocalVideo],
      }),
    ).not.toThrow();
  });

  it('accepts prompt and explanation image assets', () => {
    const questionWithAssets = {
      ...testMcqQuestion,
      id: 'test-mcq-assets-001',
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
        ...testMcqQuestion.explanation,
        assets: [
          {
            id: 'solution-graph',
            type: 'graph',
            path: '/assets/images/solution-graph.png',
            alt: 'Annotated solution graph for a test item.',
          },
        ],
      },
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: testQuestionSet.version,
        questions: [questionWithAssets],
      }),
    ).not.toThrow();
  });

  it('accepts stable Supabase image references for cloud-stored assets', () => {
    const questionWithCloudAsset = {
      ...testMcqQuestion,
      id: 'test-mcq-cloud-assets-001',
      assets: [
        {
          id: 'cloud-residual-plot',
          type: 'graph',
          path: 'supabase-image:uploads/admin-1/2026/05/14/residual-plot-abc123.png',
          alt: 'Residual plot stored in cloud storage.',
          caption: 'Residual plot',
        },
      ],
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: testQuestionSet.version,
        questions: [questionWithCloudAsset],
      }),
    ).not.toThrow();
  });

  it('rejects duplicate FRQ part and rubric criterion IDs', () => {
    const invalidFrq = {
      ...testFrqQuestion,
      parts: [
        testFrqQuestion.parts[0],
        {
          ...testFrqQuestion.parts[1],
          id: testFrqQuestion.parts[0].id,
          rubric: [
            {
              ...testFrqQuestion.parts[1].rubric[0],
              id: testFrqQuestion.parts[0].rubric[0].id,
            },
          ],
        },
      ],
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: testQuestionSet.version,
        questions: [invalidFrq],
      }),
    ).toThrow();
  });

  it('rejects unsafe asset and video paths', () => {
    const questionWithUnsafeMedia = {
      ...testMcqQuestion,
      id: 'test-mcq-unsafe-media-001',
      assets: [
        {
          id: 'unsafe-asset',
          type: 'image',
          path: 'javascript:alert(1)',
          alt: 'Unsafe image path.',
        },
      ],
      explanation: {
        ...testMcqQuestion.explanation,
        video: {
          url: 'ftp://example.com/video.mp4',
        },
      },
    };

    expect(() =>
      QuestionSetSchema.parse({
        version: testQuestionSet.version,
        questions: [questionWithUnsafeMedia],
      }),
    ).toThrow();
  });
});
