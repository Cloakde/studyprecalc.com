import seedQuestionSet from '../../content/questions/seed-ap-precalc.json';
import { QuestionSetSchema } from '../../src/data/schemas/questionSchema';
import { createFrqAttempt, createMcqAttempt } from '../../src/domain/attempts';

const questionSet = QuestionSetSchema.parse(seedQuestionSet);

describe('attempt helpers', () => {
  it('creates a scored MCQ attempt from a question and selected choice', () => {
    const question = questionSet.questions.find((item) => item.id === 'pc-mcq-rat-001');

    expect(question?.type).toBe('mcq');

    if (!question || question.type !== 'mcq') {
      throw new Error('Expected MCQ seed question.');
    }

    const attempt = createMcqAttempt({
      id: 'attempt-mcq-1',
      question,
      selectedChoiceId: 'B',
      startedAt: '2026-05-13T10:00:00.000Z',
      submittedAt: '2026-05-13T10:02:05.000Z',
    });

    expect(attempt).toMatchObject({
      id: 'attempt-mcq-1',
      questionId: 'pc-mcq-rat-001',
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
    const question = questionSet.questions.find((item) => item.id === 'pc-frq-log-001');

    expect(question?.type).toBe('frq');

    if (!question || question.type !== 'frq') {
      throw new Error('Expected FRQ seed question.');
    }

    const attempt = createFrqAttempt({
      id: 'attempt-frq-1',
      question,
      partResponses: {
        a: 'B(2)=96(0.74)^2, so the charge is about 52.6%.',
        b: '',
      },
      earnedPointsByCriterion: {
        'pc-frq-log-001-a-setup': true,
        'pc-frq-log-001-a-interpret': true,
        'pc-frq-log-001-b-equation': true,
        'pc-frq-log-001-b-solve': false,
        'pc-frq-log-001-b-interpret': false,
      },
      startedAt: new Date('2026-05-13T11:00:00.000Z'),
      submittedAt: new Date('2026-05-13T11:05:00.000Z'),
    });

    expect(attempt).toMatchObject({
      id: 'attempt-frq-1',
      questionId: 'pc-frq-log-001',
      questionType: 'frq',
      response: {
        type: 'frq',
        partResponses: {
          a: 'B(2)=96(0.74)^2, so the charge is about 52.6%.',
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
