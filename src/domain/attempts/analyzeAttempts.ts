import type { Question } from '../questions/types';
import type { Attempt } from './types';

export type AttemptPerformanceRecord = {
  source: 'attempt';
  attemptId: string;
  questionId: string;
  questionType: Question['type'];
  unit: string;
  topic: string;
  skill: string;
  score: number;
  maxScore: number;
  percent: number;
  missed: boolean;
  submittedAt: string;
  timeSpentSeconds?: number;
};

export function createQuestionLookup(questions: Question[]): Map<string, Question> {
  return new Map(questions.map((question) => [question.id, question]));
}

export function createAttemptPerformanceRecords(
  attempts: Attempt[],
  questions: Question[],
): AttemptPerformanceRecord[] {
  const questionsById = createQuestionLookup(questions);

  return attempts
    .map((attempt) => {
      const question = questionsById.get(attempt.questionId);

      if (!question) {
        return undefined;
      }

      const percent =
        attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;

      return {
        source: 'attempt' as const,
        attemptId: attempt.id,
        questionId: attempt.questionId,
        questionType: attempt.questionType,
        unit: question.unit,
        topic: question.topic,
        skill: question.skill,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percent,
        missed: attempt.score < attempt.maxScore,
        submittedAt: attempt.submittedAt,
        ...(attempt.timeSpentSeconds === undefined
          ? {}
          : { timeSpentSeconds: attempt.timeSpentSeconds }),
      };
    })
    .filter((record): record is AttemptPerformanceRecord => record !== undefined)
    .sort((first, second) => Date.parse(second.submittedAt) - Date.parse(first.submittedAt));
}
