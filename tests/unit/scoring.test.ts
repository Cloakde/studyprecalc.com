import seedQuestionSet from '../../content/questions/seed-ap-precalc.json';
import { QuestionSetSchema } from '../../src/data/schemas/questionSchema';
import { scoreFrqChecklist } from '../../src/domain/scoring/scoreFrq';
import { scoreMcq } from '../../src/domain/scoring/scoreMcq';

const questionSet = QuestionSetSchema.parse(seedQuestionSet);

describe('scoring', () => {
  it('scores an MCQ response', () => {
    const question = questionSet.questions.find((item) => item.id === 'pc-mcq-rat-001');

    expect(question?.type).toBe('mcq');

    if (!question || question.type !== 'mcq') {
      throw new Error('Expected MCQ seed question.');
    }

    expect(scoreMcq(question, 'A')).toMatchObject({
      score: 1,
      maxScore: 1,
      isCorrect: true,
      correctChoiceId: 'A',
    });
    expect(scoreMcq(question, 'B')).toMatchObject({
      score: 0,
      maxScore: 1,
      isCorrect: false,
      correctChoiceId: 'A',
    });
  });

  it('scores an FRQ self-grade checklist', () => {
    const question = questionSet.questions.find((item) => item.id === 'pc-frq-log-001');

    expect(question?.type).toBe('frq');

    if (!question || question.type !== 'frq') {
      throw new Error('Expected FRQ seed question.');
    }

    const result = scoreFrqChecklist(question, {
      'pc-frq-log-001-a-setup': true,
      'pc-frq-log-001-a-interpret': false,
      'pc-frq-log-001-b-equation': true,
      'pc-frq-log-001-b-solve': true,
      'pc-frq-log-001-b-interpret': false,
    });

    expect(result).toEqual({
      score: 3,
      maxScore: 5,
    });
  });
});
