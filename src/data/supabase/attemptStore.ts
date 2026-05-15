import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createAttemptExportPayload,
  mergeAttemptsById,
  parseAttemptImportPayload,
  serializeAttempts,
  sortAttemptsBySubmittedAt,
  validateAttempt,
  type ImportAttemptsResult,
  type SaveFrqAttemptInput,
  type SaveMcqAttemptInput,
} from '../localAttemptStore';
import {
  createFrqAttempt,
  createMcqAttempt,
  type CreateFrqAttemptInput,
  type CreateMcqAttemptInput,
} from '../../domain/attempts/createAttempt';
import type { Attempt, AttemptTimestamp, CreateAttemptMetadata } from '../../domain/attempts/types';
import { supabase } from './client';

type AttemptRow = {
  id: string;
  user_id: string;
  question_id: string;
  question_type: Attempt['questionType'];
  started_at: string;
  submitted_at: string;
  updated_at: string | null;
  response: Attempt['response'];
  score: number;
  max_score: number;
  is_correct: boolean | null;
  time_spent_seconds: number | null;
};

type LocalAttemptMetadataInput = Partial<CreateAttemptMetadata>;

type SupabasePersistenceResult = {
  error: { message?: string } | null;
};

type UseSupabaseAttemptStoreOptions = {
  enabled: boolean;
  userId?: string;
  now?: () => Date;
  createId?: () => string;
};

function createBrowserAttemptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPersistenceErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

async function recordSupabasePersistenceResult(
  operation: () => PromiseLike<SupabasePersistenceResult>,
  setLastError: (message: string) => void,
  fallbackMessage: string,
): Promise<void> {
  try {
    const { error } = await operation();

    setLastError(error ? getPersistenceErrorMessage(error, fallbackMessage) : '');
  } catch (error) {
    setLastError(getPersistenceErrorMessage(error, fallbackMessage));
  }
}

function createLocalAttemptMetadata(
  input: LocalAttemptMetadataInput,
  now: () => Date,
  createId: () => string,
): CreateAttemptMetadata {
  const currentTime = now();
  const submittedAt = input.submittedAt ?? currentTime;

  return {
    id: input.id ?? createId(),
    startedAt: input.startedAt ?? submittedAt,
    submittedAt,
    updatedAt: input.updatedAt ?? currentTime,
    ...(input.timeSpentSeconds === undefined ? {} : { timeSpentSeconds: input.timeSpentSeconds }),
  };
}

export function attemptToSupabaseRow(attempt: Attempt, userId: string): AttemptRow {
  return {
    id: attempt.id,
    user_id: userId,
    question_id: attempt.questionId,
    question_type: attempt.questionType,
    started_at: attempt.startedAt,
    submitted_at: attempt.submittedAt,
    updated_at: attempt.updatedAt ?? attempt.submittedAt,
    response: attempt.response,
    score: attempt.score,
    max_score: attempt.maxScore,
    is_correct: attempt.isCorrect ?? null,
    time_spent_seconds: attempt.timeSpentSeconds ?? null,
  };
}

export function attemptFromSupabaseRow(row: AttemptRow): Attempt {
  return validateAttempt({
    id: row.id,
    questionId: row.question_id,
    questionType: row.question_type,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    response: row.response,
    score: row.score,
    maxScore: row.max_score,
    ...(row.is_correct === null ? {} : { isCorrect: row.is_correct }),
    ...(row.time_spent_seconds === null ? {} : { timeSpentSeconds: row.time_spent_seconds }),
  });
}

export function useSupabaseAttemptStore({
  enabled,
  userId,
  now: nowOption,
  createId: createIdOption,
}: UseSupabaseAttemptStoreOptions) {
  const now = useMemo(() => nowOption ?? (() => new Date()), [nowOption]);
  const createId = useMemo(() => createIdOption ?? createBrowserAttemptId, [createIdOption]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [lastError, setLastError] = useState('');
  const attemptsRef = useRef(attempts);

  const attemptsByQuestionId = useMemo(() => {
    const byQuestionId = new Map<string, Attempt[]>();

    attempts.forEach((attempt) => {
      byQuestionId.set(attempt.questionId, [
        ...(byQuestionId.get(attempt.questionId) ?? []),
        attempt,
      ]);
    });

    return byQuestionId;
  }, [attempts]);

  const latestAttemptByQuestionId = useMemo(() => {
    const latestByQuestionId = new Map<string, Attempt>();

    attempts.forEach((attempt) => {
      if (!latestByQuestionId.has(attempt.questionId)) {
        latestByQuestionId.set(attempt.questionId, attempt);
      }
    });

    return latestByQuestionId;
  }, [attempts]);

  const setSortedAttempts = useCallback((nextAttempts: Attempt[]) => {
    const sortedAttempts = sortAttemptsBySubmittedAt(nextAttempts);
    attemptsRef.current = sortedAttempts;
    setAttempts(sortedAttempts);
    return sortedAttempts;
  }, []);

  const persistAttempt = useCallback(
    async (attempt: Attempt) => {
      if (!enabled || !supabase || !userId) {
        return;
      }

      const client = supabase;

      await recordSupabasePersistenceResult(
        () =>
          client
            .from('attempts')
            .upsert(attemptToSupabaseRow(attempt, userId), { onConflict: 'id' }),
        setLastError,
        'Unable to save attempt progress.',
      );
    },
    [enabled, userId],
  );

  const saveAttempt = useCallback(
    (attempt: Attempt) => {
      const validatedAttempt = validateAttempt(attempt);
      const merged = mergeAttemptsById(attemptsRef.current, [validatedAttempt]);

      setSortedAttempts(merged.attempts);
      void persistAttempt(validatedAttempt);
      return validatedAttempt;
    },
    [persistAttempt, setSortedAttempts],
  );

  const saveMcqAttempt = useCallback(
    (input: Omit<CreateMcqAttemptInput, keyof CreateAttemptMetadata> & LocalAttemptMetadataInput) =>
      saveAttempt(
        createMcqAttempt({
          ...input,
          ...createLocalAttemptMetadata(input, now, createId),
        }),
      ),
    [createId, now, saveAttempt],
  );

  const saveFrqAttempt = useCallback(
    (input: Omit<CreateFrqAttemptInput, keyof CreateAttemptMetadata> & LocalAttemptMetadataInput) =>
      saveAttempt(
        createFrqAttempt({
          ...input,
          ...createLocalAttemptMetadata(input, now, createId),
        }),
      ),
    [createId, now, saveAttempt],
  );

  const replaceAttempts = useCallback(
    (nextAttempts: Attempt[]) => {
      const sortedAttempts = setSortedAttempts(nextAttempts.map(validateAttempt));

      if (enabled && supabase && userId) {
        const client = supabase;

        void recordSupabasePersistenceResult(
          () =>
            client.from('attempts').upsert(
              sortedAttempts.map((attempt) => attemptToSupabaseRow(attempt, userId)),
              { onConflict: 'id' },
            ),
          setLastError,
          'Unable to sync imported attempts.',
        );
      }

      return sortedAttempts;
    },
    [enabled, setSortedAttempts, userId],
  );

  const importAttempts = useCallback(
    (payload: unknown): ImportAttemptsResult => {
      const parsed = parseAttemptImportPayload(payload);
      const merged = mergeAttemptsById(attemptsRef.current, parsed.attempts);

      replaceAttempts(merged.attempts);

      return {
        ...merged,
        imported: parsed.attempts.length,
        rejectedCount: parsed.rejectedCount,
        errors: parsed.errors,
      };
    },
    [replaceAttempts],
  );

  const removeAttempt = useCallback(
    (attemptId: string) => {
      const nextAttempts = attemptsRef.current.filter((attempt) => attempt.id !== attemptId);
      setSortedAttempts(nextAttempts);

      if (enabled && supabase && userId) {
        const client = supabase;

        void recordSupabasePersistenceResult(
          () => client.from('attempts').delete().eq('user_id', userId).eq('id', attemptId),
          setLastError,
          'Unable to remove attempt from cloud storage.',
        );
      }

      return nextAttempts;
    },
    [enabled, setSortedAttempts, userId],
  );

  const clearAttempts = useCallback(() => {
    attemptsRef.current = [];
    setAttempts([]);

    if (enabled && supabase && userId) {
      const client = supabase;

      void recordSupabasePersistenceResult(
        () => client.from('attempts').delete().eq('user_id', userId).neq('id', ''),
        setLastError,
        'Unable to clear cloud attempt history.',
      );
    }
  }, [enabled, userId]);

  const exportAttempts = useCallback(
    (exportedAt?: AttemptTimestamp) =>
      JSON.stringify(createAttemptExportPayload(attemptsRef.current, exportedAt), null, 2),
    [],
  );

  const getAttemptsForQuestion = useCallback((questionId: string) => {
    return attemptsRef.current.filter((attempt) => attempt.questionId === questionId);
  }, []);

  useEffect(() => {
    if (!enabled || !supabase || !userId) {
      setSortedAttempts([]);
      setLastError('');
      return;
    }

    const client = supabase;
    let isCancelled = false;

    async function loadAttempts() {
      const { data, error } = await client
        .from('attempts')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });

      if (isCancelled) {
        return;
      }

      if (error) {
        setLastError(getPersistenceErrorMessage(error, 'Unable to load attempt history.'));
        return;
      }

      setLastError('');
      setSortedAttempts((data ?? []).map((row) => attemptFromSupabaseRow(row as AttemptRow)));
    }

    void loadAttempts();

    return () => {
      isCancelled = true;
    };
  }, [enabled, setSortedAttempts, userId]);

  return {
    attempts,
    attemptsByQuestionId,
    latestAttemptByQuestionId,
    lastError,
    saveAttempt,
    saveMcqAttempt: saveMcqAttempt as (input: SaveMcqAttemptInput) => Attempt,
    saveFrqAttempt: saveFrqAttempt as (input: SaveFrqAttemptInput) => Attempt,
    replaceAttempts,
    importAttempts,
    exportAttempts,
    removeAttempt,
    clearAttempts,
    getAttemptsForQuestion,
    serializeAttempts,
  };
}
