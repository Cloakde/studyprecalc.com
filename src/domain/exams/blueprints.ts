import type { ExamBlueprint, ExamUnitDefinition, ExamUnitId } from './types';

export const examUnits: ExamUnitDefinition[] = [
  {
    id: 'unit-1',
    number: 1,
    title: 'Polynomial and Rational Functions',
    assessedOnApExam: true,
    aliases: ['unit-1', 'unit 1', 'polynomial and rational functions'],
  },
  {
    id: 'unit-2',
    number: 2,
    title: 'Exponential and Logarithmic Functions',
    assessedOnApExam: true,
    aliases: ['unit-2', 'unit 2', 'exponential and logarithmic functions'],
  },
  {
    id: 'unit-3',
    number: 3,
    title: 'Trigonometric and Polar Functions',
    assessedOnApExam: true,
    aliases: ['unit-3', 'unit 3', 'trigonometric and polar functions'],
  },
  {
    id: 'unit-4',
    number: 4,
    title: 'Functions Involving Parameters, Vectors, and Matrices',
    assessedOnApExam: false,
    aliases: ['unit-4', 'unit 4', 'functions involving parameters vectors and matrices'],
  },
];

const unitPracticeRequirementCount = {
  mcq: 12,
  frq: 2,
} as const;

export const unitPracticeExamBlueprints: ExamBlueprint[] = examUnits.map((unit) => ({
  id: `${unit.id}-practice-exam`,
  title: `Unit ${unit.number} Practice Exam`,
  mode: 'unit-practice',
  unitIds: [unit.id],
  requirements: [
    {
      type: 'mcq',
      count: unitPracticeRequirementCount.mcq,
      unitIds: [unit.id],
    },
    {
      type: 'frq',
      count: unitPracticeRequirementCount.frq,
      unitIds: [unit.id],
    },
  ],
  timing: {
    timed: {
      mode: 'timed',
      durationSeconds: 60 * 60,
    },
    untimed: {
      mode: 'untimed',
    },
  },
}));

export const apPrepExamBlueprint: ExamBlueprint = {
  id: 'ap-prep-units-1-3',
  title: 'AP Prep Exam: Units 1-3',
  mode: 'ap-prep',
  unitIds: ['unit-1', 'unit-2', 'unit-3'],
  requirements: [
    {
      type: 'mcq',
      count: 24,
      unitIds: ['unit-1', 'unit-2', 'unit-3'],
    },
    {
      type: 'frq',
      count: 4,
      unitIds: ['unit-1', 'unit-2', 'unit-3'],
    },
  ],
  timing: {
    timed: {
      mode: 'timed',
      durationSeconds: 2 * 60 * 60,
    },
    untimed: {
      mode: 'untimed',
    },
  },
};

export const examBlueprints: ExamBlueprint[] = [...unitPracticeExamBlueprints, apPrepExamBlueprint];

export function getExamUnit(unitId: ExamUnitId): ExamUnitDefinition {
  const unit = examUnits.find((candidate) => candidate.id === unitId);

  if (!unit) {
    throw new Error(`Unknown exam unit: ${unitId}`);
  }

  return unit;
}

export function getExamBlueprint(blueprintId: string): ExamBlueprint | undefined {
  return examBlueprints.find((blueprint) => blueprint.id === blueprintId);
}
