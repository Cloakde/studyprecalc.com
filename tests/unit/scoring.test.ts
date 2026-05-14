import { scoreFrqChecklist } from '../../src/domain/scoring/scoreFrq';
import { scoreMcq } from '../../src/domain/scoring/scoreMcq';
import { testFrqQuestion, testMcqQuestion } from '../fixtures/testQuestions';

describe('scoring', () => {
  it('scores an MCQ response', () => {
    expect(scoreMcq(testMcqQuestion, 'A')).toMatchObject({
      score: 1,
      maxScore: 1,
      isCorrect: true,
      correctChoiceId: 'A',
    });
    expect(scoreMcq(testMcqQuestion, 'B')).toMatchObject({
      score: 0,
      maxScore: 1,
      isCorrect: false,
      correctChoiceId: 'A',
    });
  });

  it('scores an FRQ self-grade checklist', () => {
    const result = scoreFrqChecklist(testFrqQuestion, {
      'test-frq-001-a-setup': true,
      'test-frq-001-a-interpret': false,
      'test-frq-001-b-equation': true,
      'test-frq-001-b-solve': true,
      'test-frq-001-b-interpret': false,
    });

    expect(result).toEqual({
      score: 3,
      maxScore: 5,
    });
  });
});
