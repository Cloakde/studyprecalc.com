import type { ExamScoreItem, ExamScoreSummary } from './types';

export function createExamScoreSummary(items: readonly ExamScoreItem[]): ExamScoreSummary {
  const score = items.reduce((total, item) => total + item.score, 0);
  const maxScore = items.reduce((total, item) => total + item.maxScore, 0);
  const pendingManualScoreCount = items.filter((item) => item.pendingManualScore).length;

  return {
    score,
    maxScore,
    percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    answeredQuestionCount: items.filter((item) => item.answered === true).length,
    totalQuestionCount: items.length,
    pendingManualScoreCount,
    missedQuestionIds: items
      .filter((item) => !item.pendingManualScore && item.score < item.maxScore)
      .map((item) => item.questionId),
  };
}
