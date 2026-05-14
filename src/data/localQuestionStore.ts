import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Question } from '../domain/questions/types';
import { QuestionSetSchema } from './schemas/questionSchema';

const customQuestionsStorageKey = 'precalcapp.customQuestions.v1';

function loadCustomQuestions(): Question[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(customQuestionsStorageKey);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = QuestionSetSchema.safeParse(parsed);

    if (!result.success) {
      return [];
    }

    return result.data.questions;
  } catch {
    return [];
  }
}

function persistCustomQuestions(questions: Question[]) {
  window.localStorage.setItem(
    customQuestionsStorageKey,
    JSON.stringify(
      {
        version: 'local',
        questions,
      },
      null,
      2,
    ),
  );
}

export function useManagedQuestionBank(seedQuestions: Question[]) {
  const [customQuestions, setCustomQuestions] = useState<Question[]>(() => loadCustomQuestions());

  useEffect(() => {
    persistCustomQuestions(customQuestions);
  }, [customQuestions]);

  const seedQuestionIds = useMemo(
    () => new Set(seedQuestions.map((question) => question.id)),
    [seedQuestions],
  );

  const questionBank = useMemo(() => {
    const filteredCustomQuestions = customQuestions.filter(
      (question) => !seedQuestionIds.has(question.id),
    );

    return [...seedQuestions, ...filteredCustomQuestions];
  }, [customQuestions, seedQuestionIds, seedQuestions]);

  const saveCustomQuestion = useCallback((question: Question) => {
    setCustomQuestions((currentQuestions) => {
      const nextQuestions = currentQuestions.filter((item) => item.id !== question.id);
      return [...nextQuestions, question].sort((a, b) => a.id.localeCompare(b.id));
    });
  }, []);

  const deleteCustomQuestion = useCallback((questionId: string) => {
    setCustomQuestions((currentQuestions) =>
      currentQuestions.filter((question) => question.id !== questionId),
    );
  }, []);

  const importCustomQuestions = useCallback(
    (questions: Question[]) => {
      const existingCustomIds = new Set(customQuestions.map((question) => question.id));
      const allowedQuestions = questions.filter(
        (question) => !seedQuestionIds.has(question.id) && !existingCustomIds.has(question.id),
      );

      setCustomQuestions(
        [...customQuestions, ...allowedQuestions].sort((a, b) => a.id.localeCompare(b.id)),
      );

      return {
        imported: allowedQuestions.length,
        skipped: questions.length - allowedQuestions.length,
      };
    },
    [customQuestions, seedQuestionIds],
  );

  const clearCustomQuestions = useCallback(() => {
    setCustomQuestions([]);
  }, []);

  return {
    questionBank,
    customQuestions,
    seedQuestionIds,
    saveCustomQuestion,
    deleteCustomQuestion,
    importCustomQuestions,
    clearCustomQuestions,
  };
}
