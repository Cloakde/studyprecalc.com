import type { FrqQuestion } from '../questions/types';

export function getFrqMaxScore(question: FrqQuestion): number {
  return question.parts.reduce((total, part) => {
    return total + part.rubric.reduce((partTotal, criterion) => partTotal + criterion.points, 0);
  }, 0);
}

export function scoreFrqChecklist(
  question: FrqQuestion,
  earnedPointsByCriterion: Record<string, boolean>,
): { score: number; maxScore: number } {
  const score = question.parts.reduce((total, part) => {
    const partScore = part.rubric.reduce((partTotal, criterion) => {
      return partTotal + (earnedPointsByCriterion[criterion.id] ? criterion.points : 0);
    }, 0);

    return total + partScore;
  }, 0);

  return {
    score,
    maxScore: getFrqMaxScore(question),
  };
}
