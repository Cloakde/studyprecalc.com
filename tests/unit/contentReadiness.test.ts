import {
  buildContentReadinessReport,
  getContentReadinessIssues,
} from '../../src/domain/questions/contentReadiness';
import type { FrqQuestion, McqQuestion, Question } from '../../src/domain/questions/types';
import { testFrqQuestion, testMcqQuestion } from '../fixtures/testQuestions';

function makeReadyMcq(overrides: Partial<McqQuestion> = {}): McqQuestion {
  return {
    ...testMcqQuestion,
    id: 'ready-mcq',
    unit: 'Polynomial Functions',
    topic: 'Average rate of change',
    skill: 'Interpret average rate of change from a table',
    tags: ['rates', 'tables'],
    ...overrides,
    explanation: {
      ...testMcqQuestion.explanation,
      ...overrides.explanation,
    },
  };
}

function makeReadyFrq(overrides: Partial<FrqQuestion> = {}): FrqQuestion {
  return {
    ...testFrqQuestion,
    id: 'ready-frq',
    unit: 'Function Modeling',
    topic: 'Model construction',
    skill: 'Build and justify a function model',
    tags: ['modeling', 'frq'],
    ...overrides,
    explanation: {
      ...testFrqQuestion.explanation,
      ...overrides.explanation,
    },
  };
}

function issueCodesFor(question: Question) {
  return getContentReadinessIssues(question).map((issue) => issue.code);
}

describe('content readiness report', () => {
  it('summarizes ready authored content without issues', () => {
    const report = buildContentReadinessReport([
      makeReadyMcq({ publicationStatus: 'published' }),
      makeReadyFrq({ publicationStatus: 'draft' }),
    ]);

    expect(report.summary).toMatchObject({
      questionCount: 2,
      readyQuestionCount: 2,
      blockedQuestionCount: 0,
      issueCount: 0,
      publishBlockerCount: 0,
    });
    expect(report.questionReports.map((questionReport) => questionReport.status)).toEqual([
      'published',
      'draft',
    ]);
  });

  it('flags missing explanations, weak metadata, duplicate tags, and image alt text', () => {
    const weakQuestion = makeReadyMcq({
      id: 'weak-mcq',
      unit: 'Unit',
      tags: ['rates', ' Rates '],
      assets: [
        {
          id: 'prompt-graph',
          type: 'graph',
          path: 'https://example.test/images/prompt-graph.png',
          alt: ' ',
        },
      ],
      choices: testMcqQuestion.choices.map((choice) =>
        choice.id === 'B' ? { ...choice, explanation: ' ' } : choice,
      ),
      explanation: {
        ...testMcqQuestion.explanation,
        summary: ' ',
        steps: [],
        commonMistakes: [],
      },
    });

    const codes = issueCodesFor(weakQuestion);

    expect(codes).toEqual(
      expect.arrayContaining([
        'generic-metadata',
        'duplicate-tag',
        'missing-image-alt-text',
        'missing-choice-explanation',
        'missing-explanation-summary',
        'missing-explanation-steps',
        'missing-common-mistakes',
      ]),
    );
  });

  it('flags missing FRQ expected work and rubric readiness', () => {
    const badFrq = makeReadyFrq({
      id: 'bad-frq',
      parts: [
        {
          ...testFrqQuestion.parts[0],
          expectedWork: [],
          rubric: [],
        },
        {
          ...testFrqQuestion.parts[1],
          sampleResponse: ' ',
          rubric: [
            {
              id: 'bad-frq-b-criterion',
              description: ' ',
              points: 0,
            },
          ],
        },
      ],
    });

    expect(issueCodesFor(badFrq)).toEqual(
      expect.arrayContaining([
        'missing-frq-expected-work',
        'missing-frq-rubric',
        'missing-frq-sample-response',
        'missing-frq-rubric-description',
        'invalid-frq-rubric-points',
      ]),
    );
  });

  it('reports browser-local media as a cloud publish blocker only when cloud media is required', () => {
    const localMediaQuestion = makeReadyMcq({
      id: 'local-media-mcq',
      assets: [
        {
          id: 'local-prompt-image',
          type: 'image',
          path: 'local-image:abc123',
          alt: 'Graph showing the model intercepts',
        },
      ],
      explanation: {
        ...testMcqQuestion.explanation,
        video: {
          url: 'local-video:vid123',
          transcriptPath: '/transcripts/local-video.txt',
        },
      },
    });

    expect(getContentReadinessIssues(localMediaQuestion)).not.toContainEqual(
      expect.objectContaining({ code: 'local-media-publish-blocker' }),
    );

    expect(
      getContentReadinessIssues(localMediaQuestion, { disallowLocalMedia: true }),
    ).toContainEqual(
      expect.objectContaining({
        code: 'local-media-publish-blocker',
        severity: 'blocker',
      }),
    );
  });

  it('counts duplicate question IDs as active publish blockers', () => {
    const duplicateId = 'duplicate-content-id';
    const report = buildContentReadinessReport([
      makeReadyMcq({ id: duplicateId }),
      makeReadyFrq({ id: duplicateId }),
    ]);

    expect(report.summary.publishBlockerCount).toBe(2);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-question-id', questionId: duplicateId }),
      ]),
    );
  });
});
