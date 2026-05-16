import { createMcqAttempt } from '../../src/domain/attempts';
import { createDashboardAnalytics, createSessionResult } from '../../src/domain/sessions';
import { testFrqQuestion, testMcqQuestion, testQuestionSet } from '../fixtures/testQuestions';

describe('session result helpers', () => {
  it('creates a grouped result from MCQ and FRQ responses', () => {
    const result = createSessionResult({
      id: 'session-1',
      questionSetVersion: testQuestionSet.version,
      questions: [testMcqQuestion, testFrqQuestion],
      responses: {
        [testMcqQuestion.id]: {
          startedAt: '2026-05-13T10:00:00.000Z',
          submittedAt: '2026-05-13T10:01:00.000Z',
          selectedChoiceId: 'A',
          partResponses: {},
          earnedPointsByCriterion: {},
          attemptId: 'attempt-mcq-1',
        },
        [testFrqQuestion.id]: {
          startedAt: '2026-05-13T10:01:00.000Z',
          submittedAt: '2026-05-13T10:08:00.000Z',
          partResponses: {
            a: 'This response states and interprets the setup.',
          },
          earnedPointsByCriterion: {
            'test-frq-001-a-setup': true,
            'test-frq-001-a-interpret': true,
          },
          frqReviewed: true,
          attemptId: 'attempt-frq-1',
        },
      },
      markedQuestionIds: [testFrqQuestion.id],
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:08:00.000Z',
      filters: {
        type: 'mixed',
        unit: 'all',
        difficulty: 'all',
        calculator: 'all',
      },
    });

    expect(result).toMatchObject({
      id: 'session-1',
      plannedQuestionCount: 2,
      answeredQuestionCount: 2,
      score: 3,
      maxScore: 6,
      percent: 50,
      pendingManualScoreCount: 0,
      markedQuestionIds: [testFrqQuestion.id],
      missedQuestionIds: [testFrqQuestion.id],
    });
    expect(result.questionResults[0]).toMatchObject({
      questionId: testMcqQuestion.id,
      score: 1,
      maxScore: 1,
      answered: true,
      isCorrect: true,
      attemptId: 'attempt-mcq-1',
      timeSpentSeconds: 60,
    });
    expect(result.questionResults[1]).toMatchObject({
      questionId: testFrqQuestion.id,
      score: 2,
      maxScore: 5,
      markedForReview: true,
      needsManualScore: false,
      timeSpentSeconds: 420,
    });
  });

  it('marks answered unreviewed FRQs as pending manual score', () => {
    const result = createSessionResult({
      id: 'session-1',
      questionSetVersion: testQuestionSet.version,
      questions: [testFrqQuestion],
      responses: {
        [testFrqQuestion.id]: {
          startedAt: '2026-05-13T10:00:00.000Z',
          partResponses: {
            a: 'A response waiting for self-score.',
          },
          earnedPointsByCriterion: {},
        },
      },
      markedQuestionIds: [],
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:05:00.000Z',
      filters: {
        type: 'frq',
        unit: 'all',
        difficulty: 'all',
        calculator: 'all',
      },
    });

    expect(result.pendingManualScoreCount).toBe(1);
    expect(result.missedQuestionIds).toEqual([]);
    expect(result.questionResults[0]).toMatchObject({
      answered: true,
      needsManualScore: true,
    });
  });

  it('builds weak-topic recommendations and trend direction from session data', () => {
    const olderSession = createSessionResult({
      id: 'session-older',
      questionSetVersion: testQuestionSet.version,
      questions: [testMcqQuestion],
      responses: {
        [testMcqQuestion.id]: {
          startedAt: '2026-05-13T10:00:00.000Z',
          submittedAt: '2026-05-13T10:01:00.000Z',
          selectedChoiceId: 'A',
          partResponses: {},
          earnedPointsByCriterion: {},
        },
      },
      markedQuestionIds: [],
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:01:00.000Z',
      filters: {
        type: 'mcq',
        unit: 'all',
        difficulty: 'all',
        calculator: 'all',
      },
    });
    const newerSession = createSessionResult({
      id: 'session-newer',
      questionSetVersion: testQuestionSet.version,
      questions: [testMcqQuestion],
      responses: {
        [testMcqQuestion.id]: {
          startedAt: '2026-05-13T11:00:00.000Z',
          submittedAt: '2026-05-13T11:01:00.000Z',
          selectedChoiceId: 'B',
          partResponses: {},
          earnedPointsByCriterion: {},
        },
      },
      markedQuestionIds: [],
      startedAt: '2026-05-13T11:00:00.000Z',
      submittedAt: '2026-05-13T11:01:00.000Z',
      filters: {
        type: 'mcq',
        unit: 'all',
        difficulty: 'all',
        calculator: 'all',
      },
    });

    const analytics = createDashboardAnalytics({
      sessions: [newerSession, olderSession],
      attempts: [],
      questions: [testMcqQuestion],
    });

    expect(analytics.unitTrends[0]).toMatchObject({
      label: 'Test Unit',
      percent: 50,
      recentPercent: 0,
      previousPercent: 100,
      trend: 'down',
      trendDelta: -100,
    });
    expect(analytics.weakTopics[0]).toMatchObject({
      skill: testMcqQuestion.skill,
      topic: testMcqQuestion.topic,
      missedCount: 1,
    });
    expect(analytics.recommendedNext).toMatchObject({
      skill: testMcqQuestion.skill,
      reason: 'Recent work is trending down here.',
      availableQuestionIds: [testMcqQuestion.id],
    });
    expect(analytics.retrySets).toEqual([
      expect.objectContaining({
        unit: testMcqQuestion.unit,
        topic: testMcqQuestion.topic,
        skill: testMcqQuestion.skill,
        missedCount: 1,
        questionIds: [testMcqQuestion.id],
        availableQuestionIds: [testMcqQuestion.id],
        lastMissedAt: '2026-05-13T11:01:00.000Z',
      }),
    ]);
    expect(analytics.progressReadiness).toMatchObject({
      totalQuestionCount: 1,
      practicedQuestionCount: 1,
      practicedQuestionIds: [testMcqQuestion.id],
      scoredRecordCount: 2,
      pendingManualScoreCount: 0,
      retrySetCount: 1,
      retryQuestionCount: 1,
      readyForClassProgress: true,
      lastActivityAt: '2026-05-13T11:01:00.000Z',
    });
  });

  it('reports readiness separately from pending manual-score work', () => {
    const pendingFrqSession = createSessionResult({
      id: 'session-pending-frq',
      questionSetVersion: testQuestionSet.version,
      questions: [testFrqQuestion],
      responses: {
        [testFrqQuestion.id]: {
          startedAt: '2026-05-13T10:00:00.000Z',
          submittedAt: '2026-05-13T10:04:00.000Z',
          partResponses: {
            a: 'A response waiting for self-score.',
          },
          earnedPointsByCriterion: {},
        },
      },
      markedQuestionIds: [],
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:04:00.000Z',
      filters: {
        type: 'frq',
        unit: 'all',
        difficulty: 'all',
        calculator: 'all',
      },
    });

    const analytics = createDashboardAnalytics({
      sessions: [pendingFrqSession],
      attempts: [],
      questions: [testFrqQuestion],
    });

    expect(analytics.retrySets).toEqual([]);
    expect(analytics.progressReadiness).toMatchObject({
      totalQuestionCount: 1,
      practicedQuestionCount: 1,
      practicedQuestionIds: [testFrqQuestion.id],
      scoredRecordCount: 0,
      pendingManualScoreCount: 1,
      retrySetCount: 0,
      retryQuestionCount: 0,
      readyForClassProgress: false,
      lastActivityAt: '2026-05-13T10:04:00.000Z',
    });
  });

  it('uses standalone attempts without double-counting attempts already linked to sessions', () => {
    const session = createSessionResult({
      id: 'session-with-attempt',
      questionSetVersion: testQuestionSet.version,
      questions: [testMcqQuestion],
      responses: {
        [testMcqQuestion.id]: {
          startedAt: '2026-05-13T10:00:00.000Z',
          submittedAt: '2026-05-13T10:01:00.000Z',
          selectedChoiceId: 'A',
          partResponses: {},
          earnedPointsByCriterion: {},
          attemptId: 'attempt-linked',
        },
      },
      markedQuestionIds: [],
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:01:00.000Z',
      filters: {
        type: 'mcq',
        unit: 'all',
        difficulty: 'all',
        calculator: 'all',
      },
    });
    const linkedAttempt = createMcqAttempt({
      id: 'attempt-linked',
      question: testMcqQuestion,
      selectedChoiceId: 'A',
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:01:00.000Z',
    });
    const standaloneAttempt = createMcqAttempt({
      id: 'attempt-standalone',
      question: testMcqQuestion,
      selectedChoiceId: 'B',
      startedAt: '2026-05-13T12:00:00.000Z',
      submittedAt: '2026-05-13T12:01:00.000Z',
    });

    const analytics = createDashboardAnalytics({
      sessions: [session],
      attempts: [linkedAttempt, standaloneAttempt],
      questions: [testMcqQuestion],
    });

    expect(analytics.unitTrends[0]).toMatchObject({
      questionCount: 2,
      score: 1,
      maxScore: 2,
      missedCount: 1,
    });
  });
});
