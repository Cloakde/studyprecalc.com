import { getPublicationStatus, type QuestionPublicationState } from './publication';

export type QuestionVisibilityRole = 'student' | 'admin';

export type QuestionVisibilityAudience = {
  role: QuestionVisibilityRole;
  previewDrafts?: boolean;
  includeArchived?: boolean;
};

export const studentQuestionAudience: QuestionVisibilityAudience = {
  role: 'student',
};

export const adminPreviewQuestionAudience: QuestionVisibilityAudience = {
  role: 'admin',
  previewDrafts: true,
};

export function canViewQuestion(
  question: QuestionPublicationState,
  audience: QuestionVisibilityAudience,
): boolean {
  const publicationStatus = getPublicationStatus(question);

  if (publicationStatus === 'published') {
    return true;
  }

  if (audience.role !== 'admin') {
    return false;
  }

  if (publicationStatus === 'draft') {
    return audience.previewDrafts ?? true;
  }

  return audience.includeArchived ?? false;
}

export function getVisibleQuestionsForAudience<T extends QuestionPublicationState>(
  questions: readonly T[],
  audience: QuestionVisibilityAudience,
): T[] {
  return questions.filter((question) => canViewQuestion(question, audience));
}

export function getStudentVisibleQuestions<T extends QuestionPublicationState>(
  questions: readonly T[],
): T[] {
  return getVisibleQuestionsForAudience(questions, studentQuestionAudience);
}
