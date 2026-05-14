import { createSessionResult } from '../../src/domain/sessions';
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
});
