import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Question } from '../domain/questions/types';
import {
  createQuestionContentRecord,
  getPublishedQuestions,
  isQuestionPublicationStatus,
  setQuestionContentStatus,
  upsertQuestionContentRecord,
  type QuestionContentPayload,
  type QuestionContentRecord,
  type QuestionPublicationStatus,
} from '../domain/questions/publication';
import { QuestionSchema, QuestionSetSchema } from './schemas/questionSchema';

const customQuestionsStorageKey = 'precalcapp.customQuestions.v1';
const questionContentStorageKey = 'precalcapp.questionContent.v1';

function isQuestionContentPayload(candidate: unknown): candidate is QuestionContentPayload {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  const payload = candidate as Partial<QuestionContentPayload>;

  return payload.version === 'precalcapp.questionContent.v1' && Array.isArray(payload.records);
}

function isQuestionContentRecord(candidate: unknown): candidate is QuestionContentRecord {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }

  const record = candidate as Partial<QuestionContentRecord> & {
    publication?: { status?: unknown; createdAt?: unknown; updatedAt?: unknown };
  };
  const status = record.status ?? record.publication?.status;
  const createdAt = record.createdAt ?? record.publication?.createdAt;
  const updatedAt = record.updatedAt ?? record.publication?.updatedAt;

  return (
    typeof record.id === 'string' &&
    isQuestionPublicationStatus(status) &&
    typeof createdAt === 'string' &&
    typeof updatedAt === 'string' &&
    QuestionSchema.safeParse(record.question).success
  );
}

function normalizeQuestionContentRecord(record: QuestionContentRecord): QuestionContentRecord {
  const candidate = record as QuestionContentRecord & {
    publication?: {
      status?: QuestionPublicationStatus;
      createdAt?: string;
      updatedAt?: string;
      createdBy?: string;
    };
  };

  return {
    id: candidate.id,
    question: candidate.question,
    status: candidate.status ?? candidate.publication?.status ?? 'draft',
    createdAt: candidate.createdAt ?? candidate.publication?.createdAt ?? new Date().toISOString(),
    updatedAt: candidate.updatedAt ?? candidate.publication?.updatedAt ?? new Date().toISOString(),
    ...((candidate.createdBy ?? candidate.publication?.createdBy)
      ? { createdBy: candidate.createdBy ?? candidate.publication?.createdBy }
      : {}),
  };
}

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

function loadQuestionContentRecords(): QuestionContentRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawRecords = window.localStorage.getItem(questionContentStorageKey);

  if (rawRecords) {
    try {
      const parsed = JSON.parse(rawRecords) as unknown;

      if (isQuestionContentPayload(parsed)) {
        return parsed.records.filter(isQuestionContentRecord).map(normalizeQuestionContentRecord);
      }
    } catch {
      return [];
    }
  }

  return loadCustomQuestions().map((question) =>
    createQuestionContentRecord(question, { status: 'draft' }),
  );
}

function persistQuestionContentRecords(records: QuestionContentRecord[]) {
  window.localStorage.setItem(
    questionContentStorageKey,
    JSON.stringify(
      {
        version: 'precalcapp.questionContent.v1',
        records,
      },
      null,
      2,
    ),
  );
  window.localStorage.setItem(
    customQuestionsStorageKey,
    JSON.stringify(
      {
        version: 'local',
        questions: records.map((record) => record.question),
      },
      null,
      2,
    ),
  );
}

export function useManagedQuestionBank(seedQuestions: Question[]) {
  const [contentRecords, setContentRecords] = useState<QuestionContentRecord[]>(() =>
    loadQuestionContentRecords(),
  );

  useEffect(() => {
    persistQuestionContentRecords(contentRecords);
  }, [contentRecords]);

  const seedQuestionIds = useMemo(
    () => new Set(seedQuestions.map((question) => question.id)),
    [seedQuestions],
  );

  const questionBank = useMemo(() => {
    const filteredPublishedQuestions = getPublishedQuestions(contentRecords).filter(
      (question) => !seedQuestionIds.has(question.id),
    );

    return [...seedQuestions, ...filteredPublishedQuestions];
  }, [contentRecords, seedQuestionIds, seedQuestions]);

  const customQuestions = useMemo(
    () => contentRecords.map((record) => record.question),
    [contentRecords],
  );

  const saveCustomQuestion = useCallback(
    (question: Question, status?: QuestionPublicationStatus) => {
      setContentRecords((currentRecords) =>
        upsertQuestionContentRecord(currentRecords, question, { status }),
      );
    },
    [],
  );

  const deleteCustomQuestion = useCallback((questionId: string) => {
    setContentRecords((currentRecords) =>
      currentRecords.filter((record) => record.id !== questionId),
    );
  }, []);

  const importCustomQuestions = useCallback(
    (questions: Question[]) => {
      const existingCustomIds = new Set(contentRecords.map((record) => record.id));
      const allowedQuestions = questions.filter(
        (question) => !seedQuestionIds.has(question.id) && !existingCustomIds.has(question.id),
      );

      setContentRecords(
        [
          ...contentRecords,
          ...allowedQuestions.map((question) =>
            createQuestionContentRecord(question, { status: 'draft' }),
          ),
        ].sort((a, b) => a.id.localeCompare(b.id)),
      );

      return {
        imported: allowedQuestions.length,
        skipped: questions.length - allowedQuestions.length,
      };
    },
    [contentRecords, seedQuestionIds],
  );

  const clearCustomQuestions = useCallback(() => {
    setContentRecords([]);
  }, []);

  const setCustomQuestionStatus = useCallback(
    (questionId: string, status: QuestionPublicationStatus) => {
      setContentRecords((currentRecords) =>
        setQuestionContentStatus(currentRecords, questionId, status),
      );
    },
    [],
  );

  const getQuestionStatus = useCallback(
    (questionId: string): QuestionPublicationStatus =>
      contentRecords.find((record) => record.id === questionId)?.status ?? 'draft',
    [contentRecords],
  );

  const isContentLoading = false;
  const contentError = '';

  const refreshContent = useCallback(() => {
    setContentRecords(loadQuestionContentRecords());
  }, []);

  return {
    questionBank,
    customQuestions,
    contentRecords,
    seedQuestionIds,
    saveCustomQuestion,
    deleteCustomQuestion,
    importCustomQuestions,
    clearCustomQuestions,
    setCustomQuestionStatus,
    getQuestionStatus,
    isContentLoading,
    contentError,
    refreshContent,
  };
}
