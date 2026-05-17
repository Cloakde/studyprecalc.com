import {
  apPrecalculusTopics,
  apPrecalculusUnits,
  getApPrecalculusTopic,
  getApPrecalculusTopicByCode,
  getApPrecalculusTopicsForUnit,
  getApPrecalculusUnit,
  getApPrecalculusUnitTopicCounts,
  isApPrecalculusTopicAssessedOnApExam,
  isApPrecalculusUnitAssessedOnApExam,
  formatApPrecalculusTopic,
  formatApPrecalculusUnit,
  normalizeApPrecalculusTopicCode,
  normalizeApPrecalculusUnitId,
  normalizeCurriculumLookup,
} from '../../src/domain/curriculum';

describe('AP Precalculus CED curriculum domain', () => {
  it('defines all four Fall 2023 AP Precalculus units', () => {
    expect(apPrecalculusUnits).toHaveLength(4);
    expect(apPrecalculusUnits.map((unit) => unit.title)).toEqual([
      'Polynomial and Rational Functions',
      'Exponential and Logarithmic Functions',
      'Trigonometric and Polar Functions',
      'Functions Involving Parameters, Vectors, and Matrices',
    ]);
  });

  it('defines all 58 Fall 2023 CED topics with unit metadata', () => {
    expect(apPrecalculusTopics).toHaveLength(58);
    expect(new Set(apPrecalculusTopics.map((topic) => topic.code)).size).toBe(58);
    expect(
      apPrecalculusTopics.every(
        (topic) => topic.unitId && topic.unitTitle && typeof topic.assessedOnApExam === 'boolean',
      ),
    ).toBe(true);
  });

  it('marks Unit 4 as not assessed on the AP Exam', () => {
    expect(isApPrecalculusUnitAssessedOnApExam('unit 1')).toBe(true);
    expect(isApPrecalculusUnitAssessedOnApExam('unit 2')).toBe(true);
    expect(isApPrecalculusUnitAssessedOnApExam('unit 3')).toBe(true);
    expect(isApPrecalculusUnitAssessedOnApExam('unit 4')).toBe(false);
    expect(getApPrecalculusTopicsForUnit('unit 4').every((topic) => !topic.assessedOnApExam)).toBe(
      true,
    );
    expect(isApPrecalculusTopicAssessedOnApExam('4.14')).toBe(false);
  });

  it('looks up topics by code, code label, and title', () => {
    expect(getApPrecalculusTopicByCode('1.1')).toEqual(
      expect.objectContaining({
        code: '1.1',
        title: 'Change in Tandem',
        unitId: 'unit-1',
        unitTitle: 'Polynomial and Rational Functions',
        assessedOnApExam: true,
      }),
    );
    expect(getApPrecalculusTopic('topic 3.11')?.title).toBe(
      'The Secant, Cosecant, and Cotangent Functions',
    );
    expect(getApPrecalculusTopic('Matrices Modeling Contexts')?.code).toBe('4.14');
  });

  it('reports topic counts by unit', () => {
    expect(getApPrecalculusUnitTopicCounts()).toEqual({
      'unit-1': 14,
      'unit-2': 15,
      'unit-3': 15,
      'unit-4': 14,
    });
    expect(getApPrecalculusTopicsForUnit('Polynomial and Rational Functions')).toHaveLength(14);
    expect(getApPrecalculusTopicsForUnit('U2')).toHaveLength(15);
  });

  it('normalizes common unit and topic aliases', () => {
    expect(normalizeCurriculumLookup(' Topic 03-11 ')).toBe('3.11');
    expect(normalizeApPrecalculusTopicCode('topic 01.01')).toBe('1.1');
    expect(normalizeApPrecalculusUnitId('Unit 1: Polynomial and Rational Functions')).toBe(
      'unit-1',
    );
    expect(normalizeApPrecalculusUnitId('Trigonometric & Polar Functions')).toBe('unit-3');
    expect(getApPrecalculusUnit('parameters vectors and matrices')?.id).toBe('unit-4');
    expect(getApPrecalculusTopic('exponential model interpretation')?.code).toBe('2.5');
    expect(getApPrecalculusTopic('secant cosecant cotangent functions')?.code).toBe('3.11');
  });

  it('formats canonical authoring labels for units and topics', () => {
    expect(formatApPrecalculusUnit(apPrecalculusUnits[0])).toBe(
      'Unit 1: Polynomial and Rational Functions',
    );
    expect(formatApPrecalculusTopic(getApPrecalculusTopic('1.12')!)).toBe(
      '1.12 Transformations of Functions',
    );
  });
});
