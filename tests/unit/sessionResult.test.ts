import seedQuestionSet from '../../content/questions/seed-ap-precalc.json';
import { QuestionSetSchema } from '../../src/data/schemas/questionSchema';
import { createSessionResult } from '../../src/domain/sessions';

const questionSet = QuestionSetSchema.parse(seedQuestionSet);

describe('session result helpers', () => {
  it('creates a grouped result from MCQ and FRQ responses', () => {
    const mcqQuestion = questionSet.questions.find((question) => question.id === 'pc-mcq-rat-001');
    const frqQuestion = questionSet.questions.find((question) => question.id === 'pc-frq-log-001');

    if (!mcqQuestion || !frqQuestion) {
      throw new Error('Expected seed questions.');
    }

    const result = createSessionResult({
      id: 'session-1',
      questionSetVersion: questionSet.version,
      questions: [mcqQuestion, frqQuestion],
      responses: {
        [mcqQuestion.id]: {
          startedAt: '2026-05-13T10:00:00.000Z',
          submittedAt: '2026-05-13T10:01:00.000Z',
          selectedChoiceId: 'A',
          partResponses: {},
          earnedPointsByCriterion: {},
          attemptId: 'attempt-mcq-1',
        },
        [frqQuestion.id]: {
          startedAt: '2026-05-13T10:01:00.000Z',
          submittedAt: '2026-05-13T10:08:00.000Z',
          partResponses: {
            a: 'B(2)=96(0.74)^2, so about 52.6%.',
          },
          earnedPointsByCriterion: {
            'pc-frq-log-001-a-setup': true,
            'pc-frq-log-001-a-interpret': true,
          },
          frqReviewed: true,
          attemptId: 'attempt-frq-1',
        },
      },
      markedQuestionIds: [frqQuestion.id],
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
      markedQuestionIds: [frqQuestion.id],
      missedQuestionIds: [frqQuestion.id],
    });
    expect(result.questionResults[0]).toMatchObject({
      questionId: mcqQuestion.id,
      score: 1,
      maxScore: 1,
      answered: true,
      isCorrect: true,
      attemptId: 'attempt-mcq-1',
      timeSpentSeconds: 60,
    });
    expect(result.questionResults[1]).toMatchObject({
      questionId: frqQuestion.id,
      score: 2,
      maxScore: 5,
      markedForReview: true,
      needsManualScore: false,
      timeSpentSeconds: 420,
    });
  });

  it('marks answered unreviewed FRQs as pending manual score', () => {
    const frqQuestion = questionSet.questions.find((question) => question.id === 'pc-frq-log-001');

    if (!frqQuestion) {
      throw new Error('Expected FRQ seed question.');
    }

    const result = createSessionResult({
      id: 'session-1',
      questionSetVersion: questionSet.version,
      questions: [frqQuestion],
      responses: {
        [frqQuestion.id]: {
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
