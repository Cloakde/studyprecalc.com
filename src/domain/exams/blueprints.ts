import { apPrecalculusUnits } from '../curriculum';
import type { ExamBlueprint, ExamUnitDefinition, ExamUnitId } from './types';

export const examUnits: ExamUnitDefinition[] = apPrecalculusUnits.map((unit) => ({
  id: unit.id,
  number: unit.number,
  title: unit.title,
  assessedOnApExam: unit.assessedOnApExam,
  aliases: [...unit.aliases],
}));

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

const apPrepExamUnitIds = examUnits.filter((unit) => unit.assessedOnApExam).map((unit) => unit.id);

export const apPrepExamBlueprint: ExamBlueprint = {
  id: 'ap-prep-units-1-3',
  title: 'AP Prep Exam: Units 1-3',
  mode: 'ap-prep',
  unitIds: apPrepExamUnitIds,
  requirements: [
    {
      type: 'mcq',
      count: 24,
      unitIds: apPrepExamUnitIds,
    },
    {
      type: 'frq',
      count: 4,
      unitIds: apPrepExamUnitIds,
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
