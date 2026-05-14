import { createFrqAttempt, createMcqAttempt } from '../../src/domain/attempts';
import { testFrqQuestion, testMcqQuestion } from '../fixtures/testQuestions';

describe('attempt helpers', () => {
  it('creates a scored MCQ attempt from a question and selected choice', () => {
    const attempt = createMcqAttempt({
      id: 'attempt-mcq-1',
      question: testMcqQuestion,
      selectedChoiceId: 'B',
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:02:05.000Z',
    });

    expect(attempt).toMatchObject({
      id: 'attempt-mcq-1',
      questionId: 'test-mcq-001',
      questionType: 'mcq',
      response: {
        type: 'mcq',
        selectedChoiceId: 'B',
      },
      score: 0,
      maxScore: 1,
      isCorrect: false,
      timeSpentSeconds: 125,
    });
  });

  it('creates a scored FRQ attempt from responses and self-scored criteria', () => {
    const attempt = createFrqAttempt({
      id: 'attempt-frq-1',
      question: testFrqQuestion,
      partResponses: {
        a: 'This response states and interprets the setup.',
        b: '',
      },
      earnedPointsByCriterion: {
        'test-frq-001-a-setup': true,
        'test-frq-001-a-interpret': true,
        'test-frq-001-b-equation': true,
        'test-frq-001-b-solve': false,
        'test-frq-001-b-interpret': false,
      },
      startedAt: new Date('2026-05-13T11:00:00.000Z'),
      submittedAt: new Date('2026-05-13T11:05:00.000Z'),
    });

    expect(attempt).toMatchObject({
      id: 'attempt-frq-1',
      questionId: 'test-frq-001',
      questionType: 'frq',
      response: {
        type: 'frq',
        partResponses: {
          a: 'This response states and interprets the setup.',
        },
      },
      score: 3,
      maxScore: 5,
      isCorrect: false,
      startedAt: '2026-05-13T11:00:00.000Z',
      submittedAt: '2026-05-13T11:05:00.000Z',
      timeSpentSeconds: 300,
    });
  });
});
