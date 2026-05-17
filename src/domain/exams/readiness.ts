import { getApPrecalculusUnit } from '../curriculum';
import { getPublicationStatus } from '../questions/publication';
import type { Question } from '../questions/types';
import type {
  ExamBlueprint,
  ExamQuestionAvailability,
  ExamQuestionRequirement,
  ExamQuestionSelection,
  ExamReadiness,
  ExamSelectionOptions,
  ExamUnitId,
} from './types';

export function getQuestionExamUnitId(question: Pick<Question, 'unit'>): ExamUnitId | undefined {
  return getApPrecalculusUnit(question.unit)?.id;
}

export function isQuestionAvailableForExam(
  question: Question,
  availability: ExamQuestionAvailability = {},
): boolean {
  const status = getPublicationStatus(question);

  if (status === 'published') {
    return true;
  }

  if (status === 'draft') {
    return availability.includeDrafts === true;
  }

  return availability.includeArchived === true;
}

export function questionMatchesExamRequirement(
  question: Question,
  requirement: ExamQuestionRequirement,
): boolean {
  if (question.type !== requirement.type) {
    return false;
  }

  if (!requirement.unitIds?.length) {
    return true;
  }

  const questionUnitId = getQuestionExamUnitId(question);

  return questionUnitId !== undefined && requirement.unitIds.includes(questionUnitId);
}

export function getQuestionsForExamRequirement(
  questions: readonly Question[],
  requirement: ExamQuestionRequirement,
  availability: ExamQuestionAvailability = {},
): Question[] {
  return questions.filter(
    (question) =>
      isQuestionAvailableForExam(question, availability) &&
      questionMatchesExamRequirement(question, requirement),
  );
}

export function getExamReadiness(
  blueprint: ExamBlueprint,
  questions: readonly Question[],
  availability: ExamQuestionAvailability = {},
): ExamReadiness {
  const requirements = blueprint.requirements.map((requirement) => {
    const availableCount = getQuestionsForExamRequirement(
      questions,
      requirement,
      availability,
    ).length;

    return {
      ...requirement,
      availableCount,
      ready: availableCount >= requirement.count,
      missingCount: Math.max(0, requirement.count - availableCount),
    };
  });

  return {
    blueprintId: blueprint.id,
    ready: requirements.every((requirement) => requirement.ready),
    totalRequiredCount: requirements.reduce((total, requirement) => total + requirement.count, 0),
    totalAvailableCount: requirements.reduce(
      (total, requirement) => total + requirement.availableCount,
      0,
    ),
    requirements,
  };
}

export function selectExamQuestions(
  blueprint: ExamBlueprint,
  questions: readonly Question[],
  options: ExamSelectionOptions = {},
): ExamQuestionSelection {
  const readiness = getExamReadiness(blueprint, questions, options);
  const selectedQuestionIds = new Set<string>();
  const selectedQuestions: Question[] = [];
  const orderQuestions =
    options.questionOrder ?? ((unorderedQuestions: Question[]) => [...unorderedQuestions]);

  for (const requirement of blueprint.requirements) {
    const candidates = orderQuestions(
      getQuestionsForExamRequirement(questions, requirement, options),
    ).filter((question) => !selectedQuestionIds.has(question.id));

    for (const question of candidates.slice(0, requirement.count)) {
      selectedQuestionIds.add(question.id);
      selectedQuestions.push(question);
    }
  }

  return {
    blueprintId: blueprint.id,
    ready: readiness.ready,
    questions: readiness.ready ? selectedQuestions : [],
    readiness,
  };
}
