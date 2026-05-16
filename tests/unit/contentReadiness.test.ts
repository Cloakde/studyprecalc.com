import {
  buildContentReadinessDashboard,
  buildContentReadinessReport,
  getContentReadinessActionMessage,
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
        assets: [
          {
            id: 'local-explanation-image',
            type: 'image',
            path: 'local-image:solution123',
            alt: 'Annotated solution graph showing the intercepts',
          },
        ],
      },
    });

    expect(getContentReadinessIssues(localMediaQuestion)).not.toContainEqual(
      expect.objectContaining({ code: 'local-media-publish-blocker' }),
    );

    const cloudIssues = getContentReadinessIssues(localMediaQuestion, {
      disallowLocalMedia: true,
    }).filter((issue) => issue.code === 'local-media-publish-blocker');

    expect(cloudIssues).toEqual([
      expect.objectContaining({
        category: 'media',
        fieldPath: 'assets[0].path',
        severity: 'blocker',
      }),
      expect.objectContaining({
        category: 'media',
        fieldPath: 'explanation.assets[0].path',
        severity: 'blocker',
      }),
      expect.objectContaining({
        category: 'media',
        fieldPath: 'explanation.video.url',
        severity: 'blocker',
      }),
    ]);
  });

  it('flags placeholder image URLs and missing graph captions for prompt and explanation assets', () => {
    const mediaQuestion = makeReadyFrq({
      id: 'media-frq',
      assets: [
        {
          id: 'prompt-graph',
          type: 'graph',
          path: 'https://example.com/owner-todo/prompt-graph.png',
          alt: 'Graph of a polynomial with two visible turning points',
        },
      ],
      explanation: {
        ...testFrqQuestion.explanation,
        assets: [
          {
            id: 'solution-table',
            type: 'table',
            path: '/images/solution-table.png',
            alt: 'Table comparing finite differences for the model',
          },
        ],
      },
    });

    expect(getContentReadinessIssues(mediaQuestion)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'placeholder-media-url',
          category: 'media',
          fieldPath: 'assets[0].path',
          severity: 'blocker',
        }),
        expect.objectContaining({
          code: 'missing-image-caption',
          category: 'media',
          fieldPath: 'assets[0].caption',
          severity: 'warning',
        }),
        expect.objectContaining({
          code: 'missing-image-caption',
          category: 'media',
          fieldPath: 'explanation.assets[0].caption',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('warns when external video explanations are missing thumbnail and duration metadata', () => {
    const videoQuestion = makeReadyMcq({
      id: 'external-video-mcq',
      explanation: {
        ...testMcqQuestion.explanation,
        video: {
          url: 'https://videos.example.net/precalc/average-rate-of-change',
          transcriptPath: '/transcripts/average-rate-of-change.md',
        },
      },
    });

    expect(getContentReadinessIssues(videoQuestion)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-video-thumbnail',
          category: 'media',
          fieldPath: 'explanation.video.thumbnailPath',
          severity: 'warning',
        }),
        expect.objectContaining({
          code: 'missing-video-duration',
          category: 'media',
          fieldPath: 'explanation.video.durationSeconds',
          severity: 'warning',
        }),
      ]),
    );
  });

  it('blocks placeholder external video, thumbnail, and transcript URLs', () => {
    const videoQuestion = makeReadyMcq({
      id: 'placeholder-video-mcq',
      explanation: {
        ...testMcqQuestion.explanation,
        video: {
          url: 'https://example.com/OWNER_TODO/video',
          thumbnailPath: 'https://example.com/thumbnail.png',
          transcriptPath: 'https://example.com/transcript.md',
          durationSeconds: 120,
        },
      },
    });

    expect(getContentReadinessIssues(videoQuestion)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'placeholder-media-url',
          fieldPath: 'explanation.video.url',
          severity: 'blocker',
        }),
        expect.objectContaining({
          code: 'placeholder-media-url',
          fieldPath: 'explanation.video.thumbnailPath',
          severity: 'blocker',
        }),
        expect.objectContaining({
          code: 'placeholder-media-url',
          fieldPath: 'explanation.video.transcriptPath',
          severity: 'blocker',
        }),
      ]),
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

  it('builds filtered launch QA dashboard groups with issue counts', () => {
    const report = buildContentReadinessReport([
      makeReadyMcq({
        id: 'published-blocker',
        publicationStatus: 'published',
        explanation: {
          ...testMcqQuestion.explanation,
          summary: '',
        },
      }),
      makeReadyMcq({
        id: 'draft-warning',
        publicationStatus: 'draft',
        unit: 'Unit',
      }),
      makeReadyFrq({
        id: 'archived-blocker',
        publicationStatus: 'archived',
        prompt: '',
      }),
    ]);

    const dashboard = buildContentReadinessDashboard(report, {
      severity: 'blocker',
      status: 'published',
      category: 'explanation',
      groupBy: 'category',
    });

    expect(dashboard.counts.severity).toMatchObject({
      all: 3,
      blocker: 2,
      warning: 1,
    });
    expect(dashboard.counts.status).toMatchObject({
      published: 1,
      draft: 1,
      archived: 1,
    });
    expect(dashboard.visibleIssueCount).toBe(1);
    expect(dashboard.visibleQuestionCount).toBe(1);
    expect(dashboard.groups).toEqual([
      expect.objectContaining({
        key: 'explanation',
        label: 'Explanation',
        issueCount: 1,
        blockerCount: 1,
        warningCount: 0,
      }),
    ]);
    expect(dashboard.visibleIssues[0]).toMatchObject({
      code: 'missing-explanation-summary',
      questionId: 'published-blocker',
      status: 'published',
      actionMessage: 'Add a concise solution summary before launch review.',
    });
  });

  it('groups launch QA issues by status and category for admin review', () => {
    const report = buildContentReadinessReport([
      makeReadyMcq({
        id: 'published-metadata-warning',
        publicationStatus: 'published',
        unit: 'Unit',
      }),
      makeReadyFrq({
        id: 'draft-frq-blocker',
        publicationStatus: 'draft',
        parts: [
          {
            ...testFrqQuestion.parts[0],
            rubric: [],
          },
        ],
      }),
    ]);

    const byStatusDashboard = buildContentReadinessDashboard(report, { groupBy: 'status' });
    const byCategoryDashboard = buildContentReadinessDashboard(report, { groupBy: 'category' });

    expect(byStatusDashboard.groups.map((group) => group.label)).toEqual(['Published', 'Draft']);
    expect(byCategoryDashboard.groups.map((group) => group.label)).toEqual([
      'Metadata',
      'FRQ scoring',
    ]);
  });

  it('blocks launch when owner template placeholders remain', () => {
    const report = buildContentReadinessReport([
      makeReadyMcq({
        id: 'placeholder-mcq',
        prompt: 'OWNER_TODO: write an original prompt.',
        explanation: {
          ...testMcqQuestion.explanation,
          steps: ['Use the given table.', 'OWNER_TODO: replace this solution step.'],
        },
      }),
    ]);

    expect(report.summary.publishBlockerCount).toBeGreaterThan(0);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'template-placeholder',
          fieldPath: 'prompt',
          severity: 'blocker',
        }),
        expect.objectContaining({
          code: 'template-placeholder',
          fieldPath: 'explanation.steps[1]',
          severity: 'blocker',
        }),
      ]),
    );
  });

  it('returns actionable fallback copy for readiness issue codes', () => {
    const issue = getContentReadinessIssues(
      makeReadyMcq({
        assets: [
          {
            id: 'local-image',
            type: 'image',
            path: 'local-image:abc123',
            alt: 'Graph showing an increasing function',
          },
        ],
      }),
      { disallowLocalMedia: true },
    ).find((readinessIssue) => readinessIssue.code === 'local-media-publish-blocker');

    expect(issue).toBeDefined();

    if (!issue) {
      throw new Error('Expected local media publish blocker issue.');
    }

    expect(getContentReadinessActionMessage(issue)).toBe(
      'Replace browser-local media with cloud image references or an external video link.',
    );
  });
});
