import {
  apPrepExamBlueprint,
  createExamScoreSummary,
  getExamReadiness,
  getQuestionExamUnitId,
  selectExamQuestions,
  unitPracticeExamBlueprints,
} from '../../src/domain/exams';
import type { FrqQuestion, McqQuestion, Question } from '../../src/domain/questions/types';
import { testFrqQuestion, testMcqQuestion } from '../fixtures/testQuestions';

function makeMcqQuestion(id: string, unit: string): McqQuestion {
  return {
    ...testMcqQuestion,
    id,
    unit,
    publicationStatus: 'published',
    tags: [id],
  };
}

function makeFrqQuestion(id: string, unit: string): FrqQuestion {
  return {
    ...testFrqQuestion,
    id,
    unit,
    publicationStatus: 'published',
    tags: [id],
    parts: testFrqQuestion.parts.map((part) => ({
      ...part,
      rubric: part.rubric.map((criterion) => ({
        ...criterion,
        id: `${id}-${criterion.id}`,
      })),
    })),
  };
}

function makeQuestions(type: 'mcq' | 'frq', unit: string, count: number): Question[] {
  return Array.from({ length: count }, (_, index) =>
    type === 'mcq'
      ? makeMcqQuestion(`${unit}-mcq-${index + 1}`, unit)
      : makeFrqQuestion(`${unit}-frq-${index + 1}`, unit),
  );
}

describe('exam domain foundation', () => {
  it('defines unit practice for Units 1-4 and AP prep for Units 1-3 only', () => {
    expect(unitPracticeExamBlueprints.map((blueprint) => blueprint.unitIds)).toEqual([
      ['unit-1'],
      ['unit-2'],
      ['unit-3'],
      ['unit-4'],
    ]);
    expect(apPrepExamBlueprint.unitIds).toEqual(['unit-1', 'unit-2', 'unit-3']);
    expect(apPrepExamBlueprint.requirements.every((requirement) => requirement.unitIds)).toBe(true);
    expect(
      apPrepExamBlueprint.requirements.every(
        (requirement) => !requirement.unitIds?.includes('unit-4'),
      ),
    ).toBe(true);
    expect(unitPracticeExamBlueprints[0].timing.timed.durationSeconds).toBe(60 * 60);
    expect(apPrepExamBlueprint.timing.untimed.durationSeconds).toBeUndefined();
  });

  it('maps owner-authored unit labels to canonical exam unit ids', () => {
    expect(getQuestionExamUnitId({ unit: 'Polynomial and Rational Functions' })).toBe('unit-1');
    expect(getQuestionExamUnitId({ unit: 'unit 2' })).toBe('unit-2');
    expect(getQuestionExamUnitId({ unit: 'Trigonometric & Polar Functions' })).toBe('unit-3');
  });

  it('reports missing counts from published owner-authored questions', () => {
    const blueprint = unitPracticeExamBlueprints[0];
    const questions = [
      ...makeQuestions('mcq', 'Polynomial and Rational Functions', 11),
      ...makeQuestions('frq', 'Polynomial and Rational Functions', 2),
      {
        ...makeMcqQuestion('draft-extra', 'Polynomial and Rational Functions'),
        publicationStatus: 'draft' as const,
      },
    ];

    const readiness = getExamReadiness(blueprint, questions);

    expect(readiness.ready).toBe(false);
    expect(readiness.totalRequiredCount).toBe(14);
    expect(readiness.requirements).toEqual([
      expect.objectContaining({
        type: 'mcq',
        count: 12,
        availableCount: 11,
        missingCount: 1,
        ready: false,
      }),
      expect.objectContaining({
        type: 'frq',
        count: 2,
        availableCount: 2,
        missingCount: 0,
        ready: true,
      }),
    ]);

    expect(getExamReadiness(blueprint, questions, { includeDrafts: true }).ready).toBe(true);
  });

  it('selects required questions when a blueprint is ready', () => {
    const blueprint = unitPracticeExamBlueprints[1];
    const questions = [
      ...makeQuestions('mcq', 'Exponential and Logarithmic Functions', 13),
      ...makeQuestions('frq', 'Exponential and Logarithmic Functions', 3),
      ...makeQuestions('mcq', 'Polynomial and Rational Functions', 20),
    ];

    const selection = selectExamQuestions(blueprint, questions, {
      questionOrder: (candidates) => [...candidates].sort((a, b) => b.id.localeCompare(a.id)),
    });

    expect(selection.ready).toBe(true);
    expect(selection.questions).toHaveLength(14);
    expect(selection.questions.filter((question) => question.type === 'mcq')).toHaveLength(12);
    expect(selection.questions.filter((question) => question.type === 'frq')).toHaveLength(2);
    expect(
      selection.questions.every((question) => getQuestionExamUnitId(question) === 'unit-2'),
    ).toBe(true);
    expect(selection.questions[0].id).toBe('Exponential and Logarithmic Functions-mcq-9');
  });

  it('keeps Unit 4 questions out of AP prep readiness and selection', () => {
    const questions = [
      ...makeQuestions('mcq', 'Polynomial and Rational Functions', 8),
      ...makeQuestions('mcq', 'Exponential and Logarithmic Functions', 8),
      ...makeQuestions('mcq', 'Trigonometric and Polar Functions', 8),
      ...makeQuestions('mcq', 'Functions Involving Parameters, Vectors, and Matrices', 20),
      ...makeQuestions('frq', 'Polynomial and Rational Functions', 2),
      ...makeQuestions('frq', 'Trigonometric and Polar Functions', 2),
      ...makeQuestions('frq', 'Functions Involving Parameters, Vectors, and Matrices', 5),
    ];

    const selection = selectExamQuestions(apPrepExamBlueprint, questions);

    expect(selection.ready).toBe(true);
    expect(selection.questions).toHaveLength(28);
    expect(
      selection.questions.every((question) => getQuestionExamUnitId(question) !== 'unit-4'),
    ).toBe(true);
  });

  it('summarizes exam scores without treating pending manual scores as misses', () => {
    const summary = createExamScoreSummary([
      {
        questionId: 'mcq-correct',
        questionType: 'mcq',
        score: 1,
        maxScore: 1,
        answered: true,
      },
      {
        questionId: 'mcq-missed',
        questionType: 'mcq',
        score: 0,
        maxScore: 1,
        answered: true,
      },
      {
        questionId: 'frq-pending',
        questionType: 'frq',
        score: 0,
        maxScore: 5,
        answered: true,
        pendingManualScore: true,
      },
    ]);

    expect(summary).toEqual({
      score: 1,
      maxScore: 7,
      percent: 14,
      answeredQuestionCount: 3,
      totalQuestionCount: 3,
      pendingManualScoreCount: 1,
      missedQuestionIds: ['mcq-missed'],
    });
  });
});
