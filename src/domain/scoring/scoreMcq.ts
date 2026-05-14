import type { McqChoice, McqQuestion } from '../questions/types';

export type McqScoreResult = {
  score: 0 | 1;
  maxScore: 1;
  isCorrect: boolean;
  correctChoiceId: McqChoice['id'];
};

export function scoreMcq(question: McqQuestion, selectedChoiceId: McqChoice['id']): McqScoreResult {
  const isCorrect = question.correctChoiceId === selectedChoiceId;

  return {
    score: isCorrect ? 1 : 0,
    maxScore: 1,
    isCorrect,
    correctChoiceId: question.correctChoiceId,
  };
}
